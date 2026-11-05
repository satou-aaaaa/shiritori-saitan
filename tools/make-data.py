#!/usr/bin/env python3
"""しりとり最短の言葉を JMdict から作る（標準ライブラリだけ）。

使い方: python3 tools/make-data.py <jamdict.db>
  jamdict.db は PyPI の jamdict-data（JMdict を SQLite にしたもの）の中の jamdict.db.xz を解いたもの。
決まり:
- よく使う名詞だけ（読みに ichi1 と news1、漢字の書き方にも ichi1 の印）。接頭語・接尾語・助数詞・代名詞は外す。
- 読みは2〜5字。「ん」で終わる言葉は入れない（しりとりで使えない）。
- つらい言葉（死・殺など）は使わない。
- 性別に寄った言葉（lib/gender-ng.js の一覧。shared-workflows template/qa/a11y.mjs の WORDS）を含む言葉も使わない。
  ※ 作り直すと過去の日の問題が変わる。いまの words.js は過去の日のために残し、2026-11-07 からは gen.js が選ばない。
JMdict は © EDRDG、CC BY-SA 4.0。words.js も CC BY-SA 4.0。
"""
import sqlite3, sys, collections, json, os, re

# 性別に寄った言葉：lib/gender-ng.js の NG の並びを読む（一覧を1か所に置く）
_g = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib", "gender-ng.js"), encoding="utf-8").read()
GENDER_NG = re.findall(r'"([^"]+)"', re.search(r"var NG = \[([\s\S]*?)\];", _g).group(1))
def gender_hit(t):
    return any((re.search(r"(^|[^A-Za-z])OL($|[^A-Za-z])", t) if w == "OL" else w in t) for w in GENDER_NG)

NG = set("死殺葬屍姦淫娼尿糞呪遺棺骸刑獄墓弔喪病癌毒虐暴拷凶犯罪賊奴隷傷害戦爆銃兵敵怨憎")
c = sqlite3.connect(sys.argv[1])
pri = collections.defaultdict(set)
for kid, t in c.execute("select kid,text from KJP"): pri[("k", kid)].add(t)
for kid, t in c.execute("select kid,text from KNP"): pri[("r", kid)].add(t)
pos = collections.defaultdict(set)
for idseq, t in c.execute("select s.idseq,p.text from Sense s join pos p on p.sid=s.ID"): pos[idseq].add(t)
kanji = collections.defaultdict(list)
for kid, idseq, t in c.execute("select ID,idseq,text from Kanji order by ID"): kanji[idseq].append((kid, t))
kana = collections.defaultdict(list)
for kid, idseq, t in c.execute("select ID,idseq,text from Kana order by ID"): kana[idseq].append((kid, t))

def hira(s):
    return "".join(chr(ord(ch) - 0x60) if "ァ" <= ch <= "ヶ" else ch for ch in s)

words, seen = [], set()
for idseq in sorted(kana):
    P = pos[idseq]
    if not any("noun (common)" in p for p in P): continue
    if any(("suffix" in p or "prefix" in p or "counter" in p or "pronoun" in p or "numeric" in p) for p in P): continue
    rk, rt = kana[idseq][0]
    if not ({"ichi1", "news1"} <= pri[("r", rk)]): continue
    if kanji.get(idseq):
        kk, kt = kanji[idseq][0]
        if "ichi1" not in pri[("k", kk)]: continue
        disp = kt
    else:
        disp = rt
    r = hira(rt)
    if not (2 <= len(r) <= 5) or r.endswith("ん") or set(disp) & NG: continue
    if gender_hit(disp) or gender_hit(r): continue
    if not all("ぁ" <= ch <= "ゖ" or ch == "ー" for ch in r): continue
    if r in seen: continue  # 同じ読みは1つだけ
    seen.add(r)
    words.append([disp, r])
words.sort(key=lambda w: w[1])
with open("words.js", "w", encoding="utf-8") as f:
    f.write("// しりとりの言葉（表記・よみ）。tools/make-data.py で JMdict から作る（手で直さない）。JMdict © EDRDG、CC BY-SA 4.0。\n")
    f.write("(function(r){var W=" + json.dumps(words, ensure_ascii=False, separators=(",", ":")) + ";if(typeof module!=='undefined')module.exports=W;else r.SH_WORDS=W;})(this);\n")
print(len(words), "語")
