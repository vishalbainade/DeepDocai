-- Migration: Add chunk_type and page_number columns to embeddings table
-- This migration adds support for table-aware chunking and retrieval
-- Run this migration on existing databases to add the new columns

-- Add chunk_type column (defaults to 'text' for existing rows)
ALTER TABLE embeddings 
ADD COLUMN IF NOT EXISTS chunk_type VARCHAR(20) DEFAULT 'text' 
CHECK (chunk_type IN ('text', 'table'));

-- Add page_number column (nullable, for reference)
ALTER TABLE embeddings 
ADD COLUMN IF NOT EXISTS page_number INTEGER;

-- Create index for table chunks (for faster retrieval of table-type chunks)
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_type
ON embeddings(document_id, chunk_type) WHERE chunk_type = 'table';

-- Update existing rows to have default chunk_type
UPDATE embeddings 
SET chunk_type = 'text' 
WHERE chunk_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN embeddings.chunk_type IS 'Type of chunk: text or table. Tables are preserved as single chunks.';
COMMENT ON COLUMN embeddings.page_number IS 'Page number where chunk appears (for reference, nullable).';

