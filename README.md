# 🎮 おてつだいクエスト (Otetsudai Quest)

> **親子で楽しく習慣化！モバゲー風2.5頭身アバターとリアルタイム同期を備えたゲーミフィケーション・ファミリーWebアプリ**

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-FF5722?style=flat&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

## 📖 プロジェクト概要

「おてつだいクエスト」は、子どもの日常のお手伝いや宿題・片付けを「言われてやる義務」から**「冒険を進めるゲーム感覚のクエスト」**へと変えるWebアプリケーションです。

親のスマートフォンと子どものタブレットなど、複数端末で同時に開きながら**リアルタイムに双方向同期**が可能。子どもが「できた！」と報告すると親の画面に即座に通知が届き、承認するとファンファーレや紙吹雪とともにコインを獲得。貯めたコインでアバターガチャを回したり、ごほうびチケット（「ゲーム30分券」「アイス券」など）と交換できます。

---

## ✨ 主な機能

### 1. 🎨 2.5頭身 2Dベクターアバターシステム (`GameAvatar2D`)
- **完全ベクター（SVG）描画**: 画像アセットを一切使わず、数千行のベクターパスとグラデーションで「ポケコロ」「モバゲー」「ねんどろいど」のような可愛いイラスト調2.5頭身キャラクターを実現。
- **10階層レイヤー構成**:
  1. `background`（背景ステージ）
  2. `pet`（ペット・使い魔）
  3. `effect`（キラキラ・オーラ）
  4. `weapon`（右手・持たせもの）
  5. `backHair`（後ろ髪：ツインテ・ポニテ・ロング等）
  6. `body`（素体：輪郭、首、手足、丸い靴）
  7. `outfit`（服：パーカー、ワンピース、鎧、オーバーオール等）
  8. `face`（表情：8種類の瞳・ハイライト・チーク・口）
  9. `frontHair`（前髪＋サイド毛＋天使の輪ハイライト）
  10. `head`（リボン、王冠、ナイトキャップ等）
- **表情・髪型の充実**:
  - 表情8種（にっこりガール、さわやかボーイ、わんぱくニカッ、クールウィンク、やるき満々、わーいスマイル、キラッ☆ウィンク、はずかし照れ顔）
  - 髪型6種 × 動的ヘアカラー変更対応
- **試着ライブプレビュー**: 着せ替え画面で自分の現在のアバターがアイテムを試着した姿をリアルタイムレンダリング（頭部パーツ選択時は顔まわりが自動でズームアップ）。

### 2. ⚡ Supabase Realtime による複数端末の双方向同期
- **端末表示モードとクラウドデータの完全分離**:
  - 親のスマホ（親管理ダッシュボード）と子どものタブレット（ゲーム画面）を同時に別々のモードで閲覧可能。
  - お手伝いの達成報告、親の承認、コイン増減、ガチャ結果、タイマー稼働状況はミリ秒単位でリアルタイム同期。
- **ハイブリッドフォールバック設計**:
  - Supabase未接続時やオフライン時は自動で `localStorage` 単体モードにフォールバック。環境変数がなくてもクラッシュせず完全に動作。

### 3. 📱 ワンタップQR招待 ＆ URLパラメータ自動連携
- **URLパラメータ連携**: `https://.../?room=あいことば` を開くだけで、端末のローカルストレージにルームIDを自動登録し、アドレスバーからパラメータをクリーンアップ。
- **招待QRコード生成**: 親の管理画面からワンタップで接続用QRコードをポップアップ表示。子どものタブレットで読み取るだけで手入力不要で即連携。

### 4. 📝 クエスト＆承認センター（保護者機能）
- **安心のPINロック保護**: 4桁の暗証番号でおやモードを保護。
- **柔軟なお手伝い作成**: 毎日の日課、週末限定、獲得コイン、所要時間の目安などを親が自由にカスタマイズ可能。
- **リアルタイム承認＆差し戻し**: 写真や報告内容を確認し、ワンタップで承認（ファンファーレ演出）や差し戻し。
- **サプライズ宝箱プレゼント**: 頑張っている子どもへ、親からメッセージ・ボーナスコイン・限定チケットが入った宝箱を遠隔プレゼント可能。

