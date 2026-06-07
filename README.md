# LOGOS Web Alpha 0.2 — Gesture Casting

GitHub Pages 可直接部署的 LOGOS 原型。

## 目標

完成第一個「鏡頭辨識 → 語句 → 施法」循環。

## 操作

### 鏡頭
- 按 `C` 啟動攝影機
- Open Palm：Compile / 施放
- Point：Seek Lock
- Fist：準備確認

### 鍵盤備援
- `1` = Ignis
- `2` = Shot
- `3` = Seek
- `Space` = Compile

## 部署

把 ZIP 解壓後，將內容直接放到 GitHub repo 根目錄：

```text
index.html
css/
js/
.nojekyll
```

啟用 GitHub Pages 後，用 github.io 網址開啟。

## 注意

MediaPipe Hands 使用 CDN；如果 CDN 或攝影機權限失敗，仍可用鍵盤備援操作。
