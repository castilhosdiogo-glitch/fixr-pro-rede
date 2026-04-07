import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function removeConflicts(dir, extensions) {
  const files = fs.readdirSync(dir, { recursive: true, encoding: 'utf-8' });
  let fixedCount = 0;

  for (const file of files) {
    // Skip directories
    if (file.includes('node_modules') || file.includes('dist') || file.includes('.git')) {
      continue;
    }

    const ext = path.extname(file);
    if (extensions.includes(ext)) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        try {
          let content = fs.readFileSync(fullPath, 'utf-8');
          const originalLength = content.length;

          // Remove merge conflict markers, keeping HEAD version
          content = content.replace(/<<<<<<< HEAD\n([\s\S]*?)\n=======\n[\s\S]*?\n>>>>>>> [^\n]+\n/g, '$1');

          if (content.length !== originalLength) {
            fs.writeFileSync(fullPath, content, 'utf-8');
            fixedCount++;
            console.log(`✓ Fixed: ${file}`);
          }
        } catch (err) {
          console.error(`✗ Error processing ${file}:`, err.message);
        }
      }
    }
  }

  console.log(`\n✅ Removed merge conflict markers from ${fixedCount} files`);
}

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html', '.md', '.yml', '.yaml'];
removeConflicts('.', extensions);
