// しりとり最短の検査。言葉のデータ・問題の作り方（何千問、最短を別の数え方で）・3問の組み方・出す/戻る/ヒント・続きから・上級・言葉帳・記録・スマホ幅・PWA・道しるべ・実績・カレンダー・あとから。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const T = createRequire(import.meta.url)(path.join(root, "gen.js"));
const W = T.W, yomi = (i) => W[i][1];

// 1. 言葉のデータ
{
  const bad = W.filter((w) => !/^[ぁ-ゖー]{2,5}$/.test(w[1]) || w[1].endsWith("ん") || /[死殺葬屍呪遺棺骸刑獄墓弔喪病癌毒虐暴拷凶犯罪賊奴隷戦爆銃]/.test(w[0]));
  check("言葉はひらがなのよみ2〜5字・「ん」で終わらない・つらい言葉を入れない", W.length > 2000 && bad.length === 0, bad.slice(0, 3).map((w) => w.join("/")).join(","));
  check("同じよみの言葉は1つだけ（札を見分けられる）", new Set(W.map((w) => w[1])).size === W.length);
  check("字のきまり：小さい字は大きい字・最後の「ー」は前の字・濁った字はそのまま", T.tail("きゅうしゃ") === "や" && T.tail("こーひー") === "ひ" && T.head("ちゃわん") === "ち" && T.tail("かぎ") === "ぎ" && T.tail("がっこう") === "う");
}
// 2. 問題の作り方（ブラウザを使わない）
{
  // 別の数え方：手札の並べ方を全部たどって、最短の枚数と通り数を数える
  const brute = (p) => { const goal = T.head(yomi(p.g)); let best = 99, ways = 0; const go = (last, used) => { if (used.length > best) return; if (last === goal && used.length) { if (used.length < best) { best = used.length; ways = 0; } ways++; return; } for (const h of p.hand) if (!used.includes(h) && T.head(yomi(h)) === last) go(T.tail(yomi(h)), used.concat(h)); }; if (T.tail(yomi(p.s)) === goal) return { d: 0, ways: 1 }; go(T.tail(yomi(p.s)), []); return { d: best, ways }; };
  const bad = [], same = [], ng = [];
  for (let d = 0; d < 2000; d++) [...T.LV, T.HARD].forEach((L, i) => {
    const seed = T.seedOf(`qa${d}:${i}`), p = T.make(seed, L), q = T.make(seed, L);
    if (!p) { bad.push(`${d}:${i} 作れない`); return; }
    if (JSON.stringify(p) !== JSON.stringify(q)) same.push(`${d}:${i}`);
    if (p.hand.length !== L.hand || new Set(p.hand).size !== L.hand || p.hand.includes(p.s) || p.hand.includes(p.g) || new Set(p.hand.map(yomi)).size !== L.hand) bad.push(`${d}:${i} 手札`);
    if (p.chain.length !== L.len || p.chain.some((h) => !p.hand.includes(h))) bad.push(`${d}:${i} 道`);
    { let last = T.tail(yomi(p.s)); for (const h of p.chain) { if (T.head(yomi(h)) !== last) bad.push(`${d}:${i} つながらない`); last = T.tail(yomi(h)); } if (last !== T.head(yomi(p.g))) bad.push(`${d}:${i} 目的に着かない`); }
    if (p.chain.every((h, k) => p.hand[k] === h)) bad.push(`${d}:${i} 札が答えの順`);
    if (d < 300) { const r = brute(p); if (r.d !== p.d || r.ways !== p.ways) ng.push(`${d}:${i} ${p.d}/${r.d} ${p.ways}/${r.ways}`); }
  });
  check("どの問題も手札の枚数どおり・正しい道の札が入り、しりとりで目的に着く・札は答えの順に並ばない（4種類×2000問）", bad.length === 0, bad.slice(0, 3).join(","));
  check("同じ種からは同じ問題ができる（だれでも同じ問題）", same.length === 0, same.slice(0, 3).join(","));
  check("最短の枚数と最短のつなぎ方の数が、別の数え方（全部の並べ方）と合う（4種類×300問）", ng.length === 0, ng.slice(0, 3).join(","));
  { // ヒントの札は、そこから最短で着ける
    const hb = []; for (let d = 0; d < 300; d++) { const p = T.make(T.seedOf("h" + d), T.LV[d % 3]), b = T.best(T.tail(yomi(p.s)), p.g, p.hand); if (b == null || 1 + T.rest(T.tail(yomi(b)), T.head(yomi(p.g)), p.hand.filter((x) => x !== b)) !== p.d) hb.push(d); }
    check("ヒントの札を出すと、残りの札で最短のまま着ける", hb.length === 0, hb.slice(0, 3).join(",")); }
}

