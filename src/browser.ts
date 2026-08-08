import { chromium } from 'playwright-extra';
import { BrowserContext, Page } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

import * as path from 'path';

let context: BrowserContext | null = null;
let page: Page | null = null;
let currentHeadlessState: boolean | null = null;

// 使用專案本地的暫存 Profile，避免直接掛載使用者預設 Profile 觸發 Chrome 的安全阻擋
const USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR || path.join(__dirname, '..', '.chrome-profile');

export async function getBrowserPage(headless: boolean = true): Promise<Page> {
    // 如果已有瀏覽器，且它的 headless 狀態與目前要求的一致，則直接回傳
    if (page && context && currentHeadlessState === headless) {
        return page;
    }

    // 如果目前的 headless 狀態不一致，先關閉舊瀏覽器
    if (context && currentHeadlessState !== headless) {
        console.error(`[Browser] Headless state changed from ${currentHeadlessState} to ${headless}. Restarting browser...`);
        await closeBrowser();
    }

    try {
        console.error(`[Browser] Launching with userDataDir: ${USER_DATA_DIR}, headless: ${headless}`);
        context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: headless,
            channel: 'chrome', // 強制使用安裝的 Chrome
            args: [
                '--disable-blink-features=AutomationControlled',
                ...(headless ? [] : ['--start-maximized'])
            ],
            viewport: headless ? { width: 1280, height: 720 } : null,
        });

        currentHeadlessState = headless;

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
        currentHeadlessState = null;
    }
}
