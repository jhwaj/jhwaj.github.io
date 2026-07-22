// 🐸 개구리 우산 대작전 — 클라이언트
(() => {
  'use strict';

  // ---------- DOM ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const hud = $('hud');
  const scoreEl = $('score');
  const livesBox = $('lives-box');
  const speedEl = $('speed');
  const lbList = $('lb-list');
  const popupLayer = $('popup-layer');
  const failStamp = $('fail-stamp');
  const modalName = $('modal-name');
  const modalStart = $('modal-start');
  const modalOver = $('modal-over');

  // ---------- 유저 식별 ----------
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // LAN(http) 접속은 secure context가 아니라 randomUUID가 없을 수 있음
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  let playerId = localStorage.getItem('frog.playerId');
  if (!playerId) {
    playerId = uuid();
    localStorage.setItem('frog.playerId', playerId);
  }
  let myName = null;
  let myPublicId = localStorage.getItem('frog.publicId') || null;

  // 서버 주소: window.FROG_SERVER (index.html에서 설정) 또는 URL 파라미터 ?server=https://xxx
  const urlParams = new URLSearchParams(window.location.search);
  const SERVER_URL = urlParams.get('server') || window.FROG_SERVER || '';

  let hasServer = false;
  async function detectServer() {
    if (!SERVER_URL) {
      // SERVER_URL 없으면 같은 도메인에서 시도 (로컬 서버 직접 접속)
      try {
        const r = await fetch('/api/leaderboard', { cache: 'no-store' });
        hasServer = r.ok && Array.isArray(await r.json());
      } catch { hasServer = false; }
      return;
    }
    try {
      const base = SERVER_URL.replace(/\/$/, '');
      const r = await fetch(`${base}/api/leaderboard`, { cache: 'no-store' });
      hasServer = r.ok && Array.isArray(await r.json());
    } catch { hasServer = false; }
  }

  async function api(path, body) {
    const base = SERVER_URL ? SERVER_URL.replace(/\/$/, '') : '';
    const fullPath = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
    const res = await fetch(fullPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ...data };
  }

  // ---------- 로컬(오프라인) 기록 모드 ----------
  function localBest() { return parseInt(localStorage.getItem('frog.localBest') || '0', 10); }
  function localBoard() {
    return myName ? [{ id: 'local', name: myName, best: localBest() }] : [];
  }

  // ---------- 실시간 리더보드 ----------
  let prevScores = new Map();
  function renderLeaderboard(rows) {
    lbList.innerHTML = '';
    const crowns = ['👑', '👑', '👑'];
    rows.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = `rank-${i + 1}`;
      if (myPublicId && r.id === myPublicId) li.classList.add('me');
      const prev = prevScores.get(r.id);
      if (prev !== undefined && prev !== r.best) li.classList.add('updated');
      const rank = i < 3 ? crowns[i] : `${i + 1}.`;
      li.innerHTML = `<span class="rank">${rank}</span><span class="nm"></span><span class="sc">${r.best}</span>`;
      li.querySelector('.nm').textContent = r.name;
      lbList.appendChild(li);
    });
    prevScores = new Map(rows.map((r) => [r.id, r.best]));
  }

  function connectSSE() {
    const base = SERVER_URL ? SERVER_URL.replace(/\/$/, '') : '';
    // Cloudflare Tunnel 환경에서 SSE 버퍼링 문제 우회: 폴링 방식 사용
    async function poll() {
      try {
        const r = await fetch(`${base}/api/leaderboard`, { cache: 'no-store' });
        if (r.ok) renderLeaderboard(await r.json());
      } catch {}
    }
    poll();
    setInterval(poll, 3000);
  }

  // ---------- 사운드 (WebAudio 합성) ----------
  let actx = null;
  function audio() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freqFrom, freqTo, dur, type, vol) {
    try {
      const ac = audio();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freqFrom, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + dur);
    } catch {}
  }
  const sfx = {
    open: () => tone(500, 900, 0.09, 'square', 0.05),
    block: () => { tone(300, 700, 0.12, 'square', 0.09); tone(900, 1400, 0.18, 'triangle', 0.06); },
    miss: () => { tone(280, 70, 0.4, 'sawtooth', 0.11); },
    fail: () => { tone(220, 55, 0.9, 'sawtooth', 0.12); tone(110, 40, 1.1, 'square', 0.08); },
  };

  // ---------- 이미지 로드 ----------
  const IMG = {};
  function loadImage(key, src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { IMG[key] = img; resolve(); };
      img.onerror = reject;
      img.src = src;
    });
  }

  // ---------- 게임 상태 ----------
  const G = {
    state: 'boot', // boot | name | ready | playing | fail | over
    W: 0, H: 0, dpr: 1,
    score: 0,
    lives: 3,
    busIndex: 0,       // 지나간 버스 수 (속도 증가 기준)
    bus: null,         // { x, judged, splashing }
    nextBusAt: 0,
    umbrellaOpenUntil: 0,
    umbrellaCooldownUntil: 0,
    shakeUntil: 0,
    frogWetUntil: 0,
    puddleFrac: Math.random(),
    time: 0,
    rain: [],
    drops: [],         // 물튀김 파티클
    ripples: [],
  };

  const OPEN_MS = 350;      // 우산 펼침 유지 시간 (판정 윈도우)
  const COOLDOWN_MS = 280;  // 접힌 뒤 재사용 대기

  function umbrellaOpen() { return performance.now() < G.umbrellaOpenUntil; }

  // ---------- 레이아웃 ----------
  const L = {};
  function layout() {
    G.dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.W = window.innerWidth;
    G.H = window.innerHeight;
    canvas.width = G.W * G.dpr;
    canvas.height = G.H * G.dpr;
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);

    const { W, H } = G;
    L.roadTop = H * 0.58;
    L.laneY = H * 0.79;                    // 버스 바퀴 라인
    L.sideTop = H * 0.80;                  // 인도 시작
    L.frogW = Math.min(Math.max(H * 0.36, 220), W * 0.24);
    L.frogX = W * 0.52;
    const rx = Math.max(W * 0.05, 65);
    L.puddle = { x: puddleXFromFrac(G.puddleFrac), y: H * 0.79, rx, ry: rx * 0.26 };
    L.frogBottom = H * 0.99;
    L.busH = Math.min(H * 0.30, 340);
    L.busW = L.busH * (IMG.bus ? IMG.bus.width / IMG.bus.height : 1.43);
    // 우산 판정/충돌 원 (펼친 우산 캔버스 위치)
    const frogH = L.frogW * (IMG.frogOpen ? IMG.frogOpen.height / IMG.frogOpen.width : 0.81);
    L.umb = { x: L.frogX - L.frogW * 0.22, y: L.frogBottom - frogH * 0.82, r: L.frogW * 0.42 };

    // 빗줄기 재생성
    G.rain = [];
    const n = Math.floor((W * H) / 9000);
    for (let i = 0; i < n; i++) {
      G.rain.push({
        x: Math.random() * (W + 200) - 100,
        y: Math.random() * H,
        len: 14 + Math.random() * 22,
        sp: H * (0.9 + Math.random() * 0.7),
      });
    }
  }
  window.addEventListener('resize', layout);

  // ---------- 속도 ----------
  // 웅덩이 랜덤 구간: 개구리 앞쪽 근처 절반 + 개구리 뒤쪽 절반
  // (화면 맨 앞(왼쪽 끝)과 개구리에 가려지는 정중앙은 제외)
  function puddleXFromFrac(frac) {
    const fw = L.frogW;
    if (frac < 0.5) {
      const min = L.frogX - fw * 1.5, max = L.frogX - fw * 0.6;
      return min + (max - min) * (frac * 2);
    }
    const min = L.frogX + fw * 0.6;
    const max = Math.min(L.frogX + fw * 1.5, G.W * 0.92);
    return min + (max - min) * ((frac - 0.5) * 2);
  }

  function placePuddle() {
    G.puddleFrac = Math.random();
    L.puddle.x = puddleXFromFrac(G.puddleFrac);
  }

  function speedFactor() { return Math.min(1 + G.busIndex * 0.18, 3.8); }
  function busSpeed() { return G.W * 0.44 * speedFactor(); }

  // ---------- 팝업 ----------
  function popup(text, cls, x, y) {
    const el = document.createElement('div');
    el.className = `popup ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    popupLayer.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // ---------- 파티클 ----------
  function burstSplash(blocked) {
    const { puddle } = L;
    const n = blocked ? 46 : 60;
    for (let i = 0; i < n; i++) {
      const toFrog = (L.frogX - puddle.x) * (0.2 + Math.random() * 0.9);
      G.drops.push({
        x: puddle.x + (Math.random() - 0.5) * puddle.rx * 1.2,
        y: puddle.y - 4,
        vx: toFrog * (0.8 + Math.random()) + (Math.random() - 0.5) * G.W * 0.06,
        vy: -G.H * (0.55 + Math.random() * 0.75),
        r: 2.5 + Math.random() * 5,
        life: 0.9 + Math.random() * 0.4,
        blocked,
      });
    }
    G.ripples.push({ x: puddle.x, y: puddle.y, r: puddle.rx * 0.3, max: puddle.rx * 1.6, a: 0.8 });
  }

  function wheelSpray() {
    // 버스가 웅덩이 위를 지날 때 바퀴 뒤 잔물보라
    const { puddle } = L;
    for (let i = 0; i < 3; i++) {
      G.drops.push({
        x: puddle.x + (Math.random() - 0.5) * puddle.rx,
        y: puddle.y - 2,
        vx: -G.W * (0.05 + Math.random() * 0.1),
        vy: -G.H * (0.15 + Math.random() * 0.3),
        r: 1.5 + Math.random() * 3,
        life: 0.5 + Math.random() * 0.3,
        blocked: false,
      });
    }
  }

  // ---------- 판정 ----------
  function judge() {
    const now = performance.now();
    if (umbrellaOpen()) {
      G.score += 1;
      scoreEl.textContent = G.score;
      // 우산을 펼친 순간부터 판정 성공까지 유지되도록 살짝 연장
      G.umbrellaOpenUntil = Math.max(G.umbrellaOpenUntil, now + 250);
      burstSplash(true);
      popup('막았지롱~', 'block', L.umb.x, L.umb.y - L.umb.r * 0.6);
      sfx.block();
      submitScore(G.score);
    } else {
      G.lives -= 1;
      renderLives();
      G.frogWetUntil = now + 700;
      G.shakeUntil = now + 350;
      burstSplash(false);
      popup('으악!', 'ouch', L.frogX, L.frogBottom - L.frogW * 0.5);
      sfx.miss();
      if (G.lives <= 0) gameOver();
    }
  }

  async function submitScore(score) {
    if (!hasServer) {
      if (score > localBest()) {
        localStorage.setItem('frog.localBest', String(score));
        renderLeaderboard(localBoard());
      }
      return;
    }
    try { await api('api/score', { playerId, score }); } catch {}
  }

  function gameOver() {
    G.state = 'fail';
    failStamp.classList.remove('hidden');
    failStamp.style.animation = 'none';
    void failStamp.offsetWidth; // 애니메이션 재시작
    failStamp.style.animation = '';
    sfx.fail();
    submitScore(G.score);
    setTimeout(async () => {
      failStamp.classList.add('hidden');
      $('final-score').textContent = G.score;
      let bestMsg = '';
      if (hasServer) {
        try {
          const r = await api('api/score', { playerId, score: G.score });
          bestMsg = r.best <= G.score ? '🎉 신기록 달성!' : `내 최고 기록: ${r.best}점`;
        } catch {}
      } else {
        bestMsg = localBest() <= G.score ? '🎉 신기록 달성!' : `내 최고 기록: ${localBest()}점`;
      }
      $('best-msg').textContent = bestMsg;
      modalOver.classList.remove('hidden');
      G.state = 'over';
    }, 1500);
  }

  // ---------- 라이프 ----------
  function renderLives() {
    livesBox.textContent = '❤️'.repeat(Math.max(G.lives, 0)) + '🖤'.repeat(Math.max(3 - G.lives, 0));
  }

  // ---------- 조작 ----------
  function tryOpenUmbrella() {
    const now = performance.now();
    if (G.state !== 'playing') return;
    if (umbrellaOpen() || now < G.umbrellaCooldownUntil) return;
    G.umbrellaOpenUntil = now + OPEN_MS;
    G.umbrellaCooldownUntil = now + OPEN_MS + COOLDOWN_MS;
    sfx.open();
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    if (e.target.tagName === 'INPUT') return;
    e.preventDefault();
    if (e.repeat) return;
    audio();
    if (G.state === 'playing') tryOpenUmbrella();
    else if (G.state === 'ready' && !modalStart.classList.contains('hidden')) startGame();
    else if (G.state === 'over') restart();
  });
  window.addEventListener('pointerdown', () => {
    if (G.state === 'playing') { audio(); tryOpenUmbrella(); }
  });

  // ---------- 게임 흐름 ----------
  function startGame() {
    modalStart.classList.add('hidden');
    hud.classList.remove('hidden');
    document.documentElement.requestFullscreen?.().catch(() => {});
    resetRun();
    G.state = 'playing';
  }

  function restart() {
    modalOver.classList.add('hidden');
    resetRun();
    G.state = 'playing';
  }

  function resetRun() {
    G.score = 0;
    G.lives = 3;
    G.busIndex = 0;
    G.bus = null;
    G.nextBusAt = performance.now() + 1300;
    G.drops = [];
    G.umbrellaOpenUntil = 0;
    G.umbrellaCooldownUntil = 0;
    scoreEl.textContent = '0';
    speedEl.textContent = '1.0';
    renderLives();
  }

  // ---------- 등록 흐름 ----------
  async function ensureRegistered() {
    if (!hasServer) {
      const stored = localStorage.getItem('frog.name');
      if (stored) {
        myName = stored;
        myPublicId = 'local';
        renderLeaderboard(localBoard());
        return true;
      }
      return false;
    }
    try {
      const r = await api('api/register', { playerId });
      if (r.ok && r.existing) {
        myName = r.name;
        myPublicId = r.publicId;
        localStorage.setItem('frog.publicId', myPublicId);
        localStorage.setItem('frog.name', myName);
        return true;
      }
      const stored = localStorage.getItem('frog.name');
      if (stored) {
        const r2 = await api('api/register', { playerId, name: stored });
        if (r2.ok) {
          myName = r2.name;
          myPublicId = r2.publicId;
          localStorage.setItem('frog.publicId', myPublicId);
          return true;
        }
      }
    } catch {}
    return false;
  }

  function showNameModal() {
    G.state = 'name';
    modalName.classList.remove('hidden');
    const input = $('name-input');
    const err = $('name-error');
    input.focus();
    async function submit() {
      const name = input.value.trim();
      if (!name) { err.textContent = '닉네임을 입력해줘!'; return; }
      if (!hasServer) {
        myName = name;
        myPublicId = 'local';
        localStorage.setItem('frog.name', name);
        renderLeaderboard(localBoard());
        modalName.classList.add('hidden');
        showStart();
        return;
      }
      $('name-btn').disabled = true;
      try {
        const r = await api('api/register', { playerId, name });
        if (r.ok) {
          myName = r.name;
          myPublicId = r.publicId;
          localStorage.setItem('frog.name', myName);
          localStorage.setItem('frog.publicId', myPublicId);
          modalName.classList.add('hidden');
          showStart();
        } else if (r.error === 'name_taken') {
          err.textContent = '이미 있는 이름이야! 다른 이름으로 해줘';
        } else {
          err.textContent = '등록 실패… 다시 시도해줘';
        }
      } catch {
        err.textContent = '서버 연결 실패… 서버가 켜져 있나?';
      }
      $('name-btn').disabled = false;
    }
    $('name-btn').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  function showStart() {
    G.state = 'ready';
    $('welcome-msg').innerHTML = `<b>${myName}</b> 개구리, 준비됐어? 🌧️`;
    modalStart.classList.remove('hidden');
  }
  $('start-btn').addEventListener('click', startGame);
  $('retry-btn').addEventListener('click', restart);

  // ---------- 렌더링 ----------
  function drawBackground() {
    const { W, H } = G;
    const img = IMG.city;
    // cover 크롭 (도로가 보이도록 살짝 아래 포커스)
    const scale = Math.max(W / img.width, (H * 0.9) / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2, Math.min(0, H * 0.62 - dh * 0.62), dw, dh);
    // 비 오는 밤 무드
    ctx.fillStyle = 'rgba(18, 26, 48, 0.42)';
    ctx.fillRect(0, 0, W, H);
  }

  function drawRoad() {
    const { W, H } = G;
    // 차도
    ctx.fillStyle = '#343947';
    ctx.fillRect(0, L.roadTop, W, L.sideTop - L.roadTop);
    // 차선
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(H * 0.008, 4);
    ctx.setLineDash([H * 0.05, H * 0.045]);
    ctx.beginPath();
    ctx.moveTo(0, L.roadTop + (L.sideTop - L.roadTop) * 0.42);
    ctx.lineTo(W, L.roadTop + (L.sideTop - L.roadTop) * 0.42);
    ctx.stroke();
    ctx.setLineDash([]);
    // 인도 (종이 느낌 연한 톤 + 경계석)
    ctx.fillStyle = '#4c5163';
    ctx.fillRect(0, L.sideTop, W, H - L.sideTop);
    ctx.fillStyle = '#767d95';
    ctx.fillRect(0, L.sideTop, W, H * 0.012);
    // 젖은 바닥 반사 느낌
    const grad = ctx.createLinearGradient(0, L.sideTop, 0, H);
    grad.addColorStop(0, 'rgba(140,170,220,0.10)');
    grad.addColorStop(1, 'rgba(140,170,220,0.02)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, L.sideTop, W, H - L.sideTop);
  }

  function drawPuddle(t) {
    const { puddle } = L;
    ctx.save();
    ctx.translate(puddle.x, puddle.y);
    const g = ctx.createRadialGradient(0, 0, puddle.rx * 0.1, 0, 0, puddle.rx);
    g.addColorStop(0, 'rgba(140, 185, 235, 0.75)');
    g.addColorStop(0.75, 'rgba(80, 120, 185, 0.65)');
    g.addColorStop(1, 'rgba(60, 90, 150, 0.25)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, puddle.rx, puddle.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // 빗방울 파문
    const phase = (t / 900) % 1;
    for (let i = 0; i < 2; i++) {
      const p = (phase + i * 0.5) % 1;
      ctx.strokeStyle = `rgba(220, 240, 255, ${0.5 * (1 - p)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, puddle.rx * (0.2 + p * 0.75), puddle.ry * (0.2 + p * 0.75), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBus() {
    if (!G.bus) return;
    const img = IMG.bus;
    ctx.save();
    // 원본이 왼쪽을 보고 있어 좌→우 주행에 맞게 반전
    ctx.translate(G.bus.x + L.busW / 2, L.laneY - L.busH / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -L.busW / 2, -L.busH / 2, L.busW, L.busH);
    ctx.restore();
  }

  function drawFrog() {
    const open = umbrellaOpen();
    const img = open ? IMG.frogOpen : IMG.frogClosed;
    const w = L.frogW;
    const h = w * (img.height / img.width);
    const x = L.frogX - w / 2;
    const y = L.frogBottom - h;
    ctx.save();
    if (performance.now() < G.frogWetUntil) {
      ctx.filter = 'saturate(0.8) brightness(0.72) hue-rotate(70deg)';
    }
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  function drawDrops(dt) {
    const gravity = G.H * 2.3;
    const umb = L.umb;
    for (let i = G.drops.length - 1; i >= 0; i--) {
      const d = G.drops[i];
      d.life -= dt;
      if (d.life <= 0 || d.y > G.H + 20) { G.drops.splice(i, 1); continue; }
      d.vy += gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      // 우산에 막히면 튕겨나감
      if (d.blocked) {
        const dx = d.x - umb.x, dy = d.y - umb.y;
        const dist = Math.hypot(dx, dy);
        if (dist < umb.r && dy < umb.r * 0.3) {
          const nx = dx / (dist || 1), ny = dy / (dist || 1);
          const dot = d.vx * nx + d.vy * ny;
          if (dot < 0) {
            d.vx = (d.vx - 2 * dot * nx) * 0.4;
            d.vy = (d.vy - 2 * dot * ny) * 0.4;
            d.x = umb.x + nx * umb.r;
            d.y = umb.y + ny * umb.r;
          }
        }
      }
      ctx.fillStyle = `rgba(190, 220, 250, ${Math.min(d.life, 0.9)})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRipples(dt) {
    for (let i = G.ripples.length - 1; i >= 0; i--) {
      const r = G.ripples[i];
      r.r += (r.max - r.r) * dt * 4;
      r.a -= dt * 1.6;
      if (r.a <= 0) { G.ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(230, 245, 255, ${r.a})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawRain(dt) {
    const { W, H } = G;
    ctx.strokeStyle = 'rgba(200, 222, 255, 0.34)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const r of G.rain) {
      r.y += r.sp * dt;
      r.x -= r.sp * dt * 0.16;
      if (r.y > H) { r.y = -r.len; r.x = Math.random() * (W + 200) - 100; }
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - r.len * 0.16, r.y + r.len);
    }
    ctx.stroke();
  }

  // ---------- 메인 루프 ----------
  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    const { W, H } = G;
    if (W !== window.innerWidth || H !== window.innerHeight) layout();

    ctx.fillStyle = '#1a2030';
    ctx.fillRect(0, 0, G.W, G.H);
    ctx.save();
    if (t < G.shakeUntil) {
      ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    }

    drawBackground();
    drawRoad();
    drawPuddle(t);

    // 버스 스폰/이동/판정
    if (G.state === 'playing' || G.state === 'fail') {
      if (!G.bus && G.state === 'playing' && t >= G.nextBusAt) {
        placePuddle(); // 버스마다 웅덩이 위치 랜덤
        G.bus = { x: -L.busW - 20, judged: false };
      }
      if (G.bus) {
        G.bus.x += busSpeed() * dt;
        const frontX = G.bus.x + L.busW * 0.9;
        // 바퀴가 웅덩이 위를 지나는 동안 잔물보라
        if (frontX > L.puddle.x - L.puddle.rx && G.bus.x + L.busW * 0.1 < L.puddle.x + L.puddle.rx) {
          wheelSpray();
        }
        if (!G.bus.judged && G.state === 'playing' && frontX >= L.puddle.x) {
          G.bus.judged = true;
          judge();
        }
        if (G.bus.x > G.W + 40) {
          G.bus = null;
          G.busIndex += 1;
          speedEl.textContent = speedFactor().toFixed(1);
          G.nextBusAt = t + (600 + Math.random() * 900) / speedFactor();
        }
      }
    }

    drawBus();
    drawRipples(dt);
    drawFrog();
    drawDrops(dt);
    drawRain(dt);

    ctx.restore();
    requestAnimationFrame(frame);
  }

  // ---------- 부팅 ----------
  async function boot() {
    await Promise.all([
      loadImage('frogOpen', 'assets/frog_open.png'),
      loadImage('frogClosed', 'assets/frog_closed.png'),
      loadImage('bus', 'assets/bus.png'),
      loadImage('city', 'assets/city.jpg'),
    ]);
    layout();
    renderLives();
    requestAnimationFrame(frame);
    await detectServer();
    if (hasServer) {
      connectSSE();
    } else {
      // GitHub Pages 등 정적 호스팅: 이 브라우저 기록만 저장됨
      document.querySelector('#leaderboard h3').textContent = '🏆 내 최고 기록';
    }
    const ok = await ensureRegistered();
    if (ok) showStart();
    else showNameModal();
  }
  boot();
})();
