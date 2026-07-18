import {useEffect, useRef, useState} from 'react';
import {useEditorStore} from '../store/editorStore';
import {api} from '../util/api';

const ICONS = {video: '🎬', image: '🖼️', audio: '🎵'};

export const MEDIA_DRAG_MIME = 'application/x-shortgen-media';

export default function MediaBin() {
  const mediaBin = useEditorStore((s) => s.mediaBin);
  const setMediaBin = useEditorStore((s) => s.setMediaBin);
  const removeMediaItem = useEditorStore((s) => s.removeMediaItem);
  const addToast = useEditorStore((s) => s.addToast);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.listMedia().then(setMediaBin).catch((e) => addToast(`メディア一覧の取得に失敗: ${e.message}`, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const res = await api.uploadMedia(files);
      for (const item of res.items) useEditorStore.getState().addMediaItem(item);
      if (res.errors && res.errors.length) {
        for (const e of res.errors) addToast(`${e.filename}: ${e.error}`, 'error');
      }
      if (res.items.length) addToast(`${res.items.length}件のメディアを追加しました`);
    } catch (e) {
      addToast(`アップロード失敗: ${e.message}`, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteMedia(id);
      removeMediaItem(id);
    } catch (e) {
      addToast(`削除失敗: ${e.message}`, 'error');
    }
  }

  function onDragStart(e, item) {
    e.dataTransfer.setData(MEDIA_DRAG_MIME, JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div className="panel">
      <div className="panel-header">メディアビン</div>
      <div className="panel-body">
        <div
          className={`dropzone ${dragOver ? 'hover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          {uploading ? 'アップロード中…' : '📥 クリック or ドラッグで\n動画・画像・音声を追加'}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*,audio/*"
          style={{display: 'none'}}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        {mediaBin.length === 0 && (
          <div className="inspector-empty">まだメディアがありません</div>
        )}
        {mediaBin.map((item) => (
          <div
            key={item.id}
            className="media-item"
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            onDoubleClick={() => useEditorStore.getState().addMediaAtPlayhead(item)}
            title={`${item.filename} (ダブルクリックで再生ヘッド位置に追加)`}
          >
            <div className="thumb">
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt="" />
              ) : (
                ICONS[item.mediaType] || '📄'
              )}
            </div>
            <div className="meta">
              <div className="fn">{item.filename}</div>
              <div className="sub">
                {ICONS[item.mediaType]} {item.durationSeconds ? `${item.durationSeconds.toFixed(1)}s` : '静止画'}
              </div>
            </div>
            <button className="del danger icon" onClick={() => handleDelete(item.id)} title="削除">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
