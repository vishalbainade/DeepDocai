

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRoutes from './routes/upload.routes.js';
import chatRoutes from './routes/chat.routes.js';
import historyRoutes from './routes/history.routes.js';
import diagnosticsRoutes from './routes/diagnostics.routes.js';
import chatsRoutes from './routes/chats.routes.js';
import authRoutes from './routes/auth.routes.js';
import { query } from './db/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// 1. Enable CORS for all origins (Required for frontend integration)
app.use(cors());

// 2. Increase payload limits to handle large PDFs (set to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/upload', uploadRoutes);
app.use('/api/ask', chatRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/chats', chatsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize database schema
const initializeDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // Split schema into individual statements and execute them
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error) {
        // Ignore errors for IF NOT EXISTS statements
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate') &&
            !error.message.includes('extension') &&
            !error.message.includes('does not exist')) {
          console.warn(`Schema statement warning: ${error.message}`);
        }
      }
    }
    
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    // Don't exit - schema might already exist
  }
};

// Start server
const startServer = async () => {
  try {
    // Validate required environment variables
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    // Initialize database
    await initializeDatabase();

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    app.listen(PORT, () => {
      console.log(`LexRay backend server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;