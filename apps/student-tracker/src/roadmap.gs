/**
 * 生徒個別管理表 — ロードマップ定義
 *
 * 既存の「【SnsClub】初投稿までのタスク管理表」の内容をデータ化したものです。
 * カリキュラムが変わったらここを編集してください。
 * days = 目安日数（生徒の開始日からこの日数を足して目標期日を自動計算します）
 */

var ROADMAP = [
  {
    program: 'スタータープログラム',
    steps: [
      { step: 1, task: 'ツール登録 / アウトプットの重要性', detail: '1. Discordの使い方を覚える 2. クラスチャットで自己紹介 3. SnsClubカレンダー追加 4. スタートアンケート記入', link: 'https://www.notion.so/Day-1-23ff3b0fba858060af9be457988d5cb9', days: 1 },
      { step: 2, task: 'ラジオ視聴', detail: '1. SnsClubポータルをブックマーク 2. SnsClubラジオを聴く 3. アウトプットの重要性の記事を読む 4. 学んだことをアウトプット', link: 'https://www.notion.so/Day-2-SnsClub-23ff3b0fba8580c08d4df4035c2abbef', days: 1 },
      { step: 3, task: '特別講義視聴', detail: '1. マインドセット動画を視聴 2. 特別講義動画を視聴 3. 学んだことをアウトプット', link: 'https://www.notion.so/Day-3-23ff3b0fba8580bca052f78725896f55', days: 1 },
      { step: 4, task: '夢と目標設定', detail: '1. やりたいことリストに記入 2. リストのリンクをクラスに提出', link: 'https://www.notion.so/Day-4-23ff3b0fba858070a01fffc7ec781bc6', days: 1 },
      { step: 5, task: 'マインド系の生徒対談視聴', detail: '1. 成果を出している生徒さんの動画を視聴 2. 要約・アウトプット 3. Discordでクラスチャットに提出', link: 'https://www.notion.so/Day-5-23ff3b0fba8580d9b7d1de432e35a72a', days: 1 },
      { step: 6, task: 'マネタイズ系の生徒対談視聴', detail: '1. 生徒対談動画を1本視聴 2. 学びをクラスチャットでアウトプット', link: 'https://www.notion.so/Day-6-23ff3b0fba858033a865e31c88cd83c2', days: 1 },
      { step: 7, task: 'Capcut基礎操作', detail: '1. CapCutとEditsをスマホにダウンロード 2. 基本操作動画を視聴 3. 学んだことをアウトプット', link: 'https://www.notion.so/Day-7-Capcut-23ff3b0fba85803e9ed4cb5f507dfb3f', days: 1 },
      { step: 8, task: 'テロップとカット練習', detail: '1. 参考動画（ストーリー加工例）を確認 2. 素材動画を編集しテロップまで完成 3. Discordのクラスに提出', link: 'https://www.notion.so/Day-8-23ff3b0fba85808ab2d7ff34b3afc5dc', days: 1 },
      { step: 9, task: '商品紹介動画素材撮影', detail: '1. 撮影テーマ（商品紹介動画）を確認 2. 指定カットを撮影して素材を用意 3. Discordのクラスへ提出', link: 'https://www.notion.so/Day-9-23ff3b0fba858089933bdd33f0bdc7fe', days: 1 },
      { step: 10, task: '商品紹介動画編集', detail: '1. カット＋テロップ＋アフレコで1本に編集 2. 完成動画をクラスに提出', link: 'https://www.notion.so/Day-10-23ff3b0fba85809b93fbe5baaaa91048', days: 1 }
    ]
  },
  {
    program: 'アカウント設計プログラム',
    steps: [
      { step: 1, task: 'エスキャンの登録', detail: '1. エスキャンに登録する', link: 'https://www.notion.so/STEP1-23cf3b0fba8580b89e30f93aa0badc12', days: 1 },
      { step: 2, task: '初期設計動画の視聴', detail: '1. 初期設計動画を視聴 2. 学んだことをアウトプット', link: 'https://www.notion.so/STEP2-23cf3b0fba8580bfbb32c1fe02ede393', days: 1 },
      { step: 3, task: '自己分析', detail: '1. 自己分析シートを記入 2. シートのリンクをクラスに提出', link: 'https://www.notion.so/STEP3-23cf3b0fba85804aa874e879cf6be410', days: 1 },
      { step: 4, task: '初期設計', detail: '1. 初期設計シートをリストアップ 2. シートのリンクをクラスに提出', link: 'https://www.notion.so/STEP5-23cf3b0fba85807eadfdc5a77bea1c54', days: 3 },
      { step: 5, task: '1on1の予約と実施', detail: '1. 1on1を予約 2. 1on1を受けて初期設計の方向性を決定', link: 'https://www.notion.so/STEP6-1on1-23cf3b0fba8580898613dd4beebfab7d', days: 10 }
    ]
  },
  {
    program: '投稿スタータープログラム',
    steps: [
      { step: 1, task: 'ショート動画講義の視聴', detail: '1. ショート動画講義を視聴 2. 学んだことをアウトプット', link: 'https://www.notion.so/STEP1-23ff3b0fba858106914cd102d70433ef', days: 1 },
      { step: 2, task: '競合リサーチ', detail: '1. 競合アカウントを100リストアップ 2. シートのリンクをクラスに提出', link: 'https://www.notion.so/STEP4-23cf3b0fba858094b2dac2aa1b47f797', days: 3 },
      { step: 3, task: 'バズ投稿リサーチ', detail: '1. バズ投稿を100個リストアップ 2. シートのリンクをクラスに提出', link: 'https://www.notion.so/STEP2-23ff3b0fba8581088932fe6c492947e1', days: 3 },
      { step: 4, task: 'キャッチコピー講義の視聴', detail: '1. キャッチコピー講義を視聴 2. 学んだことをアウトプット', link: 'https://www.notion.so/STEP3-23ff3b0fba858128afb2df6d79a4cab4', days: 1 },
      { step: 5, task: 'プロフィール作成', detail: '1. プロフィール作成動画を視聴 2. プロフィールを作成しフィードバックをもらう 3. Discordプロフィールにアカウントを貼る 4. 生徒アカウント登録フォームに回答', link: 'https://www.notion.so/STEP8-23cf3b0fba85808984adff9900b59cbf', days: 2 },
      { step: 6, task: 'リール台本・素材模写', detail: '1. リール台本模写シートを記入 2. シートのリンクをクラスに提出', link: 'https://www.notion.so/STEP4-23ff3b0fba85814f8b1dd7d62225d1c4', days: 3 },
      { step: 7, task: '競合リール動画模倣', detail: '1. 分析した動画から1つ選び同様の動画を作成 2. 完成動画をクラスに提出', link: 'https://www.notion.so/STEP5-243f3b0fba8580d391ebdc732410a1ee', days: 3 },
      { step: 8, task: 'アカウント作成', detail: '1. Instagramアカウント作成→プロアカウント化 2. TikTok/Youtubeアカウントも作成 3. 完了をクラスチャットに報告', link: 'https://www.notion.so/STEP7-23cf3b0fba85806ab662c03c9f7e161e', days: 1 },
      { step: 9, task: 'アイレポート登録', detail: '1. インサイト分析動画を視聴 2. アイレポート登録（PCある方のみ） 3. 競合アカウント30個登録 4. 完了を報告', link: 'https://www.notion.so/STEP9-23cf3b0fba8580698e36c04774406c4b', days: 1 },
      { step: 10, task: '初投稿の動画作成', detail: '1. TTPのラジオで基本を理解 2. 専用シートで台本作成 3. 撮影・編集 4. 添削を受ける 5. 講師OK後に初投稿', link: 'https://www.notion.so/STEP6-23ff3b0fba858163b116f3fa384174fa', days: 7 }
    ]
  }
];
