import { load } from 'cheerio';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { normalizeText } from './source.js';

export async function extractAttachmentText(bytes: Uint8Array, extension: string): Promise<string> {
  if (extension === 'pdf') {
    const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, verbosity: 0 });
    try {
      const document = await task.promise;
      const pages: string[] = [];
      for (let number = 1; number <= document.numPages; number += 1) {
        const page = await document.getPage(number);
        const content = await page.getTextContent();
        pages.push(content.items.filter((item) => 'str' in item).map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`).join(''));
      }
      return pages.map(normalizeText).filter(Boolean).join('\n');
    } finally {
      await task.destroy();
    }
  }

  if (extension === 'odt' || extension === 'ods' || extension === 'docx') {
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file(extension === 'docx' ? 'word/document.xml' : 'content.xml')?.async('string');
    if (!xml) throw new Error(`Missing document text in ${extension} attachment`);
    const $ = load(xml, { xmlMode: true });
    const selector = extension === 'docx' ? 'w\\:p' : 'text\\:p, text\\:h';
    return $(selector).map((_, element) => normalizeText($(element).text())).get().filter(Boolean).join('\n');
  }

  return '';
}
