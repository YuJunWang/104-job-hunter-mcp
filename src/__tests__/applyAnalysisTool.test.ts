import { ApplyAnalysisArgsSchema } from '../tools/applyAnalysis';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(`❌ Assertion Failed: ${message}`);
}

async function runTests() {
    console.log("🏃 Running Apply Analysis Tool Schema Tests...");

    const parsed = ApplyAnalysisArgsSchema.parse({
        jobUrlOrId: "https://www.104.com.tw/job/7bsyk"
    });
    assert(parsed.jobUrlOrId === "https://www.104.com.tw/job/7bsyk", "Schema parses valid url");

    const parsedId = ApplyAnalysisArgsSchema.parse({
        jobUrlOrId: "7bsyk"
    });
    assert(parsedId.jobUrlOrId === "7bsyk", "Schema parses valid id");

    let threw = false;
    try {
        ApplyAnalysisArgsSchema.parse({ jobUrlOrId: "" });
    } catch {
        threw = true;
    }
    assert(threw, "Empty input should throw validation error");

    console.log("✅ Apply Analysis Tool Schema Tests Passed!");
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
