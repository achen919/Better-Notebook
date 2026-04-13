import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function generateIcons() {
  const svgPath = join(publicDir, 'icon.svg');
  const svgBuffer = readFileSync(svgPath);

  // 生成 PNG 图标 (Linux 使用)
  const sizes = [16, 32, 48, 64, 128, 256, 512];

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  // 主 PNG 图标
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icon.png'));
  console.log('Generated icon.png');

  // 生成 iconset 目录用于 macOS icns
  const iconsetDir = join(publicDir, 'icon.iconset');
  if (!existsSync(iconsetDir)) {
    mkdirSync(iconsetDir);
  }

  // macOS 需要的尺寸
  const macSizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' },
  ];

  for (const { size, name } of macSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(iconsetDir, name));
    console.log(`Generated ${name}`);
  }

  console.log('\n图标文件已生成到 public/ 目录');
  console.log('请运行以下命令生成 icns 文件:');
  console.log('  iconutil -c icns public/icon.iconset');
}

generateIcons().catch(console.error);
