// アプリのアイコン（icon-192.png・icon-512.png）を作る。生成りの札が3枚、しりとりでつながる。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" font-family="'Noto Sans CJK JP',sans-serif" font-weight="900" text-anchor="middle">
      <rect width="100" height="100" fill="#e6eddc"/>
      <g transform="rotate(-8 50 50)"><rect x="10" y="24" width="30" height="40" rx="5" fill="#fffdf7" stroke="#2f8a5b" stroke-width="3"/><text x="25" y="52" font-size="20" fill="#2f8a5b">し</text></g>
      <rect x="35" y="30" width="30" height="40" rx="5" fill="#fffdf7" stroke="#8a8170" stroke-width="3"/><text x="50" y="57" font-size="20" fill="#26323a">り</text>
      <g transform="rotate(8 50 50)"><rect x="60" y="36" width="30" height="40" rx="5" fill="#fffdf7" stroke="#d2492f" stroke-width="3"/><text x="75" y="63" font-size="20" fill="#d2492f">と</text></g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
