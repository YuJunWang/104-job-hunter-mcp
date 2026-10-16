import { getBrowserPage, closeBrowser } from './browser';
import { isLoginUrl } from './utils/url';

async function main() {
    console.log("正在開啟瀏覽器...");
    const page = await getBrowserPage();

    console.log("正在前往 104 登入頁面...");
    await page.goto('https://pda.104.com.tw/login/index', { waitUntil: 'domcontentloaded' });

    console.log("請在彈出的視窗中完成登入（最多等待 120 秒）...");
    console.log("偵測到登入成功後，程式會自動關閉。");

    const MAX_WAIT_SECONDS = 120;
    const POLL_INTERVAL_MS = 1500;
    const maxAttempts = Math.floor((MAX_WAIT_SECONDS * 1000) / POLL_INTERVAL_MS);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

        try {
            const currentUrl = page.url();

            // 成功條件：已離開登入頁，且回到 104 網域。
            // 只判斷「不是登入頁」不夠：Google/Apple 等第三方登入頁也「不是登入頁」。
            const backOn104 = /(^|\.)104\.com\.tw$/i.test(new URL(currentUrl).hostname);

            if (backOn104 && !isLoginUrl(currentUrl)) {
                console.log(`\n✅ 偵測到登入成功！`);
                console.log(`目前頁面：${currentUrl}`);
                console.log("正在儲存 Cookie 並關閉瀏覽器...");
                await closeBrowser();
                console.log("完成！Cookie 已儲存至 .chrome-profile/，之後使用不需重新登入。");
                process.exit(0);
            }

            // 每 30 秒提示一次還在等待
            const elapsed = Math.floor((attempt * POLL_INTERVAL_MS) / 1000);
            if (elapsed > 0 && elapsed % 30 === 0) {
                console.log(`等待中... 已過 ${elapsed} 秒，尚未偵測到登入`);
            }
        } catch (e) {
            // 頁面可能在跳轉中，忽略瞬間錯誤
            console.error("[Login] 偵測時發生暫時性錯誤，繼續等待...", (e as Error).message);
        }
    }

    // 超過最大等待時間
    console.log(`\n⏰ 等待超過 ${MAX_WAIT_SECONDS} 秒，尚未偵測到登入成功。`);
    console.log("若您已登入但程式未偵測到，Cookie 可能已自動儲存。可以嘗試正常使用。");
    await closeBrowser();
    process.exit(1);
}

main().catch(async (e) => {
    console.error(e);
    await closeBrowser();
    process.exit(1);
});
