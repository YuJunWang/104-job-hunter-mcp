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

## 🔒 隱私與安全說明 (Privacy & Security)

許多人在使用自動化或 AI 輔助工具時，會擔心帳號與密碼的安全性。本專案在設計上嚴格遵循「**本地優先 (Local-First)**」安全原則，你可以放心使用：

- 💻 **100% 本地運行**：MCP 是一個本機協議。這個伺服器只運行在你的電腦上，**絕對不會**將你的帳號、密碼或 Cookie 傳送到外部的雲端伺服器。
- 🔑 **不經手帳號密碼**：在執行登入步驟時，程式只是幫你開啟一個本地 Chrome 視窗。你是在 104 官方登入頁面上進行登入，程式碼完全不會讀取或紀錄你的密碼。
- 🍪 **安全儲存 Cookie**：登入完成後，瀏覽器的 Cookie 會以加密形式存在你本機的 `.chrome-profile/` 資料夾中。該資料夾已列入 `.gitignore`，**絕對不會**隨著 Git 被上傳到 GitHub。
- 🔍 **開源透明**：本專案程式碼完全開源，你可以隨時檢查 `src/browser.ts` 等程式碼，確認其中沒有任何將資料傳送至第三方伺服器的後門。

---

## 🚀 安裝與設定

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

本專案附帶 [`AGENT.md`](./AGENT.md)，這是一份寫給 AI 看的「獵頭守則」。裡面規定了 AI 該怎麼主動要履歷、怎麼精準媒合，以及最重要的——絕不偷按送出按鈕。

**強烈建議你選一個方法，把這份規範裝進你的 AI 腦袋裡：**

| AI 工具 | 安裝方法 |
|---------|---------|
| **Antigravity** | 將 `AGENT.md` 放入 `.agents/rules/` 資料夾，或存成全域 Skill 於 `~/.gemini/config/skills/104-hunter/SKILL.md` |
| **Cursor** | 將 `AGENT.md` 的內容加入專案的 `.cursorrules` |
| **Claude Desktop** | 將 `AGENT.md` 的內容加入 System Prompt |
| **任何 Agent 工具** | 在對話開始時，請人類直接告訴 AI：「請閱讀專案內的 AGENT.md 並按照流程幫我找工作」 |

---

---

## 🤖 AI Agent 使用手冊

> **給下一個 AI Agent 的交接指令 (System Prompt for AI Agents)**
> 
> 如果你是被人類指派來閱讀這份文件的 AI Agent，你的任務是幫他把這個 MCP 伺服器裝好並跑起來。請依序完成以下動作：
> 
> 1. **安裝與建置**：在終端機幫人類執行 `git clone`、`npm install` 跟 `npm run build`。
> 2. **搞定登入狀態**：請人類執行 `npx tsx src/login.ts`，並在彈出的瀏覽器中手動登入 104（這會產出必要的 Cookie）。
> 3. **掛載 MCP 伺服器**：幫人類把這個 MCP 的絕對路徑寫進他們的設定檔裡（例如 `mcp_config.json` 或 Claude Desktop config）。
> 4. **讀取行為規範 (重要！)**：你**必須**去讀專案根目錄下的 [`AGENT.md`](./AGENT.md)。裡面寫了你該怎麼用這些工具來幫人類找工作（包含 5-Step Smart Hunter Workflow）。
> 5. **開工**：安裝完成後，直接問人類：「你想找什麼工作？方便給我最新履歷嗎？」，然後開始幹活！

### 八個 MCP 工具的完整規格

#### `job104_check_session` — 檢查登入狀態

| 參數 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| — | — | — | 此工具不需要傳入任何參數 |

回傳包含 `logged_in` (布林值) 與 `message` (說明文字)。建議 Agent 在每次求職流程（背景探索階段）的最開始優先呼叫此工具，確保 Cookie 依然有效，防範因登入過期導致的投遞失敗。

---

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

---

#### `job104_search_companies` — 搜尋公司

| 參數 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `keyword` | `string` | ✅ | 公司名稱關鍵字，如 `台積電` 或 `Google` |
| `page` | `number` | ❌ | 頁數，預設 `1` |
| `pageSize` | `number` | ❌ | 每頁顯示數量，預設 `10` |

---

#### `job104_get_company_detail` — 取得公司詳情

| 參數 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `companyInput` | `string` | ✅ | 公司代碼或是完整網址，如 `1a2x6bmutz` 或 `https://www.104.com.tw/company/1a2x6bmutz` |

回傳：公司完整簡介、產品、福利、聯絡人資訊，並**預設回傳該公司目前所有開放的職缺列表**。適合用於深度調研特定企業。

---

#### `job104_save_job` — 收藏職缺

| 參數 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `jobInput` | `string` | ✅ | 職缺代碼或是完整網址，如 `796uv` |

呼叫後會直接以目前的登入狀態發送請求，將該職缺加入使用者的「我的收藏」。需確認登入狀態有效。

---

#### `job104_save_company` — 追蹤公司

| 參數 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `companyInput` | `string` | ✅ | 公司代碼或是完整網址，如 `1a2x6bmutz` |

呼叫後會直接發送請求，將該公司加入追蹤名單。需確認登入狀態有效。

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
│       ├── apply.ts      # job104_prepare_application 實作
│       └── session.ts    # job104_check_session 實作
├── build/                # TypeScript 編譯輸出（執行 npm run build 產生）
├── .chrome-profile/      # 登入後的 Chrome Profile（.gitignore 中）
├── AGENT.md              # AI Agent 求職標準作業規範（必讀）
├── package.json
└── tsconfig.json
```

---

## 📄 授權

ISC License | *Built with ❤️ using TypeScript + Playwright + MCP SDK*
