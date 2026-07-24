const PIECES = [
  { type: 'sheep',    src: 'assets/sheep.png',    label: '양',     w: 170 },
  { type: 'moon',     src: 'assets/moon.png',     label: '달',     w: 155 },
  { type: 'phone',    src: 'assets/phone.png',    label: '전화기', w: 190 },
  { type: 'cloud',    src: 'assets/cloud.png',    label: '비구름', w: 280 },
  { type: 'fire',     src: 'assets/fire.png',     label: '불',     w: 160 },
  { type: 'house',    src: 'assets/house.png',    label: '집',     w: 330 },
  { type: 'flower',   src: 'assets/flower.png',   label: '꽃',     w: 125 },
  { type: 'dog',      src: 'assets/dog.png',      label: '개',     w: 240 },
  { type: 'umbrella', src: 'assets/umbrella.png', label: '우산',   w: 185 },
];

const ABORT = Symbol('abort');
const COUNT_KEY = 'cutout_cinema_count';

const $ = id => document.getElementById(id);
const stage = $('stage'), tray = $('tray'), hand = $('hand'),
      subtitle = $('subtitle'), hints = $('hints'), ending = $('ending'),
      toast = $('toast'), posterCanvas = $('posterCanvas');

let drag = null;          // {el, fromTray}
let currentShow = null;   // {aborted, typing, skipType, advance}
let endResolve = null;

/* ── 트레이 & 드래그 ── */
PIECES.forEach(def => {
  const item = document.createElement('div');
  item.className = 'tray-item';
  item.innerHTML = `<img class="te" src="${def.src}" alt="${def.label}" draggable="false"><div class="tl">${def.label}</div>`;
  item.addEventListener('pointerdown', e => {
    if (document.body.classList.contains('cinema')) return;
    e.preventDefault();
    const el = createPiece(def);
    stage.appendChild(el);
    positionPiece(el, e.clientX, e.clientY);
    beginDrag(el, e);
  });
  tray.appendChild(item);
});

function createPiece(def) {
  const el = document.createElement('img');
  el.className = 'piece';
  el.src = def.src;
  el.alt = def.label;
  el.draggable = false;
  el.style.width = def.w + 'px';
  el.dataset.type = def.type;
  el.dataset.label = def.label;
  el.dataset.src = def.src;
  el.title = def.label + ' (더블클릭으로 제거)';
  el.addEventListener('pointerdown', e => {
    if (document.body.classList.contains('cinema')) return;
    e.preventDefault();
    beginDrag(el, e);
  });
  el.addEventListener('dblclick', () => {
    if (document.body.classList.contains('cinema')) return;
    el.remove();
    updateHints();
  });
  return el;
}

function beginDrag(el, e) {
  drag = { el };
  el.classList.add('dragging');
  hand.style.display = 'block';
  moveHand(e.clientX, e.clientY);
}

function positionPiece(el, cx, cy) {
  const x = Math.min(98, Math.max(2, cx / innerWidth * 100));
  const y = Math.min(96, Math.max(4, cy / innerHeight * 100));
  el.style.left = x + '%';
  el.style.top = y + '%';
  el.dataset.x = x.toFixed(1);
  el.dataset.y = y.toFixed(1);
}

function moveHand(cx, cy) {
  hand.style.left = (cx + 30) + 'px';
  hand.style.top = (cy - 34) + 'px';
}

addEventListener('pointermove', e => {
  if (!drag) return;
  positionPiece(drag.el, e.clientX, e.clientY);
  moveHand(e.clientX, e.clientY);
});

addEventListener('pointerup', e => {
  if (!drag) return;
  const overTray = e.clientY > tray.getBoundingClientRect().top - 8;
  drag.el.classList.remove('dragging');
  hand.style.display = 'none';
  if (overTray) drag.el.remove();
  else audio.blip();
  drag = null;
  updateHints();
});

function updateHints() {
  hints.style.opacity = stage.children.length ? 0 : 1;
}

