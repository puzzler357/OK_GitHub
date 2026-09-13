/**
 * Сборка бланка public/templates/blank.docx для генерации документов.
 *
 * Бланк — обычный .docx, то есть zip с несколькими XML внутри. Держать его
 * в репозитории как непрозрачный бинарник неудобно: непонятно, что внутри, и
 * нечем поправить. Поэтому он собирается этим скриптом из текста — правится
 * разметка здесь, файл пересобирается командой `npm run make:docx`.
 *
 * Плейсхолдеры понимает docxtemplater (src/lib/docx.ts):
 *   {orgName}  — название организации
 *   {title}    — заголовок документа
 *   {#paragraphs}{text}{/paragraphs} — тело, абзац на элемент
 *   {date}     — дата документа
 */
import PizZip from 'pizzip';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

/** Абзац: jc — выравнивание, b — полужирный, sz — размер в полупунктах. */
function paragraph(text: string, opts: { align?: string; bold?: boolean; size?: number } = {}) {
  const { align = 'left', bold = false, size = 28 } = opts;
  return `    <w:p>
      <w:pPr><w:jc w:val="${align}"/><w:spacing w:after="160"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${size}"/>${bold ? '<w:b/>' : ''}</w:rPr>
        <w:t xml:space="preserve">${text}</w:t>
      </w:r>
    </w:p>`;
}

const DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${paragraph('{orgName}', { align: 'center', bold: true })}
${paragraph('{title}', { align: 'center', bold: true, size: 32 })}
${paragraph('{#paragraphs}{text}{/paragraphs}')}
${paragraph('{date}', { align: 'right' })}
${paragraph('Руководитель ____________________', { align: 'left' })}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const zip = new PizZip();
zip.file('[Content_Types].xml', CONTENT_TYPES);
zip.folder('_rels')!.file('.rels', RELS);
const word = zip.folder('word')!;
word.file('document.xml', DOCUMENT);
word.folder('_rels')!.file('document.xml.rels', DOCUMENT_RELS);

const outDir = path.join(process.cwd(), 'public', 'templates');
mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'blank.docx');
writeFileSync(outFile, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));

console.log(`Бланк собран: ${outFile}`);
