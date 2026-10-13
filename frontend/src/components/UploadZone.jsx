import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, FolderUp, Layers } from 'lucide-react';
import { useDarkColors, useIsDark } from '../utils/darkMode';
import { useChat } from '../contexts/ChatContext';

const UploadZone = ({ onUpload, isUploading, uploadProgress, uploadStage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dc = useDarkColors();
  const isDark = useIsDark();
  const fileInputRef = useRef(null);
  const { setIsMultiUploadOpen } = useChat();

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
    if (files.length > 1) {
      setIsMultiUploadOpen(true);
      return;
    }

    const file = files[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 1) {
      setIsMultiUploadOpen(true);
      return;
    }
    const file = files[0];
    if (file) {
      onUpload(file);
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
      <div className="text-center max-w-lg w-full">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div
          onClick={handleClick}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 transition-all duration-300 shadow-sm ${
            isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-500'
          }`}
          style={{ 
            borderColor: isDragging ? '#da7756' : dc.borderPrimary,
            backgroundColor: isDragging ? (isDark ? 'rgba(218, 119, 86, 0.08)' : 'rgba(254, 243, 199, 0.25)') : (isDark ? '#16161a' : '#ffffff')
          }}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
              <p className="font-semibold text-sm" style={{ color: dc.textPrimary }}>{uploadStage || 'Processing document...'}</p>

              {/* Progress Bar */}
              <div className="w-full max-w-xs">
                <div className="w-full rounded-full h-2 overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full transition-all duration-300 ease-out bg-amber-500"
                    style={{ width: `${uploadProgress || 0}%` }}
                  />
                </div>
                <p className="text-xs mt-2 text-center font-mono font-medium" style={{ color: dc.textSecondary }}>
                  {uploadProgress || 0}%
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div 
                  className="p-3.5 rounded-2xl"
                  style={{ backgroundColor: 'rgba(218, 119, 86, 0.12)', color: '#da7756' }}
                >
                  <Upload className="w-7 h-7" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: dc.textPrimary }}>
                Upload Documents or Project Folders
              </h3>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: dc.textSecondary }}>
                Drag and drop multiple files here, or click to browse
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMultiUploadOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                >
                  <FolderUp size={13} /> Batch / Folder Upload
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 text-[11px] font-medium" style={{ color: dc.textFaint }}>
                <span className="flex items-center gap-1">
                  <FileText size={13} /> PDF, Word, Text, CSV
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Layers size={13} /> Sarvam OCR Enabled
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
