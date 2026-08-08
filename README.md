# 104 Job Hunter MCP

> 透過 MCP (Model Context Protocol) 讓 AI 直接操作 104 人力銀行。實現搜尋、比對、投遞自動化。
> **🤖 進階應用**：利用 `AGENT.md` 啟動詢答，從現有履歷直接建立「求職者虛擬分身」(`MY_PROFILE.md`)，精準鎖定職缺。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.62-45BA4B?logo=playwright)](https://playwright.dev/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.30-FF6B35)](https://modelcontextprotocol.io/)

---

> [!IMPORTANT]
> **🤖 給 AI Agent 的最高指導原則 (System Prompt for AI)**
> 
> 如果你是接手這個專案的 AI，你的下一步是**立刻讀取專案根目錄的 [`AGENT.md`](./AGENT.md)**。
> 裡面有建立「虛擬分身」、過濾職缺與投遞的標準劇本。**讀完前，禁止執行任何搜尋工具。**

---

## ✨ 核心功能 (Features)

- 🔍 **API 攔截式搜尋**：直接攔截 104 後端 JSON API，繞過前端防爬蟲機制。
- 📄 **職缺詳情讀取**：用真實 Chrome 提取職位描述、條件要求與福利。
- 🛡️ **Hit-in-the-loop 安全機制**：投遞工具只會填好求職信，**絕對不會幫你按送出**。
- 🍪 **持久化登入**：Cookie 存入專屬 Chrome Profile，免重複登入。
- 🤖 **Agent 行為規範**：內建 `AGENT.md` 提供自動化求職劇本。

## 🔒 隱私與安全 (Privacy & Security)

這個工具採用**本地優先 (Local-First)** 架構，確保帳號安全：

1. **100% 本地執行**：MCP 伺服器只在你的電腦上跑，不回傳帳號密碼。
2. **不經手密碼**：登入時會跳出本地 Chrome，你自己在 104 官方頁面登入。
3. **Cookie 安全隔離**：加密存在本機的 `.chrome-profile/`。該資料夾已列入 `.gitignore`，不會上傳 GitHub。

---

## 🚀 安裝與執行 (Setup)

### 1. Clone 專案與建置
```bash
git clone https://github.com/YuJunWang/104-job-hunter-mcp.git
cd 104-job-hunter-mcp
npm install
npm run build
```
*(系統需求：Node.js 18+、Google Chrome)*

### 2. 登入 104 帳號（只需一次）
```bash
npx tsx src/login.ts
```
執行後會跳出 Chrome 視窗，請手動登入 104，完成後關閉視窗。

### 3. 掛載 MCP 伺服器
把以下設定貼進 MCP 客戶端設定檔（如 Antigravity 的 `mcp_config.json` 或 Claude Desktop `config.json`）：

```json
{
  "mcpServers": {
    "104-job-hunter": {
      "command": "node",
      "args": ["/絕對路徑/104-job-hunter-mcp/build/index.js"]
    }
  }
}
```
*(Windows 使用者請注意路徑反斜線跳脫：`C:\\Users\\你的帳號\\...\\build\\index.js`)*

重啟 AI 客戶端，工具就準備好了。

### 4. 設定 AI 腦袋 (Agent 規範)

1. 複製根目錄的 `MY_PROFILE.example.md`，重新命名為 `MY_PROFILE.md`。
2. 填入你的求職偏好與地雷。
3. 讓 AI 讀取 `AGENT.md`：
   - **Antigravity**：將 `AGENT.md` 放進 `.agents/rules/`，或存成全域 Skill (`~/.gemini/config/skills/104-hunter/SKILL.md`)。
   - **Cursor**：把 `AGENT.md` 內容貼進 `.cursorrules`。
   - **Claude Desktop**：貼進 System Prompt。
   - **直接講**：「請閱讀專案內的 MY_PROFILE.md 與 AGENT.md 並按照流程幫我找工作」。

---

## 🤖 AI Agent 開發與操作手冊

> **給 AI 的環境建置交接指令**
> 
> 如果你是負責幫人類安裝 MCP 的 AI，請執行以下步驟：
> 1. 跑 `git clone`、`npm install` 跟 `npm run build`。
> 2. 請人類跑 `npx tsx src/login.ts` 並手動登入。
> 3. 幫人類把 MCP 絕對路徑寫進設定檔。
> 4. **讀取 [`AGENT.md`](./AGENT.md)** 了解操作劇本。
> 5. 依據 `AGENT.md` 引導人類建立 `MY_PROFILE.md`。

### 工具列表 (MCP Tools)

#### `job104_check_session`
- **功能**：檢查登入狀態。
- **時機**：求職流程的最開頭，確保 Cookie 未過期。

#### `job104_search`
- **必填參數**：`keyword` (如：`AI 全端工程師 Python`)
- **選填參數**：`location` (如：`台北市`)、`page` (預設 1)
- **注意**：AI 應在背景比對結果，只向人類展示 Top 3～5 筆。

#### `job104_get_details`
- **必填參數**：`job_url`
- **功能**：獲取職位描述、條件要求與福利。草擬推薦信前必備。

#### `job104_prepare_application` (Hit-in-the-loop)
- **必填參數**：`job_url`
- **選填參數**：`cover_letter_text`、`dry_run` (預設 false)
- **注意**：只會開啟投遞確認頁。AI 執行後必須提醒人類：「請手動點擊確認送出」。

#### `job104_search_companies`
- **必填參數**：`keyword` (公司名稱)
- **選填參數**：`page`、`pageSize`

#### `job104_get_company_detail`
- **必填參數**：`companyInput` (代碼或網址)
- **功能**：獲取公司福利、產品與開放職缺列表。

#### `job104_save_job`
- **必填參數**：`jobInput` (代碼或網址)
- **功能**：將職缺加入 104 收藏。

#### `job104_save_company`
- **必填參數**：`companyInput` (代碼或網址)
- **功能**：追蹤公司。

---

## 📁 專案結構

```
104-job-hunter-mcp/
├── src/
│   ├── index.ts          # MCP 主程式，工具註冊入口
│   ├── browser.ts        # Playwright 瀏覽器單例管理 (含 Stealth Plugin)
│   ├── login.ts          # 登入輔助腳本
│   ├── test-client.ts    # 本地測試客戶端
│   └── tools/
│       ├── search.ts     # job104_search
│       ├── details.ts    # job104_get_details
│       ├── apply.ts      # job104_prepare_application
│       ├── company.ts    # job104_search_companies, job104_get_company_detail
│       ├── save.ts       # job104_save_job, job104_save_company
│       └── session.ts    # job104_check_session
├── build/                # npm run build 輸出
├── .chrome-profile/      # Cookie 儲存目錄 (不進 git)
├── AGENT.md              # AI 操作劇本
├── MY_PROFILE.example.md # 虛擬分身範本
├── package.json
└── tsconfig.json
```
