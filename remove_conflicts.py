#!/usr/bin/env python3
import os
import re
from pathlib import Path

def remove_merge_conflicts(directory, extensions):
    """Remove merge conflict markers, keeping the HEAD version"""
    fixed_count = 0
    pattern = r'<<<<<<< HEAD\n([\s\S]*?)\n=======\n[\s\S]*?\n>>>>>>> [^\n]+\n'

    for root, dirs, files in os.walk(directory):
        # Skip node_modules and dist
        if 'node_modules' in root or 'dist' in root or '.git' in root:
            continue

        for file in files:
            ext = Path(file).suffix
            if ext in extensions:
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                    original_len = len(content)
                    # Remove conflict markers, keep HEAD version
                    new_content = re.sub(pattern, r'\1', content)

                    if len(new_content) != original_len:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        fixed_count += 1
                        print(f"✓ Fixed: {filepath}")
                except Exception as e:
                    print(f"✗ Error processing {filepath}: {str(e)}")

    print(f"\n✅ Removed merge conflict markers from {fixed_count} files")

extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html', '.md', '.yml', '.yaml']
remove_merge_conflicts('.', extensions)
