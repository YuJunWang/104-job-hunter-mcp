import { extractJobId, extractCompanyId, isLoginUrl, normalizeJobUrl, isJobContentApiUrl } from '../utils/url';
import { resolveAreaCodes } from '../utils/area';
import { DetailsArgsSchema } from '../tools/details';
import { ApplyArgsSchema } from '../tools/apply';
import { LettersArgsSchema } from '../tools/letters';

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

        // --- normalizeJobUrl Tests ---
        const norm1 = normalizeJobUrl("https://www.104.com.tw/job/796uv?jobsource=xxx");
        assert(
            norm1 !== null && norm1.jobId === "796uv" && norm1.jobUrl === "https://www.104.com.tw/job/796uv",
            "normalizeJobUrl should normalize full URL with query params"
        );

        const norm2 = normalizeJobUrl("796uv");
        assert(
            norm2 !== null && norm2.jobId === "796uv" && norm2.jobUrl === "https://www.104.com.tw/job/796uv",
            "normalizeJobUrl should normalize raw jobId"
        );

        const norm3 = normalizeJobUrl("https://www.google.com");
        assert(
            norm3 === null,
            "normalizeJobUrl should return null for non-104 URLs"
        );

        // --- Schema Tests for job_url supporting raw jobId ---
        const detailsParsed = DetailsArgsSchema.parse({ job_url: "796uv" });
        assert(detailsParsed.job_url === "796uv", "DetailsArgsSchema should accept raw jobId");

        const applyParsed = ApplyArgsSchema.parse({ job_url: "796uv" });
        assert(applyParsed.job_url === "796uv", "ApplyArgsSchema should accept raw jobId");

        const lettersParsed = LettersArgsSchema.parse({ job_url: "796uv" });
        assert(lettersParsed.job_url === "796uv", "LettersArgsSchema should accept raw jobId");

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

        // --- Job Content API URL Tests ---
        assert(
            isJobContentApiUrl("https://www.104.com.tw/api/jobs/6lots", "6lots") === true,
            "Should match /api/jobs/{jobId}"
        );
        assert(
            isJobContentApiUrl("https://www.104.com.tw/job/ajax/content/6lots?r=171234", "6lots") === true,
            "Should match /job/ajax/content/{jobId} with query params"
        );
        assert(
            isJobContentApiUrl("https://www.104.com.tw/api/jobs/6lots_extra", "6lots") === false,
            "Should not partial-match longer jobIds"
        );
        assert(
            isJobContentApiUrl("https://www.104.com.tw/api/jobs/other", "6lots") === false,
            "Should not match different jobId"
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
