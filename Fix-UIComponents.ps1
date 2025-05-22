# Modern-Import-Export-Fixer.ps1
# Standardiserer til MODERNE named exports (profesjonell best practice)

param(
    [string]$SourcePath = ".",
    [switch]$DryRun,
    [switch]$Verbose
)

Write-Host "🚀 MODERN Import/Export Fixer" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host "Standardiserer til moderne named exports!" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🔍 DRY RUN - Ingen filer endres" -ForegroundColor Yellow
}

# Statistics
$stats = @{
    FilesScanned = 0
    FilesFixed = 0
    ExportsModernized = 0
    ImportsFixed = 0
    DoubleSemicolonFixed = 0
}

# Files that SHOULD remain as default exports (base classes, main entry points)
$keepAsDefaultExports = @(
    'UIComponent',
    'World',
    'main'
)

# Files that SHOULD be named exports (components, classes, configs)
$shouldBeNamedExports = @(
    'CONFIG',
    'AssetManager', 
    'TargetSystem',
    'WeatherSystem',
    'EnvironmentSystem',
    'MenuSystem',
    'ScreenManager',
    'MissionBriefing',
    'RoundSummary', 
    'ScreenEffects',
    'HitIndicator',
    'Feature',
    'Sky',
    'EnhancedSky',
    'Enemy',
    'Player',
    'Level',
    'Weapon',
    'Bullet',
    'Blaster',
    'Shotgun',
    'AssaultRifle',
    'HealthPack',
    'Item',
    'WeaponItem',
    'Projectile',
    'CombatSystem',
    'HUDSystem',
    'NotificationSystem',
    'ProgressionSystem',
    'MovementSystem'
)

Write-Host ""
Write-Host "📊 STEG 1: Skanner alle JS filer..." -ForegroundColor Cyan

$jsFiles = Get-ChildItem -Path $SourcePath -Recurse -Filter "*.js" | 
           Where-Object { $_.FullName -notmatch "node_modules|\.git|build|dist|\.min\.js" }

$stats.FilesScanned = $jsFiles.Count
Write-Host "Fant $($jsFiles.Count) JavaScript filer" -ForegroundColor Blue

# Step 1: Modernize exports (default → named for most classes)
Write-Host ""
Write-Host "🔧 STEG 2: Moderniserer exports til named exports..." -ForegroundColor Cyan

foreach ($file in $jsFiles) {
    $filePath = $file.FullName
    $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $originalContent = $content
    $changes = @()
    $filename = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    
    # Skip if this should remain a default export
    if ($keepAsDefaultExports -contains $filename) {
        if ($Verbose) {
            Write-Host "  ⏭️ Skipping $($file.Name) (should remain default export)" -ForegroundColor Gray
        }
        continue
    }
    
    # Fix 1: Convert default exports to named exports for components/classes
    if ($content -match "export default (\w+);?") {
        $className = $Matches[1]
        
        # Only convert if it's a class/component we want as named export
        if ($shouldBeNamedExports -contains $className -or $className -eq $filename) {
            $content = $content -replace "export default $className;?", "export { $className };"
            $changes += "Default->Named export: $className"
            $stats.ExportsModernized++
        }
    }
    
    # Fix 2: Fix export class declarations
    if ($content -match "export class (\w+)") {
        $className = $Matches[1]
        if ($content -notmatch "export \{ $className \}") {
            $content = $content -replace "export class ($className)", "class `$1"
            $content = $content + "`r`n`r`nexport { $className };"
            $changes += "Class export->Named: $className"
            $stats.ExportsModernized++
        }
    }
    
    # Fix 3: Remove double semicolons
    if ($content -match ";;") {
        $content = $content -replace ";;", ";"
        $changes += "Double semicolon fixed"
        $stats.DoubleSemicolonFixed++
    }
    
    # Write changes
    if ($content -ne $originalContent) {
        if (-not $DryRun) {
            Set-Content $filePath $content -Encoding UTF8
        }
        
        $stats.FilesFixed++
        if ($Verbose) {
            Write-Host "  ✅ $($file.Name): $($changes -join ', ')" -ForegroundColor Green
        }
    }
}

# Step 2: Fix ALL imports to match the modernized exports
Write-Host ""
Write-Host "🔧 STEG 3: Moderniserer imports..." -ForegroundColor Cyan

