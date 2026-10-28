import { execSync } from 'child_process';
import * as path from 'path';

const testFiles = [
    'src/__tests__/url.test.ts',
    'src/__tests__/applyAnalysis.test.ts',
    'src/__tests__/applyAnalysisTool.test.ts',
    'src/__tests__/search.test.ts',
    'src/__tests__/company.test.ts'
];

console.log(`🚀 Executing ${testFiles.length} Test Suites...`);

for (const file of testFiles) {
    const fullPath = path.resolve(__dirname, '..', '..', file);
    console.log(`\n==============================\n▶ Running ${file}\n==============================`);
    execSync(`npx tsx "${fullPath}"`, { stdio: 'inherit' });
}

console.log(`\n🎉 All ${testFiles.length} Test Suites Passed Successfully!\n`);
