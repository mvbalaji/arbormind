import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";

function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9\-_]+/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "contract-document";
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadAsPdf(title: string, content: string, baseName: string): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const marginTop = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginX * 2;
  let y = marginTop;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const titleLines = doc.splitTextToSize(title, usableWidth) as string[];
  for (const line of titleLines) {
    doc.text(line, marginX, y);
    y += 20;
  }
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  const lineHeight = 13;
  const lines = content.split("\n");
  for (const raw of lines) {
    const wrapped = (doc.splitTextToSize(raw === "" ? " " : raw, usableWidth) as string[]);
    for (const line of wrapped) {
      if (y > pageHeight - marginTop) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(line, marginX, y);
      y += lineHeight;
    }
  }

  doc.save(`${safeFileName(baseName)}.pdf`);
}

export async function downloadAsWord(title: string, content: string, baseName: string): Promise<void> {
  const bodyParagraphs = content.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, font: "Courier New", size: 20 })],
      }),
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 30 })],
            spacing: { after: 200 },
          }),
          ...bodyParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${safeFileName(baseName)}.docx`);
}
