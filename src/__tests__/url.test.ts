import { extractJobId, extractCompanyId, isLoginUrl } from '../utils/url';
import { resolveAreaCodes } from '../utils/area';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`❌ Assertion Failed: ${message}`);
    }
}

async function runTests() {
    console.log("🏃 Running URL Utility Tests...");

    try {
        // --- Job ID Tests ---
        assert(
            extractJobId("https://www.104.com.tw/job/796uv") === "796uv",
            "Should extract ID from standard HTTPS URL"
        );

        assert(
            extractJobId("https://www.104.com.tw/job/796uv?jobsource=2018indexpoc&expansionType=area") === "796uv",
            "Should extract ID when URL has query parameters"
        );

        assert(
            extractJobId("https://m.104.com.tw/job/796uv") === "796uv",
            "Should extract ID from mobile URL"
        );

        assert(
            extractJobId("796uv") === "796uv",
            "Should return raw ID if input is just the ID"
        );

        assert(
            extractJobId("https://www.google.com") === null,
            "Should return null for non-104 URLs"
        );

        // --- Company ID Tests ---
        assert(
            extractCompanyId("https://www.104.com.tw/company/1a2x6bmutz") === "1a2x6bmutz",
            "Should extract Company ID from standard URL"
        );

        assert(
            extractCompanyId("https://www.104.com.tw/company/1a2x6bmutz?jobsource=...&test=1") === "1a2x6bmutz",
            "Should extract Company ID from URL with query parameters"
        );

        assert(
            extractCompanyId("1a2x6bmutz") === "1a2x6bmutz",
            "Should return raw Company ID if input is just the ID"
        );

        // --- Login URL Tests ---
        // 104 新版登入頁。漏判會讓 check_session 誤報「已登入」、login.ts 一開就誤判成功退出。
        assert(
            isLoginUrl("https://signin.104.com.tw/"),
            "signin.104.com.tw must count as login page (104 moved login here)"
        );
        assert(
            isLoginUrl("https://login.104.com.tw/login?url=x") && isLoginUrl("https://pda.104.com.tw/login/index"),
            "Legacy login pages must still count as login page"
        );
        assert(
            !isLoginUrl("https://pda.104.com.tw/") && !isLoginUrl("https://www.104.com.tw/job/96qjm"),
            "Member dashboard / job pages must NOT count as login page, otherwise logged-in users get told to re-login"
        );
        assert(
            !isLoginUrl("https://evil.com/?r=signin.104.com.tw"),
            "Only the hostname decides; a query string mentioning signin must not match"
        );

        // --- Area Code Tests ---
        // 104 的 area 參數只吃代碼，傳中文會被 104 靜默忽略，搜尋結果變成全台灣。
        assert(
            resolveAreaCodes("台北市").codes === "6001001000",
            "Exact city name must map to its 104 code"
        );
        assert(
            resolveAreaCodes("臺中").codes === "6001008000" && resolveAreaCodes("新竹市").codes === "6001006000",
            "Users write 臺/台 and drop or vary 市/縣; these must still resolve"
        );
        assert(
            resolveAreaCodes("台北市、新北市").codes === "6001001000,6001002000",
            "Multiple areas must join with comma, the format 104 accepts"
        );
        const bad = resolveAreaCodes("台北市,火星");
        assert(
            bad.unknown.length === 1 && bad.unknown[0] === "火星",
            "Unrecognised names must be reported back, not silently dropped"
        );

        console.log("✅ All URL Utility Tests Passed!");
        process.exit(0);
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }
}

runTests();
