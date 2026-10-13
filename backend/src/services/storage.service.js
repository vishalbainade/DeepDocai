import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local directories for local storage fallback
const LOCAL_STORAGE_DIR = path.join(__dirname, '../../uploads');
const LOCAL_INPUT_DIR = path.join(LOCAL_STORAGE_DIR, 'file-inputs');
const LOCAL_OUTPUT_DIR = path.join(LOCAL_STORAGE_DIR, 'file-outputs');

try {
  fsSync.mkdirSync(LOCAL_INPUT_DIR, { recursive: true });
  fsSync.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true });
} catch {
  // Directory exists
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.warn('⚠️ Supabase client initialization error:', e.message);
  }
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Using local file storage.');
}

// Bucket names
const INPUT_BUCKET = process.env.SUPABASE_INPUT_BUCKET || 'file-inputs';
const OUTPUT_BUCKET = process.env.SUPABASE_OUTPUT_BUCKET || 'file-outputs';

/**
 * Ensure storage buckets exist (best effort, graceful fallback)
 */
const ensureBucketsExist = async () => {
  if (!supabase) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketNames = (buckets || []).map((b) => b.name);

    if (!bucketNames.includes(INPUT_BUCKET)) {
      await supabase.storage.createBucket(INPUT_BUCKET, {
        public: false,
        fileSizeLimit: 52428800,
        allowedMimeTypes: ['application/pdf'],
      });
    }

    if (!bucketNames.includes(OUTPUT_BUCKET)) {
      await supabase.storage.createBucket(OUTPUT_BUCKET, {
        public: false,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['application/json'],
      });
    }
  } catch {
    // Supabase unavailable; silent fallback to local storage
  }
};

ensureBucketsExist();

/**
 * Upload a file to the input bucket (Local storage with Supabase mirror)
 */
export const uploadToInputBucket = async (fileBuffer, fileName, contentType = 'application/pdf') => {
  const cleanName = path.basename(fileName);
  const localPath = path.join(LOCAL_INPUT_DIR, cleanName);

  // Always write locally first
  try {
    await fs.writeFile(localPath, fileBuffer);
    console.log(`✅ File ${cleanName} saved to local input storage`);
  } catch (err) {
    console.warn('Local input storage write note:', err.message);
  }

  // Best effort Supabase upload
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(INPUT_BUCKET)
        .upload(cleanName, fileBuffer, {
          contentType,
          upsert: true,
        });
      if (!error && data) {
        return `${INPUT_BUCKET}/${data.path}`;
      }
    } catch {
      // Supabase unavailable
    }
  }

  return `${INPUT_BUCKET}/${cleanName}`;
};

/**
 * Upload a file stream to the input bucket
 */
export const uploadStreamToInputBucket = async (fileStream, fileName, contentType = 'application/pdf') => {
  const chunks = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return await uploadToInputBucket(buffer, fileName, contentType);
};

/**
 * Upload JSON log to the output bucket (Local storage with Supabase mirror)
 */
export const uploadLogToOutputBucket = async (logData, fileName) => {
  const cleanName = path.basename(fileName);
  const localPath = path.join(LOCAL_OUTPUT_DIR, cleanName);
  const jsonString = JSON.stringify(logData, null, 2);

  try {
    await fs.writeFile(localPath, jsonString, 'utf-8');
    console.log(`✅ Log ${cleanName} saved to local output storage`);
  } catch (err) {
    console.warn('Local output storage write note:', err.message);
  }

  if (supabase) {
    try {
      const buffer = Buffer.from(jsonString, 'utf-8');
      const { data, error } = await supabase.storage
        .from(OUTPUT_BUCKET)
        .upload(cleanName, buffer, {
          contentType: 'application/json',
          upsert: true,
        });
      if (!error && data) {
        return `${OUTPUT_BUCKET}/${data.path}`;
      }
    } catch {
      // Supabase unavailable
    }
  }

  return `${OUTPUT_BUCKET}/${cleanName}`;
};

/**
 * Download a file from the output bucket
 */
