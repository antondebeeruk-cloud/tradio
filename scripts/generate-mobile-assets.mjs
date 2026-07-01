import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const navy = "#06233f";
const orange = "#ff5a00";

const mark = (rounded = false) => Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${rounded ? `<rect x="28" y="28" width="968" height="968" rx="190" fill="${navy}"/>` : `<rect width="1024" height="1024" fill="${navy}"/>`}
    <g transform="translate(120 155) scale(12.3)">
      <path d="M8 19.5C16 7.5 29 3 45.5 5.5c2 .3 3.5 1.7 4.3 3.5l.7 1.7h6.3c1.8 0 3.2 1.4 3.2 3.2v9.2c0 1.8-1.4 3.2-3.2 3.2H46.2c-1.1 0-2.1-.6-2.7-1.5l-1.8-2.8c-4.7-1.4-8.7-1.2-12.1.6-4.4 2.3-7.7 6.1-10 11.5-.7 1.6-2.8 2-4 .7l-7.1-7.3c-2-2-2.2-5.1-.5-7.4Z" fill="#fff"/>
      <path d="M27.2 24.2h19.4l9.4 9.4v13c0 3.1-2.5 5.6-5.6 5.6H27.2c-3.1 0-5.6-2.5-5.6-5.6V29.8c0-3.1 2.5-5.6 5.6-5.6Z" fill="${navy}" stroke="${orange}" stroke-linejoin="round" stroke-width="5"/>
      <path d="M46.4 24.6v9.2h9.2" stroke="${orange}" stroke-linejoin="round" stroke-width="5"/>
      <path d="M30.8 38.2h14.8M30.8 45h11.6" stroke="#fff" stroke-linecap="round" stroke-width="4"/>
    </g>
  </svg>`);

const foreground = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <g transform="translate(160 200) scale(11)">
      <path d="M8 19.5C16 7.5 29 3 45.5 5.5c2 .3 3.5 1.7 4.3 3.5l.7 1.7h6.3c1.8 0 3.2 1.4 3.2 3.2v9.2c0 1.8-1.4 3.2-3.2 3.2H46.2c-1.1 0-2.1-.6-2.7-1.5l-1.8-2.8c-4.7-1.4-8.7-1.2-12.1.6-4.4 2.3-7.7 6.1-10 11.5-.7 1.6-2.8 2-4 .7l-7.1-7.3c-2-2-2.2-5.1-.5-7.4Z" fill="#fff"/>
      <path d="M27.2 24.2h19.4l9.4 9.4v13c0 3.1-2.5 5.6-5.6 5.6H27.2c-3.1 0-5.6-2.5-5.6-5.6V29.8c0-3.1 2.5-5.6 5.6-5.6Z" fill="${navy}" stroke="${orange}" stroke-linejoin="round" stroke-width="5"/>
      <path d="M46.4 24.6v9.2h9.2" stroke="${orange}" stroke-linejoin="round" stroke-width="5"/>
      <path d="M30.8 38.2h14.8M30.8 45h11.6" stroke="#fff" stroke-linecap="round" stroke-width="4"/>
    </g>
  </svg>`);

const densities = {
  mdpi: [48, 108],
  hdpi: [72, 162],
  xhdpi: [96, 216],
  xxhdpi: [144, 324],
  xxxhdpi: [192, 432],
};

for (const [density, [legacySize, foregroundSize]] of Object.entries(densities)) {
  const directory = path.join(root, "android", "app", "src", "main", "res", `mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  await sharp(mark(true)).resize(legacySize, legacySize).png().toFile(path.join(directory, "ic_launcher.png"));
  await sharp(mark(true)).resize(legacySize, legacySize).png().toFile(path.join(directory, "ic_launcher_round.png"));
  await sharp(foreground).resize(foregroundSize, foregroundSize).png().toFile(path.join(directory, "ic_launcher_foreground.png"));
}

await sharp(mark(false))
  .resize(1024, 1024)
  .png()
  .toFile(path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png"));

const splash = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
    <rect width="2732" height="2732" fill="${navy}"/>
    <g transform="translate(1000 870) scale(11.5)">
      <path d="M8 19.5C16 7.5 29 3 45.5 5.5c2 .3 3.5 1.7 4.3 3.5l.7 1.7h6.3c1.8 0 3.2 1.4 3.2 3.2v9.2c0 1.8-1.4 3.2-3.2 3.2H46.2c-1.1 0-2.1-.6-2.7-1.5l-1.8-2.8c-4.7-1.4-8.7-1.2-12.1.6-4.4 2.3-7.7 6.1-10 11.5-.7 1.6-2.8 2-4 .7l-7.1-7.3c-2-2-2.2-5.1-.5-7.4Z" fill="#fff"/>
      <path d="M27.2 24.2h19.4l9.4 9.4v13c0 3.1-2.5 5.6-5.6 5.6H27.2c-3.1 0-5.6-2.5-5.6-5.6V29.8c0-3.1 2.5-5.6 5.6-5.6Z" fill="${navy}" stroke="${orange}" stroke-width="5"/>
      <path d="M46.4 24.6v9.2h9.2" stroke="${orange}" stroke-width="5"/><path d="M30.8 38.2h14.8M30.8 45h11.6" stroke="#fff" stroke-linecap="round" stroke-width="4"/>
    </g>
    <text x="1366" y="1740" fill="#fff" font-family="Arial, sans-serif" font-size="250" font-weight="700" text-anchor="middle">tradi<tspan fill="${orange}">o</tspan></text>
  </svg>`);

for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await sharp(splash).png().toFile(path.join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset", name));
}

await sharp(splash).resize(2732, 2732).png().toFile(path.join(root, "android", "app", "src", "main", "res", "drawable", "splash.png"));

console.log("Tradio mobile icons and splash assets generated.");
