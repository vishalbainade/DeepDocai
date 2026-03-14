// import { Link } from 'react-router-dom';
// import { FileText, Search, Shield, Zap, ArrowRight, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Github, Youtube } from 'lucide-react';
// import DeepDocAILogo from '../components/DeepDocAILogo';
// import { isAuthenticated } from '../services/api';

// const LandingPage = () => {
//   const loggedIn = isAuthenticated();

//   return (
//     <div className="min-h-screen bg-[#F4F6FB]">
//       {/* Navigation */}
//       <nav className="bg-white/50 backdrop-blur-md border-2 border-white-700 sticky top-0 z-50">
//         <div className="max-w-5xl mx-auto px-4 py-1 flex items-center justify-between">
//           <Link to="/" className="flex items-center gap-2">
//             <DeepDocAILogo size="large" useOriginalLogo={true} />
//           </Link>
//           <div className="flex items-center gap-4">
//             <Link
//               to={loggedIn ? '/chat' : '/login'}
//               className="px-4 py-2 text-slate-700 hover:text-purple-600 transition-colors font-medium"
//             >
//               Login
//             </Link>
//             <Link
//               to={loggedIn ? '/chat' : '/register'}
//               className="px-6 py-2 bg-[#8E84B8] text-white rounded-lg hover:bg-[#7A70A8] transition-all shadow-lg hover:shadow-xl font-medium"
//             >
//               Get Started
//             </Link>
//           </div>
//         </div>
//       </nav>

//       {/* Hero Section */}
//       <section className="max-w-7xl mx-auto px-6 py-20 text-center">
//         <div className="animate-fade-in">
//           <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
//             AI-Powered Legal
//             <br />
//             <span className="bg-gradient-to-r from-[#8E84B8] to-[#6B5FA0] bg-clip-text text-transparent">
//               Document Assistant
//             </span>
//           </h1>
//           <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
//             Upload legal documents, ask questions, and get instant AI-powered answers. 
//             Powered by advanced RAG technology for accurate, context-aware responses.
//           </p>
//           <div className="flex items-center justify-center gap-4 flex-wrap">
//             <Link
//               to={loggedIn ? '/chat' : '/register'}
//               className="px-8 py-4 bg-[#8E84B8] text-white rounded-lg hover:bg-[#7A70A8] transition-all shadow-lg hover:shadow-xl font-semibold text-lg flex items-center gap-2 group"
//             >
//               Get Started Free
//               <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
//             </Link>
//             <Link
//               to={loggedIn ? '/chat' : '/login'}
//               className="px-8 py-4 bg-white text-[#8E84B8] rounded-lg hover:bg-[#F4F6FB] transition-all border-2 border-[#8E84B8]/20 font-semibold text-lg"
//             >
//               Sign In
//             </Link>
//           </div>
//         </div>
//       </section>

//       {/* How It Works */}
//       <section className="max-w-7xl mx-auto px-6 py-20">
//         <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
//           How It Works
//         </h2>
//         <div className="grid md:grid-cols-3 gap-8">
//           <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
//             <div className="w-16 h-16 bg-[#8E84B8]/10 rounded-lg flex items-center justify-center mb-6">
//               <FileText className="text-[#8E84B8]" size={32} />
//             </div>
//             <h3 className="text-xl font-bold text-slate-900 mb-3">1. Upload Document</h3>
//             <p className="text-slate-600">
//               Upload your legal documents in PDF format. Our system uses OCR to extract text and prepare it for analysis.
//             </p>
//           </div>
//           <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
//             <div className="w-16 h-16 bg-[#8E84B8]/10 rounded-lg flex items-center justify-center mb-6">
//               <Search className="text-[#8E84B8]" size={32} />
//             </div>
//             <h3 className="text-xl font-bold text-slate-900 mb-3">2. Ask Questions</h3>
//             <p className="text-slate-600">
//               Ask any question about your document. Our AI uses RAG (Retrieval-Augmented Generation) to find relevant information.
//             </p>
//           </div>
//           <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
//             <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6">
//               <Zap className="text-green-600" size={32} />
//             </div>
//             <h3 className="text-xl font-bold text-slate-900 mb-3">3. Get Answers</h3>
//             <p className="text-slate-600">
//               Receive instant, accurate answers with source citations. All responses are based on your uploaded documents.
//             </p>
//           </div>
//         </div>
//       </section>

