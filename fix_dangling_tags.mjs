import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filesToCheck = [
  'src/pages/DashboardPage.tsx',
  'src/pages/SearchPage.tsx',
  'src/pages/ProfessionalProfile.tsx',
  'src/pages/MessagesPage.tsx',
  'src/pages/ProfilePage.tsx',
  'src/pages/QuoteRequest.tsx',
  'src/components/landing/HeroSection.tsx',
  'src/components/landing/PricingSection.tsx',
  'src/components/landing/ProfessionalsSection.tsx',
];

for (const file of filesToCheck) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove common dangling JSX patterns that appeared after conflict removal
  // Pattern: closing tags without matching opening (usually the last 2-3 closing tags)
  
  // For files that start with an import and have dangling closing divs at the end
  const lines = content.split('\n');
  let inJSX = false;
  let openDivCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('return (')) {
      inJSX = true;
      openDivCount = 0;
    }
    if (inJSX) {
      const opens = (line.match(/<div/g) || []).length + (line.match(/<motion\.div/g) || []).length;
      const closes = (line.match(/<\/div>/g) || []).length + (line.match(/<\/motion\.div>/g) || []).length;
      openDivCount += opens - closes;
    }
  }
  
  // Simple cleanup: remove any lines that are just closing tags at the very end
  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine === '</div>' || lastLine === '</motion.div>' || lastLine === '');
      lines.pop();
    } else {
      break;
    }
  }
  
  const cleaned = lines.join('\n');
  if (cleaned !== content) {
    fs.writeFileSync(filePath, cleaned, 'utf-8');
    console.log(`✓ Cleaned dangling tags from ${file}`);
  }
}

console.log('Cleanup complete!');
