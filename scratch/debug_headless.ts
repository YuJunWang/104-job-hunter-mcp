import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';

chromium.use(stealthPlugin());

async function main() {
    // 專案根目錄的 .chrome-profile
    const USER_DATA_DIR = path.join(__dirname, '..', '.chrome-profile');
    console.log(`Launching browser with user data dir: ${USER_DATA_DIR}`);
    
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: true,
        channel: 'chrome',
        args: ['--disable-blink-features=AutomationControlled'],
        viewport: { width: 1280, height: 720 }
    });
    
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    const url = 'https://www.104.com.tw/jobs/search/?ro=0&keyword=AI%20%E5%85%A8%E7%AB%AF%20Python';
    console.log(`Navigating to: ${url}`);
    
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        console.log(`Navigation finished. Title: ${await page.title()}`);
    } catch (e) {
        console.error(`Navigation failed or timed out: ${(e as Error).message}`);
    }
    
    const screenshotPath = path.join(__dirname, 'headless_search_screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    await context.close();
}

main().catch(console.error);
