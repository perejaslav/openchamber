<#
    Installs the branch main-process build (native app menu, tray menu) into the
    OpenChamber desktop app that is already on this machine.

    This is the companion of install-desktop-locale.ps1: that script patches the
    renderer UI (resources/web-dist), this one patches the native shell
    (dist-bundle/main.mjs inside resources/app.asar). Both patches are needed
    for a fully Russian app; either one alone leaves half of the menus English.

    Build the main bundle first:
        bun run --cwd packages/electron bundle:main

    Then, with OpenChamber closed:
        & ".\scripts\ru\install-desktop-main.ps1" status
        & ".\scripts\ru\install-desktop-main.ps1" apply
        & ".\scripts\ru\install-desktop-main.ps1" revert

    An application update replaces resources/app.asar with the official build and
    the Russian menus disappear; run `status` to see that, then rebuild and
    `apply` again. See FORK.md.

    apply  : makes a version-pinned backup of the original app.asar, then
             rebuilds the archive with the branch dist-bundle overlaid. The
             staged archive is verified before it touches the installed file,
             and the installed file is verified after; on any failure the
             backup is restored automatically. Re-running apply refreshes the
             patched files without touching the backup.
    revert : restores the original app.asar from the backup and drops the patch
             marker. Refuses when the backup belongs to another app version.
    status : reports what is currently installed. Read-only towards the
             installed app (it only reads the archive and writes temp files).

    OpenChamber must be closed before apply/revert.

    States reported by status
    -------------------------
    PATCHED  : the patch is installed and matches the branch build.
    OUTDATED : the patch is installed but does not match the branch build
               (the branch moved on, the marker predates hash recording, or
               the archive was modified outside this script) - re-run apply.
    STALE    : the marker survived but the patch is gone - an app update has
               replaced app.asar with the official build.
    ORIGINAL : the official unpatched archive is installed.
    ABSENT   : no app.asar found at the install dir.

    Design notes
    ------------
    * The installed version must match the branch version (packages/electron/
      package.json). An asar from another upstream release is refused: mixing a
      main bundle with a foreign renderer build breaks the app.
    * The backup is pinned to the app version it was taken from
      (app.asar.orig.version). A legacy backup without that file is adopted
      only after proving it is both unpatched and version-matching; otherwise
      apply refuses instead of guessing.
    * Detection uses a sentinel string that exists only in the patched bundle
      (the renderer-locale plumbing), plus SHA-256 of the three overlaid files.
      A hash match proves the bytes are identical; it does not prove which
      commit produced them, so the commit recorded in the marker is
      informational only.
    * Every run works in a unique staging directory that is removed afterwards.
      Reusing one directory across runs would let files deleted from a newer
      archive leak into the next packed build.
    * Native-tool failures are checked via $LASTEXITCODE: PowerShell does not
      stop on a nonzero exit code by itself.
#>
param(
    [ValidateSet('status', 'apply', 'revert')]
    [string]$Action = 'status',

    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\@openchamberelectron",

    [string]$DistBundleDir = "$PSScriptRoot\..\..\packages\electron\dist-bundle"
)

$ErrorActionPreference = 'Stop'

$Sentinel       = 'rendererLocale'
$BundleFiles    = @('main.mjs', 'entry.mjs', 'early-startup.mjs')
$MarkerName     = 'app.asar.ru-main-patch'
$BackupVerName  = 'app.asar.orig.version'
$ResourcesDir   = Join-Path $InstallDir 'resources'
$AsarPath       = Join-Path $ResourcesDir 'app.asar'
$BackupPath     = Join-Path $ResourcesDir 'app.asar.orig'
$BackupVerPath  = Join-Path $ResourcesDir $BackupVerName
$MarkerPath     = Join-Path $ResourcesDir $MarkerName
$ExePath        = Join-Path $InstallDir 'OpenChamber.exe'
$RepoRoot       = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$StageBase      = if (Test-Path 'D:\Temp\sys\opencode') { 'D:\Temp\sys\opencode\main-patch' } else { Join-Path $env:TEMP 'openchamber-main-patch' }

function Get-RepoVersion {
    $pkg = Get-Content (Join-Path $RepoRoot 'packages\electron\package.json') -Raw
    if ($pkg -match '"version"\s*:\s*"([^"]+)"') { return $Matches[1] }
    throw 'Cannot read version from packages/electron/package.json'
}

function Get-InstalledVersion {
    if (-not (Test-Path $ExePath)) { return $null }
    $raw = (Get-Item $ExePath).VersionInfo.ProductVersion
    if ($raw -match '^(\d+\.\d+\.\d+)') { return $Matches[1] }
    return $raw
}

