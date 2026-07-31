import { searchJobs } from './tools/search';
import { getJobDetails } from './tools/details';
import { prepareApplication } from './tools/apply';
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
            console.log("薪資:", firstJob.salary);
            console.log("地點:", firstJob.location);
            
            if (firstJob.link) {
                console.log("\n=== 測試 2: 取得職缺細節（API 攔截版）===");
                const details = await getJobDetails({ job_url: firstJob.link });
                if ('error' in details) {
                    console.log("取得職缺細節失敗:", details.error);
                } else {
                    console.log("職缺描述預覽:", details.description?.substring(0, 150) + '...');
                    console.log("需要技能:", details.skills?.join(', '));
                    console.log("工作經驗要求:", details.workExp);
                    console.log("學歷要求:", details.edu);
                    console.log("福利標籤:", details.tags?.join(', '));
                }

                console.log("\n=== 測試 3: 準備應徵（DRY RUN 模式）===");
                console.log("⚠️  dry_run=true，不會真的送出應徵！");
                const applyResult = await prepareApplication({
                    job_url: firstJob.link,
                    cover_letter_text: "您好，我對貴公司的職缺非常感興趣，具備相關技術經驗，期望有機會進一步討論。（這是 DRY RUN 測試用的假求職信）",
                    dry_run: true
                });
                console.log("應徵準備結果:", JSON.stringify(applyResult, null, 2));
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
