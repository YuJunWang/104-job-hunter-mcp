import { z } from 'zod';
import { getBrowserPage } from '../browser';
import { extractJobId, extractCompanyId } from '../utils/url';
import { checkSession } from './session';

export const SaveJobArgsSchema = z.object({
    jobInput: z.string().describe("職缺代碼或是職缺網址。例如 '796uv' 或 'https://www.104.com.tw/job/796uv'")
});

export type SaveJobArgs = z.infer<typeof SaveJobArgsSchema>;

export async function saveJob(args: SaveJobArgs) {
    const jobCode = extractJobId(args.jobInput);
    if (!jobCode) {
        throw new Error("無法解析職缺代碼，請確認輸入是否為正確的 104 職缺網址或代碼。");
    }

    // 先確認是否有登入
    const sessionStatus = await checkSession({});
    if (!sessionStatus.logged_in) {
        throw new Error("尚未登入 104 帳號，請先執行登入流程才能使用收藏功能。");
    }

    const page = await getBrowserPage();
    const url = `https://www.104.com.tw/job/ajax/save/${jobCode}`;
    const referer = `https://www.104.com.tw/job/${jobCode}`;

    console.error(`[Save Job] POST to: ${url}`);

    const response = await page.request.post(url, {
        headers: { 'Referer': referer }
    });

    if (!response.ok()) {
        const text = await response.text().catch(() => "");
        throw new Error(`收藏職缺失敗，狀態碼: ${response.status()} - ${text.slice(0, 100)}`);
    }

    return {
        jobCode,
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

    // 先確認是否有登入
    const sessionStatus = await checkSession({});
    if (!sessionStatus.logged_in) {
        throw new Error("尚未登入 104 帳號，請先執行登入流程才能使用追蹤功能。");
    }

    const page = await getBrowserPage();
    const url = `https://www.104.com.tw/api/companies/${companyCode}/follow`;
    const referer = `https://www.104.com.tw/company/${companyCode}`;

    console.error(`[Save Company] POST to: ${url}`);

    const response = await page.request.post(url, {
        headers: { 'Referer': referer }
    });

    if (!response.ok()) {
        const text = await response.text().catch(() => "");
        throw new Error(`追蹤公司失敗，狀態碼: ${response.status()} - ${text.slice(0, 100)}`);
    }

    return {
        companyCode,
        status: 'success',
        message: `已成功將公司 ${companyCode} 加入追蹤。`
    };
}
