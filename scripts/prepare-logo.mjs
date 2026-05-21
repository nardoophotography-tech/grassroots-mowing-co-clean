import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(process.cwd());
const src = path.join(root, 'public', 'Gemini_Generated_Image_sfmpx0sfmpx0sfmp.png');
const outPng = path.join(root, 'public', 'logo.png');
const outWebp = path.join(root, 'public', 'logo-header.webp');
const oldJpg = path.join(root, 'public', 'logo.jpg');

(async () => {
  try {
    if (!fs.existsSync(src)) {
      console.error('Source image not found:', src);
      process.exit(1);
    }

    // Remove broken logo.jpg if exists
    if (fs.existsSync(oldJpg)) {
      console.log('Removing old logo.jpg');
      fs.rmSync(oldJpg, { force: true });
    }

    // Create a reasonably sized PNG (max width 900)
    await sharp(src)
      .resize({ width: 900, withoutEnlargement: true })
      .png({ quality: 90 })
      .toFile(outPng);

    // Create optimized WebP for header (max width 600)
    await sharp(src)
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outWebp);

    const statsPng = fs.statSync(outPng);
    const statsWebp = fs.statSync(outWebp);

    console.log('Generated:', outPng, statsPng.size);
    console.log('Generated:', outWebp, statsWebp.size);
  } catch (err) {
    console.error('Error preparing logos:', err);
    process.exit(1);
  }
})();
