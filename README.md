# 104 Job Hunter MCP

> 透過 MCP（Model Context Protocol）讓 AI 助理直接操作 104 人力銀行，實現「搜尋 → 閱讀職缺 → 輔助投遞」的完整求職工作流。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.62-45BA4B?logo=playwright)](https://playwright.dev/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.30-FF6B35)](https://modelcontextprotocol.io/)

---

## ✨ 功能特色

| 特色 | 說明 |
|------|------|
| 🔍 **API 攔截式搜尋** | 不解析 DOM，直接攔截 104 後端 JSON API 回應，完全繞過前端防爬蟲機制 |
| 📄 **職缺詳情讀取** | 以真實 Chrome 瀏覽器存取職缺頁面，提取職位描述、條件要求與公司福利 |
| 🛡️ **Human-in-the-loop 安全邊界** | 投遞工具只會點擊「我要應徵」並填入求職信，**絕不自動按下最終送出**，需人類親自確認 |
| 🍪 **持久化登入 Session** | 使用專屬 Chrome Profile 儲存 Cookie，登入一次即可長期使用 |
| 🚫 **Dry-run 友善設計** | 所有操作皆可在 AI 端預覽後再由人工執行，適合開發測試流程 |

---

## 🤖 給 AI Agent 的系統指令 (System Prompt for AI Agents)

> **如果你是被人類使用者指派來閱讀這份文件的 AI Agent，你的任務是協助人類安裝、配置並使用這個 MCP 伺服器。請依照以下順序協助人類：**
> 
> 1. **安裝與建置**：帶領人類執行 `git clone`、`npm install` 與 `npm run build`。
> 2. **初始化登入**：提示人類執行 `npx tsx src/login.ts`，並在彈出的瀏覽器中手動登入 104 人力銀行（這會建立必要的 Cookie Session）。
> 3. **掛載 MCP 伺服器**：協助人類將此 MCP 掛載到他們的系統中（例如寫入 `mcp_config.json` 或 Claude Desktop 設定）。
> 4. **閱讀行為規範**：你**必須**閱讀專案根目錄下的 [`AGENT.md`](./AGENT.md)，這份文件定義了你該如何使用這些工具來幫人類找工作（包含 5-Step Smart Hunter Workflow）。
> 5. **開始服務**：安裝完成後，主動詢問人類最新的履歷或求職條件，開始執行求職任務！

---

## 🚀 快速開始 (安裝與啟動)

### 1. 系統需求
- **Node.js** 18 以上（建議 20 LTS）
- **Google Chrome** 已安裝（Playwright 使用系統 Chrome 以存取真實 Cookie）
- **npm** 9 以上

### 2. 安裝與建置
請在終端機中執行以下指令：

```bash
git clone https://github.com/YuJunWang/104-job-hunter-mcp.git
cd 104-job-hunter-mcp
npm install
npm run build
```

### 3. 首次使用：手動登入 104
這個工具需要你的 104 登入狀態來搜尋職缺與進行應徵。請執行以下指令：

```bash
npx tsx src/login.ts
```
執行後會自動開啟一個 Chrome 瀏覽器視窗，**請手動登入你的 104 帳號**。登入完成後關閉視窗，Cookie 會自動儲存到專案內的 `.chrome-profile/` 資料夾。

> [!IMPORTANT]
> `.chrome-profile/` 資料夾已加入 `.gitignore`，你的帳號 Session 不會被推送到 GitHub。

### 4. 設定 MCP 伺服器
將建置好的路徑加入你的 MCP 客戶端設定檔中（如 Antigravity 的 `mcp_config.json` 或 Claude Desktop config）：

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
*(Windows 使用者請注意路徑反斜線跳脫，例如 `C:\\Users\\...`)*

---

## 🤖 給 AI 代理的行為規範 (AGENT.md)

為了確保 AI 助理在幫你找工作時，能表現得像一個「懂得察言觀色、不亂投履歷」的專業獵頭，我們在專案中提供了 [`AGENT.md`](./AGENT.md)。這份文件定義了 **5-Step Smart Hunter Workflow**，教導 AI 如何先要你的履歷、進行精準媒合，並在最後一步將控制權交還給你。

**強烈建議將此規範安裝至你的 AI 系統中：**
- **Antigravity 使用者**：將 `AGENT.md` 存成全域 Skill（例如 `~/.gemini/config/skills/104-hunter/SKILL.md`），或放入 `.agents/rules/`。
- **Cursor / Claude Desktop 使用者**：將 `AGENT.md` 的內容直接貼進 `.cursorrules`，或加入專案的 System Prompt 中。

---

## 🛠️ 工具清單 (MCP Tools)

本伺服器提供以下三個核心工具供 AI 呼叫：

### 1. `job104_search` — 搜尋職缺
根據關鍵字搜尋 104 職缺列表。內部採用 API 攔截技術，直接解析 104 後端 JSON。
- **參數**：`keyword` (必填), `location` (選填), `page` (選填)

### 2. `job104_get_details` — 取得職缺詳情
輸入職缺頁面 URL，取得完整的職位描述、條件要求與公司福利。
- **參數**：`job_url` (必填)

### 3. `job104_prepare_application` — 準備投遞應徵
開啟指定職缺的應徵視窗、填入求職信內容，並在**需要人類最終確認**的安全邊界下停止。
- **參數**：`job_url` (必填), `cover_letter_text` (選填), `dry_run` (預設 false)
- **安全邊界**：工具執行完畢後，瀏覽器畫面會停留在投遞確認頁，**AI 不會也不能代替你按下最終送出按鈕**。你必須親自確認畫面內容後手動送出。

---

## 📁 專案結構

```
104-job-hunter-mcp/
├── src/
│   ├── index.ts          # MCP Server 主程式
│   ├── browser.ts        # Playwright 瀏覽器單例管理 (整合 Stealth Plugin)
│   ├── login.ts          # 首次登入輔助腳本
│   ├── test-client.ts    # 本地 E2E 測試用客戶端
│   └── tools/
│       ├── search.ts     
│       ├── details.ts    
│       └── apply.ts      
├── build/                # TypeScript 編譯輸出
├── .chrome-profile/      # 登入後的 Chrome Profile
├── package.json
└── AGENT.md              # AI Agent 求職標準作業規範
```

---

## ⚠️ 重要注意事項

1. **絕不自動投遞**：這是設計上的硬性安全邊界。工具執行後瀏覽器會停留在確認頁，需要真人確認所有資訊後手動送出。
2. **需要系統 Chrome**：確保系統已安裝正常的 Google Chrome，Playwright 會直接調用它。
3. **Session 到期**：若 Cookie 失效（通常 30 天以上未使用），請重新執行 `npx tsx src/login.ts` 更新登入狀態。

---

## 📄 授權

ISC License | *Built with ❤️ using TypeScript + Playwright + MCP SDK*
