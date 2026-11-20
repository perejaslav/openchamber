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

    apply  : makes a one-time backup of the original app.asar, then rebuilds the
             archive with the branch dist-bundle overlaid. Re-running apply
             refreshes the patched files without touching the backup.
    revert : restores the original app.asar from the backup and drops the patch
             marker.
    status : reports what is currently installed. Read-only.

    OpenChamber must be closed before apply/revert.

    Design notes
    ------------
    * The installed version must match the branch version (packages/electron/
      package.json). An asar from another upstream release is refused: mixing a
      main bundle with a foreign renderer build breaks the app.
    * Detection uses a sentinel string that exists only in the patched bundle
      (the renderer-locale plumbing), not file names or dates.
    * The staging directory is fixed and reused; nothing is ever deleted in
      bulk. Packing writes a fresh archive file which is then moved into place.
#>
param(
    [ValidateSet('status', 'apply', 'revert')]
    [string]$Action = 'status',

    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\@openchamberelectron",

    [string]$DistBundleDir = "$PSScriptRoot\..\..\packages\electron\dist-bundle"
)

$ErrorActionPreference = 'Stop'

$Sentinel      = 'rendererLocale'
$MarkerName    = 'app.asar.ru-main-patch'
$ResourcesDir  = Join-Path $InstallDir 'resources'
$AsarPath      = Join-Path $ResourcesDir 'app.asar'
$BackupPath    = Join-Path $ResourcesDir 'app.asar.orig'
$MarkerPath    = Join-Path $ResourcesDir $MarkerName
$ExePath       = Join-Path $InstallDir 'OpenChamber.exe'
$RepoRoot      = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$StageRoot     = if (Test-Path 'D:\Temp\sys\opencode') { 'D:\Temp\sys\opencode\main-patch' } else { Join-Path $env:TEMP 'openchamber-main-patch' }

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

# Extracts dist-bundle/main.mjs from an asar archive into the staging dir and
# returns $true when the patched sentinel is found inside.
function Test-AsarPatched {
    param([string]$Archive)
    if (-not (Test-Path $Archive)) { return $false }
    $work = Join-Path $StageRoot 'inspect'
    New-Item -ItemType Directory -Path $work -Force | Out-Null
    Push-Location $work
    try {
        # `asar extract-file` writes just the basename into the working dir.
        bunx asar extract-file $Archive 'dist-bundle/main.mjs' 2>$null
        $probe = Join-Path $work 'main.mjs'
        if (-not (Test-Path $probe)) { return $false }
        return $null -ne (Select-String -Path $probe -Pattern $Sentinel -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -First 1)
    } finally {
        Pop-Location
    }
}

function Get-PatchState {
    if (-not (Test-Path $AsarPath)) { return 'absent' }
    $hasMarker = Test-Path $MarkerPath
    $hasSentinel = Test-AsarPatched -Archive $AsarPath
    if ($hasMarker -and $hasSentinel) { return 'patched' }
    if ($hasMarker -and -not $hasSentinel) { return 'stale' }
    if (-not $hasMarker -and $hasSentinel) { return 'patched-unmarked' }
    return 'original'
}

switch ($Action) {
    'status' {
        $repo = Get-RepoVersion
        $installed = Get-InstalledVersion
        $state = Get-PatchState
        Write-Output "install dir    : $InstallDir"
        Write-Output "app present    : $(Test-Path $ExePath)"
        Write-Output "repo version   : $repo"
        Write-Output "installed app  : $(if ($installed) { $installed } else { 'unknown' })"
        Write-Output "branch bundle  : $DistBundleDir"
        Write-Output "backup         : $(if (Test-Path $BackupPath) { "$BackupPath ($([math]::Round((Get-Item $BackupPath).Length / 1MB)) MB)" } else { 'none' })"
        Write-Output ""
        Write-Output "STATE: $($state.ToUpper())"
        if ($installed -and ($installed -ne $repo)) {
            Write-Output "  WARNING: installed app ($installed) does not match branch ($repo) -"
            Write-Output "  'apply' will refuse until the versions match."
        }

        switch ($state) {
            'stale' {
                Write-Output "  The marker survived but the sentinel is gone - an app update"
                Write-Output "  has replaced app.asar with the official build. Russian menus are NOT"
                Write-Output "  available right now. Re-run 'apply' to rebuild and reinstall the patch."
            }
            'patched-unmarked' {
                Write-Output "  The bundle carries the patch but the marker is missing - the archive"
                Write-Output "  was replaced by hand. Menus should be Russian; 'revert' needs a backup."
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
        if (-not (Test-Path (Join-Path $DistBundleDir 'main.mjs'))) {
            throw "Branch bundle not found at $DistBundleDir. Run: bun run --cwd packages/electron bundle:main"
        }
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
        } else {
            Write-Output "Backup already exists at $BackupPath (kept as-is)."
        }

        $work = Join-Path $StageRoot 'work'
        $fresh = Join-Path $StageRoot 'app.patched.asar'
        New-Item -ItemType Directory -Path $work -Force | Out-Null
        if (Test-Path $fresh) { Remove-Item $fresh -Force }

        Write-Output 'Extracting the installed app.asar ...'
        bunx asar extract $AsarPath $work
        Write-Output 'Overlaying the branch dist-bundle ...'
        Copy-Item (Join-Path $DistBundleDir 'main.mjs') (Join-Path $work 'dist-bundle\main.mjs') -Force
        Copy-Item (Join-Path $DistBundleDir 'entry.mjs') (Join-Path $work 'dist-bundle\entry.mjs') -Force
        Copy-Item (Join-Path $DistBundleDir 'early-startup.mjs') (Join-Path $work 'dist-bundle\early-startup.mjs') -Force
        Write-Output 'Repacking app.asar ...'
        bunx asar pack $work $fresh

        Write-Output 'Installing the patched app.asar ...'
        Copy-Item $fresh $AsarPath -Force
        $sha = 'unknown'
        try { $sha = (git -C $RepoRoot rev-parse --short HEAD) 2>$null } catch { }
        Set-Content -Path $MarkerPath -Value "ru main-process patch, upstream $repo, commit $sha" -Encoding ascii

        if (-not (Test-AsarPatched -Archive $AsarPath)) { throw 'Sentinel missing after apply - something went wrong.' }
        Write-Output ''
        Write-Output 'DONE. Russian app menu and tray menu installed. Start OpenChamber to check.'
    }

    'revert' {
        Assert-AppClosed
        if (-not (Test-Path $BackupPath)) { throw "No backup at $BackupPath - nothing to restore." }
        Write-Output 'Restoring the original app.asar ...'
        Copy-Item $BackupPath $AsarPath -Force
        if (Test-Path $MarkerPath) { Remove-Item $MarkerPath -Force }
        if (Test-AsarPatched -Archive $AsarPath) { throw 'Sentinel still present after revert - something went wrong.' }
        Write-Output ''
        Write-Output 'DONE. Original app.asar restored.'
    }
}
