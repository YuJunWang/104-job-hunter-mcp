/**
 * 104 職缺應徵分析反推與資料正規化工具
 */

export function slugToJobNo(slug: string): number {
    const s = slug.trim().toLowerCase();
    const cleaned = s.replace(/^.*\/job\//, '').split(/[?#]/)[0];
    if (!/^[0-9a-z]+$/i.test(cleaned)) {
        throw new Error(`職缺代碼「${slug}」不是合法的 104 職缺代碼（應為英數字元，如 7bsyk）`);
    }
    // 104 內部十進位 jobNo 通常為 7~10 位純數字 (如 12308060, 15400848)
    if (/^\d{7,10}$/.test(cleaned)) {
        return parseInt(cleaned, 10);
    }
    const jobNo = parseInt(cleaned, 36);
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
