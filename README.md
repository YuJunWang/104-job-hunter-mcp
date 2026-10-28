# 104 Job Hunter MCP 🏹

> 透過 MCP (Model Context Protocol) 讓 AI 直接接管 104 人力銀行的繁瑣操作。  
> 專注於精準過濾、深度調研、競爭者情報反推與客製自薦信代填，拒絕無意義的亂槍打鳥。

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/YuJunWang/104-job-hunter-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.62-45BA4B?logo=playwright)](https://playwright.dev/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.30-FF6B35)](https://modelcontextprotocol.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)
[![Local-First](https://img.shields.io/badge/Security-Local--First-brightgreen)](#-隱私與安全首要原則)

---

### 🎯 實戰淬鍊的真實故事

這套工具不是寫來展示技術的 Demo。我自己轉職 AI 工程師時，就是靠著這套流程，精準拿到面試並成功落地。

在 104 上找工作，大家一定都體會過這種無力感：
- **雜訊太多**：職缺標題寫著「AI 工程師」，點進去才發現工作內容只是資料標註，或者混雜了一堆與關鍵字無關的付費廣告（例如搜工程師跑出精品專櫃）。
- **競爭模糊**：104 只給籠統的人數區間（如「6~10 人」或「30 人以上」），你根本不知道對手是誰、具備什麼學歷與技能背景。
- **精力有限**：認真研究公司背景、核對職缺條件、手寫客製化自薦信，一天頂多投 3 家，腦袋就乾了。
- **罐頭履歷無效**：市面上許多標榜「自動求職」的工具，本質只是狂按送出的垃圾信發報機，充滿 ChatGPT 套話，HR 一看就直接丟垃圾桶。

因此我寫了這套 MCP 工具，把 AI 當作自己的「求職特助」：  
它清楚我的技能樹、職涯目標與地雷紅線；在背景幫我擋掉 95% 不合適與廣告職缺；調閱對手背景與確切應徵人數進行勝率診斷；接著調出我原本存在 104 的自薦信語氣，針對職位痛點微調，並把推薦信填妥在應徵視窗裡，最後交給我親自把關確認。

這套人機協作流程幫我拿到了滿意的工作。現在我把這套系統完整開源出來。

---

## 🧭 設計原則：四道防線

```mermaid
flowchart TD
    subgraph Input["1. 輸入設定"]
        A["求職宣言 (MY_PROFILE.md)"] --> B["AI Agent (大腦)"]
        A2["帳號內既有推薦信範本<br>(保持真實語氣)"] --> B
    end

    subgraph Core["2. 篩選與競爭調研 (MCP)"]
        B -->|攔截 API 搜尋| C["104 職缺庫"]
        C -->|背景自動比對| D{"條件/紅線/廣告過濾"}
        D -- 排除不符條件與廣告 --> X["捨棄"]
        D -- 挑選 Top 3 --> E["深度調研職缺與企業"]
        E -->|反推確切人數與對手背景| E2["📊 競爭態勢分析 (apply_analysis)"]
        E2 --> F["撰寫客製自薦信<br>(突圍優勢 + 去 AI 腔調)"]
    end

    subgraph HITL["3. Hit-in-the-Loop 安全邊界"]
        F --> G["自動代填至 104 應徵視窗<br>(job104_prepare_application)"]
        G --> H{"人類最終肉眼審查"}
        H -->|滿意| I["👤 人類手動點擊確認送出"]
        H -->|需修改| F
    end

    classDef accent fill:#f96,stroke:#333,stroke-width:2px;
    class H,I accent;
```

### 1. 精準狙擊，不搞亂槍打鳥
AI 抓回搜尋結果後，不會一股腦把十幾頁列表倒給你。它會對照你的 `MY_PROFILE.md`，自動濾掉薪資不符、踩到地雷或技術棧差太遠的職缺，並能一鍵過濾 104 付費廣告（`excludeFeatured`），只整理出 3 到 5 筆真正值得看的選擇。

### 2. 競爭者情報逆向分析（知己知彼）
104 網站只提供粗略的應徵人數區間（如「11~30 人」），且 API 的 total 常態為 0。本專案透過兩位小數的百分比數值，利用數學解題器**精準反推確切應徵總人數**，並還原出對手的**學歷、年資、擅長技能與證照分布**，讓你在投遞前就知道自己贏在哪裡。

### 3. 說人話，拔除機器臭味
工具會直接讀取你 104 帳號現有的推薦信範本（`job104_get_cover_letters`），以你平常講話的習慣為底稿，針對該職缺的需求微調。徹底拿掉「深感榮幸、為貴司賦能」這種浮誇套話，把重點放在實際做過的專案邊界與解題過程。

### 4. Hit-in-the-loop：安全邊界不退讓
**這套工具絕不替你按最後的「確認送出」。**  
`job104_prepare_application` 會打開投遞彈窗、選好履歷、填入推薦信，然後停下來。投哪家、怎麼投，是你的個人職涯，最後的送出鍵必須由你親眼看過、親手按下。

---

## ✨ 核心功能與工程細節

- 🔍 **進階 API 攔截搜尋**：監聽 104 後端 JSON API，支援**薪資下限 (`salaryMin` 搭配 `scstrict=1`)**、**排除面議**、**排除廣告職缺 (`excludeFeatured`)**、**最新排序 (`sort: 'newest'`)** 與**遠端工作篩選**，並內建台灣縣市 Area Code 自動解析。
- 📊 **競爭情報精算**：獨創 `job104_get_apply_analysis`，反推職缺不重複應徵人數，並掌握學歷（碩博/大學）、年資階層、對手 Top 10 技能與證照。
- 🏢 **企業深層調研與 JD 內文搜尋**：除提取企業福利與公司簡介外，支援以 `keyword` 直接在該公司所有職缺的 **JD 內文**中全文比對，挖掘職稱沒寫但內文要求的寶藏職缺。
- 🔒 **本地優先 (Local-First)**：
  - 100% 在你本機運作，不對外傳輸帳號密碼或個人資料。
  - 登入使用獨立的本機 Chrome Profile，完全由你在官方頁面操作，免除重複登入困擾。
- 🚦 **併發互斥防護 (Concurrency Protection)**：工具呼叫內建排隊互斥鎖，防止 Agent 平行發送多個請求時分頁互相搶導航而當機。

---

## 📋 前置準備清單 (Prerequisites)

開始使用前，請確認你的電腦已安裝好以下基礎工具：

| 項目 | 建議版本 | 必要性 | 說明與用途 | 下載來源 |
| :--- | :--- | :---: | :--- | :--- |
| **Node.js** | `>= 18.0.0` (推薦 20+ LTS) | 必備 | 執行 MCP 伺服器、編譯 TypeScript 與套件管理 | [官方下載](https://nodejs.org/) |
| **Google Chrome** | 官方穩定版本 | 必備 | 本專案借用本機 Chrome 儲存 Profile，免除爬蟲驗證並維持登入 | [官方下載](https://www.google.com/chrome/) |
| **Git** | 任意版本 | 必備 | 用於下載專案及日後 `git pull` 更新代碼 | [官方下載](https://git-scm.com/) |
| **MCP Client** | 支援 MCP 之客戶端 | 必備 | 載入並調用本工具的 AI 環境 (如 Antigravity, Claude Desktop, Cursor) | - |
| **104 會員帳號** | 個人正常帳號 | 必備 | 請先在 104 網站完成基本履歷填寫與自薦信範本儲存 | [104 官網](https://www.104.com.tw/) |

> [!TIP]
> **一鍵環境診斷**：安裝完套件後，可在終端機執行 `npm run check`，系統會自動檢測 Node.js 版本、Chrome 執行檔路徑、編譯狀態與登入 Profile，若有缺少會給出具體提示。

---

## 🚀 快速上手

> [!IMPORTANT]
> ### 🤖 給正在協助人類的 AI Agent (System Directive)
> 如果你是被人類指派來協助設定或操作本專案的 AI 代理（如 Antigravity, Claude Desktop, Cursor 等）：
> 1. **立即讀取操作手冊**：請優先研讀專案根目錄的 [`AGENTS.md`](./AGENTS.md)，內含完整的決策狀態機與去 AI 化推薦信規格。
> 2. **主動引導建立分身**：檢查根目錄是否存在 `MY_PROFILE.md`。若尚無此檔，**請暫停搜尋**，主動向人類提問索取簡歷/專案經歷，並參考 `MY_PROFILE.example.md` 協助生成專屬 Profile。
> 3. **遵守安全防線**：嚴格落實 Hit-in-the-Loop 規範，代填表單後將視窗交還人類，**絕不**替人類代按最終送出鍵。

### 1. 安裝與建置
```bash
git clone https://github.com/YuJunWang/104-job-hunter-mcp.git
cd 104-job-hunter-mcp
npm install
npm run check    # 💡 檢查本機環境與 Chrome 是否就緒
npm test         # 🧪 執行 5 組單元測試套件
npm run build
```

### 2. 登入 104 帳號（只需一次）
```bash
npx tsx src/login.ts
```
執行後會跳出 Chrome 視窗，請在 104 官方頁面登入。登入成功後腳本會自動儲存 Cookie 並安全關閉。

### 3. 掛載 MCP 伺服器
將設定加入你的 MCP 用戶端設定檔（例如 Antigravity 的 `mcp_config.json` 或 Claude Desktop 的 `claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "104-job-hunter": {
      "command": "node",
      "args": ["D:\\your-path\\104-job-hunter-mcp\\build\\index.js"]
    }
  }
}
```

### 4. 設定 AI 腦袋
1. 複製根目錄的 `MY_PROFILE.example.md`，命名為 `MY_PROFILE.md`。
2. 填入你的專案經驗、技能樹、薪資期望、地點與絕對紅線。
3. 直接告訴你的 AI：
   > 「請閱讀專案裡的 `MY_PROFILE.md` 與 `AGENTS.md`，照著標準劇本幫我找工作。」

---

## 🛠️ MCP 工具列表 (共 10 組)

| 工具名稱 | 用途說明 | 運作機制 |
| :--- | :--- | :--- |
| `job104_check_session` | 檢查登入是否有效 | 支援新版 `signin.104.com.tw` 跳轉判斷，避免中途卡住 |
| `job104_search` | 搜尋職缺 | 支援關鍵字、地點代碼轉換、**薪資下限**、**排除面議**、**排除廣告職缺**、**遠端型態**與**最新排序** |
| `job104_get_details` | 讀取職缺完整內容 | 取得詳細 JD、薪資條件、加分技能與 HR 聯絡人資訊 |
| `job104_get_apply_analysis` | **應徵者競爭情報分析** | **數學反推確切應徵總人數**，並回傳學歷、年資、年齡、語言、Top 10 技能與證照分布 |
| `job104_get_cover_letters` | 取得現有自薦信範本 | 讀取帳號內的預設與自訂推薦信標題與全文，保留個人原始口吻 |
| `job104_prepare_application` | 代填應徵表單 (HITL) | 開啟彈窗並填入微調後的推薦信，支援 Dry Run 截圖，**不替你送出** |
| `job104_search_companies` | 搜尋企業資訊 | 查詢公司代碼、規模、產業類別與現有職缺數 |
| `job104_get_company_detail` | 公司深度分析 | 提取企業福利文化與開放職缺，支援以 `keyword` 比對該公司職缺 JD 全文 |
| `job104_save_job` | 收藏職缺 | 解析職缺所屬公司並加入我的收藏名單 |
| `job104_save_company` | 追蹤公司 | 帶入完整規格 Payload 追蹤心儀企業 |
| `job104_reload_server` | 優雅重載 MCP | 伺服器更新代碼後安全發送重啟信號，不中斷 stdio 通道 |

---

## 📁 專案架構

```
104-job-hunter-mcp/
├── src/
│   ├── index.ts          # MCP 入口，註冊 10 組工具與 runExclusive 佇列防護
│   ├── browser.ts        # Playwright 瀏覽器單例管理與 fetchIn104 頁內請求封裝
│   ├── login.ts          # 互動登入與 Cookie 本地持久化腳本
│   ├── utils/
│   │   ├── url.ts        # 職缺/公司 URL 提取與新版 signin 登入網址判斷
│   │   ├── area.ts       # 104 官方台灣縣市 Area Code 雙向對照工具
│   │   └── applyAnalysis.ts # 應徵者人數精算反推與多維度正規化
│   ├── tools/            # 10 組核心工具實作
│   └── __tests__/        # 5 組單元測試套件與 runAllTests.ts 測試運行器
├── AGENTS.md             # AI 操作手冊（含去 AI 寫作原則、競爭情報分析與 4 步投遞 SOP）
├── MY_PROFILE.example.md # 求職分身設定檔範本
└── package.json          # v1.2.0
```

---

## 寫在最後

求職不該是求職者與企業人資之間的「垃圾信轟炸攻防」。  
善用 AI 替你過濾雜訊、診斷競爭態勢、填寫繁瑣表單，把時間和精力省下來，留給真正與未來主管、團隊交流的關鍵時刻。

希望這個專案能幫你少走一點冤枉路，順利找到合適的位置。