foreach ($file in $jsFiles) {
    $filePath = $file.FullName
    $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $originalContent = $content
    $changes = @()
    
    # Modern import fixes (default → named for components)
    $modernImportFixes = @{
        "import CONFIG from" = "import { CONFIG } from"
        "import AssetManager from" = "import { AssetManager } from"
        "import TargetSystem from" = "import { TargetSystem } from"
        "import WeatherSystem from" = "import { WeatherSystem } from"
        "import EnvironmentSystem from" = "import { EnvironmentSystem } from"
        "import MenuSystem from" = "import { MenuSystem } from"
        "import ScreenManager from" = "import { ScreenManager } from"
        "import MissionBriefing from" = "import { MissionBriefing } from"
        "import RoundSummary from" = "import { RoundSummary } from"
        "import ScreenEffects from" = "import { ScreenEffects } from"
        "import HitIndicator from" = "import { HitIndicator } from"
        "import Feature from" = "import { Feature } from"
        "import Sky from" = "import { Sky } from"
        "import EnhancedSky from" = "import { EnhancedSky } from"
        "import Enemy from" = "import { Enemy } from"
        "import Player from" = "import { Player } from"
        "import Level from" = "import { Level } from"
        "import Weapon from" = "import { Weapon } from"
        "import Bullet from" = "import { Bullet } from"
        "import Blaster from" = "import { Blaster } from"
        "import Shotgun from" = "import { Shotgun } from"
        "import AssaultRifle from" = "import { AssaultRifle } from"
        "import HealthPack from" = "import { HealthPack } from"
        "import Item from" = "import { Item } from"
        "import WeaponItem from" = "import { WeaponItem } from"
        "import Projectile from" = "import { Projectile } from"
        "import CombatSystem from" = "import { CombatSystem } from"
        "import HUDSystem from" = "import { HUDSystem } from"
        "import NotificationSystem from" = "import { NotificationSystem } from"
        "import ProgressionSystem from" = "import { ProgressionSystem } from"
        "import MovementSystem from" = "import { MovementSystem } from"
    }
    
    # Keep these as named imports (utilities - already correct)
    $keepNamedImports = @{
        "import DOMFactory from" = "import { DOMFactory } from"
        "import EventManager from" = "import { EventManager } from"
    }
    
    # Keep these as default imports (base classes)
    $keepDefaultImports = @{
        "import \{ UIComponent \} from" = "import UIComponent from"
        "import \{ World \} from" = "import World from"
    }
    
    # Apply all import fixes
    $allFixes = $modernImportFixes + $keepNamedImports + $keepDefaultImports
    
    foreach ($wrong in $allFixes.Keys) {
        $right = $allFixes[$wrong]
        if ($content -match [regex]::Escape($wrong)) {
            $content = $content -replace [regex]::Escape($wrong), $right
            $changes += "Import: $($wrong.Split(' ')[1]) modernized"
            $stats.ImportsFixed++
        }
    }
    
    # Write changes
    if ($content -ne $originalContent) {
        if (-not $DryRun) {
            Set-Content $filePath $content -Encoding UTF8
        }
        
        if ($Verbose) {
            Write-Host "  ✅ $($file.Name): $($changes -join ', ')" -ForegroundColor Green
        }
    }
}

# Final report
Write-Host ""
Write-Host "📊 RESULTAT" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host "Filer skannet: $($stats.FilesScanned)" -ForegroundColor White
Write-Host "Filer endret: $($stats.FilesFixed)" -ForegroundColor Green
Write-Host "Exports modernisert: $($stats.ExportsModernized)" -ForegroundColor Yellow
Write-Host "Imports modernisert: $($stats.ImportsFixed)" -ForegroundColor Yellow
Write-Host "Doble semikolon fikset: $($stats.DoubleSemicolonFixed)" -ForegroundColor Yellow

$totalFixes = $stats.ExportsModernized + $stats.ImportsFixed + $stats.DoubleSemicolonFixed
Write-Host ""
Write-Host "🎯 TOTALT $totalFixes MODERNISERINGER!" -ForegroundColor Green

if ($DryRun) {
    Write-Host ""
    Write-Host "🔍 DRY RUN - Ingen filer ble endret" -ForegroundColor Yellow
    Write-Host "Kjør uten -DryRun for å anvende endringene" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✅ CODEBASE MODERNISERT TIL BEST PRACTICE!" -ForegroundColor Green
    Write-Host "🎉 Named exports = mer profesjonelt!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🏆 MODERNE PATTERNS ANVENDT:" -ForegroundColor Cyan
Write-Host "✅ Components: export { ClassName } + import { ClassName }" -ForegroundColor Green
Write-Host "✅ Utilities: export { utility } + import { utility }" -ForegroundColor Green  
Write-Host "✅ Base classes: export default BaseClass + import BaseClass" -ForegroundColor Green
Write-Host "✅ Tree-shaking friendly!" -ForegroundColor Green
Write-Host "✅ TypeScript ready!" -ForegroundColor Green
Write-Host "✅ IDE auto-complete optimized!" -ForegroundColor Green