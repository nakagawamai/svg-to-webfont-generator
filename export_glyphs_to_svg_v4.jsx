/*
 * export_glyphs_to_svg_v4.jsx
 *
 * Illustratorで1書体ぶんの文字（数字 or 数字+アルファベット）を、
 * 1文字ずつSVGに書き出すスクリプト。【v4: 文字種選択対応・1フォント専用】
 *
 * 【v3からの変更点】
 * - 2書体同時処理ではなく1書体専用に
 * - 最初に文字種(数字のみ/数字+大文字/数字+小文字/数字+大小)を選択
 * - 配置の前提条件をダイアログでアラート表示
 * - ファイル名は自動でその文字を反映(0.svg, A.svg, upper_A.svg, lower_a.svg)
 *
 * 【使い方】
 * 1. Illustratorで対象の文字(アウトライン済み)をすべて選択
 *    - 数字のみの場合: 0123456789 の順で並んでいること
 *    - +大文字の場合: 0123456789 / ABCDEFGHIJKLMNOPQRSTUVWXYZ の順
 *    - +小文字の場合: 0123456789 / abcdefghijklmnopqrstuvwxyz の順
 *    - +大小両方の場合: 0-9 / A-Z / a-z の順(行ごとに並んでいてOK)
 * 2. ファイル → スクリプト → その他のスクリプト... から本ファイルを実行
 * 3. 文字種を選択
 * 4. 書き出し先フォルダを選択
 * 5. 指定文字のSVGが生成される
 */