//       {/* Features */}
//       <section className="bg-white py-20">
//         <div className="max-w-7xl mx-auto px-6">
//           <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
//             Powerful Features
//           </h2>
//           <div className="grid md:grid-cols-2 gap-8">
//             <div className="flex gap-4">
//               <div className="flex-shrink-0">
//                 <div className="w-12 h-12 bg-[#8E84B8]/10 rounded-lg flex items-center justify-center">
//                   <Search className="text-[#8E84B8]" size={24} />
//                 </div>
//               </div>
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900 mb-2">AI Legal Search</h3>
//                 <p className="text-slate-600">
//                   Advanced semantic search powered by vector embeddings to find the most relevant information in your documents.
//                 </p>
//               </div>
//             </div>
//             <div className="flex gap-4">
//               <div className="flex-shrink-0">
//                 <div className="w-12 h-12 bg-[#8E84B8]/10 rounded-lg flex items-center justify-center">
//                   <Shield className="text-[#8E84B8]" size={24} />
//                 </div>
//               </div>
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900 mb-2">Secure Documents</h3>
//                 <p className="text-slate-600">
//                   Your documents are encrypted and stored securely. We never share your data with third parties.
//                 </p>
//               </div>
//             </div>
//             <div className="flex gap-4">
//               <div className="flex-shrink-0">
//                 <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//                   <FileText className="text-green-600" size={24} />
//                 </div>
//               </div>
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900 mb-2">OCR Technology</h3>
//                 <p className="text-slate-600">
//                   Extract text from scanned PDFs and images using advanced OCR technology powered by Tesseract.
//                 </p>
//               </div>
//             </div>
//             <div className="flex gap-4">
//               <div className="flex-shrink-0">
//                 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                   <Zap className="text-blue-600" size={24} />
//                 </div>
//               </div>
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900 mb-2">RAG Technology</h3>
//                 <p className="text-slate-600">
//                   Retrieval-Augmented Generation ensures accurate, context-aware responses based on your specific documents.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section className="max-w-7xl mx-auto px-6 py-20">
//         <div className="bg-[#8E84B8] rounded-2xl p-12 text-center text-white">
//           <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
//           <p className="text-xl mb-8 text-white/80">
//             Join thousands of legal professionals using DeepDoc AI to streamline their document analysis.
//           </p>
//           <Link
//             to={loggedIn ? '/chat' : '/register'}
//             className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#8E84B8] rounded-lg hover:bg-[#F4F6FB] transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
//           >
//             Create Free Account
//             <ArrowRight size={20} />
//           </Link>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="bg-white border-t border-[#EAF0F6]">
//         <div className="max-w-7xl mx-auto px-6 py-16">
//           {/* Main Footer Content */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
//             {/* Company Info */}
//             <div>
//               <div className="mb-6">
//                 <DeepDocAILogo size="default" showText={true} />
//               </div>
//               <p className="text-slate-500 mb-6 leading-relaxed">
//                 AI-powered legal document assistant revolutionizing how legal professionals analyze, search, and understand complex legal documents.
//               </p>
//               <div className="flex gap-4">
//                 <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
//                   <Facebook size={18} />
//                 </a>
//                 <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
//                   <Twitter size={18} />
//                 </a>
//                 <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
//                   <Linkedin size={18} />
//                 </a>
//                 <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
//                   <Instagram size={18} />
//                 </a>
//                 <a href="#" className="w-10 h-10 bg-[#F4F6FB] rounded-lg flex items-center justify-center hover:bg-[#8E84B8] hover:text-white text-slate-500 transition-colors">
//                   <Github size={18} />
//                 </a>
//               </div>
//             </div>

//             {/* Quick Links */}
//             <div>
//               <h3 className="text-lg font-semibold mb-6 text-[#1E293B]">Quick Links</h3>
//               <ul className="space-y-3">
//                 <li>
//                   <Link to="/" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Home
//                   </Link>
//                 </li>
//                 <li>
//                   <Link to="/register" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Get Started
//                   </Link>
//                 </li>
//                 <li>
//                   <Link to="/login" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Sign In
//                   </Link>
//                 </li>
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Features
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Pricing
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     About Us
//                   </a>
//                 </li>
//               </ul>
//             </div>

//             {/* Resources */}
//             <div>
//               <h3 className="text-lg font-semibold mb-6 text-[#1E293B]">Resources</h3>
//               <ul className="space-y-3">
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Documentation
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     API Reference
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Help Center
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Blog
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Case Studies
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                     Webinars
//                   </a>
//                 </li>
//               </ul>
//             </div>

//             {/* Contact & Legal */}
//             <div>
//               <h3 className="text-lg font-semibold mb-6 text-[#1E293B]">Contact & Legal</h3>
//               <ul className="space-y-4 mb-6">
//                 <li className="flex items-start gap-3">
//                   <MapPin className="text-[#8E84B8] mt-1 flex-shrink-0" size={18} />
//                   <span className="text-slate-500 text-sm">
//                     123 Legal Tech Avenue<br />
//                     San Francisco, CA 94105<br />
//                     United States
//                   </span>
//                 </li>
//                 <li className="flex items-center gap-3">
//                   <Mail className="text-[#8E84B8] flex-shrink-0" size={18} />
//                   <a href="mailto:support@DeepDoc AI.com" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
//                     support@DeepDoc AI.com
//                   </a>
//                 </li>
//                 <li className="flex items-center gap-3">
//                   <Phone className="text-[#8E84B8] flex-shrink-0" size={18} />
//                   <a href="tel:+1-555-123-4567" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
//                     +1 (555) 123-4567
//                   </a>
//                 </li>
//               </ul>
//               <div className="pt-4 border-t border-[#EAF0F6]">
//                 <ul className="space-y-2">
//                   <li>
//                     <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
//                       Privacy Policy
//                     </a>
//                   </li>
//                   <li>
//                     <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
//                       Terms of Service
//                     </a>
//                   </li>
//                   <li>
//                     <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors text-sm">
//                       Cookie Policy
//                     </a>
//                   </li>
//                 </ul>
//               </div>
//             </div>
//           </div>

//           {/* Newsletter Section */}
//           <div className="border-t border-[#EAF0F6] pt-12 mb-12">
//             <div className="max-w-2xl mx-auto text-center">
//               <h3 className="text-2xl font-semibold mb-3 text-[#1E293B]">Stay Updated</h3>
//               <p className="text-slate-500 mb-6">
//                 Subscribe to our newsletter for the latest updates, features, and legal tech insights.
//               </p>
//               <div className="flex gap-3 max-w-md mx-auto">
//                 <input
//                   type="email"
//                   placeholder="Enter your email"
//                   className="flex-1 px-4 py-3 bg-[#F4F6FB] border border-[#EAF0F6] rounded-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#8E84B8] transition-colors"
//                 />
//                 <button className="px-6 py-3 bg-[#8E84B8] hover:bg-[#7A70A8] text-white rounded-lg font-semibold transition-colors whitespace-nowrap">
//                   Subscribe
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Bottom Bar */}
//           <div className="border-t border-[#EAF0F6] pt-8">
//             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
//               <p className="text-slate-500 text-sm">
//                 © {new Date().getFullYear()} DeepDoc AI. All rights reserved.
//               </p>
//               <div className="flex items-center gap-6 text-sm">
//                 <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                   Security
//                 </a>
//                 <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                   Compliance
//                 </a>
//                 <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                   Status
//                 </a>
//                 <a href="#" className="text-slate-500 hover:text-[#8E84B8] transition-colors">
//                   Sitemap
//                 </a>
//               </div>
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default LandingPage;


