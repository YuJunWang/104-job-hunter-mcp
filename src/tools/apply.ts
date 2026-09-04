import { getBrowserPage } from '../browser';
import { z } from 'zod';
import * as path from 'path';

export const ApplyArgsSchema = z.object({
    job_url: z.string().url().describe("104 職缺頁面網址"),
    template_title: z.string().optional().describe("選填。指定選用 104 帳號內的推薦信範本名稱（例如 '系統預設'、'自訂推薦信1' 等）。"),
    cover_letter_text: z.string().optional().describe("選填。自傳或給公司的求職信內容。若提供則會填入並覆蓋推薦信文字框。"),
    dry_run: z.boolean().optional().default(false).describe("Dry run 模式：走完所有步驟但不點送出，並截圖回傳。預設為 false。")
});

export type ApplyArgs = z.infer<typeof ApplyArgsSchema>;

export async function prepareApplication(args: ApplyArgs) {
    const { job_url, template_title, cover_letter_text, dry_run = false } = args;
    const page = await getBrowserPage(false);

    console.error(`[Apply] Navigating to ${job_url} (dry_run=${dry_run})`);
    await page.goto(job_url, { waitUntil: 'domcontentloaded' });
    
    try {
        // 等待「應徵」按鈕出現 (104 新版 UI 使用 div 而非 button)
        const applyBtnLocator = page.locator('.apply-button__button, button:has-text("我要應徵"), button:has-text("應徵")').first();
        await applyBtnLocator.waitFor({ state: 'visible', timeout: 8000 });
        await applyBtnLocator.click();

        console.error(`[Apply] Clicked '我要應徵' button.`);
        
        // 等待應徵視窗/分頁出現（104 可能新開分頁或彈出 modal）
        await new Promise(r => setTimeout(r, 2500));

        let selectedTemplate: string | null = null;

        // 若有指定推薦信範本名稱，嘗試在下拉選單中切換
        if (template_title) {
            try {
                selectedTemplate = await page.evaluate(async (targetTitle) => {
                    // 尋找包含推薦信選項的 multiselect
                    const wrappers = Array.from(document.querySelectorAll('.multiselect')) as HTMLElement[];
                    const letterDropdown = wrappers.find(w => 
                        w.textContent?.includes('推薦信') || 
                        w.textContent?.includes('系統預設') ||
                        w.textContent?.includes('自訂')
                    );

                    if (letterDropdown) {
                        // 1. 點擊展開下拉選單
                        letterDropdown.click();
                        await new Promise(r => setTimeout(r, 400));

                        // 2. 尋找目標選項
                        const options = Array.from(letterDropdown.querySelectorAll('.multiselect__option')) as HTMLElement[];
                        const matchOpt = options.find(opt => {
                            const text = opt.textContent?.trim() || '';
                            return text === targetTitle || text.includes(targetTitle);
                        });

                        if (matchOpt) {
                            matchOpt.click();
                            // 觸發 mouseup 與 click 確保 Vue 接收
                            matchOpt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                            matchOpt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                            matchOpt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                            await new Promise(r => setTimeout(r, 400));
                            return matchOpt.textContent?.trim() || targetTitle;
                        } else {
                            // 若沒匹配到，關閉選單
                            letterDropdown.click();
                        }
                    }
                    return null;
                }, template_title);

                if (selectedTemplate) {
                    console.error(`[Apply] Successfully selected template: ${selectedTemplate}`);
                    await new Promise(r => setTimeout(r, 600));
                }
            } catch (e) {
                console.error(`[Apply] Failed to select template '${template_title}':`, (e as Error).message);
            }
        }

        // 嘗試填入自訂求職信（若有提供）
        let coverLetterFilled = false;
        if (cover_letter_text) {
            try {
                coverLetterFilled = await page.evaluate((text) => {
                    // 優先尋找非 chatbot 且可見的 textarea
                    const textareas = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];
                    const target = textareas.find(t => !t.className.includes('chatbot') && (t.offsetParent !== null || t.className.includes('form-control')));
                    if (target) {
                        target.value = text;
                        // 觸發 input 與 change 事件以確保 Vue / React 雙向綁定更新
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                    return false;
                }, cover_letter_text);

                if (coverLetterFilled) {
                    console.error(`[Apply] Filled cover letter text successfully via DOM event dispatch.`);
                } else {
                    console.error(`[Apply] Target textarea not found for cover letter.`);
                }
            } catch (e) {
                console.error(`[Apply] Could not fill cover letter textarea:`, (e as Error).message);
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
            selected_template: selectedTemplate || (template_title ? `未找到 '${template_title}'，維持預設` : '使用 104 預設範本'),
            cover_letter_filled: coverLetterFilled,
            provided_cover_letter: cover_letter_text || "使用範本內文（未覆蓋自訂文字）",
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
