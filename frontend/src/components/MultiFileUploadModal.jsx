import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FolderUp, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Folder, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { uploadDocument, addDocumentToProject } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const MultiFileUploadModal = ({ 
  isOpen, 
  onClose, 
  onUploadComplete, 
  projects = [], 
  selectedProjectId = null 
}) => {
  const [filesQueue, setFilesQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState(selectedProjectId || '');
  const [overallProgress, setOverallProgress] = useState(0);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const dc = useDarkColors();
  const isDark = useIsDark();

  // The modal remains mounted while closed, so refresh its destination whenever
  // it is opened from a different project.
  useEffect(() => {
    if (isOpen) {
      setTargetProjectId(selectedProjectId || '');
      setFilesQueue([]);
      setOverallProgress(0);
    }
  }, [isOpen, selectedProjectId]);

  if (!isOpen) return null;

  const handleFilesAdded = (rawFiles) => {
    const validFiles = Array.from(rawFiles).filter((f) => {
      const ext = f.name.toLowerCase();
      return (
        f.type === 'application/pdf' ||
        ext.endsWith('.pdf') ||
        ext.endsWith('.docx') ||
        ext.endsWith('.txt') ||
        ext.endsWith('.csv')
      );
    });

    if (validFiles.length === 0) {
      alert('Please upload PDF, DOCX, TXT, or CSV files.');
      return;
    }

    const newQueueItems = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      progress: 0,
      stage: 'Queued',
      status: 'pending', // 'pending', 'uploading', 'success', 'error'
      error: null,
      documentId: null,
    }));

    setFilesQueue((prev) => [...prev, ...newQueueItems]);
  };

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
    if (e.dataTransfer.files?.length) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id) => {
    if (isProcessing) return;
    setFilesQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const startBatchUpload = async () => {
    if (filesQueue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const completedDocs = [];

    for (let i = 0; i < filesQueue.length; i++) {
      const item = filesQueue[i];
      if (item.status === 'success') continue;

      // Update state to uploading
      setFilesQueue((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading', stage: 'Uploading & Processing...' } : f))
      );

      try {
        const result = await uploadDocument(item.file, (progress, stage) => {
          setFilesQueue((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress, stage: stage || 'Processing...' } : f))
          );
        });

        // Link to project if selected
        if (targetProjectId && result?.documentId) {
          try {
            await addDocumentToProject(targetProjectId, result.documentId);
          } catch (e) {
            console.error('Failed to link document to project:', e);
          }
        }

        completedDocs.push(result);

        setFilesQueue((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  stage: 'Ready ✅',
                  documentId: result.documentId,
                }
              : f
          )
        );
      } catch (err) {
        console.error('Upload failed for', item.name, err);
        setFilesQueue((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'error',
                  stage: 'Failed',
                  error: err.response?.data?.message || err.message,
                }
              : f
          )
        );
      }

      setOverallProgress(Math.round(((i + 1) / filesQueue.length) * 100));
    }

    setIsProcessing(false);

    if (completedDocs.length > 0) {
      onUploadComplete?.(completedDocs);
    }
  };

  const allFinished = filesQueue.length > 0 && filesQueue.every((f) => f.status === 'success' || f.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          backgroundColor: isDark ? '#131316' : '#ffffff',
          borderColor: isDark ? '#27272a' : '#e4e4e7',
          color: dc.textPrimary,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: isDark ? '#27272a' : '#f4f4f5' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(218, 119, 86, 0.15)', color: '#da7756' }}
            >
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Multi-File & Folder Ingestion</h2>
              <p className="text-xs" style={{ color: dc.textSecondary }}>
                Batch upload legal documents, parse OCR pages, and organize into project folders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Target Project Dropdown */}
          {projects.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-500/5" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-amber-500" />
                <span className="text-xs font-semibold">Assign to Project Folder:</span>
              </div>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500"
                style={{
                  backgroundColor: isDark ? '#18181b' : '#ffffff',
                  borderColor: isDark ? '#2e2e34' : '#e2e8f0',
                  color: dc.textPrimary,
                }}
              >
                <option value="">None (Global Workspace)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.csv"
            onChange={(e) => handleFilesAdded(e.target.files)}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={(e) => handleFilesAdded(e.target.files)}
            className="hidden"
          />

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging ? 'border-amber-500 bg-amber-500/5' : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <div className="flex justify-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: dc.borderPrimary }}
              >
                <FileText size={15} className="text-amber-500" /> Choose Multiple Files
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: dc.borderPrimary }}
              >
                <FolderUp size={15} className="text-blue-500" /> Select Entire Folder
              </button>
            </div>
            <p className="text-xs" style={{ color: dc.textSecondary }}>
              Or drag & drop files here (PDF, DOCX, TXT, CSV)
            </p>
          </div>

          {/* Queue List */}
          {filesQueue.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: dc.textSecondary }}>
                  Upload Queue ({filesQueue.length} files)
                </span>
                {!isProcessing && !allFinished && (
                  <button
                    onClick={() => setFilesQueue([])}
                    className="text-[11px] text-red-500 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div 
                className="space-y-2 max-h-60 overflow-y-auto pr-1"
              >
                {filesQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border flex items-center justify-between text-xs transition-colors"
                    style={{
                      backgroundColor: isDark ? '#18181b' : '#fafafa',
                      borderColor: isDark ? '#27272a' : '#f0f0f2',
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-3 flex-1">
                      <FileText size={16} className="shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-[10px]" style={{ color: dc.textSecondary }}>
                          <span>{item.size}</span>
                          <span>•</span>
                          <span className={item.status === 'error' ? 'text-red-500' : 'text-slate-400'}>
                            {item.stage}
                          </span>
                        </div>
                        {/* Progress line */}
                        {item.status === 'uploading' && (
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {item.status === 'success' && (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle size={16} className="text-red-500" />
                      )}
                      {item.status === 'uploading' && (
                        <Loader2 size={16} className="animate-spin text-amber-500" />
                      )}
                      {item.status === 'pending' && !isProcessing && (
                        <button
                          onClick={() => handleRemoveFile(item.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{ borderColor: isDark ? '#27272a' : '#f4f4f5', backgroundColor: isDark ? '#101014' : '#fafafa' }}
        >
          <div className="text-xs text-slate-500">
            {isProcessing ? `Processing queue (${overallProgress}%)` : `${filesQueue.length} files selected`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
              style={{ borderColor: dc.borderPrimary }}
            >
              {allFinished ? 'Done' : 'Cancel'}
            </button>

            {!allFinished && (
              <button
                onClick={startBatchUpload}
                disabled={filesQueue.length === 0 || isProcessing}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#da7756' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Ingesting Files...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Start Ingestion ({filesQueue.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiFileUploadModal;
