# 104 Job Hunter Intelligence Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `104-job-hunter-mcp` with competitor-inspired data intelligence capabilities: reverse-engineering exact applicant counts and competitive distributions (`job104_get_apply_analysis`), advanced search filters (salary min, exclude negotiable/featured ads, remote work, sorting), company in-depth JD text keyword search, and integrate corresponding SOP guidance into `AGENTS.md` and `README.md`.

**Architecture:** 
1. Build a pure-mathematical solver and normalizer in `src/utils/applyAnalysis.ts` to deduce exact applicant counts from percentage distributions and validate against 104 range codes.
2. Expose `job104_get_apply_analysis` tool in `src/tools/applyAnalysis.ts` using `fetchIn104` to query 104 internal APIs inside the active Chrome session.
3. Enhance `job104_search` in `src/tools/search.ts` with structured filters (`salaryMin`, `excludeNegotiable`, `excludeFeatured`, `remote`, `jobType`, `sort`).
4. Enhance `job104_get_company_detail` in `src/tools/company.ts` with in-company JD keyword search (`keyword`).
5. Update `src/index.ts` to register the new tool, update `package.json` to v1.2.0, and configure an automated test runner.
6. Enrich `AGENTS.md` with "Scenario D: Competitive Intelligence SOP" and update `README.md`.

**Tech Stack:** TypeScript, Node.js (v24), Playwright-extra, Zod, tsx.

**Spec:** Local intelligence upgrade based on competitive analysis of `a7512cs/104-mcp-server`.

## Global Constraints
- Strictly maintain backward compatibility for all existing MCP tool signatures.
- All newly added pure functions and logic must be verified using TDD before implementation.
- Preserve HITL (Human-In-The-Loop) security boundary: no automated final submissions.
- Do not introduce binary dependencies like `cycletls` (continue leveraging the existing real Google Chrome and `fetchIn104` browser context).
- Follow project conventions: clean error reporting (fail loud), no unhandled promise rejections, type safety with Zod schemas.

---

### Task 1: Applicant Analysis Mathematical Solver and Normalizer

**Files:**
- Create: `D:\AGY_Project\14_104_job_hunter\src\utils\applyAnalysis.ts`
- Create: `D:\AGY_Project\14_104_job_hunter\src\__tests__\applyAnalysis.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function slugToJobNo(slug: string): number;
  export function inferApplicantCount(percents: readonly number[], bounds?: { min: number; max: number }): number[];
  export function parseApplyRange(analysisType: number | null): { label: string; min: number; max: number };
  export interface ApplyAnalysisResult {
      jobId: string;
      jobNo: number;
      total: number | null;
      totalBasis: 'inferred' | 'exact' | 'unknown';
      totalCandidates: number[];
      applyRange: string;
      updateTime: string;
      edu: Array<{ name: string; count: number | null; percent: number }>;
      age: Array<{ name: string; count: number | null; percent: number }>;
      exp: Array<{ name: string; count: number | null; percent: number }>;
      language: Array<{ name: string; count: number | null; percent: number; levels: Array<{ name: string; count: number | null; percent: number }> }>;
      major: Array<{ name: string; count: number | null; percent: number }>;
      skills: Array<{ name: string; count: number | null; percent: number }>;
      certs: Array<{ name: string; count: number | null; percent: number }>;
  }
  export function normalizeApplyAnalysis(raw: any, meta: { jobId: string; jobNo: number; rangeCode: number | null }): ApplyAnalysisResult;
  ```

- [ ] **Step 1: Write the failing test**

Create `D:\AGY_Project\14_104_job_hunter\src\__tests__\applyAnalysis.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/src/__tests__/applyAnalysis.test.ts`
Expected: FAIL with "Cannot find module '../utils/applyAnalysis'"

- [ ] **Step 3: Write implementation**

