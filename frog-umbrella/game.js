// 🐸 개구리 우산 대작전 — Firebase 실시간 랭킹 버전
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

  // ---------- Firebase ----------
  const db = firebase.database();
  const playersRef = db.ref('players');

  // ---------- 유저 식별 ----------
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
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
  // Firebase key에 사용할 수 없는 문자 제거
  const fbKey = playerId.replace(/[.#$\/\[\]]/g, '_');
  let myName = null;

  // ---------- 실시간 리더보드 ----------
  let prevScores = new Map();
  function renderLeaderboard(rows) {
    lbList.innerHTML = '';
    const crowns = ['👑', '👑', '👑'];
    rows.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = `rank-${i + 1}`;
      if (r.id === fbKey) li.classList.add('me');
      const prev = prevScores.get(r.id);
      if (prev !== undefined && prev !== r.best) li.classList.add('updated');
      const rank = i < 3 ? crowns[i] : `${i + 1}.`;
      li.innerHTML = `<span class="rank">${rank}</span><span class="nm"></span><span class="sc">${r.best}</span>`;
      li.querySelector('.nm').textContent = r.name;
      lbList.appendChild(li);
    });
    prevScores = new Map(rows.map((r) => [r.id, r.best]));
  }

  // Firebase 실시간 리스너
  function listenLeaderboard() {
    playersRef.orderByChild('best').on('value', (snap) => {
      const rows = [];
      snap.forEach((child) => {
        const v = child.val();
        rows.push({ id: child.key, name: v.name, best: v.best });
      });
      rows.sort((a, b) => b.best - a.best || a.name.localeCompare(b.name));
      renderLeaderboard(rows);
    });
  }

  // ---------- 점수 제출 ----------
  async function submitScore(score) {
    try {
      const snap = await playersRef.child(fbKey).once('value');
      const current = snap.val();
      if (current && score > current.best) {
        await playersRef.child(fbKey).update({ best: score, updatedAt: Date.now() });
      }
    } catch {}
  }

  // ---------- 등록 ----------
  async function ensureRegistered() {
    try {
      const snap = await playersRef.child(fbKey).once('value');
      if (snap.exists()) {
        myName = snap.val().name;
        localStorage.setItem('frog.name', myName);
        return true;
      }
      const stored = localStorage.getItem('frog.name');
      if (stored) {
        await playersRef.child(fbKey).set({ name: stored, best: 0, updatedAt: Date.now() });
        myName = stored;
        return true;
      }
    } catch {}
    return false;
  }

  async function registerName(name) {
    // 중복 이름 체크
    const snap = await playersRef.once('value');
    let taken = false;
    snap.forEach((child) => {
      if (child.val().name.toLowerCase() === name.toLowerCase()) taken = true;
    });
    if (taken) return { error: 'name_taken' };
    await playersRef.child(fbKey).set({ name, best: 0, updatedAt: Date.now() });
    myName = name;
    localStorage.setItem('frog.name', name);
    return { ok: true };
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
    state: 'boot',
    W: 0, H: 0, dpr: 1,
    score: 0,
    lives: 3,
    busIndex: 0,
    bus: null,
    nextBusAt: 0,
    umbrellaOpenUntil: 0,
    umbrellaCooldownUntil: 0,
    shakeUntil: 0,
    frogWetUntil: 0,
    puddleFrac: Math.random(),
    time: 0,
    rain: [],
    drops: [],
    ripples: [],
  };

  const OPEN_MS = 350;
  const COOLDOWN_MS = 280;

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
    L.laneY = H * 0.79;
    L.sideTop = H * 0.80;
    L.frogW = Math.min(Math.max(H * 0.36, 220), W * 0.24);
    L.frogX = W * 0.52;
    const rx = Math.max(W * 0.05, 65);
    L.puddle = { x: puddleXFromFrac(G.puddleFrac), y: H * 0.79, rx, ry: rx * 0.26 };
    L.frogBottom = H * 0.99;
    L.busH = Math.min(H * 0.30, 340);
    L.busW = L.busH * (IMG.bus ? IMG.bus.width / IMG.bus.height : 1.43);
    const frogH = L.frogW * (IMG.frogOpen ? IMG.frogOpen.height / IMG.frogOpen.width : 0.81);
    L.umb = { x: L.frogX - L.frogW * 0.22, y: L.frogBottom - frogH * 0.82, r: L.frogW * 0.42 };

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

  // ---------- 웅덩이 위치 ----------
  // 개구리 바로 앞(왼쪽)~뒤(오른쪽) 범위, 너무 멀리 앞은 제외
  function puddleXFromFrac(frac) {
    const fw = L.frogW;
    // 최소 위치: 개구리 왼쪽으로 frogW * 1.0 (너무 앞 제외)
    // 최대 위치: 개구리 오른쪽으로 frogW * 1.2
    const min = L.frogX - fw * 1.0;
    const max = Math.min(L.frogX + fw * 1.2, G.W * 0.88);
    // 개구리 몸통 위(중앙 근처)는 피하기
    const mid1 = L.frogX - fw * 0.3;
    const mid2 = L.frogX + fw * 0.3;
    let x;
    if (frac < 0.5) {
      // 왼쪽 구간: min ~ mid1
      x = min + (mid1 - min) * (frac * 2);
    } else {
      // 오른쪽 구간: mid2 ~ max
      x = mid2 + (max - mid2) * ((frac - 0.5) * 2);
    }
    return x;
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

  function gameOver() {
    G.state = 'fail';
    failStamp.classList.remove('hidden');
    failStamp.style.animation = 'none';
    void failStamp.offsetWidth;
    failStamp.style.animation = '';
    sfx.fail();
    submitScore(G.score);
    setTimeout(async () => {
      failStamp.classList.add('hidden');
      $('final-score').textContent = G.score;
      let bestMsg = '';
      try {
        const snap = await playersRef.child(fbKey).once('value');
        const val = snap.val();
        bestMsg = (val && val.best <= G.score) ? '🎉 신기록 달성!' : `내 최고 기록: ${val ? val.best : 0}점`;
      } catch {
        bestMsg = '';
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
  function showNameModal() {
    G.state = 'name';
    modalName.classList.remove('hidden');
    const input = $('name-input');
    const err = $('name-error');
    input.focus();
    async function submit() {
      const name = input.value.trim();
      if (!name) { err.textContent = '닉네임을 입력해줘!'; return; }
      $('name-btn').disabled = true;
      try {
        const r = await registerName(name);
        if (r.ok) {
          modalName.classList.add('hidden');
          showStart();
        } else if (r.error === 'name_taken') {
          err.textContent = '이미 있는 이름이야! 다른 이름으로 해줘';
        }
      } catch {
        err.textContent = '연결 실패… 다시 시도해줘';
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
    const scale = Math.max(W / img.width, (H * 0.9) / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2, Math.min(0, H * 0.62 - dh * 0.62), dw, dh);
    ctx.fillStyle = 'rgba(18, 26, 48, 0.42)';
    ctx.fillRect(0, 0, W, H);
  }

  function drawRoad() {
    const { W, H } = G;
    ctx.fillStyle = '#343947';
    ctx.fillRect(0, L.roadTop, W, L.sideTop - L.roadTop);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(H * 0.008, 4);
    ctx.setLineDash([H * 0.05, H * 0.045]);
    ctx.beginPath();
    ctx.moveTo(0, L.roadTop + (L.sideTop - L.roadTop) * 0.42);
    ctx.lineTo(W, L.roadTop + (L.sideTop - L.roadTop) * 0.42);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4c5163';
    ctx.fillRect(0, L.sideTop, W, H - L.sideTop);
    ctx.fillStyle = '#767d95';
    ctx.fillRect(0, L.sideTop, W, H * 0.012);
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

    if (G.state === 'playing' || G.state === 'fail') {
      if (!G.bus && G.state === 'playing' && t >= G.nextBusAt) {
        placePuddle();
        G.bus = { x: -L.busW - 20, judged: false };
      }
      if (G.bus) {
        G.bus.x += busSpeed() * dt;
        const frontX = G.bus.x + L.busW * 0.9;
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
    listenLeaderboard();
    const ok = await ensureRegistered();
    if (ok) showStart();
    else showNameModal();
  }
  boot();
})();
