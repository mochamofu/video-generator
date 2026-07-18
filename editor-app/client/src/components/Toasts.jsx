import {useEditorStore} from '../store/editorStore';

export default function Toasts() {
  const toasts = useEditorStore((s) => s.toasts);
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === 'error' ? 'error' : ''}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
