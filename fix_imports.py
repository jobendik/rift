#!/usr/bin/env python3
"""
Modern Import/Export Fixer - IMPROVED VERSION
Standardizes to MODERN named exports and fixes duplicate export issues
"""

import os
import re
import argparse
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
    
    # Find export default statements with identifier
    for match in re.finditer(r'export\s+default\s+(\w+)(?:\s*;)?', content):
        exports['default'].append((match.group(1), match.start(), match.end()))
    
    # Find anonymous export default function/class statements
    for pattern in [r'export\s+default\s+function\s*\(', r'export\s+default\s+class\s+\{']: 
        for match in re.finditer(pattern, content):
            # Mark these specially with _anonymous_ prefix
            exports['default'].append(('_anonymous_', match.start(), match.end()))
    
    # Find export class statements
    for match in re.finditer(r'export\s+class\s+(\w+)', content):
        exports['class'].append((match.group(1), match.start(), match.end()))
    
    # Find export function statements
    for match in re.finditer(r'export\s+function\s+(\w+)', content):
        exports['function'].append((match.group(1), match.start(), match.end()))
    
    # Find export const/let/var statements
    for match in re.finditer(r'export\s+(?:const|let|var)\s+(\w+)', content):
        exports['const'].append((match.group(1), match.start(), match.end()))
    
    # Find export { ... } statements
    for match in re.finditer(r'export\s*\{([^}]+)\}(?:\s*;)?', content):
        export_list = match.group(1)
        names = [name.strip() for name in export_list.split(',')]
        for name in names:
            exports['destructured'].append((name, match.start(), match.end()))
    
    # Find class declarations that don't have export keyword (fixed regex)
    # First, find all class declarations
    for match in re.finditer(r'class\s+(\w+)', content):
        # Check if this class name isn't already exported
        class_name = match.group(1)
        start_pos = match.start()
        
        # Check if preceded by "export" keyword
        line_start = content.rfind('\n', 0, start_pos) + 1
        preceding_text = content[line_start:start_pos].strip()
        
        # If not preceded by "export" and not already in our export lists
        if not preceding_text.endswith('export') and not preceding_text.endswith('export default') and \
           not any(name == class_name for name, _, _ in exports['class']) and \
           not any(name == class_name for name, _, _ in exports['destructured']) and \
           not any(name == class_name for name, _, _ in exports['default']):
            # This is a non-exported class
            exports['named'].append((class_name, start_pos, match.end()))
    
    return exports

def find_all_imports(content: str) -> Dict[str, List[Tuple[str, str, int, int]]]:
    """Find all imports in the content with their positions."""
    imports = {
        'default': [],
        'named': []
    }
    
    # Find default imports: import Name from 'path'
    # The (?s) flag makes . match newlines, allowing multi-line imports
    for match in re.finditer(r'import\s+(\w+)\s+from\s+[\'"]([^\'"]+)[\'"]', content):
        imports['default'].append((match.group(1), match.group(2), match.start(), match.end()))
    
    # Find named imports: import { Name } from 'path'
    # The (?s) flag makes . match newlines, allowing multi-line imports
    for match in re.finditer(r'import\s*\{([^}]+)\}\s+from\s+[\'"]([^\'"]+)[\'"]', content):
        import_list = match.group(1)
        path = match.group(2)
        # Remove any comments in the import list
        import_list = re.sub(r'//.*?$', '', import_list, flags=re.MULTILINE)
        # Split by commas and handle whitespace/comments
        names = [name.strip() for name in import_list.split(',') if name.strip()]
        for name in names:
            # Handle aliasing (import { Something as OtherName })
            name_parts = name.split(' as ')
            actual_name = name_parts[0].strip()
            imports['named'].append((actual_name, path, match.start(), match.end()))
    
    return imports

