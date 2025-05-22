#!/usr/bin/env python3
"""
Modern Import/Export Fixer - IMPROVED VERSION
Standardizes to MODERN named exports and fixes duplicate export issues
"""

import os
import re
import argparse
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

def find_all_exports(content: str) -> Dict[str, List[Tuple[str, int, int]]]:
    """Find all exports in the content with their positions."""
    exports = {
        'default': [],
        'named': [],
        'class': [],
        'function': [],
        'const': [],
        'destructured': []
    }
    
    # Default exports with identifier
    for match in re.finditer(r'export\s+default\s+(\w+)(?:\s*;)?', content):
        exports['default'].append((match.group(1), match.start(), match.end()))
    
    # Anonymous default exports (marked as '_anonymous_' for clarity)
    for pattern in [r'export\s+default\s+function\s*\(', r'export\s+default\s+class\s+\{']:
        for match in re.finditer(pattern, content):
            exports['default'].append(('_anonymous_', match.start(), match.end()))
    
    # Export class statements
    for match in re.finditer(r'export\s+class\s+(\w+)', content):
        exports['class'].append((match.group(1), match.start(), match.end()))
    
    # Export function statements
    for match in re.finditer(r'export\s+function\s+(\w+)', content):
        exports['function'].append((match.group(1), match.start(), match.end()))
    
    # Export const/let/var statements
    for match in re.finditer(r'export\s+(?:const|let|var)\s+(\w+)', content):
        exports['const'].append((match.group(1), match.start(), match.end()))
    
    # Export destructured statements
    for match in re.finditer(r'export\s*\{([^}]+)\}(?:\s*;)?', content):
        export_list = match.group(1)
        names = [name.strip() for name in export_list.split(',') if name.strip()]
        for name in names:
            exports['destructured'].append((name, match.start(), match.end()))
    
    # Non-exported classes
    for match in re.finditer(r'(?<!export\s+)class\s+(\w+)', content):
        class_name = match.group(1)
        if not any(name == class_name for name, _, _ in exports['class'] + exports['destructured'] + exports['default']):
            exports['named'].append((class_name, match.start(), match.end()))
    
    return exports

def find_all_imports(content: str) -> Dict[str, List[Tuple[str, str, int, int]]]:
    """Find all imports in the content with their positions."""
    imports = {'default': [], 'named': []}
    
    # Default imports
    for match in re.finditer(r'import\s+(\w+)\s+from\s+[\'"]([^\'"]+)[\'"]', content, re.DOTALL):
        imports['default'].append((match.group(1), match.group(2), match.start(), match.end()))
    
    # Named imports
    for match in re.finditer(r'import\s*\{([^}]+)\}\s+from\s+[\'"]([^\'"]+)[\'"]', content, re.DOTALL):
        import_list = re.sub(r'//.*$', '', match.group(1), flags=re.MULTILINE)
        path = match.group(2)
        names = [name.strip() for name in import_list.split(',') if name.strip()]
        for name in names:
            actual_name = name.split(' as ')[0].strip()
            imports['named'].append((actual_name, path, match.start(), match.end()))
    
    return imports

