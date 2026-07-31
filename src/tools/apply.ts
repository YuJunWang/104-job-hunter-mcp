import { getBrowserPage } from '../browser';
import { z } from 'zod';

export const ApplyArgsSchema = z.object({
    job_url: z.string().url().describe("104 職缺頁面網址"),
    cover_letter_text: z.string().optional().describe("自傳或給公司的求職信內容")
});

export type ApplyArgs = z.infer<typeof ApplyArgsSchema>;

export async function prepareApplication(args: ApplyArgs) {
    const page = await getBrowserPage();
    const { job_url, cover_letter_text } = args;

    console.error(`[Apply] Navigating to ${job_url}`);
    await page.goto(job_url, { waitUntil: 'domcontentloaded' });
    
    try {
        // 尋找「我要應徵」按鈕，可能有多種 class 或 text
        const applyBtnLocator = page.locator('button', { hasText: '我要應徵' }).first();
        
        await applyBtnLocator.waitFor({ state: 'visible', timeout: 5000 });
        await applyBtnLocator.click();

        console.error(`[Apply] Clicked '我要應徵' button.`);
        
        // 104 可能會彈出對話框或新開分頁。為了 Hit-in-the-loop 安全，
        // 我們在此提供指示並填入 cover_letter（如果有的話且找得到對應的 textarea）
        
        if (cover_letter_text) {
            try {
                // 嘗試尋找自我推薦信的 textarea (這個 Selector 可能需要根據 104 實際 DOM 調整)
                const textareaLocator = page.locator('textarea[name="message"], textarea[placeholder*="推薦"], textarea').last();
                await textareaLocator.waitFor({ state: 'visible', timeout: 3000 });
                await textareaLocator.fill(cover_letter_text);
                console.error(`[Apply] Filled cover letter text.`);
            } catch (e) {
                console.error(`[Apply] Could not find cover letter textarea automatically. You may need to paste it manually.`);
            }
        }

        return { 
            status: "success", 
            message: "【Hit-in-the-loop】已成功點擊應徵按鈕並開啟投遞視窗。基於安全邊界，Agent 不會自動送出，請人類確認畫面後親自點擊最終送出按鈕！",
            provided_cover_letter: cover_letter_text || "未提供"
        };
        
    } catch (e) {
        console.error(e);
        return { 
            status: "error", 
            error: "無法點擊我要應徵按鈕。請確認是否已經應徵過，或者網頁結構有變動。" 
        };
    }
}
