import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveAllConflicts(content) {
  let result = content;
  let count = 0;
  let maxIterations = 1000;

  // Keep resolving until no more conflicts
  while (result.includes('<<<<<<< HEAD') && count < maxIterations) {
    count++;
    
    // Match: <<<<<<< HEAD\nHEAD_CONTENT\n=======\nOTHER_CONTENT\n>>>>>>> HASH
    const pattern = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [a-f0-9]+\r?\n/;
    const match = result.match(pattern);
    
    if (!match) {
      // Try pattern without trailing newline
      const pattern2 = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [a-f0-9]+/;
      const match2 = result.match(pattern2);
      if (match2) {
        result = result.replace(pattern2, '$1');
      } else {
        break;
      }
    } else {
      result = result.replace(pattern, '$1\n');
    }
  }

  return result;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        totalFixed += walkDir(fullPath);
      }
    } else {
      const ext = path.extname(file);
      if (['.tsx', '.ts', '.jsx', '.js', '.json', '.sql', '.toml', '.md', '.mjs'].includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          if (content.includes('<<<<<<< HEAD')) {
            const resolved = resolveAllConflicts(content);
            fs.writeFileSync(fullPath, resolved, 'utf-8');
            console.log(`✓ ${path.relative(__dirname, fullPath)}`);
            totalFixed++;
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
    }
  });

  return totalFixed;
}

console.log('Resolving all merge conflicts (taking HEAD version)...\n');
const fixed = walkDir(__dirname);
console.log(`\nResolved ${fixed} files!`);
