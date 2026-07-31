import { getBrowserPage } from '../browser';
import { z } from 'zod';

export const DetailsArgsSchema = z.object({
    job_url: z.string().url().describe("104 職缺頁面網址，格式如 https://www.104.com.tw/job/xxxxx")
});

export type DetailsArgs = z.infer<typeof DetailsArgsSchema>;

export async function getJobDetails(args: DetailsArgs) {
    const browserPage = await getBrowserPage();
    const { job_url } = args;

    // 從 URL 中提取 job ID，例如 /job/946e6 -> 946e6
    const jobIdMatch = job_url.match(/\/job\/([a-z0-9]+)/i);
    if (!jobIdMatch) {
        return { error: '無效的 104 職缺 URL 格式，應為 https://www.104.com.tw/job/xxxxx' };
    }
    const jobId = jobIdMatch[1];

    console.error(`[Details] Navigating to ${job_url} (jobId: ${jobId})`);

    // 用 Promise 攔截 104 後端的 Job Detail API
    const apiDataPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('詳情 API 回應逾時（15秒）')), 15000);

        browserPage.on('response', async (response) => {
            // 精確比對 /api/jobs/{jobId} 的 endpoint
            if (response.url().match(new RegExp(`/api/jobs/${jobId}$`))) {
                clearTimeout(timeout);
                try {
                    const json = await response.json();
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            }
        });
    });

    await browserPage.goto(job_url, { waitUntil: 'domcontentloaded' });

    let apiData: any;
    try {
        apiData = await apiDataPromise;
    } catch (e) {
        return { error: `無法取得職缺詳情：${(e as Error).message}` };
    }

    const d = apiData.data || {};
    const header = d.header || {};
    const jobDetail = d.jobDetail || {};
    const condition = d.condition || {};
    const welfare = d.welfare || {};
    const contact = d.contact || {};

    return {
        title: header.jobName || '',
        company: header.custName || '',
        companyUrl: header.custUrl || '',
        isApplied: header.isApplied || false,

        // 工作內容
        description: jobDetail.jobDescription || '',
        // 職務類別
        jobCategory: (jobDetail.jobCategory || []).map((c: any) => c.description).join('、'),
        // 工作地點
        workPlace: jobDetail.workPlace || '',
        // 薪資
        salary: jobDetail.salary || '',
        // 出勤時間
        workPeriod: jobDetail.workPeriod || '',
        // 上班時段
        workType: jobDetail.workType || '',

        // 條件要求
        edu: condition.edu?.description || '',
        workExp: condition.workExp?.description || '',
        skills: (condition.skill || []).map((s: any) => s.description),
        languages: (condition.language || []).map((l: any) => `${l.language?.description} ${l.ability?.description || ''}`),

        // 公司福利
        welfare: welfare.welfare || '',
        tags: (welfare.tag || []).map((t: any) => t.description).filter((d: string) => d && d.trim()),

        // 聯絡資訊
        hrName: contact.hrName || '',
        replyTime: contact.reply || '',
    };
}
