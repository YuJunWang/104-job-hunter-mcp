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
export type SearchInput = z.input<typeof SearchArgsSchema>;

export function buildSearchUrl(args: SearchInput, areaCodes?: string | null): string {
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
