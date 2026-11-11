import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { searchJobs, SearchArgsSchema } from "./tools/search";
import { getJobDetails, DetailsArgsSchema } from "./tools/details";
import { prepareApplication, ApplyArgsSchema } from "./tools/apply";
import { checkSession, SessionArgsSchema } from "./tools/session";
import { searchCompanies, SearchCompanyArgsSchema, getCompanyDetail, CompanyDetailArgsSchema } from "./tools/company";
import { saveJob, SaveJobArgsSchema, saveCompany, SaveCompanyArgsSchema } from "./tools/save";
import { getCoverLetters, LettersArgsSchema } from "./tools/letters";
import { getApplyAnalysis, ApplyAnalysisArgsSchema } from "./tools/applyAnalysis";
import { closeBrowser, runExclusive } from "./browser";

/**
 * 統一 MCP 工具執行與錯誤邊界包裹函式
 */
export async function executeToolSafely<T>(fn: () => Promise<T>): Promise<{
    isError?: boolean;
    content: Array<{ type: "text"; text: string }>;
}> {
    try {
        const result = await runExclusive(fn);
        const hasErrorField =
            result !== null &&
            typeof result === "object" &&
            "error" in (result as Record<string, unknown>) &&
            Boolean((result as Record<string, unknown>).error);
        return {
            ...(hasErrorField ? { isError: true } : {}),
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ status: "error", error: message }, null, 2),
                },
            ],
        };
    }
}

/**
 * 註冊進程優雅關閉處理器，防止殭屍 Chrome 行程鎖定設定檔
 */
export function registerGracefulShutdown(
    cleanupFn: () => Promise<void> = closeBrowser,
    proc: {
        once: (event: string, listener: () => void) => any;
        stdin?: { once: (event: string, listener: () => void) => any };
        exit: (code: number) => void;
    } = process
): () => Promise<void> {
    let shuttingDown: Promise<void> | null = null;
    const shutdown = async () => {
        if (shuttingDown) return shuttingDown;
        shuttingDown = (async () => {
            try {
                await cleanupFn();
            } catch {
                // Ignore cleanup errors during shutdown
            } finally {
                proc.exit(0);
            }
        })();
        return shuttingDown;
    };

    proc.once("SIGINT", () => { void shutdown(); });
    proc.once("SIGTERM", () => { void shutdown(); });
    if (proc.stdin && typeof proc.stdin.once === "function") {
        proc.stdin.once("close", () => { void shutdown(); });
    }
    return shutdown;
}

// 建立 MCP 伺服器實例
const server = new McpServer({
    name: "104-job-hunter",
    version: "1.2.1",
});

// 註冊搜尋工具
server.tool(
    "job104_search",
    "搜尋 104 人力銀行的職缺，支援薪資下限、排除面議/廣告職缺、遠端型態、全兼職與最新排序",
    SearchArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => searchJobs(args as any));
    }
);

// 註冊讀取職缺細節工具
server.tool(
    "job104_get_details",
    "取得單一職缺的詳細內容與條件要求",
    DetailsArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => getJobDetails(args as any));
    }
);

// 註冊應徵者競爭分析工具
server.tool(
    "job104_get_apply_analysis",
    "取得單一職缺的應徵者競爭情報分析：透過數學精算反推確切應徵人數（total），以及學歷、年資、年齡、語言、主要科系、擅長技能與證照分布。僅在評估競爭態勢或求職信對齊時使用。",
    ApplyAnalysisArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => getApplyAnalysis(args as any));
    }
);

// 註冊讀取自我推薦信範本工具
server.tool(
    "job104_get_cover_letters",
    "讀取您 104 帳號中儲存的所有自我推薦信（Cover Letter）範本，包含範本名稱、內文與是否為預設。",
    LettersArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => getCoverLetters(args as any));
    }
);

// 註冊準備投遞履歷工具
server.tool(
    "job104_prepare_application",
    "開啟應徵視窗並填入資訊，支援選擇特定推薦信範本或覆蓋填入客製化推薦信。此工具僅作輔助，需人類最後確認送出。",
    ApplyArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => prepareApplication(args as any));
    }
);

// 註冊 Session 健康檢查工具
server.tool(
    "job104_check_session",
    "檢查 104 人力銀行的登入狀態。在開始求職流程前，可呼叫此工具確認 Cookie 是否仍有效，避免在最後投遞時才發現未登入。",
    SessionArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => checkSession(args as any));
    }
);

// 註冊搜尋公司工具
server.tool(
    "job104_search_companies",
    "搜尋 104 人力銀行上的公司資訊，可根據公司名稱關鍵字搜尋，回傳包含產業別、地點、現有職缺數量等資訊。",
    SearchCompanyArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => searchCompanies(args as any));
    }
);

// 註冊取得公司詳細資訊工具
server.tool(
    "job104_get_company_detail",
    "取得單一公司的詳細內容（簡介、福利、聯絡人）與開放職缺列表，支援以 keyword 在該公司所有職缺 JD 內文中全文比對關鍵字。",
    CompanyDetailArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => getCompanyDetail(args as any));
    }
);

// 註冊收藏職缺工具
server.tool(
    "job104_save_job",
    "將指定的職缺代碼加入您 104 帳號的「我的收藏」中。此工具會直接執行寫入操作，需先確認已登入。",
    SaveJobArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => saveJob(args as any));
    }
);

// 註冊追蹤公司工具
server.tool(
    "job104_save_company",
    "將指定的公司代碼加入您 104 帳號的追蹤名單中。此工具會直接執行寫入操作，需先確認已登入。",
    SaveCompanyArgsSchema.shape,
    async (args) => {
        return executeToolSafely(() => saveCompany(args as any));
    }
);

// 註冊優雅重啟工具（供開發或更新時熱重載）
server.tool(
    "job104_reload_server",
    "優雅重新啟動 MCP 伺服器以載入新編譯的代碼，不中斷 stdio 管道。",
    {},
    async () => {
        setTimeout(async () => {
            try {
                await closeBrowser();
            } catch {}
            process.exit(0);
        }, 100);
        return {
            content: [{ type: "text", text: "✅ 伺服器已發送優雅關閉信號 (exit code 0)，Antigravity 將在下一次呼叫時自動載入最新代碼。" }]
        };
    }
);

// 啟動 StdIO 傳輸層
async function main() {
    registerGracefulShutdown(closeBrowser, process);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("104 Job Hunter MCP Server is running on stdio");
}

if (require.main === module) {
    main().catch(error => {
        console.error("Server error:", error);
        process.exit(1);
    });
}
