<#
    Installs the Russian UI build into the OpenChamber desktop app that is already
    on this machine, so the locale can be used with your own settings and projects.

    Build the UI first:
        bun run --cwd packages/electron build:web-assets

    Then, with OpenChamber closed:
        & ".\scripts\ru\install-desktop-locale.ps1" status
        & ".\scripts\ru\install-desktop-locale.ps1" apply
        & ".\scripts\ru\install-desktop-locale.ps1" revert

    An application update replaces resources/web-dist with the official build and
    the Russian locale disappears; run `status` to see that, then rebuild and
    `apply` again. See FORK.md.

    apply  : makes a one-time backup of the original web-dist, then overlays the
             branch build on top of it. Re-running apply refreshes the patched
             files without touching the backup.
    revert : overlays the original web-dist back on top of the patched one and
             drops the patch marker. The app behaves exactly as before.
    status : reports what is currently installed. Read-only.

    OpenChamber must be closed before apply/revert.

    Design notes
    ------------
    * Nothing is ever deleted in bulk. This environment blocks Remove-Item over
      more than 50 files at once, and the original build ships 1168 files. Both
      apply and revert therefore *overlay* files, which is enough to switch the
      UI: index.html and the entry chunks are overwritten, so stale chunks left
      behind are simply unreferenced.
    * Detection uses a marker file, not file names. The shipped build already
      contains an Intl/CLDR chunk named `ru-RU-*.js` which is NOT the UI
      dictionary and must not be mistaken for this patch.
#>
param(
    [ValidateSet('status', 'apply', 'revert')]
    [string]$Action = 'status',

    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\@openchamberelectron",

    [string]$SourceDir = "$PSScriptRoot\..\..\packages\electron\resources\web-dist"
)

$ErrorActionPreference = 'Stop'

$MarkerName   = '.openchamber-locale-patch'
$ResourcesDir = Join-Path $InstallDir 'resources'
$TargetDir    = Join-Path $ResourcesDir 'web-dist'
$BackupDir    = Join-Path $ResourcesDir 'web-dist.orig'
$ExePath      = Join-Path $InstallDir 'OpenChamber.exe'

function Test-Marker {
    param([string]$Dir)
    return (Test-Path (Join-Path $Dir $MarkerName))
}

# The marker alone is not proof: an app update can overwrite web-dist with the
# official build while leaving the marker file behind. A real patch needs BOTH
# the marker and a UI dictionary chunk that actually renders Russian.
function Get-PatchState {
    if (-not (Test-Path $TargetDir)) { return 'absent' }
    $hasMarker = Test-Marker -Dir $TargetDir
    $hasDictionary = (Get-UiDictionaryChunks -Dir $TargetDir).Count -gt 0
    if ($hasMarker -and $hasDictionary) { return 'patched' }
    if ($hasMarker -and -not $hasDictionary) { return 'stale' }
    if (-not $hasMarker -and $hasDictionary) { return 'dictionary-only' }
    return 'original'
}

