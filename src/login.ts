import { getBrowserPage } from './browser';

async function main() {
    console.log("正在開啟瀏覽器...");
    const page = await getBrowserPage();
    
    console.log("正在前往 104 登入頁面...");
    await page.goto('https://pda.104.com.tw/login/index');
    
    console.log("請在彈出的視窗中完成登入，您有 60 秒的時間。");
    
    // 倒數 60 秒
    for(let i = 60; i > 0; i--) {
        if (i % 10 === 0 || i <= 5) {
            console.log(`倒數 ${i} 秒...`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("時間到！正在關閉瀏覽器...");
    await page.context().browser()?.close();
    console.log("完成登入紀錄！");
    process.exit(0);
}

main().catch(console.error);
