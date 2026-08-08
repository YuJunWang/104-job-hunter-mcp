const https = require('https');

const url = 'https://m.104.com.tw/search/jobsearch/?keyword=%E5%89%8D%E7%AB%AF';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9'
  }
};

https.get(url, options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Data contains Turnstile?', data.includes('challenges.cloudflare.com') || data.includes('Just a moment'));
    console.log('Data (first 500 chars):', data.substring(0, 500));
  });
}).on('error', (e) => {
  console.error(e);
});
