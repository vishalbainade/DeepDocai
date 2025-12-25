# LexRay Frontend

A modern, responsive React frontend for LexRay - an AI-powered legal document analysis platform. Built with React 18, Vite, Tailwind CSS, and React Router.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Working Flow](#working-flow)
- [Component Structure](#component-structure)
- [State Management](#state-management)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Key Features](#key-features)

## 🎯 Overview

LexRay Frontend provides a professional, user-friendly interface for:
1. **User Authentication**: Registration, login, email verification, password reset
2. **Document Upload**: Drag-and-drop PDF upload with progress tracking
3. **Document Viewing**: PDF viewer with zoom, navigation, and page controls
4. **AI Chat Interface**: Real-time Q&A with document context
5. **Table Rendering**: Structured table display for tabular responses
6. **Chat History**: Conversation management and history
7. **Responsive Design**: Mobile-friendly, modern UI

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Routing Layer (React Router)                    │  │
│  │  - Public Routes (Landing, Login, Register)      │  │
│  │  - Protected Routes (Chat, History)              │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Context Layer                                    │  │
│  │  - ChatContext (Global state management)         │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Component Layer                                 │  │
│  │  - Pages (Landing, Login, Register, etc.)        │  │
│  │  - Layout Components (Sidebar, Navbar)           │  │
│  │  - Feature Components (ChatPanel, PDFViewer)      │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Service Layer                                   │  │
│  │  - API Service (Axios)                           │  │
│  │  - Intent Detection                              │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ HTTP/HTTPS (REST API + SSE)
                    │
        ┌───────────▼───────────┐
        │   Express Backend     │
        │   (Port 3000)         │
        └───────────────────────┘
```

## 🛠️ Technology Stack

### Core Technologies
- **React 18**: UI library with hooks and context
- **Vite**: Fast build tool and dev server
- **React Router v7**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API requests

### Key Dependencies
- **react-pdf**: PDF rendering and viewing
- **react-markdown**: Markdown rendering for AI responses
- **lucide-react**: Icon library
- **react-resizable-panels**: Resizable panel layout

### Development Tools
- **@vitejs/plugin-react**: Vite React plugin
- **autoprefixer**: CSS vendor prefixing
- **postcss**: CSS processing

## 🔄 System Architecture

### 1. Application Flow

```
User Opens App
    │
    ├─► Landing Page (/)
    │   └─► Public: Marketing, features, CTA
    │
    ├─► Authentication Flow
    │   ├─► Register (/register)
    │   │   └─► Email verification → Verify OTP
    │   │
    │   ├─► Login (/login)
    │   │   └─► JWT token → Protected routes
    │   │
    │   └─► Password Reset
    │       └─► Forgot Password → Reset Password
    │
    └─► Protected Routes (Require Auth)
        ├─► Home Page (/chat)
        │   └─► Document upload + chat interface
        │
        ├─► Chat Page (/chat/:chatId)
        │   └─► Load existing conversation
        │
        └─► History Page (/history)
            └─► List all conversations
```

### 2. Document Upload Flow

```
User Selects PDF
    │
    ├─► [1] Frontend: Generate Signed URL
    │   └─► POST /api/upload/signed-url
    │       └─► Receive: documentId, uploadUrl
    │
    ├─► [2] Frontend: Upload to GCS
    │   └─► PUT request to signed URL
    │       └─► Progress tracking
    │
    ├─► [3] Frontend: Process Document
    │   └─► POST /api/upload/process
    │       └─► Backend: OCR, chunking, embedding
    │
    └─► [4] Frontend: Load Document
        ├─► Get preview URL
        ├─► Display in PDF viewer
        └─► Enable chat interface
```

### 3. Chat Flow (RAG)

```
User Asks Question
    │
    ├─► [1] Intent Detection
    │   └─► detectQueryIntent(question)
    │       ├─► 'table' → Table request
    │       ├─► 'summary' → Summary request
    │       └─► null → Generic QA
    │
    ├─► [2] Add User Message (Optimistic UI)
    │   └─► Update chat history immediately
    │
    ├─► [3] Create AI Message Placeholder
    │   └─► Show "Analyzing..." indicator
    │
    ├─► [4] Stream Request (SSE)
    │   └─► POST /api/ask/stream
    │       ├─► onChunk: Update message content
    │       ├─► onSources: Store source citations
    │       ├─► onComplete: Finalize response
    │       └─► onError: Show error message
    │
    ├─► [5] Handle Response Type
    │   ├─► Table Response:
    │   │   └─► Render ChatTable component
    │   │
    │   └─► Text Response:
    │       └─► Render markdown with ReactMarkdown
    │
    └─► [6] Save to Chat History
        └─► Backend saves to database
```

### 4. Streaming Response Handling

```
SSE Stream Received
    │
    ├─► Parse SSE Events
    │   ├─► type: 'chunk'
    │   │   └─► Accumulate text
    │   │       └─► Update message.content
    │   │
    │   ├─► type: 'sources'
    │   │   └─► Store sources array
    │   │
    │   ├─► type: 'complete'
    │   │   ├─► Table: Store table object
    │   │   └─► Text: Finalize content
    │   │
    │   └─► type: 'error'
    │       └─► Display error message
    │
    └─► Update UI
        ├─► Scroll to latest message
        ├─► Update isStreaming flag
        └─► Show copy button (when complete)
```

## 📁 Component Structure

### Pages (`/src/pages/`)

#### `LandingPage.jsx`
- Public landing page with hero section
- Features showcase
- Call-to-action buttons
- Professional footer

#### `LoginPage.jsx`
- Email/password login form
- Show/hide password toggle
- Forgot password link
- Error/success messages

#### `RegisterPage.jsx`
- Multi-field registration form
- Show/hide password toggle
- Email verification flow
- Form validation

#### `VerifyOTPPage.jsx`
- OTP input form
- Email verification
- Resend OTP functionality

#### `ForgotPasswordPage.jsx`
- Email input for password reset
- OTP request

#### `ResetPasswordPage.jsx`
- New password form
- OTP verification
- Password reset confirmation

### Layout Components (`/src/components/`)

#### `Layout.jsx`
- Main application layout wrapper
- Handles protected route rendering
- Provides layout structure

#### `Navbar.jsx`
- Top navigation bar
- Menu toggle button
- Upload button
- Logo display

#### `Sidebar.jsx`
- Collapsible sidebar navigation
- Chat history list
- Search functionality
- Dark-navy theme
- Active chat highlighting

### Feature Components

#### `HomePage.jsx`
- Document upload zone
- Empty state when no document
- Navigation to chat interface

#### `ChatPage.jsx`
- Main chat interface
- Resizable panels (PDF viewer + chat)
- Document viewer integration
- Chat panel integration

#### `Workspace.jsx`
- Document management
- Chat history loading
- Message sending logic
- Streaming response handling
- Intent detection integration

#### `ChatPanel.jsx`
- Chat message display
- Message bubbles (user/AI)
- Markdown rendering
- Table rendering
- Copy button
- Text improvement feature

#### `PDFViewer.jsx`
- PDF document rendering
- Zoom controls
- Page navigation
- Page number display

#### `ChatTable.jsx`
- Structured table display
- Responsive design
- Column/row rendering
- Graceful fallbacks

#### `UploadZone.jsx`
- Drag-and-drop file upload
- File selection
- Upload progress
- File validation

### Utility Components

#### `LexRayLogo.jsx`
- Reusable logo component
- Size variants (small, default, large)
- Text toggle
- Logo variant selection (original/alternative)

#### `ProtectedRoute.jsx`
- Route protection wrapper
- JWT token validation
- Redirect to login if unauthenticated

## 🔄 State Management

### ChatContext (`/src/contexts/ChatContext.jsx`)

Global state management for:
- **Chats**: List of all user conversations
- **Current Chat**: Active chat session
- **Loading States**: API request states
- **Error Handling**: Error messages

```javascript
{
  chats: Array<Chat>,
  currentChat: Chat | null,
  loading: boolean,
  error: string | null,
  fetchChats: () => Promise<void>,
  createChat: (documentId, title) => Promise<Chat>,
  deleteChat: (chatId) => Promise<void>,
  renameChat: (chatId, title) => Promise<void>
}
```

### Local Component State

- **Chat History**: Messages in current conversation
- **Current Document**: Active document ID and preview URL
- **Streaming State**: Real-time streaming indicators
- **Form States**: Input values, validation, errors

## 🚀 Installation & Setup

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**

### Step-by-Step Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create `.env` file (see [Environment Variables](#environment-variables))

4. **Start development server:**
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (Vite default port).

5. **Build for production:**
```bash
npm run build
```

Built files will be in the `dist/` directory.

## 🔐 Environment Variables

Create a `.env` file in the frontend root directory:

```env
# API Configuration
VITE_API_URL=http://localhost:3000

# Optional: Feature flags
VITE_ENABLE_ANALYTICS=false
```

## 📁 Project Structure

```
frontend/
├── public/                      # Static assets
│
├── src/
│   ├── main.jsx                # Application entry point
│   ├── App.jsx                 # Root component with routing
│   ├── index.css               # Global styles
│   │
│   ├── pages/                  # Page components
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── VerifyOTPPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   └── ResetPasswordPage.jsx
│   │
│   ├── components/             # Reusable components
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── HomePage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── Workspace.jsx
│   │   ├── ChatPanel.jsx
│   │   ├── PDFViewer.jsx
│   │   ├── ChatTable.jsx
│   │   ├── UploadZone.jsx
│   │   ├── LexRayLogo.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   ├── contexts/              # React Context providers
│   │   └── ChatContext.jsx
│   │
│   ├── services/              # API services
│   │   └── api.js
│   │
│   ├── utils/                  # Utility functions
│   │   ├── intentDetection.js
│   │   └── tableParser.js
│   │
│   └── assets/                # Images, logos
│       ├── lexray-logo.png
│       └── lexray-logo1.png
│
├── index.html                 # HTML template
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── package.json
└── README.md
```

## ✨ Key Features

### 1. **Responsive Design**
- Mobile-friendly layout
- Adaptive sidebar (collapsed/expanded)
- Resizable panels for document/chat view
- Touch-friendly interactions

### 2. **Real-Time Streaming**
- Server-Sent Events (SSE) for live updates
- Chunk-by-chunk text rendering
- Smooth streaming animations
- Error handling and recovery

### 3. **Intent Detection**
- Automatic query intent detection
- Table request detection
- Summary request detection
- Optimized API calls based on intent

### 4. **Table Rendering**
- Structured table display
- Responsive column layout
- Markdown table parsing
- Graceful fallbacks for missing data

### 5. **PDF Viewer**
- High-quality PDF rendering
- Zoom in/out controls
- Page navigation
- Page number display

### 6. **Chat Management**
- Conversation history
- Chat renaming
- Chat deletion
- Search functionality

### 7. **User Experience**
- Optimistic UI updates
- Loading indicators
- Error messages
- Success notifications
- Copy-to-clipboard
- Text improvement feature

### 8. **Authentication Flow**
- Secure JWT token storage
- Protected routes
- Auto-redirect on login/logout
- Email verification
- Password reset flow

## 🎨 Styling

### Tailwind CSS Configuration
- Custom color palette (indigo, purple, slate)
- Custom scrollbar styles
- Animation keyframes (blink, starPulse)
- Responsive breakpoints

### Design System
- **Primary Colors**: Indigo (#6366F1) and Purple (#9333EA)
- **Background**: Gradient backgrounds (indigo-50 to purple-50)
- **Text**: Slate color scale
- **Shadows**: Subtle shadows for depth
- **Borders**: Rounded corners (lg, xl, 2xl)

## 🔒 Security

- **JWT Storage**: localStorage (consider httpOnly cookies for production)
- **Token Validation**: Automatic token validation on protected routes
- **CORS**: Configured for backend API
- **Input Validation**: Client-side form validation
- **XSS Protection**: React's built-in XSS protection

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🐛 Troubleshooting

### Build Issues
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

### API Connection Issues
- Verify `VITE_API_URL` in `.env`
- Check backend server is running
- Verify CORS configuration

### PDF Rendering Issues
- Ensure `react-pdf` is properly installed
- Check PDF file format compatibility
- Verify CORS headers for PDF URLs

## 📝 Development Notes

- **Hot Module Replacement**: Vite HMR for fast development
- **Fast Refresh**: React Fast Refresh enabled
- **Code Splitting**: Automatic code splitting by Vite
- **Tree Shaking**: Unused code elimination in production builds

## 📄 License

ISC
