import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Normalize private key from environment variable
 * Handles various encoding formats and ensures proper newline characters
 */
const normalizePrivateKey = (key) => {
  if (!key) return null;
  
  let normalized = key;
  
  // Handle different newline encodings
  // Replace \\n (escaped newline) with actual newline
  normalized = normalized.replace(/\\n/g, '\n');
  
  // Handle double-escaped newlines
  normalized = normalized.replace(/\\\\n/g, '\n');
  
  // Handle literal string "\n"
  normalized = normalized.replace(/"\\n"/g, '\n');
  
  // Trim leading/trailing whitespace but preserve internal formatting
  normalized = normalized.trim();
  
  // Ensure proper line endings (some systems might have \r\n)
  normalized = normalized.replace(/\r\n/g, '\n');
  
  return normalized;
};

/**
 * Check if a string is base64-encoded JSON
 */
const isBase64Json = (str) => {
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf-8');
    JSON.parse(decoded);
    return true;
  } catch {
    return false;
  }
};

/**
 * Decode base64-encoded service account JSON
 */
const decodeServiceAccountJson = (base64String) => {
  try {
    const decoded = Buffer.from(base64String, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Failed to decode base64 service account JSON: ${error.message}`);
  }
};

/**
 * Initialize Google Cloud Storage client
 * Supports multiple authentication methods:
 * 1. Service account JSON file path
 * 2. Base64-encoded service account JSON in GCLOUD_PRIVATE_KEY
 * 3. Explicit credentials from environment variables
 * 4. Default credentials (for GCP environments)
 */
const initializeStorage = () => {
  try {
    // Option 1: Use service account JSON file path (GOOGLE_APPLICATION_CREDENTIALS)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Initializing GCS with service account file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      return new Storage({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GCLOUD_PROJECT_ID,
      });
    }

    // Option 2: Use base64-encoded service account JSON in GCLOUD_PRIVATE_KEY
    if (process.env.GCLOUD_PRIVATE_KEY && isBase64Json(process.env.GCLOUD_PRIVATE_KEY)) {
      console.log('Initializing GCS with base64-encoded service account JSON');
      
      const serviceAccount = decodeServiceAccountJson(process.env.GCLOUD_PRIVATE_KEY);
      
      if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('Invalid service account JSON: Missing required fields (project_id, client_email, private_key)');
      }

      // Normalize the private key from the JSON
      const privateKey = normalizePrivateKey(serviceAccount.private_key);

      return new Storage({
        projectId: serviceAccount.project_id,
        credentials: {
          client_email: serviceAccount.client_email,
          private_key: privateKey,
        },
      });
    }

    // Option 3: Use explicit credentials from environment variables
    if (process.env.GCLOUD_PROJECT_ID && process.env.GCLOUD_CLIENT_EMAIL && process.env.GCLOUD_PRIVATE_KEY) {
      console.log('Initializing GCS with explicit credentials from environment variables');
      
      const privateKey = normalizePrivateKey(process.env.GCLOUD_PRIVATE_KEY);
      
      if (!privateKey) {
        throw new Error('GCLOUD_PRIVATE_KEY is empty or invalid');
      }
      
      // Validate that the key has the proper format
      if (!privateKey.includes('BEGIN') || !privateKey.includes('END')) {
        throw new Error('Invalid private key format: Must contain BEGIN and END markers');
      }

      return new Storage({
        projectId: process.env.GCLOUD_PROJECT_ID.trim(),
        credentials: {
          client_email: process.env.GCLOUD_CLIENT_EMAIL.trim(),
          private_key: privateKey,
        },
      });
    }

    // Option 4: Default credentials (for GCP environments like Cloud Run, App Engine)
    console.log('Initializing GCS with default credentials');
    return new Storage({
      projectId: process.env.GCLOUD_PROJECT_ID,
    });
  } catch (error) {
    console.error('Error initializing Google Cloud Storage:', error.message);
    throw new Error(`Failed to initialize GCS client: ${error.message}`);
  }
};

let storage = null;

// Lazy initialization - only create storage client when needed
const getStorage = () => {
  if (!storage) {
    storage = initializeStorage();
  }
  return storage;
};

// Bucket names from environment variables
const INPUT_BUCKET_NAME = process.env.GCS_INPUT_BUCKET || 'fileinputbucket';
const OUTPUT_BUCKET_NAME = process.env.GCS_OUTPUT_BUCKET || 'fileoutputbucket';

// Get bucket references (lazy initialization)
const getInputBucket = () => {
  return getStorage().bucket(INPUT_BUCKET_NAME);
};

const getOutputBucket = () => {
  return getStorage().bucket(OUTPUT_BUCKET_NAME);
};

/**
 * Upload a file to the input bucket (fileinputbucket)
 * @param {Buffer|Stream} fileBuffer - File buffer or stream
 * @param {string} fileName - Name for the file in GCS
 * @param {string} contentType - MIME type (e.g., 'application/pdf')
 * @returns {Promise<string>} Public URL or GCS path
 */
export const uploadToInputBucket = async (fileBuffer, fileName, contentType = 'application/pdf') => {
  try {
    const file = getInputBucket().file(fileName);

    // Upload file with metadata
    await file.save(fileBuffer, {
      metadata: {
        contentType: contentType,
      },
      resumable: false, // For smaller files, use non-resumable upload
    });

    console.log(`File ${fileName} uploaded to ${INPUT_BUCKET_NAME}`);

    // Return the GCS path (gs://bucket/file) or public URL if bucket is public
    return `gs://${INPUT_BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error('Error uploading to input bucket:', error);
    throw new Error(`Failed to upload file to GCS: ${error.message}`);
  }
};

/**
 * Upload a file stream to the input bucket (for large files)
 * @param {Stream} fileStream - Readable stream
 * @param {string} fileName - Name for the file in GCS
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} GCS path
 */
export const uploadStreamToInputBucket = async (fileStream, fileName, contentType = 'application/pdf') => {
  try {
    const file = getInputBucket().file(fileName);

    // Create a write stream
    const writeStream = file.createWriteStream({
      metadata: {
        contentType: contentType,
      },
      resumable: true, // Use resumable upload for larger files
    });

    return new Promise((resolve, reject) => {
      fileStream
        .pipe(writeStream)
        .on('error', (error) => {
          console.error('Error uploading stream:', error);
          reject(new Error(`Failed to upload stream to GCS: ${error.message}`));
        })
        .on('finish', () => {
          console.log(`Stream ${fileName} uploaded to ${INPUT_BUCKET_NAME}`);
          resolve(`gs://${INPUT_BUCKET_NAME}/${fileName}`);
        });
    });
  } catch (error) {
    console.error('Error uploading stream to input bucket:', error);
    throw new Error(`Failed to upload stream to GCS: ${error.message}`);
  }
};

/**
 * Upload JSON log to the output bucket (fileoutputbucket)
 * @param {Object} logData - JSON object to upload
 * @param {string} fileName - Name for the JSON file in GCS
 * @returns {Promise<string>} GCS path
 */
export const uploadLogToOutputBucket = async (logData, fileName) => {
  try {
    const file = getOutputBucket().file(fileName);
    const jsonString = JSON.stringify(logData, null, 2);

    await file.save(jsonString, {
      metadata: {
        contentType: 'application/json',
      },
    });

    console.log(`Log ${fileName} uploaded to ${OUTPUT_BUCKET_NAME}`);
    return `gs://${OUTPUT_BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error('Error uploading log to output bucket:', error);
    throw new Error(`Failed to upload log to GCS: ${error.message}`);
  }
};

/**
 * Generate a log filename with timestamp
 * Format: log-{documentId}-{timestamp}.json
 * @param {string} documentId - Document ID
 * @returns {string} Filename
 */
export const generateLogFileName = (documentId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `log-${documentId}-${timestamp}.json`;
};

/**
 * Check if buckets exist and are accessible
 * @returns {Promise<{inputExists: boolean, outputExists: boolean}>}
 */
export const checkBuckets = async () => {
  try {
    const [inputExists] = await getInputBucket().exists();
    const [outputExists] = await getOutputBucket().exists();

    return {
      inputExists,
      outputExists,
    };
  } catch (error) {
    console.error('Error checking buckets:', error);
    throw new Error(`Failed to check buckets: ${error.message}`);
  }
};

/**
 * Generate a signed URL for uploading a file to GCS
 * @param {string} fileName - Name for the file in GCS
 * @param {string} contentType - MIME type (e.g., 'application/pdf')
 * @param {number} expiresInMinutes - URL expiration time in minutes (default: 15)
 * @returns {Promise<{uploadUrl: string, gcsPath: string}>}
 */
export const generateSignedUploadUrl = async (fileName, contentType = 'application/pdf', expiresInMinutes = 15) => {
  try {
    const file = getInputBucket().file(fileName);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
      contentType: contentType,
    });

    const gcsPath = `gs://${INPUT_BUCKET_NAME}/${fileName}`;
    
    return {
      uploadUrl: url,
      gcsPath: gcsPath,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Error generating signed upload URL:', error);
    throw new Error(`Failed to generate signed upload URL: ${error.message}`);
  }
};

/**
 * Generate a signed URL for reading/downloading a file from GCS
 * @param {string} fileName - Name of the file in GCS
 * @param {number} expiresInMinutes - URL expiration time in minutes (default: 60)
 * @returns {Promise<string>} Signed URL
 */
export const generateSignedReadUrl = async (fileName, expiresInMinutes = 60) => {
  try {
    const file = getInputBucket().file(fileName);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  } catch (error) {
    console.error('Error generating signed read URL:', error);
    throw new Error(`Failed to generate signed read URL: ${error.message}`);
  }
};

/**
 * Get public URL for a file (if bucket is public)
 * @param {string} fileName - Name of the file in GCS
 * @returns {string} Public URL
 */
export const getPublicUrl = (fileName) => {
  return `https://storage.googleapis.com/${INPUT_BUCKET_NAME}/${fileName}`;
};

// Export both named and default
export { getStorage };
export default getStorage;






