/**
 * 104 縣市代碼（來源：https://static.104.com.tw/category-tool/json/Area.json，台灣地區第一層）。
 * 104 搜尋頁的 `area` 參數只吃代碼，傳中文地名會被忽略。
 */
const AREA_CODES: Record<string, string> = {
    '台北市': '6001001000',
    '新北市': '6001002000',
    '宜蘭縣': '6001003000',
    '基隆市': '6001004000',
    '桃園市': '6001005000',
    '新竹縣市': '6001006000',
    '苗栗縣': '6001007000',
    '台中市': '6001008000',
    '彰化縣': '6001010000',
    '南投縣': '6001011000',
    '雲林縣': '6001012000',
    '嘉義縣市': '6001013000',
    '台南市': '6001014000',
    '高雄市': '6001016000',
    '屏東縣': '6001018000',
    '台東縣': '6001019000',
    '花蓮縣': '6001020000',
    '澎湖縣': '6001021000',
    '金門縣': '6001022000',
    '連江縣': '6001023000',
};

export const SUPPORTED_AREAS = Object.keys(AREA_CODES);

/**
 * 將使用者輸入的地名轉為 104 area code。
 * 容忍「臺/台」、省略「市/縣」（例如「台北」「新竹」「臺中市」）。
 * 支援以逗號或頓號分隔多個地區，回傳 104 可接受的逗號串接格式。
 * 任何一個地名無法辨識都回傳 unknown，由呼叫端決定如何回報（不靜默忽略）。
 */
export function resolveAreaCodes(input: string): { codes: string | null; unknown: string[] } {
    const parts = input.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);
    const codes: string[] = [];
    const unknown: string[] = [];

    for (const raw of parts) {
        const name = raw.replace(/臺/g, '台');
        const hit = SUPPORTED_AREAS.find(area =>
            area === name || area.replace(/(縣市|市|縣)$/, '') === name.replace(/(縣市|市|縣)$/, '')
        );
        if (hit) codes.push(AREA_CODES[hit]);
        else unknown.push(raw);
    }

    return { codes: codes.length ? Array.from(new Set(codes)).join(',') : null, unknown };
}