/* ── 상영 컨텍스트 ── */
function buildCtx() {
  const placed = [...stage.querySelectorAll('.piece')].map(el => ({
    type: el.dataset.type, label: el.dataset.label, src: el.dataset.src,
    x: +el.dataset.x, y: +el.dataset.y,
    wPct: el.getBoundingClientRect().width / innerWidth * 100,
  }));
  return {
    placed,
    has: t => placed.some(p => p.type === t),
    count: t => placed.filter(p => p.type === t).length,
    zone: t => {
      const p = placed.find(p => p.type === t);
      return p ? (p.y < 62 ? '하늘' : '들판') : null;
    },
    list: [...new Set(placed.map(p => p.label))].join(', '),
  };
}

function pickScenario(ctx) {
  return SCENARIOS.slice().sort((a, b) => b.priority - a.priority).find(s => s.match(ctx));
}

/* ── 상영 엔진 ── */
function typeText(text, st) {
  subtitle.textContent = '';
  subtitle.classList.add('typing');
  st.typing = true;
  st.skipType = false;
  return new Promise((res, rej) => {
    let i = 0;
    (function tick() {
      if (st.aborted) { subtitle.classList.remove('typing'); st.typing = false; return rej(ABORT); }
      if (st.skipType || i >= text.length) {
        subtitle.textContent = text;
        subtitle.classList.remove('typing');
        st.typing = false;
        return res();
      }
      i++;
      subtitle.textContent = text.slice(0, i);
      setTimeout(tick, 45);
    })();
  });
}

function holdWait(ms, st) {
  return new Promise((res, rej) => {
    const t = setTimeout(done, ms);
    const iv = setInterval(() => { if (st.aborted) { clean(); rej(ABORT); } }, 120);
    st.advance = done;
    function done() { clean(); res(); }
    function clean() { clearTimeout(t); clearInterval(iv); st.advance = null; }
  });
}

// fx: {piece, anim?, move?}
// move: {to:[x,y]} 절대좌표 | {near:'type',dx,dy} 다른 조각 곁으로 | {by:[dx,dy]} 상대이동
//       {converge:true,k} 같은 타입끼리 모이기 | {scatter:true,spread} 흩어지기 | dur(ms)
function applyFx(fxList) {
  const touched = [], timers = [];
  (fxList || []).forEach(f => {
    const els = [...stage.querySelectorAll(`.piece[data-type="${f.piece}"]`)];
    if (!els.length) return;
    let targets = [];
    if (f.move) {
      const m = f.move;
      const xs = els.map(e => +e.dataset.x), ys = els.map(e => +e.dataset.y);
      const cx = xs.reduce((a, b) => a + b, 0) / els.length;
      const cy = ys.reduce((a, b) => a + b, 0) / els.length;
      const all = [...stage.querySelectorAll('.piece')];
      const gx = all.reduce((s, e) => s + +e.dataset.x, 0) / all.length;
      const gy = all.reduce((s, e) => s + +e.dataset.y, 0) / all.length;
      targets = els.map((el, i) => {
        if (m.to) return m.to;
        if (m.near) {
          const other = stage.querySelector(`.piece[data-type="${m.near}"]`);
          return other ? [+other.dataset.x + (m.dx || 0), +other.dataset.y + (m.dy || 0)] : null;
        }
        if (m.gather) {
          const k = m.k ?? 0.3;
          return [xs[i] + (gx - xs[i]) * k, ys[i] + (gy - ys[i]) * k];
        }
        if (m.converge) {
          const k = m.k ?? 0.75;
          return [xs[i] + (cx - xs[i]) * k, ys[i] + (cy - ys[i]) * k];
        }
        if (m.scatter) {
          const s = m.spread ?? 14;
          return [xs[i] + (i % 2 ? -1 : 1) * (s + i * 4), ys[i] + ((i * 7) % 3 - 1) * 7];
        }
        if (m.by) return [xs[i] + m.by[0], ys[i] + m.by[1]];
        return null;
      });
    }
    els.forEach((el, i) => {
      if (f.anim) {
        el.classList.add('fx-' + f.anim);
        touched.push([el, 'fx-' + f.anim]);
      }
      if (f.move && targets[i]) {
        const dur = f.move.dur || 2600;
        const tx = Math.min(96, Math.max(4, targets[i][0]));
        const ty = Math.min(92, Math.max(6, targets[i][1]));
        if (!f.anim) {
          el.classList.add('fx-walk');
          touched.push([el, 'fx-walk']);
        }
        el.style.transition = `left ${dur}ms cubic-bezier(.5,.08,.35,1), top ${dur}ms cubic-bezier(.5,.08,.35,1)`;
        el.style.left = tx + '%';
        el.style.top = ty + '%';
        el.dataset.x = tx;
        el.dataset.y = ty;
        timers.push(setTimeout(() => { el.style.transition = ''; }, dur + 80));
      }
    });
  });
  return () => {
    touched.forEach(([el, cl]) => el.classList.remove(cl));
    timers.forEach(clearTimeout);
  };
}

