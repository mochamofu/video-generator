import {useEffect} from 'react';
import {useEditorStore} from './store/editorStore';
import Toolbar from './components/Toolbar';
import MediaBin from './components/MediaBin';
import PreviewPlayer from './components/PreviewPlayer';
import Timeline from './components/Timeline';
import Inspector from './components/Inspector';
import Toasts from './components/Toasts';

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function App() {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const deleteClip = useEditorStore((s) => s.deleteClip);
  const splitClipAtPlayhead = useEditorStore((s) => s.splitClipAtPlayhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);

  useEffect(() => {
    function onKeyDown(e) {
      if (isEditableTarget(document.activeElement)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          deleteClip(selectedClipId);
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (selectedClipId) {
          e.preventDefault();
          splitClipAtPlayhead();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedClipId, deleteClip, splitClipAtPlayhead, isPlaying, setIsPlaying]);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-area">
        <MediaBin />
        <PreviewPlayer />
        <Inspector />
      </div>
      <Timeline />
      <Toasts />
    </div>
  );
}
