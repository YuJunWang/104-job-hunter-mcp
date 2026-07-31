import { getBrowserPage } from '../browser';
import { z } from 'zod';
import * as path from 'path';

export const ApplyArgsSchema = z.object({
    job_url: z.string().url().describe("104 職缺頁面網址"),
    cover_letter_text: z.string().optional().describe("自傳或給公司的求職信內容"),
    dry_run: z.boolean().optional().default(false).describe("Dry run 模式：走完所有步驟但不點送出，並截圖回傳。預設為 false。")
});

export type ApplyArgs = z.infer<typeof ApplyArgsSchema>;

export async function prepareApplication(args: ApplyArgs) {
    const page = await getBrowserPage();
    const { job_url, cover_letter_text, dry_run } = args;

    console.error(`[Apply] Navigating to ${job_url} (dry_run=${dry_run})`);
    await page.goto(job_url, { waitUntil: 'domcontentloaded' });
    
    try {
        // 等待「我要應徵」按鈕出現
        const applyBtnLocator = page.locator('button', { hasText: '我要應徵' }).first();
        await applyBtnLocator.waitFor({ state: 'visible', timeout: 8000 });
        await applyBtnLocator.click();

        console.error(`[Apply] Clicked '我要應徵' button.`);
        
        // 等待應徵視窗/分頁出現（104 可能新開分頁或彈出 modal）
        await new Promise(r => setTimeout(r, 2000));

        // 嘗試填入求職信
        let coverLetterFilled = false;
        if (cover_letter_text) {
            try {
                const textareaLocator = page.locator(
                    'textarea[name="message"], textarea[placeholder*="推薦"], textarea[placeholder*="自薦"], textarea'
                ).last();
                await textareaLocator.waitFor({ state: 'visible', timeout: 5000 });
                await textareaLocator.fill(cover_letter_text);
                coverLetterFilled = true;
                console.error(`[Apply] Filled cover letter text.`);
            } catch (e) {
                console.error(`[Apply] Could not find cover letter textarea. May need manual paste.`);
            }
        }

        // --- Hit-in-the-loop 安全邊界 ---
        // 無論如何，絕對不點擊最終送出按鈕
        // dry_run 模式：截圖後直接回傳，不做任何額外操作
        let screenshotPath: string | undefined;
        if (dry_run) {
            const screenshotDir = path.join(__dirname, '..', '..', '.screenshots');
            const timestamp = Date.now();
            screenshotPath = path.join(screenshotDir, `apply_dry_run_${timestamp}.png`);
            
            // 建立截圖目錄（若不存在）
            const fs = await import('fs');
            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true });
            }
            
            await page.screenshot({ path: screenshotPath, fullPage: false });
            console.error(`[Apply] [DRY RUN] Screenshot saved to ${screenshotPath}`);
        }

        return { 
            status: "ready",
            dry_run,
            message: dry_run
                ? `【DRY RUN 完成】已模擬完整應徵流程，截圖已儲存。此模式下不會送出任何應徵。`
                : `【Hit-in-the-loop】已點擊應徵按鈕並開啟投遞視窗。基於安全邊界，Agent 不會自動送出，請人類確認畫面後親自點擊最終送出按鈕！`,
            cover_letter_filled: coverLetterFilled,
            provided_cover_letter: cover_letter_text || "未提供",
            screenshot_path: screenshotPath || null,
        };
        
    } catch (e) {
        console.error(e);
        return { 
            status: "error", 
            error: `無法點擊「我要應徵」按鈕。可能原因：1) 已經應徵過此職缺 2) 需要先登入 3) 頁面結構已更新。錯誤：${(e as Error).message}` 
        };
    }
}