def remove_duplicate_exports(content: str, verbose: bool = False) -> Tuple[str, List[str]]:
    """Remove duplicate exports from content."""
    changes = []
    exports = find_all_exports(content)
    
    all_exports = {}
    for export_type, export_list in exports.items():
        for name, start, end in export_list:
            all_exports.setdefault(name, []).append((export_type, start, end))
    
    duplicates = {name: positions for name, positions in all_exports.items() if len(positions) > 1}
    if not duplicates:
        return content, changes
    
    for name, positions in duplicates.items():
        positions.sort(key=lambda x: x[1], reverse=True)
        if verbose:
            print(f"    Found duplicate exports for '{name}': {[p[0] for p in positions]}", file=sys.stderr)
        
        priority = ['class', 'function', 'const', 'destructured', 'default']
        export_types = [p[0] for p in positions]
        keep_index = min((priority.index(t) for t in export_types if t in priority), default=0)
        
        for i, (export_type, start, end) in enumerate(positions):
            if i == keep_index:
                continue
            if export_type == 'destructured':
                match = re.search(r'export\s*\{[^}]*\b' + re.escape(name) + r'\b[^}]*\}(?:\s*;)?', content[max(0, start-50):end+50])
                if match:
                    actual_start = max(0, start-50) + match.start()
                    actual_end = max(0, start-50) + match.end()
                    export_content = content[actual_start:actual_end]
                    names = [n.strip() for n in re.search(r'\{([^}]+)\}', export_content).group(1).split(',') if n.strip()]
                    
                    if len(names) == 1:
                        content = content[:actual_start] + content[actual_end:]
                        changes.append(f"Removed duplicate export {{ {name} }}")
                    else:
                        new_export = 'export {' + ','.join(n for n in names if n != name) + '};'
                        content = content[:actual_start] + new_export + content[actual_end:]
                        changes.append(f"Removed {name} from export statement")
            else:
                line_start = content.rfind('\n', 0, start) + 1
                line_end = content.find('\n', end) or len(content)
                line = content[line_start:line_end]
                if line.strip().startswith('export'):
                    content = content[:line_start] + content[line_end+1:]
                    changes.append(f"Removed duplicate {export_type} export of {name}")
    
    content = re.sub(r';;+', ';', content)
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    return content, changes

def modernize_exports(content: str, filename: str, keep_as_default: Set[str], should_be_named: Set[str], verbose: bool = False) -> Tuple[str, List[str]]:
    """Modernize exports from default to named where appropriate."""
    changes = []
    exports = find_all_exports(content)
    basename = Path(filename).stem
    
    if basename in keep_as_default:
        for name, _, _ in exports['class']:
            if name == basename and not any(n == basename for n, _, _ in exports['default']):
                if any(n == basename for n, _, _ in exports['destructured']):
                    content, named_changes = _remove_named_export(content, basename)
                    changes.extend(named_changes)
                content = re.sub(r'class\s+' + re.escape(basename) + r'\b', f'export default class {basename}', content)
                changes.append(f'Added default export for {basename}')
                return content, changes
        return content, changes
    
    for name, start, end in exports['default']:
        if name == '_anonymous_':
            continue  # Skip anonymous exports
        if name in should_be_named or name == basename:
            if not any(n == name for n, _, _ in exports['destructured'] + exports['class'] + exports['function'] + exports['const']):
                content = re.sub(r'export\s+default\s+' + re.escape(name) + r'(?:\s*;)?', f'export {{ {name} }};', content)
                changes.append(f'Default to Named export: {name}')
    
    for name, _, _ in exports['class']:
        if name in should_be_named and not any(n == name for n, _, _ in exports['destructured']):
            content = re.sub(r'export\s+class\s+' + re.escape(name) + r'\b', f'class {name}', content)
            content = content.rstrip() + f'\n\nexport {{ {name} }};\n'
            changes.append(f'Class export to Named: {name}')
    
    return content, changes

def _remove_named_export(content: str, name: str) -> Tuple[str, List[str]]:
    """Remove a named export from the content."""
    changes = []
    for match in re.finditer(r'export\s*\{([^}]+)\}(?:\s*;)?', content):
        export_list = match.group(1)
        names = [n.strip() for n in export_list.split(',') if n.strip()]
        if name in names:
            if len(names) == 1:
                content = content[:match.start()] + content[match.end():]
                changes.append(f"Removed named export for {name}")
            else:
                new_export = 'export {' + ','.join(n for n in names if n != name) + '};'
                content = content[:match.start()] + new_export + content[match.end():]
                changes.append(f"Removed {name} from named exports")
    return content, changes

