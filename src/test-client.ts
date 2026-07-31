import { searchJobs } from './tools/search';
import { getJobDetails } from './tools/details';
import { closeBrowser } from './browser';

async function main() {
    try {
        console.log("=== 測試 1: 搜尋職缺 (前端工程師) ===");
        const searchResult = await searchJobs({ keyword: '前端工程師', page: 1 });
        
        if (searchResult && searchResult.error) {
            console.log("搜尋失敗:", searchResult.error);
            return;
        }
        
        const jobs = Array.isArray(searchResult) ? searchResult : (searchResult.results || []);
        console.log(`找到 ${jobs.length} 筆結果。`);
        
        if (jobs.length > 0) {
            const firstJob = jobs[0];
            console.log("第一筆職缺:", firstJob.title, "-", firstJob.company);
            
            if (firstJob.link) {
                console.log("\n=== 測試 2: 取得職缺細節 ===");
                const details = await getJobDetails({ job_url: firstJob.link });
                if ('description' in details) {
                    console.log("職缺描述預覽:", details.description?.substring(0, 100) + '...');
                } else {
                    console.log("取得職缺細節失敗:", details.error);
                }
            }
        }
        
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await closeBrowser();
        process.exit(0);
    }
}

main();
