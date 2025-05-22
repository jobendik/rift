#!/usr/bin/env python3
"""
Modern Import/Export Fixer
Standardizes to MODERN named exports (professional best practice)
"""

import os
import re
import argparse
from pathlib import Path
from typing import Dict, List, Set

def main():
    parser = argparse.ArgumentParser(description='Modernize JavaScript imports/exports')
    parser.add_argument('--source', '-s', default='.', help='Source path to scan')
    parser.add_argument('--dry-run', '-d', action='store_true', help='Dry run - no files changed')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    args = parser.parse_args()

    print("🚀 MODERN Import/Export Fixer")
    print("==============================")
    print("Standardizes to modern named exports!")
    
    if args.dry_run:
        print("🔍 DRY RUN - No files will be changed")

    # Statistics
    stats = {
        'files_scanned': 0,
        'files_fixed': 0,
        'exports_modernized': 0,
        'imports_fixed': 0,
        'double_semicolon_fixed': 0
    }

    # Files that SHOULD remain as default exports (base classes, main entry points)
    keep_as_default_exports = {
        'UIComponent',
        'World',
        'main'
    }

    # Files that SHOULD be named exports (components, classes, configs)
    should_be_named_exports = {
        'CONFIG', 'UIConfig', 'AssetManager', 'TargetSystem', 'WeatherSystem', 'EnvironmentSystem',
        'MenuSystem', 'ScreenManager', 'MissionBriefing', 'RoundSummary', 'ScreenEffects',
        'HitIndicator', 'Feature', 'Sky', 'EnhancedSky', 'Enemy', 'Player', 'Level',
        'Weapon', 'Bullet', 'Blaster', 'Shotgun', 'AssaultRifle', 'HealthPack', 'Item',
        'WeaponItem', 'Projectile', 'CombatSystem', 'HUDSystem', 'NotificationSystem',
        'ProgressionSystem', 'MovementSystem', 'DOMFactory', 'EventManager', 'InputHandler'
    }

    print("\n📊 STEP 1: Scanning all JS files...")
    
    # Find all JavaScript files
    source_path = Path(args.source)
    js_files = []
    
    for js_file in source_path.rglob("*.js"):
        # Skip node_modules, .git, build, dist, minified files
        if any(exclude in str(js_file) for exclude in ['node_modules', '.git', 'build', 'dist']):
            continue
        if js_file.name.endswith('.min.js'):
            continue
        js_files.append(js_file)

    stats['files_scanned'] = len(js_files)
    print(f"Found {len(js_files)} JavaScript files")

    # STEP 2: Modernize exports (default → named for most classes)
    print("\n🔧 STEP 2: Modernizing exports to named exports...")
    
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            if args.verbose:
                print(f"  ❌ Error reading {js_file.name}: {e}")
            continue
            
        original_content = content
        changes = []
        filename = js_file.stem
        
        # Skip if this should remain a default export
        if filename in keep_as_default_exports:
            if args.verbose:
                print(f"  ⏭️ Skipping {js_file.name} (should remain default export)")
            continue
        
        # First, check what exports already exist to avoid duplicates
        existing_named_exports = set()
        existing_default_exports = set()
        
        # Find existing export const, export let, export var
        const_exports = re.findall(r'export\s+(?:const|let|var)\s+(\w+)', content)
        existing_named_exports.update(const_exports)
        
        # Find existing export class, export function
        class_function_exports = re.findall(r'export\s+(?:class|function)\s+(\w+)', content)
        existing_named_exports.update(class_function_exports)
        
        # Find existing export { ... }
        bracket_exports = re.findall(r'export\s*\{\s*([^}]+)\s*\}', content)
        for export_list in bracket_exports:
            names = [name.strip() for name in export_list.split(',')]
            existing_named_exports.update(names)
        
        # Find existing export default
        default_exports = re.findall(r'export\s+default\s+(\w+)', content)
        existing_default_exports.update(default_exports)
        
        if args.verbose and (existing_named_exports or existing_default_exports):
            print(f"  📋 {js_file.name}: Found existing exports - Named: {existing_named_exports}, Default: {existing_default_exports}")
        
        # Fix 1: Convert default exports to named exports for components/classes
        default_export_match = re.search(r'export default (\w+);?', content)
        if default_export_match:
            class_name = default_export_match.group(1)
            
            # Only convert if it's a class/component we want as named export
            # AND it's not already a named export
            if (class_name in should_be_named_exports or class_name == filename) and class_name not in existing_named_exports:
                content = re.sub(r'export default ' + re.escape(class_name) + r';?', 
                               f'export {{ {class_name} }};', content)
                changes.append(f'Default to Named export: {class_name}')
                stats['exports_modernized'] += 1
        
        # Fix 2: Fix export class declarations
        export_class_match = re.search(r'export class (\w+)', content)
        if export_class_match:
            class_name = export_class_match.group(1)
            export_pattern = f'export {{ {class_name} }}'
            
            # Check if we should modernize this class (only if it's in our list)
            if class_name in should_be_named_exports and export_pattern not in content:
                content = re.sub(r'export class ' + re.escape(class_name), 
                               f'class {class_name}', content)
                content += f'\n\nexport {{ {class_name} }};'
                changes.append(f'Class export to Named: {class_name}')
                stats['exports_modernized'] += 1
            elif class_name not in should_be_named_exports:
                # Keep as export class if not in our modernization list
                if args.verbose:
                    print(f"  ⏭️ Keeping export class {class_name} (not in modernization list)")
        
        # Fix 3: Remove duplicate exports (same name exported twice)
        # Find all export statements
        export_statements = re.findall(r'export\s+\{[^}]+\}|export\s+class\s+\w+|export\s+default\s+\w+', content)
        if len(export_statements) > 1:
            # Check for duplicates
            exported_names = []
            for stmt in export_statements:
                if 'export class' in stmt:
                    class_name = re.search(r'export class (\w+)', stmt).group(1)
                    exported_names.append(class_name)
                elif 'export {' in stmt:
                    names = re.findall(r'\b(\w+)\b', stmt.split('{')[1].split('}')[0])
                    exported_names.extend(names)
                elif 'export default' in stmt:
                    name = re.search(r'export default (\w+)', stmt).group(1)
                    exported_names.append(name)
            
            # Remove duplicate export statements
            duplicates = [name for name in exported_names if exported_names.count(name) > 1]
            for duplicate_name in set(duplicates):
                # Keep the export class version, remove the export { } version
                duplicate_pattern = f'export {{ {duplicate_name} }};'
                if duplicate_pattern in content and f'export class {duplicate_name}' in content:
                    content = content.replace(duplicate_pattern, '')
                    changes.append(f'Removed duplicate export: {duplicate_name}')
                    stats['exports_modernized'] += 1
        
        # Fix 4: Remove double semicolons
        if ';;' in content:
            content = content.replace(';;', ';')
            changes.append('Double semicolon fixed')
            stats['double_semicolon_fixed'] += 1
        
        # Write changes
        if content != original_content:
            if not args.dry_run:
                try:
                    with open(js_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                except Exception as e:
                    if args.verbose:
                        print(f"  ❌ Error writing {js_file.name}: {e}")
                    continue
            
            stats['files_fixed'] += 1
            if args.verbose:
                print(f"  ✅ {js_file.name}: {', '.join(changes)}")

    # STEP 3: Fix ALL imports to match the modernized exports
    print("\n🔧 STEP 3: Modernizing imports...")
    
    # Modern import fixes (default → named for components)
    modern_import_fixes = {
        'CONFIG': 'import { CONFIG } from',
        'UIConfig': 'import { UIConfig } from',
        'AssetManager': 'import { AssetManager } from',
        'TargetSystem': 'import { TargetSystem } from',
        'WeatherSystem': 'import { WeatherSystem } from',
        'EnvironmentSystem': 'import { EnvironmentSystem } from',
        'MenuSystem': 'import { MenuSystem } from',
        'ScreenManager': 'import { ScreenManager } from',
        'MissionBriefing': 'import { MissionBriefing } from',
        'RoundSummary': 'import { RoundSummary } from',
        'ScreenEffects': 'import { ScreenEffects } from',
        'HitIndicator': 'import { HitIndicator } from',
        'Feature': 'import { Feature } from',
        'Sky': 'import { Sky } from',
        'EnhancedSky': 'import { EnhancedSky } from',
        'Enemy': 'import { Enemy } from',
        'Player': 'import { Player } from',
        'Level': 'import { Level } from',
        'Weapon': 'import { Weapon } from',
        'Bullet': 'import { Bullet } from',
        'Blaster': 'import { Blaster } from',
        'Shotgun': 'import { Shotgun } from',
        'AssaultRifle': 'import { AssaultRifle } from',
        'HealthPack': 'import { HealthPack } from',
        'Item': 'import { Item } from',
        'WeaponItem': 'import { WeaponItem } from',
        'Projectile': 'import { Projectile } from',
        'CombatSystem': 'import { CombatSystem } from',
        'HUDSystem': 'import { HUDSystem } from',
        'NotificationSystem': 'import { NotificationSystem } from',
        'ProgressionSystem': 'import { ProgressionSystem } from',
        'MovementSystem': 'import { MovementSystem } from',
        'DOMFactory': 'import { DOMFactory } from',
        'EventManager': 'import { EventManager } from',
        'InputHandler': 'import { InputHandler } from'
    }
    
    # Keep these as default imports (base classes)
    keep_default_imports = {
        'UIComponent': 'import UIComponent from',
        'World': 'import World from'
    }
    
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            continue
            
        original_content = content
        changes = []
        
        # Apply modern import fixes
        for module_name, correct_import in modern_import_fixes.items():
            wrong_import = f'import {module_name} from'
            if wrong_import in content:
                content = content.replace(wrong_import, correct_import)
                changes.append(f'Import modernized: {module_name}')
                stats['imports_fixed'] += 1
        
        # Apply base class import fixes
        for module_name, correct_import in keep_default_imports.items():
            wrong_import = f'import {{ {module_name} }} from'
            if wrong_import in content:
                content = content.replace(wrong_import, correct_import)
                changes.append(f'Base class import fixed: {module_name}')
                stats['imports_fixed'] += 1
        
        # Write changes
        if content != original_content:
            if not args.dry_run:
                try:
                    with open(js_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                except Exception as e:
                    continue
            
            if args.verbose:
                print(f"  ✅ {js_file.name}: {', '.join(changes)}")

    # Final report
    print("\n📊 RESULTS")
    print("============")
    print(f"Files scanned: {stats['files_scanned']}")
    print(f"Files changed: {stats['files_fixed']}")
    print(f"Exports modernized: {stats['exports_modernized']}")
    print(f"Imports modernized: {stats['imports_fixed']}")
    print(f"Double semicolons fixed: {stats['double_semicolon_fixed']}")

    total_fixes = stats['exports_modernized'] + stats['imports_fixed'] + stats['double_semicolon_fixed']
    print(f"\n🎯 TOTAL {total_fixes} MODERNIZATIONS!")

    if args.dry_run:
        print("\n🔍 DRY RUN - No files were changed")
        print("Run without --dry-run to apply changes")
    else:
        print("\n✅ CODEBASE MODERNIZED TO BEST PRACTICE!")
        print("🎉 Named exports = more professional!")

    print("\n🏆 MODERN PATTERNS APPLIED:")
    print("✅ Components: export { ClassName } + import { ClassName }")
    print("✅ Utilities: export { utility } + import { utility }")
    print("✅ Base classes: export default BaseClass + import BaseClass")
    print("✅ Tree-shaking friendly!")
    print("✅ TypeScript ready!")
    print("✅ IDE auto-complete optimized!")

if __name__ == "__main__":
    main()