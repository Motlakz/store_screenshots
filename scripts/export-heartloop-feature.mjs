import fs from 'node:fs/promises';
import sharp from 'sharp';

const asset = async (name) => (await fs.readFile(`public/screenshots/heart-loop/screens/${name}.png`)).toString('base64');
const [home, plant, memories] = await Promise.all(['home', 'plant', 'memories'].map(asset));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FCF8FF"/><stop offset=".57" stop-color="#F2E8FC"/><stop offset="1" stop-color="#FBE3F0"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#F6C5E2" stop-opacity=".9"/><stop offset="1" stop-color="#F6C5E2" stop-opacity="0"/></radialGradient>
  <filter id="shadow" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="23" stdDeviation="20" flood-color="#583566" flood-opacity=".26"/></filter>
  <filter id="smallShadow" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#583566" flood-opacity=".18"/></filter>
  <clipPath id="p"><rect x="0" y="0" width="189" height="322" rx="20"/></clipPath>
  <clipPath id="m"><rect x="0" y="0" width="174" height="334" rx="20"/></clipPath>
  <clipPath id="h"><rect x="0" y="0" width="218" height="406" rx="20"/></clipPath>
</defs>
<rect width="1024" height="500" fill="url(#bg)"/>
<circle cx="819" cy="90" r="290" fill="url(#glow)"/>
<circle cx="-60" cy="520" r="260" fill="#E5C6F4" opacity=".35"/>
<circle cx="838" cy="246" r="201" fill="none" stroke="#BD8AC4" stroke-opacity=".28"/>
<g transform="translate(57 58)"><rect width="44" height="44" rx="14" fill="#AE3E78"/>
<path d="M22 32 C5 20 12 10 20 15 C21 16 22 17 22 18 C28 10 38 14 36 23 C35 26 29 31 22 35Z" fill="#FFF9FD" transform="translate(0 -3) scale(.94)"/>
<text x="58" y="30" fill="#2C1B3C" font-size="21" font-family="Arial,sans-serif" font-weight="700" letter-spacing="-.6">Heart Loop</text></g>
<text x="56" y="180" fill="#2C1B3C" font-size="61" font-family="Georgia,serif" font-weight="700" letter-spacing="-2.8">The little things</text>
<text x="56" y="239" fill="#AB3E76" font-size="61" font-family="Georgia,serif" font-weight="700" letter-spacing="-2.8">bring us closer.</text>
<text x="58" y="297" fill="#674E6D" font-size="23" font-family="Arial,sans-serif">A little more us, every day.</text>
<g fill="#8C3E75" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2"><text x="58" y="367">DATES</text><text x="121" y="367">•</text><text x="141" y="367">NOTES</text><text x="206" y="367">•</text><text x="225" y="367">MEMORIES</text></g>
<g transform="translate(603 124) rotate(-11 100 170)" filter="url(#shadow)"><rect x="-8" y="-8" width="205" height="338" rx="28" fill="#FFF8FC"/><rect x="0" y="0" width="189" height="322" rx="20" fill="#F9EFF4"/><image href="data:image/png;base64,${plant}" x="0" y="0" width="189" height="322" preserveAspectRatio="xMidYMid meet" clip-path="url(#p)"/></g>
<g transform="translate(815 89) rotate(10 90 170)" filter="url(#shadow)"><rect x="-8" y="-8" width="190" height="350" rx="28" fill="#FFF8FC"/><image href="data:image/png;base64,${memories}" x="0" y="0" width="174" height="334" preserveAspectRatio="xMidYMin slice" clip-path="url(#m)"/></g>
<g transform="translate(707 40) rotate(2 117 210)" filter="url(#shadow)"><rect x="-8" y="-8" width="234" height="422" rx="28" fill="#FFF8FC"/><image href="data:image/png;base64,${home}" x="0" y="0" width="218" height="406" preserveAspectRatio="xMidYMin slice" clip-path="url(#h)"/></g>
<g transform="translate(585 53) rotate(-11 40 40)" filter="url(#smallShadow)"><rect width="82" height="82" rx="24" fill="white"/><g transform="translate(21 20)" fill="none" stroke="#B24A84" stroke-width="3" stroke-linecap="round"><circle cx="20" cy="20" r="6"/><path d="M20 10 C14 -4 4 -3 7 12 C-6 9 -6 20 9 22 C-5 29 1 39 14 31 C16 46 28 44 29 30 C43 35 48 25 33 20 C44 9 34 3 25 11"/></g></g>
<g transform="translate(937 407) rotate(12 34 34)" filter="url(#smallShadow)"><rect width="68" height="68" rx="21" fill="white"/><path d="M34 52 C-4 29 13 10 30 22 L34 27 C48 8 77 23 34 52Z" fill="#E785B8"/></g>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/screenshots/heart-loop/feature-graphic.png');
