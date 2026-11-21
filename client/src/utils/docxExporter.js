import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  PageBreak
} from 'docx';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;

export async function createDocxDocument(examData) {
  let logoBuffer = null;
  try {
    const res = await fetch('/logo.png');
    if (res.ok) {
      logoBuffer = await res.arrayBuffer();
    }
  } catch (err) {
    console.warn('Could not load logo for DOCX:', err);
  }

  const selectedFont = examData.fontFamily === 'Cairo' ? 'Cairo' : 'Arial';
  const baseSizePt = 24; // 12pt standard in Word

  const cellBorderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  const rightColumnParagraphs = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 20, after: 20, line: 260 },
      children: [new TextRun({ text: 'العتبة العباسية المقدسة', bold: true, size: 24, font: selectedFont })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 20, after: 20, line: 260 },
      children: [new TextRun({ text: 'شعبة مدارس الكفيل الدينية النسوية', bold: true, size: 22, font: selectedFont })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 20, after: 20, line: 260 },
      children: [new TextRun({ text: 'الامتحانات الفصلية', bold: true, size: 20, font: selectedFont })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 20, after: 20, line: 260 },
      children: [new TextRun({ text: `لعام ${examData.year || '1448 هـ'}`, bold: true, size: 20, font: selectedFont })]
    })
  ];

  const centerColumnParagraphs = [];
  if (logoBuffer) {
    centerColumnParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 40 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 68, height: 50 }
          })
        ]
      })
    );
  }
  centerColumnParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 40, after: 20 },
      children: [
        new TextRun({
          text: examData.termTitle || 'امتحانات الفصل الأول',
          bold: true,
          size: 24,
          font: selectedFont
        })
      ]
    })
  );

  const leftColumnParagraphs = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 20, after: 20, line: 260 },
      children: [new TextRun({ text: examData.school || 'المدرسة: فخر المخدرات', bold: true, size: 22, font: selectedFont })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 20, after: 20, line: 260 },
      children: [new TextRun({ text: `المادة: ${examData.subject || ''}`, bold: true, size: 22, font: selectedFont })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 20, after: 20, line: 260 },
      children: [new TextRun({ text: `المرحلة: ${examData.stage || ''}`, bold: true, size: 22, font: selectedFont })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 20, after: 20, line: 260 },
      children: [new TextRun({ text: examData.semester || 'الفصل: الأول', bold: true, size: 22, font: selectedFont })]
    })
  ];

  // In Word Right-to-Left tables (visuallyRightToLeft: true):
  // Column 0 is on the RIGHT, Column 1 is in CENTER, Column 2 is on the LEFT
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    visuallyRightToLeft: true,
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 16, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 16, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 16, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 16, color: '000000' },
      insideH: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideV: { style: BorderStyle.NONE, size: 0, color: 'auto' }
    },
    rows: [
      new TableRow({
        children: [
          // Cell 0: RIGHT SIDE (Al-Abbas Holy Shrine)
          new TableCell({
            width: { size: 36, type: WidthType.PERCENTAGE },
            borders: cellBorderNone,
            children: rightColumnParagraphs
          }),
          // Cell 1: CENTER (Logo + Term Title)
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: cellBorderNone,
            children: centerColumnParagraphs
          }),
          // Cell 2: LEFT SIDE (School, Subject, Stage, Semester)
          new TableCell({
            width: { size: 36, type: WidthType.PERCENTAGE },
            borders: cellBorderNone,
            children: leftColumnParagraphs
          })
        ]
      })
    ]
  });

  const bodyChildren = [headerTable];

  // Notice line
  if (examData.notice) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({
            text: examData.notice,
            bold: true,
            size: 24,
            font: selectedFont
          })
        ]
      })
    );
  }

  // Questions
  (examData.questions || []).forEach((q, idx) => {
    if (q.pageBreakBefore && idx > 0) {
      bodyChildren.push(
        new Paragraph({
          children: [new PageBreak()]
        })
      );
    }

    const qRuns = [
      new TextRun({
        text: `${q.number || `س${idx + 1}`}/ `,
        bold: true,
        size: baseSizePt + 2,
        font: selectedFont
      })
    ];

    if (q.mainText) {
      qRuns.push(
        new TextRun({
          text: `${q.mainText} `,
          bold: true,
          size: baseSizePt,
          font: selectedFont
        })
      );
    }

    if (q.marks) {
      qRuns.push(
        new TextRun({
          text: ` ${q.marks}`,
          bold: true,
          size: baseSizePt - 2,
          font: selectedFont
        })
      );
    }

    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 180, after: 70 },
        children: qRuns
      })
    );

    // Branches
    if (q.branches && q.branches.length > 0) {
      q.branches.forEach((b) => {
        const bRuns = [];
        if (b.label) {
          bRuns.push(
            new TextRun({
              text: `${b.label}/ `,
              bold: true,
              size: baseSizePt,
              font: selectedFont
            })
          );
        }

        const lines = (b.content || '').split('\n');
        lines.forEach((line, lIdx) => {
          bRuns.push(
            new TextRun({
              text: line,
              size: baseSizePt,
              font: selectedFont
            })
          );
          if (lIdx < lines.length - 1) {
            bRuns.push(new TextRun({ break: 1 }));
          }
        });

        if (b.marks) {
          bRuns.push(
            new TextRun({
              text: ` ${b.marks}`,
              bold: true,
              size: baseSizePt - 2,
              font: selectedFont
            })
          );
        }

        bodyChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            indent: { right: 360 },
            spacing: { before: 60, after: 60 },
            children: bRuns
          })
        );
      });
    }
  });

  // Teacher footer
  if (examData.teacher) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: `أستاذة المادة : ${examData.teacher}`,
            bold: true,
            size: 24,
            font: selectedFont
          })
        ]
      })
    );
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
            borders: {
              pageBorders: {
                top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 12, color: '000000' }
              }
            }
          }
        },
        children: bodyChildren
      }
    ]
  });
}

export async function generateDocxBlob(examData) {
  const doc = await createDocxDocument(examData);
  return await Packer.toBlob(doc);
}

export async function exportToDocx(examData) {
  const blob = await generateDocxBlob(examData);
  const filename = `${examData.subject || 'أسئلة'}_${examData.stage || ''}.docx`;
  saveAs(blob, filename);
}
