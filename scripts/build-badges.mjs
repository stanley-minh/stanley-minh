/**
 * Génère les badges « lotus » du README de profil, aux couleurs du portfolio Rồng Mai.
 *
 * Même symbolique que le parcours du portfolio : la FORME dit le statut, pas seulement la couleur.
 *  - stack    : lotus épanoui (16 pétales + graine), fond rouge
 *  - learning : lotus qui s'ouvre (anneau intérieur seul), fond graphite
 *
 * Lancer : node scripts/build-badges.mjs
 * Sortie : .github/lotus-badges/<statut>/<slug>.svg
 *
 * Contraintes GitHub : un SVG de README est affiché comme une <img>, donc pas de JavaScript
 * ni de police web. Le relief vient des dégradés et des ombres ; l'animation (un reflet qui
 * glisse) est en CSS et s'arrête si le visiteur a demandé moins d'animations.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Les technos, dans l'ordre d'affichage. Ajouter une ligne ici, puis relancer le script. */
const BADGES = {
  stack: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'MongoDB', 'SQL', 'HTML5', 'CSS3', 'Tailwind'],
  learning: ['PHP', 'Symfony', 'NestJS', 'Docker', 'GitHub Actions', 'Python', 'GraphQL', 'Prisma', 'Redis', 'MySQL'],
};

/** Palette du portfolio (tokens.css). */
const C = {
  doLiXi: '#b3261e', doTham: '#a0221b', doNep: '#8e1c16', doSau: '#5f100c',
  vangMai: '#f2b01e', ngoc: '#ffd873', ngocReflet: '#fff3cc', vangDat: '#c08a2e', vangKim: '#e0b45a', nauDam: '#5e2a10',
  thanChi: '#24272b', tamThep: '#2e3238', rideauBas: '#3a3e44', suong: '#eef0f2',
};

/** Thème de chaque statut. Contrastes du texte : suong sur rouge ≥ 5,7:1, ngoc sur graphite ≥ 8:1. */
const THEMES = {
  stack: { top: C.doLiXi, bottom: C.doNep, border: C.ngoc, text: C.suong, shadow: C.doSau },
  learning: { top: C.rideauBas, bottom: C.thanChi, border: C.vangKim, text: C.ngoc, shadow: '#000000' },
};

const HEIGHT = 34;
const FONT_SIZE = 13;
const TEXT_X = 37; // après le lotus
const PADDING_RIGHT = 14;

/**
 * Largeur approximative d'un texte en Helvetica Bold (unités d'em).
 * On ne peut pas mesurer le texte sans navigateur : on estime, puis `textLength`
 * force le texte à cette largeur exacte, quelle que soit la police réellement utilisée.
 */
const WIDTHS = {
  A: 0.72, B: 0.72, C: 0.72, D: 0.72, E: 0.67, F: 0.61, G: 0.78, H: 0.72, I: 0.28, J: 0.56, K: 0.72, L: 0.61, M: 0.83,
  N: 0.72, O: 0.78, P: 0.67, Q: 0.78, R: 0.72, S: 0.67, T: 0.61, U: 0.72, V: 0.67, W: 0.94, X: 0.67, Y: 0.67, Z: 0.61,
  a: 0.56, b: 0.61, c: 0.56, d: 0.61, e: 0.56, f: 0.33, g: 0.61, h: 0.61, i: 0.28, j: 0.28, k: 0.56, l: 0.28, m: 0.89,
  n: 0.61, o: 0.61, p: 0.61, q: 0.61, r: 0.39, s: 0.56, t: 0.33, u: 0.61, v: 0.56, w: 0.78, x: 0.56, y: 0.56, z: 0.5,
  '.': 0.28, ' ': 0.28,
};
const textWidth = (text) => Math.round([...text].reduce((sum, ch) => sum + (WIDTHS[ch] ?? 0.56), 0) * FONT_SIZE);

/** « Node.js » → « node-js », « GitHub Actions » → « github-actions ». */
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Les pétales du portfolio (LotusSymbols.tsx). */
const OUTER = 'M0,-2 C-3.3,-5 -3.5,-10 0,-13.5 C3.5,-10 3.3,-5 0,-2 Z';
const INNER = 'M0,-1 C-2.4,-3.5 -2.6,-7.5 0,-10 C2.6,-7.5 2.4,-3.5 0,-1 Z';
const ring = (id, offset) =>
  Array.from({ length: 8 }, (_, i) => `<use href="#${id}" transform="rotate(${i * 45 + offset})"/>`).join('');