const html = readFileSync(path.join(root, "index.html"), "utf8");
check("終えた回を消すのは同じ回のときだけ・0時を過ぎたホームの「今日」のボタンは描き直す（2026-11-04 CodeRabbit）", /c\.date === run\.date && c\.id === run\.id\) s2\.runs\[MODE\] = null/.test(html) && /\$\("go-d"\)\.onclick = \(\) => \(k !== todayKey\(\) \? home\(\)/.test(html));
check("別のタブで今日の分を終えたあと、古い画面から今日・上級をもう一度始めない（2026-11-04 CodeRabbit）", /\(mode === "d" && s\.days\[k\]\) \|\| \(mode === "h" && s\.hdays\[k\]\)\) return;/.test(html));
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む。2026-11-04）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(new URL("../README.md", import.meta.url), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
check("別のタブで先に進んだ道を、古いタブの短い道で上書きしない（2026-11-04 CodeRabbit）", /r\.cur\.i === cur\.i && r\.cur\.moves > cur\.moves\)\) r\.cur =/.test(html));
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0, ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの問題の種だけ（今日の3問・上級は日付の種）", (html.match(/Math\.random/g) || []).length === 3 && !/Math\.random/.test(readFileSync(path.join(root, "gen.js"), "utf8")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/shiritori-saitan/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームは名前・メールを聞かない（楽しさ・よかった所・直してほしい所だけ）", /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy)); }
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  const need = ["./index.html", "./transfer.js", "./gen.js", "./words.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
  check("PWA：ネットの返事の保存は、イベントの中で waitUntil に預ける（遅れて届いた新しい版も保存できる）", /e\.waitUntil\(Promise\.race\(\[net\.then[^\n]*wait\(15000\)[^\n]*wait\(60000\)\]\)\)/.test(sw));
  check("PWA：sw.js は画面のファイルを全部保存し、外へ何も送らない", need.every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "しりとり最短" && mf.icons.length >= 2 && mf.start_url === "./"); }
{ const src = html + readFileSync(path.join(root, "gen.js"), "utf8");
  const bad = src.match(/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/g) || [];
  check("並べ替えの比較の中で乱数を引いていない（同じ日に人によって問題が変わらない）", bad.length === 0, bad.join(" | ")); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const isNoise = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(t);
const errors = [];
async function newPage(w = 390, h = 844) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(e.stack));
  page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  return page;
}
const curT = (page) => page.evaluate(() => { const c = window.__sh.cur(); return { p: c.p, path: c.path.slice(), moves: c.moves, hints: c.hints, done: c.done, hint: c.hint }; });
// 正しい道の札を、残りの分だけ順に出す
async function solveNow(page) {
  const c = await curT(page);
  for (const h of c.p.chain.slice(c.path.length)) await page.click(`#hand button[data-h="${h}"]`);
}
const KEY = "shiritori-v1";
try {
  const page = await newPage();
  // 3. 3問の組み方（日付の種）
  const sel = await page.evaluate(() => {
    const g = window.__sh, out = { bad: [], same: 0 };
    let prev = null;
    for (let n = 0; n < 365; n++) {
      const k = new Date(Date.parse("2026-11-04") + n * 864e5).toISOString().slice(0, 10);
      const d = g.dailyList(k).map(g.probOf), h = g.hardList(k).map(g.probOf);
      if (d.map((p) => p.lv).join() !== "ひと息,ふた息,ながい道" || h.some((p) => p.lv !== "上級") || d.some((p) => !p)) out.bad.push(k);
      const sig = JSON.stringify(d.map((p) => [p.s, p.g]));
      if (sig === prev) out.same++; prev = sig;
    }
    out.d1201 = JSON.stringify(g.dailyList("2026-12-01").map(g.probOf));
    return out;
  });
  check("今日の3問は毎日「ひと息・ふた息・ながい道」、上級は5枚つなぐ2問（1年分）", sel.bad.length === 0, sel.bad.slice(0, 3).join(","));
  check("前の日と同じ問題にならない（1年分）", sel.same === 0);
  { const ctx = await browser.newContext(); const p2 = await ctx.newPage(); await p2.goto(url);
    const d2 = await p2.evaluate(() => { const g = window.__sh; return JSON.stringify(g.dailyList("2026-12-01").map(g.probOf)); });
    await ctx.close();
    check("同じ日は別のブラウザで開いても同じ3問", sel.d1201 === d2); }

  // 4. 通しで遊ぶ
  check("初めて開くと遊び方が出る", await page.locator("#howto[open]").count() === 1);
  await page.click("#howto-ok");
  await page.click("#go-d");
  let c = await curT(page);
  const last0 = T.tail(yomi(c.p.s));
  check("1問目はひと息：出発と目的の言葉が出て、手札6枚が並ぶ", (await page.textContent(".goal")).includes(W[c.p.s][0]) && (await page.textContent(".goal")).includes(W[c.p.g][0]) && (await page.locator("#hand button").count()) === 6);
  check("出発の言葉の最後の字で始まる札が光る", (await page.locator("#hand button.ok").count()) === c.p.hand.filter((h) => T.head(yomi(h)) === last0).length && (await page.textContent("#ask")).includes(last0));
  // つながらない札は出せない
  const wrong = c.p.hand.find((h) => T.head(yomi(h)) !== last0);
  if (wrong != null) await page.click(`#hand button[data-h="${wrong}"]`);
  check("最後の字で始まらない札は出せない", wrong != null && (await curT(page)).path.length === 0);
  const decoy = c.p.hand.find((h) => T.head(yomi(h)) === last0 && h !== c.p.chain[0]);
  const first = decoy != null ? decoy : c.p.chain[0];
  await page.click(`#hand button[data-h="${first}"]`);
  let n1 = await curT(page);
  check("札を出すとつながり、出した回数が1になり、その札は使えなくなる", n1.path.join() === String(first) && n1.moves === 1 && (await page.locator(`#hand button[data-h="${first}"].used`).count()) === 1 && (await page.textContent("#trip")).includes(W[first][0]));
  await page.click("#undo");
  n1 = await curT(page);
  check("「ひとつ戻る」で戻れるが、出した回数は減らない", n1.path.length === 0 && n1.moves === 1);
  await page.click("#hint");
  n1 = await curT(page);
  check("ヒントで、最短で着ける札が光る", n1.hints === 1 && n1.hint != null && 1 + T.rest(T.tail(yomi(n1.hint)), T.head(yomi(c.p.g)), c.p.hand.filter((x) => x !== n1.hint)) === c.p.d && (await page.locator("#hand button.hint").count()) === 1);
  await page.reload(); await page.click("#go-d");
  n1 = await curT(page);
  check("途中で閉じても、出した回数とヒントはそのまま（続きから）", n1.moves === 1 && n1.hints === 1 && (await page.textContent("#left")).includes("ヒント 1"));
  // 練習を始めても今日の途中は消えない
  await page.click("#back"); await page.click("#go-p"); await page.locator(".lv button").first().click(); await page.click("#back"); await page.click("#go-d");
  check("練習を始めても、今日の途中経過は消えない", (await curT(page)).moves === 1 && (await page.evaluate(() => window.__sh.mode())) === "d");
  await solveNow(page);
  n1 = await curT(page);
  check("目的の言葉につながると到着になり、1回多く＋ヒント1回で★1、最短のつなぎ方が出る", n1.done && n1.moves === c.p.d + 1 && (await page.locator(".verdict .stars .off").textContent()).length === 2 && /最短のつなぎ方/.test(await page.textContent(".verdict")));
  await page.click("#next");
  // 別のタブで先に進んでいたら、古い画面の答えは足さない
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.push({ m: 3, d: 3, h: 0 }); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await solveNow(page);
  check("別のタブで先に進んでいたら、古い画面の答えは足さず今の問題を出し直す", (await page.evaluate(() => window.__sh.load().runs.d.res.length)) === 2 && (await page.textContent("header")).includes("3/3"));
  { // 行き止まり：つなげる札が無くなったら知らせる
    const c3 = await curT(page), dead = c3.p.hand.find((h) => T.head(yomi(h)) === T.tail(yomi(c3.p.s)) && !c3.p.hand.some((x) => x !== h && T.head(yomi(x)) === T.tail(yomi(h))) && T.tail(yomi(h)) !== T.head(yomi(c3.p.g)));
    if (dead != null) { await page.click(`#hand button[data-h="${dead}"]`); check("行き止まりの札を出すと「ひとつ戻ろう」と知らせる", (await page.locator(".toast").last().textContent()).includes("戻ろう")); await page.click("#undo"); } }
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.pop(); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload(); await page.click("#go-d");
  for (let j = 0; j < 2; j++) { await page.evaluate(() => { const c = window.__sh.cur(); c.path = []; }); await solveNow(page); await page.click("#next"); }
  const share = await page.textContent(".share");
  const r3 = await page.evaluate(() => { const g = window.__sh; return g.load().days[g.todayKey()].r; });
  check("3問で結果・シェアの文は番号と色だけ（言葉を出さない）", /しりとり最短 #\d+/.test(share) && /^💡/.test(share.split("\n")[1] || "") && r3.length === 3 && !(await page.evaluate(() => { const g = window.__sh; return g.dailyList(g.todayKey()).map(g.probOf).flatMap((p) => [p.s, p.g]).map((i) => g.T.W[i][0]); })).some((w) => share.includes(w)));
  check("X・LINE は押したときに開くリンクだけ", /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(await page.getAttribute("#toX", "href")) && /^https:\/\/line\.me\/R\/share\?text=/.test(await page.getAttribute("#toLine", "href")));
  check("結果に3問の出発・目的と回数が出る", (await page.locator(".res div").count()) === 3);
  check("ヒントを使った日は Ko-fi のひとことを出さない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  check("ホームで連続1日・今日の結果を見るに変わる・つないだ問題3", (await page.textContent(".stats")).includes("1連続の日") && (await page.textContent(".stats")).includes("3つないだ問題") && (await page.textContent("#go-d")).includes("結果"));
  // 上級
  await page.click("#go-h");
  check("上級は手札12枚・札が光らず、ヒントのボタンが無い", (await page.locator("#hand button").count()) === 12 && (await page.locator("#hand button.ok").count()) === 0 && (await page.locator("#hint").count()) === 0);
  await solveNow(page); await page.click("#next"); await solveNow(page); await page.click("#next");
  check("上級を全部最短で初めて終えると、結果に Ko-fi のひとことが1行", (await page.locator(".kofi").count()) === 1 && (await page.textContent(".big")).includes("最短"));
  await page.click("#back"); await page.click("#go-h");
  check("2回目に結果を開いても Ko-fi のひとことは出ない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  // 練習：記録の日を増やさず、言葉帳には載る
  await page.click("#go-p"); await page.locator(".lv button").nth(1).click();
  await solveNow(page); await page.click("#next");
  const after = await page.evaluate(() => { const s = window.__sh.load(); return { days: Object.keys(s.days).length, trips: s.trips, seen: Object.keys(s.seen).length }; });
  check("練習は今日の記録を増やさず、つないだ問題と言葉帳には入る", after.days === 1 && after.trips === 6 && after.seen >= 20 && (await page.locator(".share").count()) === 0);
  await page.click("#go-dex");
  check("言葉帳に最初の字ごとの数が出る", (await page.locator(".dex div:not(.no)").count()) > 0 && (await page.textContent("h1")).includes(`${after.seen}/${W.length}`));
  await page.close();

  // 5. スマホ幅：はみ出さない・押せる所は44px以上（上級の12枚でも）
  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700); const fb2 = await p3.evaluate(() => { const a = document.querySelector("#howto #fb2"); return a ? a.getBoundingClientRect().height : 0; }); check(`幅${w}px：遊び方の「感想を送る」も高さ44px以上`, fb2 >= 44, `${fb2}px`); await p3.click("#howto-ok");
    const homeOk = await p3.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await p3.click("#go-d");
    const r = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim().slice(0, 6)) }));
    check(`幅${w}px：横にはみ出さず、押せる所は高さ44px以上`, homeOk && !r.over && r.small.length === 0, r.small.join(","));
    await p3.close();
  }
  { // いちばん長い表記の札でも、幅320pxで札からはみ出さない
    const pl = await newPage(320, 700); await pl.click("#howto-ok");
    const longest = W.reduce((a, w, i) => (w[0].length > W[a][0].length ? i : a), 0);
    await pl.evaluate((L) => { const g = window.__sh, d = g.todayKey(); localStorage.setItem("shiritori-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, trips: 0, kofi: {}, runs: {} })); }, longest);
    await pl.click("#go-d");
    await pl.evaluate((L) => { const b = document.querySelector("#hand button"); b.firstChild.textContent = window.__sh.T.W[L][0]; }, longest);
    const over = await pl.evaluate(() => { const b = document.querySelector("#hand button"); return b.scrollWidth > b.clientWidth + 1; });
    check("いちばん長い言葉の札でも、幅320pxで札からはみ出さない", !over, W[longest][0]);
    await pl.close(); }
  { // 保存してあった札の並びが壊れていたら使わない
    const pv = await newPage(); await pv.click("#howto-ok");
    await pv.evaluate((k) => { const g = window.__sh, d = g.todayKey(), p = g.probOf(g.dailyList(d)[0]); const bad = p.hand.find((h) => g.T.head(g.T.W[h][1]) !== g.T.tail(g.T.W[p.s][1])); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, trips: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [], cur: { i: 0, path: [bad], moves: 1, hints: 0 }, id: "a" } } })); }, KEY);
    await pv.reload(); await pv.click("#go-d");
    check("壊れた途中経過（つながらない札）は使わず、はじめから", (await curT(pv)).path.length === 0 && (await curT(pv)).moves === 0);
    await pv.close(); }
  { // 保存できないブラウザでも遊べる
    const pb = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pb.on("pageerror", (e) => errors.push(e.message));
    await pb.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    await pb.goto(url); await pb.click("#howto-ok"); await pb.click("#go-d");
    { const c0 = await curT(pb); await pb.click(`#hand button[data-h="${c0.p.chain[0]}"]`); }
    check("保存できないブラウザでも、今日の1問目で進める", (await pb.textContent("header")).includes("1/3") && (await curT(pb)).moves === 1);
    await pb.click("#back");
    check("保存できないブラウザでも、遊び方が何度も開かない", !(await pb.locator("#howto[open]").count()));
    await pb.close(); }
  { // 前の記録が残っていて、書き込みだけ失敗するとき
    const pq = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pq.on("pageerror", (e) => errors.push(e.message));
    await pq.addInitScript(() => { const orig = Storage.prototype.setItem; orig.call(localStorage, "shiritori-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, trips: 0, kofi: {}, runs: {} })); Storage.prototype.setItem = () => { throw new Error("full"); }; });
    await pq.goto(url); await pq.click("#go-d");
    check("前の記録があり書き込みだけ失敗しても、今日の1問目が始まる", (await pq.textContent("header")).includes("1/3"));
    await pq.close(); }
  { const pc = await newPage();
    await pc.evaluate((k) => { const g = window.__sh, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, trips: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ m: 3, d: 3, h: 0 })), id: "a" } } })); }, KEY);
    await pc.reload();
    check("最後の1問のあと閉じても、開き直すと結果へ進み今日の記録がつく", await pc.evaluate(() => { const g = window.__sh; return !!g.load().days[g.todayKey()] && !g.load().runs.d; }));
    await pc.close(); }
  { const pm = await newPage();
    await pm.evaluate((k) => { const g = window.__sh, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, trips: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ m: 3, d: 3, h: 0 })), id: "a" } } })); }, KEY);
    await pm.reload();
    const had = await pm.locator("#go-h").count();
    await pm.evaluate(() => { const RD = Date, off = 864e5; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; });
    if (had) await pm.click("#go-h");
    check("結果を開いたまま日付が変わったら、上級のボタンを押しても翌日の上級は始まらない", had > 0 && (await pm.evaluate(() => window.__sh.mode())) !== "h");
    await pm.close(); }
  { const pn = await newPage();
    await pn.evaluate((k) => { const g = window.__sh, d = new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, trips: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ m: 3, d: 3, h: 0 })), id: "a" } } })); }, KEY);
    await pn.reload();
    check("前の日に終えて閉じても、翌日に開くとその日の記録がつく", await pn.evaluate(() => { const g = window.__sh; return !!g.load().days[new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10)] && !g.load().runs.d; }));
    check("前の日の結果の画面からは、今日の上級を始められない（今日の分を先に）", !(await pn.locator("#go-h").count()));
    check("保存に失敗したあと別のタブが新しく保存していたら、古いメモリで上書きせずそちらを読む", await pn.evaluate((K) => { const g = window.__sh, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 1, tagA: 1 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 2, tagB: 1 }))); const r = g.load(); mem = null; return !!r.tagB && !r.tagA; }, KEY));
    check("保存に失敗したあと別のタブが保存しても、両方の記録（日ごとの結果）を残し、言葉帳の数は多いほう", await pn.evaluate((K) => { const g = window.__sh, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": 1 }, seen: { ねこ: 9 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": 1 }, seen: { ねこ: 2 } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"] && r.seen["ねこ"] === 9; }, KEY));
    check("保存に失敗したタブの時刻が進んでいても、別のタブで先に進んだ途中経過を古いメモリで戻さない", await pn.evaluate((K) => { const g = window.__sh, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [{ seed: 1, lv: 0 }], id: "x", res: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 99, runs: { d: Object.assign({}, base) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, runs: { d: Object.assign({}, base, { res: [{ m: 3, d: 3, h: 0 }] }) } }))); const r = g.load(); mem = null; return r.runs.d.res.length === 1; }, KEY));
    check("保存に失敗したタブにだけある途中経過は、別のタブが保存しても消さない（その日を終えた記録があれば null を使う・終えた回は日ごとの結果に残す）", await pn.evaluate((K) => { const g = window.__sh, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (a, b, dd) => { mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: a })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: b }, dd ? { days: Object.assign({}, s0.days, dd) } : {}))); const r = g.load(); mem = null; return r; }; const r1 = put({ d: base }, {}), r2 = put({ d: base }, { d: null }, { "2000-01-01": 1 }), r3 = put({ d: base }, { d: null }), r4 = put({ d: done }, { d: null }); return !!r1.runs.d && r1.runs.d.date === "2000-01-01" && r2.runs.d === null && !!r3.runs.d && r3.runs.d.date === "2000-01-01" && r4.runs.d === null && !!r4.days["2000-01-01"]; }, KEY));
    check("同じ進み具合なら、新しく保存したほうの途中経過を使う", await pn.evaluate((K) => { const g = window.__sh, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (ta, tb) => { mem = JSON.stringify(Object.assign({}, s0, { t: ta, runs: { d: Object.assign({}, base, { zz: "a" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: tb, runs: { d: Object.assign({}, base, { zz: "b" }) } }))); const r = g.load(); mem = null; return r.runs.d.zz; }; return put(9, 5) === "a" && put(5, 9) === "b"; }, KEY));
    check("結果を見る前に別のタブが次の日を保存しても、終えた日の記録を残す", await pn.evaluate((K) => { const g = window.__sh, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: done } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { date: "2000-01-02" }) } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && r.runs.d.date === "2000-01-02"; }, KEY));
    check("同じ問題の練習をやり直したら、前の回（終えたもの）と取り違えず新しい回を使う", await pn.evaluate((K) => { const g = window.__sh, s0 = g.load(), base = { mode: "p", date: "2000-01-01", list: [1], tags: [1], res: [], i: 0, hints: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 9, runs: { p: Object.assign({}, base, { id: "new" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, runs: { p: Object.assign({}, base, { id: "old", res: [{}], i: 1 }) } }))); const r = g.load(); mem = null; return r.runs.p.id === "new"; }, KEY));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await pn.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, KEY));
    check("進み具合は終えた問題の数を先に比べる（出した回数が多くても、終えた問題のある記録を消さない）", await pn.evaluate((K) => { const g = window.__sh, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [{ seed: 1, lv: 0 }, { seed: 2, lv: 0 }], id: "x" }; mem = JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { res: [], cur: { i: 0, path: [], moves: 1500, hints: 0 } }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: Object.assign({}, base, { res: [{ m: 3, d: 3, h: 0 }], cur: null }) } }))); const r = g.load(); mem = null; return r.runs.d.res.length === 1; }, KEY));
    check("着いたときに別のタブで回が変わって保存できなかったら、つながった画面を出さない", await pn.evaluate((K) => { const src = save.toString() + arrive.toString(); return /let saved = false/.test(arrive.toString()) && /if \(!saved\)/.test(arrive.toString()) && !!src; }, KEY));
    await pn.evaluate(() => { location.hash = ""; }); await pn.reload(); await pn.click("#go-p"); await pn.click('.lv button[data-lv="3"]');
    check("練習の上級も、ヒントのボタンが無く札が光らない", (await pn.locator("#hint").count()) === 0 && (await pn.locator("#hand button.ok").count()) === 0 && (await pn.evaluate(() => window.__sh.cur().hard)) === true);
    await pn.close(); }
  // 6. 手ごたえ：道しるべ（最短の枚数のます）・ねらえる★・つながらない札はゆれる・着いたら★を押す
  { const pg = await newPage(); await pg.click("#howto-ok"); await pg.click("#go-d");
    const c0 = await curT(pg), pot = () => pg.locator("#par .pot .stars .off").textContent().then((t) => 3 - t.length);
    check("道しるべ：最短の枚数だけ空のますが並び、目的の字と「ねらえる★3」が出る", (await pg.locator("#par .slots i").count()) === c0.p.d && (await pg.locator("#par .slots i.on").count()) === 0 && (await pg.textContent("#par")).includes(`最短${c0.p.d}枚`) && (await pg.textContent("#par .slots b")) === T.head(yomi(c0.p.g)) && (await pot()) === 3);
    const lst = T.tail(yomi(c0.p.s)), wrong = c0.p.hand.find((h) => T.head(yomi(h)) !== lst);
    await pg.click(`#hand button[data-h="${wrong}"]`);
    check("つながらない札を押すと、その札がゆれる（出した回数は増えない）", (await pg.locator(`#hand button[data-h="${wrong}"].no`).count()) === 1 && (await curT(pg)).moves === 0);
    const decoy = c0.p.hand.find((h) => T.head(yomi(h)) === lst && h !== c0.p.chain[0]), first = decoy != null ? decoy : c0.p.chain[0];
    await pg.click(`#hand button[data-h="${first}"]`);
    check("札を出すと、ますが1つうまり、出した札がはねる・ねらえる★は道が正しいかで変わらない（答えを言わない）", (await pg.locator("#par .slots i.on").count()) === 1 && (await pg.locator("#trip b.fx").count()) === 1 && (await pot()) === 3);
    await pg.click("#undo");
    check("ひとつ戻ると、ねらえる★が1つ減る（戻った分は★に響くと分かる）", (await pg.locator("#par .slots i.on").count()) === 0 && (await pot()) === 2);
    await pg.click("#hint");
    check("ヒントを使うと、ねらえる★がもう1つ減る", (await pot()) === 1);
    await pg.evaluate(() => { const c = window.__sh.cur(); c.path = []; c.moves = 0; c.hints = 0; c.hint = null; }); await solveNow(pg);
    check("最短で着くと「最短！」と★を1つずつ押し、札の列が波打ち、ますが金色になる", (await pg.textContent(".verdict .hd")).includes("最短！") && (await pg.locator(".verdict .stars .st").count()) === 3 && (await pg.locator(".verdict .stars .off .st").count()) === 0 && (await pg.locator("#trip.win").count()) === 1 && (await pg.locator("#par.win").count()) === 1);
    await pg.close(); }

  // 7. やりこみ：実績・カレンダー・取りこぼした日をあとから
  const base = () => ({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, seen: {}, trips: 0, runs: {}, kofi: {} });
  const R3 = (ms, hs = [0, 0, 0]) => ({ r: ms.map((m, j) => ({ m: m + 2 + j, d: 2 + j, h: hs[j] })) }); // ms：最短より多く出した数
  async function pageAt(day, w = 390, state = null) {
    const pg = await browser.newPage({ viewport: { width: w, height: 844 } });
    pg.on("pageerror", (e) => errors.push(e.stack));
    pg.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
    await pg.addInitScript((at) => { const RD = Date, off = RD.parse(at) - RD.now(); window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; }, day + "T03:00:00Z");
    await pg.goto(url);
    await pg.evaluate(([k, st]) => { localStorage.clear(); if (st) localStorage.setItem(k, JSON.stringify(st)); }, [KEY, state]);
    await pg.reload();
    return pg;
  }
  { // 実績の数え方（いまの記録から毎回数える）
    const pa = await newPage();
    const r = await pa.evaluate(() => {
      const g = window.__sh, A = g.ACH, ids = A.map((a) => a[0]), W = g.T.W;
      const R3 = (ms, hs = [0, 0, 0]) => ({ r: ms.map((m, j) => ({ m: m + 2 + j, d: 2 + j, h: hs[j] })) });
      const st = { v: 1, days: {}, hdays: {}, adays: {}, seen: {}, trips: 0, runs: {}, kofi: {} };
      for (let i = 0; i < 7; i++) st.days["2027-01-0" + (i + 1)] = i < 5 ? R3([0, 0, 0]) : R3([1, 0, 0], [0, 1, 0]);
      st.hdays["2027-01-10"] = { r: [{ m: 5, d: 5, h: 0 }, { m: 6, d: 5, h: 0 }] };
      st.adays["2027-01-20"] = R3([0, 0, 3]);
      W.slice(0, 120).forEach((w) => (st.seen[w[1]] = 1)); st.days["2000-01-01"] = 1; // 形のちがう古い記録が混じっても止まらない
      const t = g.tally(st), got = g.achGot(st);
      const st2 = JSON.parse(JSON.stringify(st)); st2.hdays["2027-01-11"] = { r: [{ m: 5, d: 5, h: 0 }, { m: 5, d: 5, h: 0 }] }; for (const k of Object.keys(st2.seen).slice(30)) delete st2.seen[k]; st2.days["2027-01-06"] = R3([0, 0, 0]);
      return { n: A.length, uniq: new Set(ids).size === A.length, grp: [0, 1, 2].map((x) => A.filter((a) => a[3] === x).length), t, got, got2: g.achGot(st2), empty: g.achGot({ days: {}, hdays: {}, seen: {} }).length, kana: (() => { const by = {}; for (const w of W) { const h = g.T.head(w[1]); if (!by[h]) by[h] = w[1]; } const ks = Object.keys(by), s1 = { seen: {} }, s2 = { seen: {} }; ks.slice(0, 40).forEach((h) => (s1.seen[by[h]] = 1)); ks.slice(0, 39).forEach((h) => (s2.seen[by[h]] = 1)); return g.achGot(s1).includes("kana40") && !g.achGot(s2).includes("kana40") && ks.length >= 40; })() };
    });
    check("実績は10〜14個・名前が重ならず、腕前・集める・続けるが3つ以上ずつ", r.n >= 10 && r.n <= 14 && r.uniq && r.grp.every((x) => x >= 3), r.grp.join("・"));
    check("実績は記録から数える：遊んだ日7・全部最短の日5・上級1日（最短は0）・あとから1・ヒントなしで最短の問題20・言葉120", r.t.days === 7 && r.t.perfect === 5 && r.t.hard === 1 && r.t.hardP === 0 && r.t.late === 1 && r.t.par === 20 && r.t.words === 120 && ["perfect1", "hard1", "w100", "first", "d7", "late1"].every((x) => r.got.includes(x)) && !r.got.includes("perfect7") && !r.got.includes("hardP") && !r.got.includes("par30"), JSON.stringify(r.t));
    check("実績：上級を全部最短でつなぐと「上級を最短で」・言葉を減らすと「言葉100」は消える（記録から数え直す）・記録が空なら実績は0", r.got2.includes("hardP") && !r.got2.includes("w100") && r.empty === 0);
    check("実績：言葉帳の最初の字が40種類で「40の字」（39種類ではまだ）", r.kana);
    await pa.close(); }
  { // 取りこぼした日：何百日分作って、過去7日・始めた日より後・遊んでいない日だけ。その日の問題は日付どおり
    const pl = await newPage();
    const bad = await pl.evaluate(() => {
      const g = window.__sh, out = [], day = (n) => new Date(Date.parse("2026-11-04") + n * 864e5).toISOString().slice(0, 10);
      for (let n = 0; n < 700; n++) {
        const k = day(n), s = { days: {}, adays: {} };
        for (let j = Math.max(0, n - 12); j < n; j++) { const x = (j * 7 + n * 3) % 5; if (x === 0) s.days[day(j)] = { r: [] }; else if (x === 1) s.adays[day(j)] = { r: [] }; }
        const L = g.lateDays(s, k), want = [];
        for (let j = n - 1; j >= Math.max(0, n - 7); j--) if (!s.days[day(j)] && !s.adays[day(j)]) want.push(day(j));
        if (JSON.stringify(L) !== JSON.stringify(want) || L.some((d) => d >= k || d < "2026-11-04")) out.push(k);
      }
      return out;
    });
    check("取りこぼした日は過去7日のうち遊んでいない日だけ・始めた日より前と今日は出ない（700日分）", bad.length === 0, bad.slice(0, 3).join(","));
    await pl.close(); }
  { // カレンダーの印とあとから遊ぶ（2026-11-20 として開く）
    const st = base();
    st.days["2026-11-19"] = R3([0, 0, 0]); st.days["2026-11-18"] = R3([0, 1, 0]); st.days["2026-11-17"] = R3([3, 3, 0], [1, 0, 0]);
    st.hdays["2026-11-19"] = { r: [{ m: 5, d: 5, h: 0 }, { m: 5, d: 5, h: 0 }] };
    const pc = await pageAt("2026-11-20", 390, st);
    check("ホームのカレンダーのボタンに、あとから遊べる日の数が出る", (await pc.getAttribute("#go-cal", "aria-label")).includes("あとから遊べる日 4") && (await pc.textContent("#go-cal .badge")) === "▶4");
    // 今日の3問を1枚だけ進めておく（あとから遊んでも消えない）
    await pc.click("#go-d"); { const c = await curT(pc); await pc.click(`#hand button[data-h="${c.p.chain[0]}"]`); }
    await pc.click("#back"); await pc.click("#go-cal");
    const cls = (d) => pc.getAttribute(`.cal [data-k="2026-11-${d}"]`, "class");
    check("カレンダー：全部★3の日は濃い・★2くらいは中・それより下は薄い、上級の日に「上」", (await cls(19)).includes("p3") && (await cls(18)).includes("p2") && (await cls(17)).includes("p1") && (await pc.textContent('.cal [data-k="2026-11-19"]')).includes("上"));
    check("カレンダー：取りこぼした過去7日だけ押せる（8日前より前・始めた日より前と今日は押せない）", (await pc.locator(".cal button.miss").count()) === 4 && (await pc.locator('.cal button[data-k="2026-11-12"]').count()) === 0 && (await pc.locator('.cal button[data-k="2026-11-03"]').count()) === 0 && (await cls(20)).includes("today"));
    check("カレンダー：連続の日は1以上のときだけ小さく出す・休んだ日を責める言葉を書かない", (await pc.textContent("header")).includes("連続 3日") && !/サボ|休んだ|さぼ|失敗|残念/.test(await pc.textContent("#app")));
    { // キーボードで選んだボタンに枠が出る（all:unset で消えない。2026-11-04 CodeRabbit の指摘）
      await pc.keyboard.press("Shift");
      const bad = await pc.evaluate(() => [...document.querySelectorAll("button:not([disabled]),a[href]")].filter((b) => b.checkVisibility()).filter((b) => { b.focus(); const cs = getComputedStyle(b); return !b.matches(":focus-visible") || cs.outlineStyle === "none" || parseFloat(cs.outlineWidth) < 2; }).map((b) => b.className || b.id || b.tagName));
      check("キーボードで選んだボタン（カレンダーのあとから遊ぶ日も）に枠が出る", bad.length === 0 && (await pc.locator(".cal button.miss").count()) > 0, bad.join(","));
    }
    check("カレンダー：始めた月より前と今月より先へは行けない", (await pc.isDisabled("#prev")) && (await pc.isDisabled("#next")));
    await pc.click('.cal button[data-k="2026-11-16"]');
    const late = await pc.evaluate(() => { const g = window.__sh, c = g.cur(), l = g.dailyList("2026-11-16"), p = g.probOf(l[0]); return { mode: g.mode(), ok: c.p.s === p.s && c.p.g === p.g && JSON.stringify(c.p.hand) === JSON.stringify(p.hand) && JSON.stringify(g.load().runs["a:2026-11-16"].list) === JSON.stringify(l) }; });
    check("取りこぼした日を押すと、その日の今日の3問と同じ問題で遊べる（途中経過は日付ごとの入れ物）", late.mode === "a:2026-11-16" && late.ok && (await pc.textContent("header")).includes("あとから"));
    const seen0 = await pc.evaluate(() => Object.keys(window.__sh.load().seen).length);
    for (let j = 0; j < 3; j++) { await solveNow(pc); await pc.click("#next"); }
    const after = await pc.evaluate(() => { const g = window.__sh, s = g.load(); return { days: Object.keys(s.days).length, a: !!s.adays["2026-11-16"], st: g.streak(s.days), seen: Object.keys(s.seen).length, d: s.runs.d && s.runs.d.cur ? s.runs.d.cur.path.length : -1, ra: s.runs.a, rs: s.runs["a:2026-11-16"], today: !!s.days["2026-11-20"] }; });
    check("あとから遊んだ日は今日の記録・連続の日を増やさず、言葉帳には載り、今日の途中経過も消さない", after.a && after.days === 3 && !after.today && after.st === 3 && after.seen > seen0 && after.d === 1 && !after.ra && !after.rs, JSON.stringify(after));
    check("あとから遊んだ結果：シェアと Ko-fi は出さず、新しい実績を「🏅 実績：」で小さく出す", (await pc.locator(".share").count()) === 0 && (await pc.locator(".kofi").count()) === 0 && (await pc.textContent("#achnew")).includes("🏅 実績：拾いもの"));
    await pc.click("#go-cal");
    check("あとから遊んだ日はカレンダーで ↺ に変わり、もう押せない", (await cls(16)).includes("late") && (await pc.textContent('.cal [data-k="2026-11-16"]')).includes("↺") && (await pc.locator(".cal button.miss").count()) === 3);
    await pc.click("#back"); await pc.click("#go-ach");
    check("実績の画面：取った実績は「達成」、まだの実績は条件と進み具合（3/7 など）", (await pc.locator(".ach").count()) === (await pc.evaluate(() => window.__sh.ACH.length)) && (await pc.textContent('.ach[data-id="late1"]')).includes("達成") && (await pc.textContent('.ach[data-id="d7"] .pg')) === "3/7" && (await pc.locator('.ach[data-id="d7"] .bar').count()) === 1);
    await pc.close(); }
  { // あとから：A日を途中まで → B日を始める → A日に戻ると続きから（前の日の途中を黙って消さない。CodeRabbit が前のゲームで指摘）
    const pr = await pageAt("2026-11-20", 390, base());
    const step = async () => { const c = await curT(pr); await pr.click(`#hand button[data-h="${c.p.chain[0]}"]`); };
    await pr.click("#go-cal"); await pr.click('.cal button[data-k="2026-11-16"]'); await step();
    await pr.click("#back"); await pr.click("#go-cal"); await pr.click('.cal button[data-k="2026-11-15"]'); await step();
    await pr.click("#back"); await pr.click("#go-cal");
    const mark = await pr.textContent('.cal button[data-k="2026-11-16"]');
    await pr.click('.cal button[data-k="2026-11-16"]');
    const back = await pr.evaluate(() => { const g = window.__sh, c = g.cur(), s = g.load(), p = g.probOf(g.dailyList("2026-11-16")[0]), r15 = s.runs["a:2026-11-15"]; return { a: c.p.s === p.s && c.path.length === 1 && c.moves === 1, b: !!r15 && r15.cur.path.length === 1 && JSON.stringify(r15.list) === JSON.stringify(g.dailyList("2026-11-15")) }; });
    check("あとから：A日を途中まで→B日を始める→A日に戻ると続きから（B日の途中も残る・カレンダーに「続き」）", back.a && back.b && mark.includes("続き"), JSON.stringify(back));
    await pr.close(); }
  { // load：保存に失敗したあと、片方にしか無い新しいキー（adays）も失わない（両方を先に fresh() で補う）
    const pn2 = await newPage();
    check("保存に失敗したあと、片方の記録にしか無い「あとから」の記録も統合で失わない", await pn2.evaluate((K) => { const g = window.__sh, s0 = g.load(); const old = Object.assign({}, s0, { t: 9 }); delete old.adays; mem = JSON.stringify(Object.assign({}, s0, { t: 5, adays: { "2000-01-01": { r: [] } } })); localStorage.setItem(K, JSON.stringify(old)); const r = g.load(); mem = null; const r2 = (() => { mem = JSON.stringify(old); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, adays: { "2000-01-02": { r: [] } } }))); const x = g.load(); mem = null; return x; })(); return !!r.adays["2000-01-01"] && !!r2.adays["2000-01-02"]; }, KEY));
    check("前の版の記録（adays が無い）を読んでも、あとからの入れ物ができて古い記録は消えない", await pn2.evaluate((K) => { localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: { "2026-11-04": { r: [{ m: 2, d: 2, h: 0 }] } }, hdays: {}, seen: { ねこ: 1 }, trips: 3, runs: {}, kofi: {} })); const s = window.__sh.load(); return !!s.adays && !!s.days["2026-11-04"] && s.seen["ねこ"] === 1 && s.trips === 3; }, KEY));
    await pn2.close(); }
  { // 0時をまたいで8日前になった日は、カレンダーを開いたままでも始めない
    const pz = await pageAt("2026-11-20", 390, base());
    await pz.click("#go-cal");
    await pz.evaluate(() => { const RD = Object.getPrototypeOf(Date), off = 7 * 864e5; const now = Date.now(); window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(now + off); } static now() { return now + off; } }; });
    await pz.click('.cal button[data-k="2026-11-13"]');
    check("開いたまま日付が進んで過去7日から外れた日は、あとから始めない", !(await pz.evaluate(() => window.__sh.mode())).startsWith("a"));
    await pz.close(); }
  { // とことん：問題が次々に出る・2枚→3枚→4枚→5枚・ヒントは🎫を使う・降りると自己ベスト（2026-11-05 satou さん「一日で遊べる量が少なすぎる」）
    const pe = await pageAt("2026-11-20", 390, base());
    check("とことんの並び（300回）：2枚3→3枚7→4枚20→5枚30、種はばらばら", await pe.evaluate(() => { const g = window.__sh; for (let n = 0; n < 300; n++) { const L = g.endlessList(); if (L.length !== 60 || new Set(L.map((x) => x.seed)).size < 59) return false; if (!L.every((x, i) => x.lv === (i < 3 ? 0 : i < 10 ? 1 : i < 30 ? 2 : 3))) return false; } return true; }));
    check("とことんの問題（5回分）：どれも作れて、1回の中で同じ問題が出ず、最短の枚数が少しずつ増える", await pe.evaluate(() => { const g = window.__sh; for (let n = 0; n < 5; n++) { const P = g.endlessList().map(g.probOf); if (!P.every(Boolean)) return false; if (new Set(P.map((p) => p.s + ":" + p.g)).size !== P.length) return false; const d = P.map((p) => p.d); if (!d.every((x, i) => i === 0 || x >= d[i - 1])) return false; } return true; }));
    check("ホームに「とことん」の大きなボタン", (await pe.locator("#go-e.main").count()) === 1);
    await pe.click("#go-e");
    for (let j = 0; j < 3; j++) { await solveNow(pe); await pe.click("#next"); }
    check("とことんは何問目かを出し、🎫が3枚", (await pe.textContent("header")).includes("4問目") && (await pe.evaluate(() => window.__sh.load().runs.e.life)) === 3);
    await pe.click("#hint");
    check("とことんのヒントは🎫を1枚使う", (await pe.evaluate(() => window.__sh.load().runs.e.life)) === 2 && (await pe.textContent("#life")).length > 0);
    await pe.click("#back"); await pe.click("#go-e");
    check("とことんは途中で閉じても続きから（4問目・🎫2・ヒント1回のまま）", (await pe.textContent("header")).includes("4問目") && (await pe.evaluate(() => window.__sh.load().runs.e.life)) === 2 && (await pe.evaluate(() => window.__sh.cur().hints)) === 1);
    await pe.click("#quit");
    check("降りるとつないだ数と自己ベスト更新が出て、記録に残る（今日の記録・連続には入らない）", (await pe.textContent("#eres")).includes("3問") && (await pe.textContent("#ebest")).includes("自己ベスト更新") && (await pe.evaluate(() => { const s = window.__sh.load(); return s.ebest === 3 && !s.runs.e && Object.keys(s.days).length === 0; })));
    check("終わりの画面に「もう一度とことん」の大きなボタン", (await pe.locator("#go-e.main").count()) === 1);
    await pe.click("#go-e"); await pe.click("#quit");
    check("ベストに届かないと、ベストと「あと何問で更新」を出し、ベストは下げない", (await pe.textContent("#ebest")).includes("あと4問で更新") && (await pe.evaluate(() => window.__sh.load().ebest)) === 3);
    await pe.click("#go-e");
    await pe.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.e.life = 0; localStorage.setItem(k, JSON.stringify(s)); }, KEY); await pe.click("#back"); await pe.click("#go-e");
    check("🎫が無いとヒントは押せない", await pe.locator("#hint").isDisabled());
    await pe.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.e.life = 3; s.runs.e.res = Array.from({ length: 30 }, () => ({ m: 2, d: 2, h: 0 })); s.runs.e.cur = null; localStorage.setItem(k, JSON.stringify(s)); }, KEY); await pe.click("#back"); await pe.click("#go-e");
    check("とことんの5枚の問題は、札が光りヒントも使える（上級とちがう）", (await pe.textContent("header")).includes("5枚") && (await pe.locator("#hand button.ok").count()) > 0 && !(await pe.locator("#hint").isDisabled()));
    await pe.close(); }
  { // 実績のあと：1回目の今日の3問を全部最短で終えると「はじめの一歩」「最短の日」が出て、結果を開き直すと出ない
    const pf = await pageAt("2026-11-20", 390, base());
    await pf.click("#go-d"); for (let j = 0; j < 3; j++) { await solveNow(pf); await pf.click("#next"); }
    const a1 = await pf.textContent("#achnew").catch(() => "");
    await pf.click("#back"); await pf.click("#go-d");
    check("初めて今日の3問を終えると結果に「🏅 実績：はじめの一歩」、開き直すと出ない（うるさくしない）", a1.includes("はじめの一歩") && a1.includes("最短の日") && (await pf.locator("#achnew").count()) === 0);
    check("結果に「あと少しの実績」を1つだけ出す：まだの実績のうち目標にいちばん近いもの（取った・0のものは選ばない。研究の要点 12）", await pf.evaluate(() => { const g = window.__sh, s = g.load(), t = g.tally(s), nx = g.nextAch(s), el = document.querySelectorAll("#achnext"); if (!nx) return el.length === 0; const cand = g.ACH.filter((a) => t[a[4]] > 0 && t[a[4]] < a[5]); return el.length === 1 && el[0].textContent.includes(nx.name) && el[0].textContent.includes("あと" + nx.left) && cand.every((a) => t[a[4]] / a[5] <= nx.r + 1e-12) && !g.achGot(s).includes(nx.id); }) && await pf.evaluate(() => window.__sh.nextAch(window.__sh.load()) !== null));
    check("今日の3問の結果はシェアの文がある（あとからとは別）", (await pf.locator(".share").count()) === 1);
    check("今日の3問の結果に「続けて遊ぶ：とことん」の大きなボタン", (await pf.locator("#go-e.main").count()) === 1);
    await pf.close(); }
  { // 320px・390px：ホーム・実績・カレンダー・あとから・結果が横にはみ出さず、押せる所は44px以上
    const st = base(); st.days["2026-11-19"] = R3([0, 0, 0]); st.adays["2026-11-15"] = R3([1, 0, 0]);
    mkdirSync(path.join(root, "qa-report"), { recursive: true });
    for (const w of [320, 390]) {
      const pw = await pageAt("2026-11-20", w, st), bad = [];
      const look = async (name) => { await pw.waitForTimeout(700); await pw.screenshot({ path: path.join(root, `qa-report/${name}-${w}.png`), fullPage: true }); const r = await pw.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) })); if (r.over || r.small.length) bad.push(`${name}:${r.over ? "はみ出し" : ""}${r.small.join("/")}`); };
      await look("home"); await pw.click("#go-ach"); await look("ach"); await pw.click("#back"); await pw.click("#go-cal"); await look("cal");
      await pw.click('.cal button[data-k="2026-11-18"]'); { const c = await curT(pw); await pw.click(`#hand button[data-h="${c.p.chain[0]}"]`); } await look("late-play");
      for (let j = 0; j < 3; j++) { await solveNow(pw); if (j === 0) await look("arrive"); await pw.click("#next"); }
      await look("late-result"); await pw.click("#back"); await pw.click("#go-d"); for (let j = 0; j < 3; j++) { await solveNow(pw); await pw.click("#next"); } await look("result");
      await pw.click("#go-e"); { const c = await curT(pw); await pw.click(`#hand button[data-h="${c.p.chain[0]}"]`); } await look("endless"); await pw.click("#quit"); await look("endless-end");
      check(`幅${w}px：ホーム・実績・カレンダー・あとから・結果・とことん（遊ぶ・終わり）が横にはみ出さず、押せる所は44px以上`, bad.length === 0, bad.join(" "));
      await pw.close();
    } }
} catch (e) {
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  try { // 引き継ぎコード（別の端末へ記録を移す。shared-workflows template/qa/transfer-check.mjs）
    await checkTransfer({ browser, url, game: "shiritori-saitan", sample: { "shiritori-v1": JSON.stringify({ v: 1, tut: true }) }, check, open: async (p) => { await p.click("#howto-ok", { timeout: 1500 }).catch(() => {}); } });
  } catch (e) { check("引き継ぎコード", false, e.message.split("\n")[0]); }
  await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

const ng = results.filter((r) => !r.ok);
const md = `# しりとり最短 QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
