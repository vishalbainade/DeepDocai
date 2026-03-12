/**
 * Utility for mapping bounding boxes between image coordinate spaces and PDF user spaces.
 */

/**
 * Maps bounding box coordinates from Image space to PDF User space.
 * 
 * Sarvam metadata uses the image resolutions (e.g., 2084x2084, top-left origin).
 * PDF documents use PostScript points (e.g., 612x792, bottom-left origin).
 * 
 * @param {Object} bbox - The bounding box from Sarvam JSON { x1, y1, x2, y2 }
 * @param {number} imageWidth - Processing image width from JSON
 * @param {number} imageHeight - Processing image height from JSON
 * @param {number} pdfWidth - The target PDF page width
 * @param {number} pdfHeight - The target PDF page height
 * @returns {Object} PDF-scaled coordinates { x, y, width, height }
 */
export const mapBboxToPdfCoords = (bbox, imageWidth, imageHeight, pdfWidth, pdfHeight) => {
  if (!bbox || typeof bbox.x1 !== 'number') {
    return null;
  }

  // Calculate the scale factors
  const scaleX = pdfWidth / imageWidth;
  const scaleY = pdfHeight / imageHeight;

  // Calculate scaled dimensions
  const width = (bbox.x2 - bbox.x1) * scaleX;
  const height = (bbox.y2 - bbox.y1) * scaleY;

  // Image origin is top-left, PDF origin is bottom-left
  // So we transform the Y coordinate.
  const pdfX = bbox.x1 * scaleX;
  const pdfY = pdfHeight - (bbox.y2 * scaleY); // y2 is the bottom edge of the box in image space

  return {
    x: pdfX,
    y: pdfY,
    width,
    height
  };
};
