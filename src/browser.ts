import { chromium, BrowserContext, Page } from 'playwright';

let context: BrowserContext | null = null;
let page: Page | null = null;

// 使用環境變數，或 fallback 到預設 Edge 路徑 (為了不干擾使用者用 Chrome 追劇)
const USER_DATA_DIR = process.env.EDGE_USER_DATA_DIR || 'C:\\Users\\wang6\\AppData\\Local\\Microsoft\\Edge\\User Data';

export async function getBrowserPage(): Promise<Page> {
    if (page && context) {
        return page;
    }

    try {
        console.error(`[Browser] Launching with userDataDir: ${USER_DATA_DIR}`);
        context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false, // 為了讓 Hit-in-the-loop 與驗證可以觀察，設為 false
            channel: 'msedge', // 改用 Edge，把 Chrome 留給使用者追劇
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
        console.error("[Browser] Failed to launch browser context. 啟動失敗，請確認是否所有該 Profile 的 Edge 視窗都已經關閉。");
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
