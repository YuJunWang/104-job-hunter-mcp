import { getBrowserPage } from '../browser';
import { z } from 'zod';

export const SearchArgsSchema = z.object({
    keyword: z.string().describe("職缺關鍵字，例如 '前端工程師' 或 'Node.js'"),
    location: z.string().optional().describe("工作地點關鍵字，例如 '台北市'（非必要）"),
    page: z.number().optional().default(1).describe("頁數，預設為 1")
});

export type SearchArgs = z.infer<typeof SearchArgsSchema>;

export async function searchJobs(args: SearchArgs) {
    const { keyword, page: pageNum } = args;
    const browserPage = await getBrowserPage(false);
    
    // 建立 104 搜尋網址
    const url = new URL('https://www.104.com.tw/jobs/search/');
    url.searchParams.set('ro', '0');
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('expansionType', 'area,spec,com,job,wf,wktm');
    url.searchParams.set('order', '15');
    url.searchParams.set('asc', '0');
    url.searchParams.set('page', pageNum.toString());
    url.searchParams.set('mode', 's');
    url.searchParams.set('jobsource', '2018indexpoc');

    console.error(`[Search] Navigating to ${url.toString()}`);
    
    // 用 Promise 監聽 104 的後端 JSON API，繞過所有 DOM 防爬蟲機制
    // ⚠️ 使用命名函式 + off() 確保每次搜尋後清除監聽器，避免 EventEmitter 洩漏
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

    await browserPage.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    
    let apiData: any;
    try {
        apiData = await apiDataPromise;
    } catch (e) {
        return { error: `無法取得職缺資料：${(e as Error).message}` };
    }

    // 將 API 回傳的 JSON 轉換成我們的格式
    const rawList = apiData.data?.list || apiData.data || [];
    const jobs = (Array.isArray(rawList) ? rawList : []).map((job: any) => ({
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
    }));


    return {
        keyword,
        page: pageNum,
        total: apiData.metadata?.total || jobs.length,
        results: jobs
    };
}
