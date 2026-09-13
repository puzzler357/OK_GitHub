/**
 * Скачивает Inter в public/fonts и генерирует src/fonts.css.
 *
 * Раньше шрифт подключался через @import с fonts.googleapis.com — в офлайне,
 * ради которого приложение и делается, он просто не загружался, и интерфейс
 * ехал на системном шрифте. Файлы кладём рядом с приложением.
 *
 * Скрипт нужен не для сборки, а чтобы обновление шрифта было воспроизводимым:
 * запускается вручную командой `npm run fetch:fonts`, результат коммитится.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WEIGHTS = [400, 500, 600, 700];

// Интерфейс на русском, английском и туркменском: кириллица и расширенная
// латиница обязательны, остальные подмножества — лишние килобайты.
const SUBSETS = ['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext'];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

interface FaceBlock {
  subset: string;
  weight: number;
  url: string;
  unicodeRange: string;
}

async function fetchCss(): Promise<string> {
  const url = `https://fonts.googleapis.com/css2?family=Inter:wght@${WEIGHTS.join(';')}&display=swap`;
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) throw new Error(`Google Fonts ответил ${response.status}`);
  return response.text();
}

function parseFaces(css: string): FaceBlock[] {
  const faces: FaceBlock[] = [];
  // Каждому @font-face предшествует комментарий с названием подмножества.
  const pattern = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;

  for (const match of css.matchAll(pattern)) {
    const subset = match[1];
    const body = match[2];
    if (!SUBSETS.includes(subset)) continue;

    const weight = Number(body.match(/font-weight:\s*(\d+)/)?.[1] ?? 0);
    const url = body.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim() ?? '';
    if (!url || !weight) continue;

    faces.push({ subset, weight, url, unicodeRange });
  }

  return faces;
}

async function main() {
  const faces = parseFaces(await fetchCss());
  if (faces.length === 0) throw new Error('Не удалось разобрать ответ Google Fonts');

  const outDir = path.join(process.cwd(), 'public', 'fonts');
  mkdirSync(outDir, { recursive: true });

  const blocks: string[] = [
    '/* Файл сгенерирован scripts/fetchFonts.ts — правьте скрипт, а не этот файл. */',
    '/* Inter, подмножества: ' + SUBSETS.join(', ') + '. */',
    '',
  ];

  for (const face of faces) {
    const fileName = `inter-${face.weight}-${face.subset}.woff2`;
    const response = await fetch(face.url, { headers: { 'User-Agent': UA } });
    if (!response.ok) throw new Error(`${fileName}: ${response.status}`);

    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(path.join(outDir, fileName), bytes);
    console.log(`${fileName}: ${(bytes.length / 1024).toFixed(1)} КБ`);

    blocks.push(
      '@font-face {',
      "  font-family: 'Inter';",
      '  font-style: normal;',
      `  font-weight: ${face.weight};`,
      '  font-display: swap;',
      `  src: url('/fonts/${fileName}') format('woff2');`,
      `  unicode-range: ${face.unicodeRange};`,
      '}',
      '',
    );
  }

  const cssPath = path.join(process.cwd(), 'src', 'fonts.css');
  writeFileSync(cssPath, blocks.join('\n'), 'utf8');
  console.log(`\nГотово: ${faces.length} начертаний, ${cssPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
