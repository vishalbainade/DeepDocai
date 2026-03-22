import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Virtuoso } from 'react-virtuoso';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle, FileText, Layout, Info, ShieldCheck, ShieldAlert, Shield, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useDarkColors, useIsDark } from '../utils/darkMode';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const OCRViewer = ({ documentId, pdfUrl, activeHighlight }) => {
  const [layoutData, setLayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(0.84); // Defaulting to a fitting 80%
  const [pageMetrics, setPageMetrics] = useState({});
  const dc = useDarkColors();
  const isDark = useIsDark();

  const containerRef = useRef(null);
  const pageRefs = useRef([]);
  const virtuosoRef = useRef(null);

  // ── Data Loading ───────────────────────────────────────
  useEffect(() => {
    const fetchOCRLayout = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/upload/metadata/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('OCR layout data not found for this document');
        }

        const data = await response.json();
        setLayoutData(data);
      } catch (err) {
        console.error('Failed to load OCR layout:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchOCRLayout();
    }
  }, [documentId]);

  // ── Precision Scrolling (Virtualized) ───────────────────────────
  useEffect(() => {
    if (activeHighlight?.page && layoutData) {
      const pageIndex = parseInt(activeHighlight.page) - 1;
      
      // Utilize Virtuoso's imperative scrolling API 
      // since target DOM nodes might be unmounted off-screen
      if (virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index: pageIndex,
          align: 'center',
          behavior: 'smooth'
        });
      }
    }
  }, [activeHighlight, layoutData]);

  const getConfidenceLevel = (confidence) => {
    const score = confidence || 0.95;
    if (score >= 0.95) return 'high';
    if (score >= 0.75) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center transition-colors duration-300" style={{ backgroundColor: dc.bgPrimary }}>
        <Loader2 className="h-10 w-10 animate-spin mb-4" style={{ color: dc.textPrimary }} />
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: dc.textFaint }}>Restoring Digital Original...</p>
      </div>
    );
  }

  const pages = layoutData?.pages || [];

  return (
    <div 
      className="flex h-full flex-col overflow-hidden relative selection:bg-indigo-500/30 transition-colors duration-300" 
      style={{ backgroundColor: dc.bgSecondary }}
    >
      {/* Precision Toolbar */}
      <div 
        className="z-30 flex h-14 shrink-0 items-center justify-between px-6 transition-colors duration-300 shadow-sm"
        style={{ backgroundColor: dc.bgPrimary, borderBottom: `1px solid ${dc.borderPrimary}` }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="flex h-8 w-8 items-center justify-center rounded font-black text-[10px] transition-colors duration-300"
            style={{ backgroundColor: dc.textPrimary, color: dc.bgPrimary }}
          >
            HIFI
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight leading-none transition-colors duration-300" style={{ color: dc.textPrimary }}>Digital Reconstruction</h3>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-widest transition-colors duration-300" style={{ color: dc.textFaint }}>Pixel-Perfect View</p>
          </div>
        </div>

        <div 
          className="flex items-center gap-4 rounded-lg px-2 py-1 transition-colors duration-300"
          style={{ backgroundColor: dc.bgSecondary, border: `1px solid ${dc.borderPrimary}` }}
        >
          <button
            onClick={() => setScale(s => Math.max(0.4, s - 0.01))}
            className="p-1 px-2 rounded transition-all font-black"
            style={{ color: dc.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgPrimary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            -
          </button>
          <span className="min-w-[4rem] text-center text-xs font-black tabular-nums transition-colors duration-300" style={{ color: dc.textPrimary }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(4.0, s + 0.01))}
            className="p-1 px-2 rounded transition-all font-black"
            style={{ color: dc.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgPrimary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            +
          </button>
          <div className="w-[1px] h-4 bg-slate-300 opacity-30 mx-1" />
          <button
            onClick={() => setScale(0.84)}
            title="Reset to 84%"
            className="p-1 rounded transition-all"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgPrimary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Maximize2 size={14} style={{ color: dc.textFaint }} />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <div className="relative group/download z-50">
            <button
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              DOWNLOAD
            </button>
            
            {/* Download Dropdown */}
            <div className="absolute right-0 top-full pt-2 w-48 scale-95 opacity-0 pointer-events-none group-hover/download:scale-100 group-hover/download:opacity-100 group-hover/download:pointer-events-auto transition-all duration-200 z-[100] origin-top-right">
              <div className="rounded-xl shadow-2xl overflow-hidden p-1.5 flex flex-col gap-1 transition-colors duration-300" style={{ backgroundColor: dc.bgPrimary, border: `1px solid ${dc.borderPrimary}` }}>
                <button
                  onClick={async () => {
                    try {
                      const html2pdf = (await import('html2pdf.js')).default;
                      const element = document.getElementById('ocr-download-target');
                      
                      const opt = {
                        margin:       [-0.5, 0, 0, 0],
                        filename:     `Digital-Document-${documentId}.pdf`,
                        image:        { type: 'jpeg', quality: 1.0 },
                        html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 1000 },
                        jsPDF:        { unit: 'px', format: [1000, 1414], orientation: 'portrait' }
                      };
                      
                      html2pdf().set(opt).from(element).save();
                    } catch(err) {
                      console.error("PDF Export failed", err);
                      alert("Failed to generate PDF locally. Please try again.");
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-black uppercase text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                >
                  <FileText size={14} className="text-red-500" />
                  Download PDF
                </button>
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    const downloadUrl = `${baseUrl}/api/upload/download/${documentId}/docx?token=${token}`;
                    window.open(downloadUrl, '_blank');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-black uppercase text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                >
                  <FileText size={14} className="text-blue-500" />
                  Download DOCX
                </button>
              </div>
            </div>
          </div>
          <div className="w-[1px] h-6 bg-slate-200 mx-1" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{pages.length} Pages</span>
        </div>
      </div>

      {/* Main Surface (Virtualization Enabled) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: dc.bgSecondary }}
      >
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: '100%', width: '100%' }}
          data={pages}
          itemContent={(index, pageData) => {
            const pageNum = index + 1;

            // Dimensions
            const docW = pageData.image_width || pageData.page_width || 1000;
            const docH = pageData.image_height || pageData.page_height || 1414;
            const aspectRatio = docH / docW;
            const renderedW = 790 * scale;
            const renderedH = renderedW * aspectRatio;

            return (
              <div className="flex justify-center mt-2 mb-[1cm] px-4 w-full">
                <div
                  data-index={index}
                  ref={(el) => { if (pageRefs.current) pageRefs.current[index] = el }}
                  className="relative shadow-2xl transition-colors duration-300 shrink-0"
                  style={{
                    width: `${renderedW}px`,
                    height: `${renderedH}px`,
                    minHeight: `${renderedH}px`,
                    backgroundColor: dc.bgPrimary,
                    boxShadow: dc.shadowCard,
                    border: `1px solid ${dc.borderPrimary}`
                  }}
                >
                {/* 
                   Hidden PDF Engine - Internal reference
                */}
                <div className="hidden pointer-events-none opacity-0">
                  <Document file={pdfUrl}>
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      onLoadSuccess={(page) => {
                        setPageMetrics(prev => ({
                          ...prev,
                          [pageNum]: {
                            width: page.width,
                            height: page.height,
                            sourceW: page.originalWidth || docW,
                            sourceH: page.originalHeight || docH
                          }
                        }));
                      }}
                    />
                  </Document>
                </div>

                {/* Digital Reconstructive Layer */}
                <div className="absolute inset-0 z-10 select-text overflow-hidden transition-colors duration-300" style={{ backgroundColor: dc.bgPrimary }}>
                  {(pageData.blocks || []).map((block, bIdx) => {
                    const coords = block.coordinates || block.box;
                    if (!coords) return null;

                    let x1, y1, x2, y2;
                    if (Array.isArray(coords)) {
                      [x1, y1, x2, y2] = coords;
                    } else {
                      x1 = coords.x1; y1 = coords.y1; x2 = coords.x2; y2 = coords.y2;
                    }

                    const normalize = (t) => t?.toLowerCase().replace(/[^\w\s\-\.]/g, '').replace(/\s+/g, ' ').trim() || '';
                    const STOP_WORDS = new Set(['the', 'and', 'for', 'was', 'with', 'that', 'from', 'this', 'were', 'have']);
                    const cleanH = normalize(activeHighlight?.text);
                    const cleanB = normalize(block?.text || '');

                    const normalizeWords = (t) => (t || '').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
                    const hWords = normalizeWords(activeHighlight?.text);
                    const bWords = normalizeWords(block?.text || '');
                    
                    // Match if at least 40% of the significant words in the citation appear in the block
                    // OR if the block text is a significant part of the citation text
                    const matchingWords = hWords.filter(w => bWords.includes(w));
                    const wordOverlapRatio = hWords.length > 0 ? (matchingWords.length / hWords.length) : 0;
                    const hasSignificantOverlap = (wordOverlapRatio >= 0.4) || (cleanH.length > 20 && cleanB.length > 20 && (cleanH.includes(cleanB) || cleanB.includes(cleanH)));

                    // Improved matching strategy
                    let isHighlighted = false;
                    if (activeHighlight && parseInt(activeHighlight.page) === pageNum) {
                      // 1. Precise Coordinate Matching (Most accurate)
                      if (activeHighlight.bbox && Array.isArray(coords)) {
                        // Normalize both to pixel space if they are in 0..1 range
                        const getAbsCoords = (c, w, h) => {
                          const [x1, y1, x2, y2] = c;
                          const isFrac = Math.max(x1, y1, x2, y2) <= 1.05;
                          return isFrac ? [x1 * w, y1 * h, x2 * w, y2 * h] : [x1, y1, x2, y2];
                        };

                        const [hx1, hy1, hx2, hy2] = getAbsCoords(activeHighlight.bbox, docW, docH);
                        const [bx1, by1, bx2, by2] = getAbsCoords(coords, docW, docH);
                        
                        const intersectX = Math.max(0, Math.min(hx2, bx2) - Math.max(hx1, bx1));
                        const intersectY = Math.max(0, Math.min(hy2, by2) - Math.max(hy1, by1));
                        const intersectionArea = intersectX * intersectY;
                        
                        if (intersectionArea > 0) {
                          const areaH = (hx2 - hx1) * (hy2 - hy1);
                          const areaB = (bx2 - bx1) * (by2 - by1);
                          // Allow a bit more fuzziness (15% coverage)
                          if (intersectionArea / areaH > 0.15 || intersectionArea / areaB > 0.15) {
                             isHighlighted = true;
                          }
                        }
                      }
                      
                      // 2. Fallback to Text Matching
                      if (!isHighlighted && cleanH && block.block_type !== 'image' && block.block_type !== 'figure') {
                        if (cleanB.includes(cleanH) || cleanH.includes(cleanB) || hasSignificantOverlap) {
                          isHighlighted = true;
                        }
                      }
                    }

                    const finalFontSize = (block.block_type === 'header' || block.block_type === 'title' ? 19 : 14) * scale;
                    // Switch to a more vibrant high-contrast Indigo highlight
                    const highlightColor = isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)';
                    const highlightBorder = '#6366f1';

                    return (
                      <div
                        key={bIdx}
                        className={`absolute transition-all duration-300 ${isHighlighted 
                          ? 'z-[999] shadow-[0_0_50px_rgba(99,102,241,0.7)] scale-[1.02] ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent animate-pulse-subtle' 
                          : 'border-b border-transparent group/block'
                        }`}
                        style={{
                          left: `${(x1 / docW) * 100}%`,
                          top: `${(y1 / docH) * 100}%`,
                          width: `${((x2 - x1) / docW) * 100}%`,
                          height: `${((y2 - y1) / docH) * 100}%`,
                          backgroundColor: isHighlighted ? highlightColor : 'transparent',
                          border: isHighlighted ? `2px solid ${highlightBorder}` : 'none',
                          color: dc.textPrimary,
                          fontSize: `${finalFontSize}px`,
                          fontWeight: block.block_type === 'header' || block.block_type === 'title' ? '900' : '500',
                          fontFamily: 'system-ui, sans-serif',
                          lineHeight: '1.4',
                          zIndex: isHighlighted ? 999 : 1,
                          overflow: 'visible',
                          borderRadius: '8px'
                        }}
                      >
                        <div className="w-full h-full relative pointer-events-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              table: (props) => (
                                <div className="w-full my-1 border rounded overflow-hidden shadow-sm pointer-events-auto transition-colors duration-300" style={{ backgroundColor: dc.bgPrimary, borderColor: dc.borderPrimary }}>
                                  <table {...props} className="min-w-full border-collapse text-[0.9em]" />
                                </div>
                              ),
                              td: (props) => <td {...props} className="border px-3 py-2 align-top transition-colors duration-300" style={{ borderColor: dc.borderPrimary, color: dc.textSecondary }} />,
                              th: (props) => <th {...props} className="border px-3 py-2 font-black text-left transition-colors duration-300" style={{ borderColor: dc.borderPrimary, backgroundColor: dc.bgSecondary, color: dc.textPrimary }} />,
                              p: (props) => <p {...props} className="m-0 leading-normal pointer-events-auto" />,
                            }}
                          >
                            {block.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute left-6 bottom-6 text-[10px] font-black text-slate-300 opacity-60">
                  PAG_0{pageNum}
                </div>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Hidden Print Container for High Fidelity PDF Export */}
      <div className="absolute top-0 left-[-9999px] opacity-0 pointer-events-none w-[1000px]">
        <div id="ocr-download-target" className="flex flex-col bg-white">
          {pages.map((pageData, index) => {
            const docW = pageData.image_width || pageData.page_width || 1000;
            const docH = pageData.image_height || pageData.page_height || 1414;
            const aspectRatio = docH / docW;
            const renderedW = 1000;
            const renderedH = renderedW * aspectRatio;

            return (
              <div
                key={`print-${index}`}
                className="relative bg-white shrink-0"
                style={{
                  width: `${renderedW}px`,
                  height: `${renderedH}px`
                }}
              >
                <div className="absolute inset-0 z-10 select-text overflow-hidden bg-white">
                  {(pageData.blocks || []).map((block, bIdx) => {
                    const coords = block.coordinates || block.box;
                    if (!coords) return null;

                    let x1, y1, x2, y2;
                    if (Array.isArray(coords)) {
                      [x1, y1, x2, y2] = coords;
                    } else {
                      x1 = coords.x1; y1 = coords.y1; x2 = coords.x2; y2 = coords.y2;
                    }

                    const finalFontSize = (block.block_type === 'header' || block.block_type === 'title' ? 19 : 14);

                    return (
                      <div
                        key={bIdx}
                        className="absolute tracking-tight border-b border-transparent"
                        style={{
                          left: `${(x1 / docW) * 100}%`,
                          top: `${(y1 / docH) * 100}%`,
                          width: `${((x2 - x1) / docW) * 100}%`,
                          height: `${((y2 - y1) / docH) * 100}%`,
                          color: '#0f172a',
                          fontSize: `${finalFontSize}px`,
                          fontWeight: block.block_type === 'header' || block.block_type === 'title' ? '900' : '500',
                          fontFamily: 'system-ui, sans-serif',
                          lineHeight: '1.4',
                          overflow: 'visible'
                        }}
                      >
                         <div className="w-full h-full relative">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              table: (props) => (
                                <div className="w-full my-1 border rounded bg-white overflow-hidden shadow-sm">
                                  <table {...props} className="min-w-full border-collapse text-[0.9em]" />
                                </div>
                              ),
                              td: (props) => <td {...props} className="border border-slate-200 px-3 py-2 align-top text-slate-800" />,
                              th: (props) => <th {...props} className="border border-slate-200 px-3 py-2 bg-slate-50 font-black text-left text-slate-900" />,
                              p: (props) => <p {...props} className="m-0 leading-normal" />,
                            }}
                          >
                            {block.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OCRViewer;
