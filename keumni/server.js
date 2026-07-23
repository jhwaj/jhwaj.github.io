// 어!금니 로컬 서버 - 정적 파일 + 한국은행 ECOS 금리 프록시
// 실행: node server.js  →  http://localhost:3456
//
// 금리 수집 로직은 fetch-rates.js 공용 (GitHub Actions도 같은 파일 사용)
// API 키: config.json 의 ecosApiKey (기본 "sample" = ECOS 테스트 키, 호출당 10건 제한)
// 본인 키 발급: https://ecos.bok.or.kr → 인증키 신청 후 config.json 에 입력

const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildRates, getApiKey } = require('./fetch-rates');

const PORT = 3456;
const ROOT = __dirname;
const CACHE_FILE = path.join(ROOT, 'data', 'rates.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6시간

function readCache() {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
    catch (e) { return null; }
}

function writeCache(data) {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

async function handleRates(req, res, force) {
    const cached = readCache();
    if (!force && cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(cached));
        return;
    }
    try {
        const data = await buildRates();
        writeCache(data);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
    } catch (e) {
        console.error('[rates]', e.message);
        if (cached) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ...cached, stale: true, error: e.message }));
        } else {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: e.message }));
        }
    }
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === '/api/rates') {
        handleRates(req, res, url.searchParams.get('force') === '1');
        return;
    }

    let filePath = path.normalize(path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname));
    // config.json(API 키)과 상위 경로 접근 차단
    if (!filePath.startsWith(ROOT) || path.basename(filePath) === 'config.json') {
        res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(filePath, (err, buf) => {
        if (err) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(buf);
    });
});

server.listen(PORT, () => {
    console.log(`어!금니 서버 실행 중: http://localhost:${PORT}`);
    console.log(`ECOS API 키: ${getApiKey() === 'sample' ? 'sample (테스트 키, config.json 에 본인 키 입력 권장)' : '사용자 키'}`);
});