/** Le cœur : la graine de lotus et ses cinq alvéoles. */
const SEED = `<g filter="url(#lift)">
      <circle r="3.4" fill="url(#seed)" stroke="${C.vangDat}" stroke-width="0.7"/>
      <g fill="${C.vangDat}"><circle r="0.6"/><circle cx="1.7" r="0.6"/><circle cx="-1.7" r="0.6"/><circle cy="1.7" r="0.6"/><circle cy="-1.7" r="0.6"/></g>
    </g>`;

/** Lotus épanoui : pétales extérieurs rouges bordés d'or, anneau intérieur doré qui « flotte » au-dessus. */
const BLOOM = `<g transform="translate(19 17) scale(0.95)" filter="url(#drop)">
    <g fill="url(#petal-red)" stroke="${C.ngoc}" stroke-width="0.7">${ring('outer', 0)}</g>
    <g fill="url(#petal-gold)" stroke="${C.nauDam}" stroke-width="0.7" filter="url(#lift)">${ring('inner', 22.5)}</g>
    ${SEED}
  </g>`;

/** Lotus qui s'ouvre : seulement l'anneau intérieur, un peu plus grand pour garder la même présence. */
const OPENING = `<g transform="translate(19 17) scale(1.2)" filter="url(#drop)">
    <g fill="url(#petal-gold)" stroke="${C.nauDam}" stroke-width="0.6">${ring('inner', 22.5)}</g>
    ${SEED}
  </g>`;

function badge(name, status, index) {
  const t = THEMES[status];
  const tw = textWidth(name);
  const width = TEXT_X + tw + PADDING_RIGHT;
  const r = HEIGHT / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" role="img" aria-label="${name}">
  <title>${name}</title>
  <!-- Généré par scripts/build-badges.mjs : modifier le script, pas ce fichier. -->
  <style>
    .shine { animation: shine 7s ease-in-out ${(index * 0.5).toFixed(1)}s infinite; }
    @keyframes shine { 0% { transform: translateX(-40px); } 35%, 100% { transform: translateX(${width + 10}px); } }
    @media (prefers-reduced-motion: reduce) { .shine { animation: none; opacity: 0; } }
  </style>
  <defs>
    <clipPath id="pill"><rect width="${width}" height="${HEIGHT}" rx="${r}"/></clipPath>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/>
    </linearGradient>
    <!-- Biseau : un reflet clair sur la moitié haute donne le volume « bombé » de la pilule. -->
    <linearGradient id="bevel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shine-band" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.ngocReflet}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.ngocReflet}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.ngocReflet}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="petal-red" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${C.doSau}"/><stop offset="0.55" stop-color="${C.doNep}"/><stop offset="1" stop-color="${C.doTham}"/>
    </linearGradient>
    <linearGradient id="petal-gold" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${C.vangDat}"/><stop offset="0.5" stop-color="${C.vangMai}"/><stop offset="1" stop-color="${C.ngoc}"/>
    </linearGradient>
    <radialGradient id="seed" cx="0.38" cy="0.35" r="0.7">
      <stop offset="0" stop-color="${C.ngocReflet}"/><stop offset="0.45" stop-color="${C.ngoc}"/><stop offset="1" stop-color="${C.vangMai}"/>
    </radialGradient>
    <filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" flood-color="${C.doSau}" flood-opacity="0.7"/>
    </filter>
    <filter id="drop" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0.6" dy="1.2" stdDeviation="0.9" flood-color="${t.shadow}" flood-opacity="0.7"/>
    </filter>
    <path id="outer" d="${OUTER}"/>
    <path id="inner" d="${INNER}"/>
  </defs>

  <g clip-path="url(#pill)">
    <rect width="${width}" height="${HEIGHT}" fill="url(#bg)"/>
    <rect width="${width}" height="${HEIGHT / 2}" fill="url(#bevel)"/>
    <rect class="shine" x="0" y="0" width="34" height="${HEIGHT}" fill="url(#shine-band)" transform="skewX(-20)"/>
  </g>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${HEIGHT - 1}" rx="${r - 0.5}" fill="none" stroke="${t.border}" stroke-opacity="0.55"/>

  ${status === 'stack' ? BLOOM : OPENING}

  <text x="${TEXT_X}" y="21.5" textLength="${tw}" lengthAdjust="spacing" font-family="Archivo, 'Helvetica Neue', Arial, sans-serif" font-size="${FONT_SIZE}" font-weight="700" fill="${t.text}">${name}</text>
</svg>
`;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'lotus-badges');
rmSync(root, { recursive: true, force: true }); // repart de zéro : une techno retirée de la liste disparaît aussi
for (const [status, names] of Object.entries(BADGES)) {
  mkdirSync(join(root, status), { recursive: true });
  names.forEach((name, i) => writeFileSync(join(root, status, `${slug(name)}.svg`), badge(name, status, i)));
  console.log(`${status}: ${names.map(slug).join(', ')}`);
}
