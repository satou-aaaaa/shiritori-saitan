# AGENTS.md

しりとり最短：手札の言葉だけで、出発の言葉から目的の言葉までしりとりでつなぎ、いちばん少ない枚数を競う1日3問の言葉パズル。`index.html` と `gen.js`（問題の作り方）・`words.js`（言葉）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

## push する前の確認

```bash
node qa/run.mjs   # 言葉のデータ・問題の作り方（4種類×2000問、最短を全部の並べ方で数え直す）・3問の組み方（1年分）・出す/戻る/ヒント・行き止まり・続きから・上級・言葉帳・道しるべ・実績・カレンダー・あとから（700日分）・スマホ幅・PWA（CI の QA と同じ）
```

## このリポジトリの決まり

- `words.js` は `python3 tools/make-data.py <jamdict.db>` で JMdict から作る（手で直さない）。よく使う名詞（読みに ichi1・news1、漢字の書き方に ichi1）、読み2〜5字、「ん」で終わらない、同じ読みは1つ。つらい言葉（死・殺など）は `NG` で外す（QA が見る）。
- JMdict は © EDRDG、CC BY-SA 4.0。`words.js` も CC BY-SA 4.0 で、README に出どころを書く（消さない）。
- 字のきまり：小さい字は大きい字（`BIG`）、最後の「ー」は前の字、濁った字はそのまま。遊び方と README に同じことを書く。
- 問題は `gen.js` の `make` が種から作る：先に正しい道（字を重ねない）を作り、道の途中の字で始まる「まよう札」を、最短が変わらないものだけ足す。手札は答えの順に並べない。種類は `LV`（2枚・3枚・4枚）と `HARD`（5枚・手札12枚）。`gen.js` や `words.js` を変えると過去の日の問題も変わるので、変えた PR に一言書く。
- 今日の3問・上級は日本時間の日付から作る種（`seedOf`）で決まり、だれでも同じ。`Math.random()` は練習・とことんの問題の種だけ（QA が数を見る）。
- ★は出した回数で決める（最短で★3・2枚まで多くて★2・それ以上★1）。ヒント（最短で着ける札を光らせる）1回ごとに★を1つ減らす（最低★1、2回まで）。「ひとつ戻る」で戻っても出した回数は減らさない。上級は札を光らせず、ヒントなし。時間制限は付けない。
- 今日の3問・上級は1日1回で、途中で閉じても出した札とヒントのまま続きから。保存してあった札の並びは、手札の札を1回ずつ・しりとりがつながるかを確かめてから使う（`valid`）。途中経過はモードごとに分けて保存し（`runs.d`・`runs.h`・`runs.p`）、練習で今日・上級の途中を消さない。答えを入れる前に、保存した進み具合が画面と同じ問題か確かめる。記録は保存の前に読み直す。保存に失敗したあとは、途中経過を時刻でなく進み具合で選び、言葉帳の数は多いほうを残す（shared-workflows `incidents/2026-11-04-daily-game-save-gaps.md`）。
- とことん（`runs.e`）：今日の分のあとも続けて遊べるよう、2枚3問→3枚7問→4枚20問→5枚30問を毎回ちがう種で次々に出す（`endlessList`。5枚の問題も札が光りヒントが使える）。ヒント1回で🎫1枚（3枚まで）、「ここで降りる」で終わり、つないだ問題の数の自己ベスト `ebest` を残す。今日の記録・連続・Ko-fi・シェアには数えない（言葉帳・つないだ問題には入る）。他の人との順位は出さない。ホームと今日の結果の画面に大きなボタンを置く（2026-11-05 satou さん「一日で遊べる量が少なすぎる」）。
- 遊ぶ画面の道しるべ（`#par`）は最短の枚数のますと「ねらえる★」を出す。ねらえる★は出した回数・いまの枚数・ヒントだけで決め、いまの道が最短につながるかは言わない（答えを言わない）。
- 実績（`ACH`）は記録（`days`・`hdays`・`adays`・`seen`）から毎回数える。新しく残すものは無く、回を始めたときの一覧 `a0` と比べて結果に「🏅 実績：」を出す。腕前・集める・続けるを混ぜる。実績を足したら QA の数（10〜14）も見直す。結果の画面には、まだの実績のうち目標にいちばん近いもの1つを「🎯 次の実績」で出す（`nextAch`。shared-workflows `routines/game-dev.md` 研究の要点 12）。
- 取りこぼした日（`lateDays`：過去7日・`EPOCH` より後）は、カレンダーからその日の今日の3問（`dailyList(その日)`）をあとから遊べる。記録は `adays`、途中経過は日付ごとの `runs["a:日付"]`（別の日を始めても前の日の途中を消さない）。連続の日・今日の記録・シェア・Ko-fi には数えない（言葉帳・実績には数える）。連続の日は1以上のときだけ出す。
- 共有は遊ぶ人が押したときに開くリンク（X・LINE・Web Share・コピー）だけ。シェアの文に言葉（答え）を出さない（🟩最短・🟨2枚まで多い・🟧もっと多い・💡ヒント）。
- 文字は少なめ・一画面一問。お笑いの言葉は入れない（QA が見る）。ほかの作品の名前・キャラ・見た目は使わない。
- 感想は「感想を送る」から GitHub の Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`、ラベル「感想」）を開くだけ。項目は shared-workflows の `template/.github/ISSUE_TEMPLATE/feedback.yml` と同じにし、名前・メールは聞かない。週1で shared-workflows `routines/game-feedback.md` が読んで直す。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。今日の3問・上級を初めて終えて全部最短（ヒントなし）のときだけ、結果の画面の下に1行（共有フォルダ kofi/app-guide.md）。遊ぶのは無料のまま、有料版は置かない。
- 外へ通信しない。外から読むのは Google Fonts の文字だけ（CSP の `connect-src 'self'` を広げない）。記録は遊ぶ人のブラウザ（localStorage）だけ。
- 同じ日はどの端末でも同じ問題にする：乱数は `sort` の比較の中で引かない（QA が見る）。少し遅れて動く処理（setTimeout）は、画面が替わっていたら何もしない。
- 押せる所は高さ44px以上、いちばん長い言葉の札も幅320pxではみ出さない（QA が見る）。機能を足す・直すたびに `qa/run.mjs` に検査を足す。乱数で組む部分は何千回も作って確かめる（shared-workflows `incidents/2026-10-31-roppo-empty-village.md`）。
- PWA（`manifest.webmanifest`・`sw.js`・`icon-*.png`）：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、SNS 用の絵 `og.png` は `node tools/make-og.cjs`（今日の問題を入れない）。
- 引き継ぎコード（別の端末へ記録を移す）：`transfer.js`・`qa/transfer-check.mjs` は shared-workflows の `template/` の写し（ここで直さない。直すときはひな形を直して配り、`引き継ぎの版` を上げる）。`index.html` の script の `data-keys` は記録のキーだけを書く。記録の形を変えたら `qa/run.mjs` の `checkTransfer` の `sample` も合わせる。sw.js の `SHELL` から `./transfer.js` を外さない（shared-workflows `routines/game-dev.md`「引き継ぎコード」）。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを待ち、手でマージする直前に今の head へのレビューを読み直す（shared-workflows `incidents/2026-11-01-roppo-merged-before-review.md`）。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
