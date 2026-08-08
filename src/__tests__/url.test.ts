import { extractJobId, extractCompanyId } from '../utils/url';

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

        console.log("✅ All URL Utility Tests Passed!");
        process.exit(0);
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }
}

runTests();