import { Link } from 'react-router-dom';
import { FileText, Search, Shield, Zap, ArrowRight, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Github } from 'lucide-react';
import DeepDocAILogo from '../components/DeepDocAILogo';
import { isAuthenticated } from '../services/api';

const LandingPage = () => {
  const loggedIn = isAuthenticated();

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Serif:ital@0;1&family=Figtree:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink: #1A1035;
          --ink2: #3D2F6A;
          --accent: #6C3EF4;
          --accent2: #A855F7;
          --accent3: #EC4899;
          --gold: #F59E0B;
          --mint: #10B981;
          --sky: #0EA5E9;
          --bg: #FAFAFE;
          --bg2: #F3F0FF;
          --card: #FFFFFF;
          --border: rgba(108,62,244,0.12);
          --shadow: 0 4px 32px rgba(108,62,244,0.10);
          --shadow-lg: 0 16px 64px rgba(108,62,244,0.18);
        }

        .ll { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--ink); overflow-x: hidden; }

        /* NAV */
        .ll-nav {
          position: sticky; top: 0; z-index: 200;
          background: rgba(250,250,254,0.82);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border);
        }
        .ll-nav-inner {
          max-width: 1160px; margin: 0 auto; padding: 0 2rem;
          height: 66px; display: flex; align-items: center; justify-content: space-between;
        }
        .nav-btn-ghost {
          padding: 8px 22px; border-radius: 10px;
          border: 1.5px solid rgba(108,62,244,0.22);
          background: transparent; color: var(--accent);
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 600;
          text-decoration: none; cursor: pointer;
          transition: all 0.2s ease; letter-spacing: 0.2px;
        }
        .nav-btn-ghost:hover { background: rgba(108,62,244,0.06); border-color: var(--accent); }
        .nav-btn-fill {
          padding: 9px 24px; border-radius: 10px;
          background: var(--accent); color: #fff; border: none;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          text-decoration: none; cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 18px rgba(108,62,244,0.38); letter-spacing: 0.2px;
        }
        .nav-btn-fill:hover { background: #5A2EE8; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(108,62,244,0.48); }

        /* HERO */
        .ll-hero {
          position: relative; overflow: hidden;
          min-height: 96vh;
          display: flex; align-items: center;
          padding: 80px 2rem 60px;
        }
        .hero-mesh {
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 70% 55% at 15% 20%, rgba(168,85,247,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 55% 50% at 85% 15%, rgba(14,165,233,0.15) 0%, transparent 55%),
            radial-gradient(ellipse 50% 60% at 70% 80%, rgba(108,62,244,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 30% 85%, rgba(236,72,153,0.1) 0%, transparent 50%),
            #FAFAFE;
          animation: meshShift 12s ease-in-out infinite alternate;
        }
        @keyframes meshShift {
          0%   { filter: hue-rotate(0deg) brightness(1); }
          100% { filter: hue-rotate(15deg) brightness(1.02); }
        }
        .orb { position: absolute; border-radius: 50%; pointer-events: none; }
        .orb-1 {
          width: 420px; height: 420px; top: -120px; right: -80px;
          background: radial-gradient(circle, rgba(168,85,247,0.22) 0%, transparent 70%);
          animation: floatOrb1 8s ease-in-out infinite;
        }
        .orb-2 {
          width: 300px; height: 300px; bottom: 40px; left: -60px;
          background: radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 70%);
          animation: floatOrb2 10s ease-in-out infinite;
        }
        .orb-3 {
          width: 220px; height: 220px; top: 30%; right: 20%;
          background: radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%);
          animation: floatOrb3 7s ease-in-out infinite;
        }
        @keyframes floatOrb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,40px) scale(1.06)} }
        @keyframes floatOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-30px) scale(1.04)} }
        @keyframes floatOrb3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-15px,20px) scale(1.08)} }
        .hero-dots {
          position: absolute; inset: 0; z-index: 0;
          background-image: radial-gradient(circle, rgba(108,62,244,0.18) 1px, transparent 1px);
          background-size: 36px 36px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }
        .hero-inner {
          position: relative; z-index: 1;
          max-width: 1160px; margin: 0 auto; width: 100%;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 64px; align-items: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, rgba(108,62,244,0.1), rgba(168,85,247,0.08));
          border: 1.5px solid rgba(108,62,244,0.22);
          border-radius: 100px; padding: 6px 16px 6px 10px;
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase; color: var(--accent);
          margin-bottom: 24px; width: fit-content;
        }
        .badge-pip {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--mint); box-shadow: 0 0 10px var(--mint);
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1;box-shadow:0 0 10px var(--mint)} 50%{opacity:0.4;box-shadow:0 0 4px var(--mint)} }
        .hero-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(44px, 5.5vw, 74px);
          font-weight: 400; line-height: 1.07; color: var(--ink);
          margin-bottom: 24px; letter-spacing: -1.5px;
        }
        .hero-title em {
          font-style: italic;
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 50%, var(--accent3) 100%);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          font-size: 17px; line-height: 1.75; color: rgba(26,16,53,0.58);
          margin-bottom: 40px; font-weight: 400; max-width: 460px;
        }
        .hero-cta-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .btn-hero-main {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 15px 36px; border-radius: 14px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #fff; border: none;
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
          text-decoration: none; cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 28px rgba(108,62,244,0.38), inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .btn-hero-main:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 16px 48px rgba(108,62,244,0.48), inset 0 1px 0 rgba(255,255,255,0.18); }
        .btn-hero-main svg { transition: transform 0.2s; }
        .btn-hero-main:hover svg { transform: translateX(5px); }
        .btn-hero-alt {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 15px 30px; border-radius: 14px;
          background: white; color: var(--ink);
          border: 1.5px solid rgba(26,16,53,0.12);
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 600;
          text-decoration: none; cursor: pointer;
          transition: all 0.25s; box-shadow: 0 2px 12px rgba(0,0,0,0.07);
        }
        .btn-hero-alt:hover { border-color: var(--accent); color: var(--accent); box-shadow: 0 4px 20px rgba(108,62,244,0.14); }

        /* 3D HERO CARD */
        .hero-visual {
          perspective: 900px;
          display: flex; align-items: center; justify-content: center;
          position: relative; height: 480px;
        }
        .card-3d-scene {
          position: relative; width: 340px; height: 420px;
          transform-style: preserve-3d;
          animation: sceneFloat 6s ease-in-out infinite;
        }
        @keyframes sceneFloat {
          0%,100% { transform: rotateX(8deg) rotateY(-12deg) translateY(0); }
          33%      { transform: rotateX(4deg) rotateY(-8deg) translateY(-18px); }
          66%      { transform: rotateX(10deg) rotateY(-16deg) translateY(-8px); }
        }
        .main-card-3d {
          position: absolute; inset: 0; background: white; border-radius: 24px;
          box-shadow: 0 2px 0 rgba(108,62,244,0.08), 0 8px 32px rgba(108,62,244,0.14), 0 32px 80px rgba(108,62,244,0.12);
          border: 1px solid rgba(108,62,244,0.1); overflow: hidden;
        }
        .card-3d-header {
          background: linear-gradient(135deg, #6C3EF4 0%, #A855F7 60%, #EC4899 100%);
          padding: 28px 28px 22px; position: relative; overflow: hidden;
        }
        .card-3d-header::after {
          content: ''; position: absolute; top: -40%; right: -20%;
          width: 180px; height: 180px; border-radius: 50%;
          background: rgba(255,255,255,0.12);
        }
        .card-3d-htag { color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; }
        .card-3d-fname { color: #fff; font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; }
        .card-3d-body { padding: 24px 28px; }
        .card-3d-query {
          background: var(--bg2); border-radius: 12px; padding: 14px 16px;
          margin-bottom: 16px; font-size: 14px; color: var(--ink);
          border-left: 3px solid var(--accent); line-height: 1.5;
        }
        .card-3d-answer { font-size: 13px; line-height: 1.7; color: rgba(26,16,53,0.65); margin-bottom: 16px; }
        .card-3d-src {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
          border-radius: 8px; padding: 5px 12px;
          font-size: 12px; color: var(--mint); font-weight: 600;
        }
        .typing-cursor {
          display: inline-block; width: 2px; height: 14px;
          background: var(--accent); margin-left: 2px; vertical-align: middle;
          animation: blink-cursor 1.1s step-end infinite;
        }
        @keyframes blink-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        .mini-card {
          position: absolute; background: white; border-radius: 16px;
          box-shadow: 0 8px 32px rgba(108,62,244,0.18), 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid rgba(108,62,244,0.1);
          padding: 14px 18px; display: flex; align-items: center; gap: 12px;
          font-size: 13px; font-weight: 600; color: var(--ink);
          white-space: nowrap; transform-style: preserve-3d; z-index: 10;
        }
        .mc-sub { font-size: 11px; color: rgba(26,16,53,0.45); font-weight: 400; }
        .mc-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .mini-card-1 { top: -28px; right: -60px; animation: miniFloat1 5s ease-in-out infinite; }
        .mini-card-2 { bottom: 60px; right: -72px; animation: miniFloat2 6s ease-in-out infinite; }
        .mini-card-3 { bottom: -20px; left: -56px; animation: miniFloat3 7s ease-in-out infinite; }
        @keyframes miniFloat1 { 0%,100%{transform:translateZ(60px) translateY(0) rotate(-3deg)} 50%{transform:translateZ(60px) translateY(-12px) rotate(-1deg)} }
        @keyframes miniFloat2 { 0%,100%{transform:translateZ(50px) translateY(0) rotate(2deg)} 50%{transform:translateZ(50px) translateY(-16px) rotate(4deg)} }
        @keyframes miniFloat3 { 0%,100%{transform:translateZ(70px) translateY(0) rotate(-2deg)} 50%{transform:translateZ(70px) translateY(-10px) rotate(0deg)} }

        /* STATS */
        .stats-band { background: white; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .stats-inner {
          max-width: 1160px; margin: 0 auto; padding: 0 2rem;
          display: grid; grid-template-columns: repeat(4, 1fr);
        }
        .stat-cell { padding: 44px 24px; text-align: center; position: relative; }
        .stat-cell + .stat-cell::before { content: ''; position: absolute; left: 0; top: 25%; bottom: 25%; width: 1px; background: var(--border); }
        .stat-num {
          font-family: 'Instrument Serif', serif; font-size: 48px; line-height: 1;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }
        .stat-label { font-size: 13px; color: rgba(26,16,53,0.45); font-weight: 500; }

        /* SECTION */
        .sec { max-width: 1160px; margin: 0 auto; padding: 110px 2rem; }
        .sec-eyebrow {
          text-align: center; font-family: 'Syne', sans-serif;
          font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
          color: var(--accent); margin-bottom: 14px;
        }
        .sec-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(34px, 4vw, 56px); font-weight: 400;
          text-align: center; color: var(--ink);
          line-height: 1.15; letter-spacing: -0.8px; margin-bottom: 14px;
        }
        .sec-sub {
          text-align: center; color: rgba(26,16,53,0.5);
          font-size: 16px; max-width: 480px;
          margin: 0 auto 64px; line-height: 1.75;
        }

        /* STEPS */
        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .step-card-inner {
          background: white; border-radius: 24px;
          border: 1.5px solid rgba(108,62,244,0.1);
          padding: 44px 36px;
          box-shadow: 0 4px 24px rgba(108,62,244,0.08), 0 1px 4px rgba(0,0,0,0.04);
          position: relative; overflow: hidden;
          transition: transform 0.4s cubic-bezier(.23,1,.32,1), box-shadow 0.4s ease;
          transform: translateZ(0);
        }
        .step-card-inner:hover {
          transform: translateY(-8px) rotateX(4deg) rotateY(-2deg) scale(1.02);
          box-shadow: 0 24px 64px rgba(108,62,244,0.2), 0 8px 20px rgba(108,62,244,0.1);
        }
        .step-glow {
          position: absolute; top: -60px; right: -60px;
          width: 200px; height: 200px; border-radius: 50%;
          opacity: 0; transition: opacity 0.4s; pointer-events: none;
        }
        .step-card-inner:hover .step-glow { opacity: 1; }
        .sg-purple { background: radial-gradient(circle, rgba(108,62,244,0.15) 0%, transparent 70%); }
        .sg-sky    { background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%); }
        .sg-mint   { background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%); }
        .step-num-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #fff; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800;
          margin-bottom: 24px; box-shadow: 0 4px 14px rgba(108,62,244,0.35);
        }
        .s2 { background: linear-gradient(135deg, var(--sky), #38BDF8) !important; box-shadow: 0 4px 14px rgba(14,165,233,0.35) !important; }
        .s3 { background: linear-gradient(135deg, var(--mint), #34D399) !important; box-shadow: 0 4px 14px rgba(16,185,129,0.35) !important; }
        .step-icon-3d {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 22px; position: relative; z-index: 1;
          transition: transform 0.4s cubic-bezier(.23,1,.32,1);
        }
        .step-card-inner:hover .step-icon-3d { transform: translateY(-4px) rotateZ(-8deg) scale(1.12); }
        .si-p { background: rgba(108,62,244,0.1); color: var(--accent); }
        .si-s { background: rgba(14,165,233,0.1); color: var(--sky); }
        .si-m { background: rgba(16,185,129,0.1); color: var(--mint); }
        .step-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: var(--ink); margin-bottom: 12px; }
        .step-desc { font-size: 14px; line-height: 1.8; color: rgba(26,16,53,0.55); }

        /* BENTO FEATURES */
        .features-bg {
          background: linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%);
          border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        }
        .bento { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: auto auto; gap: 20px; }
        .bento-card {
          background: white; border-radius: 24px;
          border: 1.5px solid rgba(108,62,244,0.08);
          padding: 40px 36px;
          box-shadow: 0 2px 16px rgba(108,62,244,0.06);
          transition: all 0.35s cubic-bezier(.23,1,.32,1);
          position: relative; overflow: hidden; cursor: default;
        }
        .bento-card:hover {
          transform: translateY(-5px) scale(1.01);
          box-shadow: 0 20px 60px rgba(108,62,244,0.15);
          border-color: rgba(108,62,244,0.2);
        }
        .bento-wide { grid-column: span 2; }
        .bento-tall { grid-row: span 2; }
        .bento-icon {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 22px;
          transition: transform 0.4s cubic-bezier(.23,1,.32,1);
        }
        .bento-card:hover .bento-icon { transform: translateY(-4px) rotate(-8deg) scale(1.12); }
        .bi-v { background: linear-gradient(135deg, rgba(108,62,244,0.15), rgba(168,85,247,0.08)); color: var(--accent); }
        .bi-g { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.08)); color: var(--mint); }
        .bi-b { background: linear-gradient(135deg, rgba(14,165,233,0.15), rgba(56,189,248,0.08)); color: var(--sky); }
        .bi-r { background: linear-gradient(135deg, rgba(236,72,153,0.15), rgba(244,114,182,0.08)); color: var(--accent3); }
        .bento-title { font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 700; color: var(--ink); margin-bottom: 12px; }
        .bento-desc { font-size: 14px; line-height: 1.8; color: rgba(26,16,53,0.52); }
        .bento-accent-bar {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 3px; border-radius: 0 0 24px 24px;
          opacity: 0; transition: opacity 0.3s;
        }
        .bento-card:hover .bento-accent-bar { opacity: 1; }
        .ba-v { background: linear-gradient(90deg, var(--accent), var(--accent2)); }
        .ba-g { background: linear-gradient(90deg, var(--mint), #34D399); }
        .ba-b { background: linear-gradient(90deg, var(--sky), #38BDF8); }
        .ba-r { background: linear-gradient(90deg, var(--accent3), #F472B6); }

        /* Bar chart animation */
        .mini-bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 64px; margin-top: 24px; }
        .mbar {
          flex: 1; border-radius: 6px 6px 0 0;
          background: linear-gradient(180deg, var(--accent), var(--accent2));
          opacity: 0.7; transform-origin: bottom;
          animation: barGrow 1.4s cubic-bezier(.23,1,.32,1) forwards;
        }
        @keyframes barGrow { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        .mbar:nth-child(1){height:40%;animation-delay:0.05s}
        .mbar:nth-child(2){height:70%;animation-delay:0.1s}
        .mbar:nth-child(3){height:55%;animation-delay:0.15s}
        .mbar:nth-child(4){height:90%;animation-delay:0.2s}
        .mbar:nth-child(5){height:65%;animation-delay:0.25s}
        .mbar:nth-child(6){height:80%;animation-delay:0.3s}
        .mbar:nth-child(7){height:100%;animation-delay:0.35s;opacity:1}
        .mbar:nth-child(8){height:75%;animation-delay:0.4s}

        /* 3D spinning cube */
        .cube-scene {
          perspective: 600px; width: 100%; display: flex; justify-content: center; padding: 32px 0;
        }
        .cube {
          width: 96px; height: 96px; position: relative;
          transform-style: preserve-3d;
          animation: spinCube 8s linear infinite;
        }
        @keyframes spinCube { 0%{transform:rotateX(20deg) rotateY(0deg)} 100%{transform:rotateX(20deg) rotateY(360deg)} }
        .cube-face {
          position: absolute; width: 96px; height: 96px;
          border-radius: 12px; opacity: 0.9;
          display: flex; align-items: center; justify-content: center; font-size: 28px;
        }
        .cf-front  { background: linear-gradient(135deg,#7C3AED,#A855F7); transform: rotateY(0deg)   translateZ(48px); }
        .cf-back   { background: linear-gradient(135deg,#0EA5E9,#38BDF8); transform: rotateY(180deg) translateZ(48px); }
        .cf-right  { background: linear-gradient(135deg,#EC4899,#F472B6); transform: rotateY(90deg)  translateZ(48px); }
        .cf-left   { background: linear-gradient(135deg,#10B981,#34D399); transform: rotateY(-90deg) translateZ(48px); }
        .cf-top    { background: linear-gradient(135deg,#F59E0B,#FCD34D); transform: rotateX(90deg)  translateZ(48px); }
        .cf-bottom { background: linear-gradient(135deg,#6366F1,#818CF8); transform: rotateX(-90deg) translateZ(48px); }

        /* CTA */
        .cta-sec { padding: 100px 2rem; background: var(--bg); }
        .cta-card-wrap { max-width: 1160px; margin: 0 auto; }
        .cta-card {
          position: relative; overflow: hidden; border-radius: 32px;
          background: linear-gradient(135deg, #EDE9FE 0%, #F3E8FF 35%, #FCE7F3 65%, #E0F2FE 100%);
          border: 1.5px solid rgba(108,62,244,0.18);
          padding: 88px 64px; text-align: center;
          box-shadow: 0 32px 80px rgba(108,62,244,0.15);
        }
        .cta-sparkle {
          position: absolute; pointer-events: none;
          animation: sparkleFloat 4s ease-in-out infinite;
        }
        .sp1 { top: 12%; left: 8%; font-size: 32px; animation-delay: 0s; }
        .sp2 { top: 20%; right: 10%; font-size: 24px; animation-delay: 0.7s; }
        .sp3 { bottom: 15%; left: 12%; font-size: 20px; animation-delay: 1.4s; }
        .sp4 { bottom: 20%; right: 8%; font-size: 28px; animation-delay: 2.1s; }
        @keyframes sparkleFloat {
          0%,100%{transform:translateY(0) rotate(0deg);opacity:0.6}
          50%{transform:translateY(-20px) rotate(15deg);opacity:1}
        }
        .cta-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(38px, 5vw, 64px); font-weight: 400;
          color: var(--ink); line-height: 1.1; letter-spacing: -1px; margin-bottom: 18px;
        }
        .cta-title em { font-style: italic; color: var(--accent); }
        .cta-sub { font-size: 18px; color: rgba(26,16,53,0.6); max-width: 480px; margin: 0 auto 44px; line-height: 1.7; }
        .btn-cta-main {
          display: inline-flex; align-items: center; gap: 12px;
          padding: 18px 48px; border-radius: 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #fff; border: none;
          font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700;
          text-decoration: none; cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 8px 32px rgba(108,62,244,0.38), inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .btn-cta-main:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 18px 52px rgba(108,62,244,0.48); }

        /* FOOTER */
        .ll-footer { background: #FBF9FF; border-top: 1px solid var(--border); padding: 80px 2rem 0; }
        .footer-grid {
          max-width: 1160px; margin: 0 auto;
          display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 48px; padding-bottom: 64px;
        }
        .footer-brand-p { font-size: 14px; line-height: 1.8; color: rgba(26,16,53,0.45); margin: 18px 0 26px; }
        .socials { display: flex; gap: 8px; }
        .soc-btn {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(108,62,244,0.06); border: 1px solid rgba(108,62,244,0.1);
          display: flex; align-items: center; justify-content: center;
          color: rgba(26,16,53,0.4); text-decoration: none; transition: all 0.2s;
        }
        .soc-btn:hover { background: var(--accent); border-color: var(--accent); color: #fff; transform: translateY(-2px); }
        .f-col-title {
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 800;
          letter-spacing: 2.5px; text-transform: uppercase;
          color: rgba(26,16,53,0.4); margin-bottom: 22px;
        }
        .f-links { list-style: none; }
        .f-links li { margin-bottom: 11px; }
        .f-links a { font-size: 14px; color: rgba(26,16,53,0.5); text-decoration: none; transition: color 0.2s; }
        .f-links a:hover { color: var(--accent); }
        .contact-row { display: flex; gap: 10px; margin-bottom: 12px; align-items: flex-start; font-size: 13px; color: rgba(26,16,53,0.45); line-height: 1.6; }
        .contact-row svg { color: var(--accent); flex-shrink: 0; margin-top: 1px; }
        .newsletter-row {
          max-width: 1160px; margin: 0 auto;
          border-top: 1px solid var(--border); padding: 48px 0;
          display: flex; align-items: center; justify-content: space-between;
          gap: 32px; flex-wrap: wrap;
        }
        .nl-text h4 { font-family: 'Instrument Serif', serif; font-size: 22px; color: var(--ink); margin-bottom: 4px; }
        .nl-text p { font-size: 14px; color: rgba(26,16,53,0.45); }
        .nl-form {
          display: flex; background: white;
          border: 1.5px solid rgba(108,62,244,0.14); border-radius: 14px; overflow: hidden;
          box-shadow: 0 2px 16px rgba(108,62,244,0.07); min-width: 340px;
        }
        .nl-form input { flex: 1; padding: 13px 18px; border: none; outline: none; font-family: 'Figtree', sans-serif; font-size: 14px; color: var(--ink); background: transparent; }
        .nl-form input::placeholder { color: rgba(26,16,53,0.3); }
        .nl-form button { padding: 13px 24px; background: var(--accent); color: #fff; border: none; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        .nl-form button:hover { background: #5A2EE8; }
        .footer-bottom {
          max-width: 1160px; margin: 0 auto;
          border-top: 1px solid var(--border); padding: 24px 0 36px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .footer-copy { font-size: 13px; color: rgba(26,16,53,0.3); }
        .footer-btm-links { display: flex; gap: 22px; }
        .footer-btm-links a { font-size: 12px; color: rgba(26,16,53,0.3); text-decoration: none; transition: color 0.2s; }
        .footer-btm-links a:hover { color: var(--accent); }

        @media (max-width: 960px) {
          .hero-inner { grid-template-columns: 1fr; }
          .hero-visual { display: none; }
          .steps-grid { grid-template-columns: 1fr; }
          .bento { grid-template-columns: 1fr; }
          .bento-wide, .bento-tall { grid-column: span 1; grid-row: span 1; }
          .stats-inner { grid-template-columns: repeat(2,1fr); }
          .footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .stats-inner { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: 1fr; }
          .newsletter-row { flex-direction: column; align-items: flex-start; }
          .nl-form { min-width: unset; width: 100%; }
          .cta-card { padding: 56px 28px; }
        }
      `}</style>

      <div className="ll">

        {/* NAV */}
        <nav className="ll-nav">
          <div className="ll-nav-inner">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <DeepDocAILogo size="large" useOriginalLogo={true} />
            </Link>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link to={loggedIn ? '/chat' : '/login'} className="nav-btn-ghost">Sign In</Link>
              <Link to={loggedIn ? '/chat' : '/register'} className="nav-btn-fill">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="ll-hero">
          <div className="hero-mesh" />
          <div className="hero-dots" />
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="hero-inner">
            <div>
              <div className="hero-badge">
                <span className="badge-pip" />
                RAG · Vector · OCR · Enterprise
              </div>
              <h1 className="hero-title">
                Your DeepDocAI Docs,<br />
                <em>Finally Fluent</em>
              </h1>
              <p className="hero-sub">
                Upload any contract, brief, or filing — then ask in plain English. DeepDoc AI reads every page so you don't have to.
              </p>
              <div className="hero-cta-row">
                <Link to={loggedIn ? '/chat' : '/register'} className="btn-hero-main">
                  Start Free <ArrowRight size={17} />
                </Link>
                <Link to={loggedIn ? '/chat' : '/login'} className="btn-hero-alt">
                  Sign In
                </Link>
              </div>
            </div>

            {/* 3D Card Visual */}
            <div className="hero-visual">
              <div className="card-3d-scene">
                <div className="main-card-3d">
                  <div className="card-3d-header">
                    <div className="card-3d-htag">Active Document</div>
                    <div className="card-3d-fname">📄 NDA_Agreement_2024.pdf</div>
                  </div>
                  <div className="card-3d-body">
                    <div className="card-3d-query">"What is the termination clause?"</div>
                    <div className="card-3d-answer">
                      Either party may terminate this agreement with <strong>30 days written notice</strong>. Immediate termination is permitted in cases of material breach…<span className="typing-cursor" />
                    </div>
                    <div className="card-3d-src">✓ Source: Section 8.2, Page 4</div>
                  </div>
                </div>
                <div className="mini-card mini-card-1">
                  <div className="mc-icon" style={{ background: 'rgba(108,62,244,0.1)' }}>🔒</div>
                  <div><div>Encrypted</div><div className="mc-sub">256-bit AES</div></div>
                </div>
                <div className="mini-card mini-card-2">
                  <div className="mc-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>⚡</div>
                  <div><div>Answered in</div><div className="mc-sub" style={{ color: '#10B981', fontWeight: 700 }}>1.2 seconds</div></div>
                </div>
                <div className="mini-card mini-card-3">
                  <div className="mc-icon" style={{ background: 'rgba(14,165,233,0.1)' }}>📑</div>
                  <div><div>12 Pages</div><div className="mc-sub">Fully indexed</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="stats-band">
          <div className="stats-inner">
            {[
              { num: '50K+', label: 'Documents Analyzed' },
              { num: '99.2%', label: 'Answer Accuracy' },
              { num: '<2s', label: 'Avg. Response Time' },
              { num: '4.9★', label: 'User Rating' },
            ].map(({ num, label }) => (
              <div className="stat-cell" key={label}>
                <div className="stat-num">{num}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="sec">
          <p className="sec-eyebrow">The Process</p>
          <h2 className="sec-title">Three steps to clarity</h2>
          <p className="sec-sub">No DeepDocAI training required. No endless reading. Just answers, instantly.</p>
          <div className="steps-grid">
            {[
              { num: '01', numCls: '', iconCls: 'si-p', glow: 'sg-purple', icon: <FileText size={26} />, title: 'Drop Your Document', desc: 'Upload any DeepDocAI PDF — contracts, NDAs, court filings, patents. Our OCR engine recovers every word, even from scanned or handwritten pages.' },
              { num: '02', numCls: 's2', iconCls: 'si-s', glow: 'sg-sky', icon: <Search size={26} />, title: 'Ask in Plain English', desc: 'Type your question naturally. Our RAG pipeline retrieves the exact clauses that matter, then reasons across them with precision.' },
              { num: '03', numCls: 's3', iconCls: 'si-m', glow: 'sg-mint', icon: <Zap size={26} />, title: 'Get Cited Answers', desc: 'Receive clear, accurate responses with exact source references. Every answer is grounded in your document — zero hallucinations.' },
            ].map(({ num, numCls, iconCls, glow, icon, title, desc }) => (
              <div key={num}>
                <div className="step-card-inner">
                  <div className={`step-glow ${glow}`} />
                  <div className={`step-num-badge ${numCls}`}>{num}</div>
                  <div className={`step-icon-3d ${iconCls}`}>{icon}</div>
                  <h3 className="step-title">{title}</h3>
                  <p className="step-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FEATURES BENTO */}
        <section className="features-bg">
          <div className="sec">
            <p className="sec-eyebrow">Capabilities</p>
            <h2 className="sec-title">Built for DeepDocAI precision</h2>
            <p className="sec-sub">Every feature engineered for the exacting demands of DeepDocAI work.</p>
            <div className="bento">
              <div className="bento-card bento-wide">
                <div className="bento-accent-bar ba-v" />
                <div className="bento-icon bi-v"><Search size={26} /></div>
                <h3 className="bento-title">Semantic DeepDocAI Search</h3>
                <p className="bento-desc">Vector embeddings map the <em>meaning</em> behind your queries — not just keywords — surfacing the most relevant clauses instantly.</p>
                <div className="mini-bar-chart">
                  {[1,2,3,4,5,6,7,8].map(i => <div className="mbar" key={i} />)}
                </div>
              </div>
              <div className="bento-card bento-tall" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="bento-accent-bar ba-b" />
                <div className="bento-icon bi-b"><Zap size={26} /></div>
                <h3 className="bento-title">RAG Architecture</h3>
                <p className="bento-desc">Retrieval-Augmented Generation grounds every answer in real document content — accuracy that generic LLMs simply can't match.</p>
                <div className="cube-scene">
                  <div className="cube">
                    <div className="cube-face cf-front">📄</div>
                    <div className="cube-face cf-back">🔍</div>
                    <div className="cube-face cf-right">⚡</div>
                    <div className="cube-face cf-left">🛡️</div>
                    <div className="cube-face cf-top">✨</div>
                    <div className="cube-face cf-bottom">🤖</div>
                  </div>
                </div>
              </div>
              <div className="bento-card">
                <div className="bento-accent-bar ba-r" />
                <div className="bento-icon bi-r"><Shield size={26} /></div>
                <h3 className="bento-title">Bank-Grade Security</h3>
                <p className="bento-desc">End-to-end encryption protects every document. Your files are yours alone — never shared, never used for training.</p>
              </div>
              <div className="bento-card">
                <div className="bento-accent-bar ba-g" />
                <div className="bento-icon bi-g"><FileText size={26} /></div>
                <h3 className="bento-title">Advanced OCR Engine</h3>
                <p className="bento-desc">Tesseract-powered OCR recovers text from scanned PDFs, images, and legacy formats with industry-leading accuracy.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-sec">
          <div className="cta-card-wrap">
            <div className="cta-card">
              <span className="cta-sparkle sp1">✦</span>
              <span className="cta-sparkle sp2">✧</span>
              <span className="cta-sparkle sp3">✦</span>
              <span className="cta-sparkle sp4">✧</span>
              <h2 className="cta-title">Ready to read <em>smarter?</em></h2>
              <p className="cta-sub">Join thousands of DeepDocAI professionals who've turned hours of document review into seconds.</p>
              <Link to={loggedIn ? '/chat' : '/register'} className="btn-cta-main">
                Create Your Free Account <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="ll-footer">
          <div className="footer-grid">
            <div>
              <DeepDocAILogo size="default" showText={true} />
              <p className="footer-brand-p">
                AI-powered DeepDocAI document intelligence — helping professionals analyze, search, and understand complex documents with unprecedented speed.
              </p>
              <div className="socials">
                {[Facebook, Twitter, Linkedin, Instagram, Github].map((Icon, i) => (
                  <a key={i} href="#" className="soc-btn"><Icon size={15} /></a>
                ))}
              </div>
            </div>
            <div>
              <p className="f-col-title">Quick Links</p>
              <ul className="f-links">
                {[{ l: 'Home', to: '/' }, { l: 'Get Started', to: loggedIn ? '/chat' : '/register' }, { l: 'Sign In', to: loggedIn ? '/chat' : '/login' }].map(({ l, to }) => (
                  <li key={l}><Link to={to} style={{ color: 'rgba(26,16,53,0.5)', textDecoration: 'none', fontSize: 14 }}>{l}</Link></li>
                ))}
                {['Features', 'Pricing', 'About Us'].map(item => (
                  <li key={item}><a href="#">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="f-col-title">Resources</p>
              <ul className="f-links">
                {['Documentation', 'API Reference', 'Help Center', 'Blog', 'Case Studies', 'Webinars'].map(item => (
                  <li key={item}><a href="#">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="f-col-title">Contact &amp; DeepDocAI</p>
              <div className="contact-row"><MapPin size={14} /><span>123 DeepDocAI Tech Avenue<br />San Francisco, CA 94105</span></div>
              <div className="contact-row"><Mail size={14} /><a href="mailto:support@deepdocai.com" style={{ color: 'inherit', textDecoration: 'none' }}>support@deepdocai.com</a></div>
              <div className="contact-row"><Phone size={14} /><a href="tel:+15551234567" style={{ color: 'inherit', textDecoration: 'none' }}>+1 (555) 123-4567</a></div>
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(108,62,244,0.08)' }}>
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(item => (
                  <div key={item} style={{ marginBottom: 9 }}>
                    <a href="#" style={{ fontSize: 13, color: 'rgba(26,16,53,0.35)', textDecoration: 'none' }}>{item}</a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="newsletter-row">
            <div className="nl-text">
              <h4>Stay in the loop</h4>
              <p>DeepDocAI tech insights and product updates, once a month.</p>
            </div>
            <div className="nl-form">
              <input type="email" placeholder="your@email.com" />
              <button type="button">Subscribe</button>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copy">© {new Date().getFullYear()} DeepDoc AI. All rights reserved.</p>
            <div className="footer-btm-links">
              {['Security', 'Compliance', 'Status', 'Sitemap'].map(item => (
                <a key={item} href="#">{item}</a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default LandingPage;
