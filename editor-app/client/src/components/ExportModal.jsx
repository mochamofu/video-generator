import {useEffect, useRef, useState} from 'react';
import {useEditorStore} from '../store/editorStore';
import {api} from '../util/api';

export default function ExportModal({onClose}) {
  const project = useEditorStore((s) => s.project);
  const addToast = useEditorStore((s) => s.addToast);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null); // {state, progress, message}
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);

  async function start() {
    setStarting(true);
    try {
      const {jobId: id} = await api.startRender(project);
      setJobId(id);
      setStatus({state: 'running', progress: 0});
    } catch (e) {
      addToast(`書き出し開始に失敗: ${e.message}`, 'error');
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (!jobId) return undefined;
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.getRenderStatus(jobId);
        setStatus(s);
        if (s.state === 'done' || s.state === 'error') {
          clearInterval(pollRef.current);
        }
      } catch (e) {
        clearInterval(pollRef.current);
        setStatus({state: 'error', message: e.message});
      }
    }, 1500);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{minWidth: 360}}>
        <h3>書き出し</h3>
        <div style={{marginBottom: 12, fontSize: 12, color: 'var(--text-dim)'}}>
          {project.width}×{project.height} / {project.fps}fps ・ 「{project.name}」
        </div>

        {!jobId && (
          <button className="primary" style={{width: '100%'}} disabled={starting} onClick={start}>
            {starting ? '開始中…' : '🎬 レンダリング開始'}
          </button>
        )}

        {jobId && status && status.state === 'running' && (
          <div>
            <div style={{background: 'var(--bg-1)', borderRadius: 8, overflow: 'hidden', height: 18}}>
              <div
                style={{
                  width: `${Math.round((status.progress || 0) * 100)}%`,
                  background: 'var(--accent)', height: '100%', transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{marginTop: 8, fontSize: 12, textAlign: 'center'}}>
              {Math.round((status.progress || 0) * 100)}% レンダリング中…
            </div>
          </div>
        )}

        {jobId && status && status.state === 'done' && (
          <div style={{textAlign: 'center'}}>
            <div style={{marginBottom: 10}}>✅ 完成しました</div>
            <a
              className="primary"
              style={{display: 'inline-block', textDecoration: 'none', padding: '8px 20px', borderRadius: 6}}
              href={api.downloadUrl(jobId)}
              download
            >
              ダウンロード
            </a>
          </div>
        )}

        {jobId && status && status.state === 'error' && (
          <div style={{color: 'var(--danger)'}}>
            <div>❌ 書き出しに失敗しました</div>
            <pre style={{whiteSpace: 'pre-wrap', fontSize: 10, maxHeight: 180, overflow: 'auto'}}>
              {status.message}
            </pre>
            <button onClick={() => { setJobId(null); setStatus(null); }}>再試行</button>
          </div>
        )}

        <button style={{marginTop: 14}} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
