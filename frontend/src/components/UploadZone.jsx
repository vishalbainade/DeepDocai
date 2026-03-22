import { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const UploadZone = ({ onUpload, isUploading, uploadProgress, uploadStage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dc = useDarkColors();
  const isDark = useIsDark();
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((file) => file.type === 'application/pdf');

    if (pdfFile) {
      onUpload(pdfFile);
    } else {
      alert('Please upload a PDF file');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`h-full flex items-center justify-center p-8 transition-all duration-300`}
      style={{ backgroundColor: dc.bgSecondary }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center max-w-md">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div
          onClick={handleClick}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            borderColor: isDragging ? dc.primary : dc.borderPrimary,
            backgroundColor: isDragging ? (isDark ? 'rgba(129, 140, 248, 0.05)' : 'rgba(129, 140, 248, 0.05)') : dc.bgPrimary
          }}
          onMouseEnter={(e) => {
            if (!isUploading && !isDragging) {
              e.currentTarget.style.borderColor = dc.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (!isUploading && !isDragging) {
              e.currentTarget.style.borderColor = dc.borderPrimary;
            }
          }}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: dc.primary }} />
              <p className="font-medium" style={{ color: dc.textPrimary }}>{uploadStage || 'Uploading document...'}</p>

              {/* Progress Bar */}
              <div className="w-full max-w-xs">
                <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ backgroundColor: dc.bgSecondary }}>
                  <div
                    className="h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress || 0}%`, backgroundColor: dc.primary }}
                  />
                </div>
                <p className="text-sm mt-2 text-center font-medium" style={{ color: dc.textSecondary }}>
                  {uploadProgress || 0}%
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full" style={{ backgroundColor: isDark ? dc.bgHover : dc.primaryLight }}>
                  <Upload className="w-8 h-8" style={{ color: dc.primary }} />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: dc.textPrimary }}>
                Upload Legal Document
              </h3>
              <p className="mb-4" style={{ color: dc.textSecondary }}>
                Drag and drop your PDF here, or click to browse
              </p>
              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: dc.textFaint }}>
                <FileText size={16} />
                <span>PDF files only</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadZone;

