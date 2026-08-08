import { getBrowserPage, closeBrowser } from '../src/browser';

async function testSearch() {
    console.log("Starting debug search (HEADED)...");
    const page = await getBrowserPage(false); // run headed
    
    console.log("Navigating...");
    const url = 'https://www.104.com.tw/jobs/search/?ro=0&keyword=前端&expansionType=area%2Cspec%2Ccom%2Cjob%2Cwf%2Cwktm&order=15&asc=0&page=1&mode=s&jobsource=2018indexpoc';
    
    // 用 Promise 監聽 104 的後端 JSON API
    const apiDataPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('API 回應逾時（20秒）')), 20000);
        
        page.on('response', async (response) => {
            if (response.url().includes('/jobs/search/api/jobs')) {
                clearTimeout(timeout);
                try {
                    const json = await response.json();
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            }
        });
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    console.log("Waiting for API response...");
    try {
        const data = await apiDataPromise;
        console.log("Success! Got", data.data?.length, "jobs.");
    } catch (e: any) {
        console.error("Failed:", e.message);
        await page.screenshot({ path: 'scratch/search_screenshot_headed.png' });
    }
    
    console.log("Closing browser...");
    await closeBrowser();
    console.log("Done.");
}

testSearch().catch(console.error);
