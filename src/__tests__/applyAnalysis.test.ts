import { slugToJobNo, inferApplicantCount, parseApplyRange, normalizeApplyAnalysis } from '../utils/applyAnalysis';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(`❌ Assertion Failed: ${message}`);
}

async function runTests() {
    console.log("🏃 Running Applicant Analysis Tests...");

    // 1. Slug to jobNo conversion (base36 to base10)
    assert(slugToJobNo("7bsyk") === 12308060, "7bsyk should map to decimal 12308060");
    assert(slugToJobNo("7BSYK") === 12308060, "slug conversion should be case-insensitive");
    let caughtSlug = false;
    try { slugToJobNo("invalid-slug!"); } catch { caughtSlug = true; }
    assert(caughtSlug, "Invalid slug characters should throw");

    // 2. parseApplyRange
    assert(parseApplyRange(1).label === "0~5 人" && parseApplyRange(1).min === 0 && parseApplyRange(1).max === 5, "range 1");
    assert(parseApplyRange(2).label === "6~10 人" && parseApplyRange(2).min === 6 && parseApplyRange(2).max === 10, "range 2");
    assert(parseApplyRange(3).label === "11~30 人" && parseApplyRange(3).min === 11 && parseApplyRange(3).max === 30, "range 3");
    assert(parseApplyRange(4).label === "30 人以上" && parseApplyRange(4).min === 31, "range 4");

    // 3. Mathematical applicant count inference
    // In job 80ao3, percents are [50.00, 50.00] (education: 4 master, 4 bachelor, total 8 in 6~10人)
    const candidates8 = inferApplicantCount([50.00, 12.50, 37.50], { min: 6, max: 10 });
    assert(candidates8.includes(8), "Should infer 8 from percentages [50.00, 12.50, 37.50]");

    // 4. normalizeApplyAnalysis
    const mockRaw = {
        edu: {
            "0": { eduName: "碩博士", count: 0, percent: "50.00" },
            "1": { eduName: "大學", count: 0, percent: "50.00" },
            update_time: "2026-10-28 10:00:00",
            total: 0
        },
        yearRange: {
            "0": { yearRangeName: "26~30歲", count: 0, percent: "100.00" }
        },
        exp: {
            "0": { expName: "1~3年", count: 0, percent: "100.00" }
        },
        language: {},
        major: {},
        skill: {
            "0": { skillName: "TypeScript", count: 0, percent: "100.00" }
        },
        certificate: {}
    };

    const normalized = normalizeApplyAnalysis(mockRaw, {
        jobId: "80ao3",
        jobNo: 123456,
        rangeCode: 2 // 6~10人
    });

    assert(normalized.total === 8 || normalized.total === 6, "Total should be inferred into range 6~10");
    assert(normalized.totalBasis === 'inferred', "totalBasis should be inferred");
    assert(normalized.edu.length === 2, "Edu length should be 2");
    assert(normalized.edu[0].name === "碩博士", "First edu item should match");
    assert(normalized.edu[0].count !== null, "Edu count should be calculated from inferred total");
    assert(normalized.skills[0].name === "TypeScript", "Skill should be normalized");

    console.log("✅ All Applicant Analysis Tests Passed!");
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
