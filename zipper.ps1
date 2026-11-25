$ErrorActionPreference = "Stop"

$Source = (Get-Location).Path
$RepoName = Split-Path $Source -Leaf
$Parent = Split-Path $Source -Parent

$ZipPath = Join-Path $Parent "$RepoName-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"

$ExcludeDirs = @(
    "node_modules",
    ".next",
    ".git",
    ".vercel",
    "dist",
    "build",
    "coverage",
    ".turbo",
    ".cache",
    "__pycache__",
    ".venv",
    "venv"
)

$ExcludeFiles = @(
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    "*.log",
    "*.tmp"
)

Write-Host "`nMengumpulkan file repository..." -ForegroundColor Cyan

$Files = Get-ChildItem -LiteralPath $Source -Recurse -File -Force |
    Where-Object {
        $Relative = $_.FullName.Substring($Source.Length).TrimStart('\')
        $Parts = $Relative -split '\\'

        $SkipDir = $false
        foreach ($Dir in $ExcludeDirs) {
            if ($Parts -contains $Dir) {
                $SkipDir = $true
                break
            }
        }

        $SkipFile = $false
        foreach ($Pattern in $ExcludeFiles) {
            if ($_.Name -like $Pattern) {
                $SkipFile = $true
                break
            }
        }

        -not $SkipDir -and -not $SkipFile
    }

if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$Archive = [System.IO.Compression.ZipFile]::Open(
    $ZipPath,
    [System.IO.Compression.ZipArchiveMode]::Create
)

try {
    foreach ($File in $Files) {
        $Relative = $File.FullName.Substring($Source.Length).TrimStart('\')
        $EntryName = "$RepoName/$Relative"

        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $Archive,
            $File.FullName,
            $EntryName,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
}
finally {
    $Archive.Dispose()
}

$Size = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

Write-Host "`nZIP BERHASIL DIBUAT!" -ForegroundColor Green
Write-Host "File   : $ZipPath"
Write-Host "Jumlah : $($Files.Count) file"
Write-Host "Ukuran : $Size MB"