Create `D:\AGY_Project\14_104_job_hunter\src\utils\applyAnalysis.ts`:
```typescript
/**
 * 104 職缺應徵分析反推與資料正規化工具
 */

export function slugToJobNo(slug: string): number {
    const s = slug.trim().toLowerCase();
    if (!/^[0-9a-z]+$/i.test(s)) {
        throw new Error(`職缺代碼「${slug}」不是合法的 104 職缺代碼（應為英數字元，如 7bsyk）`);
    }
    const jobNo = parseInt(s, 36);
    if (!Number.isSafeInteger(jobNo)) {
        throw new Error(`職缺代碼「${slug}」超出可轉換範圍`);
    }
    return jobNo;
}

export function parseApplyRange(analysisType: number | null): { label: string; min: number; max: number } {
    switch (analysisType) {
        case 1:
            return { label: "0~5 人", min: 0, max: 5 };
        case 2:
            return { label: "6~10 人", min: 6, max: 10 };
        case 3:
            return { label: "11~30 人", min: 11, max: 30 };
        case 4:
            return { label: "30 人以上", min: 31, max: 5000 };
        default:
            return { label: analysisType ? `未知區間(代碼: ${analysisType})` : "未知區間", min: 1, max: 5000 };
    }
}

function fitsPercent(percent: number, n: number): boolean {
    const k = Math.round((percent * n) / 100);
    if (k < 1 || k > n) return false;
    return Math.abs((k * 10000) / n - percent * 100) <= 0.5 + 1e-9;
}

export function inferApplicantCount(percents: readonly number[], bounds?: { min: number; max: number }): number[] {
    const informative = percents.filter(p => p > 0);
    if (informative.length === 0) return [];

    const lo = Math.max(1, bounds?.min ?? 1);
    const hi = Math.min(5000, bounds?.max ?? 5000);
    const candidates: number[] = [];

    for (let n = lo; n <= hi && candidates.length < 5; n++) {
        if (informative.every(p => fitsPercent(p, n))) {
            candidates.push(n);
        }
    }
    return candidates;
}

export interface DimensionItem {
    name: string;
    count: number | null;
    percent: number;
}

export interface LanguageItem extends DimensionItem {
    levels: Array<{ name: string; count: number | null; percent: number }>;
}

export interface ApplyAnalysisResult {
    jobId: string;
    jobNo: number;
    total: number | null;
    totalBasis: 'inferred' | 'exact' | 'unknown';
    totalCandidates: number[];
    applyRange: string;
    updateTime: string;
    edu: DimensionItem[];
    age: DimensionItem[];
    exp: DimensionItem[];
    language: LanguageItem[];
    major: DimensionItem[];
    skills: DimensionItem[];
    certs: DimensionItem[];
}

function extractItems(group: any, nameKey: string): Array<{ name: string; percent: number }> {
    if (!group || typeof group !== 'object') return [];
    const items: Array<{ name: string; percent: number }> = [];
    for (const key of Object.keys(group)) {
        if (key === 'update_time' || key === 'total') continue;
        const entry = group[key];
        if (entry && typeof entry === 'object' && entry[nameKey]) {
            const rawPercent = parseFloat(String(entry.percent ?? 0));
            if (!isNaN(rawPercent) && rawPercent > 0) {
                items.push({
                    name: String(entry[nameKey]).trim(),
                    percent: rawPercent
                });
            }
        }
    }
    return items.sort((a, b) => b.percent - a.percent);
}

export function normalizeApplyAnalysis(
    raw: any,
    meta: { jobId: string; jobNo: number; rangeCode: number | null }
): ApplyAnalysisResult {
    const range = parseApplyRange(meta.rangeCode);
    const updateTime = raw?.edu?.update_time || raw?.update_time || new Date().toISOString();

    const eduItems = extractItems(raw?.edu, 'eduName');
    const ageItems = extractItems(raw?.yearRange, 'yearRangeName');
    const expItems = extractItems(raw?.exp, 'expName');
    const majorItems = extractItems(raw?.major, 'majorName');
    const skillItems = extractItems(raw?.skill, 'skillName');
    const certItems = extractItems(raw?.certificate, 'certName');

    // 萃取語言能力
    const languageItems: LanguageItem[] = [];
    if (raw?.language && typeof raw.language === 'object') {
        for (const key of Object.keys(raw.language)) {
            if (key === 'update_time' || key === 'total') continue;
            const lang = raw.language[key];
            if (lang && lang.langName) {
                const langPercent = parseFloat(String(lang.percent ?? 0));
                const levels: Array<{ name: string; count: number | null; percent: number }> = [];
                if (lang.level && typeof lang.level === 'object') {
                    for (const lKey of Object.keys(lang.level)) {
                        const lvl = lang.level[lKey];
                        if (lvl && lvl.levelName) {
                            const lvlPct = parseFloat(String(lvl.percent ?? 0));
                            if (!isNaN(lvlPct) && lvlPct > 0) {
                                levels.push({
                                    name: String(lvl.levelName).trim(),
                                    count: null,
                                    percent: lvlPct
                                });
                            }
                        }
                    }
                }
                languageItems.push({
                    name: String(lang.langName).trim(),
                    count: null,
                    percent: isNaN(langPercent) ? 0 : langPercent,
                    levels: levels.sort((a, b) => b.percent - a.percent)
                });
            }
        }
    }

    // 收集所有可靠的百分比數值（排除語言頂層，因語言頂層是子層加總可能會有四捨五入累積誤差）
    const allPercents: number[] = [
        ...eduItems.map(i => i.percent),
        ...ageItems.map(i => i.percent),
        ...expItems.map(i => i.percent),
    ];

    let total: number | null = null;
    let totalBasis: 'inferred' | 'exact' | 'unknown' = 'unknown';
    let candidates: number[] = [];

    if (allPercents.length === 0) {
        if (meta.rangeCode === 1) {
            total = 0;
            totalBasis = 'inferred';
        }
    } else {
        candidates = inferApplicantCount(allPercents, { min: range.min, max: range.max });
        if (candidates.length > 0) {
            total = candidates[0];
            totalBasis = 'inferred';
        }
    }

    const mapCounts = (items: Array<{ name: string; percent: number }>): DimensionItem[] => {
        return items.map(item => ({
            name: item.name,
            percent: item.percent,
            count: total !== null ? Math.round((item.percent * total) / 100) : null
        }));
    };

    const finalLanguages: LanguageItem[] = languageItems.map(l => ({
        name: l.name,
        percent: l.percent,
        count: total !== null ? Math.round((l.percent * total) / 100) : null,
        levels: l.levels.map(lvl => ({
            name: lvl.name,
            percent: lvl.percent,
            count: total !== null ? Math.round((lvl.percent * total) / 100) : null
        }))
    }));

    return {
        jobId: meta.jobId,
        jobNo: meta.jobNo,
        total,
        totalBasis,
        totalCandidates: candidates,
        applyRange: range.label,
        updateTime,
        edu: mapCounts(eduItems),
        age: mapCounts(ageItems),
        exp: mapCounts(expItems),
        language: finalLanguages,
        major: mapCounts(majorItems).slice(0, 10),
        skills: mapCounts(skillItems).slice(0, 10),
        certs: mapCounts(certItems).slice(0, 10)
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/src/__tests__/applyAnalysis.test.ts`
Expected: PASS with "✅ All Applicant Analysis Tests Passed!"

