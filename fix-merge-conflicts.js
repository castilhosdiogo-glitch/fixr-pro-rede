import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function removeConflictMarkers(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html', '.md']) {
  const fullDir = path.join(__dirname, dir);
  const files = fs.readdirSync(fullDir, { recursive: true });
  let fixedCount = 0;

  for (const file of files) {
    const fullPath = path.join(fullDir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        try {
          let content = fs.readFileSync(fullPath, 'utf8');
          const originalLength = content.length;

          // Remove merge conflict markers, keeping HEAD version
          content = content.replace(/<<<<<<< HEAD\n([\s\S]*?)\n=======\n[\s\S]*?\n>>>>>>> [^\n]+\n/g, '$1');

          if (content.length !== originalLength) {
            fs.writeFileSync(fullPath, content, 'utf8');
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

removeConflictMarkers('./src');
removeConflictMarkers('./public');
removeConflictMarkers('./', ['.json', '.md', '.yml', '.yaml']);