def remove_duplicate_exports(content: str, verbose: bool = False) -> Tuple[str, List[str]]:
    """Remove duplicate exports from content."""
    changes = []
    exports = find_all_exports(content)
    
    # Collect all exported names
    all_exports = {}
    for export_type, export_list in exports.items():
        for name, start, end in export_list:
            if name not in all_exports:
                all_exports[name] = []
            all_exports[name].append((export_type, start, end))
    
    # Find duplicates
    duplicates = {name: positions for name, positions in all_exports.items() if len(positions) > 1}
    
    if not duplicates:
        return content, changes
    
    # Sort positions by start index (reverse order for safe removal)
    for name, positions in duplicates.items():
        positions.sort(key=lambda x: x[1], reverse=True)
        
        if verbose:
            print(f"    Found duplicate exports for '{name}': {[p[0] for p in positions]}")
        
        # Decide which export to keep
        # Priority: export class/function > export const > export { name } > export default
        export_types = [p[0] for p in positions]
        
        keep_index = 0
        if 'class' in export_types:
            keep_index = export_types.index('class')
        elif 'function' in export_types:
            keep_index = export_types.index('function')
        elif 'const' in export_types:
            keep_index = export_types.index('const')
        elif 'destructured' in export_types:
            keep_index = export_types.index('destructured')
        
        # Remove all but the one we want to keep
        for i, (export_type, start, end) in enumerate(positions):
            if i == keep_index:
                continue
                
            # Find the complete statement to remove
            if export_type == 'destructured':
                # For destructured exports, we need to handle the entire export statement
                match = re.search(r'export\s*\{[^}]*\b' + re.escape(name) + r'\b[^}]*\}(?:\s*;)?', content[max(0, start-50):end+50])
                if match:
                    actual_start = max(0, start-50) + match.start()
                    actual_end = max(0, start-50) + match.end()
                    
                    # Check if this is the only name in the export
                    export_content = content[actual_start:actual_end]
                    names_in_export = re.findall(r'\b(\w+)\b', re.search(r'\{([^}]+)\}', export_content).group(1))
                    
                    if len(names_in_export) == 1:
                        # Remove the entire export statement
                        content = content[:actual_start] + content[actual_end:]
                        changes.append(f"Removed duplicate export {{ {name} }}")
                    else:
                        # Remove just this name from the export
                        new_export = re.sub(r',?\s*\b' + re.escape(name) + r'\b\s*,?', '', export_content)
                        # Clean up any double commas
                        new_export = re.sub(r',\s*,', ',', new_export)
                        new_export = re.sub(r'\{\s*,', '{', new_export)
                        new_export = re.sub(r',\s*\}', '}', new_export)
                        content = content[:actual_start] + new_export + content[actual_end:]
                        changes.append(f"Removed {name} from export statement")
            else:
                # For other types, find the complete line
                line_start = content.rfind('\n', 0, start) + 1
                line_end = content.find('\n', end)
                if line_end == -1:
                    line_end = len(content)
                
                # Remove the line if it only contains the export
                line = content[line_start:line_end]
                if line.strip().startswith('export'):
                    content = content[:line_start] + content[line_end+1:]
                    changes.append(f"Removed duplicate {export_type} export of {name}")
    
    # Clean up any resulting double semicolons or empty lines
    content = re.sub(r';;+', ';', content)
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    return content, changes

