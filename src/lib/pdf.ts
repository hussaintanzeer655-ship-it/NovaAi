import { jsPDF } from "jspdf";

interface PdfSection {
  type: "heading" | "subheading" | "paragraph" | "bullet" | "numbered" | "code" | "spacing";
  text: string;
}

function parseMarkdown(content: string): PdfSection[] {
  const lines = content.split("\n");
  const sections: PdfSection[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        sections.push({ type: "code", text: codeBuffer.join("\n") });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      sections.push({ type: "spacing", text: "" });
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      sections.push({ type: "subheading", text: trimmed.slice(4) });
    } else if (trimmed.startsWith("## ")) {
      sections.push({ type: "subheading", text: trimmed.slice(3) });
    } else if (trimmed.startsWith("# ")) {
      sections.push({ type: "heading", text: trimmed.slice(2) });
    } else if (/^\d+\.\s/.test(trimmed)) {
      sections.push({ type: "numbered", text: trimmed.replace(/^\d+\.\s/, "") });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      sections.push({ type: "bullet", text: trimmed.slice(2) });
    } else {
      // Clean inline formatting
      const clean = trimmed
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      sections.push({ type: "paragraph", text: clean });
    }
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    sections.push({ type: "code", text: codeBuffer.join("\n") });
  }

  return sections;
}

export function exportToPdf(content: string, filename: string = "document.pdf"): void {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const sections = parseMarkdown(content);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text("AI Generated Document", margin, y);
  y += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const dateStr = new Date().toLocaleString();
  doc.text(dateStr, margin, y);
  y += 25;

  // Draw a separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 25;

  for (const section of sections) {
    // Check for page break
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    switch (section.type) {
      case "heading": {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(15, 76, 129);
        const lines = doc.splitTextToSize(section.text, maxWidth);
        for (const line of lines) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 24;
        }
        y += 6;
        break;
      }
      case "subheading": {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        const lines = doc.splitTextToSize(section.text, maxWidth);
        for (const line of lines) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 19;
        }
        y += 4;
        break;
      }
      case "paragraph": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(section.text, maxWidth);
        for (const line of lines) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 16;
        }
        y += 6;
        break;
      }
      case "bullet": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(section.text, maxWidth - 20);
        doc.text("\u2022", margin, y);
        for (let i = 0; i < lines.length; i++) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(lines[i], margin + 15, y);
          y += 16;
        }
        y += 4;
        break;
      }
      case "numbered": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(section.text, maxWidth - 25);
        for (let i = 0; i < lines.length; i++) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          if (i === 0) {
            const num = section.text.match(/^(\d+)/);
            doc.text(num ? `${num[1]}.` : "\u2022", margin, y);
          }
          doc.text(lines[i], margin + 20, y);
          y += 16;
        }
        y += 4;
        break;
      }
      case "code": {
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        // Background
        const codeLines = section.text.split("\n");
        const lineHeight = 13;
        const blockHeight = codeLines.length * lineHeight + 10;

        if (y + blockHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin - 5, y - 10, maxWidth + 10, blockHeight, 4, 4, "F");

        for (const codeLine of codeLines) {
          const wrapped = doc.splitTextToSize(codeLine, maxWidth - 10);
          for (const wLine of wrapped) {
            doc.text(wLine, margin, y);
            y += lineHeight;
            if (y > pageHeight - margin) {
              doc.addPage();
              y = margin;
              doc.setFillColor(241, 245, 249);
            }
          }
        }
        y += 10;
        break;
      }
      case "spacing": {
        y += 8;
        break;
      }
    }
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 20,
      { align: "right" }
    );
    doc.text("Generated by AI Agent", margin, pageHeight - 20);
  }

  doc.save(filename);
}
