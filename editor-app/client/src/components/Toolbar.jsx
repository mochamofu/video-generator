import {useState} from 'react';
import {useEditorStore} from '../store/editorStore';
import {api} from '../util/api';
import {ASPECT_PRESETS, presetForSize} from '../util/aspect';
import ProjectsModal from './ProjectsModal';
import ExportModal from './ExportModal';

export default function Toolbar() {
  const project = useEditorStore((s) => s.project);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const setAspectRatio = useEditorStore((s) => s.setAspectRatio);
  const isDirty = useEditorStore((s) => s.isDirty);
  const markSaved = useEditorStore((s) => s.markSaved);
  const addToast = useEditorStore((s) => s.addToast);
  const [saving, setSaving] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const currentPreset = presetForSize(project.width, project.height);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await api.saveProject(project);
      markSaved(saved);
      addToast('保存しました');
    } catch (e) {
      addToast(`保存失敗: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleAspectChange(e) {
    const preset = ASPECT_PRESETS.find((p) => p.id === e.target.value);
    if (preset) setAspectRatio(preset.width, preset.height);
  }

  return (
    <div className="toolbar">
      <span className="title">🎬 shortgen Editor</span>
      <input
        style={{width: 180}}
        value={project.name}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="プロジェクト名"
      />
      <select value={currentPreset ? currentPreset.id : ''} onChange={handleAspectChange}>
        {!currentPreset && <option value="">カスタム ({project.width}×{project.height})</option>}
        {ASPECT_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <button onClick={() => setShowProjects(true)}>📁 開く</button>
      <button onClick={handleSave} disabled={saving}>{saving ? '保存中…' : '💾 保存'}</button>
      <div className="spacer" />
      <span className={`status ${isDirty ? 'dirty' : ''}`}>
        {isDirty ? '● 未保存の変更' : '変更なし'}
      </span>
      <button className="primary" onClick={() => setShowExport(true)}>🎬 書き出し</button>
      {showProjects && <ProjectsModal onClose={() => setShowProjects(false)} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
