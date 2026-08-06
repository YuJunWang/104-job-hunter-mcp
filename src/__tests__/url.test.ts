import { extractJobId } from '../utils/url';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`❌ Assertion Failed: ${message}`);
    }
}

async function runTests() {
    console.log("🏃 Running URL Utility Tests...");

    try {
        // Test case 1: Standard URL
        assert(
            extractJobId("https://www.104.com.tw/job/796uv") === "796uv",
            "Should extract ID from standard HTTPS URL"
        );

        // Test case 2: URL with query parameters
        assert(
            extractJobId("https://www.104.com.tw/job/796uv?jobsource=2018indexpoc&expansionType=area") === "796uv",
            "Should extract ID when URL has query parameters"
        );

        // Test case 3: Mobile URL
        assert(
            extractJobId("https://m.104.com.tw/job/796uv") === "796uv",
            "Should extract ID from mobile URL"
        );

        // Test case 4: Raw job ID input
        assert(
            extractJobId("796uv") === "796uv",
            "Should return raw ID if input is just the ID"
        );

        // Test case 5: Invalid format should return null
        assert(
            extractJobId("https://www.google.com") === null,
            "Should return null for non-104 URLs"
        );

        console.log("✅ All URL Utility Tests Passed!");
        process.exit(0);
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
    }
}

runTests();
