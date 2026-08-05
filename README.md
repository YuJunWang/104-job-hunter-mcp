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

## 📋 系統需求

- **Node.js** 18 以上（建議 20 LTS）
- **Google Chrome** 已安裝（Playwright 使用系統 Chrome 以存取真實 Cookie）
- **npm** 9 以上

---

## 🚀 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/YuJunWang/104-job-hunter-mcp.git
cd 104-job-hunter-mcp

# 2. 安裝相依套件
npm install

# 3. 建置 TypeScript
npm run build
```

---

## 🔐 首次使用：登入 104

這個工具需要你的 104 登入狀態來搜尋職缺與進行應徵。首次使用請執行以下指令：

```bash
npx tsx src/login.ts
```

執行後會自動開啟一個 Chrome 瀏覽器視窗，**請手動登入你的 104 帳號**。登入完成後關閉視窗，Cookie 會自動儲存到專案內的 `.chrome-profile/` 資料夾，後續使用不需再次登入。

> [!IMPORTANT]
> `.chrome-profile/` 資料夾已加入 `.gitignore`，你的帳號 Session 不會被推送到 GitHub。

---

## ⚙️ Antigravity 2.0 MCP 設定

在你的 Antigravity MCP 設定檔（`mcp_config.json`）中，加入以下設定：

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

> [!TIP]
> Windows 使用者請將路徑改為 `C:\\Users\\你的帳號\\Projects\\104-job-hunter-mcp\\build\\index.js`（注意雙反斜線）。

設定完成後重啟 Antigravity，即可在對話中直接呼叫以下三個工具。

---

## 🛠️ 工具說明

### 1. `job104_search` — 搜尋職缺

根據關鍵字搜尋 104 職缺列表。內部採用**網路 API 攔截**技術，直接解析 104 後端 JSON，不受前端 DOM 結構異動影響。

**輸入參數：**

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `keyword` | `string` | ✅ | 職缺關鍵字，例如 `前端工程師`、`Node.js` |
| `location` | `string` | ❌ | 工作地點，例如 `台北市` |
| `page` | `number` | ❌ | 頁數，預設為 `1` |

**範例輸入：**

```json
{
  "keyword": "TypeScript",
  "location": "台北市",
  "page": 1
}
```

**範例輸出：**

```json
{
  "keyword": "TypeScript",
  "page": 1,
  "total": 342,
  "results": [
    {
      "title": "前端工程師 (TypeScript / React)",
      "company": "某科技股份有限公司",
      "salary": "月薪 6～10 萬",
      "location": "台北市信義區",
      "description": "負責前端產品開發與維護...",
      "link": "https://www.104.com.tw/job/xxxxxx",
      "skills": ["TypeScript", "React", "Node.js"]
    }
  ]
}
```

---

### 2. `job104_get_details` — 取得職缺詳情

輸入職缺頁面 URL，取得完整的職位描述、條件要求與公司福利。

**輸入參數：**

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `job_url` | `string` (URL) | ✅ | 104 職缺頁面完整網址 |

**範例輸入：**

```json
{
  "job_url": "https://www.104.com.tw/job/xxxxxx"
}
```

**範例輸出：**

```json
{
  "title": "前端工程師 (TypeScript / React)",
  "company": "某科技股份有限公司",
  "description": "【工作內容】\n• 使用 React + TypeScript 開發 SPA 應用\n• 維護既有前端系統並進行效能優化...",
  "requirements": "【應徵條件】\n• 學歷：大學以上\n• 經歷：3年以上\n• 熟悉 TypeScript、React...",
  "benefits": "【福利制度】\n• 年薪14個月\n• 員工旅遊\n• 彈性上下班..."
}
```

---

### 3. `job104_prepare_application` — 準備投遞應徵

開啟指定職缺的應徵視窗、填入求職信內容，並在**需要人類最終確認**的安全邊界下停止。

> **⚠️ 安全邊界：** 此工具具備 Human-in-the-loop 安全機制。工具執行完畢後，瀏覽器畫面會停留在投遞確認頁，**AI 不會也不能代替你按下最終送出按鈕**。你必須親自確認畫面內容後，手動完成最後的投遞動作。

**輸入參數：**

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `job_url` | `string` (URL) | ✅ | 104 職缺頁面完整網址 |
| `cover_letter_text` | `string` | ❌ | 求職信 / 自傳內容，會自動填入應徵表單 |

**範例輸入：**

```json
{
  "job_url": "https://www.104.com.tw/job/xxxxxx",
  "cover_letter_text": "您好，我對貴公司的前端職位非常感興趣，我有 5 年的 TypeScript 開發經驗..."
}
```

**成功時的範例輸出：**

```json
{
  "status": "success",
  "message": "【Hit-in-the-loop】已成功點擊應徵按鈕並開啟投遞視窗。基於安全邊界，Agent 不會自動送出，請人類確認畫面後親自點擊最終送出按鈕！",
  "provided_cover_letter": "您好，我對貴公司的前端職位非常感興趣..."
}
```

**失敗時的範例輸出（例如已應徵過）：**

```json
{
  "status": "error",
  "error": "無法點擊我要應徵按鈕。請確認是否已經應徵過，或者網頁結構有變動。"
}
```

---

## 🤖 給 AI 代理的行為規範 (AGENT.md)

為了確保 AI 助理在幫你找工作時，能表現得像一個「懂得察言觀色、不亂投履歷」的專業獵頭，我們在專案中提供了 [`AGENT.md`](./AGENT.md)。

這份文件定義了 **5-Step Smart Hunter Workflow**，教導 AI 如何先要你的履歷、進行精準媒合，並在最後一步將控制權交還給你。

**如何「安裝」這份規範讓你的 AI 讀取？**
- **Antigravity 使用者**：可以將 `AGENT.md` 的內容存成全域 Skill（例如放在 `~/.gemini/config/skills/104-hunter-workflow/SKILL.md`），或是直接丟進當前工作區的 `.agents/rules/` 資料夾中。
- **Cursor / Claude Desktop 使用者**：可以將 `AGENT.md` 的內容直接貼進你的 `.cursorrules`，或是加進專案專屬的 System Prompt 中。

---

## 📁 專案結構

```
104-job-hunter-mcp/
├── src/
│   ├── index.ts          # MCP Server 主程式，註冊三個工具
│   ├── browser.ts        # Playwright 瀏覽器管理（單例模式）
│   ├── login.ts          # 首次登入輔助腳本
│   ├── test-client.ts    # 本地測試用客戶端
│   └── tools/
│       ├── search.ts     # job104_search 實作
│       ├── details.ts    # job104_get_details 實作
│       └── apply.ts      # job104_prepare_application 實作
├── build/                # TypeScript 編譯輸出（執行 npm run build 產生）
├── .chrome-profile/      # 登入後的 Chrome Profile（.gitignore 中）
├── package.json
└── tsconfig.json
```

---

## ⚠️ 重要注意事項

1. **`prepare_application` 絕不自動投遞**：這是設計上的硬性安全邊界。工具執行後瀏覽器會停在投遞確認頁，需要真人確認所有資訊後手動送出。

2. **Chrome 必須已安裝**：本工具使用系統 Chrome（非 Playwright 內建 Chromium），確保能使用完整的 Cookie 與登入 Session。

3. **104 網頁結構可能異動**：`get_details` 中的 DOM Selector 與 `prepare_application` 的按鈕定位，可能隨 104 改版而失效。若遇到問題，請至 `src/tools/` 調整對應 Selector。

4. **API 攔截技術的限制**：`search` 工具使用 Playwright 的 `response` 事件監聽。若 104 更換 API 路徑，請更新 `search.ts` 中的 `/jobs/search/api/jobs` 過濾條件。

5. **Session 到期**：若 Cookie 失效（通常 30 天以上未使用），請重新執行 `npx tsx src/login.ts` 更新登入狀態。

---

## 📄 授權

ISC License

---

*Built with ❤️ using TypeScript + Playwright + MCP SDK*
