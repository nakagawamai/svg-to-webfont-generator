# Illustrator to WebFont Generator

Illustratorのアウトライン文字をSVG経由でWebフォント化する半自動化ツールです。
Illustrator用JSXスクリプトで1文字ずつSVGを書き出し、`index.html` 上で文字割り当てとWOFF/TTF生成を行います。

SVGファイルがすでに用意されている場合は、Illustratorを使わずにSVGから直接Webフォント化することもできます。

## 構成

- `index.html`: SVGを読み込み、文字割り当て、プレビュー、WOFF/TTF書き出しを行うWebツール
- `export_glyphs_to_svg_v4.jsx`: Illustrator上のアウトライン済み文字を、1文字ずつSVGに書き出すスクリプト

## 使い方

### 全体の流れ

1. Illustratorで文字をアウトライン化し、JSXスクリプトで文字ごとのSVGを書き出します。
2. 書き出したSVGを `index.html` にインポートします。
3. 各SVGに割り当てる1文字を入力します。ファイル名からの自動割り当てもできます。
4. プレビューで確認し、TTFまたはWOFFをダウンロードします。

### 1. Illustratorで文字を準備する

1. フォント化したい文字をIllustrator上に配置します。
2. 文字をすべてアウトライン化します。
3. 対象の文字を以下の順序で並べます。

```text
数字:    0 1 2 3 4 5 6 7 8 9
大文字:  A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
小文字:  a b c d e f g h i j k l m n o p q r s t u v w x y z
```

複数行に分かれていても使えます。数字、大文字、小文字をまとめて書き出す場合は、行ごとに分けると判定しやすくなります。

### 2. SVGを書き出す

1. Illustratorで対象のアウトライン文字をすべて選択します。
2. `ファイル > スクリプト > その他のスクリプト...` から `export_glyphs_to_svg_v4.jsx` を実行します。
3. 書き出す文字種を選択します。
4. フォント名と出力先フォルダを指定します。
5. 指定したフォルダ内に、文字ごとのSVGが生成されます。

ファイル名は基本的に `0.svg`、`A.svg`、`a.svg` のように文字名で保存されます。
大文字と小文字を同時に書き出す場合は、OSの大文字小文字の扱いを避けるため `upper_A.svg`、`lower_a.svg` の形式になります。

### 3. Webフォントに変換する

1. `index.html` をブラウザで開きます。
2. フォント名を入力します。
3. 書き出したSVGファイルをドラッグ&ドロップします。
4. `ファイル名から自動` を押して文字を割り当てます。
5. サイドベアリングとグリフ高さを調整します。
6. プレビューで確認し、`WOFF DL` または `TTF DL` からフォントを書き出します。

## 生成したフォントの利用例

```css
@font-face {
  font-family: 'MyFont';
  src: url('MyFont.woff') format('woff'),
       url('MyFont.ttf') format('truetype');
  font-display: swap;
}

.my-text {
  font-family: 'MyFont', sans-serif;
}
```

## 注意点

- `index.html` は `opentype.js` と `pako` をCDNから読み込みます。WOFF/TTF生成にはネットワーク接続が必要です。
- SVG内にアウトラインパスが含まれている必要があります。Illustratorで文字データのまま書き出したSVGは、期待通りに変換できない場合があります。
- ベースラインや文字サイズが揃っていない場合、生成後のフォントでも表示位置にばらつきが出ます。
