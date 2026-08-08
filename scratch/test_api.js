const https = require('https');

const url = 'https://www.104.com.tw/jobs/search/api/jobs?ro=0&keyword=%E5%89%8D%E7%AB%AF&expansionType=area%2Cspec%2Ccom%2Cjob%2Cwf%2Cwktm&order=15&asc=0&page=1&mode=s&jobsource=2018indexpoc';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.104.com.tw/jobs/search/?keyword=%E5%89%8D%E7%AB%AF'
  }
};

https.get(url, options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Data (first 500 chars):', data.substring(0, 500));
  });
}).on('error', (e) => {
  console.error(e);
});
