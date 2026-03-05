import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icons/icon.svg');
const outputDir = path.resolve('public/icons');

async function generateIcons() {
  try {
    if (!fs.existsSync(svgPath)) {
      console.error('SVG file not found at:', svgPath);
      return;
    }

    console.log('Generating 192x192 icon...');
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(outputDir, 'icon-192.png'));

    console.log('Generating 512x512 icon...');
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(outputDir, 'icon-512.png'));

    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