function Assert-AppClosed {
    $proc = Get-Process -Name 'OpenChamber' -ErrorAction SilentlyContinue
    if ($proc) {
        throw "OpenChamber is running (PID $($proc.Id -join ', ')). Close it first, then re-run."
    }
}

function Assert-Bun {
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        throw 'bun is not on PATH. Install it first: https://bun.sh'
    }
}

# Runs `bunx asar ...` and throws on a nonzero exit code, which PowerShell
# would otherwise ignore ($ErrorActionPreference does not cover it).
function Invoke-Asar {
    param([string[]]$AsarArgs)
    bunx asar @AsarArgs
    if ($LASTEXITCODE -ne 0) { throw "asar $($AsarArgs -join ' ') failed with exit code $LASTEXITCODE." }
}

function New-StageDir {
    param([string]$Purpose)
    $dir = Join-Path $StageBase ("$Purpose-{0:yyyyMMdd-HHmmss}-{1}" -f (Get-Date), $PID)
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    return $dir
}

function Remove-StageDir {
    param([string]$Dir)
    try {
        if ($Dir -and (Test-Path $Dir)) { Remove-Item -Path $Dir -Recurse -Force }
    } catch {
        Write-Warning "Could not remove staging dir $Dir : $_"
    }
}

function Get-FileHashHex {
    param([string]$Path)
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

# SHA-256 of the three overlaid files inside an asar archive.
function Get-AsarBundleHashes {
    param([string]$Archive, [string]$Stage)
    $hashes = @{}
    Push-Location $Stage
    try {
        foreach ($name in $BundleFiles) {
            Invoke-Asar @('extract-file', $Archive, "dist-bundle/$name")
            $probe = Join-Path $Stage $name
            if (-not (Test-Path $probe)) { throw "Could not extract dist-bundle/$name from $Archive" }
            $hashes[$name] = Get-FileHashHex -Path $probe
        }
    } finally {
        Pop-Location
    }
    return $hashes
}

function Test-AsarPatched {
    param([string]$Archive)
    if (-not (Test-Path $Archive)) { return $false }
    $stage = New-StageDir -Purpose 'inspect'
    try {
        $hashes = Get-AsarBundleHashes -Archive $Archive -Stage $stage
        $probe = Join-Path $stage 'main.mjs'
        return $null -ne (Select-String -Path $probe -Pattern $Sentinel -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -First 1)
    } finally {
        Remove-StageDir -Dir $stage
    }
}

function Get-ArchiveVersion {
    param([string]$Archive)
    $stage = New-StageDir -Purpose 'identify'
    try {
        Push-Location $stage
        try {
            Invoke-Asar @('extract-file', $Archive, 'package.json')
            $probe = Join-Path $stage 'package.json'
            if (-not (Test-Path $probe)) { return $null }
            $pkg = Get-Content $probe -Raw
            if ($pkg -match '"version"\s*:\s*"([^"]+)"') { return $Matches[1] }
            return $null
        } finally {
            Pop-Location
        }
    } finally {
        Remove-StageDir -Dir $stage
    }
}

function Read-Marker {
    if (-not (Test-Path $MarkerPath)) { return $null }
    $marker = @{ version = $null; commit = $null; hashes = @{} }
    foreach ($line in (Get-Content $MarkerPath)) {
        if ($line -match '^(version|commit)=(.*)$') {
            $marker[$Matches[1]] = $Matches[2].Trim()
        } elseif ($line -match '^([\w.\-]+)=([0-9a-fA-F]{64})$') {
            $marker.hashes[$Matches[1]] = $Matches[2].ToLowerInvariant()
        }
    }
    return $marker
}

function Write-Marker {
    param([string]$Version, [string]$Commit, [hashtable]$Hashes)
    $lines = @("version=$Version", "commit=$Commit")
    foreach ($name in $BundleFiles) { $lines += "$name=$($Hashes[$name])" }
    Set-Content -Path $MarkerPath -Value $lines -Encoding ascii
}

function Get-RepoBundleHashes {
    $hashes = @{}
    foreach ($name in $BundleFiles) {
        $path = Join-Path $DistBundleDir $name
        if (-not (Test-Path $path)) { throw "Branch bundle is missing $name at $DistBundleDir. Run: bun run --cwd packages/electron bundle:main" }
        $hashes[$name] = Get-FileHashHex -Path $path
    }
    return $hashes
}

function Get-RepoCommit {
    try {
        $sha = (git -C $RepoRoot rev-parse --short HEAD) 2>$null
        if ($sha) { return $sha.Trim() }
    } catch { }
    return 'unknown'
}

function Get-PatchState {
    if (-not (Test-Path $AsarPath)) { return @{ state = 'absent'; detail = $null } }
    $marker = Read-Marker
    $hasSentinel = Test-AsarPatched -Archive $AsarPath
    if (-not $hasSentinel -and -not $marker) { return @{ state = 'original'; detail = $null } }
    if (-not $hasSentinel -and $marker) { return @{ state = 'stale'; detail = $null } }
    if ($hasSentinel -and -not $marker) {
        return @{ state = 'outdated'; detail = 'the archive carries the patch but the marker is missing - provenance unknown, re-apply to record it' }
    }
    if ($marker.hashes.Count -lt $BundleFiles.Count) {
        return @{ state = 'outdated'; detail = 'the marker predates hash recording - re-apply to record file hashes' }
    }
    $stage = New-StageDir -Purpose 'status'
    try {
        $installed = Get-AsarBundleHashes -Archive $AsarPath -Stage $stage
        $repo = Get-RepoBundleHashes
        foreach ($name in $BundleFiles) {
            if ($installed[$name] -ne $marker.hashes[$name]) {
                return @{ state = 'outdated'; detail = "dist-bundle/$name in the installed archive differs from the recorded patch - modified outside this script, re-apply" }
            }
        }
        foreach ($name in $BundleFiles) {
            if ($marker.hashes[$name] -ne $repo[$name]) {
                return @{ state = 'outdated'; detail = 'the branch build moved on since the patch was applied - rebuild and re-apply' }
            }
        }
        return @{ state = 'patched'; detail = $null }
    } finally {
        Remove-StageDir -Dir $stage
    }
}

function Get-AsarFileCount {
    param([string]$Archive)
    $out = bunx asar list $Archive
    if ($LASTEXITCODE -ne 0) { throw "asar list $Archive failed with exit code $LASTEXITCODE." }
    return @($out | Measure-Object).Count
}

switch ($Action) {
    'status' {
        $repo = Get-RepoVersion
        $installed = Get-InstalledVersion
        $info = Get-PatchState
        $marker = Read-Marker
        Write-Output "install dir    : $InstallDir"
        Write-Output "app present    : $(Test-Path $ExePath)"
        Write-Output "repo version   : $repo"
        Write-Output "installed app  : $(if ($installed) { $installed } else { 'unknown' })"
        Write-Output "branch bundle  : $DistBundleDir"
        Write-Output "backup         : $(if (Test-Path $BackupPath) { "$BackupPath ($([math]::Round((Get-Item $BackupPath).Length / 1MB)) MB)" } else { 'none' })"
        Write-Output "backup version : $(if (Test-Path $BackupVerPath) { (Get-Content $BackupVerPath -Raw).Trim() } else { 'unrecorded' })"
        Write-Output "marker commit  : $(if ($marker -and $marker.commit) { $marker.commit } else { 'none' })"
        Write-Output ""
        Write-Output "STATE: $($info.state.ToUpper())"
        if ($info.detail) { Write-Output "  $($info.detail)" }
        if ($installed -and ($installed -ne $repo)) {
            Write-Output "  WARNING: installed app ($installed) does not match branch ($repo) -"
            Write-Output "  'apply' will refuse until the versions match."
        }

        switch ($info.state) {
            'stale' {
                Write-Output "  The marker survived but the patch is gone - an app update"
                Write-Output "  has replaced app.asar with the official build. Russian menus are NOT"
                Write-Output "  available right now. Rebuild and re-run 'apply'."
            }
            'patched' {
                if (Test-Path $BackupPath) {
                    Write-Output "  backup available - 'revert' restores the original app.asar"
                } else {
                    Write-Output "  WARNING: no backup found - 'revert' cannot restore the original app.asar"
                }
            }
        }

        $running = Get-Process -Name 'OpenChamber' -ErrorAction SilentlyContinue
        Write-Output "  app running: $(if ($running) { 'yes' } else { 'no' })"
    }

    'apply' {
        Assert-AppClosed
        Assert-Bun
        $repoHashes = Get-RepoBundleHashes
        $repo = Get-RepoVersion
        $installed = Get-InstalledVersion
        if (-not $installed) { throw "Installed app not found at $ExePath" }
        if ($installed -ne $repo) {
            throw "Version mismatch: installed app is $installed, branch is $repo. Update the app or check out the matching release first."
        }
        if (-not (Test-Path $AsarPath)) { throw "Nothing to back up at $AsarPath" }

        if (-not (Test-Path $BackupPath)) {
            Write-Output "Backing up the original app.asar ($([math]::Round((Get-Item $AsarPath).Length / 1MB)) MB) ..."
            Copy-Item $AsarPath $BackupPath
            Set-Content -Path $BackupVerPath -Value $installed -Encoding ascii
        } elseif (-not (Test-Path $BackupVerPath)) {
            Write-Output 'Backup exists without a version record - verifying it before adopting ...'
            $backupVer = Get-ArchiveVersion -Archive $BackupPath
            if (-not $backupVer) { throw "Cannot determine the version of the existing backup at $BackupPath. Resolve it manually (rename or remove it) and re-run." }
            if (Test-AsarPatched -Archive $BackupPath) { throw "The existing backup at $BackupPath already carries the patch. Resolve it manually (rename or remove it) and re-run." }
            if ($backupVer -ne $installed) { throw "The existing backup is version $backupVer but the installed app is $installed. Resolve it manually (rename or remove it) and re-run." }
            Write-Output "Backup verified as the unpatched $backupVer build - adopting it."
            Set-Content -Path $BackupVerPath -Value $backupVer -Encoding ascii
        } else {
            $backupVer = (Get-Content $BackupVerPath -Raw).Trim()
            if ($backupVer -ne $installed) { throw "Backup is version $backupVer but the installed app is $installed - refusing to build on it. Resolve the backup manually and re-run." }
            Write-Output "Backup already exists at $BackupPath (version $backupVer, kept as-is)."
        }

        $stage = New-StageDir -Purpose 'apply'
        try {
            $originalCount = Get-AsarFileCount -Archive $AsarPath
            Write-Output 'Extracting the installed app.asar ...'
            $work = Join-Path $stage 'work'
            New-Item -ItemType Directory -Path $work -Force | Out-Null
            Invoke-Asar @('extract', $AsarPath, $work)
            Write-Output 'Overlaying the branch dist-bundle ...'
            foreach ($name in $BundleFiles) {
                Copy-Item (Join-Path $DistBundleDir $name) (Join-Path $work "dist-bundle\$name") -Force
            }
            Write-Output 'Repacking app.asar ...'
            $fresh = Join-Path $stage 'app.patched.asar'
            Invoke-Asar @('pack', $work, $fresh)

            Write-Output 'Verifying the staged archive ...'
            if (-not (Test-AsarPatched -Archive $fresh)) { throw 'Sentinel missing in the staged archive - refusing to install it.' }
            $freshCount = Get-AsarFileCount -Archive $fresh
            if ($freshCount -ne $originalCount) { throw "Staged archive file count ($freshCount) differs from the original ($originalCount) - refusing to install it." }

            Write-Output 'Installing the patched app.asar ...'
            Copy-Item $fresh $AsarPath -Force
            if (-not (Test-AsarPatched -Archive $AsarPath)) {
                Write-Warning 'Installed archive failed verification - restoring the backup ...'
                Copy-Item $BackupPath $AsarPath -Force
                if (Test-AsarPatched -Archive $AsarPath) { throw 'Restore failed: the patch is still present. Resolve manually.' }
                throw 'Installed archive failed verification; the backup was restored.'
            }
            Write-Marker -Version $repo -Commit (Get-RepoCommit) -Hashes $repoHashes

            $final = Get-PatchState
            if ($final.state -ne 'patched') {
                Write-Warning "Post-install state is $($final.state) - restoring the backup ..."
                Copy-Item $BackupPath $AsarPath -Force
                if (Test-Path $MarkerPath) { Remove-Item $MarkerPath -Force }
                throw "Post-install verification failed ($($final.detail)); the backup was restored."
            }
        } finally {
            Remove-StageDir -Dir $stage
        }

        Write-Output ''
        Write-Output 'DONE. Russian app menu and tray menu installed. Start OpenChamber to check.'
    }

    'revert' {
        Assert-AppClosed
        if (-not (Test-Path $BackupPath)) { throw "No backup at $BackupPath - nothing to restore." }
        $installed = Get-InstalledVersion
        if (-not (Test-Path $BackupVerPath)) { throw "Backup version is unrecorded - refusing to guess. Resolve $BackupPath manually." }
        $backupVer = (Get-Content $BackupVerPath -Raw).Trim()
        if ($installed -and ($backupVer -ne $installed)) { throw "Backup is version $backupVer but the installed app is $installed - restoring it would mix releases. Resolve manually." }
        Write-Output "Restoring the original app.asar (version $backupVer) ..."
        Copy-Item $BackupPath $AsarPath -Force
        if (Test-Path $MarkerPath) { Remove-Item $MarkerPath -Force }
        if (Test-AsarPatched -Archive $AsarPath) { throw 'Sentinel still present after revert - something went wrong.' }
        Write-Output ''
        Write-Output 'DONE. Original app.asar restored.'
    }
}
