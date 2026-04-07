import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filesToFix = [
  'src/pages/ClientDashboard.tsx',
  'src/pages/DashboardPage.tsx',
  'src/pages/Index.tsx',
  'src/pages/SearchPage.tsx',
  'src/pages/ProfilePage.tsx',
  'src/pages/MessagesPage.tsx',
  'src/pages/ProfessionalProfile.tsx',
  'src/pages/QuoteRequest.tsx',
];

function resolveConflict(content) {
  // Split by conflict marker and take HEAD version (first part)
  const parts = content.split('<<<<<<< HEAD\n');
  
  if (parts.length < 2) return content; // No conflict
  
  const afterHead = parts[1];
  const headContent = afterHead.split('\n=======\n')[0];
  const beforeConflict = parts[0];
  const afterConflict = content.substring(
    content.indexOf('>>>>>>> ') + content.substring(content.indexOf('>>>>>>> ')).indexOf('\n') + 1
  );
  
  return beforeConflict + headContent + '\n' + afterConflict;
}

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (content.includes('<<<<<<< HEAD')) {
      console.log(`Fixing: ${file}`);
      content = resolveConflict(content);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed: ${file}`);
    }
  } catch (e) {
    console.error(`✗ Error with ${file}: ${e.message}`);
  }
}
