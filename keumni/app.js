// 어!금니 - 3D 어금니 렌더링

// 서버 미실행 시 폴백용 샘플 데이터 (서버 응답과 동일한 형태: 최근 7개월 시리즈)
function sampleData() {
    const series = vals => {
        const arr = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            arr.push({ ym: `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`, value: vals[6 - i] });
        }
        return arr;
    };
    return {
        sample: true,
        base: { current: 2.75, change: -0.25, series: series([3.00, 3.00, 3.00, 2.75, 2.75, 2.75, 2.75]) },
        mort: { current: 3.82, change: -0.15, series: series([4.05, 3.98, 3.95, 3.90, 3.88, 3.85, 3.82]) },
        depo: { current: 3.21, change: +0.05, series: series([3.10, 3.12, 3.15, 3.16, 3.18, 3.20, 3.21]) },
    };
}

function setDate() {
    const t = new Date();
    const dn = ['일','월','화','수','목','금','토'];
    document.getElementById('today-date').textContent =
        `${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,'0')}.${String(t.getDate()).padStart(2,'0')} ${dn[t.getDay()]}요일`;
}

// ═══════════════════════════════════════
// 3D 어금니 생성
// ═══════════════════════════════════════

function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function pseudoNoise(x, y, z) {
    return Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 0.5
         + Math.sin(x * 3.7 + y * 9.1 + z * 5.3) * 0.5;
}

// ── 공유 리소스 (WebGL 컨텍스트는 브라우저당 개수 제한이 있어 1개만 생성) ──
let _renderer = null;
let _envMap = null;
let _matCrown = null;
let _matRoot = null;

function getRenderer() {
    if (!_renderer) {
        _renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        _renderer.setPixelRatio(2);
        _renderer.toneMapping = THREE.ACESFilmicToneMapping;
        _renderer.toneMappingExposure = 1.0;
        _renderer.outputEncoding = THREE.sRGBEncoding;
    }
    return _renderer;
}

// 스튜디오 소프트박스 환경맵 — 법랑질 광택의 핵심
function getEnvMap(renderer) {
    if (_envMap) return _envMap;
    const scene = new THREE.Scene();
    const panel = (color, intensity, w, h, x, y, z) => {
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color).multiplyScalar(intensity),
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        mesh.position.set(x, y, z);
        mesh.lookAt(0, 0, 0);
        scene.add(mesh);
    };
    panel(0xfff4e0, 5.0, 8, 8, 4, 8, 6);      // 키 라이트: 우상단 웜
    panel(0xdce8ff, 1.4, 10, 10, -8, 2, 4);   // 필: 좌측 쿨
    panel(0xffffff, 3.0, 4, 10, -2, 2, -9);   // 림: 후방
    panel(0x2a2118, 0.5, 20, 20, 0, -10, 0);  // 바닥 반사광
    const pmrem = new THREE.PMREMGenerator(renderer);
    _envMap = pmrem.fromScene(scene, 0.04).texture;
    pmrem.dispose();
    return _envMap;
}

function getCrownMat() {
    if (!_matCrown) {
        _matCrown = new THREE.MeshPhysicalMaterial({
            vertexColors: true,
            roughness: 0.25,
            metalness: 0,
            clearcoat: 0.5,
            clearcoatRoughness: 0.3,
            envMapIntensity: 0.65,
        });
    }
    return _matCrown;
}

function getRootMat() {
    if (!_matRoot) {
        _matRoot = new THREE.MeshPhysicalMaterial({
            vertexColors: true,
            roughness: 0.38,
            metalness: 0,
            clearcoat: 0.15,
            clearcoatRoughness: 0.45,
            envMapIntensity: 0.55,
        });
    }
    return _matRoot;
}

