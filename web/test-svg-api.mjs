import fs from 'fs';
import path from 'path';

const imagePath = path.join(process.cwd(), '..', 'output', 'wanna_structural_2026-01-11T09-57-22-265Z', 'final', 'wanna_final.png');

const imageBuffer = fs.readFileSync(imagePath);
const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

console.log('Testing SVG conversion API...');
console.log('Image size:', imageBuffer.length, 'bytes');

const response = await fetch('http://localhost:3000/api/convert-svg', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ imageData: base64Image }),
});

if (!response.ok) {
  const error = await response.json();
  console.error('Error:', error);
  process.exit(1);
}

const result = await response.json();
console.log('Success!');
console.log('SVG length:', result.svg.length, 'characters');
console.log('Original dimensions:', result.originalWidth, 'x', result.originalHeight);
console.log('\nFirst 500 chars of SVG:');
console.log(result.svg.slice(0, 500));

// Save the SVG to verify
const outputPath = path.join(process.cwd(), 'test-output.svg');
fs.writeFileSync(outputPath, result.svg);
console.log('\nSaved to:', outputPath);
