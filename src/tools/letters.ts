import { getBrowserPage } from '../browser';
import { z } from 'zod';
import { checkSession } from './session';

export const LettersArgsSchema = z.object({
    job_url: z.string().url().describe("必填。任一有效的 104 職缺頁面網址（用於開啟應徵視窗以讀取推薦信範本）。請提供確定存在的職缺連結，例如您目前想應徵的任一職缺 URL。")
});

export type LettersArgs = z.infer<typeof LettersArgsSchema>;

export interface CoverLetterTemplate {
    title: string;
    content: string;
    isDefault: boolean;
}

/**
 * 取得使用者 104 帳號中儲存的所有自我推薦信範本（包含標題與完整內容）
 *
 * 使用 Playwright 原生 locator 操作，確保 Vue v-model 事件序列被正確觸發。
 * job_url 為必填，因為需要透過真實職缺的應徵視窗讀取推薦信選單。
 */
export async function getCoverLetters(args: LettersArgs) {
    const sessionStatus = await checkSession({});
    if (!sessionStatus.logged_in) {
        return {
            error: "尚未登入 104 帳號，請先執行 `npx tsx src/login.ts` 登入後再讀取推薦信範本。"
        };
    }

    // ⚠️ 必須由 caller 提供有效職缺 URL，避免硬編碼 URL 失效問題
    const page = await getBrowserPage(false);
    const targetJobUrl = args.job_url;

    console.error(`[Letters] Navigating to job page: ${targetJobUrl} to access cover letters...`);

    try {
        await page.goto(targetJobUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2000);

        // 點擊「我要應徵」按鈕開啟 Modal（與 apply.ts 相同的選擇器）
        const applyBtnLocator = page.locator('.apply-button__button, button:has-text("我要應徵"), button:has-text("應徵")').first();
        await applyBtnLocator.waitFor({ state: 'visible', timeout: 8000 });
        await applyBtnLocator.click();

        // 等待應徵彈窗完全載入
        await page.waitForTimeout(2500);

        const templates: CoverLetterTemplate[] = [];

        // 定位「自我推薦信」下拉選單容器
        const letterDropdown = page.locator('.apply-msg .form-control, .apply-msg .text-region').first();
        const hasDropdown = await letterDropdown.isVisible({ timeout: 5000 }).catch(() => false);

        // 精確定位應徵彈窗中可見的推薦信輸入框
        const textareaLocator = page.locator('.apply-popup textarea, .apply-msg textarea, textarea.form-control:visible').first();

        if (hasDropdown) {
            // 先展開下拉選單以取得所有選項
            await letterDropdown.click();
            await page.waitForTimeout(600);

            const optionLocators = page.locator('.apply-msg .multiselect__option');
            const optionCount = await optionLocators.count();
            console.error(`[Letters] Found ${optionCount} template options.`);

            for (let i = 0; i < optionCount; i++) {
                const opt = optionLocators.nth(i);
                const title = (await opt.textContent())?.trim() || `範本 ${i + 1}`;

                // 若下拉選單已關閉（點選後自動收起），需重新展開
                const isDropdownOpen = await page.locator('.apply-msg .multiselect__content').isVisible().catch(() => false);
                if (!isDropdownOpen) {
                    await letterDropdown.click();
                    await page.waitForTimeout(400);
                }

                // Playwright 原生 click，觸發 Vue 響應式事件序列（keydown/input/change）
                await opt.click();
                // 等待 104 前端非同步更新 textarea 內容
                await page.waitForTimeout(1000);

                const content = await textareaLocator.inputValue().catch(() => '');
                templates.push({
                    title,
                    content,
                    isDefault: i === 0 || title.includes('預設')
                });

                console.error(`[Letters] Read template "${title}" (${content.length} chars)`);
            }
        } else {
            // 找不到下拉選單，至少回傳當前 textarea 內容作為預設
            console.error('[Letters] Multiselect not found, falling back to textarea value.');
            const content = await textareaLocator.inputValue().catch(() => '');
            if (content) {
                templates.push({ title: '系統預設推薦信', content, isDefault: true });
            }
        }

        // R4：用 Escape 鍵關閉 Modal，比 DOM evaluate click 更可靠
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        return {
            status: 'success',
            total_templates: templates.length,
            templates: templates
        };

    } catch (error) {
        console.error("[Letters] Error fetching cover letters:", error);
        return {
            error: `無法讀取推薦信範本：${(error as Error).message}`
        };
    }
}
