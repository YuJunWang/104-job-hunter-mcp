import { buildCompanyJobsUrl, CompanyDetailArgsSchema } from '../tools/company';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(`❌ Assertion Failed: ${message}`);
}

async function runTests() {
    console.log("🏃 Running Company Detail Enhancement Tests...");

    // 1. Schema check
    const parsed = CompanyDetailArgsSchema.parse({
        companyInput: "1a2x6bmutz",
        keyword: "C++"
    });
    assert(parsed.keyword === "C++", "Schema accepts keyword");

    // 2. URL building
    const urlWithoutKw = buildCompanyJobsUrl("1a2x6bmutz");
    assert(!urlWithoutKw.includes("keyword="), "URL without keyword should not contain keyword param");

    const urlWithKw = buildCompanyJobsUrl("1a2x6bmutz", "C++");
    assert(urlWithKw.includes("keyword=C%2B%2B") || urlWithKw.includes("keyword=C++"), "URL with keyword should encode keyword");

    console.log("✅ Company Detail Enhancement Tests Passed!");
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
