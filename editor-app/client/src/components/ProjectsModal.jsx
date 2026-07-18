import {useEffect, useState} from 'react';
import {useEditorStore} from '../store/editorStore';
import {api} from '../util/api';

export default function ProjectsModal({onClose}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadProject = useEditorStore((s) => s.loadProject);
  const newProject = useEditorStore((s) => s.newProject);
  const addToast = useEditorStore((s) => s.addToast);

  useEffect(() => {
    api.listProjects().then((l) => { setList(l); setLoading(false); })
      .catch((e) => { addToast(`一覧取得失敗: ${e.message}`, 'error'); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function open(id) {
    try {
      const p = await api.getProject(id);
      loadProject(p);
      addToast(`「${p.name}」を開きました`);
      onClose();
    } catch (e) {
      addToast(`読み込み失敗: ${e.message}`, 'error');
    }
  }

  async function remove(id, e) {
    e.stopPropagation();
    if (!confirm('このプロジェクトを削除しますか?')) return;
    try {
      await api.deleteProject(id);
      setList((l) => l.filter((p) => p.id !== id));
    } catch (e2) {
      addToast(`削除失敗: ${e2.message}`, 'error');
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>プロジェクトを開く</h3>
        <button
          className="primary"
          style={{width: '100%', marginBottom: 10}}
          onClick={() => { newProject(); onClose(); }}
        >
          ＋ 新規プロジェクト
        </button>
        {loading && <div className="inspector-empty">読み込み中…</div>}
        {!loading && list.length === 0 && <div className="inspector-empty">保存済みプロジェクトはありません</div>}
        {list.map((p) => (
          <div key={p.id} className="project-list-item" onClick={() => open(p.id)} style={{cursor: 'pointer'}}>
            <div>
              <div>{p.name || '(無題)'}</div>
              <div style={{fontSize: 10, color: 'var(--text-dim)'}}>
                {p.width}×{p.height} ・ {new Date(p.updatedAt).toLocaleString('ja-JP')}
              </div>
            </div>
            <button className="danger" onClick={(e) => remove(p.id, e)}>削除</button>
          </div>
        ))}
        <button style={{marginTop: 12}} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