def modernize_exports(content: str, filename: str, keep_as_default: Set[str], should_be_named: Set[str], verbose: bool = False) -> Tuple[str, List[str]]:
    """Modernize exports from default to named where appropriate."""
    changes = []
    exports = find_all_exports(content)
    
    # Check if we should skip this file or convert to default export
    basename = Path(filename).stem
    
    # If the file has the same name as a class/object that should be default export
    if basename in keep_as_default:
        # Handle class exports - convert to default if needed
        class_exports = [name for name, _, _ in exports['class'] if name == basename]
        if class_exports and not any(name == basename for name, _, _ in exports['default']):
            # Check if this class is exported via named export
            if any(name == basename for name, _, _ in exports['destructured']):
                # Remove the named export
                content, named_changes = _remove_named_export(content, basename)
                changes.extend(named_changes)
                
                # Add default export at the end
                pattern = r'class\s+' + re.escape(basename) + r'\b'
                content = re.sub(pattern, f'export default class {basename}', content)
                changes.append(f'Added default export for {basename}')
            elif any(name == basename for name, _, _ in exports['class']):
                # Convert class export to default
                pattern = r'export\s+class\s+' + re.escape(basename) + r'\b'
                content = re.sub(pattern, f'export default class {basename}', content)
                changes.append(f'Class to Default export: {basename}')
        return content, changes
    
    # Handle export default -> export { name }
    for name, start, end in exports['default']:
        if name in should_be_named or name == basename:
            # Check if already has a named export
            has_named = any(n == name for n, _, _ in exports['destructured'])
            has_class = any(n == name for n, _, _ in exports['class'])
            has_function = any(n == name for n, _, _ in exports['function'])
            has_const = any(n == name for n, _, _ in exports['const'])
            
            if not (has_named or has_class or has_function or has_const):
                # Replace export default with export { name }
                pattern = r'export\s+default\s+' + re.escape(name) + r'(?:\s*;)?'
                content = re.sub(pattern, f'export {{ {name} }};', content)
                changes.append(f'Default to Named export: {name}')
    
    # Handle export class -> class + export { name }
    for name, start, end in exports['class']:
        if name in should_be_named:
            # Check if already has a destructured export
            has_destructured = any(n == name for n, _, _ in exports['destructured'])
            
            if not has_destructured:
                # First, change export class to just class
                content = re.sub(r'export\s+class\s+' + re.escape(name) + r'\b', 
                               f'class {name}', content)
                
                # Then add export { name } at the end
                content = content.rstrip() + f'\n\nexport {{ {name} }};\n'
                changes.append(f'Class export to Named: {name}')
    
    return content, changes

def _remove_named_export(content: str, name: str) -> Tuple[str, List[str]]:
    """Remove a named export from the content."""
    changes = []
    
    # Find and remove from export { ... } statements
    for match in re.finditer(r'export\s*\{([^}]+)\}(?:\s*;)?', content):
        export_list = match.group(1)
        export_start = match.start()
        export_end = match.end()
        
        names = [n.strip() for n in export_list.split(',')]
        if name in names:
            # If it's the only name, remove the whole export
            if len(names) == 1:
                content = content[:export_start] + content[export_end:]
                changes.append(f"Removed named export for {name}")
            else:
                # Remove just this name
                new_export_list = ','.join(n for n in names if n != name)
                new_export = f"export {{ {new_export_list} }};"
                content = content[:export_start] + new_export + content[export_end:]
                changes.append(f"Removed {name} from named exports")
    
    return content, changes

def fix_imports(content: str, modern_imports: Dict[str, str], default_imports: Dict[str, str], filename: str, verbose: bool = False) -> Tuple[str, List[str]]:
    """Fix import statements to match the export style."""
    changes = []
    
    # Get the stem of the current file name
    file_stem = Path(filename).stem
    
    # Fix imports that should be named
    for module_name, correct_import in modern_imports.items():
        wrong_pattern = f'import\\s+{module_name}\\s+from'
        if re.search(wrong_pattern, content):
            content = re.sub(wrong_pattern, correct_import, content)
            changes.append(f'Import modernized: {module_name}')
    
    # Fix imports that should be default
    for module_name, correct_import in default_imports.items():
        wrong_pattern = f'import\\s*{{\\s*{module_name}\\s*}}\\s*from'
        if re.search(wrong_pattern, content):
            content = re.sub(wrong_pattern, correct_import, content)
            changes.append(f'Base class import fixed: {module_name}')
    
    # Find all import paths in the content
    import_patterns = [
        (r'import\s+\w+\s+from\s+[\'"]([^\'"]+)[\'"]', 'default'),  # Default imports
        (r'import\s*\{[^}]+\}\s+from\s+[\'"]([^\'"]+)[\'"]', 'named')  # Named imports
    ]
    
    imported_modules = {}
    for pattern, import_type in import_patterns:
        for match in re.finditer(pattern, content):
            path = match.group(1)
            if path not in imported_modules:
                imported_modules[path] = set()
            imported_modules[path].add(import_type)
    
    # Process each imported module to check for correct import type
    for path, import_types in imported_modules.items():
        # Extract the module name from the path
        module_name = Path(path).stem
        
        # Check if this module should be imported as default
        if module_name in default_imports:
            if 'named' in import_types and 'default' not in import_types:
                # Fix the named import to be default
                pattern = f'import\\s*{{\\s*{module_name}\\s*}}\\s+from\\s+[\'"]({re.escape(path)})[\'"]'
                replacement = f'import {module_name} from \'\\1\''
                content = re.sub(pattern, replacement, content)
                changes.append(f'Fixed named import to default: {module_name}')
        
        # Check if this module should be imported as named
        elif module_name in modern_imports:
            if 'default' in import_types and 'named' not in import_types:
                # Fix the default import to be named
                pattern = f'import\\s+(\\w+)\\s+from\\s+[\'"]({re.escape(path)})[\'"]'
                for match in re.finditer(pattern, content):
                    import_name = match.group(1)
                    replacement = f'import {{ {module_name} }} from \'\\2\''
                    content = content[:match.start()] + replacement + content[match.end():]
                    changes.append(f'Fixed default import to named: {import_name} -> {module_name}')
    
    return content, changes

