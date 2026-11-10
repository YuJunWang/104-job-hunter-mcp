import { buildSearchUrl, filterJobResults, SearchArgsSchema } from '../tools/search';
import { waitForJsonResponseDuringGoto } from '../browser';

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

    // 4. Browser Navigation & API Interception Tests (waitForJsonResponseDuringGoto)
    class MockPage {
        listeners: Array<(res: any) => void> = [];
        gotoShouldThrow: Error | null = null;
        gotoBehavior?: () => Promise<void>;

        on(event: string, fn: (res: any) => void) {
            if (event === 'response') this.listeners.push(fn);
        }
        off(event: string, fn: (res: any) => void) {
            if (event === 'response') {
                this.listeners = this.listeners.filter(l => l !== fn);
            }
        }
        async goto(url: string, opts?: any) {
            if (this.gotoShouldThrow) throw this.gotoShouldThrow;
            if (this.gotoBehavior) await this.gotoBehavior();
        }
        emitResponse(res: any) {
            for (const l of [...this.listeners]) {
                l(res);
            }
        }
    }

    // Case A: goto throws net::ERR_CONNECTION_RESET
    const mockPageA = new MockPage();
    mockPageA.gotoShouldThrow = new Error("net::ERR_CONNECTION_RESET");
    let caughtErrorA: Error | null = null;
    try {
        await waitForJsonResponseDuringGoto(
            mockPageA,
            "https://www.104.com.tw/jobs/search/",
            (url) => url.includes('/jobs/search/api/jobs'),
            5000,
            "API timeout"
        );
    } catch (e) {
        caughtErrorA = e as Error;
    }
    assert(caughtErrorA !== null, "Case A: should reject when goto throws");
    assert(caughtErrorA?.message === "net::ERR_CONNECTION_RESET", "Case A: error message should match goto error");
    assert(mockPageA.listeners.length === 0, "Case A: response listener must be removed on error");

    // Case B: goto succeeds and matching response arrives
    const mockPageB = new MockPage();
    mockPageB.gotoBehavior = async () => {
        mockPageB.emitResponse({
            url: () => "https://www.104.com.tw/jobs/search/api/jobs?keyword=AI",
            json: async () => ({ status: 200, data: [{ jobName: "AI Engineer" }] })
        });
    };
    const resultB = await waitForJsonResponseDuringGoto(
        mockPageB,
        "https://www.104.com.tw/jobs/search/",
        (url) => url.includes('/jobs/search/api/jobs'),
        5000,
        "API timeout"
    );
    assert(resultB?.status === 200 && resultB?.data?.[0]?.jobName === "AI Engineer", "Case B: should resolve with parsed JSON");
    assert(mockPageB.listeners.length === 0, "Case B: response listener must be removed after successful response");

    console.log("✅ All Search Filter Tests Passed!");
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
