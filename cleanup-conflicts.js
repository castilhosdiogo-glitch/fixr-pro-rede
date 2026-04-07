import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function removeConflictMarkers(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    if (!content.includes('<<<<<<< HEAD')) {
      return false;
    }

    // Keep removing conflict blocks until none remain
    let iterations = 0;
    while (content.includes('<<<<<<< HEAD') && iterations < 100) {
      iterations++;
      // Match: <<<<<<< HEAD\nCONTENT\n=======\nOTHER\n>>>>>>> HASH
      const pattern = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [a-f0-9]+\r?\n/;
      const newContent = content.replace(pattern, '$1\n');

      if (newContent === content) {
        // Try without keeping newline
        const pattern2 = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [a-f0-9]+/;
        content = content.replace(pattern2, '$1');
        break;
      }
      content = newContent;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Cleaned: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Error in ${filePath}: ${error.message}`);
    return false;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
        walkDir(fullPath);
      }
    } else if (['.tsx', '.ts', '.jsx', '.js', '.json', '.sql', '.toml', '.md'].includes(path.extname(file))) {
      removeConflictMarkers(fullPath);
    }
  });
}

console.log('Cleaning merge conflict markers...');
walkDir(__dirname);
console.log('\nCleanup complete!');
