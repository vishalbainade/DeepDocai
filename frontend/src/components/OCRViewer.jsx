import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle, FileText, Layout, Info, ShieldCheck, ShieldAlert, Shield, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const OCRViewer = ({ documentId, pdfUrl, activeHighlight }) => {
  const [layoutData, setLayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(0.85); // Defaulting to a fitting 85%
  const [pageMetrics, setPageMetrics] = useState({});

  const containerRef = useRef(null);
  const pageRefs = useRef([]);

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

  // ── Precision Scrolling ───────────────────────────
  useEffect(() => {
    if (activeHighlight?.page && layoutData) {
      const pageIndex = parseInt(activeHighlight.page) - 1;
      const targetPage = pageRefs.current[pageIndex];

      if (targetPage && containerRef.current) {
        targetPage.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
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
      <div className="flex h-full flex-col items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-slate-800 mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Restoring Digital Original...</p>
      </div>
    );
  }

  const pages = layoutData?.pages || [];

  return (
    <div className="flex h-full flex-col bg-[#f1f5f9] overflow-hidden relative selection:bg-blue-100">
      {/* Precision Toolbar */}
      <div className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-white font-black text-[10px]">
            HIFI
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none">Digital Reconstruction</h3>
            <p className="mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Pixel-Perfect View</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
          <button
            onClick={() => setScale(s => Math.max(0.4, s - 0.1))}
            className="p-1 px-2 hover:bg-white rounded transition-all text-slate-600 font-black"
          >
            -
          </button>
          <span className="min-w-[4rem] text-center text-xs font-black tabular-nums text-slate-700">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(4.0, s + 0.1))}
            className="p-1 px-2 hover:bg-white rounded transition-all text-slate-600 font-black"
          >
            +
          </button>
          <div className="w-[1px] h-4 bg-slate-300 mx-1" />
          <button
            onClick={() => setScale(0.85)}
            title="Reset to 85%"
            className="p-1 hover:bg-white rounded transition-all"
          >
            <Maximize2 size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <FileText size={16} className="text-slate-400" />
          <span className="text-[10px] font-black text-slate-500 uppercase">{pages.length} Pages</span>
        </div>
      </div>

      {/* Main Surface (Horizontal & Vertical Scroll Enabled) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto scroll-smooth py-0.5 bg-slate-100/50 flex flex-col items-center"
      >
        <div className="inline-flex flex-col gap-[1cm] pb-2 min-w-full items-center px-4">
          {pages.map((pageData, index) => {
            const pageNum = index + 1;

            // Dimensions
            const docW = pageData.image_width || pageData.page_width || 1000;
            const docH = pageData.image_height || pageData.page_height || 1414;
            const aspectRatio = docH / docW;
            const renderedW = 790 * scale;
            const renderedH = renderedW * aspectRatio;

            return (
              <div
                key={index}
                data-index={index}
                ref={(el) => (pageRefs.current[index] = el)}
                className="relative bg-white shadow-2xl ring-1 ring-slate-200 shrink-0"
                style={{
                  width: `${renderedW}px`,
                  height: `${renderedH}px`,
                  minHeight: `${renderedH}px`,
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

                    const normalize = (t) => t?.toLowerCase().replace(/[^\w\s\-\.]/g, '').replace(/\s+/g, ' ').trim() || '';
                    const cleanH = normalize(activeHighlight?.text);
                    const cleanB = normalize(block?.text || '');

                    const normalizeWord = (t) => t?.toLowerCase().replace(/[^\w]/g, '') || '';
                    const hWords = (activeHighlight?.text || '').split(/\s+/).map(normalizeWord).filter(w => w.length > 2);
                    const bWords = (block?.text || '').split(/\s+/).map(normalizeWord).filter(w => w.length > 2);
                    
                    // Match if there is a significant overlap in key words (at least 2 consecutive or 3 total)
                    const hasSignificantOverlap = hWords.length > 0 && bWords.length > 0 && (
                       bWords.some(bw => hWords.includes(bw)) && (cleanB.length > 8 || hWords.length < 5)
                    );

                    const isHighlighted = activeHighlight &&
                      parseInt(activeHighlight.page) === pageNum &&
                      cleanH && (
                         (cleanB.includes(cleanH) || cleanH.includes(cleanB) || hasSignificantOverlap) &&
                         (block.block_type !== 'image' && block.block_type !== 'figure')
                      );

                    const finalFontSize = (block.block_type === 'header' || block.block_type === 'title' ? 19 : 14) * scale;

                    return (
                      <div
                        key={bIdx}
                        className={`absolute transition-all duration-300 ${isHighlighted 
                          ? 'bg-amber-100/40 ring-2 ring-amber-400 z-50 shadow-[0_0_30px_rgba(245,158,11,0.6)] scale-[1.02]' 
                          : 'border-b border-transparent group/block'
                        }`}
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
                          zIndex: isHighlighted ? 50 : 1,
                          overflow: 'visible'
                        }}
                      >
                        <div className="w-full h-full relative pointer-events-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              table: (props) => (
                                <div className="w-full my-1 border rounded bg-white overflow-hidden shadow-sm pointer-events-auto">
                                  <table {...props} className="min-w-full border-collapse text-[0.9em]" />
                                </div>
                              ),
                              td: (props) => <td {...props} className="border border-slate-200 px-3 py-2 align-top text-slate-800" />,
                              th: (props) => <th {...props} className="border border-slate-200 px-3 py-2 bg-slate-50 font-black text-left text-slate-900" />,
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OCRViewer;
