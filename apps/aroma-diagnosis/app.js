/* ============================================================
 * 香り診断アプリ
 * 質問に直感で答える → 5タイプのアロマブレンドから提案
 * 結果はSupabase (aroma-shindan) に匿名保存されます
 * ============================================================ */

// ---- Supabase設定（公開用キーなのでフロントに置いてOK） ----
const SUPABASE_URL = "https://ibygjngtmbewreeffxhe.supabase.co";
const SUPABASE_KEY = "sb_publishable_yTofU9gArcgMqxJz2iAN4g_nbyEA-Om";

// ---- 注文/予約ページのURL（決まったら差し替えてください） ----
const ORDER_URL = "https://www.instagram.com/";

// ---- 診断タイプ定義 ----
const RESULTS = {
  relax: {
    title: "がんばりすぎたあなたへ",
    blend: "やすらぎブレンド",
    oils: "ラベンダー × ベルガモット",
    desc: "緊張がつづいて、心も体も少しお疲れ気味のようです。やわらかなフローラルと柑橘のブレンドが、はりつめた気持ちをゆっくりほどいてくれます。",
    howto: "夜、ディフューザーで10分。もしくはティッシュに1滴たらして、深呼吸を3回どうぞ。"
  },
  sleep: {
    title: "深い休息が必要なあなたへ",
    blend: "おやすみブレンド",
    oils: "ラベンダー × スイートオレンジ × カモミール",
    desc: "眠りの質が下がっているサインが出ています。心を鎮める3種の精油が、おだやかな眠りへの切り替えをサポートします。",
    howto: "就寝30分前に寝室でディフューザーを。枕元にアロマストーンを置くのもおすすめです。"
  },
  focus: {
    title: "頭をクリアにしたいあなたへ",
    blend: "クリアブレンド",
    oils: "ローズマリー × レモン × ペパーミント",
    desc: "やるべきことに集中したいのに、頭にモヤがかかっている状態かもしれません。すっきりとしたハーブと柑橘が、思考をシャープに整えます。",
    howto: "仕事や勉強の前にディフューザーで。日中の眠気にはハンカチに1滴が手軽です。"
  },
  refresh: {
    title: "気持ちを切り替えたいあなたへ",
    blend: "リフレッシュブレンド",
    oils: "グレープフルーツ × ユーカリ",
    desc: "同じことの繰り返しで、気分が停滞ぎみのようです。はじけるような柑橘とクリアなユーカリが、空気ごと気分を入れ替えてくれます。",
    howto: "朝の身支度中や、午後のリセットタイムに。換気しながら使うとより効果的です。"
  },
  uplift: {
    title: "心に元気を届けたいあなたへ",
    blend: "ひだまりブレンド",
    oils: "ベルガモット × イランイラン × スイートオレンジ",
    desc: "気分が沈みやすく、心のエネルギーが不足ぎみのサインです。あたたかく華やかな香りが、前向きな気持ちをそっと後押しします。",
    howto: "朝いちばんにディフューザーで。お風呂の床に1滴たらして香りを楽しむのも◎（直接肌にはつけないでください）。"
  }
};

