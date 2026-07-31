import { chromium, BrowserContext, Page } from 'playwright';

import * as path from 'path';

let context: BrowserContext | null = null;
let page: Page | null = null;

// 使用專案本地的暫存 Profile，避免直接掛載使用者預設 Profile 觸發 Chrome 的安全阻擋
const USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR || path.join(__dirname, '..', '.chrome-profile');

export async function getBrowserPage(): Promise<Page> {
    if (page && context) {
        return page;
    }

    try {
        console.error(`[Browser] Launching with userDataDir: ${USER_DATA_DIR}`);
        context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false, // 為了讓 Hit-in-the-loop 與驗證可以觀察，設為 false
            channel: 'chrome', // 強制使用安裝的 Chrome
            args: [
                '--disable-blink-features=AutomationControlled',
                '--start-maximized'
            ],
            viewport: null, // 不要限制視窗大小
        });

        // 取得預設開啟的頁面
        const pages = context.pages();
        if (pages.length > 0) {
            page = pages[0];
        } else {
            page = await context.newPage();
        }
        
        return page;
    } catch (error) {
        console.error("[Browser] Failed to launch browser context. 啟動失敗，請確認是否所有該 Profile 的 Chrome 視窗都已經關閉。");
        throw error;
    }
}

export async function closeBrowser(): Promise<void> {
    if (context) {
        await context.close();
        context = null;
        page = null;
    }
}
