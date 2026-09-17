import fs from 'node:fs';
const content = fs.readFileSync('C:/Users/grautecnico/.gemini/antigravity-ide/scratch/project-sunrise/src/data/smm-services.ts', 'utf-8');
const lines = content.split('\n');
const cats = new Set();
for (const line of lines) {
  const match = line.match(/category:\s*"([^"]+)"/);
  if (match) {
    cats.add(match[1]);
  }
}
console.log('CATEGORIES:', JSON.stringify(Array.from(cats), null, 2));
