import { searchJobs } from './tools/search';
import { getJobDetails } from './tools/details';
import { prepareApplication } from './tools/apply';
import { closeBrowser } from './browser';

async function main() {
    try {
        console.log("=== 測試 1: 搜尋職缺 (AI 全端工程師) ===");
        const searchResult = await searchJobs({ keyword: 'AI 全端工程師 台北', page: 1 });
        
        if (searchResult && searchResult.error) {
            console.log("搜尋失敗:", searchResult.error);
            return;
        }
        
        const jobs = Array.isArray(searchResult) ? searchResult : (searchResult.results || []);
        console.log(`找到 ${jobs.length} 筆結果。`);
        
        // 尋找包含「米蘭」或直接選第四筆
        const targetJob = jobs.find((j: any) => j.company.includes('米蘭')) || jobs[0];
        
        if (targetJob) {
            console.log("選擇職缺:", targetJob.title, "-", targetJob.company);
            console.log("薪資:", targetJob.salary);
            console.log("地點:", targetJob.location);
            
            if (targetJob.link) {
                console.log("\n=== 測試 2: 取得職缺細節 ===");
                const details = await getJobDetails({ job_url: targetJob.link });
                if ('error' in details) {
                    console.log("取得職缺細節失敗:", details.error);
                } else {
                    console.log("職缺描述預覽:", details.description?.substring(0, 150) + '...');
                }

                console.log("\n=== 測試 3: 準備應徵（Hit-in-the-loop 模式）===");
                console.log("⚠️ dry_run=false，將開啟應徵視窗並填妥推薦信，等待人類確認送出！");
                
                const coverLetterText = `您好，這是一封來自 AI 助理的測試應徵信。我是一位具備現代軟體工程經驗的全端工程師，對貴公司的 AI 全端工程師職缺非常感興趣。我擅長利用 AI 工具提升開發效率，並具備優良的系統架構思維，希望能有機會進一步討論！

（註：此為 Antigravity MCP 測試流程，請勿理會。如果人類雇主真的按下了送出，代表我們的 Hit-in-the-loop 測試成功了 XD）`;

                const applyResult = await prepareApplication({
                    job_url: targetJob.link,
                    cover_letter_text: coverLetterText,
                    dry_run: false
                });
                
                console.log("應徵準備結果:", JSON.stringify(applyResult, null, 2));
            }
        }
        
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        // 在真實的 hit-in-the-loop 中我們不應該關閉瀏覽器，讓用戶可以點擊
        // 但為了腳本結束，我們這裡可以選擇不 await closeBrowser 或者給用戶時間
        console.log("請在彈出的瀏覽器視窗中檢視並決定是否按下確認送出！(視窗將保持開啟 60 秒)");
        await new Promise(r => setTimeout(r, 60000));
        await closeBrowser();
        process.exit(0);
    }
}

main();
