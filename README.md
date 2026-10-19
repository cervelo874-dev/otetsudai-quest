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

### 1. 🎨 モバゲー風3頭身アバターシステム ＆ アバター工房 (`src/features/avatar`)
- **高品質イラスト＆ベクターのハイブリッド描画**: ポケコロやモバゲーを彷彿とさせるリッチな高品質イラスト透過PNGパーツと、軽量なベクターSVGを両立。
- **全18レイヤー構成とドラッグ＆ドロップ重なり順変更 (`AvatarLayerOrderPanel`)**:
  - `background`、`back_effect`、`hair_back`、`leg_left/right`、`body`、`arm_left/right`、`face_eyes`、`face_mouth`、`bottoms`、`shoes`、`tops`、`hair_front`、`hat_glasses`、`hand_item`、`pet`、`front_effect` の全18部位。
  - レイヤー管理パネルから直感的なドラッグ＆ドロップで、アイテムごとの前後関係（前面・後面）をミリ単位で自由自在に入れ替え可能。
- **服と手足のセット記憶 ＆ ワンピース自動連動**:
  - ドレスやワンピースを着た際に手足がセットで自動装着され、ボトムス（ズボン）を自動で非装着にするスマートな連動記憶を搭載。
- **左右対称パーツの自動複製・反転機能**:
  - 片側の腕や脚を作成するだけで、ワンタッチで反対側へ同一サイズ・位置で左右反転複製。

### 2. ✂️ GIMP風 楕円選択ツール ＆ 高精度パーツ透過エディタ (`EllipseCropModal`)
- **Canvasベースのインタラクティブな楕円・正円選択枠**:
  - マウスやタッチ操作で直感的に楕円選択範囲を作成。
  - 8方向のリサイズハンドル、内部ドラッグ移動、`Shift` キーまたはUIトグルによる「1:1 正円固定」に対応。
- **2つの切り取りアクション**:
  - **「選択範囲内を消去 (destination-out)」**: 円の内側だけを透明にくり抜く（服の襟ぐりや重なりで不要なパーツの一部を除去）。
  - **「選択範囲外を消去 (Crop to Circle)」**: 円の内側だけを残し、外側をすべて透明化。
- **参照ガイド（下敷き／オニオンスキン）機能**:
  - 素体（首元・鎖骨・体型ライン）や、現在のアバター全身コーディネートを**アスペクト比を維持したまま（歪ませずに）**下敷きまたは前面に半透明表示。
  - 不透明度スライダー（10%〜100%）や表示切り替えボタン（目のアイコン）で、他のパーツと照らし合わせながら正確に位置を合わせてくり抜き可能。
- **素材のサイズスライダー ＆ 位置微調整（モード切替不要）**:
  - 素材の大きさ（30%〜250%）をスライダーで自由に拡縮。
  - X/Y方向スライダーおよび十字方向キー（↑ ↓ ← →）により、1px単位で精密に素体の首元や頭に重ね合わせ可能。
- **アバター座標の完全維持 ＆ 品質設定**:
  - アバター重ね合わせ用の 512×512 解像度と座標を完全に維持（オプションで余白タイト切り出しも選択可能）。
  - 境界のぼかし（Feather: 0〜10px）によるアンチエイリアス処理。
  - 最大25ステップの Undo/Redo 履歴、ズーム表示（30%〜300%）、市松模様背景、PNG保存。

### 3. 🧪 AI位置合わせ ＆ 透過スタジオ (`PartCalibrationStudio`)
- **ワンクリック背景透過（クロマキー合成）**: 四隅からの背景色自動検出、スポイトツールによる特定色除去、消しゴムツール。
- **3頭身自動サイズ正規化**: 不透明ピクセル領域を自動計測し、頭身比率に合わせた標準スケールと基準位置へ一発自動配置。
- **512×512 アバター標準アセット書き出し**: 作成したパーツを即座にカタログやクローゼットへ登録。

### 4. ⚡ Supabase Realtime による複数端末の双方向同期
- **端末表示モードとクラウドデータの完全分離**:
  - 親のスマホ（親管理ダッシュボード）と子どものタブレット（ゲーム画面）を同時に別々のモードで閲覧可能。
  - お手伝いの達成報告、親の承認、コイン増減、ガチャ結果、タイマー稼働状況はミリ秒単位でリアルタイム同期。
- **ハイブリッドフォールバック設計**:
  - Supabase未接続時やオフライン時は自動で `localStorage` 単体モードにフォールバック。環境変数がなくてもクラッシュせず完全に動作。

### 5. 📱 ワンタップQR招待 ＆ URLパラメータ自動連携
- **URLパラメータ連携**: `https://.../?room=あいことば` を開くだけで、端末のローカルストレージにルームIDを自動登録し、アドレスバーからパラメータをクリーンアップ。
- **招待QRコード生成**: 親の管理画面からワンタップで接続用QRコードをポップアップ表示。子どものタブレットで読み取るだけで手入力不要で即連携。

### 6. 📝 クエスト＆承認センター（保護者機能）
- **安心のPINロック保護**: 4桁の暗証番号でおやモードを保護。
- **柔軟なお手伝い作成**: 毎日の日課、週末限定、獲得コイン、所要時間の目安などを親が自由にカスタマイズ可能。
- **リアルタイム承認＆差し戻し**: 写真や報告内容を確認し、ワンタップで承認（ファンファーレ演出）や差し戻し。
- **サプライズ宝箱プレゼント**: 頑張っている子どもへ、親からメッセージ・ボーナスコイン・限定チケットが入った宝箱を遠隔プレゼント可能。

### 7. 🏪 ごほうびショップ ＆ アバターガチャ
- **ごほうびチケット交換**: 「おやつ1個券」「テレビ30分延長券」など、現実の約束と連動したチケットをコインで交換。
- **デジタルタイマー連動**: チケット使用時にタイマーが作動。親の画面からもリアルタイムで残り時間を確認・遠隔ストップ可能。
- **ピクチャー・イン・ピクチャー（PiP）対応**: タイマーを画面隅の小窓に浮かせて別画面を閲覧可能。
- **ガチャシステム**: 貯めたコインでカプセルガチャを回し、新しい髪型・衣装・頭飾り・ペットをアンロック。

### 8. 🔊 外部ファイル不要のプログラマブルWeb Audio SE
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
│   │   ├── AvatarStudioSection.tsx # アバター工房統合セクション
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
│   ├── features/
│   │   └── avatar/          # モバゲー風3頭身アバター工房モジュール
│   │       ├── components/
│   │       │   ├── AvatarRenderer.tsx       # 18レイヤー合成描画コンポーネント
│   │       │   ├── AvatarCloset.tsx         # 高機能着せ替えクローゼットUI
│   │       │   ├── AvatarLayerOrderPanel.tsx# レイヤー重なり順ドラッグ調整パネル
│   │       │   ├── EllipseCropModal.tsx     # GIMP風楕円選択＆パーツ透過モーダル
│   │       │   └── PartCalibrationStudio.tsx# AI位置合わせ＆透過スタジオ
│   │       ├── hooks/
│   │       │   └── useEllipseSelection.ts   # 楕円選択枠インタラクション用フック
│   │       ├── presets/     # 高品質イラスト＆SVGプリセット
│   │       ├── storage/     # カタログ・配置テンプレート永続化
│   │       ├── utils/       # 画像処理・透過PNG合成・自動リギング
│   │       └── index.ts     # アバターモジュール外部公開エントリー
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