### 5. 🏪 ごほうびショップ ＆ アバターガチャ
- **ごほうびチケット交換**: 「おやつ1個券」「テレビ30分延長券」など、現実の約束と連動したチケットをコインで交換。
- **デジタルタイマー連動**: チケット使用時にタイマーが作動。親の画面からもリアルタイムで残り時間を確認・遠隔ストップ可能。
- **ピクチャー・イン・ピクチャー（PiP）対応**: タイマーを画面隅の小窓に浮かせて別画面を閲覧可能。
- **ガチャシステム**: 貯めたコインでカプセルガチャを回し、新しい髪型・衣装・頭飾り・ペットをアンロック。

### 6. 🔊 外部ファイル不要のプログラマブルWeb Audio SE
- 外部音声（mp3/wav）をダウンロードせず、ブラウザ標準の `Web Audio API` でオシレーター（矩形波・サイン波・ノイズ等）をリアルタイム合成。
- タップ音、コイン獲得音、ファンファーレ、レベルアップ音、エラー音を超軽量かつ遅延ゼロで再生。

---

## 🛠️ 技術スタック

| カテゴリ | 採用技術 | 選定理由・役割 |
|---|---|---|
| **フロントエンド** | React 18 / TypeScript / Vite | 高速なHMR、厳格な型安全性、コンポーネント指向設計 |
| **スタイリング** | Tailwind CSS / Lucide React | ユーティリティファーストによる高速UI構築、軽量ベクターアイコン |
| **BaaS / データベース** | Supabase (PostgreSQL + Realtime) | 親子間マルチデバイスのリアルタイム同期、WebSocket配信 |
| **グラフィックス** | インラインSVG（純粋ベクター） | 解像度非依存、外部アセット不要、CSS変数による動的着せ替え |
| **オーディオ** | Web Audio API (Synthesizer) | アセット読み込み不要、完全オフライン対応、低遅延サウンド演出 |
| **演出** | Canvas Confetti | 承認・ガチャ・宝箱開封時のワクワクする紙吹雪アニメーション |
| **PWA** | Web App Manifest + Service Worker | ホーム画面追加、フルスクリーン表示、スタンドアロン動作 |
| **ホスティング** | Vercel | SPAルーティングリライト、高速CDNエッジ配信、GitHub自動連携 |

---

## 📁 ディレクトリ構成

