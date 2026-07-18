import {useEditorStore} from '../store/editorStore';

function findClip(project, clipId) {
  for (const track of project.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return {track, clip};
  }
  return null;
}

export default function Inspector() {
  const project = useEditorStore((s) => s.project);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const updateClip = useEditorStore((s) => s.updateClip);
  const fps = project.fps;

  const found = selectedClipId ? findClip(project, selectedClipId) : null;

  if (!found) {
    return (
      <div className="panel right">
        <div className="panel-header">インスペクタ</div>
        <div className="panel-body">
          <div className="inspector-empty">タイムラインでクリップを選択してください</div>
        </div>
      </div>
    );
  }

  const {clip} = found;
  const set = (patch) => updateClip(clip.id, patch);
  const startSec = (clip.start / fps).toFixed(2);
  const durSec = (clip.duration / fps).toFixed(2);

  return (
    <div className="panel right">
      <div className="panel-header">インスペクタ</div>
      <div className="panel-body">
        <div className="inspector-field">
          <label>種別</label>
          <div>{clip.kind === 'text' ? 'テキスト' : `メディア(${clip.mediaType})`}</div>
        </div>

        <div className="inspector-row inspector-field">
          <div>
            <label>開始(秒)</label>
            <input
              type="number" step="0.1" value={startSec}
              onChange={(e) => set({start: Math.max(0, Math.round(parseFloat(e.target.value || 0) * fps))})}
            />
          </div>
          <div>
            <label>長さ(秒)</label>
            <input
              type="number" step="0.1" min="0.1" value={durSec}
              onChange={(e) => set({duration: Math.max(1, Math.round(parseFloat(e.target.value || 0.1) * fps))})}
            />
          </div>
        </div>

        {clip.kind === 'text' && (
          <>
            <div className="inspector-field">
              <label>テキスト内容</label>
              <textarea value={clip.text} onChange={(e) => set({text: e.target.value})} />
            </div>
            <div className="inspector-row inspector-field">
              <div>
                <label>フォントサイズ</label>
                <input type="number" value={clip.fontSize ?? 80} onChange={(e) => set({fontSize: +e.target.value})} />
              </div>
              <div>
                <label>太さ</label>
                <select value={clip.fontWeight ?? 900} onChange={(e) => set({fontWeight: +e.target.value})}>
                  <option value={400}>標準</option>
                  <option value={700}>太字</option>
                  <option value={900}>極太</option>
                </select>
              </div>
            </div>
            <div className="inspector-row inspector-field">
              <div>
                <label>文字色</label>
                <input type="color" value={clip.color ?? '#ffffff'} onChange={(e) => set({color: e.target.value})} />
              </div>
              <div>
                <label>整列</label>
                <select value={clip.align ?? 'left'} onChange={(e) => set({align: e.target.value})}>
                  <option value="left">左</option>
                  <option value="center">中央</option>
                  <option value="right">右</option>
                </select>
              </div>
            </div>
            <div className="inspector-field">
              <label>背景(CSS色。透明にするには空欄)</label>
              <input
                type="text" value={clip.background ?? ''} placeholder="rgba(0,0,0,0.45)"
                onChange={(e) => set({background: e.target.value || 'transparent'})}
              />
            </div>
            <div className="inspector-field">
              <label>アニメーション</label>
              <select value={clip.animation ?? 'spring'} onChange={(e) => set({animation: e.target.value})}>
                <option value="none">なし</option>
                <option value="spring">スプリング(飛び込み)</option>
                <option value="fade">フェード</option>
              </select>
            </div>
            <div className="inspector-row inspector-field">
              <div>
                <label>X座標(px)</label>
                <input type="number" value={Math.round(clip.x ?? 0)} onChange={(e) => set({x: +e.target.value})} />
              </div>
              <div>
                <label>Y座標(px)</label>
                <input type="number" value={Math.round(clip.y ?? 0)} onChange={(e) => set({y: +e.target.value})} />
              </div>
            </div>
            <div className="inspector-field">
              <label>幅(px・折返し)</label>
              <input type="number" value={clip.width ?? 800} onChange={(e) => set({width: +e.target.value})} />
            </div>
          </>
        )}

        {clip.kind === 'media' && (
          <>
            {clip.mediaType !== 'image' && (
              <div className="inspector-field">
                <label>音量 ({Math.round((clip.volume ?? 1) * 100)}%)</label>
                <input
                  type="range" min="0" max="1" step="0.05" value={clip.volume ?? 1}
                  onChange={(e) => set({volume: +e.target.value})}
                />
              </div>
            )}
            {clip.mediaType !== 'audio' && (
              <>
                <div className="inspector-field">
                  <label>フィット</label>
                  <select value={clip.objectFit ?? 'cover'} onChange={(e) => set({objectFit: e.target.value})}>
                    <option value="cover">カバー(はみ出しトリミング)</option>
                    <option value="contain">全体を収める</option>
                  </select>
                </div>
                <div className="inspector-row inspector-field">
                  <div>
                    <label>X座標(px)</label>
                    <input type="number" value={Math.round(clip.x ?? 0)} onChange={(e) => set({x: +e.target.value})} />
                  </div>
                  <div>
                    <label>Y座標(px)</label>
                    <input type="number" value={Math.round(clip.y ?? 0)} onChange={(e) => set({y: +e.target.value})} />
                  </div>
                </div>
                <div className="inspector-row inspector-field">
                  <div>
                    <label>幅(px)</label>
                    <input type="number" value={Math.round(clip.width ?? project.width)} onChange={(e) => set({width: +e.target.value})} />
                  </div>
                  <div>
                    <label>高さ(px)</label>
                    <input type="number" value={Math.round(clip.height ?? project.height)} onChange={(e) => set({height: +e.target.value})} />
                  </div>
                </div>
                <button
                  onClick={() => set({x: 0, y: 0, width: project.width, height: project.height})}
                  style={{width: '100%'}}
                >
                  画面いっぱいに合わせる
                </button>
              </>
            )}
            {clip.mediaType === 'video' && (
              <div className="inspector-field" style={{marginTop: 10}}>
                <label>トリム(イン点)</label>
                <div>{((clip.trimStart || 0) / fps).toFixed(2)}秒〜(タイムラインのクリップ端をドラッグして調整)</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
