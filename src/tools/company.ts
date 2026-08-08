import { z } from 'zod';
import { getBrowserPage } from '../browser';
import { extractCompanyId } from '../utils/url';

export const SearchCompanyArgsSchema = z.object({
    keyword: z.string().describe("公司名稱關鍵字，例如 '台積電' 或 'Google'"),
    page: z.number().optional().default(1).describe("頁數，預設為 1"),
    pageSize: z.number().optional().default(10).describe("每頁顯示數量，預設為 10")
});

export type SearchCompanyArgs = z.infer<typeof SearchCompanyArgsSchema>;

export async function searchCompanies(args: SearchCompanyArgs) {
    const page = await getBrowserPage();
    const query = new URLSearchParams({
        keyword: args.keyword,
        page: args.page.toString(),
        pageSize: args.pageSize.toString(),
    });

    const url = `https://www.104.com.tw/company/ajax/list?${query}`;
    
    console.error(`[Search Company] Navigating API: ${url}`);
    
    const response = await page.request.get(url, {
        headers: {
            'Referer': 'https://www.104.com.tw/company/search/'
        }
    });

    if (!response.ok()) {
        throw new Error(`查詢公司失敗，狀態碼: ${response.status()}`);
    }

    const result = await response.json();
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
    companyInput: z.string().describe("公司代碼或是公司網址。例如 '1a2x6bmutz' 或 'https://www.104.com.tw/company/1a2x6bmutz'")
});

export type CompanyDetailArgs = z.infer<typeof CompanyDetailArgsSchema>;

export async function getCompanyDetail(args: CompanyDetailArgs) {
    const companyCode = extractCompanyId(args.companyInput);
    if (!companyCode) {
        throw new Error("無法解析公司代碼，請確認輸入是否為正確的 104 公司網址或代碼。");
    }

    const page = await getBrowserPage();
    const referer = `https://www.104.com.tw/company/${companyCode}`;
    const detailUrl = `https://www.104.com.tw/api/companies/${companyCode}/content`;

    console.error(`[Company Detail] Fetching info for: ${companyCode}`);
    
    const detailResponse = await page.request.get(detailUrl, {
        headers: { 'Referer': referer }
    });

    if (!detailResponse.ok()) {
        throw new Error(`無法取得公司資料，可能是代碼錯誤。狀態碼: ${detailResponse.status()}`);
    }

    const detailResult = await detailResponse.json();
    const d = detailResult.data;

    // 預設一併抓取職缺
    const jobsUrl = `https://www.104.com.tw/api/companies/${companyCode}/jobs?page=1&pageSize=30`;
    let openJobs: any[] = [];
    
    try {
        const jobsResponse = await page.request.get(jobsUrl, {
            headers: { 'Referer': referer }
        });
        if (jobsResponse.ok()) {
            const jobsResult = await jobsResponse.json();
            const topJobs = jobsResult.data?.list?.topJobs || [];
            const normalJobs = jobsResult.data?.list?.normalJobs || [];
            openJobs = [...topJobs, ...normalJobs].map(job => ({
                jobCode: job.encodedJobNo,
                title: job.jobName,
                salary: job.jobSalaryDesc || '面議',
                location: job.jobAddrNoDesc || '',
                url: `https://www.104.com.tw/job/${job.encodedJobNo}`
            }));
        }
    } catch (e) {
        console.error("[Company Detail] Failed to fetch jobs list", e);
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
        openJobsCount: openJobs.length,
        openJobsList: openJobs,
        url: referer
    };
}