// ── 크라운(치관) + 치경부 + 루트 트렁크: 라테 프로파일 → 변위 ──
function createCrownGeometry() {
    const raw = [
        [0.001, 1.00], [0.31, 0.99], [0.55, 0.94], [0.74, 0.82],
        [0.85, 0.62], [0.91, 0.38], [0.91, 0.12], [0.86, -0.10],
        [0.80, -0.24], [0.72, -0.36], [0.60, -0.48], [0.44, -0.58]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const curve = new THREE.SplineCurve(raw);
    const pts = curve.getPoints(80);
    const geo = new THREE.LatheGeometry(pts, 72);

    const cusps = [[0.50, 0.42], [-0.50, 0.42], [0.50, -0.38], [-0.50, -0.38]];
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const enamel = new THREE.Color(0xf3ecd9);
    const enamelSide = new THREE.Color(0xece0c4);
    const cerv = new THREE.Color(0xdec294);
    const trunk = new THREE.Color(0xd0ab6c);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const r = Math.hypot(x, z);

        if (r > 1e-4) {
            // 단면 사각형화: 어금니 크라운은 모서리가 둥근 사각형
            const th = Math.atan2(z, x);
            const se = Math.pow(
                Math.pow(Math.abs(Math.cos(th)), 4) + Math.pow(Math.abs(Math.sin(th)), 4),
                -0.25
            );
            const k = smoothstep(-0.35, 0.25, y) * 0.55;
            const f = 1 + (se - 1) * k * 2;
            x *= f * 1.06;  // 근원심으로 약간 넓게
            z *= f * 0.94;
        }

        // 교합면: 커스프 4개 + 중앙 고랑(fossa)
        const topW = smoothstep(0.55, 0.9, y);
        if (topW > 0) {
            let h = 0;
            for (const [cx, cz] of cusps) {
                h += Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 0.10) * 0.30;
            }
            const groove = Math.exp(-(x * x) / 0.015) * 0.10
                         + Math.exp(-(z * z) / 0.02) * 0.07;
            y += (h - groove - 0.06) * topW;
        }

        // 유기적 미세 굴곡
        x += pseudoNoise(x * 1.9, y * 1.6, z * 2.1) * 0.004;
        z += pseudoNoise(y * 1.7, z * 1.4, x * 1.1) * 0.004;

        pos.setXYZ(i, x, y, z);

        // 색: 법랑질 흰색 → 치경선 크림 → 트렁크 상아색
        if (y > 0.0) tmp.lerpColors(enamelSide, enamel, smoothstep(0.0, 0.7, y));
        else if (y > -0.28) tmp.lerpColors(cerv, enamelSide, smoothstep(-0.28, 0.0, y));
        else tmp.lerpColors(trunk, cerv, smoothstep(-0.58, -0.28, y));
        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.rotateY(2.4); // 라테 이음새를 카메라 반대편으로
    return geo;
}

// ── 뿌리: 테이퍼 + 곡률 (중간은 바깥, 끝은 안쪽으로 휨) ──
function createRootGeometry(length, side) {
    const geo = new THREE.CylinderGeometry(0.38, 0.05, length, 20, 36);
    geo.translate(0, -length / 2, 0); // 상단을 y=0에

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const rootTop = new THREE.Color(0xd8b87e);
    const rootMid = new THREE.Color(0xbe9048);
    const rootTip = new THREE.Color(0xa87b38);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const t = Math.min(1, Math.max(0, -y / length));

        // 세로 방향 골(길이 홈) — 실제 치근 표면의 굴곡
        const rr = Math.hypot(x, z);
        if (rr > 1e-4) {
            const th = Math.atan2(z, x);
            const ridge = 1 + Math.sin(th * 3 + 1.2) * 0.06 * Math.sin(t * Math.PI);
            x *= ridge; z *= ridge;
        }

        z *= 0.78; // 근원심 방향으로 납작한 단면
        x += Math.sin(t * Math.PI * 0.9) * 0.14 * side; // 중간부 바깥쪽 벌어짐
        x += t * t * (-0.18) * side;                     // 끝부분 안쪽으로 휨
        z += Math.sin(t * Math.PI) * 0.03;
        x += pseudoNoise(x * 2.3, y * 1.8, z * 2.1) * 0.006;

        pos.setXYZ(i, x, y, z);

        if (t < 0.5) tmp.lerpColors(rootTop, rootMid, t / 0.5);
        else tmp.lerpColors(rootMid, rootTip, (t - 0.5) / 0.5);
        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
}

function createMolar(rootScale) {
    const group = new THREE.Group();

    const crown = new THREE.Mesh(createCrownGeometry(), getCrownMat());
    group.add(crown);

    const len = 2.2 * rootScale;
    const r1 = new THREE.Mesh(createRootGeometry(len, -1), getRootMat());
    r1.position.set(-0.30, -0.40, 0);
    group.add(r1);

    const r2 = new THREE.Mesh(createRootGeometry(len * 0.93, 1), getRootMat());
    r2.position.set(0.30, -0.40, 0);
    group.add(r2);

    return group;
}

// 단일 어금니를 캔버스에 렌더링 (공유 렌더러 → 2D 캔버스로 복사)
function renderMolarToCanvas(rootScale, width, height) {
    const renderer = getRenderer();
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    scene.environment = getEnvMap(renderer);

    const camera = new THREE.PerspectiveCamera(33, width / height, 0.1, 100);
    camera.position.set(0.5, 0.3, 10);
    camera.lookAt(0, -0.1, 0);

    const key = new THREE.DirectionalLight(0xfff2dd, 1.0);
    key.position.set(4, 6, 6);
    const fill = new THREE.DirectionalLight(0xdde8ff, 0.3);
    fill.position.set(-5, 1, 4);
    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(-2, 3, -6);
    const under = new THREE.DirectionalLight(0xfff0dd, 0.3); // 치경부 언더컷 음영 완화
    under.position.set(0.5, -3, 6);
    scene.add(key, fill, rim, under, new THREE.AmbientLight(0xffffff, 0.12));

    const molar = createMolar(rootScale);
    molar.position.y = 1.2;
    molar.rotation.set(0.12, -0.25, 0.02);
    scene.add(molar);

    renderer.render(scene, camera);

    const out = document.createElement('canvas');
    out.width = renderer.domElement.width;
    out.height = renderer.domElement.height;
    out.getContext('2d').drawImage(renderer.domElement, 0, 0);

    molar.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    return out;
}

