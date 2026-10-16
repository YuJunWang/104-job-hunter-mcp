import { z } from 'zod';
import { fetchIn104 } from '../browser';
import { extractJobId, extractCompanyId } from '../utils/url';

export const SaveJobArgsSchema = z.object({
    jobInput: z.string().describe("職缺代碼或是職缺網址。例如 '796uv' 或 'https://www.104.com.tw/job/796uv'")
});

export type SaveJobArgs = z.infer<typeof SaveJobArgsSchema>;

export async function saveJob(args: SaveJobArgs) {
    const jobCode = extractJobId(args.jobInput);
    if (!jobCode) {
        throw new Error("無法解析職缺代碼，請確認輸入是否為正確的 104 職缺網址或代碼。");
    }

    console.error(`[Save Job] Resolving company for job: ${jobCode}`);

    // 先取得職缺詳情 API，以解析其所屬公司代碼及當前收藏狀態
    const jobInfoRes = await fetchIn104(`https://www.104.com.tw/api/jobs/${jobCode}`, {
        referrer: `https://www.104.com.tw/job/${jobCode}`
    });

    if (jobInfoRes.status === 401 || jobInfoRes.status === 403) {
        throw new Error("尚未登入 104 帳號，請先執行 `npx tsx src/login.ts` 登入後才能使用收藏功能。");
    }

    if (!jobInfoRes.ok || !jobInfoRes.json?.data) {
        throw new Error(`無法取得職缺資料，可能是代碼錯誤。狀態碼: ${jobInfoRes.status}`);
    }

    const header = jobInfoRes.json.data.header || {};
    if (header.isSaved === true) {
        return {
            jobCode,
            status: 'success',
            message: `此職缺 ${jobCode} 先前已在您的收藏名單中。`
        };
    }

    const custUrl = header.custUrl || '';
    const companyCode = extractCompanyId(custUrl);
    if (!companyCode) {
        throw new Error(`無法從職缺資訊中解析所屬公司代碼 (custUrl: ${custUrl})。`);
    }

    console.error(`[Save Job] Saving job ${jobCode} under company ${companyCode}...`);
    const saveUrl = `https://www.104.com.tw/api/companies/${companyCode}/jobs/${jobCode}/save`;
    const saveRes = await fetchIn104(saveUrl, {
        method: 'POST',
        referrer: `https://www.104.com.tw/job/${jobCode}`
    });

    if (saveRes.status === 401 || saveRes.status === 403) {
        throw new Error("尚未登入 104 帳號，請先執行 `npx tsx src/login.ts` 登入後才能使用收藏功能。");
    }

    if (!saveRes.ok && saveRes.status !== 201 && saveRes.status !== 204) {
        throw new Error(`收藏職缺失敗，狀態碼: ${saveRes.status} - ${saveRes.text.slice(0, 100)}`);
    }

    return {
        jobCode,
        companyCode,
        status: 'success',
        message: `已成功將職缺 ${jobCode} 加入收藏。`
    };
}


export const SaveCompanyArgsSchema = z.object({
    companyInput: z.string().describe("公司代碼或是公司網址。例如 '1a2x6bmutz' 或 'https://www.104.com.tw/company/1a2x6bmutz'")
});

export type SaveCompanyArgs = z.infer<typeof SaveCompanyArgsSchema>;

export async function saveCompany(args: SaveCompanyArgs) {
    const companyCode = extractCompanyId(args.companyInput);
    if (!companyCode) {
        throw new Error("無法解析公司代碼，請確認輸入是否為正確的 104 公司網址或代碼。");
    }

    console.error(`[Save Company] Following company: ${companyCode}`);
    const followUrl = `https://www.104.com.tw/api/companies/${companyCode}/follow`;
    const referer = `https://www.104.com.tw/company/${companyCode}`;

    const response = await fetchIn104(followUrl, {
        method: 'POST',
        referrer: referer,
        body: {
            tracked: 1,
            newsNotify: 0,
            duplexFollowed: 0
        }
    });

    if (response.status === 401 || response.status === 403) {
        throw new Error("尚未登入 104 帳號，請先執行 `npx tsx src/login.ts` 登入後才能使用追蹤功能。");
    }

    // 409 代表已追蹤過
    if (response.status === 409) {
        return {
            companyCode,
            status: 'success',
            message: `此公司 ${companyCode} 先前已在您的追蹤名單中。`
        };
    }

    if (!response.ok && response.status !== 201 && response.status !== 204) {
        throw new Error(`追蹤公司失敗，狀態碼: ${response.status} - ${response.text.slice(0, 100)}`);
    }

    return {
        companyCode,
        status: 'success',
        message: `已成功將公司 ${companyCode} 加入追蹤。`
    };
}
