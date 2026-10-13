import { useState, useEffect } from 'react';
import { X, FolderPlus, Folder, Check, FileText, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { createProject, updateProject, deleteProject, addDocumentToProject } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const COLOR_OPTIONS = [
  '#da7756', // Claude Terra
  '#6366f1', // Indigo
  '#0ea5e9', // Sky Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const ProjectsModal = ({ isOpen, onClose, projectToEdit = null, onProjectSaved, existingDocuments = [] }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [color, setColor] = useState('#da7756');
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const dc = useDarkColors();
  const isDark = useIsDark();

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name || '');
      setDescription(projectToEdit.description || '');
      setCustomInstructions(projectToEdit.custom_instructions || '');
      setColor(projectToEdit.color || '#da7756');
      setSelectedDocIds(projectToEdit.documents?.map((d) => d.id) || []);
    } else {
      setName('');
      setDescription('');
      setCustomInstructions('');
      setColor('#da7756');
      setSelectedDocIds([]);
    }
  }, [projectToEdit, isOpen]);

  const toggleDocSelection = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      let savedProj = null;
      if (projectToEdit?.id) {
        savedProj = await updateProject(projectToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          customInstructions: customInstructions.trim(),
          color,
        });
      } else {
        const res = await createProject({
          name: name.trim(),
          description: description.trim(),
          customInstructions: customInstructions.trim(),
          color,
        });
        savedProj = res.project;
      }

      // Link any selected documents
      if (savedProj?.id && selectedDocIds.length > 0) {
        for (const docId of selectedDocIds) {
          try {
            await addDocumentToProject(savedProj.id, docId);
          } catch (e) {
            console.error('Failed to link document:', e);
          }
        }
      }

      onProjectSaved?.(savedProj);
      onClose();
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('Failed to save project: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectToEdit?.id) return;
    if (!confirm(`Are you sure you want to delete project "${projectToEdit.name}"? Documents will be preserved.`)) return;

    setSaving(true);
    try {
      await deleteProject(projectToEdit.id);
      onProjectSaved?.(null);
      onClose();
    } catch (err) {
      alert('Failed to delete project: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden"
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
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Folder size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {projectToEdit ? 'Edit Project Folder' : 'New Claude-Style Project'}
              </h2>
              <p className="text-xs" style={{ color: dc.textSecondary }}>
                Group documents, set dedicated project instructions, and chat across files
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Project Name & Color */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: dc.textSecondary }}>
              Project Name *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. M&A Due Diligence - Alpha Corp"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                style={{
                  backgroundColor: isDark ? '#18181b' : '#fafafa',
                  borderColor: isDark ? '#27272a' : '#e4e4e7',
                  color: dc.textPrimary,
                }}
              />
              {/* Color dots picker */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check size={11} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: dc.textSecondary }}>
              Objective / Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Cross-referencing 10 supplier agreements against standard liability terms"
              className="w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              style={{
                backgroundColor: isDark ? '#18181b' : '#fafafa',
                borderColor: isDark ? '#27272a' : '#e4e4e7',
                color: dc.textPrimary,
              }}
            />
          </div>

          {/* Project Custom Instructions (System Prompt for this project) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: dc.textSecondary }}>
                Project Custom Instructions
              </label>
              <span className="text-[10px] text-amber-500 font-medium">
                Claude System Prompt
              </span>
            </div>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. In this project, prioritize California labor law regulations. Always cross-reference indemnity limits across both master and schedule agreements..."
              className="w-full p-3 rounded-xl text-xs border leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
              style={{
                backgroundColor: isDark ? '#18181b' : '#fafafa',
                borderColor: isDark ? '#27272a' : '#e4e4e7',
                color: dc.textPrimary,
              }}
            />
          </div>

          {/* Attach Existing Documents */}
          {existingDocuments.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: dc.textSecondary }}>
                Attach Project Documents ({selectedDocIds.length} selected)
              </label>
              <div 
                className="max-h-40 overflow-y-auto rounded-xl border p-2 space-y-1.5 divide-y"
                style={{
                  backgroundColor: isDark ? '#18181b' : '#fafafa',
                  borderColor: isDark ? '#27272a' : '#e4e4e7',
                  divideColor: isDark ? '#27272a' : '#f0f0f2',
                }}
              >
                {existingDocuments.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-slate-500/5 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileText size={14} className="shrink-0 text-slate-400" />
                        <span className="text-xs font-medium truncate">{doc.file_name || doc.fileName}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-400'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{ borderColor: isDark ? '#27272a' : '#f4f4f5', backgroundColor: isDark ? '#101014' : '#fafafa' }}
        >
          {projectToEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
            >
              <Trash2 size={13} /> Delete Project
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              style={{ borderColor: dc.borderPrimary }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
              {projectToEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsModal;
