# Asset copier for RIFT game
# This script copies asset files from app/ to dist/ during the build process

# Define directories to copy
$assetDirs = @(
    "models",
    "audios", 
    "textures",
    "navmeshes",
    "config",
    "animations"
)

Write-Host "RIFT Asset Copy Script" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Ensure dist directory exists
if (-not (Test-Path "dist")) {
    Write-Host "Error: dist directory not found. Run vite build first." -ForegroundColor Red
    exit 1
}

foreach ($dir in $assetDirs) {
    $sourceDir = "app\$dir"
    $destDir = "dist\$dir"
    
    Write-Host "Processing $dir..." -ForegroundColor Yellow
    
    # Check if source exists
    if (-not (Test-Path $sourceDir)) {
        Write-Host "  Source directory not found: $sourceDir" -ForegroundColor Red
        continue
    }
    
    # Create destination directory
    if (-not (Test-Path $destDir)) {
        Write-Host "  Creating directory: $destDir" -ForegroundColor Gray
        New-Item -Path $destDir -ItemType Directory -Force | Out-Null
    }
    
    # Copy files
    Write-Host "  Copying files from $sourceDir to $destDir" -ForegroundColor Gray
    $files = Get-ChildItem -Path $sourceDir -File
    
    if ($files.Count -eq 0) {
        Write-Host "  No files found in $sourceDir" -ForegroundColor Yellow
    }
    else {
        Copy-Item -Path "$sourceDir\*" -Destination $destDir -Recurse -Force
        Write-Host "  Successfully copied $($files.Count) files" -ForegroundColor Green
    }
}

Write-Host "`nAsset copying complete!" -ForegroundColor Green
