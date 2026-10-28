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
