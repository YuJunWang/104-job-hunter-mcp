import { getBrowserPage } from '../browser';
import { z } from 'zod';

export const SearchArgsSchema = z.object({
    keyword: z.string().describe("職缺關鍵字，例如 '前端工程師' 或 'Node.js'"),
    location: z.string().optional().describe("工作地點關鍵字，例如 '台北市'（非必要）"),
    page: z.number().optional().default(1).describe("頁數，預設為 1")
});

export type SearchArgs = z.infer<typeof SearchArgsSchema>;

export async function searchJobs(args: SearchArgs) {
    const page = await getBrowserPage();
    const { keyword, page: pageNum } = args;
    
    // 建立 104 搜尋網址
    const url = new URL('https://www.104.com.tw/jobs/search/');
    url.searchParams.set('ro', '0');
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('expansionType', 'area,spec,com,job,wf,wktm');
    url.searchParams.set('order', '1');
    url.searchParams.set('asc', '0');
    url.searchParams.set('page', pageNum.toString());
    url.searchParams.set('mode', 's');
    url.searchParams.set('jobsource', '2018indexpoc');

    console.error(`[Search] Navigating to ${url.toString()}`);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    
    // 等待列表出現
    try {
        await page.waitForSelector('#js-job-content', { timeout: 10000 });
    } catch (e) {
        return { error: "無法載入職缺列表，可能沒有搜尋結果，或是遇到防爬蟲機制阻擋。" };
    }

    // 擷取職缺資訊
    const jobs = await page.evaluate(() => {
        const items = document.querySelectorAll('article.job-list-item');
        const results: any[] = [];
        
        items.forEach(item => {
            const titleElem = item.querySelector('.b-tit a');
            const companyElem = item.querySelector('.b-list-inline.b-clearfix li a');
            const salaryElem = item.querySelector('.b-tag--default');
            const descElem = item.querySelector('.job-list-item__info');
            
            if (titleElem) {
                const title = titleElem.textContent?.trim() || '';
                let link = titleElem.getAttribute('href') || '';
                if (link.startsWith('//')) {
                    link = 'https:' + link;
                }
                const company = companyElem ? companyElem.textContent?.trim() : '';
                const salary = salaryElem ? salaryElem.textContent?.trim() : '';
                const description = descElem ? descElem.textContent?.trim() : '';

                results.push({
                    title,
                    company,
                    salary,
                    description,
                    link
                });
            }
        });
        
        return results;
    });

    return {
        keyword,
        page: pageNum,
        results: jobs
    };
}
