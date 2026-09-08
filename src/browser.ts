import { chromium } from 'playwright-extra';
import { BrowserContext, Page } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

import * as path from 'path';
import * as fs from 'fs';

let context: BrowserContext | null = null;
let page: Page | null = null;
let currentHeadlessState: boolean | null = null;

// 使用專案本地的暫存 Profile，避免直接掛載使用者預設 Profile 觸發 Chrome 的安全阻擋
const USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR || path.join(__dirname, '..', '.chrome-profile');

/**
 * 清理 Chrome profile 中殘留的 SingletonLock。
 * 當上一個 Chrome 進程異常結束時，鎖定檔案不會自動清除，
 * 導致下一次啟動時 Chrome 報錯 "Failed to create a ProcessSingleton"。
 */
function cleanSingletonLock(): void {
    const lockPath = path.join(USER_DATA_DIR, 'SingletonLock');
    if (fs.existsSync(lockPath)) {
        try {
            fs.unlinkSync(lockPath);
            console.error('[Browser] Removed stale SingletonLock.');
        } catch (e) {
            console.error('[Browser] Failed to remove SingletonLock:', (e as Error).message);
        }
    }
}

export async function getBrowserPage(headless: boolean = false): Promise<Page> {
    // 檢查現有實例是否可用。若已經有開啟的 context，直接重複使用，避免頻繁重啟與 Windows ProcessSingleton 鎖定衝突
    if (context) {
        if (currentHeadlessState !== null && currentHeadlessState !== headless) {
            console.error(`[Browser] Headless state change requested (${currentHeadlessState} -> ${headless}). Re-launching context...`);
            await closeBrowser();
        } else {
            try {
                if (page && !page.isClosed()) {
                    return page;
                }
                // 若 page 已關閉，嘗試從 context 取得或新建頁面
                const activePages = context.pages().filter(p => !p.isClosed());
                if (activePages.length > 0) {
                    page = activePages[0];
                    return page;
                }
                page = await context.newPage();
                return page;
            } catch (err) {
                console.error('[Browser] Existing browser context or page is unresponsive. Re-launching...', err);
                await closeBrowser();
            }
        }
    }

    // 清理上次殘留的 SingletonLock（避免 Chrome 啟動失敗）
    cleanSingletonLock();

    try {
        console.error(`[Browser] Launching with userDataDir: ${USER_DATA_DIR}, headless: ${headless}`);
        context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: headless,
            channel: 'chrome', // 強制使用安裝的 Chrome
            args: [
                '--no-first-run',
                '--no-default-browser-check',
                ...(headless ? [] : ['--window-size=1280,900']),
            ],
            viewport: headless ? { width: 1280, height: 720 } : { width: 1280, height: 850 },
        });

        // 監聽 context 關閉事件（如使用者手動關閉或 Chrome crash），及時重置單例變數
        context.on('close', () => {
            console.error('[Browser] BrowserContext has been closed. Resetting singleton state.');
            context = null;
            page = null;
            currentHeadlessState = null;
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
        try {
            await context.close();
        } catch (e) {
            console.error('[Browser] Error while closing context:', (e as Error).message);
        } finally {
            context = null;
            page = null;
            currentHeadlessState = null;
        }
    }
}