(function () {
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }

    var srcDoc = app.activeDocument;
    var sel = srcDoc.selection;

    if (!sel || sel.length === 0) {
        alert("対象の文字オブジェクトを選択してから実行してください。");
        return;
    }

    // ===== 文字種選択ダイアログ =====
    var dlg = new Window("dialog", "文字種を選択");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.margins = 20;

    var noteGroup = dlg.add("panel", undefined, "並び順の前提条件");
    noteGroup.orientation = "column";
    noteGroup.alignChildren = "left";
    noteGroup.margins = 14;
    noteGroup.add("statictext", undefined, "下記の順に並んでいることが必要です:");
    noteGroup.add("statictext", undefined, "  ・数字:           0 1 2 3 4 5 6 7 8 9");
    noteGroup.add("statictext", undefined, "  ・大文字:        A B C ... X Y Z");
    noteGroup.add("statictext", undefined, "  ・小文字:        a b c ... x y z");
    noteGroup.add("statictext", undefined, "");
    noteGroup.add("statictext", undefined, "※ 複数行に分かれていてもOK(行ごとに上から順に処理)");
    noteGroup.add("statictext", undefined, "※ 大文字小文字を混在させる場合、行で分けてください");

    var typePanel = dlg.add("panel", undefined, "作成する文字の種類");
    typePanel.orientation = "column";
    typePanel.alignChildren = "left";
    typePanel.margins = 14;

    var rb1 = typePanel.add("radiobutton", undefined, "数字のみ (10文字)");
    var rb2 = typePanel.add("radiobutton", undefined, "数字 + アルファベット大文字 (36文字)");
    var rb3 = typePanel.add("radiobutton", undefined, "数字 + アルファベット小文字 (36文字)");
    var rb4 = typePanel.add("radiobutton", undefined, "数字 + アルファベット大文字小文字 (62文字)");
    rb1.value = true;

    // フォント名入力(出力サブフォルダ名にもなる)
    var namePanel = dlg.add("panel", undefined, "フォント名(出力フォルダ名)");
    namePanel.orientation = "column";
    namePanel.alignChildren = "fill";
    namePanel.margins = 14;
    namePanel.add("statictext", undefined, "指定したフォルダの中に、この名前のサブフォルダが作成されます");
    var nameInput = namePanel.add("edittext", undefined, "MyFont");
    nameInput.characters = 30;

    var btnGroup = dlg.add("group");
    btnGroup.alignment = "right";
    var cancelBtn = btnGroup.add("button", undefined, "キャンセル", { name: "cancel" });
    var okBtn = btnGroup.add("button", undefined, "次へ", { name: "ok" });

    var typeIndex = -1;
    var fontFolderName = "MyFont";
    okBtn.onClick = function () {
        if (rb1.value) typeIndex = 0;
        else if (rb2.value) typeIndex = 1;
        else if (rb3.value) typeIndex = 2;
        else if (rb4.value) typeIndex = 3;

        // フォント名のサニタイズ(ファイル名に使えない文字を除去)
        var name = nameInput.text;
        name = name.replace(/[\\\/:*?"<>|]/g, "_");
        name = name.replace(/^\s+|\s+$/g, "");
        if (name === "") name = "MyFont";
        fontFolderName = name;

        dlg.close(1);
    };
    cancelBtn.onClick = function () { dlg.close(0); };

    if (dlg.show() !== 1) return;

    // ===== 文字種に応じた期待文字列を構築 =====
    var DIGITS = "0123456789";
    var UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var LOWER = "abcdefghijklmnopqrstuvwxyz";

    var charSets; // 行ごとの期待文字列の配列
    var typeName;
    switch (typeIndex) {
        case 0:
            charSets = [DIGITS];
            typeName = "数字";
            break;
        case 1:
            charSets = [DIGITS, UPPER];
            typeName = "数字+大文字";
            break;
        case 2:
            charSets = [DIGITS, LOWER];
            typeName = "数字+小文字";
            break;
        case 3:
            charSets = [DIGITS, UPPER, LOWER];
            typeName = "数字+大文字+小文字";
            break;
    }

    var totalExpected = 0;
    for (var i = 0; i < charSets.length; i++) totalExpected += charSets[i].length;

    if (sel.length !== totalExpected) {
        var msg = "選択数: " + sel.length + " 個\n";
        msg += "期待値: " + totalExpected + " 個 (" + typeName + ")\n\n";
        msg += "このまま続行する場合、上から順に振り分けますが、過不足は問題になります。\n";
        msg += "続行しますか?";
        if (!confirm(msg)) return;
    }

    // ===== 書き出し先フォルダ選択 =====
    var parentDir = Folder.selectDialog("書き出し先のフォルダを選択してください\n(この中に「" + fontFolderName + "」フォルダが作成されます)");
    if (!parentDir) return;

    // サブフォルダ作成(既存なら使う)
    var outDir = new Folder(parentDir.fsName + "/" + fontFolderName);
    if (!outDir.exists) {
        if (!outDir.create()) {
            alert("出力フォルダの作成に失敗しました:\n" + outDir.fsName);
            return;
        }
    } else {
        // 既存の場合は確認
        if (!confirm("フォルダ「" + fontFolderName + "」は既に存在します。\n中のファイルを上書きする可能性があります。続行しますか?")) {
            return;
        }
    }

    // ===== 選択を退避・座標を計算 =====
    var items = [];
    for (var j = 0; j < sel.length; j++) items.push(sel[j]);

    for (var k = 0; k < items.length; k++) {
        var b = items[k].visibleBounds;
        items[k]._cy = (b[1] + b[3]) / 2;
        items[k]._cx = (b[0] + b[2]) / 2;
    }

    // ===== 行(Yクラスタ)を検出 =====
    // 行数 = charSets.length が分かっているので、Y座標でクラスタリング
    // 単純化: 中心Yでソート → 大きな縦ギャップで切る
    items.sort(function (a, b) { return b._cy - a._cy; }); // 上から下へ(Yは上が大)

    // ギャップ閾値: 全アイテムの平均高さの 1.5倍
    var totalH = 0;
    for (var m = 0; m < items.length; m++) {
        var vb = items[m].visibleBounds;
        totalH += (vb[1] - vb[3]); // 高さ
    }
    var avgH = totalH / items.length;
    var gapThreshold = avgH * 1.0; // 文字高さぶん空いていたら別の行とみなす

    var rows = [];
    var currentRow = [items[0]];
    for (var n = 1; n < items.length; n++) {
        var prevCy = items[n - 1]._cy;
        var curCy = items[n]._cy;
        var gap = prevCy - curCy;
        if (gap > gapThreshold) {
            rows.push(currentRow);
            currentRow = [];
        }
        currentRow.push(items[n]);
    }
    if (currentRow.length > 0) rows.push(currentRow);

    // 各行を X座標 昇順でソート
    var sortByX = function (a, b) { return a._cx - b._cx; };
    for (var p = 0; p < rows.length; p++) {
        rows[p].sort(sortByX);
    }

    // 行数が期待と異なる場合は警告
    if (rows.length !== charSets.length) {
        var msg2 = "検出された行数: " + rows.length + "\n";
        msg2 += "期待される行数: " + charSets.length + "\n\n";
        msg2 += "配置を確認してください(行が正しく分かれているか)。\n";
        msg2 += "続行する場合、検出された行に上から順番に文字を割り当てます。";
        if (!confirm(msg2)) return;
    }

    // ===== 各行のアイテムに文字を割り当てる =====
    // assignments: [{ item, character, filename }, ...]
    var assignments = [];
    for (var q = 0; q < Math.min(rows.length, charSets.length); q++) {
        var row = rows[q];
        var chars = charSets[q];
        for (var r = 0; r < Math.min(row.length, chars.length); r++) {
            var ch = chars.charAt(r);
            var fname;
            // ファイル名のルール: 数字と大文字はそのまま、小文字も含む混在時は接頭辞付き
            if (typeIndex === 3 && q === 1) {
                // 大文字行
                fname = "upper_" + ch + ".svg";
            } else if (typeIndex === 3 && q === 2) {
                // 小文字行
                fname = "lower_" + ch + ".svg";
            } else {
                fname = ch + ".svg";
            }
            assignments.push({ item: row[r], character: ch, filename: fname });
        }
    }

    if (assignments.length === 0) {
        alert("書き出す対象がありません。");
        return;
    }

    // ===== 行ごとに上下端を計算(ベースライン揃え用) =====
    // 数字・大文字・小文字はそれぞれ高さの基準が異なる(x-height, cap-heightなど)ので
    // 行内で揃える方が無駄な余白が出ない。
    // 各assignmentに「その行の上下端」を持たせる。
    for (var q2 = 0; q2 < Math.min(rows.length, charSets.length); q2++) {
        var rowItems = rows[q2];
        var rowTop = -Infinity, rowBottom = Infinity;
        for (var s = 0; s < rowItems.length; s++) {
            var vb2 = rowItems[s].visibleBounds;
            if (vb2[1] > rowTop) rowTop = vb2[1];
            if (vb2[3] < rowBottom) rowBottom = vb2[3];
        }
        // この行に対応するassignmentに行情報をセット
        for (var t2 = 0; t2 < assignments.length; t2++) {
            for (var u2 = 0; u2 < rowItems.length; u2++) {
                if (assignments[t2].item === rowItems[u2]) {
                    assignments[t2].rowTop = rowTop;
                    assignments[t2].rowBottom = rowBottom;
                    break;
                }
            }
        }
    }

    // ===== SVG書き出しオプション =====
    var exportOpts = new ExportOptionsSVG();
    exportOpts.embedRasterImages = false;
    exportOpts.fontSubsetting = SVGFontSubsetting.None;
    exportOpts.coordinatePrecision = 3;
    exportOpts.documentEncoding = SVGDocumentEncoding.UTF8;
    exportOpts.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES;

    var exportedCount = 0;
    var errors = [];

    // 1グリフを単独SVGとして書き出す
    var exportSingleGlyph = function (item, outFile, label, rowTop, rowBottom) {
        var vb = item.visibleBounds;
        var glyphLeft = vb[0];
        var glyphRight = vb[2];

        var tempWidth = glyphRight - glyphLeft;
        var tempHeight = rowTop - rowBottom;

        if (tempWidth <= 0 || tempHeight <= 0) {
            errors.push(label + " : 不正なサイズ(W:" + tempWidth + ", H:" + tempHeight + ")");
            return;
        }

        var tempDoc;
        try {
            tempDoc = app.documents.add(
                DocumentColorSpace.RGB,
                tempWidth,
                tempHeight
            );
        } catch (e) {
            errors.push(label + " : 一時ドキュメント作成失敗 - " + e);
            return;
        }

        try {
            app.activeDocument = srcDoc;
            srcDoc.selection = null;
            item.selected = true;

            var dup = item.duplicate(tempDoc.layers[0], ElementPlacement.PLACEATBEGINNING);

            app.activeDocument = tempDoc;
            var ab = tempDoc.artboards[0].artboardRect;
            var abLeft = ab[0];
            var abTop = ab[1];

            var dupBounds = dup.visibleBounds;
            var topOffset = rowTop - vb[1];

            var targetLeft = abLeft;
            var targetTop = abTop - topOffset;

            var dx = targetLeft - dupBounds[0];
            var dy = targetTop - dupBounds[1];
            dup.translate(dx, dy);

            tempDoc.exportFile(outFile, ExportType.SVG, exportOpts);
            exportedCount++;
        } catch (e2) {
            errors.push(label + " : 書き出し失敗 - " + e2);
        }

        try {
            tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        } catch (e3) { /* noop */ }
    };

    // ===== 書き出し実行 =====
    for (var t = 0; t < assignments.length; t++) {
        var a = assignments[t];
        var outFile = new File(outDir.fsName + "/" + a.filename);
        exportSingleGlyph(a.item, outFile, a.filename, a.rowTop, a.rowBottom);
    }

    // 元ドキュメントをアクティブに戻して選択復元
    app.activeDocument = srcDoc;
    srcDoc.selection = null;
    for (var u = 0; u < items.length; u++) items[u].selected = true;

    // ===== 結果通知 =====
    var report = "書き出し完了: " + exportedCount + " / " + assignments.length + " 個\n";
    report += "種類: " + typeName + "\n";
    report += "フォルダ名: " + fontFolderName + "\n";
    report += "出力先: " + outDir.fsName + "\n";
    if (errors.length > 0) {
        report += "\nエラー:\n" + errors.join("\n");
    }
    alert(report);
})();
