import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Storage features will not work.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Bucket names
const INPUT_BUCKET = process.env.SUPABASE_INPUT_BUCKET || 'file-inputs';
const OUTPUT_BUCKET = process.env.SUPABASE_OUTPUT_BUCKET || 'file-outputs';

/**
 * Ensure storage buckets exist, create them if they don't
 */
const ensureBucketsExist = async () => {
  try {
    // Check/create input bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketNames = (buckets || []).map(b => b.name);

    if (!bucketNames.includes(INPUT_BUCKET)) {
      const { error } = await supabase.storage.createBucket(INPUT_BUCKET, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf'],
      });
      if (error && !error.message.includes('already exists')) {
        console.error(`Error creating bucket ${INPUT_BUCKET}:`, error.message);
      } else {
        console.log(`✅ Created storage bucket: ${INPUT_BUCKET}`);
      }
    }

    if (!bucketNames.includes(OUTPUT_BUCKET)) {
      const { error } = await supabase.storage.createBucket(OUTPUT_BUCKET, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/json'],
      });
      if (error && !error.message.includes('already exists')) {
        console.error(`Error creating bucket ${OUTPUT_BUCKET}:`, error.message);
      } else {
        console.log(`✅ Created storage bucket: ${OUTPUT_BUCKET}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring buckets exist:', error.message);
  }
};

// Initialize buckets on first import
ensureBucketsExist();

/**
 * Upload a file to the input bucket
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Name for the file in storage
 * @param {string} contentType - MIME type (e.g., 'application/pdf')
 * @returns {Promise<string>} Storage path
 */
export const uploadToInputBucket = async (fileBuffer, fileName, contentType = 'application/pdf') => {
  try {
    const { data, error } = await supabase.storage
      .from(INPUT_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    console.log(`✅ File ${fileName} uploaded to ${INPUT_BUCKET}`);
    return `${INPUT_BUCKET}/${data.path}`;
  } catch (error) {
    console.error('Error uploading to input bucket:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Upload a file stream to the input bucket (for large files)
 * @param {Stream} fileStream - Readable stream
 * @param {string} fileName - Name for the file in storage
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Storage path
 */
export const uploadStreamToInputBucket = async (fileStream, fileName, contentType = 'application/pdf') => {
  try {
    // Collect stream into buffer
    const chunks = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return await uploadToInputBucket(buffer, fileName, contentType);
  } catch (error) {
    console.error('Error uploading stream to input bucket:', error);
    throw new Error(`Failed to upload stream: ${error.message}`);
  }
};

/**
 * Upload JSON log to the output bucket
 * @param {Object} logData - JSON object to upload
 * @param {string} fileName - Name for the JSON file
 * @returns {Promise<string>} Storage path
 */
export const uploadLogToOutputBucket = async (logData, fileName) => {
  try {
    const jsonString = JSON.stringify(logData, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');

    const { data, error } = await supabase.storage
      .from(OUTPUT_BUCKET)
      .upload(fileName, buffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    console.log(`✅ Log ${fileName} uploaded to ${OUTPUT_BUCKET}`);
    return `${OUTPUT_BUCKET}/${data.path}`;
  } catch (error) {
    console.error('Error uploading log to output bucket:', error);
    throw new Error(`Failed to upload log: ${error.message}`);
  }
};

/**
 * Generate a log filename with timestamp
 * @param {string} documentId - Document ID
 * @returns {string} Filename
 */
export const generateLogFileName = (documentId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `log-${documentId}-${timestamp}.json`;
};

/**
 * Download a file from the input bucket
 * @param {string} fileName - Name of the file in storage
 * @returns {Promise<Buffer>} File buffer
 */
export const downloadFromInputBucket = async (fileName) => {
  try {
    const { data, error } = await supabase.storage
      .from(INPUT_BUCKET)
      .download(fileName);

    if (error) {
      throw new Error(`Supabase download error: ${error.message}`);
    }

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading from input bucket:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
};

/**
 * Check if a file exists in the input bucket
 * @param {string} fileName - Name of the file
 * @returns {Promise<boolean>}
 */
export const fileExistsInInputBucket = async (fileName) => {
  try {
    // List files to check existence (Supabase doesn't have a direct exists method)
    const dir = fileName.includes('/') ? fileName.substring(0, fileName.lastIndexOf('/')) : '';
    const name = fileName.includes('/') ? fileName.substring(fileName.lastIndexOf('/') + 1) : fileName;
    
    const { data, error } = await supabase.storage
      .from(INPUT_BUCKET)
      .list(dir, { search: name });

    if (error) return false;
    return data && data.some(f => f.name === name);
  } catch {
    return false;
  }
};

/**
 * Generate a signed URL for reading/downloading a file
 * @param {string} fileName - Name of the file in storage
 * @param {number} expiresInSeconds - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export const generateSignedReadUrl = async (fileName, expiresInSeconds = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(INPUT_BUCKET)
      .createSignedUrl(fileName, expiresInSeconds);

    if (error) {
      throw new Error(`Supabase signed URL error: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed read URL:', error);
    throw new Error(`Failed to generate signed read URL: ${error.message}`);
  }
};

/**
 * Generate a signed URL for uploading a file
 * @param {string} fileName - Name for the file in storage
 * @param {number} expiresInSeconds - URL expiration time in seconds (default: 900 = 15 min)
 * @returns {Promise<{uploadUrl: string, storagePath: string, fileName: string}>}
 */
export const generateSignedUploadUrl = async (fileName, expiresInSeconds = 900) => {
  try {
    const { data, error } = await supabase.storage
      .from(INPUT_BUCKET)
      .createSignedUploadUrl(fileName);

    if (error) {
      throw new Error(`Supabase signed upload URL error: ${error.message}`);
    }

    return {
      uploadUrl: data.signedUrl,
      token: data.token,
      storagePath: `${INPUT_BUCKET}/${fileName}`,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Error generating signed upload URL:', error);
    throw new Error(`Failed to generate signed upload URL: ${error.message}`);
  }
};

/**
 * Check if buckets exist and are accessible
 * @returns {Promise<{inputExists: boolean, outputExists: boolean}>}
 */
export const checkBuckets = async () => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;

    const bucketNames = (buckets || []).map(b => b.name);
    return {
      inputExists: bucketNames.includes(INPUT_BUCKET),
      outputExists: bucketNames.includes(OUTPUT_BUCKET),
    };
  } catch (error) {
    console.error('Error checking buckets:', error);
    throw new Error(`Failed to check buckets: ${error.message}`);
  }
};

/**
 * Get public URL for a file (if bucket is public)
 * @param {string} fileName - Name of the file in storage
 * @returns {string} Public URL
 */
export const getPublicUrl = (fileName) => {
  const { data } = supabase.storage
    .from(INPUT_BUCKET)
    .getPublicUrl(fileName);
  return data.publicUrl;
};

// Export supabase client for reuse
export { supabase };
export default supabase;