# Informational only: the UI dictionary chunk is what actually renders Russian.
function Get-UiDictionaryChunks {
    param([string]$Dir)
    $assets = Join-Path $Dir 'assets'
    if (-not (Test-Path $assets)) { return @() }
    return @(Select-String -Path (Join-Path $assets '*.js') `
            -Pattern 'common\.language\.russian' -List -ErrorAction SilentlyContinue |
        ForEach-Object { Split-Path $_.Path -Leaf })
}

function Get-IntlChunkCount {
    param([string]$Dir)
    $assets = Join-Path $Dir 'assets'
    if (-not (Test-Path $assets)) { return 0 }
    return @(Get-ChildItem -Path $assets -Filter '*.js' |
        Where-Object { $_.Name -match '^[a-z]{2}-[A-Z]{2}-' }).Count
}

function Assert-AppClosed {
    $proc = Get-Process -Name 'OpenChamber' -ErrorAction SilentlyContinue
    if ($proc) {
        throw "OpenChamber is running (PID $($proc.Id -join ', ')). Close it first, then re-run."
    }
}

function Copy-Tree {
    param([string]$From, [string]$To)
    New-Item -ItemType Directory -Path $To -Force | Out-Null
    Copy-Item -Path (Join-Path $From '*') -Destination $To -Recurse -Force
}

function Get-FileCount {
    param([string]$Dir)
    if (-not (Test-Path $Dir)) { return 0 }
    return @(Get-ChildItem -Path $Dir -Recurse -File).Count
}

switch ($Action) {
    'status' {
        $state = Get-PatchState
        $dict  = Get-UiDictionaryChunks -Dir $TargetDir
        Write-Output "install dir    : $InstallDir"
        Write-Output "app present    : $(Test-Path $ExePath)"
        Write-Output "target dir     : $TargetDir ($(Get-FileCount -Dir $TargetDir) files)"
        Write-Output "backup dir     : $BackupDir ($(Get-FileCount -Dir $BackupDir) files)"
        Write-Output "source build   : $SourceDir"
        Write-Output ""
        Write-Output "STATE: $($state.ToUpper())"
        Write-Output "  UI dictionary chunks (common.language.russian): $(if ($dict) { $dict -join ', ' } else { 'none' })"
        Write-Output "  Intl/CLDR chunks: $(Get-IntlChunkCount -Dir $TargetDir)"

        switch ($state) {
            'stale' {
                Write-Output "  The marker survived but the UI dictionary is gone - an app update"
                Write-Output "  has replaced web-dist with the official build. Russian is NOT available"
                Write-Output "  right now. Re-run 'apply' to rebuild and reinstall the patch."
            }
            'dictionary-only' {
                Write-Output "  Dictionary chunks are present but the marker is missing - the build was"
                Write-Output "  copied by hand. Russian should work; 'revert' will still restore the backup."
            }
            'patched' {
                if (Test-Path $BackupDir) {
                    Write-Output "  backup available - 'revert' restores the original UI"
                } else {
                    Write-Output "  WARNING: no backup found - 'revert' cannot restore the original UI"
                }
            }
        }

        $running = Get-Process -Name 'OpenChamber' -ErrorAction SilentlyContinue
        Write-Output "  app running: $(if ($running) { 'yes' } else { 'no' })"
    }

    'apply' {
        Assert-AppClosed
        if (-not (Test-Path $SourceDir)) {
            throw "Branch build not found at $SourceDir. Run: bun run --cwd packages/electron build:web-assets"
        }
        if (-not (Test-Path (Join-Path $SourceDir 'index.html'))) {
            throw "$SourceDir does not look like a web build (no index.html)."
        }

        if (-not (Test-Path $BackupDir)) {
            if (-not (Test-Path $TargetDir)) { throw "Nothing to back up at $TargetDir" }
            Write-Output "Backing up the original UI to $BackupDir ..."
            Copy-Tree -From $TargetDir -To $BackupDir
        } else {
            Write-Output "Backup already exists at $BackupDir (kept as-is)."
        }

        Write-Output "Overlaying the branch build ..."
        Copy-Tree -From $SourceDir -To $TargetDir
        Set-Content -Path (Join-Path $TargetDir $MarkerName) -Value 'feat/ru-locale build' -Encoding ascii

        if ((Get-PatchState) -ne 'patched') { throw "Marker missing after apply - something went wrong." }
        $dict = Get-UiDictionaryChunks -Dir $TargetDir
        if (-not $dict) { throw "No UI dictionary chunk found after apply - the locale would not render." }

        Write-Output ""
        Write-Output "DONE. Russian locale installed ($($dict -join ', '))."
        Write-Output "Start OpenChamber, then Settings -> Appearance -> Language -> Russian."
    }

    'revert' {
        Assert-AppClosed
        if (-not (Test-Path $BackupDir)) {
            throw "No backup at $BackupDir - nothing to restore."
        }
        Write-Output "Restoring the original UI from $BackupDir ..."
        Copy-Tree -From $BackupDir -To $TargetDir

        $marker = Join-Path $TargetDir $MarkerName
        if (Test-Path $marker) { Remove-Item -Path $marker -Force }

        if ((Get-PatchState) -ne 'original') { throw "Marker still present after revert." }

        $leftover = Get-UiDictionaryChunks -Dir $TargetDir
        Write-Output ""
        Write-Output "DONE. Original UI restored - the app behaves exactly as before."
        if ($leftover) {
            Write-Output "Note: stale chunk files from the patch are still on disk (unreferenced):"
            Write-Output "      $($leftover -join ', ')"
            Write-Output "      They are not loaded. Remove them by reinstalling OpenChamber if you want a clean tree."
        }
    }
}