```text
otetsudai-quest/
├── public/
│   ├── icon.svg             # アプリアイコン（PWA用）
│   └── manifest.json        # PWAマニフェスト設定
├── src/
│   ├── components/
│   │   ├── Avatar.tsx       # 2.5頭身2Dベクターアバター描画（GameAvatar2D）
│   │   ├── AvatarMaker.tsx  # アバター着せ替え・カスタマイズ画面
│   │   ├── ChestModal.tsx   # サプライズ宝箱開封演出モーダル
│   │   ├── ErrorBoundary.tsx# エラー境界コンポーネント
│   │   ├── GachaModal.tsx   # アバターガチャ演出モーダル
│   │   ├── KidNotices.tsx   # 子ども向けお知らせ・通知カード
│   │   ├── KidQuests.tsx    # クエスト一覧＆達成報告UI
│   │   ├── KidShop.tsx      # ショップ＆チケット交換UI
│   │   ├── KidTicketsTimer.tsx # 所持チケット＆稼働タイマーUI
│   │   ├── PinPad.tsx       # 親モード保護用テンキーPIN入力UI
│   │   ├── TopNav.tsx       # ヘッダーナビゲーション＆ステータス
│   │   └── ui.tsx           # モーダル、トースト、バッジ等共通UI部品
│   ├── views/
│   │   ├── KidView.tsx      # 子ども用メインゲームビュー
│   │   ├── LoginView.tsx    # ユーザー切替画面
│   │   └── ParentView.tsx   # 保護者用管理ダッシュボード＆招待QR
│   ├── actions.ts           # 状態変更アクション（承認、購入、ガチャ等）
│   ├── avatar.ts            # アバターマスターデータ（パーツ・カラー定義）
│   ├── effects.ts           # パーティクル・紙吹雪演出ヘルパー
│   ├── hooks.ts             # タイマー・現在時刻更新フック
│   ├── logic.ts             # コイン・経験値・レベル計算ロジック
│   ├── notify.ts            # ブラウザ通知（Web Notification API）
│   ├── pip.ts               # ピクチャー・イン・ピクチャー制御
│   ├── presets.ts           # 初期プリセットデータ（初期クエスト・ショップ品）
│   ├── sound.ts             # Web Audio API シンセサイザーSE
│   ├── store.ts             # 状態管理（State + Supabase同期統合）
│   ├── supabase.ts          # Supabaseクライアント・Realtime・招待URL処理
│   ├── types.ts             # TypeScript全型定義
│   └── utils.ts             # 日時フォーマット・ID生成等の汎用ユーティリティ
├── .env.example             # 環境変数テンプレート
├── .gitignore               # Git除外設定（.env.local除外）
├── index.html               # メインHTML
├── package.json             # 依存パッケージ定義
├── tailwind.config.js       # Tailwind CSS設定
├── tsconfig.json            # TypeScriptコンパイラ設定
├── vercel.json              # Vercel用SPAリライト設定
└── vite.config.ts           # Viteバンドラ設定
```

---

## 🚀 開発環境のセットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/cervelo874-dev/otetsudai-quest.git
cd otetsudai-quest
```

### 2. 依存パッケージのインストール
```bash
npm install
```

### 3. 環境変数の設定（ローカル開発）
プロジェクトルートに `.env.local` を作成し、Supabaseの接続情報を記述します：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
※未設定の場合でも、自動的にローカルストレージ単体モードとして動作します。

### 4. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで `http://localhost:5173` を開きます。

### 5. 本番ビルドテスト
```bash
npm run build
```

---

## 🌐 デプロイ手順 (Vercel)

1. [Vercel](https://vercel.com/) にログインし、「**Add New...**」→「**Project**」を選択。
2. GitHub リポジトリ `cervelo874-dev/otetsudai-quest` をインポート。
3. **Environment Variables** に以下を設定：
   - `VITE_SUPABASE_URL`: SupabaseのProject URL
   - `VITE_SUPABASE_ANON_KEY`: Supabaseのanon public key
4. 「**Deploy**」をクリックすると、1〜2分でWeb上に公開されます。

---

## 💡 開発における工夫と技術的ハイライト

1. **外部アセットに依存しない自己完結型設計**:
   - 画像ファイルや音声ファイルをロードしないため、初回ロードが極めて高速で、オフライン時でも見た目や音が一切壊れません。
2. **SVGパスの幾何学的最適化**:
   - ベジェ曲線の自己交差による塗りの反転バグや、衣服の袖・陰影の重なり順を数学的に調整し、イラストレーターが描いたような立体感のあるちびキャラを実現。
3. **Optimistic UI（楽観的UI更新）とリアルタイム整合性**:
   - ボタン操作時に即座にローカル画面を更新し、バックグラウンドでSupabase Realtimeへブロードキャストすることで、ネットワーク遅延を感じさせない快適な操作性を担保。
4. **招待動線の極小化**:
   - 親がQRコードを出し、子どもがタブレットで撮るだけで即完了。合言葉の入力ミスや子どもがキーボードで手こずるストレスをゼロにしました。

---

## 📄 ライセンス

This project is open-sourced under the MIT License.