function snapshotPositions() {
  return [...stage.querySelectorAll('.piece')].map(el => [el, el.dataset.x, el.dataset.y]);
}

function restorePositions(snap) {
  snap.forEach(([el, x, y]) => {
    if (!el.isConnected) return;
    el.style.transition = 'none';
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.dataset.x = x;
    el.dataset.y = y;
    requestAnimationFrame(() => { el.style.transition = ''; });
  });
}

async function playScene(scene, ctx, st) {
  if (scene.bg) document.body.dataset.mood = scene.bg;
  const cleanup = applyFx(scene.fx);
  try {
    const text = typeof scene.sub === 'function' ? scene.sub(ctx) : scene.sub;
    await typeText(text, st);
    await holdWait(scene.hold ?? 3000, st);
  } finally {
    cleanup();
  }
}

// 본편 + 관계 비트 합성: 주연(stars)이 아닌 배치 조각은
// 주연 하나를 앵커로 사슬처럼 합류하고, 이후 본편 내내 서서히 다가오다 마지막 장면에 합류한다
function composeScenes(scn, ctx) {
  if (scn.buildScenes) return scn.buildScenes(ctx);
  const base = scn.scenes.map(s => ({ ...s, fx: [...(s.fx || [])] }));
  if (scn.stars === 'all') return base;
  const stars = new Set(scn.stars || []);
  const xOf = t => { const p = ctx.placed.find(q => q.type === t); return p ? p.x : 0; };
  const types = [...new Set(ctx.placed.map(p => p.type))];
  const extras = types.filter(t => !stars.has(t)).sort((a, b) => xOf(a) - xOf(b));
  if (!extras.length) return base;
  const labelOf = t => ctx.placed.find(p => p.type === t).label;
  const anchor = types.find(t => stars.has(t));
  const chain = [];
  let prev = anchor;
  extras.forEach((t, i) => {
    const beat = prev ? pairBeat(prev, t, ctx) : cameoScene(t, ctx);
    if (beat) {
      if (typeof beat.sub === 'string') beat.sub = `${joinLine(labelOf(t), i)} ${beat.sub}`;
      chain.push(beat);
    }
    prev = t;
  });
  const at = Math.min(2, base.length - 1);
  base.splice(at, 0, ...chain);
  for (let i = at + chain.length; i < base.length; i++) {
    const k = i === base.length - 1 ? 0.5 : 0.12;
    extras.forEach(t => base[i].fx.push({ piece: t, move: { gather: true, k, dur: 3000 } }));
  }
  return base;
}

async function runScenes(scenes, ctx, st) {
  for (const scene of scenes) await playScene(scene, ctx, st);
}

