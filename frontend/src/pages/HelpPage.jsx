import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, MessageSquare, Upload, Zap, FileText,
  Search, Shield, Keyboard, ExternalLink
} from 'lucide-react';

const SHORTCUTS = [
  { keys: ['Ctrl', 'N'], action: 'New Chat' },
  { keys: ['Ctrl', 'B'], action: 'Toggle Sidebar' },
  { keys: ['Enter'], action: 'Send Message' },
  { keys: ['Ctrl', 'Shift', 'C'], action: 'Copy Last Response' },
];

const FAQ = [
  {
    q: 'How do I upload a document?',
    a: 'Click the "Upload New" button in the top bar or drag and drop a PDF file into the upload zone. We support PDF documents up to 50MB.',
  },
  {
    q: 'What AI models are supported?',
    a: 'DeepDoc AI supports multiple AI providers including Google Gemini, NVIDIA NIM, OpenRouter, and GLM. You can switch models from the chat panel dropdown.',
  },
  {
    q: 'How does citation work?',
    a: 'When the AI references specific parts of your document, it adds inline citations like [Pg. 3]. Click on any citation badge to jump directly to that page in the document viewer.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All documents are encrypted at rest using AES-256 and transmitted over HTTPS. Your documents are private and never shared with third parties.',
  },
  {
    q: 'Can I download the processed document?',
    a: 'Yes! Use the DOWNLOAD button in the document viewer toolbar. You can download as a pixel-perfect PDF or an editable DOCX file.',
  },
];

const FEATURES = [
  { icon: Upload, title: 'Smart Upload', desc: 'Drag & drop PDF processing with OCR and vector embeddings' },
  { icon: MessageSquare, title: 'AI Chat', desc: 'Multi-turn conversations with document context awareness' },
  { icon: Search, title: 'Deep Search', desc: 'Semantic search across all document chunks with RRF ranking' },
  { icon: FileText, title: 'Digital Viewer', desc: 'Pixel-perfect document reconstruction with highlights' },
  { icon: Zap, title: 'Multi-Model', desc: 'Switch between Gemini, NVIDIA, OpenRouter and more' },
  { icon: Shield, title: 'Secure', desc: 'End-to-end encryption with private document isolation' },
];

const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-4 px-6 py-4 bg-white border-b border-[#EAF0F6]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[rgba(142,132,184,0.08)] transition-colors"
        >
          <ArrowLeft size={20} style={{ color: '#64748B' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B' }}>Help & Documentation</h1>
          <p className="text-xs" style={{ color: '#94A3B8' }}>Learn how to use DeepDoc AI effectively</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Features Grid */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
              <Zap size={20} style={{ color: '#8E84B8' }} />
              Platform Features
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-[#EAF0F6] bg-white hover:shadow-lg hover:shadow-[rgba(142,132,184,0.1)] transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[rgba(142,132,184,0.1)] flex items-center justify-center mb-3 group-hover:bg-[#8E84B8] transition-colors">
                    <f.icon size={18} style={{ color: '#8E84B8' }} className="group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#1E293B' }}>{f.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
              <BookOpen size={20} style={{ color: '#8E84B8' }} />
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-[#EAF0F6] bg-white overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-[rgba(142,132,184,0.04)] transition-colors">
                    <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{item.q}</span>
                    <ChevronIcon />
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
              <Keyboard size={20} style={{ color: '#8E84B8' }} />
              Keyboard Shortcuts
            </h2>
            <div className="rounded-2xl border border-[#EAF0F6] bg-white overflow-hidden">
              {SHORTCUTS.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3.5 ${
                    i !== SHORTCUTS.length - 1 ? 'border-b border-[#EAF0F6]' : ''
                  }`}
                >
                  <span className="text-sm" style={{ color: '#64748B' }}>{s.action}</span>
                  <div className="flex items-center gap-1.5">
                    {s.keys.map((key, ki) => (
                      <kbd
                        key={ki}
                        className="px-2 py-1 text-xs font-mono font-bold rounded-lg border border-[#EAF0F6] bg-[#F8FAFC] shadow-sm"
                        style={{ color: '#1E293B' }}
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-[#EAF0F6] bg-white p-6 text-center">
            <p className="text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>Need more help?</p>
            <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>
              Reach out to our support team for personalized assistance.
            </p>
            <a
              href="mailto:support@deepdocai.com"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: '#8E84B8' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A70A8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8E84B8'}
            >
              <ExternalLink size={14} />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChevronIcon = () => (
  <svg
    className="w-4 h-4 transition-transform group-open:rotate-180"
    style={{ color: '#94A3B8' }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export default HelpPage;
