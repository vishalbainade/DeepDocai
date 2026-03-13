import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import HighlightOverlay from './HighlightOverlay';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PdfViewer = ({ fileUrl, activeHighlight }) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageMetrics, setPageMetrics] = useState(null);

  useEffect(() => {
    if (activeHighlight?.page) {
      setPageNumber(Number(activeHighlight.page));
    }
  }, [activeHighlight]);

  if (!fileUrl) {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0)]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            disabled={pageNumber <= 1}
            className="rounded-lg p-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-slate-700">{`Page ${pageNumber} / ${numPages || '--'}`}</span>
          <button
            type="button"
            onClick={() => setPageNumber((current) => Math.min(numPages || 1, current + 1))}
            disabled={!numPages || pageNumber >= numPages}
            className="rounded-lg p-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setScale((current) => Math.max(0.75, current - 0.15))} className="rounded-lg p-2 transition hover:bg-slate-100">
            <ZoomOut size={18} />
          </button>
          <span className="w-14 text-center text-sm font-medium text-slate-600">{`${Math.round(scale * 100)}%`}</span>
          <button type="button" onClick={() => setScale((current) => Math.min(2.25, current + 0.15))} className="rounded-lg p-2 transition hover:bg-slate-100">
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: totalPages }) => {
            setNumPages(totalPages);
            setPageNumber(1);
          }}
          loading={<div className="flex h-full items-center justify-center text-slate-600">Loading PDF...</div>}
          error={<div className="flex h-full items-center justify-center text-red-600">Failed to load PDF.</div>}
        >
          <div className="relative mx-auto inline-block rounded-2xl bg-white p-2 shadow-2xl shadow-slate-300/60">
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderAnnotationLayer
              renderTextLayer
              className="overflow-hidden rounded-xl"
              onLoadSuccess={(page) => {
                const sourceWidth = page.originalWidth || page.view?.[2] || page.width;
                const sourceHeight = page.originalHeight || page.view?.[3] || page.height;
                setPageMetrics({
                  viewportWidth: page.width || sourceWidth * scale,
                  viewportHeight: page.height || sourceHeight * scale,
                  sourceWidth,
                  sourceHeight,
                });
              }}
            />

            {activeHighlight && Number(activeHighlight.page) === pageNumber ? (
              <HighlightOverlay activeHighlight={activeHighlight} pageMetrics={pageMetrics} />
            ) : null}
          </div>
        </Document>
      </div>
    </div>
  );
};

export default PdfViewer;