def fix_imports(content: str, modern_imports: Dict[str, str], default_imports: Dict[str, str], filename: str, verbose: bool = False) -> Tuple[str, List[str]]:
    """Fix import statements to match the export style."""
    changes = []
    imports = find_all_imports(content)
    
    for module_name, correct_import in modern_imports.items():
        pattern = f'import\\s+{module_name}\\s+from'
        if re.search(pattern, content):
            content = re.sub(pattern, correct_import, content)
            changes.append(f'Import modernized: {module_name}')
    
    for module_name, correct_import in default_imports.items():
        pattern = f'import\\s*{{\\s*{module_name}\\s*}}\\s*from'
        if re.search(pattern, content):
            content = re.sub(pattern, correct_import, content)
            changes.append(f'Base class import fixed: {module_name}')
    
    # Consolidate imports
    import_groups = {}
    for imp_type, imp_list in imports.items():
        for name, path, start, end in imp_list:
            import_groups.setdefault(path, []).append((imp_type, name, start, end))
    
    for path, imp_list in import_groups.items():
        module_name = Path(path).stem
        if module_name in default_imports and any(t == 'named' for t, _, _, _ in imp_list):
            for _, name, start, end in imp_list:
                if name == module_name:
                    content = re.sub(f'import\\s*{{\\s*{module_name}\\s*}}\\s+from\\s+[\'"]{re.escape(path)}[\'"]', 
                                   f'import {module_name} from \'{path}\'', content)
                    changes.append(f'Fixed named import to default: {module_name}')
        elif module_name in modern_imports and any(t == 'default' for t, _, _, _ in imp_list):
            for _, name, start, end in imp_list:
                if name == module_name:
                    content = re.sub(f'import\\s+{module_name}\\s+from\\s+[\'"]{re.escape(path)}[\'"]', 
                                   f'import {{ {module_name} }} from \'{path}\'', content)
                    changes.append(f'Fixed default import to named: {module_name}')
    
    return content, changes

def check_uicomponent_imports(content: str, filename: str, verbose: bool = False) -> Tuple[str, List[str]]:
    """Ensure UIComponent is imported as a default export."""
    changes = []
    if Path(filename).name == 'UIComponent.js':
        return content, changes
    
    for match in re.finditer(r'import\s+{?\s*UIComponent(?:\s+as\s+\w+)?\s*}?\s+from\s+[\'"]([^\'"]+)[\'"]', content):
        import_statement = match.group(0)
        import_path = match.group(1)
        if '{' in import_statement:
            alias = re.search(r'UIComponent\s+as\s+(\w+)', import_statement)
            new_import = f'import {alias.group(1) if alias else "UIComponent"} from {import_path!r}'
            content = content.replace(import_statement, new_import)
            changes.append(f'Fixed UIComponent import to default')
    
    return content, changes

