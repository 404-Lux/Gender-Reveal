import { jsPDF } from 'jspdf';
import { WishEntry, AdviceEntry, NameSuggestionEntry } from './serverStore';
import { formatPhilippineTime } from './time';
import { RevealGender } from './tokens';

/**
 * Normalizes smart punctuation and strips unsupported Unicode/emoji glyphs that render as
 * tofu boxes in jsPDF's built-in Times/Helvetica fonts, while preserving Filipino ñ/Ñ and Latin-1 accents.
 */
export function sanitizePdfText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00B7/g, '·')
    .replace(/[^\u0020-\u00FF\n]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function exportMemoryBookPdf(params: {
  babySurname: string;
  coupleNames: string;
  revealTimeIso: string;
  revealedGender: RevealGender | null;
  tally: { boy: number; girl: number; total: number };
  wishes: WishEntry[];
  names: NameSuggestionEntry[];
  advice?: AdviceEntry[];
  onProgress?: (pct: number) => void;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;

  const drawPaperPageBackground = (pageNumber: number) => {
    // Warm Oat Paper background (#F4EEE3)
    doc.setFillColor(244, 238, 227);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Inner Linen Frame (#FBF8F2)
    doc.setFillColor(251, 248, 242);
    doc.rect(28, 28, pageWidth - 56, pageHeight - 56, 'F');

    // Terracotta & Fog Double Hairline Border
    doc.setDrawColor(201, 138, 98);
    doc.setLineWidth(1.2);
    doc.rect(36, 36, pageWidth - 72, pageHeight - 72);

    doc.setDrawColor(201, 206, 198);
    doc.setLineWidth(0.6);
    doc.rect(41, 41, pageWidth - 82, pageHeight - 82);

    // Page Footer
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(102, 116, 94);
    doc.text(
      `Baby ${params.babySurname} Memory Book · Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 48,
      { align: 'center' }
    );
  };

  // ================= PAGE 1: EDITORIAL COVER PAGE =================
  let pageNum = 1;
  drawPaperPageBackground(pageNum);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(201, 138, 98);
  doc.text(
    'PAPER & LIGHT KEEPSAKE EDITION',
    pageWidth / 2,
    170,
    { align: 'center' }
  );

  doc.setFont('times', 'bold');
  doc.setFontSize(38);
  doc.setTextColor(38, 48, 43);
  doc.text(`For Baby ${params.babySurname}`, pageWidth / 2, 230, {
    align: 'center',
  });

  doc.setFont('times', 'italic');
  doc.setFontSize(18);
  doc.setTextColor(102, 116, 94);
  doc.text(
    `Letters, Wishes & Guesses for ${params.coupleNames}`,
    pageWidth / 2,
    265,
    { align: 'center' }
  );

  // Decorative Line Ornament
  doc.setDrawColor(201, 138, 98);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 90, 300, pageWidth / 2 + 90, 300);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(38, 48, 43);
  doc.text(
    `Gathered on ${formatPhilippineTime(params.revealTimeIso, true)}`,
    pageWidth / 2,
    340,
    { align: 'center' }
  );

  if (params.revealedGender) {
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(
      params.revealedGender === 'boy' ? 79 : 212,
      params.revealedGender === 'boy' ? 127 : 128,
      params.revealedGender === 'boy' ? 163 : 143
    );
    doc.text(
      params.revealedGender === 'boy' ? "It's a Boy" : "It's a Girl",
      pageWidth / 2,
      385,
      { align: 'center' }
    );
  }

  // Summary Tally Box on Cover
  doc.setDrawColor(201, 206, 198);
  doc.setFillColor(244, 238, 227);
  doc.roundedRect(pageWidth / 2 - 150, 430, 300, 95, 8, 8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(102, 116, 94);
  doc.text('FAMILY GUESS TALLY', pageWidth / 2, 455, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(15);
  doc.setTextColor(38, 48, 43);
  doc.text(
    `Team Boy: ${params.tally.boy}   |   Team Girl: ${params.tally.girl}   |   Total: ${params.tally.total}`,
    pageWidth / 2,
    485,
    { align: 'center' }
  );

  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(102, 116, 94);
  doc.text(
    `${params.wishes.length} Letters Sealed · ${params.names.length} Suggested Baby Names`,
    pageWidth / 2,
    510,
    { align: 'center' }
  );

  // ================= PAGES 2+: CHAPTER I · LETTERS FOR BABY & PARENTS =================
  doc.addPage();
  pageNum++;
  drawPaperPageBackground(pageNum);

  let cursorY = 92;

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(38, 48, 43);
  doc.text(
    `Chapter I · Letters for Baby ${params.babySurname} & Parents`,
    margin + 8,
    cursorY
  );
  cursorY += 28;

  const cardX = margin + 8;
  const cardWidth = pageWidth - (margin + 8) * 2;
  const padX = 18;
  const textLeftX = cardX + padX;
  const textRightX = cardX + cardWidth - padX;
  const cardInnerWidth = cardWidth - padX * 2;

  for (let index = 0; index < params.wishes.length; index++) {
    const wish = params.wishes[index];
    if (index > 0 && index % 8 === 0) {
      params.onProgress?.(
        Math.min(85, Math.round(((index + 1) / Math.max(1, params.wishes.length)) * 80))
      );
      await new Promise((r) => setTimeout(r, 0));
    }
    const senderLineH = 15;
    const babyLineH = 15.5;
    const parentLineH = 13.5;

    // 1. Measure Sender Header with its exact font (reserving 118pt on right if badge exists)
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const maxSenderWidth = wish.guess ? cardInnerWidth - 118 : cardInnerWidth;
    const cleanSender = sanitizePdfText(wish.name) || 'A Loving Guest';
    const senderLines: string[] = doc.splitTextToSize(
      `${index + 1}. From ${cleanSender}`,
      maxSenderWidth
    );

    // 2. Measure Baby Wish Quote with its exact font (times italic 11pt)
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    const cleanBabyWish = sanitizePdfText(wish.wish_for_baby);
    const babyLines: string[] = doc.splitTextToSize(
      `"${cleanBabyWish}"`,
      cardInnerWidth - 6
    );

    // 3. Measure Optional Parent Note with its exact font (helvetica normal 9.5pt)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const cleanParentNote = wish.note_for_parents
      ? sanitizePdfText(wish.note_for_parents)
      : '';
    const parentLines: string[] = cleanParentNote
      ? doc.splitTextToSize(
          `Personal Note for ${sanitizePdfText(params.coupleNames)}: ${cleanParentNote}`,
          cardInnerWidth - 6
        )
      : [];

    const headerHeight = senderLines.length * senderLineH;
    const babyHeight = babyLines.length * babyLineH;
    const parentHeight =
      parentLines.length > 0 ? parentLines.length * parentLineH + 14 : 0;

    const blockHeight = 20 + headerHeight + 8 + babyHeight + parentHeight + 14;

    if (cursorY + blockHeight > pageHeight - 72) {
      doc.addPage();
      pageNum++;
      drawPaperPageBackground(pageNum);
      cursorY = 84;
    }

    // Letter Card Box
    doc.setDrawColor(201, 206, 198);
    doc.setFillColor(244, 238, 227);
    doc.roundedRect(cardX, cursorY, cardWidth, blockHeight, 6, 6, 'FD');

    let lineY = cursorY + 22;

    // Team Guess Badge on Top-Right (Never overlaps sender lines because maxSenderWidth reserves 118pt)
    if (wish.guess) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(201, 138, 98);
      doc.text(
        `GUESSED TEAM ${wish.guess.toUpperCase()}`,
        textRightX,
        lineY,
        { align: 'right' }
      );
    }

    // Draw Wrapped Sender Lines
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(38, 48, 43);
    senderLines.forEach((line) => {
      doc.text(line, textLeftX, lineY);
      lineY += senderLineH;
    });

    lineY += 6;

    // Draw Wrapped Baby Wish Lines
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(38, 48, 43);
    babyLines.forEach((line) => {
      doc.text(line, textLeftX, lineY);
      lineY += babyLineH;
    });

    // Draw Wrapped Parent Note Lines (if present)
    if (parentLines.length > 0) {
      doc.setDrawColor(216, 206, 190);
      doc.setLineWidth(0.5);
      doc.line(textLeftX, lineY - 4, textRightX, lineY - 4);
      lineY += 9;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(102, 116, 94);
      parentLines.forEach((line) => {
        doc.text(line, textLeftX, lineY);
        lineY += parentLineH;
      });
    }

    cursorY += blockHeight + 14;
  }

  params.onProgress?.(90);
  await new Promise((r) => setTimeout(r, 0));

  // ================= CHAPTER II: SUGGESTED BABY NAMES =================
  doc.addPage();
  pageNum++;
  drawPaperPageBackground(pageNum);
  cursorY = 92;

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(38, 48, 43);
  doc.text(
    `Chapter II · Suggested Names for Baby ${params.babySurname}`,
    margin + 8,
    cursorY
  );
  cursorY += 26;

  params.names.forEach((n, idx) => {
    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    const cleanSuggested = sanitizePdfText(n.suggested_name);
    const cleanGuest = sanitizePdfText(n.guest) || 'Family Friend';
    const nameLines: string[] = doc.splitTextToSize(
      `${idx + 1}. ${cleanSuggested}`,
      cardInnerWidth - 150
    );

    const rowHeight = Math.max(30, nameLines.length * 15 + 14);

    if (cursorY + rowHeight > pageHeight - 75) {
      doc.addPage();
      pageNum++;
      drawPaperPageBackground(pageNum);
      cursorY = 84;
    }

    doc.setDrawColor(201, 206, 198);
    doc.setFillColor(244, 238, 227);
    doc.roundedRect(cardX, cursorY, cardWidth, rowHeight, 5, 5, 'FD');

    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(38, 48, 43);
    nameLines.forEach((line, lIdx) => {
      doc.text(line, textLeftX, cursorY + 19 + lIdx * 15);
    });

    doc.setFont('times', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(102, 116, 94);
    doc.text(`Suggested by ${cleanGuest}`, textRightX, cursorY + 19, {
      align: 'right',
    });

    cursorY += rowHeight + 10;
  });

  params.onProgress?.(100);
  doc.save(`baby-${params.babySurname.toLowerCase()}-memory-book.pdf`);
}
