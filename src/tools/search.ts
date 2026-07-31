import { getBrowserPage } from '../browser';
import { z } from 'zod';

export const SearchArgsSchema = z.object({
    keyword: z.string().describe("職缺關鍵字，例如 '前端工程師' 或 'Node.js'"),
    location: z.string().optional().describe("工作地點關鍵字，例如 '台北市'（非必要）"),
    page: z.number().optional().default(1).describe("頁數，預設為 1")
});

export type SearchArgs = z.infer<typeof SearchArgsSchema>;

export async function searchJobs(args: SearchArgs) {
    const browserPage = await getBrowserPage();
    const { keyword, page: pageNum } = args;
    
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
    const apiDataPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('API 回應逾時（20秒）')), 20000);
        
        browserPage.on('response', async (response) => {
            if (response.url().includes('/jobs/search/api/jobs')) {
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

    await browserPage.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    
    let apiData: any;
    try {
        apiData = await apiDataPromise;
    } catch (e) {
        return { error: `無法取得職缺資料：${(e as Error).message}` };
    }

    // 將 API 回傳的 JSON 轉換成我們的格式
    const jobs = (apiData.data || []).map((job: any) => ({
        title: job.jobName || '',
        company: job.custName || '',
        salary: (job.salaryLow && job.salaryLow > 0)
            ? (job.salaryHigh >= 9999999
                ? `月薪 ${Math.round(job.salaryLow / 10000)} 萬以上`
                : `月薪 ${Math.round(job.salaryLow / 10000)}～${Math.round(job.salaryHigh / 10000)} 萬`)
            : '薪資面議',
        location: job.jobAddrNoDesc || '',
        description: job.description || '',
        link: job.link?.job || '',
        skills: (job.pcSkills || []).map((s: any) => s.description),
    }));

    return {
        keyword,
        page: pageNum,
        total: apiData.metadata?.total || jobs.length,
        results: jobs
    };
}
