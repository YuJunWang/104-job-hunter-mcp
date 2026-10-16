import { getBrowserPage } from '../browser';
import { z } from 'zod';
import { isLoginUrl } from '../utils/url';

export const SessionArgsSchema = z.object({});

export type SessionArgs = z.infer<typeof SessionArgsSchema>;

export async function checkSession(_args: SessionArgs) {
    const page = await getBrowserPage(false);

    console.error('[Session] Checking login status via 104 member dashboard (headful window)...');

    try {
        await page.goto('https://pda.104.com.tw/my104', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // 104 會經 signin.104.com.tw 做 SSO 跳轉：已登入者會自動被送回 pda，未登入者停在 signin。
        // 等到「落地在會員中心」為止；逾時代表停在登入頁（或網路異常），交給下方判斷。
        await page.waitForURL(
            u => u.hostname === 'pda.104.com.tw' && !isLoginUrl(u.toString()),
            { timeout: 10000 }
        ).catch(() => {});

        const currentUrl = page.url();
        const isLoggedIn = !isLoginUrl(currentUrl) && new URL(currentUrl).hostname === 'pda.104.com.tw';

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
