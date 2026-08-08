import { getBrowserPage, closeBrowser } from '../src/browser';
import * as fs from 'fs';

async function testSearch() {
    console.log("Starting debug search...");
    const page = await getBrowserPage(true); // run headless first
    
    console.log("Navigating...");
    const url = 'https://www.104.com.tw/jobs/search/?ro=0&keyword=前端&expansionType=area%2Cspec%2Ccom%2Cjob%2Cwf%2Cwktm&order=15&asc=0&page=1&mode=s&jobsource=2018indexpoc';
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    console.log("Waiting for 3 seconds...");
    await new Promise(r => setTimeout(r, 3000));
    
    console.log("Taking screenshot...");
    await page.screenshot({ path: 'scratch/search_screenshot.png' });
    
    console.log("Closing browser...");
    await closeBrowser();
    console.log("Done.");
}

testSearch().catch(console.error);
