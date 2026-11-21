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
  ImageRun
} from 'docx';
import { saveAs } from 'file-saver';

export async function exportToDocx(examData) {
  // Fetch logo as ArrayBuffer
  let logoBuffer = null;
  try {
    const res = await fetch('/logo.png');
    if (res.ok) {
      logoBuffer = await res.arrayBuffer();
    }
  } catch (err) {
    console.warn('Could not load logo for DOCX:', err);
  }

  // Header Table (3 columns: Left metadata, Center Logo + Title, Right Kafeel Org)
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
      children: [new TextRun({ text: 'العتبة العباسية المقدسة', bold: true, size: 22, font: 'Traditional Arabic' })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      children: [new TextRun({ text: 'شعبة مدارس الكفيل الدينية النسوية', bold: true, size: 20, font: 'Traditional Arabic' })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      children: [new TextRun({ text: 'الامتحانات الفصلية', size: 18, font: 'Traditional Arabic' })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      children: [new TextRun({ text: `لعام ${examData.year || '1448 هـ'}`, size: 18, font: 'Traditional Arabic' })]
    })
  ];

  const centerColumnParagraphs = [];
  if (logoBuffer) {
    centerColumnParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: {
              width: 70,
              height: 52
            }
          })
        ]
      })
    );
  }
  centerColumnParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({
          text: examData.termTitle || 'امتحانات الفصل الأول',
          bold: true,
          size: 22,
          font: 'Traditional Arabic'
        })
      ]
    })
  );

  const leftColumnParagraphs = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      bidirectional: true,
      children: [new TextRun({ text: examData.school || 'المدرسة: فخر المخدرات', bold: true, size: 20, font: 'Traditional Arabic' })]
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      bidirectional: true,
      children: [new TextRun({ text: `المادة: ${examData.subject || ''}`, bold: true, size: 20, font: 'Traditional Arabic' })]
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      bidirectional: true,
      children: [new TextRun({ text: `المرحلة: ${examData.stage || ''}`, bold: true, size: 20, font: 'Traditional Arabic' })]
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      bidirectional: true,
      children: [new TextRun({ text: examData.semester || 'الفصل: الأول', bold: true, size: 20, font: 'Traditional Arabic' })]
    })
  ];

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 12, color: '000000' }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: cellBorderNone,
            children: leftColumnParagraphs
          }),
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            borders: cellBorderNone,
            children: centerColumnParagraphs
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: cellBorderNone,
            children: rightColumnParagraphs
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
            size: 22,
            font: 'Traditional Arabic'
          })
        ]
      })
    );
  } else {
    bodyChildren.push(new Paragraph({ spacing: { after: 150 } }));
  }

  // Questions
  (examData.questions || []).forEach((q, idx) => {
    const qRuns = [
      new TextRun({
        text: `${q.number || `س${idx + 1}`}/ `,
        bold: true,
        size: 24,
        font: 'Traditional Arabic'
      })
    ];

    if (q.mainText) {
      qRuns.push(
        new TextRun({
          text: `${q.mainText} `,
          bold: true,
          size: 22,
          font: 'Traditional Arabic'
        })
      );
    }

    if (q.marks) {
      qRuns.push(
        new TextRun({
          text: ` ${q.marks}`,
          bold: true,
          size: 20,
          font: 'Traditional Arabic'
        })
      );
    }

    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 180, after: 80 },
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
              size: 22,
              font: 'Traditional Arabic'
            })
          );
        }

        const lines = (b.content || '').split('\n');
        lines.forEach((line, lIdx) => {
          bRuns.push(
            new TextRun({
              text: line,
              size: 22,
              font: 'Traditional Arabic'
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
              size: 20,
              font: 'Traditional Arabic'
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
            size: 22,
            font: 'Traditional Arabic'
          })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720
            },
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

  const blob = await Packer.toBlob(doc);
  const filename = `${examData.subject || 'أسئلة'}_${examData.stage || ''}.docx`;
  saveAs(blob, filename);
}
