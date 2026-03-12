import { Link } from 'react-router-dom';
import { FileText, Search, Shield, Zap, ArrowRight, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Github, Youtube } from 'lucide-react';
import DeepDocAILogo from '../components/DeepDocAILogo';
import { isAuthenticated } from '../services/api';

const LandingPage = () => {
  const loggedIn = isAuthenticated();

  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      {/* Navigation */}
      <nav className="bg-white/50 backdrop-blur-md border-2 border-white-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-1 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <DeepDocAILogo size="large" useOriginalLogo={true} />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to={loggedIn ? '/chat' : '/login'}
              className="px-4 py-2 text-slate-700 hover:text-purple-600 transition-colors font-medium"
            >
              Login
            </Link>
            <Link
              to={loggedIn ? '/chat' : '/register'}
              className="px-6 py-2 bg-[#8E84B8] text-white rounded-lg hover:bg-[#7A70A8] transition-all shadow-lg hover:shadow-xl font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            AI-Powered Legal
            <br />
            <span className="bg-gradient-to-r from-[#8E84B8] to-[#6B5FA0] bg-clip-text text-transparent">
              Document Assistant
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Upload legal documents, ask questions, and get instant AI-powered answers. 
            Powered by advanced RAG technology for accurate, context-aware responses.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to={loggedIn ? '/chat' : '/register'}
              className="px-8 py-4 bg-[#8E84B8] text-white rounded-lg hover:bg-[#7A70A8] transition-all shadow-lg hover:shadow-xl font-semibold text-lg flex items-center gap-2 group"
            >
              Get Started Free
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
            <Link
              to={loggedIn ? '/chat' : '/login'}
              className="px-8 py-4 bg-white text-[#8E84B8] rounded-lg hover:bg-[#F4F6FB] transition-all border-2 border-[#8E84B8]/20 font-semibold text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-16 h-16 bg-[#8E84B8]/10 rounded-lg flex items-center justify-center mb-6">
              <FileText className="text-[#8E84B8]" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">1. Upload Document</h3>
            <p className="text-slate-600">
              Upload your legal documents in PDF format. Our system uses OCR to extract text and prepare it for analysis.
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-16 h-16 bg-[#8E84B8]/10 rounded-lg flex items-center justify-center mb-6">
              <Search className="text-[#8E84B8]" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">2. Ask Questions</h3>
            <p className="text-slate-600">
              Ask any question about your document. Our AI uses RAG (Retrieval-Augmented Generation) to find relevant information.
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6">
              <Zap className="text-green-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">3. Get Answers</h3>
            <p className="text-slate-600">
              Receive instant, accurate answers with source citations. All responses are based on your uploaded documents.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[#8E84B8]/10 rounded-lg flex items-center justify-center">
                  <Search className="text-[#8E84B8]" size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">AI Legal Search</h3>
                <p className="text-slate-600">
                  Advanced semantic search powered by vector embeddings to find the most relevant information in your documents.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[#8E84B8]/10 rounded-lg flex items-center justify-center">
                  <Shield className="text-[#8E84B8]" size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Secure Documents</h3>
                <p className="text-slate-600">
                  Your documents are encrypted and stored securely. We never share your data with third parties.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-green-600" size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">OCR Technology</h3>
                <p className="text-slate-600">
                  Extract text from scanned PDFs and images using advanced OCR technology powered by Tesseract.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="text-blue-600" size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">RAG Technology</h3>
                <p className="text-slate-600">
                  Retrieval-Augmented Generation ensures accurate, context-aware responses based on your specific documents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-[#8E84B8] rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-white/80">
            Join thousands of legal professionals using DeepDoc AI to streamline their document analysis.
          </p>
          <Link
            to={loggedIn ? '/chat' : '/register'}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#8E84B8] rounded-lg hover:bg-[#F4F6FB] transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            Create Free Account
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#EAF0F6]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Company Info */}
            <div>
              <div className="mb-6">
                <DeepDocAILogo size="default" showText={true} />
              </div>
              <p className="text-slate-500 mb-6 leading-relaxed">
                AI-powered legal document assistant revolutionizing how legal professionals analyze, search, and understand complex legal documents.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
                  <Facebook size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
                  <Twitter size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
                  <Linkedin size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
                  <Instagram size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
                  <Github size={18} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-[#1E293B]">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    About Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-[#1E293B]">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Case Studies
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                    Webinars
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact & Legal */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-[#1E293B]">Contact & Legal</h3>
              <ul className="space-y-4 mb-6">
                <li className="flex items-start gap-3">
                  <MapPin className="text-[#8E84B8] mt-1 flex-shrink-0" size={18} />
                  <span className="text-slate-500 text-sm">
                    123 Legal Tech Avenue<br />
                    San Francisco, CA 94105<br />
                    United States
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="text-[#8E84B8] flex-shrink-0" size={18} />
                  <a href="mailto:support@DeepDoc AI.com" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
                    support@DeepDoc AI.com
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="text-[#8E84B8] flex-shrink-0" size={18} />
                  <a href="tel:+1-555-123-4567" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
                    +1 (555) 123-4567
                  </a>
                </li>
              </ul>
              <div className="pt-4 border-t border-[#EAF0F6]">
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
                      Cookie Policy
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="border-t border-[#EAF0F6] pt-12 mb-12">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-2xl font-semibold mb-3 text-[#1E293B]">Stay Updated</h3>
              <p className="text-slate-500 mb-6">
                Subscribe to our newsletter for the latest updates, features, and legal tech insights.
              </p>
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-[#F4F6FB] border border-[#EAF0F6] rounded-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#8E84B8] transition-colors"
                />
                <button className="px-6 py-3 bg-[#8E84B8] hover:bg-[#7A70A8] text-white rounded-lg font-semibold transition-colors whitespace-nowrap">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#EAF0F6] pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-sm">
                © {new Date().getFullYear()} DeepDoc AI. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                  Security
                </a>
                <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                  Compliance
                </a>
                <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                  Status
                </a>
                <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
                  Sitemap
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

