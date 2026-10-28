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
