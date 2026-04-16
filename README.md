# うたアーカイブ

YouTubeの歌配信・ウクレレ配信から楽曲を切り出してデータベース化し、検索・プレイリスト作成・再生ができるWebサイトです。

---

## 機能一覧

- 🎵 **楽曲追加** — YouTube配信URLからタイムスタンプ単位で楽曲を登録
- 🔍 **検索** — ひらがな・カタカナ・ローマ字（表記ゆれ対応）で楽曲検索
- 🎧 **プレイリスト** — ドラッグ＆ドロップで並び替え可能なプレイリスト
- ▶️ **ミニプレイヤー** — ページをまたいでも途切れない再生
- 🔐 **パスワード認証** — 編集はパスワード `0519` で保護

---

## セットアップ手順

### 1. Firebase プロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」→ プロジェクト名を入力（例: `uta-archive`）
3. Googleアナリティクスは任意でOK
4. プロジェクト作成後、「ウェブアプリを追加」（`</>` ボタン）
5. アプリのニックネームを入力して「アプリを登録」
6. 表示された `firebaseConfig` をコピーしておく

### 2. Firestore を有効化

1. Firebase Console 左メニュー「Firestore Database」
2. 「データベースを作成」→「本番環境モード」で作成
3. リージョン: `asia-northeast1`（東京）を推奨
4. 「ルール」タブを開き、以下のルールを貼り付けて「公開」:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /songs/{doc} {
      allow read, write: if true;
    }
    match /playlists/{doc} {
      allow read, write: if true;
    }
  }
}
```

5. 「インデックス」タブ → 「複合」→「インデックスを追加」:
   - コレクション: `songs`
   - フィールド1: `streamType` (昇順)
   - フィールド2: `createdAt` (降順)

### 3. コードの設定

```bash
# リポジトリをクローン
git clone https://github.com/あなたのユーザー名/uta-archive.git
cd uta-archive

# 依存パッケージをインストール
npm install
```

`src/firebase.js` を開いて、Firebase Console でコピーした設定を貼り付ける:

```js
const firebaseConfig = {
  apiKey: "実際のAPIキー",
  authDomain: "プロジェクトID.firebaseapp.com",
  projectId: "実際のプロジェクトID",
  storageBucket: "プロジェクトID.firebasestorage.app",
  messagingSenderId: "実際のID",
  appId: "実際のアプリID"
};
```

`vite.config.js` の `base` をリポジトリ名に合わせて変更:

```js
base: '/uta-archive/',   // ← GitHubのリポジトリ名
```

### 4. ローカルで動作確認

```bash
npm run dev
# → http://localhost:5173/uta-archive/ で開く
```

### 5. GitHub Pages にデプロイ

1. GitHubでリポジトリを作成（Public 推奨）
2. コードをプッシュ:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/uta-archive.git
git push -u origin main
```

3. GitHub Actions が自動でビルド＆デプロイ（`.github/workflows/deploy.yml`）
4. リポジトリの Settings → Pages → Source: `gh-pages` ブランチを選択
5. しばらく待つと `https://あなたのユーザー名.github.io/uta-archive/` でアクセス可能に

---

## 使い方

### 楽曲を追加する

1. 右上の「＋ 楽曲を追加」をクリック
2. パスワード `0519` を入力（初回のみ。以降はブラウザに記憶されます）
3. YouTube配信のURLをペースト
4. 配信種別（歌枠/ウクレレ枠）を選択
5. 楽曲名・アーティスト・開始/終了タイムスタンプを入力
6. 「＋ 楽曲を追加」ボタンで行を増やして複数曲まとめて登録可能
7. 「保存」ボタンで登録完了

### タイムスタンプの形式

- `1:23` → 1分23秒
- `12:34` → 12分34秒
- `1:23:45` → 1時間23分45秒

### 検索

- ひらがな・カタカナ・ローマ字で検索できます
- `zu` / `dzu`、`hu` / `fu`、`ju` / `jyu` など表記ゆれに対応
- 歌枠/ウクレレ枠でフィルタ可能

### プレイリスト

1. プレイリストページで「新規作成」
2. 名前とカラーを選択
3. プレイリスト詳細画面で「＋ 曲を追加」から楽曲を検索・追加
4. 曲の並び替えはドラッグ＆ドロップ

---

## ファイル構成

```
uta-archive/
├── src/
│   ├── App.jsx              # ルーティング
│   ├── firebase.js          # ⚠️ 要設定
│   ├── index.css            # グローバルスタイル
│   ├── main.jsx             # エントリポイント
│   ├── contexts/
│   │   ├── AuthContext.jsx  # パスワード認証
│   │   └── PlayerContext.jsx # 再生状態管理
│   ├── components/
│   │   ├── Navigation.jsx
│   │   ├── MiniPlayer.jsx
│   │   ├── SongCard.jsx
│   │   ├── AddSongModal.jsx
│   │   ├── PasswordModal.jsx
│   │   ├── PlaylistCard.jsx
│   │   ├── PlaylistModal.jsx
│   │   └── AddToPlaylistModal.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Search.jsx
│   │   ├── Playlists.jsx
│   │   └── PlaylistDetail.jsx
│   └── utils/
│       ├── search.js        # 検索・ローマ字変換
│       └── youtube.js       # YouTube API ユーティリティ
├── .github/workflows/
│   └── deploy.yml           # 自動デプロイ
├── vite.config.js           # ⚠️ base を要変更
└── package.json
```

---

## 注意事項

- Firebase の APIキーはフロントに露出しますが、Firestoreルールで読み書き制御できます
- より厳密に制御したい場合は Firebase Authentication の導入を検討してください
- YouTube IFrame API の利用規約に従って使用してください
