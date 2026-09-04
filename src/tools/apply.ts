import { getBrowserPage } from '../browser';
import { z } from 'zod';
import * as path from 'path';
import { extractJobId } from '../utils/url';

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

    const jobId = extractJobId(job_url);
    let apiIsApplied: boolean | null = null;

    // 第一重防護（API層）：監聽 104 後端 /api/jobs/{jobId} API，取得系統層最真實的 isApplied 旗標
    const apiHandler = async (response: any) => {
        if (jobId && response.url().match(new RegExp(`/api/jobs/${jobId}$`))) {
            page.off('response', apiHandler);
            try {
                const json = await response.json();
                if (typeof json?.data?.header?.isApplied === 'boolean') {
                    apiIsApplied = json.data.header.isApplied;
                    console.error(`[Apply] Intercepted 104 Job Detail API: isApplied = ${apiIsApplied}`);
                }
            } catch {}
        }
    };
    page.on('response', apiHandler);

    console.error(`[Apply] Navigating to ${job_url} (dry_run=${dry_run})`);
    await page.goto(job_url, { waitUntil: 'domcontentloaded' });
    
    // 短暫等待讓非同步 API 回應或 DOM 初次渲染完成
    await page.waitForTimeout(1000);
    page.off('response', apiHandler);
    
    try {
        // 第一重防護檢查：後端 API 回傳已應徵
        if (apiIsApplied === true) {
            console.error(`[Apply] Confirmed already applied via 104 API response.`);
            return {
                status: "already_applied",
                message: "您先前已應徵過此職缺（由 104 後端紀錄確認），無需重複應徵。"
            };
        }

        // 第二重防護（DOM層）：多維度指標比對（包含各種 tag、class、文字變體）
        const appliedLocator = page.locator(`
            button:has-text("已應徵"),
            button:has-text("已投遞"),
            a:has-text("已應徵"),
            span:has-text("已應徵"),
            div:has-text("已應徵"),
            .apply-button__button:has-text("已應徵"),
            [class*="applied"]
        `).first();
        const domAlreadyApplied = await appliedLocator.isVisible().catch(() => false);
        if (domAlreadyApplied) {
            console.error(`[Apply] Confirmed already applied via DOM indicator.`);
            return {
                status: "already_applied",
                message: "您先前已應徵過此職缺，無需重複應徵。"
            };
        }

        // 等待「我要應徵」按鈕出現並點擊 (104 新版 UI 可能使用 div、button 或 a)
        const applyBtnLocator = page.locator('.apply-button__button, button:has-text("我要應徵"), button:has-text("應徵")').first();
        try {
            await applyBtnLocator.waitFor({ state: 'visible', timeout: 8000 });
        } catch (waitErr) {
            // 第三重防護（語意診斷）：若按鈕超時未出現，再次檢查頁面狀態
            const bodyText = await page.textContent('body').catch(() => "") || "";
            if (bodyText.includes("已應徵") || bodyText.includes("已投遞")) {
                return {
                    status: "already_applied",
                    message: "您先前已應徵過此職缺，無需重複應徵。"
                };
            }
            if (bodyText.includes("職缺已結束") || bodyText.includes("停止招募") || bodyText.includes("職缺已下架")) {
                return {
                    status: "job_closed",
                    message: "此職缺目前已結束招募或已下架。"
                };
            }
            throw waitErr;
        }

        await applyBtnLocator.click();
        console.error(`[Apply] Clicked '我要應徵' button.`);
        
        // 等待應徵視窗跳出
        await new Promise(r => setTimeout(r, 2500));

        let selectedTemplate: string | null = null;

        // 若有指定推薦信範本名稱，透過 Playwright 原生點擊切換
        if (template_title) {
            try {
                const letterDropdown = page.locator('.multiselect').filter({ hasText: /推薦信|系統預設|自訂/ }).first();
                if (await letterDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await letterDropdown.click();
                    await new Promise(r => setTimeout(r, 600));

                    const targetOption = page.locator('.multiselect__option').filter({ hasText: template_title }).first();
                    if (await targetOption.isVisible({ timeout: 3000 }).catch(() => false)) {
                        selectedTemplate = (await targetOption.textContent())?.trim() || template_title;
                        await targetOption.click();
                        console.error(`[Apply] Successfully selected template: ${selectedTemplate}`);
                        // 等待 104 前端非同步填入該範本內容
                        await new Promise(r => setTimeout(r, 1200));
                    } else {
                        console.error(`[Apply] Option '${template_title}' not found in dropdown.`);
                        await letterDropdown.click().catch(() => {});
                    }
                }
            } catch (e) {
                console.error(`[Apply] Failed to select template '${template_title}':`, (e as Error).message);
            }
        }

        // 填入自訂推薦信內容（若有提供）
        let coverLetterFilled = false;
        if (cover_letter_text) {
            try {
                // 定位非 chatbot 的推薦信輸入框
                const textareaLocator = page.locator('textarea.form-control, textarea:not([class*="chatbot"])').first();
                await textareaLocator.waitFor({ state: 'visible', timeout: 5000 });
                await textareaLocator.click();
                // 使用 Playwright 原生 fill，會自動觸發完整的鍵盤與 Vue v-model 雙向綁定事件
                await textareaLocator.fill(cover_letter_text);
                await textareaLocator.dispatchEvent('input').catch(() => {});
                await textareaLocator.dispatchEvent('change').catch(() => {});

                // 驗證是否成功填入
                const currentVal = await textareaLocator.inputValue().catch(() => "");
                if (currentVal.length > 0) {
                    coverLetterFilled = true;
                    console.error(`[Apply] Filled cover letter text successfully (${currentVal.length} chars).`);
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
            const screenshotDir = path.join(process.cwd(), '.screenshots');
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
