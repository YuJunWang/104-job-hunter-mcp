import { getBrowserPage } from '../browser';
import { z } from 'zod';

export const SessionArgsSchema = z.object({});

export type SessionArgs = z.infer<typeof SessionArgsSchema>;

export async function checkSession(_args: SessionArgs) {
    const page = await getBrowserPage();

    console.error('[Session] Checking login status via 104 member dashboard...');

    try {
        await page.goto('https://my.104.com.tw/', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // 等待網頁導向穩定（104 有時會有多次 redirect）
        await page.waitForTimeout(2000);

        const currentUrl = page.url();
        const isLoggedIn = !currentUrl.includes('login.104.com.tw') &&
                           !currentUrl.includes('pda.104.com.tw/login');

        console.error(`[Session] Current URL after navigation: ${currentUrl}`);
        console.error(`[Session] Logged in: ${isLoggedIn}`);

        if (isLoggedIn) {
            return {
                logged_in: true,
                message: '✅ 登入狀態正常，Cookie 有效，可以開始找工作！',
                current_url: currentUrl
            };
        } else {
            return {
                logged_in: false,
                message: '❌ 目前尚未登入，或 Cookie 已失效。請在專案目錄下執行 `npx tsx src/login.ts` 重新登入 104。',
                current_url: currentUrl
            };
        }
    } catch (error) {
        return {
            logged_in: false,
            message: `無法判斷登入狀態，瀏覽器操作失敗：${(error as Error).message}`,
            current_url: null
        };
    }
}
