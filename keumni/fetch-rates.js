// 어!금니 - 한국은행 ECOS 금리 수집 모듈
// 사용 1) 모듈: require('./fetch-rates').buildRates()
// 사용 2) CLI:  node fetch-rates.js [출력경로]  →  rates.json 생성 (GitHub Actions에서 사용)
//
// API 키 우선순위: 환경변수 ECOS_API_KEY → config.json 의 ecosApiKey → "sample"(테스트 키)

const https = require('https');
const fs = require('fs');
const path = require('path');

function getApiKey() {
    if (process.env.ECOS_API_KEY) return process.env.ECOS_API_KEY;
    try {
        const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
        if (cfg.ecosApiKey) return cfg.ecosApiKey;
    } catch (e) { /* config 없으면 sample */ }
    return 'sample';
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { timeout: 15000 }, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error('ECOS 응답 파싱 실패: ' + body.slice(0, 150))); }
            });
        }).on('error', reject).on('timeout', function () { this.destroy(new Error('ECOS 요청 타임아웃')); });
    });
}

function ymd(d) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
function ym(d) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ECOS 조회: sample 키의 호출당 10건 제한에 맞춰 총건수 확인 후 마지막 10건만 가져온다
async function ecosSearch(key, stat, cycle, start, end, item) {
    const base = `https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr`;
    const first = await fetchJson(`${base}/1/1/${stat}/${cycle}/${start}/${end}/${item}`);
    const total = first && first.StatisticSearch && first.StatisticSearch.list_total_count;
    if (!total) {
        const msg = (first && first.RESULT && first.RESULT.MESSAGE) || '데이터 없음';
        throw new Error(`ECOS ${stat}/${item}: ${msg}`);
    }
    const from = Math.max(1, total - 9);
    const resp = await fetchJson(`${base}/${from}/${total}/${stat}/${cycle}/${start}/${end}/${item}`);
    const rows = (resp && resp.StatisticSearch && resp.StatisticSearch.row) || [];
    return rows
        .map(r => ({ time: r.TIME, value: parseFloat(r.DATA_VALUE) }))
        .filter(r => !isNaN(r.value));
}

// 시계열에서 마지막 변동폭 (최근 인상/인하 폭)
function lastChange(values) {
    for (let i = values.length - 1; i > 0; i--) {
        if (values[i] !== values[i - 1]) return +(values[i] - values[i - 1]).toFixed(2);
    }
    return 0;
}

function last7Dates() {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        arr.push(d);
    }
    return arr;
}

function fmtYm(t) { return `${t.slice(0, 4)}.${t.slice(4, 6)}`; }

async function buildRates() {
    const key = getApiKey();
    const today = new Date();
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    const m14 = new Date(); m14.setMonth(m14.getMonth() - 14);

    // 기준금리(일별) / 기준금리(월별, 변동폭 탐지용) / 주담대(월별) / 정기예금(월별)
    const baseDaily = await ecosSearch(key, '722Y001', 'D', ymd(d30), ymd(today), '0101000');
    let baseMonthly = [];
    try { baseMonthly = await ecosSearch(key, '722Y001', 'M', ym(m14), ym(today), '0101000'); }
    catch (e) { /* 월별 실패 시 일별만으로 변동폭 계산 */ }
    const mortMonthly = await ecosSearch(key, '121Y006', 'M', ym(m14), ym(today), 'BECBLA0302');
    const depoMonthly = await ecosSearch(key, '121Y002', 'M', ym(m14), ym(today), 'BEABAA211');

    if (!baseDaily.length) throw new Error('기준금리 일별 데이터 없음');
    if (!mortMonthly.length) throw new Error('주담대 월별 데이터 없음');
    if (!depoMonthly.length) throw new Error('예금 월별 데이터 없음');

    const days = last7Dates();

    // 기준금리: 각 날짜에 유효한 값 (해당일 이하 가장 최근 값으로 채움)
    const weeklyBase = days.map(d => {
        const dy = ymd(d);
        let cur = null;
        for (const r of baseDaily) { if (r.time <= dy) cur = r.value; }
        if (cur === null) cur = baseDaily[0].value;
        return { date: dy, value: cur };
    });

    const mortCur = mortMonthly[mortMonthly.length - 1];
    const mortPrev = mortMonthly[mortMonthly.length - 2];
    const depoCur = depoMonthly[depoMonthly.length - 1];
    const depoPrev = depoMonthly[depoMonthly.length - 2];

    return {
        fetchedAt: new Date().toISOString(),
        apiKeyType: key === 'sample' ? 'sample' : 'user',
        base: {
            current: weeklyBase[weeklyBase.length - 1].value,
            change: lastChange([...baseMonthly.map(r => r.value), ...baseDaily.map(r => r.value)]),
            weekly: weeklyBase,
            label: '한국은행 기준금리',
        },
        mort: {
            current: mortCur.value,
            change: +(mortCur.value - (mortPrev ? mortPrev.value : mortCur.value)).toFixed(2),
            weekly: days.map(d => ({ date: ymd(d), value: mortCur.value })),
            asOf: fmtYm(mortCur.time),
            label: '주택담보대출 가중평균금리(신규취급액)',
        },
        depo: {
            current: depoCur.value,
            change: +(depoCur.value - (depoPrev ? depoPrev.value : depoCur.value)).toFixed(2),
            weekly: days.map(d => ({ date: ymd(d), value: depoCur.value })),
            asOf: fmtYm(depoCur.time),
            label: '정기예금 가중평균금리(신규취급액)',
        },
    };
}

module.exports = { buildRates, getApiKey };

if (require.main === module) {
    const outPath = process.argv[2] || path.join(__dirname, 'rates.json');
    buildRates()
        .then(data => {
            fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
            console.log(`저장 완료: ${outPath} (기준금리 ${data.base.current}%, 주담대 ${data.mort.current}%, 예금 ${data.depo.current}%)`);
        })
        .catch(e => { console.error('수집 실패:', e.message); process.exit(1); });
}
