import { getBrowserPage } from '../browser';
import { z } from 'zod';
import { checkSession } from './session';

export const LettersArgsSchema = z.object({
    job_url: z.string().url().optional().describe("選填。可指定任一 104 職缺頁面以開啟應徵視窗讀取範本，若不填則預設使用常用職缺頁面。")
});

export type LettersArgs = z.infer<typeof LettersArgsSchema>;

export interface CoverLetterTemplate {
    title: string;
    content: string;
    isDefault: boolean;
}

/**
 * 取得使用者 104 帳號中儲存的所有自我推薦信範本（包含標題與完整內容）
 */
export async function getCoverLetters(args: LettersArgs = {}) {
    const sessionStatus = await checkSession({});
    if (!sessionStatus.logged_in) {
        return {
            error: "尚未登入 104 帳號，請先執行 `npx tsx src/login.ts` 登入後再讀取推薦信範本。"
        };
    }

    const page = await getBrowserPage(false);
    // 預設一個公開職缺作為開啟應徵 Modal 的媒介
    const targetJobUrl = args.job_url || 'https://www.104.com.tw/job/94nxm';

    console.error(`[Letters] Navigating to job page: ${targetJobUrl} to access cover letters...`);

    try {
        await page.goto(targetJobUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2000);

        // 點擊「我要應徵」按鈕開啟 Modal
        const applyBtnLocator = page.locator('.apply-button__button, button:has-text("我要應徵"), button:has-text("應徵")').first();
        await applyBtnLocator.waitFor({ state: 'visible', timeout: 8000 });
        await applyBtnLocator.click();

        // 等待應徵彈窗完全載入
        await page.waitForTimeout(2500);

        const templates = await page.evaluate(async () => {
            const list: CoverLetterTemplate[] = [];
            const textarea = document.querySelector('textarea.form-control, textarea') as HTMLTextAreaElement;

            // 尋找包含推薦信選項的 multiselect 元件
            const optionElements = Array.from(document.querySelectorAll('.multiselect__option'));
            const letterOption = optionElements.find(el => {
                const text = el.textContent?.trim() || '';
                return text.includes('推薦信') || text.includes('系統預設');
            });

            if (letterOption) {
                const multiselectWrapper = letterOption.closest('.multiselect') || letterOption.closest('[class*="select"]');
                if (multiselectWrapper) {
                    // 取得該選單下的所有選項
                    const options = Array.from(multiselectWrapper.querySelectorAll('.multiselect__option')) as HTMLElement[];
                    
                    for (let i = 0; i < options.length; i++) {
                        const opt = options[i];
                        const title = opt.textContent?.trim() || `範本 ${i + 1}`;
                        
                        // 點擊切換
                        opt.click();
                        await new Promise(r => setTimeout(r, 400));

                        const currentVal = textarea ? textarea.value : '';
                        list.push({
                            title,
                            content: currentVal,
                            isDefault: i === 0 || title.includes('預設')
                        });
                    }
                }
            }

            // 如果找不到特定 dropdown，至少回傳當前 textarea 中的預設內容
            if (list.length === 0 && textarea && textarea.value) {
                list.push({
                    title: '系統預設推薦信',
                    content: textarea.value,
                    isDefault: true
                });
            }

            return list;
        });

        // 關閉或重新整理當前頁面以復原狀態
        await page.evaluate(() => {
            // 點擊關閉 modal 按鈕（若有）
            const closeBtn = document.querySelector('.modal-close, [class*="close"], .btn-close') as HTMLElement;
            if (closeBtn) closeBtn.click();
        });

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
