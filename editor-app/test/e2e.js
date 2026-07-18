// shortgen Editor の一連の操作をヘッドレスブラウザで再現する動作確認スクリプト。
// 各ステップの結果と、ブラウザのconsole.error/pageerrorを集約してレポートする。
const {chromium} = require('playwright');
const path = require('path');
const fs = require('fs');

const BROWSER_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE_URL = 'http://localhost:5173';
const SHOT_DIR = path.join(__dirname, 'shots');
const SP_MEDIA = '/tmp/claude-0/-home-user-video-generator/fafb2077-b937-5c4c-ad30-63587c0624c1/scratchpad/testmedia';

fs.mkdirSync(SHOT_DIR, {recursive: true});

const results = [];
const consoleErrors = [];
const pageErrors = [];

function step(name, fn) {
  return async (page) => {
    try {
      await fn(page);
      results.push({name, ok: true});
      console.log(`✅ ${name}`);
    } catch (e) {
      results.push({name, ok: false, error: e.message});
      console.log(`❌ ${name}: ${e.message}`);
    }
  };
}

async function shot(page, name) {
  await page.screenshot({path: path.join(SHOT_DIR, `${name}.png`)});
}

async function main() {
  const browser = await chromium.launch({executablePath: BROWSER_PATH, headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const steps = [
    step('起動: ページ読み込み', async (p) => {
      await p.goto(BASE_URL, {waitUntil: 'networkidle', timeout: 20000});
      await p.waitForSelector('.app', {timeout: 10000});
      await shot(p, '01_initial');
    }),

    step('メディアアップロード: 動画/画像/音声', async (p) => {
      const input = await p.locator('input[type=file]');
      await input.setInputFiles([
        path.join(SP_MEDIA, 'test_video.mp4'),
        path.join(SP_MEDIA, 'test_image.png'),
        path.join(SP_MEDIA, 'test_audio.mp3'),
      ]);
      await p.waitForFunction(
        () => document.querySelectorAll('.media-item').length >= 3,
        {timeout: 15000}
      );
      await shot(p, '02_media_uploaded');
    }),

    step('ダブルクリックで動画をタイムラインに追加', async (p) => {
      const before = await p.locator('.track-row .clip').count();
      await p.locator('.media-item', {hasText: 'test_video.mp4'}).dblclick();
      await p.waitForFunction(
        (n) => document.querySelectorAll('.track-row .clip').length > n,
        before,
        {timeout: 5000}
      );
      await shot(p, '03_video_clip_added');
    }),

    step('ダブルクリックで音声を追加(音声トラック自動作成)', async (p) => {
      const beforeTracks = await p.locator('.track-header').count();
      await p.locator('.media-item', {hasText: 'test_audio.mp3'}).dblclick();
      await p.waitForFunction(
        (n) => document.querySelectorAll('.track-header').length > n,
        beforeTracks,
        {timeout: 5000}
      );
      const audioBadge = await p.locator('.track-header .badge', {hasText: '音声'}).count();
      if (audioBadge < 1) throw new Error('音声トラックが自動作成されていない');
      await shot(p, '04_audio_clip_added');
    }),

    step('テキストクリップを追加', async (p) => {
      const before = await p.locator('.track-row .clip').count();
      await p.locator('button', {hasText: '＋ テキストを追加'}).click();
      await p.waitForFunction(
        (n) => document.querySelectorAll('.track-row .clip').length > n,
        before,
        {timeout: 5000}
      );
      const inspectorField = await p.locator('.inspector-field textarea').count();
      if (inspectorField < 1) throw new Error('テキスト追加後インスペクタにtextareaが表示されない');
      await shot(p, '05_text_clip_added');
    }),

    step('インスペクタでテキスト編集がクリップに反映される', async (p) => {
      const textarea = p.locator('.inspector-field textarea');
      await textarea.fill('動作確認テキスト');
      await p.waitForFunction(
        () => {
          const el = [...document.querySelectorAll('.clip .clip-body')]
            .find((n) => n.textContent.includes('動作確認テキスト'));
          return !!el;
        },
        {timeout: 5000}
      );
      await shot(p, '06_text_edited');
    }),

    step('画像メディアをタイムラインへ実際にドラッグ&ドロップ', async (p) => {
      const mediaItem = p.locator('.media-item', {hasText: 'test_image.png'});
      const videoTrackRow = p.locator('.track-row[data-track-id]').last();
      const before = await p.locator('.track-row .clip').count();

      const srcBox = await mediaItem.boundingBox();
      const dstBox = await videoTrackRow.boundingBox();
      if (!srcBox || !dstBox) throw new Error('ドラッグ元/先の要素が見つからない');

      // HTML5 DnD はネイティブイベント経由でのみ発火するため、CDP経由でマウス操作しつつ
      // dragstart/dragover/drop を手動ディスパッチしてDataTransferを引き継ぐ。
      await p.evaluate(() => {
        window.__dtBridge = null;
      });
      await mediaItem.hover();
      await p.mouse.down();
      await p.mouse.move(dstBox.x + 100, dstBox.y + dstBox.height / 2, {steps: 10});
      await p.mouse.up();

      // Playwrightの mouse.down/up だけではHTML5 draggable要素のDnDは発火しないため、
      // 発火しなかった場合に備えてフォールバック検証(ダブルクリックは別ステップで確認済み)。
      const after = await p.locator('.track-row .clip').count();
      if (after <= before) {
        throw new Error('マウスドラッグではclipが増えなかった(HTML5 DnDのPlaywright制約。ダブルクリック経路は別途確認済み)');
      }
      await shot(p, '07_dragdrop');
    }),

    step('クリップ選択→トリム(右端ドラッグ)', async (p) => {
      const clip = p.locator('.track-row .clip').first();
      await clip.click();
      const box = await clip.boundingBox();
      if (!box) throw new Error('clipのboundingBoxが取得できない');
      const widthBefore = box.width;
      const edge = p.locator('.track-row .clip').first().locator('.edge.right');
      const edgeBox = await edge.boundingBox();
      await p.mouse.move(edgeBox.x + 2, edgeBox.y + edgeBox.height / 2);
      await p.mouse.down();
      await p.mouse.move(edgeBox.x - 30, edgeBox.y + edgeBox.height / 2, {steps: 5});
      await p.mouse.up();
      await p.waitForTimeout(300);
      const boxAfter = await clip.boundingBox();
      if (Math.abs(boxAfter.width - widthBefore) < 5) {
        throw new Error(`トリムしても幅が変化しない (before=${widthBefore}, after=${boxAfter.width})`);
      }
      await shot(p, '08_trimmed');
    }),

    step('分割(S キー)', async (p) => {
      const clip = p.locator('.track-row .clip').first();
      await clip.click();
      const before = await p.locator('.track-row .clip').count();
      // 再生ヘッドをクリップ中央あたりへ
      const ruler = p.locator('.ruler');
      const rulerBox = await ruler.boundingBox();
      await p.mouse.click(rulerBox.x + 60, rulerBox.y + 10);
      await p.keyboard.press('s');
      await p.waitForTimeout(300);
      const after = await p.locator('.track-row .clip').count();
      if (after !== before + 1) {
        throw new Error(`分割してもクリップ数が+1されない (before=${before}, after=${after})`);
      }
      await shot(p, '09_split');
    }),

    step('クリップ削除(Delete キー)', async (p) => {
      const before = await p.locator('.track-row .clip').count();
      await p.locator('.track-row .clip').first().click();
      await p.keyboard.press('Delete');
      await p.waitForTimeout(300);
      const after = await p.locator('.track-row .clip').count();
      if (after !== before - 1) throw new Error(`削除してもクリップ数が-1されない (before=${before}, after=${after})`);
      await shot(p, '10_deleted');
    }),

    step('縦横比切替(16:9へ)', async (p) => {
      const before = await p.locator('.preview-canvas-wrap').boundingBox();
      await p.locator('.toolbar select').first().selectOption('16:9');
      await p.waitForTimeout(300);
      const after = await p.locator('.preview-canvas-wrap').boundingBox();
      if (!(after.width > after.height)) {
        throw new Error(`16:9に切替後もwidth>heightにならない (w=${after.width}, h=${after.height})`);
      }
      if (Math.abs(after.width - before.width) < 5 && Math.abs(after.height - before.height) < 5) {
        throw new Error('縦横比切替でプレビューのサイズが変化していない');
      }
      await shot(p, '11_aspect_16_9');
    }),

    step('縦横比を9:16に戻す', async (p) => {
      await p.locator('.toolbar select').first().selectOption('9:16');
      await p.waitForTimeout(300);
      await shot(p, '12_aspect_9_16');
    }),

    step('再生ボタンでPlayerが再生状態になる', async (p) => {
      await p.locator('.preview-controls button', {hasText: '▶'}).click();
      await p.waitForTimeout(600);
      const isPaused = await p.evaluate(() => {
        const video = document.querySelector('.preview-canvas-wrap video');
        return video ? video.paused : null;
      });
      // Remotion Playerは内部でcanvasかvideoタグを使う実装差があるため、
      // 再生ヘッドのフレームが進んでいるかで判定する
      await p.waitForTimeout(400);
      const tc = await p.locator('.preview-controls .tc').first().textContent();
      if (!tc || tc.startsWith('00:00.00')) {
        throw new Error(`再生してもタイムコードが進んでいない可能性 (tc=${tc})`);
      }
      await p.locator('.preview-controls button', {hasText: '⏸'}).click();
      await shot(p, '13_playing');
    }),

    step('プロジェクト保存', async (p) => {
      await p.locator('button', {hasText: '💾 保存'}).click();
      await p.waitForFunction(
        () => [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('保存しました')),
        {timeout: 5000}
      );
      await shot(p, '14_saved');
    }),

    step('プロジェクト一覧モーダルに保存済みプロジェクトが表示される', async (p) => {
      await p.locator('button', {hasText: '📁 開く'}).click();
      await p.waitForSelector('.modal');
      await p.waitForFunction(
        () => document.querySelectorAll('.project-list-item').length >= 1,
        {timeout: 5000}
      );
      await shot(p, '15_projects_modal');
      await p.locator('.modal button', {hasText: '閉じる'}).click();
    }),

    step('新規プロジェクトでタイムラインがリセットされる', async (p) => {
      await p.locator('button', {hasText: '📁 開く'}).click();
      await p.waitForSelector('.modal');
      await p.locator('button', {hasText: '＋ 新規プロジェクト'}).click();
      await p.waitForTimeout(300);
      const clipCount = await p.locator('.track-row .clip').count();
      if (clipCount !== 0) throw new Error(`新規プロジェクトなのにclipが残っている (count=${clipCount})`);
      await shot(p, '16_new_project');
    }),

    step('保存したプロジェクトを再読込できる', async (p) => {
      await p.locator('button', {hasText: '📁 開く'}).click();
      await p.waitForSelector('.modal');
      await p.locator('.project-list-item').first().click();
      await p.waitForTimeout(500);
      const clipCount = await p.locator('.track-row .clip').count();
      if (clipCount < 1) throw new Error('保存済みプロジェクトを開いてもclipが復元されない');
      await shot(p, '17_reloaded_project');
    }),

    step('書き出し(レンダリング→ダウンロードリンク表示)', async (p) => {
      await p.locator('button', {hasText: '🎬 書き出し'}).click();
      await p.waitForSelector('.modal');
      await p.locator('.modal button', {hasText: '🎬 レンダリング開始'}).click();
      await p.waitForFunction(
        () => {
          const modal = document.querySelector('.modal');
          return modal && (modal.textContent.includes('完成しました') || modal.textContent.includes('失敗'));
        },
        {timeout: 120000}
      );
      const failed = await p.locator('.modal', {hasText: '失敗'}).count();
      if (failed > 0) {
        const msg = await p.locator('.modal pre').textContent().catch(() => '(詳細取得失敗)');
        throw new Error(`書き出しがエラー終了: ${msg}`);
      }
      await shot(p, '18_export_done');
      const href = await p.locator('.modal a', {hasText: 'ダウンロード'}).getAttribute('href');
      if (!href) throw new Error('ダウンロードリンクが見つからない');
      const resp = await p.request.get(BASE_URL.replace('5173', '8787') + href);
      if (!resp.ok()) throw new Error(`ダウンロードURLが200を返さない: ${resp.status()}`);
      const buf = await resp.body();
      if (buf.length < 1000) throw new Error(`ダウンロードされたmp4が小さすぎる (${buf.length} bytes)`);
      fs.writeFileSync(path.join(SHOT_DIR, '..', 'export_test_output.mp4'), buf);
    }),
  ];

  for (const s of steps) {
    // eslint-disable-next-line no-await-in-loop
    await s(page);
  }

  await browser.close();

  console.log('\n=== console.error ===');
  consoleErrors.forEach((e) => console.log('  ' + e));
  console.log('=== pageerror ===');
  pageErrors.forEach((e) => console.log('  ' + e));

  const failCount = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failCount}/${results.length} ステップ成功`);

  fs.writeFileSync(
    path.join(__dirname, 'results.json'),
    JSON.stringify({results, consoleErrors, pageErrors}, null, 2)
  );

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('テストスクリプト自体が失敗:', e);
  process.exit(2);
});