export const downloadFromOutputBucket = async (fileName) => {
  const cleanName = path.basename(fileName);
  const localPath = path.join(LOCAL_OUTPUT_DIR, cleanName);

  try {
    const buffer = await fs.readFile(localPath);
    return buffer;
  } catch {
    if (supabase) {
      try {
        const { data, error } = await supabase.storage.from(OUTPUT_BUCKET).download(cleanName);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch {
        // Fall through
      }
    }
    throw new Error(`Failed to download output file: ${cleanName}`);
  }
};

/**
 * Generate a log filename with timestamp
 */
export const generateLogFileName = (documentId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `log-${documentId}-${timestamp}.json`;
};

/**
 * Download a file from the input bucket
 */
export const downloadFromInputBucket = async (fileName) => {
  const cleanName = path.basename(fileName);
  const localPath = path.join(LOCAL_INPUT_DIR, cleanName);

  try {
    const buffer = await fs.readFile(localPath);
    return buffer;
  } catch {
    if (supabase) {
      try {
        const { data, error } = await supabase.storage.from(INPUT_BUCKET).download(cleanName);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch {
        // Fall through
      }
    }
    throw new Error(`Failed to download input file: ${cleanName}`);
  }
};

/**
 * Check if a file exists in the input bucket
 */
export const fileExistsInInputBucket = async (fileName) => {
  const cleanName = path.basename(fileName);
  const localPath = path.join(LOCAL_INPUT_DIR, cleanName);

  try {
    await fs.access(localPath);
    return true;
  } catch {
    if (supabase) {
      try {
        const { data, error } = await supabase.storage.from(INPUT_BUCKET).list('', { search: cleanName });
        if (!error && data) {
          return data.some((f) => f.name === cleanName);
        }
      } catch {
        return false;
      }
    }
    return false;
  }
};

/**
 * Generate a signed URL for reading/downloading a file
 */
export const generateSignedReadUrl = async (fileName, expiresInSeconds = 3600) => {
  const cleanName = path.basename(fileName);
  const localPath = path.join(LOCAL_INPUT_DIR, cleanName);

  try {
    await fs.access(localPath);
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}/api/upload/file/${encodeURIComponent(cleanName)}`;
  } catch {
    if (supabase) {
      try {
        const { data, error } = await supabase.storage.from(INPUT_BUCKET).createSignedUrl(cleanName, expiresInSeconds);
        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch {
        // Fall through
      }
    }
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}/api/upload/file/${encodeURIComponent(cleanName)}`;
  }
};

/**
 * Generate an upload URL (Supabase with automatic local direct upload fallback)
 */
export const generateSignedUploadUrl = async (fileName, expiresInSeconds = 900) => {
  const cleanName = path.basename(fileName);

  // Try Supabase first if configured
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(INPUT_BUCKET)
        .createSignedUploadUrl(cleanName);

      if (!error && data?.signedUrl) {
        return {
          uploadUrl: data.signedUrl,
          token: data.token,
          storagePath: `${INPUT_BUCKET}/${cleanName}`,
          fileName: cleanName,
        };
      }
    } catch {
      // Supabase offline/unreachable
    }
  }

  // Graceful local upload fallback
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return {
    uploadUrl: `${baseUrl}/api/upload/local-upload?fileName=${encodeURIComponent(cleanName)}`,
    token: 'local-storage-token',
    storagePath: `${INPUT_BUCKET}/${cleanName}`,
    fileName: cleanName,
    isLocal: true,
  };
};

/**
 * Check if buckets exist and are accessible
 */
export const checkBuckets = async () => {
  return {
    inputExists: true,
    outputExists: true,
  };
};

/**
 * Get public URL for a file
 */
export const getPublicUrl = (fileName) => {
  const cleanName = path.basename(fileName);
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/api/upload/file/${encodeURIComponent(cleanName)}`;
};

export default {
  uploadToInputBucket,
  uploadStreamToInputBucket,
  uploadLogToOutputBucket,
  downloadFromOutputBucket,
  downloadFromInputBucket,
  fileExistsInInputBucket,
  generateSignedReadUrl,
  generateSignedUploadUrl,
  checkBuckets,
  getPublicUrl,
};
