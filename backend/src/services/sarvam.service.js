import { SarvamAIClient } from 'sarvamai';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Sarvam Client
const sarvamClient = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});

/**
 * Internal function to handle the actual Sarvam job
 */
const executeSarvamJob = async (filePath) => {
  let outputZipPath = null;
  console.log('📄 Starting Sarvam Document Intelligence Extraction...');

  try {
    console.log('   [1/4] Creating job with Sarvam AI...');
    const job = await sarvamClient.documentIntelligence.createJob({
      language: 'hi-IN',
      outputFormat: 'md',
    });

    console.log('   [2/4] Uploading file to Sarvam API...');
    await job.uploadFile(filePath);

    console.log('   [3/4] Processing document on Sarvam servers...');
    await job.start();
    const status = await job.waitUntilComplete();

    if (status.job_state !== 'Completed' && status.job_state !== 'PartiallyCompleted') {
      throw new Error(`Sarvam processing failed with status: ${status.job_state}`);
    }

    const metrics = job.getPageMetrics();
    console.log(`   ✅ Sarvam job finished. Processed ${metrics?.pagesProcessed || 'unknown'} pages.`);

    console.log('   [4/4] Downloading and extracting structured Markdown output...');
    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });

    outputZipPath = path.join(tempDir, `sarvam-output-${Date.now()}.zip`);
    await job.downloadOutput(outputZipPath);

    const zip = new AdmZip(outputZipPath);
    const zipEntries = zip.getEntries();

    let extractedText = '';

    // Extract Markdown
    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('.md')) {
        extractedText = zip.readAsText(entry);
        break;
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      for (const entry of zipEntries) {
        if (entry.entryName.endsWith('.txt')) {
          extractedText = zip.readAsText(entry);
          break;
        }
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No Markdown/Text content found in Sarvam output ZIP');
    }

    // Extract JSON metadata (bounding boxes)
    const jsonEntries = zipEntries.filter(e => e.entryName.endsWith('.json') && e.entryName.includes('metadata/'));
    const ocrMetadataPages = jsonEntries.map(entry => {
      try {
        return JSON.parse(zip.readAsText(entry));
      } catch (err) {
        console.warn(`⚠️ Failed to parse metadata JSON: ${entry.entryName}`);
        return null;
      }
    }).filter(Boolean);

    console.log(`✅ Sarvam Extraction Successful! Extracted ${extractedText.length} characters and ${ocrMetadataPages.length} metadata pages.`);

    return {
      text: extractedText,
      tables: [],
      ocrMetadataPages
    };

  } finally {
    if (outputZipPath) {
      await fs.unlink(outputZipPath).catch(err => {
        console.warn(`⚠️ Failed to remove temporary Sarvam ZIP file ${outputZipPath}:`, err.message);
      });
    }
  }
};

/**
 * Extract text and structure with automatic retries.
 * 
 * @param {string} filePath - Absolute path to the temporary PDF/image file
 * @param {number} maxRetries - Count of retries on failure (default 3)
 * @returns {Promise<{text: string, tables: Array, ocrMetadataPages: Array}>}
 */
export const extractDocumentWithSarvam = async (filePath, maxRetries = 3) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await executeSarvamJob(filePath);
    } catch (error) {
      attempt++;
      console.error(`❌ [OCR ERROR] Sarvam processing failed on attempt ${attempt}/${maxRetries}:`, error.message);

      if (attempt >= maxRetries) {
        throw new Error(`Sarvam extraction completely failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Waiting ${delay}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
