import { getBrowserPage } from '../browser';
import { z } from 'zod';

export const DetailsArgsSchema = z.object({
    job_url: z.string().url().describe("104 職缺頁面網址")
});

export type DetailsArgs = z.infer<typeof DetailsArgsSchema>;

export async function getJobDetails(args: DetailsArgs) {
    const page = await getBrowserPage();
    const { job_url } = args;

    console.error(`[Details] Navigating to ${job_url}`);
    await page.goto(job_url, { waitUntil: 'domcontentloaded' });
    
    // 等待主要內容載入
    try {
        await page.waitForSelector('main, .job-description', { timeout: 10000 });
    } catch (e) {
        return { error: "無法載入職缺詳情，網址可能無效或遇到防爬蟲機制。" };
    }

    const details = await page.evaluate(() => {
        const title = document.querySelector('h1')?.textContent?.trim() || '';
        const company = document.querySelector('.btn-link.t3.mb-0')?.textContent?.trim() || '';
        
        // 職缺內容
        const descElem = document.querySelector('.job-description');
        const description = descElem ? descElem.textContent?.trim() : '';
        
        // 條件要求
        const reqElem = document.querySelector('.job-requirement');
        const requirements = reqElem ? reqElem.textContent?.trim() : '';

        // 公司福利
        const benefitElem = document.querySelector('.benefits-description');
        const benefits = benefitElem ? benefitElem.textContent?.trim() : '';

        return {
            title,
            company,
            description,
            requirements,
            benefits
        };
    });

    return details;
}
