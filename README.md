# 104 Job Hunter MCP

> 透過 MCP（Model Context Protocol）讓 AI 助理直接操作 104 人力銀行，實現「搜尋 → 精準媒合 → 輔助投遞」的完整求職工作流。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.62-45BA4B?logo=playwright)](https://playwright.dev/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.30-FF6B35)](https://modelcontextprotocol.io/)

---

## ✨ 功能特色

| 特色 | 說明 |
|------|------|
| 🔍 **API 攔截式搜尋** | 不解析 DOM，直接攔截 104 後端 JSON API，完全繞過前端防爬蟲機制 |
| 📄 **職缺詳情讀取** | 以真實 Chrome 瀏覽器存取職缺頁面，提取職位描述、條件要求與公司福利 |
| 🛡️ **Human-in-the-loop 安全邊界** | 投遞工具只開啟視窗並填入求職信，**絕不自動按下最終送出**，需人類親自確認 |
| 🍪 **持久化登入 Session** | 使用專屬 Chrome Profile 儲存 Cookie，登入一次即可長期使用 |
| 🤖 **Agent 行為規範** | 內建 `AGENT.md` 定義 5-Step Smart Hunter Workflow，確保 AI 助理按照最佳流程幫你找工作 |

---

## 🚀 安裝步驟（人類操作，共 4 步）

### Step 1 — Clone 專案並建置
```bash
git clone https://github.com/YuJunWang/104-job-hunter-mcp.git
cd 104-job-hunter-mcp
npm install
npm run build
```

**系統需求**：Node.js 18+、Google Chrome、npm 9+

### Step 2 — 登入你的 104 帳號（只需一次）
```bash
npx tsx src/login.ts
```
執行後會彈出 Chrome 視窗，請**手動登入你的 104 帳號**後關閉視窗。Cookie 會自動存入 `.chrome-profile/` 資料夾。

> [!IMPORTANT]
> `.chrome-profile/` 已加入 `.gitignore`，你的 Session 不會被推送到 GitHub。

### Step 3 — 掛載 MCP 伺服器
將以下設定加入你的 MCP 客戶端設定檔（如 Antigravity `mcp_config.json` 或 Claude Desktop `config.json`）：

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
> Windows 使用者請注意路徑反斜線跳脫：`C:\\Users\\你的帳號\\...\\build\\index.js`

重啟 AI 客戶端後，MCP 工具即可使用。

### Step 4 — 設定 Agent 行為規範（強烈建議）

本專案附帶 [`AGENT.md`](./AGENT.md)，這份文件定義了 AI 如何使用工具來幫你找工作——包含主動索取履歷、精準媒合、客製化推薦信到 Hit-in-the-loop 投遞的完整流程。

**請選擇適合你的安裝方式，讓你的 AI 讀取這份規範：**

| AI 工具 | 安裝方法 |
|---------|---------|
| **Antigravity** | 將 `AGENT.md` 放入 `.agents/rules/` 資料夾，或存成全域 Skill 於 `~/.gemini/config/skills/104-hunter/SKILL.md` |
| **Cursor** | 將 `AGENT.md` 的內容加入專案的 `.cursorrules` |
| **Claude Desktop** | 將 `AGENT.md` 的內容加入 System Prompt |
| **任何 Agent 工具** | 在對話開始時，請人類直接告訴 AI：「請閱讀專案內的 AGENT.md 並按照流程幫我找工作」 |

---

---

## 🤖 AI Agent 使用手冊

> **以下內容由你的 AI 助理閱讀並執行。如果你正在幫人類安裝這個 MCP，請閱讀本節並依指示操作。**

### 快速安裝 Checklist（給 AI 執行）

如果你是被人類指派來完成安裝的 Agent，請依序確認並執行以下步驟：

- [ ] 執行 `git clone`、`npm install`、`npm run build`
- [ ] 提示人類執行 `npx tsx src/login.ts` 並完成 104 手動登入
- [ ] 協助人類找到其 MCP 客戶端的設定檔，寫入正確的絕對路徑設定
- [ ] 提示人類重啟 AI 客戶端
- [ ] **必須閱讀** [`AGENT.md`](./AGENT.md) 並告知人類你已理解求職流程
- [ ] 主動詢問人類的履歷、夢想職缺或技能樹，開始執行 Smart Hunter Workflow

### 三個 MCP 工具的完整規格

#### `job104_search` — 搜尋職缺

| 參數 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `keyword` | `string` | ✅ | 關鍵字，可組合多個詞語，如 `AI 全端工程師 Python LangChain` |
| `location` | `string` | ❌ | 縣市名稱，如 `台北市`、`新北市`（不填則全台搜尋） |
| `page` | `number` | ❌ | 頁數，預設 `1`，每頁約回傳 10～20 筆 |

> **Agent 注意**：請勿將原始 JSON 直接呈現給人類。應在背景與使用者背景交叉比對後，只呈現 Top 3～5 筆最相關結果。

---

#### `job104_get_details` — 取得職缺詳情

| 參數 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `job_url` | `string` | ✅ | 104 職缺頁面完整 URL，如 `https://www.104.com.tw/job/xxxxxx` |

回傳：職缺標題、公司名稱、完整職位描述、應徵條件、公司福利。在草擬推薦信前使用可提升媒合精準度。

---

#### `job104_prepare_application` — 準備投遞（Hit-in-the-loop）

| 參數 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `job_url` | `string` | ✅ | 104 職缺頁面完整 URL |
| `cover_letter_text` | `string` | ❌ | 求職信 / 自傳內容，會自動填入應徵表單 |
| `dry_run` | `boolean` | ❌ | 預設 `false`；設為 `true` 時只模擬，不真的開啟瀏覽器 |

> [!CAUTION]
> **安全邊界**：此工具執行完畢後，瀏覽器畫面會停留在投遞確認頁。**AI 不會也不應該代替人類按下最終送出按鈕。** 執行後務必提醒人類前往 Chrome 視窗手動確認送出。

### 故障排除

| 錯誤現象 | 可能原因 | 建議處置 |
|---------|---------|---------|
| 找不到「我要應徵」按鈕 | ① 已應徵過此職缺 ② Cookie 失效未登入 | 提醒人類確認登入狀態，或改選其他職缺 |
| `ProcessSingleton` 鎖定錯誤 | 另一個 Chrome 實例持有 `.chrome-profile` | 請人類關閉所有相關 Chrome 視窗後重試 |
| Cookie 失效 / 被導向登入頁 | 30 天以上未使用，Session 到期 | 請人類重新執行 `npx tsx src/login.ts` |

---

## 📁 專案結構

```
104-job-hunter-mcp/
├── src/
│   ├── index.ts          # MCP Server 主程式，工具註冊入口
│   ├── browser.ts        # Playwright 瀏覽器單例管理（整合 Stealth Plugin）
│   ├── login.ts          # 首次登入輔助腳本
│   ├── test-client.ts    # 本地 E2E 測試用客戶端
│   └── tools/
│       ├── search.ts     # job104_search 實作
│       ├── details.ts    # job104_get_details 實作
│       └── apply.ts      # job104_prepare_application 實作
├── build/                # TypeScript 編譯輸出（執行 npm run build 產生）
├── .chrome-profile/      # 登入後的 Chrome Profile（.gitignore 中）
├── AGENT.md              # AI Agent 求職標準作業規範（必讀）
├── package.json
└── tsconfig.json
```

---

## 📄 授權

ISC License | *Built with ❤️ using TypeScript + Playwright + MCP SDK*
