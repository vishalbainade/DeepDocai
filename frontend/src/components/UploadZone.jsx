import { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

const UploadZone = ({ onUpload, isUploading, uploadProgress, uploadStage }) => {
  const [isDragging, setIsDragging] = useState(false);
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
      className={`h-full flex items-center justify-center p-8 transition-all duration-300 ${
        isDragging ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'
      }`}
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
          className={`cursor-pointer border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
            isDragging
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="text-slate-700 font-medium">{uploadStage || 'Uploading document...'}</p>
              
              {/* Progress Bar */}
              <div className="w-full max-w-xs">
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress || 0}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600 mt-2 text-center font-medium">
                  {uploadProgress || 0}%
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-indigo-100 rounded-full">
                  <Upload className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Upload Legal Document
              </h3>
              <p className="text-slate-600 mb-4">
                Drag and drop your PDF here, or click to browse
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
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

