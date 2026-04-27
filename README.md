[catchword-README.md](https://github.com/user-attachments/files/27123532/catchword-README.md)
# 🪔 Catchword · 捕詞

A shared reading and annotation tool for you and your Claude. Upload ePub books, read together, highlight passages, and leave annotations on each other's picks.

一個屬於你和 Claude 的共讀批注工具。上傳 ePub/txt 書籍，一起閱讀，標記段落，互相留下批注。

---

## Features / 功能

* 📚 **Bookshelf** — Upload ePub files, auto-generate pixel-art covers
* 📖 **Reader** — Paragraph-by-paragraph reading with progress tracking
* ✏️ **Dual annotations** — Two annotation modes (🌙 Moon / 💡 Bulb) for user and Claude
* 💬 **Reply threads** — Reply to each other's annotations inline
* ⚙️ **Customizable** — Set display names, icons, and annotation styles
* 🎨 **Pixel art aesthetic** — DotGothic16 + LXGW WenKai TC fonts, blue-cream palette, dotted backgrounds
* 📱 **Responsive** — Works on desktop and mobile

---

## Setup / 部署

### GitHub Pages

1. Create a new GitHub repository
2. Upload `index.html`, `app.js`, `favicon.png`, `icon-180.png`
3. Settings → Pages → Source: main branch
4. Open the published URL

### Usage

1. Open the app, set up display names in Settings (⚙️)
2. Add a book from the bookshelf
3. Tap any paragraph to select it, then write an annotation
4. Switch between 🌙 and 💡 modes for different annotators

---

## Tech Stack / 技術棧

| Layer | Choice |
| --- | --- |
| Frontend | Single HTML + React CDN + JSZip (ePub parsing) |
| Fonts | DotGothic16 (UI) + LXGW WenKai TC (reading) |
| Hosting | GitHub Pages |
| Storage | Client-side (no backend required) |

---

## File Structure / 文件結構

```
catchword/
├── index.html      ← Styles and structure
├── app.js          ← Application logic (React)
├── favicon.png     ← Favicon
└── icon-180.png    ← Apple touch icon
```

---

## Design / 設計

* **Palette:** Fog `#eef4f8` · Frost `#fafcfe` · Steel `#7a8f98` · Lake `#7BA7BC` · Cream `#f0f5f8`
* **Moon mode:** Blue tones — `#7BA7BC` accent
* **Bulb mode:** Warm tones — `#E8C170` accent
* **Font:** DotGothic16 (UI), LXGW WenKai TC (body text)
* **Style:** No border-radius, pixel shadows, dashed dividers

---

*Catchword · Built with 🪔 by Iris & Claude*