// ---- 質問定義（choiceのscoresが各タイプへの加点） ----
const QUESTIONS = [
  {
    q: "最近のあなたに、いちばん近いのは？",
    choices: [
      { label: "寝ても疲れが取れない", scores: { sleep: 2, relax: 1 } },
      { label: "考えごとが多くて頭がパンパン", scores: { focus: 2, refresh: 1 } },
      { label: "なんとなく気分が沈みがち", scores: { uplift: 2, relax: 1 } },
      { label: "毎日が単調でモヤモヤする", scores: { refresh: 2, uplift: 1 } }
    ]
  },
  {
    q: "夜、ベッドに入ってからは？",
    choices: [
      { label: "すぐ眠れるけど朝がつらい", scores: { sleep: 1, refresh: 1 } },
      { label: "なかなか寝つけない", scores: { sleep: 2, relax: 1 } },
      { label: "夜中に目が覚めてしまう", scores: { sleep: 2 } },
      { label: "睡眠は特に問題なし", scores: { focus: 1, uplift: 1 } }
    ]
  },
  {
    q: "今日の「心の天気」を選ぶなら？",
    choices: [
      { label: "☀️ 晴れ。でもちょっと疲れた", scores: { relax: 2 } },
      { label: "☁️ くもり。すっきりしない", scores: { refresh: 2 } },
      { label: "🌧 雨。気持ちが重い", scores: { uplift: 2 } },
      { label: "🌪 嵐。頭の中が忙しい", scores: { focus: 2 } }
    ]
  },
  {
    q: "直感で選んでください。今かぎたい香りは？",
    choices: [
      { label: "ふんわり甘いお花の香り", scores: { relax: 2, uplift: 1 } },
      { label: "皮をむいた瞬間の柑橘の香り", scores: { refresh: 2, uplift: 1 } },
      { label: "スーッと抜けるハーブの香り", scores: { focus: 2 } },
      { label: "森の中にいるような木の香り", scores: { sleep: 1, relax: 2 } }
    ]
  },
  {
    q: "最近の感情の波は？",
    choices: [
      { label: "小さなことでイライラしがち", scores: { relax: 2 } },
      { label: "涙もろくなっている", scores: { uplift: 2 } },
      { label: "感情より、とにかく眠い", scores: { sleep: 2 } },
      { label: "浮き沈みは少なく安定", scores: { focus: 1, refresh: 1 } }
    ]
  },
  {
    q: "いま一番ほしい時間は？",
    choices: [
      { label: "誰にも邪魔されない休息", scores: { relax: 1, sleep: 2 } },
      { label: "集中してやり切る時間", scores: { focus: 2 } },
      { label: "旅行みたいな非日常", scores: { refresh: 2 } },
      { label: "気の合う人と笑い合う時間", scores: { uplift: 2 } }
    ]
  },
  {
    q: "香りをどんな場面で使いたいですか？",
    choices: [
      { label: "寝る前のリラックスタイム", scores: { sleep: 1, relax: 1 } },
      { label: "仕事・勉強のおとも", scores: { focus: 2 } },
      { label: "朝のスタートアップ", scores: { refresh: 1, uplift: 1 } },
      { label: "お風呂やセルフケア中", scores: { relax: 2 } }
    ]
  }
];

// ---- 状態 ----
let current = 0;
const answers = [];
const scores = { relax: 0, sleep: 0, focus: 0, refresh: 0, uplift: 0 };

// ---- 画面制御 ----
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

function startQuiz() {
  current = 0;
  answers.length = 0;
  Object.keys(scores).forEach(k => scores[k] = 0);
  renderQuestion();
  show("screen-quiz");
}

function renderQuestion() {
  const q = QUESTIONS[current];
  document.getElementById("quiz-count").textContent = `Q${current + 1} / ${QUESTIONS.length}`;
  document.getElementById("quiz-question").textContent = q.q;
  document.getElementById("progress-bar").style.width = `${(current / QUESTIONS.length) * 100}%`;
  document.getElementById("btn-back").style.visibility = current === 0 ? "hidden" : "visible";

  const box = document.getElementById("quiz-choices");
  box.innerHTML = "";
  q.choices.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = c.label;
    btn.onclick = () => answer(i);
    box.appendChild(btn);
  });
}

function answer(choiceIndex) {
  answers[current] = choiceIndex;
  current++;
  if (current < QUESTIONS.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

function goBack() {
  if (current === 0) return;
  current--;
  answers.length = current;
  renderQuestion();
}

function computeResult() {
  Object.keys(scores).forEach(k => scores[k] = 0);
  answers.forEach((choiceIndex, qi) => {
    const s = QUESTIONS[qi].choices[choiceIndex].scores;
    Object.entries(s).forEach(([type, pt]) => scores[type] += pt);
  });
  // 最高得点のタイプ（同点はQUESTIONS由来の直感回答を優先するため出現順）
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

function showResult() {
  const type = computeResult();
  const r = RESULTS[type];
  document.getElementById("result-title").textContent = r.title;
  document.getElementById("result-blend").textContent = r.blend;
  document.getElementById("result-oils").textContent = r.oils;
  document.getElementById("result-desc").textContent = r.desc;
  document.getElementById("result-howto").textContent = r.howto;
  document.getElementById("cta-link").href = ORDER_URL;
  show("screen-result");
  saveResult(type, r.blend);
}

function restart() {
  show("screen-start");
}

// ---- Supabaseへ匿名保存（失敗しても画面には影響させない） ----
async function saveResult(type, blend) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/diagnosis_results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        answers: answers.map((c, i) => ({ q: QUESTIONS[i].q, a: QUESTIONS[i].choices[c].label })),
        result_type: type,
        result_blend: blend
      })
    });
  } catch (e) {
    console.warn("結果の保存に失敗しました（診断には影響ありません）", e);
  }
}
