import { rgb } from 'pdf-lib';

/**
 * A stateful PDF generation utility that correctly manages A4 pagination, 
 * font measurements, and cursors while rebuilding documents from scratch.
 */
export class PdfRenderer {
  constructor(pdfDoc, customFont) {
    this.pdfDoc = pdfDoc;
    this.font = customFont;
    
    // A4 Portrait Dimensions
    this.PAGE_WIDTH = 595.28;
    this.PAGE_HEIGHT = 841.89;
    
    this.MARGIN_X = 50;
    this.MARGIN_Y = 60;
    this.MAX_TEXT_WIDTH = this.PAGE_WIDTH - (this.MARGIN_X * 2);

    this.currentPage = null;
    this.cursorY = 0;
    this.pageCount = 0;

    this.addNewPage();
  }

  addNewPage() {
    this.currentPage = this.pdfDoc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);
    this.cursorY = this.PAGE_HEIGHT - this.MARGIN_Y;
    this.pageCount++;
  }

  ensureSpace(requiredHeight) {
    if (this.cursorY - requiredHeight < this.MARGIN_Y) {
      this.addNewPage();
    }
  }

  /**
   * Split a long text string into multiple lines that fit within a specified widths.
   */
  breakTextIntoLines(text, fontSize, maxWidth = this.MAX_TEXT_WIDTH) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
      const width = this.font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Parses HTML table tags and natively draws a grid-based table into the PDF.
   * Returns false if the text wasn't an HTML table so we can fallback.
   */
  drawTable(htmlText) {
    const fontSize = 10;
    const lineHeight = 1.2;
    const padding = 5;
    const color = rgb(0.1, 0.1, 0.1);
    const borderColor = rgb(0.8, 0.8, 0.8);
    
    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gis;
    const rows = [];
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(htmlText)) !== null) {
      const rowContent = rowMatch[1];
      const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gis;
      const cells = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        // Strip inner HTML tags and decode entities
        let cellText = cellMatch[2].replace(/<[^>]+>/g, '').trim();
        cellText = cellText.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        cells.push(cellText);
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) {
      return false; // Not an HTML table
    }

    // Determine max columns
    const numCols = Math.max(...rows.map(r => r.length));
    if (numCols === 0) return false;

    // Equal column widths
    const colWidth = this.MAX_TEXT_WIDTH / numCols;

    const rowHeights = rows.map(row => {
      let maxLines = 1;
      row.forEach(cell => {
        const lines = this.breakTextIntoLines(cell, fontSize, colWidth - (padding * 2));
        if (lines.length > maxLines) maxLines = lines.length;
      });
      return (maxLines * this.font.heightAtSize(fontSize) * lineHeight) + (padding * 2);
    });

    // Draw the table
    rows.forEach((row, rIdx) => {
      const rHeight = rowHeights[rIdx];
      this.ensureSpace(rHeight);

      for (let cIdx = 0; cIdx < numCols; cIdx++) {
        const cell = row[cIdx] || '';
        const x = this.MARGIN_X + (cIdx * colWidth);
        const y = this.cursorY;

        // Draw Cell Border
        this.currentPage.drawRectangle({
          x: x,
          y: y - rHeight,
          width: colWidth,
          height: rHeight,
          borderColor: borderColor,
          borderWidth: 1,
        });

        // Draw Cell Text
        const lines = this.breakTextIntoLines(cell, fontSize, colWidth - (padding * 2));
        let textY = y - padding - this.font.heightAtSize(fontSize);
        
        lines.forEach(line => {
           this.currentPage.drawText(line, {
            x: x + padding,
            y: textY,
            size: fontSize,
            font: this.font,
            color: color,
          });
          textY -= this.font.heightAtSize(fontSize) * lineHeight;
        });
      }

      this.cursorY -= rHeight;
    });

    this.cursorY -= 20; // Table margin bottom
    return true;
  }

  /**
   * Universal text drawer handling wrapping and pagination automatically.
   */
  drawBlock(text, type) {
    let fontSize = 12;
    let lineHeight = 1.5;
    let color = rgb(0, 0, 0);
    let spacingAfter = 15;
    let indent = 0;

    // Apply strict styling rules based on the parsed block type
    if (type === 'heading') {
      fontSize = 18;
      lineHeight = 1.2;
      spacingAfter = 20;
    } else if (type === 'table') {
      // Try to draw it as a native visual HTML grid. 
      // If successful, exit early. Wait, some tables might not be HTML. In that case fallback.
      const isHtmlTable = this.drawTable(text);
      if (isHtmlTable) return;
      
      // Fallback: Very basic table representation
      fontSize = 10;
      color = rgb(0.3, 0.3, 0.3); 
      indent = 10;
      spacingAfter = 20;
    } else if (type === 'list') {
      fontSize = 12;
      indent = 20; // Indent bullet points
    }

    // Attempt to handle internal newlines safely, especially for regular text blocks
    const rawLines = text.split('\n');

    for (const rawLine of rawLines) {
      // Provide bullet prefix for lists
      let lineStr = rawLine;
      if (type === 'list' && lineStr.trim().length > 0) {
        if (!lineStr.trim().startsWith('-') && !lineStr.trim().startsWith('•')) {
          lineStr = `• ${lineStr.trim()}`;
        }
      }

      // Safely wrap text
      const wrappedLines = this.breakTextIntoLines(lineStr, fontSize);

      wrappedLines.forEach(wl => {
        const height = this.font.heightAtSize(fontSize) * lineHeight;
        this.ensureSpace(height);

        this.currentPage.drawText(wl, {
          x: this.MARGIN_X + indent,
          y: this.cursorY - height + (this.font.heightAtSize(fontSize) * 0.2), // Adjust baseline manually
          size: fontSize,
          font: this.font,
          color: color,
        });

        this.cursorY -= height;
      });
    }

    // Add margin bottom to block
    this.cursorY -= spacingAfter;
  }
}