def check_uicomponent_imports(content: str, filename: str, verbose: bool = False) -> Tuple[str, List[str]]:
    """Special handling for UIComponent imports which are causing issues."""
    changes = []
    
    # Don't process UIComponent.js itself
    if Path(filename).name == 'UIComponent.js':
        return content, changes
    
    # Check if this file is importing UIComponent
    ui_component_imports = re.finditer(r'import\s+{?\s*UIComponent(?:\s+as\s+\w+)?\s*}?\s+from\s+[\'"]([^\'"]+)[\'"]', content)
    
    for match in ui_component_imports:
        import_path = match.group(1)
        import_statement = match.group(0)
        
        # Check if it's importing UIComponent with named syntax
        if '{' in import_statement and '}' in import_statement:
            # Handle potential "as" alias
            if 'as' in import_statement:
                alias_match = re.search(r'UIComponent\s+as\s+(\w+)', import_statement)
                if alias_match:
                    alias = alias_match.group(1)
                    new_import = f'import {alias} from {import_path!r}'
                else:
                    new_import = f'import UIComponent from {import_path!r}'
            else:
                new_import = f'import UIComponent from {import_path!r}'
            
            content = content.replace(import_statement, new_import)
            changes.append(f'Fixed UIComponent import to use default import')
    
    # Look for imports that target a path ending with UIComponent.js
    ui_component_path_imports = re.finditer(r'import\s+{([^}]+)}\s+from\s+[\'"]([^\'"]*UIComponent(?:\.js)?)[\'"]', content)
    for match in ui_component_path_imports:
        imported_names = match.group(1).strip()
        import_path = match.group(2)
        import_statement = match.group(0)
        
        # Only handle pure UIComponent imports (no other names)
        if re.match(r'^\s*UIComponent\s*$', imported_names):
            new_import = f'import UIComponent from {import_path!r}'
            content = content.replace(import_statement, new_import)
            changes.append(f'Fixed UIComponent path import to use default import')
    
    return content, changes

def analyze_import_export_relationships(js_files, verbose=False):
    """
    Analyze all JS files to determine the import/export relationships and identify mismatches.
    Returns a mapping of file paths to their required export style.
    """
    # Track how each file is imported by others
    import_styles = {}  # path -> {"named": count, "default": count}
    
    # First pass: analyze all imports to determine how each module is typically imported
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find all imports
            imports = find_all_imports(content)
            
            # Analyze each import to determine the style
            for import_type, import_list in imports.items():
                for item in import_list:
                    if import_type == 'default':
                        name, path, _, _ = item
                        # Convert relative path to absolute path for consistency
                        module_path = resolve_import_path(js_file, path)
                        if module_path not in import_styles:
                            import_styles[module_path] = {"named": 0, "default": 0}
                        import_styles[module_path]["default"] += 1
                    elif import_type == 'named':
                        name, path, _, _ = item
                        module_path = resolve_import_path(js_file, path)
                        if module_path not in import_styles:
                            import_styles[module_path] = {"named": 0, "default": 0}
                        import_styles[module_path]["named"] += 1
        except Exception as e:
            if verbose:
                print(f"  ❌ Error analyzing imports in {js_file}: {e}")
    
    # Determine the dominant import style for each file
    export_style_map = {}
    for module_path, counts in import_styles.items():
        # Determine the preferred style based on usage
        # If a file is imported more frequently with named imports, it should use named exports
        if counts["named"] > counts["default"]:
            export_style_map[module_path] = "named"
        elif counts["default"] > 0:  # If default imports exist at all, honor them
            export_style_map[module_path] = "default"
        else:
            export_style_map[module_path] = "named"  # Default to named if unsure
            
        if verbose:
            print(f"  File {module_path}: Named imports: {counts['named']}, Default imports: {counts['default']} -> {export_style_map[module_path]}")
    
    return export_style_map

