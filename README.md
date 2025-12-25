# LexRay - AI Legal Assistant

A complete authentication system and AI-powered legal document assistant built with React, Node.js, and PostgreSQL.

## Features

- 🔐 Complete authentication system with JWT
- 📧 Email OTP verification via Gmail SMTP
- 🔒 Password reset with OTP or personal details
- 📄 Document upload and processing
- 🤖 AI-powered Q&A using RAG (Retrieval-Augmented Generation)
- 💬 Chat interface with streaming responses
- 📱 Responsive design

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- React Router
- Axios

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- bcrypt
- Nodemailer (Gmail SMTP)

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Gmail account with App Password

## Setup Instructions

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb lexray

# Or using psql
psql -U postgres
CREATE DATABASE lexray;
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy .env.example to .env
cp .env.example .env

# Edit .env with your configuration
# - Database credentials
# - JWT_SECRET (generate a strong random string)
# - Gmail credentials (GMAIL_USER and GMAIL_APP_PASSWORD)
# - GEMINI_API_KEY

# Start backend server
npm run dev
```

### 3. Gmail App Password Setup

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate a new app password for "Mail"
5. Use this password in `GMAIL_APP_PASSWORD`

### 4. Frontend Setup

```bash
cd frontend
npm install

# Create .env file (optional, defaults to http://localhost:3000)
echo "VITE_API_URL=http://localhost:3000" > .env

# Start frontend dev server
npm run dev
```

## Environment Variables

### Backend (.env)

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lexray
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
JWT_SECRET=your_jwt_secret_key
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-otp` - Verify OTP and complete registration
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### Protected Routes (require JWT)

- `GET /api/chats` - Get all chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:chatId/messages` - Get chat messages
- `PATCH /api/chats/:chatId` - Rename chat
- `DELETE /api/chats/:chatId` - Delete chat
- `POST /api/ask` - Ask question (streaming)
- `POST /api/upload/process` - Process uploaded document

## User Flow

1. **Landing Page** (`/`) - Public landing page with features
2. **Register** (`/register`) - Create account with personal details
3. **Verify OTP** (`/verify-otp`) - Verify email with 6-digit OTP
4. **Login** (`/login`) - Sign in with email and password
5. **Chat** (`/chat`) - Protected chat interface (requires authentication)

## Password Reset Flow

1. **Forgot Password** (`/forgot-password`) - Request reset via email OTP or personal details
2. **Reset Password** (`/reset-password`) - Enter OTP and new password

## Security Features

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with 7-day expiration
- OTP expiration (5 minutes)
- Protected routes with authentication middleware
- Email verification required before account activation

## Database Schema

### Users Table
- id (UUID)
- name, surname, email (unique)
- password_hash
- profession, country, state, city
- is_verified
- created_at

### OTP Verifications Table
- id (UUID)
- email
- otp (6 digits)
- type (registration/password_reset)
- expires_at

## Development

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## Production Deployment

1. Set strong `JWT_SECRET` in production
2. Use environment-specific database credentials
3. Configure CORS for production domain
4. Set up SSL/TLS for database connections
5. Use production email service (consider SendGrid, AWS SES)

## License

ISC

