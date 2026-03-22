

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRoutes from './routes/upload.routes.js';
import askRoutes from './routes/ask.routes.js';
import chatRoutes from './routes/chat.routes.js';
import historyRoutes from './routes/history.routes.js';
import diagnosticsRoutes from './routes/diagnostics.routes.js';
import chatsRoutes from './routes/chats.routes.js';
import authRoutes from './routes/auth.routes.js';
import modelsRoutes from './routes/models.routes.js';
import userSettingsRoutes from './routes/userSettings.routes.js';
import { query } from './db/index.js';
import { seedProvidersAndModels } from './services/aiModelService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// 1. Enable CORS for allowed origins
app.use(cors({
  origin: [
    'https://deepdocai.netlify.app',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}));

// 2. Increase payload limits to handle large PDFs (set to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/upload', uploadRoutes);
app.use('/api/ask', askRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/user', userSettingsRoutes);

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
    // Run main schema
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // Strip full-line comments first, then split into statements
    const cleaned = schema
      .split('\n')
      .map(line => line.trim().startsWith('--') ? '' : line)
      .join('\n');
    
    const statements = cleaned
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error) {
        // Ignore errors for IF NOT EXISTS / already exists
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate') &&
            !error.message.includes('does not exist')) {
          console.warn(`Schema statement warning: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database schema initialized successfully');

    // Run AI routing migration
    const aiRoutingPath = path.join(__dirname, 'db', 'migration_ai_routing.sql');
    try {
      const aiRoutingSchema = await fs.readFile(aiRoutingPath, 'utf-8');
      const aiCleaned = aiRoutingSchema
        .split('\n')
        .map(line => line.trim().startsWith('--') ? '' : line)
        .join('\n');
      
      const aiStatements = aiCleaned
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of aiStatements) {
        try {
          await query(statement);
        } catch (error) {
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate')) {
            console.warn(`AI routing migration warning: ${error.message}`);
          }
        }
      }

      console.log('✅ AI routing schema initialized successfully');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  AI routing migration file not found, skipping');
      } else {
        console.warn('⚠️  AI routing migration warning:', error.message);
      }
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    // Don't exit - schema might already exist
  }
};

// Seed AI providers and models
const seedAIData = async () => {
  try {
    await seedProvidersAndModels();
    console.log('✅ AI providers and models seeded successfully');
  } catch (error) {
    console.warn('⚠️  AI seeding warning:', error.message);
  }
};

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Seed AI providers, models, and API keys
    await seedAIData();

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    app.listen(PORT, () => {
      console.log(`DeepDoc AI backend server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
