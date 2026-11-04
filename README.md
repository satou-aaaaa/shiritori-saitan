# しりとり最短

手札の言葉だけで、出発の言葉から目的の言葉までしりとりでつなぐ。いちばん少ない枚数でつなげるかを競う、1日3問の言葉パズル。

- 遊ぶ: https://satou-aaaaa.github.io/shiritori-saitan/
- 出発の言葉の最後の字で始まる札を手札から出し、しりとりでつないで、目的の言葉の最初の字にたどり着いたら到着です。「ひとつ戻る」で戻れますが、出した回数は減りません。最短で着けば★3つ。
- 小さい字は大きい字に（「ゃ」は「や」）、最後が「ー」なら、その前の字でつなぎます。濁った字はそのままです。
- 今日の3問（2枚・3枚・4枚つなぐ）はだれでも同じで1日1回。上級（5枚つなぐ2問・札が光らない・ヒントなし）、練習、使った言葉が集まる言葉帳があります。時間制限はありません。
- 記録は遊ぶ人のブラウザにだけ残り、ゲームから自動で外へ送ることはありません。例外は2つ：文字（Google Fonts）を読み込むとき、まだ端末に保存が無ければ Google に IP アドレスが届きます。「Xで投稿」「LINEで送る」「結果をシェア」を押したときだけ、結果の文が選んだ先に渡ります（言葉は入りません）。

## 言葉のデータ

言葉は [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html)（© Electronic Dictionary Research and Development Group）から、よく使う名詞を `tools/make-data.py` で選んだものです。JMdict は [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) で、`words.js` も CC BY-SA 4.0 です。

## 開発

```bash
bash scripts/setup.sh   # 最初に一度
node qa/run.mjs         # 検査（CI と同じ）
python3 tools/make-data.py <jamdict.db>   # words.js を作り直すとき（PyPI の jamdict-data の jamdict.db.xz を解いたもの）
```

感想は [Issue のフォーム](https://github.com/satou-aaaaa/shiritori-saitan/issues/new?template=feedback.yml) からどうぞ。
