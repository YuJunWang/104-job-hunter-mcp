/**
 * 從 104 職缺網址或字串中提取 Job ID (如 796uv)
 * 支援以下格式：
 * - https://www.104.com.tw/job/796uv
 * - https://m.104.com.tw/job/796uv?jobsource=...
 * - 796uv (直接輸入 ID)
 */
export function extractJobId(input: string): string | null {
    if (!input) return null;

    // 格式 1: 網址包含 /job/xxxxx
    const match = input.match(/\/job\/([a-z0-9]+)/i);
    if (match) {
        return match[1];
    }

    // 格式 2: 直接是 Job ID (一般為 5-6 位英數字)
    const rawIdMatch = input.match(/^[a-z0-9]+$/i);
    if (rawIdMatch) {
        return input;
    }

    return null;
}

/**
 * 從 104 公司網址或字串中提取 Company ID (如 1a2x6bmutz)
 * 支援以下格式：
 * - https://www.104.com.tw/company/1a2x6bmutz
 * - https://m.104.com.tw/company/1a2x6bmutz?jobsource=...
 * - 1a2x6bmutz (直接輸入 ID)
 */
export function extractCompanyId(input: string): string | null {
    if (!input) return null;

    // 格式 1: 網址包含 /company/xxxxx
    const match = input.match(/\/company\/([a-z0-9]+)/i);
    if (match) {
        return match[1];
    }

    // 格式 2: 直接是 Company ID
    const rawIdMatch = input.match(/^[a-z0-9]+$/i);
    if (rawIdMatch) {
        return input;
    }

    return null;
}
