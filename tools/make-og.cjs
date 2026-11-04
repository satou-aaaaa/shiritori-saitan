// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題は入れず、見本のつながりだけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const cards = [["西瓜", "すいか", "#2f8a5b"], ["亀", "かめ", "#8a8170"], ["眼鏡", "めがね", "#8a8170"], ["猫", "ねこ", "#d2492f"]];
  const html = cards.map((c, i) => `<div style="position:absolute;left:${640 + (i % 2) * 250}px;top:${70 + i * 120}px;width:230px;height:104px;background:#fffdf7;border:4px solid ${c[2]};border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(${i % 2 ? 3 : -3}deg);box-shadow:0 6px 0 #26323a22"><div style="font-size:46px;font-weight:900;color:#26323a">${c[0]}</div><div style="font-size:24px;color:#5f6f78">${c[1]}</div></div>`).join("");
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:70px 80px;background:#e6eddc;color:#26323a;position:relative;overflow:hidden">
    <div style="font-size:34px;color:#9b3220;letter-spacing:.1em">だれでも同じ 1日3問・3分</div>
    <div style="font-size:100px;font-weight:900;margin-top:16px;letter-spacing:.04em">しりとり最短</div>
    <div style="font-size:40px;margin-top:18px;line-height:1.5">手札の言葉だけで、<br>目的の言葉までつなげる？</div>
    ${html}
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