- [ ] **Step 5: Commit**

```bash
git add src/utils/applyAnalysis.ts src/__tests__/applyAnalysis.test.ts
git commit -m "feat: add applicant analysis solver and normalization utility"
```

---

### Task 2: Implement `job104_get_apply_analysis` MCP Tool

**Files:**
- Create: `D:\AGY_Project\14_104_job_hunter\src\tools\applyAnalysis.ts`
- Create: `D:\AGY_Project\14_104_job_hunter\src\__tests__\applyAnalysisTool.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export const ApplyAnalysisArgsSchema: z.ZodObject<...>;
  export type ApplyAnalysisArgs = z.infer<typeof ApplyAnalysisArgsSchema>;
  export async function getApplyAnalysis(args: ApplyAnalysisArgs): Promise<ApplyAnalysisResult>;
  ```

- [ ] **Step 1: Write the failing test**

Create `D:\AGY_Project\14_104_job_hunter\src\__tests__\applyAnalysisTool.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/src/__tests__/applyAnalysisTool.test.ts`
Expected: FAIL with "Cannot find module '../tools/applyAnalysis'"

- [ ] **Step 3: Write implementation**

Create `D:\AGY_Project\14_104_job_hunter\src\tools\applyAnalysis.ts`:
```typescript
import { z } from 'zod';
import { fetchIn104 } from '../browser';
import { extractJobId } from '../utils/url';
import { slugToJobNo, normalizeApplyAnalysis, ApplyAnalysisResult } from '../utils/applyAnalysis';

export const ApplyAnalysisArgsSchema = z.object({
    jobUrlOrId: z.string().min(1).describe("104 職缺網址或代碼，例如 'https://www.104.com.tw/job/7bsyk' 或 '7bsyk'")
});

export type ApplyAnalysisArgs = z.infer<typeof ApplyAnalysisArgsSchema>;

export async function getApplyAnalysis(args: ApplyAnalysisArgs): Promise<ApplyAnalysisResult> {
    const slug = extractJobId(args.jobUrlOrId) || args.jobUrlOrId.trim();
    if (!slug) {
        throw new Error("無法解析職缺代碼，請確認輸入是否為正確的 104 職缺網址或代碼。");
    }

    const jobNo = slugToJobNo(slug);

    // 1. 取得職缺 header 中的 analysisType 區間代碼（如 1=0~5人, 2=6~10人, 3=11~30人, 4=30人以上）
    let rangeCode: number | null = null;
    try {
        const detailResp = await fetchIn104(`https://www.104.com.tw/job/ajax/content/${slug}`, {
            referrer: `https://www.104.com.tw/job/${slug}`
        });
        if (detailResp.ok && detailResp.json?.data?.header?.analysisType) {
            rangeCode = Number(detailResp.json.data.header.analysisType);
        }
    } catch (e) {
        console.error(`[Apply Analysis] Unable to fetch job header for analysisType: ${(e as Error).message}`);
    }

    // 2. 取得應徵分析詳細資料
    const analysisUrl = `https://www.104.com.tw/jb/104i/applyAnalysisToJob/all?job_no=${jobNo}`;
    const referrer = `https://www.104.com.tw/jobs/apply/analysis/${slug}`;

    console.error(`[Apply Analysis] Fetching API: ${analysisUrl}`);
    const response = await fetchIn104(analysisUrl, { referrer });

    if (!response.ok || !response.json) {
        throw new Error(`無法取得應徵分析資料，狀態碼: ${response.status}`);
    }

    return normalizeApplyAnalysis(response.json, {
        jobId: slug,
        jobNo,
        rangeCode
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/src/__tests__/applyAnalysisTool.test.ts`
Expected: PASS with "✅ Apply Analysis Tool Schema Tests Passed!"

- [ ] **Step 5: Commit**

```bash
git add src/tools/applyAnalysis.ts src/__tests__/applyAnalysisTool.test.ts
git commit -m "feat: implement job104_get_apply_analysis tool and schema"
```

---

### Task 3: Expand `job104_search` with Advanced Filters

**Files:**
- Modify: `D:\AGY_Project\14_104_job_hunter\src\tools\search.ts`
- Create: `D:\AGY_Project\14_104_job_hunter\src\__tests__\search.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export const SearchArgsSchema: z.ZodObject<{
      keyword: z.ZodString;
      location: z.ZodOptional<z.ZodString>;
      page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
      salaryMin: z.ZodOptional<z.ZodNumber>;
      excludeNegotiable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
      excludeFeatured: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
      remote: z.ZodOptional<z.ZodEnum<['full', 'partial', 'any']>>;
      jobType: z.ZodOptional<z.ZodEnum<['fulltime', 'parttime']>>;
      sort: z.ZodOptional<z.ZodEnum<['newest', 'salary', 'relevance']>>;
  }>;
  export function buildSearchUrl(args: SearchArgs, areaCodes?: string | null): string;
  export function filterJobResults(rawList: any[], options: { excludeFeatured?: boolean }): any[];
  ```

- [ ] **Step 1: Write the failing test**

Create `D:\AGY_Project\14_104_job_hunter\src\__tests__\search.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/src/__tests__/search.test.ts`
Expected: FAIL with "buildSearchUrl is not a function"

- [ ] **Step 3: Implement search filters in `src/tools/search.ts`**

Update `D:\AGY_Project\14_104_job_hunter\src\tools\search.ts`:
```typescript
import { getBrowserPage } from '../browser';
import { z } from 'zod';
import { resolveAreaCodes, SUPPORTED_AREAS } from '../utils/area';

export const SearchArgsSchema = z.object({
    keyword: z.string().describe("職缺關鍵字，例如 '前端工程師' 或 'Node.js'"),
    location: z.string().optional().describe("工作地點關鍵字，例如 '台北市'（非必要）"),
    page: z.number().optional().default(1).describe("頁數，預設為 1"),
    salaryMin: z.number().optional().describe("月薪下限（新台幣），例如 60000。自動附加 scstrict 確保篩選生效"),
    excludeNegotiable: z.boolean().optional().default(false).describe("是否排除面議職缺，預設為 false"),
    excludeFeatured: z.boolean().optional().default(false).describe("是否排除 104 付費廣告職缺（如 COACH 等無關推廣缺），預設為 false"),
    remote: z.enum(['full', 'partial', 'any']).optional().describe("遠端型態：'full' 完全遠端 / 'partial' 部分遠端 / 'any' 皆可"),
    jobType: z.enum(['fulltime', 'parttime']).optional().describe("工作性質：'fulltime' 全職 / 'parttime' 兼職"),
    sort: z.enum(['newest', 'salary', 'relevance']).optional().default('relevance').describe("排序方式：'newest' 最新更新優先 / 'salary' 待遇高到低 / 'relevance' 相關度優先")
});

export type SearchArgs = z.infer<typeof SearchArgsSchema>;

export function buildSearchUrl(args: SearchArgs, areaCodes?: string | null): string {
    const url = new URL('https://www.104.com.tw/jobs/search/');
    url.searchParams.set('keyword', args.keyword);
    url.searchParams.set('page', (args.page || 1).toString());
    url.searchParams.set('expansionType', 'area,spec,com,job,wf,wktm');
    url.searchParams.set('mode', 's');
    url.searchParams.set('jobsource', '2018indexpoc');

    if (areaCodes) {
        url.searchParams.set('area', areaCodes);
    }

    // 薪資篩選 (需同時送 scmin, sctp=M, scstrict=1)
    if (args.salaryMin && args.salaryMin > 0) {
        url.searchParams.set('scmin', args.salaryMin.toString());
        url.searchParams.set('sctp', 'M');
        url.searchParams.set('scstrict', '1');
    }

    if (args.excludeNegotiable) {
        url.searchParams.set('scstrict', '1');
        if (!args.salaryMin) {
            url.searchParams.set('scmin', '1');
            url.searchParams.set('sctp', 'M');
        }
    }

    // 遠端工作 (1: 完全, 2: 部分, 1,2: 皆可)
    if (args.remote === 'full') url.searchParams.set('remoteWork', '1');
    else if (args.remote === 'partial') url.searchParams.set('remoteWork', '2');
    else if (args.remote === 'any') url.searchParams.set('remoteWork', '1,2');

    // 全兼職 (ro: 1=全職, 2=兼職, 0=不限)
    if (args.jobType === 'fulltime') url.searchParams.set('ro', '1');
    else if (args.jobType === 'parttime') url.searchParams.set('ro', '2');
    else url.searchParams.set('ro', '0');

    // 排序 (15: 相關性, 16: 最新更新, 13: 待遇高到低)
    if (args.sort === 'newest') {
        url.searchParams.set('order', '16');
        url.searchParams.set('asc', '0');
    } else if (args.sort === 'salary') {
        url.searchParams.set('order', '13');
        url.searchParams.set('asc', '0');
    } else {
        url.searchParams.set('order', '15');
        url.searchParams.set('asc', '0');
    }

    return url.toString();
}

export function filterJobResults(rawList: any[], options: { excludeFeatured?: boolean }): any[] {
    if (!Array.isArray(rawList)) return [];
    if (!options.excludeFeatured) return rawList;
    // jobType === 1 代表 104 付費置頂廣告（經常無視搜尋關鍵字）
    return rawList.filter((job: any) => job.jobType !== 1);
}

export async function searchJobs(args: SearchArgs) {
    const { keyword, location, page: pageNum, excludeFeatured } = args;

    const area = location ? resolveAreaCodes(location) : null;
    if (area && !area.codes) {
        return {
            error: `無法辨識地點「${location}」。支援的縣市：${SUPPORTED_AREAS.join('、')}`,
        };
    }

    const browserPage = await getBrowserPage(false);
    const searchUrl = buildSearchUrl(args, area?.codes);

    console.error(`[Search] Navigating to ${searchUrl}`);
    
    const apiDataPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
            browserPage.off('response', handler);
            reject(new Error('API 回應逾時（20秒）'));
        }, 20000);

        const handler = async (response: any) => {
            if (response.url().includes('/jobs/search/api/jobs') || response.url().includes('/jobs/search/list')) {
                browserPage.off('response', handler);
                clearTimeout(timeout);
                try {
                    const json = await response.json();
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            }
        };

        browserPage.on('response', handler);
    });

    await browserPage.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    let apiData: any;
    try {
        apiData = await apiDataPromise;
    } catch (e) {
        return { error: `無法取得職缺資料：${(e as Error).message}` };
    }

    // 若 104 判定關鍵字是公司名，回傳引導提示
    if (apiData.metadata?.companyKeyword) {
        return {
            keyword,
            hint: `104 系統判定「${keyword}」為公司名稱。建議改用 job104_search_companies 查詢該公司，或使用 job104_get_company_detail 深入搜尋該公司開放之職缺。`,
            results: []
        };
    }

    const rawList = apiData.data?.list || apiData.data || [];
    const validRawList = filterJobResults(rawList, { excludeFeatured });

    const jobs = validRawList.map((job: any) => ({
        jobId: job.jobNo || (job.link?.job ? job.link.job.replace(/^.*\/job\//, '').split('?')[0] : ''),
        title: job.jobName || '',
        company: job.custName || '',
        salary: job.salaryDesc || ((job.salaryLow && job.salaryLow > 0)
            ? (job.salaryHigh >= 9999999
                ? `月薪 ${Math.round(job.salaryLow / 10000)} 萬以上`
                : `月薪 ${Math.round(job.salaryLow / 10000)}～${Math.round(job.salaryHigh / 10000)} 萬`)
            : '薪資面議'),
        location: job.jobAddrNoDesc || '',
        description: job.description || '',
        link: (job.link?.job ? (job.link.job.startsWith('http') ? job.link.job : `https:${job.link.job}`) : (job.jobNo ? `https://www.104.com.tw/job/${job.jobNo}` : '')),
        skills: (job.pcSkills || []).map((s: any) => s.description),
        isFeatured: job.jobType === 1
    }));

    return {
        keyword,
        ...(location ? { location } : {}),
        ...(area?.unknown.length ? { warning: `已忽略無法辨識的地點：${area.unknown.join('、')}` } : {}),
        page: pageNum,
        total: apiData.metadata?.total || jobs.length,
        results: jobs
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/src/__tests__/search.test.ts`
Expected: PASS with "✅ All Search Filter Tests Passed!"

- [ ] **Step 5: Commit**

```bash
git add src/tools/search.ts src/__tests__/search.test.ts
git commit -m "feat: enhance job104_search with salary, remote, ad filter and sort options"
```

---

### Task 4: Enhance `job104_get_company_detail` with JD Keyword Search

**Files:**
- Modify: `D:\AGY_Project\14_104_job_hunter\src\tools\company.ts`
- Create: `D:\AGY_Project\14_104_job_hunter\src\__tests__\company.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export const CompanyDetailArgsSchema: z.ZodObject<{
      companyInput: z.ZodString;
      keyword: z.ZodOptional<z.ZodString>;
  }>;
  export function buildCompanyJobsUrl(companyCode: string, keyword?: string): string;
  ```

- [ ] **Step 1: Write the failing test**

Create `D:\AGY_Project\14_104_job_hunter\src\__tests__\company.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/src/__tests__/company.test.ts`
Expected: FAIL with "buildCompanyJobsUrl is not a function"

- [ ] **Step 3: Implement in `src/tools/company.ts`**

Update `D:\AGY_Project\14_104_job_hunter\src\tools\company.ts`:
```typescript
import { z } from 'zod';
import { fetchIn104 } from '../browser';
import { extractCompanyId } from '../utils/url';

export const SearchCompanyArgsSchema = z.object({
    keyword: z.string().describe("公司名稱關鍵字，例如 '台積電' 或 'Google'"),
    page: z.number().optional().default(1).describe("頁數，預設為 1"),
    pageSize: z.number().optional().default(10).describe("每頁顯示數量，預設為 10")
});

export type SearchCompanyArgs = z.infer<typeof SearchCompanyArgsSchema>;

export async function searchCompanies(args: SearchCompanyArgs) {
    const query = new URLSearchParams({
        keyword: args.keyword,
        page: args.page.toString(),
        pageSize: args.pageSize.toString(),
    });

    const url = `https://www.104.com.tw/company/ajax/list?${query}`;
    
    console.error(`[Search Company] Fetching API: ${url}`);
    
    const response = await fetchIn104(url, { referrer: 'https://www.104.com.tw/company/search/' });

    if (!response.ok || !response.json) {
        throw new Error(`查詢公司失敗，狀態碼: ${response.status}`);
    }

    const result = response.json;
    const companies = result.data || [];
    
    return {
        keyword: args.keyword,
        total: result.metadata?.pagination?.total || companies.length,
        currentPage: result.metadata?.pagination?.currentPage || args.page,
        results: companies.map((co: any) => ({
            companyCode: co.encodedCustNo,
            name: co.name,
            industry: co.industryDesc,
            location: co.areaDesc,
            employees: co.employeeCountDesc,
            capital: co.capitalDesc,
            openJobs: co.jobCount,
            profile: co.profile ? `${co.profile.slice(0, 150)}...` : '',
            url: `https://www.104.com.tw/company/${co.encodedCustNo}`
        }))
    };
}

export const CompanyDetailArgsSchema = z.object({
    companyInput: z.string().describe("公司代碼或是公司網址。例如 '1a2x6bmutz' 或 'https://www.104.com.tw/company/1a2x6bmutz'"),
    keyword: z.string().optional().describe("在該公司內部搜尋職缺的關鍵字（比對職稱與 JD 內文，如 'C++' 或 'AWS'）")
});

export type CompanyDetailArgs = z.infer<typeof CompanyDetailArgsSchema>;

export function buildCompanyJobsUrl(companyCode: string, keyword?: string): string {
    const base = `https://www.104.com.tw/api/companies/${companyCode}/jobs?page=1&pageSize=50`;
    if (keyword && keyword.trim()) {
        return `${base}&keyword=${encodeURIComponent(keyword.trim())}`;
    }
    return base;
}

export async function getCompanyDetail(args: CompanyDetailArgs) {
    const companyCode = extractCompanyId(args.companyInput);
    if (!companyCode) {
        throw new Error("無法解析公司代碼，請確認輸入是否為正確的 104 公司網址或代碼。");
    }

    const referer = `https://www.104.com.tw/company/${companyCode}`;
    const detailUrl = `https://www.104.com.tw/api/companies/${companyCode}/content`;

    console.error(`[Company Detail] Fetching info for: ${companyCode}`);
    
    const detailResponse = await fetchIn104(detailUrl, { referrer: referer });

    if (!detailResponse.ok || !detailResponse.json?.data) {
        throw new Error(`無法取得公司資料，可能是代碼錯誤。狀態碼: ${detailResponse.status}`);
    }

    const d = detailResponse.json.data;

    // 抓取職缺（支援 keyword 在公司內部 JD 內文搜尋）
    const jobsUrl = buildCompanyJobsUrl(companyCode, args.keyword);
    let openJobs: any[] = [];
    let openJobsError: string | undefined;
    
    try {
        const jobsResponse = await fetchIn104(jobsUrl, { referrer: referer });
        if (jobsResponse.ok && jobsResponse.json) {
            const topJobs = jobsResponse.json.data?.list?.topJobs || [];
            const normalJobs = jobsResponse.json.data?.list?.normalJobs || [];
            openJobs = [...topJobs, ...normalJobs].map(job => ({
                jobCode: job.encodedJobNo,
                title: job.jobName,
                salary: job.jobSalaryDesc || '面議',
                location: job.jobAddrNoDesc || '',
                url: `https://www.104.com.tw/job/${job.encodedJobNo}`
            }));
        } else {
            openJobsError = `職缺列表 API 回應異常，狀態碼: ${jobsResponse.status}`;
        }
    } catch (e) {
        console.error("[Company Detail] Failed to fetch jobs list", e);
        openJobsError = `職缺列表讀取失敗：${(e as Error).message}`;
    }

    return {
        companyCode,
        name: d.custName,
        industry: d.industryDesc,
        employees: d.empNo,
        capital: d.capital,
        address: d.address,
        website: d.custLink || '',
        hrContact: d.hrName || '',
        followers: d.followerCount,
        profile: d.profile || '',
        products: d.product || '',
        welfare: d.welfare || '',
        isSaved: d.follow?.isSaved || false,
        jobKeyword: args.keyword || null,
        openJobsCount: openJobs.length,
        openJobsList: openJobs,
        ...(openJobsError ? { openJobsError } : {}),
        url: referer
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/src/__tests__/company.test.ts`
Expected: PASS with "✅ Company Detail Enhancement Tests Passed!"

- [ ] **Step 5: Commit**

```bash
git add src/tools/company.ts src/__tests__/company.test.ts
git commit -m "feat: add internal JD keyword search to getCompanyDetail"
```

---

### Task 5: Register New Tool and Unified Test Suite

**Files:**
- Modify: `D:\AGY_Project\14_104_job_hunter\src\index.ts`
- Modify: `D:\AGY_Project\14_104_job_hunter\package.json`
- Create: `D:\AGY_Project\14_104_job_hunter\src\__tests__\runAllTests.ts`

- [ ] **Step 1: Create unified test suite script**

Create `D:\AGY_Project\14_104_job_hunter\src\__tests__\runAllTests.ts`:
```typescript
import { execSync } from 'child_process';
import * as path from 'path';

const testFiles = [
    'src/__tests__/url.test.ts',
    'src/__tests__/applyAnalysis.test.ts',
    'src/__tests__/applyAnalysisTool.test.ts',
    'src/__tests__/search.test.ts',
    'src/__tests__/company.test.ts'
];

console.log(`🚀 Executing ${testFiles.length} Test Suites...`);

for (const file of testFiles) {
    const fullPath = path.resolve(__dirname, '..', '..', file);
    console.log(`\n==============================\n▶ Running ${file}\n==============================`);
    execSync(`npx tsx "${fullPath}"`, { stdio: 'inherit' });
}

console.log(`\n🎉 All ${testFiles.length} Test Suites Passed Successfully!\n`);
```

- [ ] **Step 2: Update `package.json`**

Update `test` script in `D:\AGY_Project\14_104_job_hunter\package.json`:
```json
{
  "name": "104-job-hunter-mcp",
  "version": "1.2.0",
  "scripts": {
    "check": "tsx src/check-env.ts",
    "test": "tsx src/__tests__/runAllTests.ts",
    "build": "tsc",
    "start": "node build/index.js",
    "dev": "tsx src/index.ts"
  }
}
```

- [ ] **Step 3: Register `job104_get_apply_analysis` in `src/index.ts`**

Update `D:\AGY_Project\14_104_job_hunter\src\index.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { searchJobs, SearchArgsSchema } from "./tools/search";
import { getJobDetails, DetailsArgsSchema } from "./tools/details";
import { prepareApplication, ApplyArgsSchema } from "./tools/apply";
import { checkSession, SessionArgsSchema } from "./tools/session";
import { searchCompanies, SearchCompanyArgsSchema, getCompanyDetail, CompanyDetailArgsSchema } from "./tools/company";
import { saveJob, SaveJobArgsSchema, saveCompany, SaveCompanyArgsSchema } from "./tools/save";
import { getCoverLetters, LettersArgsSchema } from "./tools/letters";
import { getApplyAnalysis, ApplyAnalysisArgsSchema } from "./tools/applyAnalysis";
import { closeBrowser, runExclusive } from "./browser";

const server = new McpServer({
    name: "104-job-hunter",
    version: "1.2.0",
});

// 註冊搜尋工具
server.tool(
    "job104_search",
    "搜尋 104 人力銀行的職缺，支援薪資下限、排除面議/廣告職缺、遠端型態、全兼職與最新排序",
    SearchArgsSchema.shape,
    async (args) => {
        const result = await runExclusive(() => searchJobs(args as any));
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
        const result = await runExclusive(() => getJobDetails(args as any));
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊應徵者競爭分析工具
server.tool(
    "job104_get_apply_analysis",
    "取得單一職缺的應徵者競爭情報分析：透過數學精算反推確切應徵人數（total），以及學歷、年資、年齡、語言、主要科系、擅長技能與證照分布。僅在評估競爭態勢或求職信對齊時使用。",
    ApplyAnalysisArgsSchema.shape,
    async (args) => {
        const result = await runExclusive(() => getApplyAnalysis(args as any));
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊讀取自我推薦信範本工具
server.tool(
    "job104_get_cover_letters",
    "讀取您 104 帳號中儲存的所有自我推薦信（Cover Letter）範本，包含範本名稱、內文與是否為預設。",
    LettersArgsSchema.shape,
    async (args) => {
        const result = await runExclusive(() => getCoverLetters(args as any));
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊準備投遞履歷工具
server.tool(
    "job104_prepare_application",
    "開啟應徵視窗並填入資訊，支援選擇特定推薦信範本或覆蓋填入客製化推薦信。此工具僅作輔助，需人類最後確認送出。",
    ApplyArgsSchema.shape,
    async (args) => {
        const result = await runExclusive(() => prepareApplication(args as any));
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
        const result = await runExclusive(() => checkSession(args as any));
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊搜尋公司工具
server.tool(
    "job104_search_companies",
    "搜尋 104 人力銀行上的公司資訊，可根據公司名稱關鍵字搜尋，回傳包含產業別、地點、現有職缺數量等資訊。",
    SearchCompanyArgsSchema.shape,
    async (args) => {
        const result = await runExclusive(() => searchCompanies(args as any));
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊取得公司詳細資訊工具
server.tool(
    "job104_get_company_detail",
    "取得單一公司的詳細內容（簡介、福利、聯絡人）與開放職缺列表，支援以 keyword 在該公司所有職缺 JD 內文中全文比對關鍵字。",
    CompanyDetailArgsSchema.shape,
    async (args) => {
        const result = await runExclusive(() => getCompanyDetail(args as any));
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊收藏職缺工具
server.tool(
    "job104_save_job",
    "將指定的職缺代碼加入您 104 帳號的「我的收藏」中。此工具會直接執行寫入操作，需先確認已登入。",
    SaveJobArgsSchema.shape,
    async (args) => {
        const result = await runExclusive(() => saveJob(args as any));
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊追蹤公司工具
server.tool(
    "job104_save_company",
    "將指定的公司代碼加入您 104 帳號的追蹤名單中。此工具會直接執行寫入操作，需先確認已登入。",
    SaveCompanyArgsSchema.shape,
    async (args) => {
        const result = await runExclusive(() => saveCompany(args as any));
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    }
);

// 註冊優雅重啟工具（供開發或更新時熱重載）
server.tool(
    "job104_reload_server",
    "優雅重新啟動 MCP 伺服器以載入新編譯的代碼，不中斷 stdio 管道。",
    {},
    async () => {
        setTimeout(async () => {
            try {
                await closeBrowser();
            } catch {}
            process.exit(0);
        }, 100);
        return {
            content: [{ type: "text", text: "✅ 伺服器已發送優雅關閉信號 (exit code 0)，Antigravity 將在下一次呼叫時自動載入最新代碼。" }]
        };
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[104 Job Hunter MCP] Server started and listening on stdio.");
}

main().catch((error) => {
    console.error("[104 Job Hunter MCP] Fatal server error:", error);
    process.exit(1);
});
```

- [ ] **Step 4: Run test and build**

Run: `npm test && npm run build`
Expected: All 5 test suites pass and TypeScript compilation succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts package.json src/__tests__/runAllTests.ts
git commit -m "feat: register job104_get_apply_analysis tool and update test runner to v1.2.0"
```

---

### Task 6: Update `AGENTS.md` and `README.md` with AI Guidance

**Files:**
- Modify: `D:\AGY_Project\14_104_job_hunter\AGENTS.md`
- Modify: `D:\AGY_Project\14_104_job_hunter\README.md`

- [ ] **Step 1: Add Scenario D to `AGENTS.md` and update existing scenarios**

In `AGENTS.md`:
1. Under **劇本 A：泛用職缺探索**:
   - Guide the agent to utilize `salaryMin`, `excludeNegotiable`, `excludeFeatured: true` (to avoid irrelevant coach ads), and `sort: 'newest'` when the user wants fresh postings.
2. Under **劇本 B：單一企業深度調研**:
   - Guide the agent to use `job104_get_company_detail` with `keyword` (e.g. `keyword: 'C++'`) to search for skills inside all company JDs.
3. Add **劇本 D：競爭情報診斷與突圍策略 (Competitive Intelligence SOP)**:
   - **觸發時機**：當人類對某職缺表達強烈興趣但猶豫「不知道容不容易錄取」、詢問「目前有多少人投過」、或在執行「劇本 C 精準打擊」撰寫推薦信前。
   - **執行動作**：呼叫 `job104_get_apply_analysis` 取得確切人數與競爭者背景分布。
   - **洞察回灌機制**：
     - 若學歷普遍為碩博士（如 >70%），而使用者為碩士或具豐富資歷，可強調學研成果或實戰架構能力。
     - 觀察競逐者的 Top 10 技能，找出競爭者最普遍具備的技術（基礎門檻），以及使用者獨有而競爭者缺乏的亮點（突圍利器）。
     - 將分析結果精簡為「競爭態勢速報」回報給人類，絕不傾倒冗長中間 JSON。
4. Update Troubleshooting section if needed.

- [ ] **Step 2: Update `README.md`**

Update `README.md`:
1. Tool list from 9 to 10 tools, adding `job104_get_apply_analysis`.
2. Document new parameters for `job104_search` and `job104_get_company_detail`.
3. Highlight the competitive analysis feature.

- [ ] **Step 3: Verify and Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: enrich AGENTS.md with competitive intelligence SOP and update README"
```

---

### Task 7: Full Verification and Checkpoint

**Files:**
- Create/Run: `D:\AGY_Project\14_104_job_hunter\scratch\test_all_tools.ts`

- [ ] **Step 1: Run all unit test suites**

Run: `npm test`
Expected: 5/5 test suites pass.

- [ ] **Step 2: Run environment & session check**

Run: `npm run check`
Expected: Pass.

- [ ] **Step 3: Run comprehensive verification script**

Run: `npx tsx D:/AGY_Project/14_104_job_hunter/scratch/test_all_tools.ts`
Expected: All 10 tools execute and return valid structured data.

- [ ] **Step 4: Verify working tree clean**

Run: `git status`
Expected: Clean working tree.
