// しりとり最短：手札の言葉だけで、出発の言葉から目的の言葉までしりとりでつなぐ。make(seed, lv) が種から問題を作る。
(function (root) {
  "use strict";
  const W = typeof module !== "undefined" ? require("./words.js") : root.SH_WORDS;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function seedOf(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // 字のきまり：小さい字は大きい字に（ゃ→や）。のばす棒「ー」で終わるときは、その前の字
  const BIG = { ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お", っ: "つ", ゃ: "や", ゅ: "ゆ", ょ: "よ", ゎ: "わ", ゕ: "か", ゖ: "け" };
  const big = (ch) => BIG[ch] || ch;
  const head = (r) => big(r[0]);
  const tail = (r) => { let i = r.length - 1; while (i > 0 && r[i] === "ー") i--; return big(r[i]); };
  // 問題の種類：つなぐ言葉の数（最短）と手札の枚数
  const LV = [
    { name: "ひと息", len: 2, hand: 6 },
    { name: "ふた息", len: 3, hand: 8 },
    { name: "ながい道", len: 4, hand: 10 },
  ];
  const HARD = { name: "上級", len: 5, hand: 12 };
  const byHead = {}; W.forEach((w, i) => { (byHead[head(w[1])] = byHead[head(w[1])] || []).push(i); });
  // 手札だけで、出発から目的まで最短何枚か。返り値 { d, ways }（つなげないと d=-1）
  function shortest(s, g, hand) {
    const goal = head(W[g][1]); let front = [{ last: tail(W[s][1]), used: [] }], d = 0, ways = 0;
    if (tail(W[s][1]) === goal) return { d: 0, ways: 1 };
    while (front.length && d < hand.length) {
      d++; const nf = [];
      for (const f of front) for (const h of hand) { if (f.used.includes(h) || head(W[h][1]) !== f.last) continue; const u = f.used.concat(h); if (tail(W[h][1]) === goal) ways++; else nf.push({ last: tail(W[h][1]), used: u }); }
      if (ways) return { d, ways };
      front = nf;
    }
    return { d: -1, ways: 0 };
  }
  // いまの字 last から、残りの札 avail で目的の字 goal まで最短何枚か（つなげないと -1）
  function rest(last, goal, avail) {
    if (last === goal) return 0;
    let front = [{ last, used: [] }];
    for (let d = 1; d <= avail.length; d++) { const nf = []; for (const f of front) for (const h of avail) { if (f.used.includes(h) || head(W[h][1]) !== f.last) continue; if (tail(W[h][1]) === goal) return d; nf.push({ last: tail(W[h][1]), used: f.used.concat(h) }); } if (!nf.length) return -1; front = nf; }
    return -1;
  }
  // ヒント：いまの字で始まり、目的にいちばん早く着ける札
  function best(last, g, avail) {
    let b = null, bd = 1e9; const goal = head(W[g][1]);
    for (const h of avail) { if (head(W[h][1]) !== last) continue; const r = rest(tail(W[h][1]), goal, avail.filter((x) => x !== h)); if (r >= 0 && r < bd) { bd = r; b = h; } }
    return b;
  }
  function make(seed, L) {
    const R = rng(seed), pick = (a) => a[Math.floor(R() * a.length)];
    for (let t = 0; t < 3000; t++) {
      // 1. 正しい道を作る：出発 → 札1 → … → 札len → 目的。字は重ねない（近道ができないように）
      const s = Math.floor(R() * W.length), chain = [], letters = [tail(W[s][1])];
      let ok = true;
      for (let k = 0; k < L.len; k++) {
        const c = (byHead[letters[letters.length - 1]] || []).filter((i) => i !== s && !chain.includes(i) && !letters.includes(tail(W[i][1])));
        if (!c.length) { ok = false; break; }
        const w = pick(c); chain.push(w); letters.push(tail(W[w][1]));
      }
      if (!ok) continue;
      const gs = (byHead[letters[letters.length - 1]] || []).filter((i) => i !== s && !chain.includes(i));
      if (!gs.length) continue;
      const g = pick(gs);
      // 2. まよう札：道の途中の字で始まる（選びたくなる）が、近道にならない札
      const hand = chain.slice(), tries = L.hand * 30;
      for (let k = 0; k < tries && hand.length < L.hand; k++) {
        const from = pick(letters.slice(0, -1)), c = byHead[from] || [], w = pick(c);
        if (w == null || w === s || w === g || hand.includes(w) || tail(W[w][1]) === head(W[g][1])) continue;
        if (hand.some((h) => W[h][1] === W[w][1])) continue;
        const r = shortest(s, g, hand.concat(w));
        if (r.d === L.len) hand.push(w);
      }
      if (hand.length < L.hand) continue;
      const r = shortest(s, g, hand);
      if (r.d !== L.len) continue;
      // 札の並びは種で混ぜる（正しい道の順にしない）
      for (let i = hand.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [hand[i], hand[j]] = [hand[j], hand[i]]; }
      if (chain.every((h, k) => hand[k] === h)) hand.push(hand.shift()); // 先頭から答えの順に並んだら1枚ずらす
      return { s, g, hand, d: L.len, ways: r.ways, chain, lv: L.name };
    }
    return null;
  }
  const B = { rng, seedOf, LV, HARD, W, head, tail, big, shortest, rest, best, make };
  if (typeof module !== "undefined") module.exports = B; else root.SHR = B;
})(this);
