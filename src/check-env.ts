import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright-extra';

interface CheckItem {
    name: string;
    passed: boolean;
    required: boolean;
    message: string;
    hint?: string;
}

function findChromePath(): string | null {
    // 優先使用 Playwright 內建的 channel 解析
    try {
        const p = (chromium as any).executablePath({ channel: 'chrome' }) || chromium.executablePath();
        if (p && fs.existsSync(p)) return p;
    } catch {}

    // 常見作業系統標準路徑備援檢查
    const candidatePaths: string[] = [];
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || '';
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        candidatePaths.push(
            path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe')
        );
    } else if (process.platform === 'darwin') {
        candidatePaths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    } else {
        candidatePaths.push(
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser'
        );
    }

    for (const p of candidatePaths) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
}

function checkGit(): string | null {
    try {
        const out = execSync('git --version', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' });
        return out.trim();
    } catch {
        return null;
    }
}

async function main() {
    console.log('\n======================================================');
    console.log('🩺 104 Job Hunter MCP - 環境健康檢查 (Environment Doctor)');
    console.log('======================================================\n');

    const checks: CheckItem[] = [];
    const rootDir = path.resolve(__dirname, '..');

    // 1. Node.js 版本檢查 (要求 >= 18)
    const nodeVer = process.version;
    const major = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
    const nodeOk = major >= 18;
    checks.push({
        name: 'Node.js 執行環境',
        passed: nodeOk,
        required: true,
        message: `${nodeVer} (${nodeOk ? '符合需求 >= v18' : '版本過舊'})`,
        hint: nodeOk ? undefined : '請至 https://nodejs.org 下載安裝 Node.js 18 或 20 LTS 版本。'
    });

    // 2. Google Chrome 瀏覽器檢查
    const chromePath = findChromePath();
    const chromeOk = !!chromePath;
    checks.push({
        name: 'Google Chrome 官方瀏覽器',
        passed: chromeOk,
        required: true,
        message: chromeOk ? `已偵測 (${chromePath})` : '未偵測到本機 Chrome',
        hint: chromeOk ? undefined : '本專案以正式版 Chrome 維持持久化登入與防爬特徵。請至 https://www.google.com/chrome/ 安裝。'
    });

    // 3. Git 工具檢查
    const gitVer = checkGit();
    const gitOk = !!gitVer;
    checks.push({
        name: 'Git 版本控制工具',
        passed: gitOk,
        required: false,
        message: gitOk ? gitVer : '未在 PATH 偵測到 Git',
        hint: gitOk ? undefined : '建議安裝 Git 以便隨時更新程式碼 (https://git-scm.com/)。'
    });

    // 4. node_modules 與核心相依檢查
    const nodeModulesExist = fs.existsSync(path.join(rootDir, 'node_modules'));
    const mcpSdkExist = fs.existsSync(path.join(rootDir, 'node_modules/@modelcontextprotocol/sdk'));
    const depsOk = nodeModulesExist && mcpSdkExist;
    checks.push({
        name: 'Node 模組相依套件 (node_modules)',
        passed: depsOk,
        required: true,
        message: depsOk ? '依賴套件已完整安裝' : '相依套件不完整',
        hint: depsOk ? undefined : '請在專案根目錄執行 `npm install` 安裝相依套件。'
    });

    // 5. TypeScript 編譯產物 (build/index.js)
    const buildPath = path.join(rootDir, 'build/index.js');
    const buildOk = fs.existsSync(buildPath);
    checks.push({
        name: 'MCP 編譯產物 (build/index.js)',
        passed: buildOk,
        required: true,
        message: buildOk ? '已編譯就緒' : '尚未編譯 (build/index.js 不存在)',
        hint: buildOk ? undefined : '請在專案目錄執行 `npm run build` 進行編譯。'
    });

    // 6. 104 登入持久化 Profile (.chrome-profile)
    const profilePath = path.join(rootDir, '.chrome-profile');
    const profileOk = fs.existsSync(profilePath);
    checks.push({
        name: '104 登入工作階段 (.chrome-profile)',
        passed: profileOk,
        required: false,
        message: profileOk ? '已建立本機 Chrome Profile' : '尚未初始化登入',
        hint: profileOk ? undefined : '請在終端機執行 `npx tsx src/login.ts` 完成一次性 104 登入。'
    });

    // 7. 求職者個人設定檔 (MY_PROFILE.md)
    const myProfilePath = path.join(rootDir, 'MY_PROFILE.md');
    const myProfileOk = fs.existsSync(myProfilePath);
    checks.push({
        name: '求職者個人宣告檔 (MY_PROFILE.md)',
        passed: myProfileOk,
        required: false,
        message: myProfileOk ? '已建立專屬求職 Profile' : '尚未建立 (目前使用範本)',
        hint: myProfileOk ? undefined : '建議複製 `MY_PROFILE.example.md` 為 `MY_PROFILE.md` 並填入你的偏好與紅線。'
    });

    // 輸出檢查結果
    let allRequiredPassed = true;
    for (const c of checks) {
        let badge = '✅ [OK]';
        if (!c.passed) {
            if (c.required) {
                badge = '❌ [缺少必要項]';
                allRequiredPassed = false;
            } else {
                badge = '⚠️  [建議設定]';
            }
        }
        console.log(`${badge.padEnd(16)} | ${c.name.padEnd(28)} | ${c.message}`);
        if (c.hint) {
            console.log(`                 💡 建議：${c.hint}\n`);
        }
    }

    console.log('\n======================================================');
    if (allRequiredPassed) {
        console.log('🎉 核心環境檢查全部通過！此 MCP 已可正常運作。');
        console.log('👉 若尚未登入，請執行：npx tsx src/login.ts');
        console.log('👉 掛載 MCP 設定時，請將絕對路徑指向：' + buildPath);
    } else {
        console.log('⚠️  發現部分必要環境未就緒，請依照上方提示完成安裝或編譯。');
    }
    console.log('======================================================\n');
}

main().catch(err => {
    console.error('檢查腳本發生例外：', err);
    process.exit(1);
});
