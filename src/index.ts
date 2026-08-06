import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { searchJobs, SearchArgsSchema } from "./tools/search";
import { getJobDetails, DetailsArgsSchema } from "./tools/details";
import { prepareApplication, ApplyArgsSchema } from "./tools/apply";
import { checkSession, SessionArgsSchema } from "./tools/session";


// 建立 MCP 伺服器實例
const server = new McpServer({
    name: "104-job-hunter",
    version: "1.0.0",
});

// 註冊搜尋工具
server.tool(
    "job104_search",
    "搜尋 104 人力銀行的職缺",
    SearchArgsSchema.shape,
    async (args) => {
        const result = await searchJobs(args as any);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊讀取職缺細節工具
server.tool(
    "job104_get_details",
    "取得單一職缺的詳細內容與條件要求",
    DetailsArgsSchema.shape,
    async (args) => {
        const result = await getJobDetails(args as any);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊準備投遞履歷工具
server.tool(
    "job104_prepare_application",
    "開啟應徵視窗並填入資訊。此工具僅作輔助，需人類最後確認送出。",
    ApplyArgsSchema.shape,
    async (args) => {
        const result = await prepareApplication(args as any);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊 Session 健康檢查工具
server.tool(
    "job104_check_session",
    "檢查 104 人力銀行的登入狀態。在開始求職流程前，可呼叫此工具確認 Cookie 是否仍有效，避免在最後投遞時才發現未登入。",
    SessionArgsSchema.shape,
    async (args) => {
        const result = await checkSession(args as any);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 啟動 StdIO 傳輸層
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("104 Job Hunter MCP Server is running on stdio");
}

main().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
});
