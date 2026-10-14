-- Migration: Claude-style Projects, Usage & Token tracking, Personalization
-- Creates tables and adds columns for multi-file projects, OCR pages, embedding tokens, and AI token tracking

-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    custom_instructions TEXT,
    color VARCHAR(30) DEFAULT '#da7756',
    icon VARCHAR(50) DEFAULT 'folder',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- 2. Project Documents mapping
CREATE TABLE IF NOT EXISTS project_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_project_docs_proj ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_docs_doc ON project_documents(document_id);

-- 3. Enhance documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_tokens INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(50) DEFAULT 'pdf';

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- 4. Enhance chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);

-- 5. Token & Usage tracking table
CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    model_name VARCHAR(100) NOT NULL,
    usage_type VARCHAR(50) NOT NULL DEFAULT 'chat', -- 'chat', 'embedding', 'ocr', 'improvement'
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    ocr_pages INTEGER DEFAULT 0,
    cost_estimate NUMERIC(10, 6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_type ON token_usage(usage_type);

-- 6. Enhance user_preferences with Claude-style personalization & Memory
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS custom_instructions TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS persona VARCHAR(100) DEFAULT 'legal_counsel';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS tone VARCHAR(100) DEFAULT 'concise';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(100) DEFAULT 'general';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS output_format VARCHAR(100) DEFAULT 'citations_tables';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS memories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS history_limit INTEGER DEFAULT 10;