async function startScreening() {
  if (currentShow) return;
  const ctx = buildCtx();
  const scn = pickScenario(ctx);
  const scenes = composeScenes(scn, ctx);
  const st = currentShow = { aborted: false };
  const snap = snapshotPositions();
  document.body.classList.add('cinema');
  audio.humStart();
  try {
    await runScenes(scenes, ctx, st);
    bumpCounter();
    let action;
    do {
      action = await showEnding(scn, ctx);
      if (action === 'replay') {
        restorePositions(snap);
        await runScenes(scenes, ctx, st);
      }
    } while (action === 'replay');
  } catch (e) {
    if (e !== ABORT) console.error(e);
  } finally {
    audio.humStop();
    restorePositions(snap);
    exitCinema();
  }
}

function exitCinema() {
  document.body.classList.remove('cinema');
  document.body.dataset.mood = 'day';
  subtitle.textContent = '';
  ending.classList.remove('show');
  currentShow = null;
}

function showEnding(scn, ctx) {
  $('endTitle').textContent = scn.title.ko;
  $('endEn').textContent = scn.title.en;
  const types = [...new Set(ctx.placed.map(p => p.type))];
  const labelOf = t => ctx.placed.find(p => p.type === t).label;
  const starSet = scn.stars === 'all' ? new Set(types) : new Set(scn.stars || []);
  const leads = types.filter(t => starSet.has(t)).map(labelOf);
  const supports = types.filter(t => !starSet.has(t)).map(labelOf);
  const credit = [
    leads.length ? `주연 ${leads.join(', ')}` : null,
    supports.length ? `조연 ${supports.join(', ')}` : null,
    '각본/감독 당신', '제작 오려낸 영화',
  ].filter(Boolean).join(' · ');
  $('endCast').textContent = credit;
  ending.classList.add('show');
  return new Promise(res => {
    endResolve = res;
    $('btnSave').onclick = () => savePoster(scn, ctx);
    $('btnReplay').onclick = () => { ending.classList.remove('show'); endResolve = null; res('replay'); };
    $('btnEdit').onclick = () => { ending.classList.remove('show'); endResolve = null; res('edit'); };
  });
}

function abortShow() {
  if (!currentShow) return;
  currentShow.aborted = true;
  if (endResolve) {
    const r = endResolve;
    endResolve = null;
    ending.classList.remove('show');
    r('edit');
  }
}

/* ── 클릭으로 장면 넘기기 ── */
document.addEventListener('click', e => {
  if (!document.body.classList.contains('cinema')) return;
  if (e.target.closest('button')) return;
  if (!currentShow) return;
  if (currentShow.typing) currentShow.skipType = true;
  else currentShow.advance && currentShow.advance();
});

/* ── 포스터 ── */
function drawChip(g, text, x, y, rot, size, bg = '#fff') {
  g.save();
  g.translate(x, y);
  g.rotate(rot * Math.PI / 180);
  g.font = `900 ${size}px 'Apple SD Gothic Neo', Pretendard, sans-serif`;
  const w = g.measureText(text).width;
  const padX = size * 0.32, padY = size * 0.26;
  g.shadowColor = 'rgba(0,0,0,.35)';
  g.shadowBlur = 18;
  g.shadowOffsetY = 8;
  g.fillStyle = bg;
  g.fillRect(-w / 2 - padX, -size / 2 - padY, w + padX * 2, size + padY * 2);
  g.shadowColor = 'transparent';
  g.fillStyle = '#111';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, size * 0.04);
  g.restore();
}

