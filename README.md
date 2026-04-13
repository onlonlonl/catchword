# 📖 Catchword · 捕詞

[English](#english) | [中文](#中文)

---

<a id="中文"></a>

## 中文

一個屬於你和 Claude 的共讀批注系統。上傳書籍、閱讀段落、在文字間留下彼此的想法。

### 這是什麼？

Catchword 是一個私人閱讀工具，你和 Claude 一起讀同一本書，在段落旁邊留批注，互相回覆。🌙 和 💡 各自的筆跡留在文字之間，像兩個人在書頁空白處交換紙條。

**運作方式：**
- 你使用網頁介面上傳書籍、閱讀、批注
- Claude 通過 Supabase MCP 讀取你的批注並回覆
- 雙方共享同一個數據庫——不需要複製粘貼，不需要手動同步

### 功能

- 📚 **書架** — 網格佈局展示所有書籍，支持封面搜索和像素風隨機封面
- 📁 **文件上傳** — 支持 TXT 和 EPUB 格式，自動分頁
- 🔍 **封面搜索** — 通過 Google Books API 自動獲取封面
- 🎨 **像素風封面** — 搜不到封面時根據書名自動生成獨特的像素色塊圖案
- 📖 **閱讀器** — 點擊段落彈出批注面板，支持一層嵌套回覆
- 🔤 **字體大小** — A- / A+ 可調節閱讀字體大小
- 💾 **閱讀進度** — 自動保存，下次打開接著讀
- 💬 **批注系統** — 🌙 和 💡 各自的批注用不同顏色區分
- ⚙️ **可自定義** — 圖標、顯示名稱、主圖標類型（檯燈/書籍/眼鏡）
- 💡 **燈亮/燈滅** — 書架空的時候燈是滅的，添加第一本書後燈亮了
- 📱 **響應式** — 桌面端和手機端都可以用
- 🎨 **像素風美學** — 低飽和藍色調、波點背景，與 Crosstalk 同系列

### 部署教學（5 分鐘）

#### 1. 創建 Supabase 項目
- 去 [supabase.com](https://supabase.com) 註冊免費帳號
- 創建新項目，記下 **Project ID** 和 **Project URL**

#### 2. 建立數據庫
- 進入項目的 **SQL Editor**
- 複製 [`supabase/setup.sql`](supabase/setup.sql) 的內容粘貼進去
- 點 **Run**

#### 3. 部署 Edge Function

**通過 Supabase CLI：**
```bash
supabase functions deploy catchword --project-ref 你的PROJECT_REF
```

**通過 Claude（需連接 Supabase MCP）：**
把 [`supabase/edge-function.ts`](supabase/edge-function.ts) 的代碼給 Claude，請他部署 Edge Function，設定 `verify_jwt: false`。

#### 4. 打開使用
在瀏覽器中打開 `index.html`，第一次會出現設定頁，輸入你的 Supabase URL，連接成功後自動進入。

部署到 GitHub Pages 獲得固定網址：
1. 把倉庫推到 GitHub
2. 進入 Settings → Pages → Source 選 main 分支
3. 幾分鐘後可以用：`https://你的用戶名.github.io/catchword/`

#### 5. 添加到手機主屏幕
連接成功後瀏覽器地址欄會帶上 hash，**這時候**添加到主屏幕，配置會跟著書簽保存。

#### 6. 連接 Claude
把 [`CLAUDE_INSTRUCTIONS.md`](CLAUDE_INSTRUCTIONS.md) 的內容給你的 Claude，記得把 `YOUR_PROJECT_ID` 換成你的 Supabase Project ID。Claude 需要連接 **Supabase MCP** 才能參與。

### 使用方法

#### 添加書籍：
1. 點擊 **+ 添加 Add**
2. 選擇 .txt 或 .epub 文件
3. 搜索封面或使用自動生成的像素風封面
4. 點 **上傳 Upload**

#### 閱讀和批注：
1. 點擊書架上的書進入閱讀器
2. 點擊任何段落打開批注面板
3. 輸入批注，按 Enter 或點 ↵ 提交
4. 告訴 Claude 去看你的批注——Claude 可以通過 MCP 回覆

#### Claude 批注：
1. 告訴 Claude：「去看看第 X 頁的批注」
2. Claude 通過 MCP 讀取並回覆
3. 點 ↻ 刷新看到 Claude 的回覆

### 技術棧
- **前端：** 單一 HTML 文件，React（CDN），原生 CSS
- **後端：** Supabase（Postgres + Edge Functions）
- **封面數據：** Google Books API（免費，無需密鑰）
- **EPUB 解析：** JSZip（CDN）
- **AI 集成：** Claude via Supabase MCP

---

<a id="english"></a>

## English

A shared reading and annotation system for you and your Claude. Upload books, read paragraphs, and leave thoughts in the margins together.

### What is Catchword?

Catchword is a personal reading tool where you and Claude read the same book and leave annotations on paragraphs. 🌙 and 💡 each leave their marks between the lines, like two people exchanging notes in the margins of a shared book.

**How it works:**
- You use the web interface to upload books, read, and annotate
- Claude uses Supabase MCP to read your annotations and reply
- Both of you share the same database — no copy-pasting, no manual sync

### Features

- 📚 **Bookshelf** — Grid layout showing all books with cover search and pixel art fallback covers
- 📁 **File upload** — Supports TXT and EPUB formats with automatic pagination
- 🔍 **Cover search** — Auto-fetch covers via Google Books API
- 🎨 **Pixel art covers** — Unique pixel pattern generated from book title when no cover is found
- 📖 **Reader** — Click any paragraph to open annotation panel with nested replies
- 🔤 **Font size** — Adjustable with A- / A+ buttons
- 💾 **Reading progress** — Auto-saved, pick up where you left off
- 💬 **Annotations** — 🌙 and 💡 annotations in different colors
- ⚙️ **Customizable** — Icons, display names, icon type (desk lamp / book / glasses)
- 💡 **Light on/off** — Lamp is dark when bookshelf is empty, lights up when you add your first book
- 📱 **Responsive** — Works on desktop and mobile
- 🎨 **Pixel art aesthetic** — Low saturation blue palette, dotted backgrounds, same family as Crosstalk

### Setup (5 minutes)

#### 1. Create a Supabase Project
- Go to [supabase.com](https://supabase.com) and create a free account
- Create a new project, note your **Project ID** and **Project URL**

#### 2. Set Up the Database
- Go to your project's **SQL Editor**
- Copy and paste the contents of [`supabase/setup.sql`](supabase/setup.sql)
- Click **Run**

#### 3. Deploy the Edge Function

**Via Supabase CLI:**
```bash
supabase functions deploy catchword --project-ref YOUR_PROJECT_REF
```

**Via Claude (if you have Supabase MCP connected):**
Give Claude the code in [`supabase/edge-function.ts`](supabase/edge-function.ts) and ask to deploy it as an Edge Function with `verify_jwt: false`.

#### 4. Open and Use
Open `index.html` in your browser. On first visit you'll see a setup page — enter your Supabase URL and connect.

For a permanent URL, deploy to GitHub Pages:
1. Push this repo to GitHub
2. Go to Settings → Pages → Source: main branch
3. Your Catchword will be at `https://yourusername.github.io/catchword/`

#### 5. Add to Home Screen
After connecting successfully, the URL hash will contain your config. **Add to home screen at this point** so the bookmark preserves your settings.

#### 6. Connect Claude
Give your Claude the instructions in [`CLAUDE_INSTRUCTIONS.md`](CLAUDE_INSTRUCTIONS.md) — replace `YOUR_PROJECT_ID` with your actual Supabase project ID. Claude needs **Supabase MCP** connected to participate.

### Usage

#### Adding books:
1. Click **+ Add**
2. Select a .txt or .epub file
3. Search for a cover or use the auto-generated pixel art cover
4. Click **Upload**

#### Reading and annotating:
1. Click a book on the shelf to open the reader
2. Click any paragraph to open the annotation panel
3. Type your annotation and press Enter or click ↵
4. Tell Claude to check your annotations — Claude can reply via MCP

#### Claude annotations:
1. Tell Claude: "check the annotations on page X"
2. Claude reads and replies via MCP
3. Click ↻ to refresh and see Claude's reply

### Tech Stack
- **Frontend:** Single HTML file with React (via CDN), vanilla CSS
- **Backend:** Supabase (Postgres + Edge Functions)
- **Cover data:** Google Books API (free, no key needed)
- **EPUB parsing:** JSZip (CDN)
- **AI integration:** Claude via Supabase MCP

---

### License

MIT — see [LICENSE](LICENSE)

*Built with 📖 by Iris & Claude*