// ═══════════════════════════════════════
// 차트 렌더링
// ═══════════════════════════════════════

function rateToScale(rate, allRates) {
    const min = Math.min(...allRates);
    const max = Math.max(...allRates);
    if (max === min) return 1.0;
    return 0.5 + ((rate - min) / (max - min)) * 1.0;
}

function renderChart(chartId, series) {
    const el = document.getElementById(chartId);
    el.innerHTML = '';
    const values = series.map(s => s.value);

    series.forEach((s, i) => {
        const scale = rateToScale(s.value, values);
        const month = +s.ym.slice(4, 6);
        const year = s.ym.slice(0, 4);

        const col = document.createElement('div');
        col.className = 'tooth-col' + (i === series.length - 1 ? ' today' : '');

        // 금리 숫자
        const rateEl = document.createElement('div');
        rateEl.className = 'tooth-rate';
        rateEl.textContent = s.value.toFixed(2);

        // 3D 어금니 캔버스
        const canvas = renderMolarToCanvas(scale, 120, 200);
        canvas.className = 'tooth-canvas';

        // 월 라벨
        const dateEl = document.createElement('div');
        dateEl.className = 'tooth-date';
        dateEl.innerHTML = `<div class="tooth-date-num">${month}월</div><div class="tooth-date-day">${year}</div>`;

        col.appendChild(rateEl);
        col.appendChild(canvas);
        col.appendChild(dateEl);
        el.appendChild(col);
    });
}

function setChg(id, v) {
    const el = document.getElementById(id);
    if (v > 0) { el.textContent = '▲ ' + v.toFixed(2); el.className = 'chart-change up'; }
    else if (v < 0) { el.textContent = '▼ ' + Math.abs(v).toFixed(2); el.className = 'chart-change down'; }
    else { el.textContent = '─'; el.className = 'chart-change same'; }
}

function renderAll(data) {
    document.getElementById('base-val').textContent = data.base.current.toFixed(2) + '%';
    document.getElementById('mort-val').textContent = data.mort.current.toFixed(2) + '%';
    document.getElementById('depo-val').textContent = data.depo.current.toFixed(2) + '%';
    setChg('base-chg', data.base.change);
    setChg('mort-chg', data.mort.change);
    setChg('depo-chg', data.depo.change);
    renderChart('chart-base', data.base.series);
    renderChart('chart-mort', data.mort.series);
    renderChart('chart-depo', data.depo.series);

    const footer = document.getElementById('footer-info');
    if (data.sample) {
        footer.textContent = '※ 샘플 데이터 — 실제 금리 데이터에 연결하지 못했습니다 (로컬은 node server.js 실행 후 localhost:3456 접속, 배포 사이트는 rates.json 생성 여부 확인)';
    } else {
        const t = new Date(data.fetchedAt);
        const hhmm = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
        let txt = `출처: 한국은행 ECOS · 기준금리(일별) · 주담대/예금: 예금은행 가중평균금리(신규취급액, ${data.mort.asOf} 공시) · 갱신 ${hhmm}`;
        if (data.stale) txt += ' · ⚠ 갱신 실패, 이전 데이터 표시 중';
        footer.textContent = txt;
    }
}

// 데이터 소스: ① 로컬 node 서버(/api/rates, 실시간) ② 정적 rates.json(GitHub Actions가 주기 갱신) ③ 샘플
async function tryFetch(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.base) throw new Error(data.error || '데이터 형식 오류');
    return data;
}

async function loadRates(force = false) {
    try {
        renderAll(await tryFetch('/api/rates' + (force ? '?force=1' : '')));
        return;
    } catch (e) { /* 로컬 서버 없음 → 정적 파일 시도 */ }
    try {
        renderAll(await tryFetch('rates.json?t=' + Date.now()));
        return;
    } catch (e) { /* 정적 파일도 없음 */ }
    renderAll(sampleData());
}

function init() {
    setDate();
    const btn = document.getElementById('refresh-btn');
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '갱신 중…';
        await loadRates(true);
        btn.disabled = false;
        btn.textContent = '↻ 갱신';
    });
    loadRates();
}

document.addEventListener('DOMContentLoaded', init);
