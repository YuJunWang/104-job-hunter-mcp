import { buildSearchUrl, filterJobResults, SearchArgsSchema } from '../tools/search';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(`❌ Assertion Failed: ${message}`);
}

async function runTests() {
    console.log("🏃 Running Search Filter Tests...");

    // 1. URL Building Tests
    const url1 = new URL(buildSearchUrl({ keyword: "TypeScript", page: 1 }));
    assert(url1.searchParams.get('keyword') === "TypeScript", "Keyword present");
    assert(url1.searchParams.get('page') === "1", "Page present");

    // 2. Advanced Parameters
    const url2 = new URL(buildSearchUrl({
        keyword: "AI",
        page: 2,
        salaryMin: 60000,
        excludeNegotiable: true,
        remote: "full",
        jobType: "fulltime",
        sort: "newest"
    }, "6001001000"));

    assert(url2.searchParams.get('scmin') === "60000", "scmin set to salaryMin");
    assert(url2.searchParams.get('scstrict') === "1", "scstrict set to 1 when salaryMin provided");
    assert(url2.searchParams.get('sctp') === "M", "sctp set to monthly");
    assert(url2.searchParams.get('remoteWork') === "1", "full remote set to 1");
    assert(url2.searchParams.get('ro') === "1", "fulltime set to 1");
    assert(url2.searchParams.get('order') === "16", "newest sort order is 16");
    assert(url2.searchParams.get('area') === "6001001000", "area codes added");

    // 3. Filter Job Results (Exclude Featured)
    const rawList = [
        { jobName: "廣告職缺", jobType: 1, custName: "廣告商" },
        { jobName: "一般職缺", jobType: 2, custName: "正常公司" },
        { jobName: "自然職缺", custName: "自然公司" }
    ];

    const filtered = filterJobResults(rawList, { excludeFeatured: true });
    assert(filtered.length === 2, "Featured job (jobType 1) should be excluded");
    assert(!filtered.some(j => j.jobName === "廣告職缺"), "Ad job removed");

    console.log("✅ All Search Filter Tests Passed!");
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
