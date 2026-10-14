import React, { useState, useEffect } from 'react';
import { X, FileText, MessageSquare, ExternalLink, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import OCRViewer from './OCRViewer';
import { getDocumentPreview } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const ReconstructedOCRModal = ({ isOpen, onClose, documentId, fileName: initialFileName, onSelectForChat }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [fileName, setFileName] = useState(initialFileName || 'Document');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dc = useDarkColors();
  const isDark = useIsDark();

  useEffect(() => {
    if (!isOpen || !documentId) {
      setPdfUrl(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadPreview = async () => {
      try {
        const preview = await getDocumentPreview(documentId);
        if (isMounted) {
          setPdfUrl(preview.previewUrl);
          if (preview.fileName) {
            setFileName(preview.fileName);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load document preview in OCR modal:', err);
        if (isMounted) {
          setError(err.message || 'Unable to load preview URL');
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full h-full max-w-7xl max-h-[92vh] rounded-2xl flex flex-col shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: isDark ? '#141418' : '#ffffff',
          borderColor: isDark ? '#2e2e34' : '#e2e8f0',
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
          style={{
            borderColor: isDark ? '#26262b' : '#f1f5f9',
            backgroundColor: isDark ? '#18181c' : '#f8fafc',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-500">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate" style={{ color: dc.textPrimary }}>
                {fileName}
              </h2>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: dc.textSecondary }}>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Sparkles size={11} /> Reconstructed OCR Layout
                </span>
                <span>•</span>
                <span>Interactive Bounding Boxes & Text Layer</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSelectForChat && (
              <button
                type="button"
                onClick={() => {
                  onSelectForChat(documentId);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all cursor-pointer"
                style={{ backgroundColor: '#da7756' }}
              >
                <MessageSquare size={13} />
                <span>Chat with Document</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors cursor-pointer"
              style={{ color: dc.textSecondary }}
              title="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* OCR Viewer Body */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 size={28} className="animate-spin text-amber-500" />
              <p className="text-xs" style={{ color: dc.textSecondary }}>
                Loading digital OCR reconstruction...
              </p>
            </div>
          ) : error && !pdfUrl ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <AlertCircle size={32} className="text-red-500 mb-2" />
              <p className="text-xs font-semibold text-red-500 mb-1">Failed to load preview</p>
              <p className="text-[11px] text-slate-400 max-w-sm">{error}</p>
            </div>
          ) : (
            <OCRViewer
              documentId={documentId}
              pdfUrl={pdfUrl}
              activeHighlight={null}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconstructedOCRModal;