def resolve_import_path(source_file, import_path):
    """
    Convert a relative import path to an absolute path.
    """
    # Handle ./ and ../ relative paths
    if import_path.startswith('./') or import_path.startswith('../'):
        source_dir = os.path.dirname(source_file)
        absolute_path = os.path.normpath(os.path.join(source_dir, import_path))
        
        # Add .js extension if missing
        if not absolute_path.endswith('.js'):
            absolute_path += '.js'
            
        return absolute_path
    
    # For non-relative imports like 'path/to/module', try to find the file in standard locations
    # This is a simplification and might need enhancement for your specific project structure
    return import_path

def fix_import_export_mismatches(content, file_path, export_style_map, verbose=False):
    """
    Fix mismatches between export style and import expectations.
    """
    changes = []
    
    # Determine the expected export style for this file
    expected_style = export_style_map.get(file_path)
    if not expected_style:
        return content, changes
    
    # Find all exports in this file
    exports = find_all_exports(content)
    
    # If this file should use named exports but has default exports, convert them
    if expected_style == "named":
        for name, start, end in exports.get('default', []):
            if name == '_anonymous_':
                continue  # Skip anonymous exports as they can't be easily converted
                
            # Check if this file also has a named export for the same identifier
            has_named_export = any(n == name for n, _, _ in exports.get('destructured', []))
            if not has_named_export:
                # Replace 'export default Name' with 'export { Name }'
                pattern = r'export\s+default\s+' + re.escape(name) + r'(?:\s*;)?'
                content = re.sub(pattern, f'export {{ {name} }};', content)
                changes.append(f'Converted default export to named export: {name}')
                
                # If it's a class or function with 'export default' at the beginning, convert it
                pattern = r'export\s+default\s+class\s+' + re.escape(name)
                content = re.sub(pattern, f'export class {name}', content)
                
                pattern = r'export\s+default\s+function\s+' + re.escape(name)
                content = re.sub(pattern, f'export function {name}', content)
    
    # If this file should use default exports but has named exports, convert them
    elif expected_style == "default":
        # Only convert if the file has exactly one main export to avoid ambiguity
        # Determine the main export of the file (often matches the file name)
        file_name = os.path.basename(file_path)
        base_name = os.path.splitext(file_name)[0]
        
        # Check if we have a named export that matches the file name
        main_export = None
        for name, _, _ in exports.get('class', []) + exports.get('function', []) + exports.get('destructured', []):
            if name == base_name:
                main_export = name
                break
        
        # If we identified a main export, convert it to default
        if main_export:
            # First check if file already has a default export
            has_default = len(exports.get('default', [])) > 0
            
            if not has_default:
                # Check if it's already a 'export class X' situation
                class_match = re.search(r'export\s+class\s+' + re.escape(main_export), content)
                function_match = re.search(r'export\s+function\s+' + re.escape(main_export), content)
                
                if class_match:
                    # Convert 'export class X' to 'export default class X'
                    content = re.sub(r'export\s+class\s+' + re.escape(main_export),
                                   f'export default class {main_export}', content)
                    changes.append(f'Converted named class export to default: {main_export}')
                elif function_match:
                    # Convert 'export function X' to 'export default function X'
                    content = re.sub(r'export\s+function\s+' + re.escape(main_export),
                                   f'export default function {main_export}', content)
                    changes.append(f'Converted named function export to default: {main_export}')
                else:
                    # Look for named export in destructured exports
                    for name, start, end in exports.get('destructured', []):
                        if name == main_export:
                            # Remove from named exports
                            content, named_changes = _remove_named_export(content, main_export)
                            changes.extend(named_changes)
                            
                            # Add default export at the end
                            content = content.rstrip() + f'\n\nexport default {main_export};\n'
                            changes.append(f'Added default export for {main_export}')
                            break
    
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
    print("===============================================")
    print("Fixes duplicate exports and modernizes to named exports!")
    
    if args.dry_run:
        print("🔍 DRY RUN - No files will be changed")
    
    if args.fix_duplicates_only:
        print("🔧 DUPLICATE FIX MODE - Only fixing duplicate exports")
    
    if args.skip_ui_component:
        print("⚠️ SKIPPING UIComponent import fixes")
    else:
        print("🛠️ FIXING UIComponent imports enabled")

    # Statistics
    stats = {
        'files_scanned': 0,
        'files_fixed': 0,
        'exports_modernized': 0,
        'imports_fixed': 0,
        'duplicates_fixed': 0,
        'double_semicolon_fixed': 0,
        'uicomponent_imports_fixed': 0,
        'import_export_mismatches_fixed': 0  # New counter
    }

    # Files that SHOULD remain as default exports
    keep_as_default_exports = {
        'UIComponent',
        'World',
        'main'
    }

    # Files that SHOULD be named exports
    should_be_named_exports = {
        'CONFIG', 'UIConfig', 'AssetManager', 'TargetSystem', 'WeatherSystem', 'EnvironmentSystem',
        'MenuSystem', 'ScreenManager', 'MissionBriefing', 'RoundSummary', 'ScreenEffects',
        'HitIndicator', 'Feature', 'Sky', 'EnhancedSky', 'Enemy', 'Player', 'Level',
        'Weapon', 'Bullet', 'Blaster', 'Shotgun', 'AssaultRifle', 'HealthPack', 'Item',
        'WeaponItem', 'Projectile', 'CombatSystem', 'HUDSystem', 'NotificationSystem',
        'ProgressionSystem', 'MovementSystem', 'DOMFactory', 'EventManager', 'InputHandler'
    }

    # Modern import patterns
    modern_import_fixes = {name: f'import {{ {name} }} from' for name in should_be_named_exports}
    keep_default_imports = {name: f'import {name} from' for name in keep_as_default_exports}

    # Find all JavaScript files
    source_path = Path(args.source)
    js_files = []
    
    for js_file in source_path.rglob("*.js"):
        if any(exclude in str(js_file) for exclude in ['node_modules', '.git', 'build', 'dist']):
            continue
        if js_file.name.endswith('.min.js'):
            continue
        js_files.append(js_file)

    stats['files_scanned'] = len(js_files)
    print(f"\n📊 Found {len(js_files)} JavaScript files")

    # Special handling for UIComponent.js to make sure it has a default export
    ui_component_file = None
    for js_file in js_files:
        if js_file.name == 'UIComponent.js':
            ui_component_file = js_file
            break
    
    if ui_component_file and not args.fix_duplicates_only:
        try:
            with open(ui_component_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if UIComponent.js has a default export
            has_default_export = re.search(r'export\s+default\s+', content) is not None
            
            if not has_default_export:
                # Add default export
                if 'class UIComponent' in content and 'export class UIComponent' not in content:
                    # Add export default statement at the end
                    content = content.rstrip() + '\n\nexport default UIComponent;\n'
                    changes = ['Added default export for UIComponent']
                elif 'export class UIComponent' in content:
                    # Replace export class with export default class
                    content = content.replace('export class UIComponent', 'export default class UIComponent')
                    changes = ['Converted to default export for UIComponent']
                else:
                    # Can't find UIComponent class, skip
                    changes = []
                
                if changes and not args.dry_run:
                    with open(ui_component_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"  ✅ {ui_component_file.name}: {', '.join(changes)}")
                    stats['files_fixed'] += 1
            
        except Exception as e:
            if args.verbose:
                print(f"  ❌ Error processing UIComponent.js: {e}")

    # Analyze import/export relationships across files
    print("Analyzing import/export relationships...")
    export_style_map = analyze_import_export_relationships(js_files, args.verbose)
    print(f"Analyzed {len(export_style_map)} module relationships")

    # Process each file
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            if args.verbose:
                print(f"  ❌ Error reading {js_file.name}: {e}")
            continue
        
        original_content = content
        all_changes = []
        
        # Step 1: Always fix duplicate exports first
        content, duplicate_changes = remove_duplicate_exports(content, args.verbose)
        if duplicate_changes:
            all_changes.extend(duplicate_changes)
            stats['duplicates_fixed'] += len(duplicate_changes)
        
        if not args.fix_duplicates_only:
            # Step 2: Modernize exports
            filename = js_file.stem
            content, export_changes = modernize_exports(
                content, js_file.name, keep_as_default_exports, should_be_named_exports, args.verbose
            )
            if export_changes:
                all_changes.extend(export_changes)
                stats['exports_modernized'] += len(export_changes)
            
            # Step 3: Fix imports
            content, import_changes = fix_imports(
                content, modern_import_fixes, keep_default_imports, js_file.name, args.verbose
            )
            if import_changes:
                all_changes.extend(import_changes)
                stats['imports_fixed'] += len(import_changes)
        
        # Step 4: Always fix UIComponent imports unless explicitly skipped
        if not args.skip_ui_component:
            content, ui_changes = check_uicomponent_imports(content, js_file.name, args.verbose)
            if ui_changes:
                all_changes.extend(ui_changes)
                stats['uicomponent_imports_fixed'] += len(ui_changes)
        
        # Step 5: Fix import/export mismatches
        content, mismatch_changes = fix_import_export_mismatches(
            content, str(js_file), export_style_map, args.verbose
        )
        if mismatch_changes:
            all_changes.extend(mismatch_changes)
            stats['import_export_mismatches_fixed'] += len(mismatch_changes)

        # Always clean up double semicolons
        if ';;' in content:
            content = re.sub(r';;+', ';', content)
            all_changes.append('Double semicolons fixed')
            stats['double_semicolon_fixed'] += 1
        
        # Write changes if any
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
            if args.verbose or all_changes:
                print(f"  ✅ {js_file.name}: {', '.join(all_changes)}")

    # Final report
    print("\n📊 RESULTS")
    print("============")
    print(f"Files scanned: {stats['files_scanned']}")
    print(f"Files changed: {stats['files_fixed']}")
    print(f"Duplicate exports fixed: {stats['duplicates_fixed']}")
    
    if not args.fix_duplicates_only:
        print(f"Exports modernized: {stats['exports_modernized']}")
        print(f"Imports modernized: {stats['imports_fixed']}")
    
    if not args.skip_ui_component:
        print(f"UIComponent imports fixed: {stats['uicomponent_imports_fixed']}")
    
    print(f"Import/export mismatches fixed: {stats['import_export_mismatches_fixed']}")
    print(f"Double semicolons fixed: {stats['double_semicolon_fixed']}")

    # Calculate total fixes - only include relevant stats based on mode
    if args.fix_duplicates_only:
        # Only include fixes that are always applied in duplicate-only mode
        total_fixes = sum(stats[k] for k in ['duplicates_fixed', 'double_semicolon_fixed'])
        # Include UIComponent fixes if not skipped
        if not args.skip_ui_component:
            total_fixes += stats['uicomponent_imports_fixed']
    else:
        # Include all fix types
        total_fixes = sum(stats[k] for k in [
            'duplicates_fixed', 'exports_modernized', 'imports_fixed', 
            'double_semicolon_fixed', 'uicomponent_imports_fixed',
            'import_export_mismatches_fixed'
        ])

    print(f"\n🎯 TOTAL {total_fixes} FIXES APPLIED!")

    if args.dry_run:
        print("\n🔍 DRY RUN - No files were changed")
        print("Run without --dry-run to apply changes")
    else:
        print("\n✅ CODEBASE FIXED!")
        if args.fix_duplicates_only:
            print("🎉 Duplicate exports have been cleaned up!")
            print("\nRun without --fix-duplicates-only to also modernize exports")
        else:
            print("🎉 Exports modernized and duplicates fixed!")

if __name__ == "__main__":
    main()