const _imgCache = {};
function loadImg(src) {
  if (_imgCache[src]) return _imgCache[src];
  return _imgCache[src] = new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

async function savePoster(scn, ctx) {
  const W = 1200, H = 1600;
  posterCanvas.width = W;
  posterCanvas.height = H;
  const g = posterCanvas.getContext('2d');
  const p = scn.poster || { sky: '#3D7BE8', grass: '#4FA53B' };

  g.fillStyle = p.sky;
  g.fillRect(0, 0, W, H);
  g.fillStyle = p.grass;
  g.fillRect(0, H * 0.66, W, H * 0.34);

  if (p.moon) {
    g.fillStyle = '#F5E9C8';
    g.beginPath(); g.arc(W * 0.84, H * 0.13, 64, 0, 7); g.fill();
  }
  g.fillStyle = '#E8B93D';
  [[0.08, 0.34], [0.91, 0.47], [0.13, 0.08]].forEach(([x, y]) => {
    g.beginPath(); g.arc(W * x, H * y, 24, 0, 7); g.fill();
  });

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const pc of ctx.placed) {
    try {
      const im = await loadImg(pc.src);
      const dw = pc.wPct / 100 * W * 1.25;
      const dh = dw * im.height / im.width;
      const cx = pc.x / 100 * W, cy = pc.y / 100 * H * 0.92;
      g.shadowColor = 'rgba(0,0,0,.35)';
      g.shadowBlur = 24;
      g.shadowOffsetY = 14;
      g.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh);
      g.shadowColor = 'transparent';
    } catch (e) { console.error('poster img', pc.src, e); }
  }

  const words = scn.title.ko.split(' ');
  words.forEach((w, i) => {
    drawChip(g, w, W * 0.5 + (i % 2 ? 60 : -30) * (words.length > 1 ? 1 : 0),
      H * (0.15 + i * 0.115), i % 2 ? 3 : -3, 110);
  });
  drawChip(g, scn.title.en, W * 0.5, H * (0.15 + words.length * 0.115), 1.5, 34, '#E8B93D');

  g.fillStyle = '#fff';
  g.font = `700 30px 'Apple SD Gothic Neo', Pretendard, sans-serif`;
  g.shadowColor = 'rgba(0,0,0,.5)';
  g.shadowBlur = 10;
  g.fillText('각본·감독 당신  ·  제작 오려낸 영화', W / 2, H * 0.94);
  g.shadowColor = 'transparent';

  posterCanvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = scn.title.en.toLowerCase().replace(/\s+/g, '-') + '-poster.png';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('포스터가 저장되었습니다');
  });
}

let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ── 사운드 ── */
const AC = window.AudioContext || window.webkitAudioContext;
const audio = {
  ctx: null, master: null, hum: null, muted: false,
  ensure() {
    if (!AC) return false;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },
  blip() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.09);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(t + 0.12);
  },
  humStart() {
    if (!this.ensure() || this.hum) return;
    const len = 2 * this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 300;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
    this.hum = { src };
  },
  humStop() {
    if (this.hum) { try { this.hum.src.stop(); } catch (e) {} this.hum = null; }
  },
  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
    $('muteBtn').textContent = this.muted ? '🔇' : '🔈';
  },
};

/* ── 카운터 ── */
function setCounter(n) { $('counter').textContent = `상영 ${n}회`; }
function bumpCounter() {
  const n = +(localStorage.getItem(COUNT_KEY) || 0) + 1;
  localStorage.setItem(COUNT_KEY, n);
  setCounter(n);
}
setCounter(+(localStorage.getItem(COUNT_KEY) || 0));

$('startBtn').addEventListener('click', () => { audio.ensure(); startScreening(); });
$('exitBtn').addEventListener('click', abortShow);
$('muteBtn').addEventListener('click', () => audio.toggle());

/* 개발용: ?test=sheep,moon&start=1 로 배치+상영 자동화 */
const _params = new URLSearchParams(location.search);
if (_params.get('test')) {
  _params.get('test').split(',').forEach((t, i) => {
    const def = PIECES.find(p => p.type === t.trim());
    if (!def) return;
    const el = createPiece(def);
    stage.appendChild(el);
    const x = 28 + i * 18, y = i % 2 ? 76 : 30;
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.dataset.x = x;
    el.dataset.y = y;
  });
  updateHints();
  if (_params.get('start')) setTimeout(startScreening, 400);
}
