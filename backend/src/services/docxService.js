import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import logger from '../utils/logger.js';

/**
 * DOCX Generation Service
 * Converts OCR high-fidelity layout data into a standard Word document.
 */

export const generateDocxFromOCR = async (metadata) => {
  const { pages = [] } = metadata;
  
  const sections = [];

  for (const page of pages) {
    const children = [];

    // Add Page Header
    children.push(
      new Paragraph({
        text: `Page ${page.pageNumber}`,
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Sort blocks by Y then X to maintain reading order
    const sortedBlocks = [...(page.blocks || [])]
      .filter(b => b && (b.coordinates || b.boundingBox)) // Ensure block and coordinates exist
      .sort((a, b) => {
        const getMinY = (block) => {
          const coords = block.coordinates || block.boundingBox;
          if (!coords) return 0;
          if (Array.isArray(coords)) {
            if (Array.isArray(coords[0])) {
               // Nested array [[x,y], [x,y]]
               return Math.min(...coords.map(pt => pt[1]));
            }
            // Flat array [x1, y1, x2, y2]
            return Math.min(coords[1] || 0, coords[3] || coords[1] || 0);
          }
          return Math.min(coords.y1 || 0, coords.y2 || 0);
        };

        const ay = getMinY(a);
        const by = getMinY(b);
        const yDiff = ay - by;
        
        if (Math.abs(yDiff) > 10) return yDiff; 
        
        const getMinX = (block) => {
          const coords = block.coordinates || block.boundingBox;
          if (!coords) return 0;
          if (Array.isArray(coords)) {
            if (Array.isArray(coords[0])) {
               return Math.min(...coords.map(pt => pt[0]));
            }
            return Math.min(coords[0] || 0, coords[2] || coords[0] || 0);
          }
          return Math.min(coords.x1 || 0, coords.x2 || 0);
        };
        
        return getMinX(a) - getMinX(b);
      });

    // Coalesce fractured HTML tables split across multiple OCR blocks
    const coalescedBlocks = [];
    let tableBuffer = '';
    let insideTable = false;

    for (const block of sortedBlocks) {
      if (!block.text) continue;
      const text = block.text.trim();
      const lower = text.toLowerCase();

      if (!insideTable && lower.includes('<table')) {
         const tableStart = lower.indexOf('<table');
         const textBefore = text.substring(0, tableStart).trim();
         
         if (textBefore) {
            coalescedBlocks.push({ ...block, text: textBefore });
         }

         tableBuffer = text.substring(tableStart) + '\n';
         insideTable = true;
         
         if (lower.includes('</table>')) {
            coalescedBlocks.push({ ...block, text: tableBuffer });
            tableBuffer = '';
            insideTable = false;
         }
         continue;
      }

      if (insideTable) {
         tableBuffer += text + '\n';
         if (lower.includes('</table>')) {
            coalescedBlocks.push({ type: 'table', text: tableBuffer });
            tableBuffer = '';
            insideTable = false;
         }
         continue;
      }

      coalescedBlocks.push(block);
    }
    
    if (insideTable) {
      coalescedBlocks.push({ type: 'table', text: tableBuffer });
    }

    for (const block of coalescedBlocks) {
      if (!block.text) continue;
      const rawText = block.text.trim();
      
      // ── Handle Table Blocks ──────────────────────────────
      if (rawText.toLowerCase().includes('<table')) {
        const tableStart = rawText.toLowerCase().indexOf('<table');
        const textBefore = rawText.substring(0, tableStart).trim();
        
        if (textBefore) {
          const lines = textBefore.split('\n');
          for (const line of lines) {
            children.push(new Paragraph({
              children: [new TextRun({ text: line.trim(), font: 'Arial', size: 22 })],
              spacing: { before: 100, after: 100 },
            }));
          }
        }

        const tableHtml = rawText.substring(tableStart);
        const parsedTable = parseHtmlTable(tableHtml);
        
        if (parsedTable) {
          const docxTable = createDocxTableFromParsed(parsedTable);
          if (docxTable) {
            children.push(docxTable);
            children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
            continue;
          }
        }
      }
      
      // Default text-only rendering
      const lines = rawText.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.trim(),
                font: 'Arial',
                size: 22, // 11pt
              }),
            ],
            spacing: { before: 100, after: 100 },
          })
        );
      }
    }

    // Add page break after every page except the last
    if (page.pageNumber < pages.length) {
      // Docx library handles sections as page breaks
    }

    sections.push({
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5 inch
        },
      },
      children,
    });
  }

  const doc = new Document({
    creator: 'DeepDoc AI',
    title: metadata.fileName || 'OCR Export',
    sections,
  });

  return await Packer.toBuffer(doc);
};

/**
 * Helper to parse a simple HTML table string into rows/cells
 */
function parseHtmlTable(html) {
  try {
    const rows = [];
    const trMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    
    for (const tr of trMatches) {
      const cells = [];
      const tdMatches = tr.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
      
      for (const td of tdMatches) {
        // Strip tags and trim
        const content = td.replace(/<[^>]*>/g, '').trim();
        cells.push({ text: content });
      }
      
      if (cells.length > 0) {
        rows.push({ cells });
      }
    }
    
    return rows.length > 0 ? { rows } : null;
  } catch (err) {
    console.warn('Failed to parse HTML table:', err.message);
    return null;
  }
}

/**
 * Helper to convert parsed table data to a Word Table
 */
function createDocxTableFromParsed(tableData) {
  if (!tableData || !tableData.rows || tableData.rows.length === 0) return null;

  // Track max cells per row to normalize width
  const maxCells = Math.max(...tableData.rows.map(r => r.cells.length));

  const rows = tableData.rows.map(row => {
    const cells = row.cells.map(cell => {
      return new TableCell({
        children: [new Paragraph({ 
          children: [new TextRun({ text: cell.text || '', size: 20 })]
        })],
        width: {
          size: 100 / maxCells,
          type: WidthType.PERCENTAGE,
        },
        shading: {
           fill: "FAFAFA",
        }
      });
    });

    // Fill remaining cells if row is short
    while (cells.length < maxCells) {
      cells.push(new TableCell({ children: [] }));
    }

    return new TableRow({ children: cells });
  });

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}

export default { generateDocxFromOCR };