def main():
    parser = argparse.ArgumentParser(description='Modernize JavaScript imports/exports with duplicate fix')
    parser.add_argument('--source', '-s', default='.', help='Source path to scan')
    parser.add_argument('--dry-run', '-d', action='store_true', help='Dry run - no files changed')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--fix-duplicates-only', action='store_true', help='Only fix duplicate exports')
    parser.add_argument('--skip-ui-component', action='store_true', help='Skip UIComponent import fixing')
    args = parser.parse_args()

    print("🚀 MODERN Import/Export Fixer - IMPROVED VERSION")
    print("Fixes duplicate exports and modernizes to named exports!")
    if args.dry_run:
        print("🔍 DRY RUN - No files will be changed")

    stats = {
        'files_scanned': 0, 'files_fixed': 0, 'exports_modernized': 0, 
        'imports_fixed': 0, 'duplicates_fixed': 0, 'double_semicolon_fixed': 0, 
        'uicomponent_imports_fixed': 0, 'errors': 0
    }
    failed_files = []

    keep_as_default_exports = {'UIComponent', 'World', 'main'}
    should_be_named_exports = {
        'CONFIG', 'UIConfig', 'AssetManager', 'TargetSystem', 'WeatherSystem', 'EnvironmentSystem',
        'MenuSystem', 'ScreenManager', 'MissionBriefing', 'RoundSummary', 'ScreenEffects',
        'HitIndicator', 'Feature', 'Sky', 'EnhancedSky', 'Enemy', 'Player', 'Level',
        'Weapon', 'Bullet', 'Blaster', 'Shotgun', 'AssaultRifle', 'HealthPack', 'Item',
        'WeaponItem', 'Projectile', 'CombatSystem', 'HUDSystem', 'NotificationSystem',
        'ProgressionSystem', 'MovementSystem', 'DOMFactory', 'EventManager', 'InputHandler'
    }
    modern_import_fixes = {name: f'import {{ {name} }} from' for name in should_be_named_exports}
    keep_default_imports = {name: f'import {name} from' for name in keep_as_default_exports}

    js_files = [f for f in Path(args.source).rglob("*.js") 
                if not any(x in str(f) for x in ['node_modules', '.git', 'build', 'dist']) 
                and not f.name.endswith('.min.js')]
    stats['files_scanned'] = len(js_files)
    print(f"\n📊 Found {len(js_files)} JavaScript files")

    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            stats['errors'] += 1
            failed_files.append((js_file, str(e)))
            if args.verbose:
                print(f"  ❌ Error reading {js_file.name}: {e}", file=sys.stderr)
            continue
        
        original_content = content
        all_changes = []
        
        content, duplicate_changes = remove_duplicate_exports(content, args.verbose)
        all_changes.extend(duplicate_changes)
        stats['duplicates_fixed'] += len(duplicate_changes)
        
        if not args.fix_duplicates_only:
            content, export_changes = modernize_exports(content, js_file.name, keep_as_default_exports, should_be_named_exports, args.verbose)
            all_changes.extend(export_changes)
            stats['exports_modernized'] += len(export_changes)
            
            content, import_changes = fix_imports(content, modern_import_fixes, keep_default_imports, js_file.name, args.verbose)
            all_changes.extend(import_changes)
            stats['imports_fixed'] += len(import_changes)
        
        if not args.skip_ui_component:
            content, ui_changes = check_uicomponent_imports(content, js_file.name, args.verbose)
            all_changes.extend(ui_changes)
            stats['uicomponent_imports_fixed'] += len(ui_changes)
        
        if ';;' in content:
            content = re.sub(r';;+', ';', content)
            all_changes.append('Double semicolons fixed')
            stats['double_semicolon_fixed'] += 1
        
        if content != original_content and not args.dry_run:
            try:
                with open(js_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                stats['files_fixed'] += 1
                if args.verbose:
                    print(f"  ✅ {js_file.name}: {', '.join(all_changes)}")
            except Exception as e:
                stats['errors'] += 1
                failed_files.append((js_file, str(e)))
                if args.verbose:
                    print(f"  ❌ Error writing {js_file.name}: {e}", file=sys.stderr)

    print("\n📊 RESULTS")
    print(f"Files scanned: {stats['files_scanned']}")
    print(f"Files changed: {stats['files_fixed']}")
    print(f"Duplicate exports fixed: {stats['duplicates_fixed']}")
    if not args.fix_duplicates_only:
        print(f"Exports modernized: {stats['exports_modernized']}")
        print(f"Imports modernized: {stats['imports_fixed']}")
    if not args.skip_ui_component:
        print(f"UIComponent imports fixed: {stats['uicomponent_imports_fixed']}")
    print(f"Double semicolons fixed: {stats['double_semicolon_fixed']}")
    if stats['errors']:
        print(f"Errors encountered: {stats['errors']}")
        if args.verbose:
            print("Failed files:")
            for file, error in failed_files:
                print(f"  - {file}: {error}", file=sys.stderr)

    total_fixes = sum(v for k, v in stats.items() if k != 'files_scanned' and k != 'errors')
    print(f"\n🎯 TOTAL {total_fixes} FIXES APPLIED!")
    if args.dry_run:
        print("\n🔍 DRY RUN - No files were changed")
    else:
        print("\n✅ CODEBASE FIXED!")

if __name__ == "__main__":
    main()