# LexRay Backend

A comprehensive Node.js backend for a Legal AI RAG (Retrieval Augmented Generation) application using Google Gemini AI and PostgreSQL with pgvector extension.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Working Flow](#working-flow)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Key Features](#key-features)

## 🎯 Overview

LexRay is an intelligent legal document analysis system that enables users to:
1. **Upload PDF documents** (legal documents, contracts, agreements, etc.)
2. **Ask questions** about uploaded documents using natural language
3. **Get accurate answers** based solely on document content with source citations
4. **Generate tabular summaries** and structured data extraction
5. **Maintain conversation history** with document-specific chat sessions

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │ (React Frontend)
└──────┬──────┘
       │ HTTP/HTTPS
       │
┌──────▼─────────────────────────────────────────────┐
│           Express.js Backend Server                │
│  ┌──────────────────────────────────────────────┐  │
│  │  Routes Layer                                │  │
│  │  - Auth Routes (JWT)                         │  │
│  │  - Upload Routes                             │  │
│  │  - Chat Routes (RAG)                         │  │
│  │  - History Routes                            │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Services Layer                             │  │
│  │  - OCR Service (Gemini 2.5 Flash)           │  │
│  │  - Embedding Service (text-embedding-004)   │  │
│  │  - RAG Service (Gemini 2.5 Flash)           │  │
│  │  - Vector Service (pgvector)                 │  │
│  │  - Chunk Service                             │  │
│  │  - Storage Service (GCS)                     │  │
│  └──────────────────────────────────────────────┘  │
└──────┬─────────────────────────────────────────────┘
       │
       ├─────────────────┬──────────────────┐
       │                 │                  │
┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│ PostgreSQL  │  │ Google Cloud │  │ Google Gemini│
│ + pgvector  │  │   Storage    │  │     API      │
│             │  │    (GCS)     │  │              │
└─────────────┘  └──────────────┘  └──────────────┘
```

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL (v13+) with pgvector extension
- **Cloud Storage**: Google Cloud Storage (GCS)
- **AI Provider**: Google Gemini API

### Key Dependencies
- **@google/generative-ai**: Google Gemini SDK for LLM, OCR, and embeddings
- **pg**: PostgreSQL client for database operations
- **multer**: File upload handling
- **jsonwebtoken**: JWT authentication
- **bcrypt**: Password hashing
- **nodemailer**: Email service for OTP verification
- **@google-cloud/storage**: GCS client for file storage

## 🔄 System Architecture

### 1. Document Ingestion Pipeline

```
PDF Upload
    │
    ├─► Generate Signed URL (GCS)
    │
    ├─► Frontend Uploads to GCS
    │
    └─► Backend Processing:
        │
        ├─► [1] OCR & Table Detection (Gemini 2.5 Flash)
        │   └─► Extract text + detect tables (TSV format)
        │
        ├─► [2] Text Cleaning & Normalization
        │
        ├─► [3] Chunking Strategy
        │   ├─► Tables → Single atomic chunks (preserved)
        │   └─► Text → Semantic chunks (800 chars, 100 overlap)
        │
        ├─► [4] Embedding Generation (text-embedding-004)
        │   └─► 768-dimensional vectors
        │
        ├─► [5] Vector Storage (PostgreSQL + pgvector)
        │   └─► Store embeddings with metadata:
        │       - document_id
        │       - chunk_index
        │       - chunk_type (text | table)
        │       - page_number
        │
        └─► [6] Document Metadata Storage
            └─► Store in documents table
```

### 2. RAG (Retrieval Augmented Generation) Pipeline

```
User Question
    │
    ├─► [1] Intent Detection
    │   ├─► Table Request? → isTableRequest()
    │   ├─► Summary Request? → isSummaryRequest()
    │   └─► Generic QA? → Default
    │
    ├─► [2] Query Embedding (text-embedding-004)
    │   └─► Generate 768-dim vector
    │
    ├─► [3] Vector Similarity Search
    │   ├─► Table Query → getAllDocumentChunks()
    │   │   └─► Retrieve ALL chunks, prioritize table chunks
    │   │
    │   └─► Generic Query → hybridSearch()
    │       ├─► Vector similarity search (top 10)
    │       └─► Filter by document_id
    │
    ├─► [4] Context Building
    │   └─► Format chunks with metadata
    │
    └─► [5] Answer Generation
        │
        ├─► Table Request:
        │   └─► buildTableAnswer() - Map-Reduce Pipeline:
        │       ├─► Batch chunks (6-10 per batch)
        │       ├─► Extract rows from each batch (Gemini)
        │       ├─► Merge & deduplicate rows
        │       └─► Format final table (Gemini)
        │
        └─► Text Request:
            └─► generateAnswer() - Direct Generation:
                ├─► Build prompt with context
                ├─► Call Gemini 2.5 Flash
                └─► Return answer + sources
```

### 3. Table Extraction Pipeline (Map-Reduce)

```
Table Query Detected
    │
    ├─► [1] Retrieve All Document Chunks
    │   └─► Prioritize table chunks
    │
    ├─► [2] Batch Chunks (6-10 chunks per batch)
    │   └─► Max 12k-18k characters per batch
    │
    ├─► [3] Map Phase: Extract Rows from Batches
    │   ├─► For each batch:
    │   │   ├─► Call Gemini 2.5 Flash
    │   │   ├─► Prompt: "Extract table rows relevant to question"
    │   │   ├─► Response: JSON { rows, columns, notes }
    │   │   └─► Retry on JSON parse failure
    │   │
    │   └─► Accumulate rows from all batches
    │
    ├─► [4] Reduce Phase: Merge & Deduplicate
    │   ├─► Hash-based row deduplication
    │   ├─► Normalize date columns (if timeline/events)
    │   └─► Merge all rows
    │
    └─► [5] Format Final Table
        ├─► Send merged rows to Gemini
        ├─► Generate title & column names
        ├─► Normalize row lengths
        └─► Return: { answer_type: "table", table: {...} }
```

## 📊 Database Schema

### Tables

#### 1. `users`
Stores user account information.
```sql
- id (UUID, PK)
- name, surname, email
- password_hash (bcrypt)
- profession, country, state, city
- is_verified (boolean)
- created_at
```

#### 2. `documents`
Stores document metadata.
```sql
- id (UUID, PK)
- file_name
- gcs_url (Google Cloud Storage URL)
- created_at
```

#### 3. `embeddings`
Stores text chunks and their vector embeddings.
```sql
- id (UUID, PK)
- document_id (FK → documents)
- chunk_index (integer)
- chunk_text (TEXT)
- embedding (vector(768)) -- pgvector type
- chunk_type (VARCHAR) -- 'text' | 'table'
- page_number (integer)
- created_at
```

**Indexes:**
- `idx_embeddings_vector`: IVFFlat index for cosine similarity search
- `idx_embeddings_document_id`: Filter by document
- `idx_embeddings_chunk_type`: Fast table chunk retrieval

#### 4. `chats`
Stores conversation sessions.
```sql
- id (UUID, PK)
- user_id (FK → users)
- document_id (FK → documents)
- title
- created_at, updated_at
```

#### 5. `chat_history`
Stores individual messages in conversations.
```sql
- id (UUID, PK)
- chat_id (FK → chats)
- document_id (FK → documents)
- role ('user' | 'ai')
- content (TEXT)
- created_at
```

#### 6. `otp_verifications`
Stores OTP codes for email verification.
```sql
- id (UUID, PK)
- email
- otp (6-digit code)
- type ('registration' | 'password_reset')
- expires_at
- created_at
```

## 🔌 API Endpoints

### Authentication Routes (`/api/auth`)

#### `POST /api/auth/register`
Register a new user account.
```json
Request: {
  "name": "John",
  "surname": "Doe",
  "email": "john@example.com",
  "password": "secure123",
  "profession": "Lawyer",
  "country": "United States",
  "state": "California",
  "city": "San Francisco"
}

Response: {
  "success": true,
  "userId": "uuid",
  "message": "Registration successful. Please verify your email."
}
```

#### `POST /api/auth/login`
Authenticate user and get JWT token.
```json
Request: {
  "email": "john@example.com",
  "password": "secure123"
}

Response: {
  "success": true,
  "token": "jwt-token-here",
  "user": { "id": "uuid", "email": "..." }
}
```

#### `POST /api/auth/verify-otp`
Verify email with OTP code.
```json
Request: {
  "email": "john@example.com",
  "otp": "123456"
}

Response: {
  "success": true,
  "message": "Email verified successfully"
}
```

#### `POST /api/auth/forgot-password`
Request password reset OTP.
```json
Request: {
  "email": "john@example.com"
}

Response: {
  "success": true,
  "message": "OTP sent to email"
}
```

#### `POST /api/auth/reset-password`
Reset password with OTP.
```json
Request: {
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "newsecure123"
}

Response: {
  "success": true,
  "message": "Password reset successfully"
}
```

### Upload Routes (`/api/upload`)

#### `POST /api/upload/signed-url`
Generate signed URL for direct GCS upload.
```json
Request: {
  "fileName": "contract.pdf",
  "contentType": "application/pdf"
}

Response: {
  "success": true,
  "documentId": "uuid",
  "uploadUrl": "https://storage.googleapis.com/...",
  "gcsPath": "path/to/file.pdf",
  "fileName": "file.pdf"
}
```

#### `POST /api/upload/process`
Process uploaded document after GCS upload.
```json
Request: {
  "documentId": "uuid",
  "fileName": "contract.pdf",
  "gcsFileName": "path/to/file.pdf"
}

Response: {
  "success": true,
  "documentId": "uuid",
  "chunksCount": 42,
  "tablesCount": 3,
  "textChunksCount": 39
}
```

### Chat Routes (`/api/ask`)

#### `POST /api/ask`
Ask a question (non-streaming).
```json
Request: {
  "documentId": "uuid",
  "question": "What is the termination clause?",
  "chatId": "uuid (optional)",
  "intent": "table | summary | null (auto-detect)"
}

Response: {
  "answer": "The termination clause states...",
  "answer_type": "text | table",
  "table": { "title": "...", "columns": [...], "rows": [...] },
  "sources": [
    {
      "chunkIndex": 5,
      "documentId": "uuid",
      "similarity": 0.92
    }
  ],
  "chatId": "uuid"
}
```

#### `POST /api/ask/stream`
Ask a question with streaming response (SSE).
```json
Request: {
  "documentId": "uuid",
  "question": "Summarize this document",
  "chatId": "uuid (optional)",
  "intent": "table | summary | null"
}

Response: Server-Sent Events (SSE)
- type: 'chunk' → { type: 'chunk', content: 'text...' }
- type: 'sources' → { type: 'sources', sources: [...] }
- type: 'complete' → { type: 'complete', answer_type: 'text', answer: '...' }
- type: 'error' → { type: 'error', error: '...' }
```

#### `POST /api/ask/improve-text`
Improve user input text.
```json
Request: {
  "text": "what is contract"
}

Response: {
  "improvedText": "What are the key terms and conditions of the contract?"
}
```

### Chat History Routes (`/api/chats`)

#### `GET /api/chats`
Get all chats for authenticated user.
```json
Response: {
  "chats": [
    {
      "id": "uuid",
      "title": "Contract Analysis",
      "documentId": "uuid",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `GET /api/chats/:chatId`
Get chat messages for a specific chat.
```json
Response: {
  "chat": {
    "id": "uuid",
    "title": "Contract Analysis",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "What is the termination clause?",
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "uuid",
        "role": "ai",
        "content": "The termination clause...",
        "answer_type": "text",
        "createdAt": "2024-01-01T00:00:01Z"
      }
    ]
  }
}
```

#### `PUT /api/chats/:chatId`
Rename a chat.
```json
Request: {
  "title": "New Chat Title"
}

Response: {
  "success": true,
  "chat": { "id": "uuid", "title": "New Chat Title" }
}
```

#### `DELETE /api/chats/:chatId`
Delete a chat and all its messages.
```json
Response: {
  "success": true,
  "message": "Chat deleted successfully"
}
```

### Diagnostics Routes (`/api/diagnostics`)

#### `POST /api/diagnostics/table-format`
Diagnose table format extraction issues.
```json
Request: {
  "question": "Give me important points in table format",
  "documentId": "uuid"
}

Response: {
  "intent": "table",
  "embeddingGenerated": true,
  "chunksRetrieved": 45,
  "tableChunks": 3,
  "textChunks": 42,
  "diagnostics": "..."
}
```

## 🚀 Installation & Setup

### Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v13 or higher) with pgvector extension
3. **Google Cloud Account** with:
   - Gemini API key
   - GCS bucket for file storage
4. **Email Service** (for OTP verification)

### Step-by-Step Setup

1. **Clone repository and navigate to backend:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up PostgreSQL database:**
```bash
# Create database
createdb lexray

# Connect and enable extensions
psql lexray -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql lexray -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

4. **Configure environment variables:**
Create `.env` file (see [Environment Variables](#environment-variables))

5. **Run database migrations:**
The schema is automatically initialized on first server start.

6. **Start the server:**
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The server will start on `http://localhost:3000` (or port specified in `.env`).

## 🔐 Environment Variables

Create a `.env` file in the backend root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lexray
DB_USER=postgres
DB_PASSWORD=your_password

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Google Cloud Storage
GCS_PROJECT_ID=your_project_id
GCS_INPUT_BUCKET=fileinputbucket
GCS_OUTPUT_BUCKET=fileoutputbucket
GCS_KEY_FILE_PATH=path/to/service-account-key.json

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Email Configuration (for OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@lexray.com
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js                 # Main Express server
│   │
│   ├── db/
│   │   ├── index.js              # Database connection & query helper
│   │   ├── schema.sql            # Database schema definitions
│   │   └── migration_add_chunk_metadata.sql
│   │
│   ├── routes/
│   │   ├── auth.routes.js        # Authentication endpoints
│   │   ├── upload.routes.js      # Document upload endpoints
│   │   ├── chat.routes.js        # RAG question-answering endpoints
│   │   ├── chats.routes.js       # Chat history management
│   │   ├── history.routes.js     # Message history endpoints
│   │   └── diagnostics.routes.js # Diagnostic endpoints
│   │
│   ├── services/
│   │   ├── ocr_service.js         # OCR & table detection (Gemini)
│   │   ├── embedding.service.js   # Embedding generation (text-embedding-004)
│   │   ├── rag_service.js        # RAG pipeline & answer generation
│   │   ├── vector_service.js     # Vector similarity search (pgvector)
│   │   ├── chunk_service.js      # Text chunking strategy
│   │   ├── pdf.service.js        # PDF text extraction
│   │   ├── storage.service.js    # Google Cloud Storage operations
│   │   ├── tesseract.service.js  # Tesseract OCR fallback
│   │   └── email.service.js      # Email service (OTP)
│   │
│   ├── middleware/
│   │   └── auth.middleware.js    # JWT authentication middleware
│   │
│   └── utils/
│       └── cleanup.js            # Temporary file cleanup
│
├── uploads/                      # Temporary upload directory
├── temp/                         # Temporary processing files
├── package.json
└── README.md
```

## ✨ Key Features

### 1. **Advanced OCR with Table Detection**
- Uses Gemini 2.5 Flash for OCR
- Detects and preserves table structures (TSV format)
- Falls back to Tesseract if needed

### 2. **Intelligent Chunking**
- **Tables**: Preserved as single atomic chunks
- **Text**: Semantic chunking (800 chars, 100 overlap)
- Metadata: `chunk_type` (text | table), `page_number`

### 3. **Hybrid Search Strategy**
- **Vector Similarity**: Semantic search using cosine similarity
- **Table Queries**: Retrieve all chunks, prioritize table chunks
- **Generic Queries**: Top-K similarity search with filtering

### 4. **Map-Reduce Table Extraction**
- Processes large documents in batches
- Extracts table rows incrementally
- Deduplicates and merges results
- Formats final structured table

### 5. **Streaming Responses**
- Server-Sent Events (SSE) for real-time updates
- Chunk-by-chunk text streaming
- Complete response with sources

### 6. **Intent Detection**
- Automatically detects table requests
- Detects summary requests
- Optimizes retrieval strategy based on intent

### 7. **Strict Grounding**
- Answers only from retrieved document context
- Returns "NOT FOUND" if information is missing
- Source citations for transparency

### 8. **Conversation Management**
- Document-specific chat sessions
- Persistent chat history
- Chat renaming and deletion

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Email Verification**: OTP-based verification
- **CORS Protection**: Configurable CORS policies
- **Input Validation**: Request validation middleware
- **File Upload Limits**: 50MB max file size

## 📝 Notes

- **Embedding Dimension**: Fixed at 768 (text-embedding-004)
- **Chunk Size**: 800 characters with 100 character overlap
- **Vector Index**: IVFFlat with 100 lists for fast similarity search
- **Table Processing**: Batches of 6-10 chunks, max 12k-18k chars per batch

## 🐛 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure pgvector extension is installed

### Gemini API Errors
- Verify `GEMINI_API_KEY` is set correctly
- Check API quota limits
- Ensure network connectivity

### File Upload Issues
- Verify GCS bucket exists and is accessible
- Check service account permissions
- Ensure `uploads/` directory has write permissions

## 📄 License

ISC
