import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function removeAllConflictMarkers(content) {
  // Pattern 1: Simple case with clear boundaries
  content = content.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [a-f0-9]+\r?\n/g, '$1\n');
  
  // Pattern 2: Without trailing newline
  content = content.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [a-f0-9]+/g, '$1');
  
  // Pattern 3: Clean up any remaining standalone markers
  content = content.replace(/^\s*<<<<<<< HEAD\s*\n/gm, '');
  content = content.replace(/^\s*=======\s*\n/gm, '');
  content = content.replace(/^\s*>>>>>>> [a-f0-9]+\s*\n/gm, '');
  
  return content;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('.claude')) {
        totalFixed += walkDir(fullPath);
      }
    } else {
      const ext = path.extname(file);
      if (['.tsx', '.ts', '.jsx', '.js', '.json', '.sql', '.toml', '.md', '.mjs'].includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          if (content.includes('<<<<<<< HEAD')) {
            const resolved = removeAllConflictMarkers(content);
            
            if (resolved !== content) {
              fs.writeFileSync(fullPath, resolved, 'utf-8');
              console.log(`✓ ${path.relative(__dirname, fullPath)}`);
              totalFixed++;
            }
          }
        } catch (e) {
          // Skip files that can't be read/written
        }
      }
    }
  });

  return totalFixed;
}

console.log('Force resolving all merge conflicts...\n');
const fixed = walkDir(__dirname);
console.log(`\nResolved ${fixed} files!`);
