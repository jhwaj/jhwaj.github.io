// 시나리오 정의 — 정식 10편 + 특수 2편(빈 화면, 오늘의 들판)
// match(ctx) : 상영 조건. priority 높은 순으로 검사, 동순위는 정의 순서.
// stars      : 주연 조각. 배치됐지만 주연이 아닌 조각은 카메오 장면이 자동 삽입된다.
// scenes[].sub : 문자열 또는 (ctx)=>문자열 — ctx.zone('type') = '하늘'|'들판'
// scenes[].fx  : [{piece, anim?, move?}]
//   anim : bob2|glow|stare|approach|drift|ring|flicker|grow|shake
//   move : {to:[x,y]} | {near:'type',dx,dy} | {by:[dx,dy]} | {converge:true,k} | {scatter:true,spread} + dur(ms)
// scenes[].bg  : day | night | dusk | rain | fire (생략하면 이전 장면 배경 유지)

/* ── 조연 카메오 대본 — 주연이 아닌 조각이 등장하는 "한편, …" 장면 ──
   variants: cond(ctx)가 맞는 버전 우선, 아니면 배치 좌표로 버전 선택 */
const CAMEOS = {
  sheep: [
    { cond: c => c.zone('sheep') === '하늘',
      scene: { fx: [{ piece: 'sheep', anim: 'bob2' }],
        sub: '한편, 하늘의 양은 구름인 척하는 데 거의 성공하고 있었다. 아무도 속지 않았지만, 아무도 지적하지 않았다.' } },
    { scene: { fx: [{ piece: 'sheep', move: { by: [-13, 2], dur: 2800 } }],
        sub: '한편, 양은 어디서든 풀을 찾아냈다. 주인공이 아닌 날에도, 삶은 씹어야 하니까.' } },
    { scene: { fx: [{ piece: 'sheep', anim: 'stare' }],
        sub: '양은 이 소동에 관심이 없었다. 양에게 세상은 두 가지뿐이다. 풀인 것과, 풀이 아닌 것.' } },
  ],
  moon: [
    { cond: c => c.zone('moon') === '들판',
      scene: { fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '들판에 내려온 달은 오늘 밤 하늘로 돌아가지 않기로 했다. 가끔은 달에게도 휴가가 필요하다.' } },
    { scene: { fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '달은 이 장면 위에도 떠 있었다. 달의 일은 언제나 같다. 전부 지켜보고, 아무 말도 하지 않는 것.' } },
    { scene: { fx: [{ piece: 'moon', anim: 'glow', move: { by: [-8, -5], dur: 2600 } }],
        sub: '달이 자리를 조금 옮겼다. 이 이야기가 더 잘 보이는 자리로.' } },
  ],
  dog: [
    { cond: c => c.zone('dog') === '하늘',
      scene: { fx: [{ piece: 'dog', anim: 'bob2' }],
        sub: '하늘에 뜬 개는 자기가 왜 거기 있는지 묻지 않기로 했다. 개는 어디서든, 결국 적응한다.' } },
    { scene: { fx: [{ piece: 'dog', move: { by: [16, 2], dur: 2800 } }],
        sub: '한편, 개는 아까부터 냄새 하나를 쫓는 중이었다. 주인공이 아니어도, 개에게는 개의 사건이 있다.' } },
    { scene: { fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '개는 잠깐 멈춰 서서 화면 이쪽을 바라봤다. 다 알고 있다는 표정으로. 그리고 다시 제 갈 길을 갔다.' } },
  ],
  flower: [
    { cond: c => c.zone('flower') === '하늘',
      scene: { fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '하늘에 심긴 꽃은 뿌리 대신 바람을 믿기로 했다. 의외로, 잘 지내고 있다.' } },
    { scene: { fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '구석의 꽃은 이 모든 소동과 상관없이, 오늘 치의 꽃잎을 피우는 데 집중했다. 어떤 성실함은 배경에서 완성된다.' } },
    { scene: { fx: [{ piece: 'flower', anim: 'shake' }],
        sub: '바람이 지나가자 꽃이 한 번 크게 흔들렸다. 박수처럼 보였다면, 아마 맞을 것이다.' } },
  ],
  phone: [
    { scene: { fx: [{ piece: 'phone', anim: 'bob2' }],
        sub: '전화기는 이번 이야기에서도 울리지 않았다. 그러나 언제든 울릴 수 있다는 사실만으로, 모든 장면이 조금씩 긴장했다.' } },
    { scene: { fx: [{ piece: 'phone', anim: 'bob2' }],
        sub: '누군가 아주 먼 곳에서 이 전화기의 번호를 절반쯤 누르다 말았다. 전화기는 그것까지는 알지 못한다.' } },
  ],
  cloud: [
    { scene: { fx: [{ piece: 'cloud', move: { by: [20, -2], dur: 3000 } }],
        sub: '구름은 그동안에도 계속 지나가는 중이었다. 구름은 언제나 지나가는 중이다. 그것이 구름이 견디는 방식이다.' } },
    { scene: { fx: [{ piece: 'cloud', anim: 'bob2' }],
        sub: '구름이 잠깐 해를 가렸다가, 비켜주었다. 배경에도 예의라는 것이 있다.' } },
  ],
  fire: [
    { scene: { fx: [{ piece: 'fire', anim: 'flicker' }],
        sub: '불은 구석에서 조용히 타고 있었다. 아무것도 태우지 않는 불은, 그냥 빛이라고 불러도 좋았다.' } },
    { scene: { fx: [{ piece: 'fire', anim: 'flicker' }],
        sub: '불은 자기 차례를 기다리고 있었다. 불의 차례는, 오지 않는 편이 모두에게 좋았다.' } },
  ],
  house: [
    { scene: { fx: [{ piece: 'house', anim: 'bob2' }],
        sub: '집은 그 자리에 그대로 서 있었다. 집이 하는 일은 그게 전부지만, 그게 전부라는 것이 집의 위대함이다.' } },
    { scene: { fx: [{ piece: 'house', anim: 'bob2' }],
        sub: '집의 창문 하나에 불이 들어왔다가, 꺼졌다. 안에 누가 있는지는 이 영화도 끝까지 알지 못한다.' } },
  ],
  umbrella: [
    { scene: { fx: [{ piece: 'umbrella', move: { by: [8, 1], dur: 2600 } }],
        sub: '펼쳐진 우산 하나가 바람에 조금 밀렸다. 누군가를 기다리는 물건은, 함부로 접히지 않는다.' } },
    { scene: { fx: [{ piece: 'umbrella', anim: 'bob2' }],
        sub: '우산은 비가 오지 않아도 우산이다. 대기하는 삶에도, 이름은 있다.' } },
  ],
};

// 조각 하나의 카메오 장면 선택 — cond 매칭 우선, 없으면 배치 좌표로 결정(같은 배치 = 같은 영화)
function cameoScene(type, ctx) {
  const variants = CAMEOS[type];
  if (!variants) return null;
  const hit = variants.find(v => v.cond && v.cond(ctx));
  let pick;
  if (hit) pick = hit;
  else {
    const pool = variants.filter(v => !v.cond);
    const p = ctx.placed.find(q => q.type === type);
    pick = pool[Math.round((p ? p.x + p.y : 0)) % pool.length] || pool[0];
  }
  return pick ? { hold: 3200, ...pick.scene, fx: [...(pick.scene.fx || [])] } : null;
}

/* ── 관계 비트 — 두 조각이 실제로 얽히는 장면. 모든 쌍(36개) 커버.
   어떤 조합이든 사슬(A↔B, B↔C…)로 이어 한 편의 연결된 이야기를 만든다. ── */
const OPENINGS = {
  sheep: '이 이야기는 양에서 시작된다. 풀을 씹다가 문득 고개를 든, 양 한 마리.',
  moon: '이 이야기는 달에서 시작된다. 오늘따라 낮게 뜬, 달.',
  phone: '이 이야기는 전화기에서 시작된다. 들판에 놓인, 아무도 번호를 모르는 전화기 한 대.',
  cloud: '이 이야기는 구름에서 시작된다. 갈 곳을 아직 정하지 못한, 구름 하나.',
  fire: '이 이야기는 불에서 시작된다. 들판 한가운데, 어디서 왔는지 모를 불 하나.',
  house: '이 이야기는 집에서 시작된다. 들판에 혼자 서 있는, 오래된 집.',
  flower: '이 이야기는 꽃에서 시작된다. 심은 사람이 기억나지 않는, 꽃 한 송이.',
  dog: '이 이야기는 개에서 시작된다. 오늘 할 일을 아직 정하지 못한, 개 한 마리.',
  umbrella: '이 이야기는 우산에서 시작된다. 비도 오지 않는데 펼쳐져 있는, 우산 하나.',
};

const PAIR_BEATS = {
  'moon+sheep': {
    fx: [{ piece: 'sheep', anim: 'stare' }, { piece: 'moon', anim: 'glow' }],
    sub: '양은 달을 향해 몇 번 울었다. 달이 대답 대신 조금 더 밝아졌다. 양은 그것을 대답으로 치기로 했다.' },
  'phone+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'phone', dx: -12, dy: 2, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '양은 전화기를 풀인 줄 알고 물었다가, 태어나 처음으로 신호음을 들었다. 그날부터 양은 가끔 수화기 옆에서 잤다.' },
  'cloud+sheep': {
    fx: [{ piece: 'cloud', move: { near: 'sheep', dy: -22, dur: 2800 } }, { piece: 'sheep', anim: 'bob2' }],
    sub: '구름이 양 위로 그늘을 드리웠다. 양은 그늘이 시원해서, 구름은 양이 하얘서, 서로를 조금 좋아하게 되었다.' },
  'fire+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'fire', dx: -16, dy: 2, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '불을 처음 본 양은 그것을 이상한 꽃이라고 생각했다. 다가서는 양 앞에서, 불이 스스로 한 걸음 물러났다.' },
  'house+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'house', dx: 10, dy: 5, dur: 2800 } }],
    sub: '양은 집 그림자에 들어가 낮잠을 잤다. 집은 처음으로, 자기가 지붕이라는 사실이 자랑스러웠다.' },
  'flower+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'flower', dx: -13, dy: 2, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '양은 꽃 앞에서 오래 망설였다. 먹기에는 예쁘고, 두기에는 배가 고팠다. 결국 꽃 옆의 풀만 뜯었다. 그것이 양의 사랑이었다.' },
  'dog+sheep': {
    fx: [{ piece: 'dog', move: { near: 'sheep', dx: -15, dy: 1, dur: 2800 } }, { piece: 'sheep', anim: 'bob2' }],
    sub: '개는 양을 몰아야 한다는 것을 본능으로 알았지만, 양이 한 마리뿐이라 어디로 몰아야 할지 몰랐다. 둘은 그냥 나란히 걸었다.' },
  'sheep+umbrella': {
    fx: [{ piece: 'sheep', move: { near: 'umbrella', dx: 6, dy: 7, dur: 2800 } }],
    sub: '양은 우산 아래가 세상에서 가장 안전한 자리라고 결론 내렸다. 비가 오지 않아도, 결론은 바뀌지 않았다.' },
  'moon+phone': {
    fx: [{ piece: 'moon', anim: 'glow', move: { near: 'phone', dy: -22, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '달이 전화기에 대해 아는 것: 밤에 우는 물건. 전화기가 달에 대해 아는 것: 밤에 들어주는 존재. 서로 잘 만난 셈이다.' },
  'cloud+moon': {
    fx: [{ piece: 'cloud', move: { near: 'moon', dx: -4, dy: 0, dur: 2800 } }, { piece: 'moon', anim: 'glow' }],
    sub: '구름이 달을 가렸다. 달은 화내지 않고 그 뒤에서 계속 빛났다. 가장자리가 은색으로 물들자, 구름이 먼저 비켜주었다.' },
  'fire+moon': {
    fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'moon', anim: 'glow' }],
    sub: '불과 달은 서로를 먼 친척이라고 생각한다. 하나는 땅의 빛, 하나는 하늘의 빛. 가끔 서로의 밝기를 안부처럼 주고받는다.' },
  'house+moon': {
    fx: [{ piece: 'moon', anim: 'glow', move: { near: 'house', dy: -20, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '달빛이 빈집의 창문으로 들어갔다. 방 하나가 잠깐 환해졌다. 달은 그 방을 오늘 밤 자기 방으로 정했다.' },
  'flower+moon': {
    fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'flower', anim: 'bob2' }],
    sub: '밤에도 지지 않으려는 꽃을 위해, 달이 조명을 조금 낮춰주었다. 꽃은 낮과 다른 색이 되었다. 둘만 아는 색이었다.' },
  'dog+moon': {
    fx: [{ piece: 'dog', anim: 'stare' }, { piece: 'moon', anim: 'glow' }],
    sub: '개는 달을 향해 한 번 짖고, 대답이 없자 한 번 더 짖었다. 달은 대답하지 않는 방식으로, 매일 밤 개의 안부를 확인한다.' },
  'moon+umbrella': {
    fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'umbrella', anim: 'bob2' }],
    sub: '우산이 달빛을 가려주었다. 달빛에 젖는 것도 젖는 것이라면, 우산은 오늘 밤도 제 일을 한 것이다.' },
  'cloud+phone': {
    fx: [{ piece: 'cloud', move: { near: 'phone', dy: -20, dur: 2800 } }, { piece: 'phone', anim: 'bob2' }],
    sub: '구름은 전화선 없이도 소식을 나른다. 전화기는 그것이 부러웠고, 구름은 반대로 한곳에 머무는 전화기가 부러웠다.' },
  'fire+phone': {
    fx: [{ piece: 'phone', anim: 'ring' }, { piece: 'fire', anim: 'flicker' }],
    sub: '전화기가 울렸다. 불은 받을 손이 없어서, 벨이 끝날 때까지 조용히 흔들리기만 했다. 세상에는 끝내 받을 수 없는 전화가 있다.' },
  'house+phone': {
    fx: [{ piece: 'phone', move: { near: 'house', dx: 8, dy: 4, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '집에는 전화기가 놓였던 자리가 남아 있다. 전화기는 그 자리를 기억하지 못하지만, 집은 기억한다. 집은 원래 기억하는 쪽이다.' },
  'flower+phone': {
    fx: [{ piece: 'phone', move: { near: 'flower', dx: -10, dy: 3, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '꽃에게 전화가 온다면 그것은 봄일 것이다. 전화기는 봄이 올 때까지, 꽃 옆에서 대기하기로 했다.' },
  'dog+phone': {
    fx: [{ piece: 'dog', move: { near: 'phone', dx: -12, dy: 2, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '벨이 울리자 개가 가장 먼저 달려왔다. 받을 수는 없지만, 알릴 수는 있다. 개는 자기 직업을 그렇게 정했다.' },
  'phone+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'phone', dx: 6, dy: -8, dur: 2800 } }],
    sub: '우산이 전화기 쪽으로 기울었다. 비 소식은 구름보다 전화가 먼저 아는 법이니까, 잘 보이려는 것이었다.' },
  'cloud+fire': {
    fx: [{ piece: 'cloud', move: { near: 'fire', dy: -24, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '구름은 불 위에서 한참 고민했다. 비를 내리면 불이 꺼지고, 안 내리면 들판이 탄다. 결국 불 옆의 땅에만 살짝 비를 내렸다.' },
  'cloud+house': {
    fx: [{ piece: 'cloud', move: { near: 'house', dy: -24, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '구름이 집 위에 오래 머물렀다. 지붕은 구름의 그림자를 하루 종일 입고 있었다. 집은 그것을 새 옷이라고 생각하기로 했다.' },
  'cloud+flower': {
    fx: [{ piece: 'cloud', move: { near: 'flower', dy: -20, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '구름은 꽃 위에서만 아주 잠깐 비를 내렸다. 정확히 한 송이만큼의 비. 구름이 할 수 있는 가장 작은 친절이었다.' },
  'cloud+dog': {
    fx: [{ piece: 'cloud', move: { by: [18, -2], dur: 3000 } }, { piece: 'dog', move: { by: [16, 2], dur: 3000 } }],
    sub: '개는 구름을 쫓아 달렸다. 구름은 도망가는 게 아니라 가던 길을 갔을 뿐이지만, 개에게는 세상 제일가는 추격전이었다.' },
  'cloud+umbrella': {
    fx: [{ piece: 'cloud', move: { near: 'umbrella', dy: -22, dur: 2800 } }, { piece: 'umbrella', anim: 'bob2' }],
    sub: '구름과 우산은 오래된 맞수다. 구름이 먼저면 우산이 펴지고, 우산이 먼저 펴져 있으면 구름은 괜히 자존심이 상한다.' },
  'fire+house': {
    fx: [{ piece: 'fire', anim: 'flicker', move: { near: 'house', dx: -13, dy: 1, dur: 2800 } }],
    sub: '불은 집을 오래 바라봤다. 태울 수 있는 것과 태워도 되는 것은 다르다는 걸, 불도 안다. 불은 벽난로가 되는 상상을 했다.' },
  'fire+flower': {
    fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'flower', anim: 'bob2' }],
    sub: '불은 꽃에게 가까이 가지 않았다. 대신 멀리서 꽃의 색을 따라 해봤다. 주황, 빨강. 불은 자기가 꽃을 닮았다는 것에 놀랐다.' },
  'dog+fire': {
    fx: [{ piece: 'dog', move: { near: 'fire', dx: -14, dy: 1, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '개는 불 앞에서 몸을 말렸다. 사람들이 왜 불가에 모이는지 알 것 같았다. 따뜻한 것 옆에서는, 누구와도 가족 같아진다.' },
  'fire+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'fire', dx: -11, dy: -2, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '우산은 불 위로 펴지지 않았다. 대신 옆에서 바람을 막아주었다. 불이 꺼지지 않을 만큼만. 그것이 우산식 우정이었다.' },
  'flower+house': {
    fx: [{ piece: 'flower', move: { near: 'house', dx: -15, dy: 3, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '집 앞의 꽃은 문패 같은 것이 되었다. 주소는 몰라도, 다들 "꽃 있는 집"이라고 하면 알았다.' },
  'dog+house': {
    fx: [{ piece: 'dog', move: { near: 'house', dx: 14, dy: 3, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '개는 집을 한 바퀴 돌고 나서 문 앞에 앉았다. 지킬 것이 있다는 것은, 개에게는 직업이 아니라 명예다.' },
  'house+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'house', dx: 13, dy: 2, dur: 2800 } }],
    sub: '우산은 현관에 기대어 섰다. 집에게도 우산에게도, 그것이 세상에서 가장 자연스러운 자세였다.' },
  'dog+flower': {
    fx: [{ piece: 'dog', move: { near: 'flower', dx: -13, dy: 1, dur: 2800 } }, { piece: 'flower', anim: 'shake' }],
    sub: '개는 꽃의 냄새를 맡고 재채기를 한 번 했다. 꽃은 그것을 칭찬으로 받아들였다. 언어는 안 통했지만, 사이는 나쁘지 않았다.' },
  'flower+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'flower', dx: 2, dy: -13, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '소나기가 지나갈 때, 우산은 꽃 위로 기울어져 있었다. 자기는 젖으면서. 우산의 사정은 우산만 안다.' },
  'dog+umbrella': {
    fx: [{ piece: 'dog', move: { near: 'umbrella', dx: -11, dy: 2, dur: 2800 } }],
    sub: '개는 우산을 물어다 놓는 법을 배웠다. 누구에게 갖다줄지는 아직 못 정했지만, 준비는 언제나 마음보다 먼저다.' },
};

// 두 조각을 잇는 장면 — 비트가 없으면 카메오로 안전망 (fx는 복제해서 반환)
function pairBeat(a, b, ctx) {
  const beat = PAIR_BEATS[[a, b].sort().join('+')];
  if (!beat) return cameoScene(b, ctx);
  return { hold: 3400, ...beat, fx: [...(beat.fx || [])] };
}

/* ── 3막 구조 재료 — 주인공의 욕망(시작)과 해소(결말), 합류 문구(전개) ── */
const WANTS = {
  sheep: '양은 오늘따라, 혼자라는 사실이 유난히 크게 느껴졌다.',
  moon: '달은 오늘 밤, 지켜보는 일 말고 다른 일을 해보고 싶었다.',
  phone: '전화기의 소원은 단순했다. 딱 한 번, 제때 울려보는 것.',
  cloud: '구름은 어디에도 머물지 못하는 삶이 조금 지겨웠다.',
  fire: '불의 소원은 하나였다. 아무것도 태우지 않고, 아침까지 살아남는 것.',
  house: '집은 오랫동안 비어 있었다. 집은 다시, 무언가의 집이 되고 싶었다.',
  flower: '꽃은 지기 전에, 누군가에게 제대로 보이고 싶었다.',
  dog: '개는 지켜야 할 것을 찾고 있었다. 개는 일이 없으면 시무룩해지는 종족이다.',
  umbrella: '우산은 비가 오기만을 기다리는 삶이 문득 억울했다.',
};
const RESOLUTIONS = {
  sheep: '양은 더 이상 혼자 우는 밤이 무섭지 않았다.',
  moon: '달은 오늘 처음으로, 이야기의 한가운데에 떠 있었다.',
  phone: '전화기는 이제 초조해하지 않는다. 곁에 있는 것들이 곧 소식이니까.',
  cloud: '구름은 오늘 밤 처음으로, 한 들판 위에 오래 머물렀다.',
  fire: '불은 그날, 아무것도 태우지 않은 채 아침을 맞았다.',
  house: '집은 오늘 밤 다시, 여럿의 지붕이 되었다.',
  flower: '꽃은 오늘 모두에게 보였다. 그거면 충분했다.',
  dog: '개는 오늘 지킬 것을 찾았다. 여기 있는 전부 다.',
  umbrella: '우산은 알게 되었다. 펼쳐져 있는 것만으로 의미가 되는 날도 있다는 것을.',
};
const JOIN_LINES = [
  l => `그 모습을 멀리서 지켜보던 것이 있었다. ${l}.`,
  l => `소문은 ${l}에게도 닿았다.`,
  l => `그때 ${l} 쪽에서도 움직임이 있었다.`,
  l => `${l} 역시 그 광경을 못 본 척할 수 없었다.`,
];
function joinLine(label, i) {
  return JOIN_LINES[i % JOIN_LINES.length](label);
}

const SCENARIOS = [

  /* ── 특수: 빈 캔버스 ── */
  {
    id: 'blank',
    stars: [],
    priority: 100,
    title: { ko: '빈 화면', en: 'BLANK SCREEN' },
    poster: { sky: '#3D7BE8', grass: '#4FA53B' },
    match: c => c.placed.length === 0,
    scenes: [
      { bg: 'day', hold: 2800, fx: [], sub: '아무것도 놓지 않은 채, 당신은 START를 눌렀다.' },
      { bg: 'day', hold: 3200, fx: [], sub: '텅 빈 하늘. 텅 빈 들판. 이것은 아무것도 선택하지 않은 한 사람에 대한 다큐멘터리다.' },
      { bg: 'night', hold: 3400, fx: [], sub: '그러나 기억할 것. 빈 화면을 끝까지 지켜본 사람은, 오늘 당신뿐이다.' },
    ],
  },

  /* ── 1. 불면 — 양 + 달 ── */
  {
    id: 'insomnia',
    stars: ['sheep', 'moon'],
    priority: 30,
    title: { ko: '불면', en: 'INSOMNIA' },
    poster: { sky: '#141C42', grass: '#22402C', moon: true },
    match: c => c.has('sheep') && c.has('moon'),
    scenes: [
      { bg: 'night', hold: 2800,
        fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'sheep', anim: 'bob2' }],
        sub: '새벽 세 시. 잠은 오지 않고, 당신은 양을 세기 시작했다.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'sheep', move: { by: [14, 0], dur: 2400 } }, { piece: 'moon', anim: 'glow' }],
        sub: c => `한 마리, 두 마리. 그런데 ${c.zone('sheep')}의 양 한 마리가 걸어오다 멈추고, 당신을 바라봤다.` },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'moon', anim: 'glow', move: { near: 'sheep', dx: 11, dy: -17, dur: 2900 } },
             { piece: 'sheep', anim: 'bob2' }],
        sub: '"너도 잠이 안 오는구나." 양이 말했다. 달이 양의 곁으로 내려왔다.' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'sheep', anim: 'bob2' }],
        sub: '그날 밤, 당신과 양은 아무것도 세지 않기로 했다. 그것이 서로에게 해줄 수 있는 전부였다.' },
    ],
  },

  /* ── 2. 아홉 번째 양 — 양 3마리 이상 ── */
  {
    id: 'ninth-sheep',
    stars: ['sheep'],
    priority: 40,
    title: { ko: '아홉 번째 양', en: 'THE NINTH SHEEP' },
    poster: { sky: '#141C42', grass: '#22402C', moon: true },
    match: c => c.count('sheep') >= 3,
    scenes: [
      { bg: 'night', hold: 2800,
        fx: [{ piece: 'sheep', anim: 'bob2' }],
        sub: '이 들판의 양은 모두 여덟 마리여야 했다. 그런데 세어보면, 자꾸 아홉 마리였다.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'sheep', move: { converge: true, k: 0.7, dur: 2600 } }],
        sub: '양들은 한곳에 모여 서로를 쳐다봤다. 아무도 자기가 아홉 번째라고 인정하지 않았다.' },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'sheep', move: { scatter: true, spread: 18, dur: 2600 } }],
        sub: '목동이 세자 양들은 흩어졌다. 개가 세어도, 달이 세어도, 여전히 아홉.' },
      { bg: 'night', hold: 3800,
        fx: [{ piece: 'sheep', anim: 'bob2' }],
        sub: '그날 이후 이 마을에서는 아무도 양을 세지 않는다. 잠들고 싶은 사람만 빼고.' },
    ],
  },

  /* ── 3. 부재중 — 전화기 + 비구름 ── */
  {
    id: 'missed-call',
    stars: ['phone', 'cloud'],
    priority: 30,
    title: { ko: '부재중', en: 'MISSED CALL' },
    poster: { sky: '#5B6F95', grass: '#3E6E3B' },
    match: c => c.has('phone') && c.has('cloud'),
    scenes: [
      { bg: 'rain', hold: 2800,
        fx: [{ piece: 'cloud', move: { near: 'phone', dy: -26, dur: 3000 } }],
        sub: c => c.zone('phone') === '하늘'
          ? '비구름이 몰려왔다. 하늘에 걸어둔 전화기는, 아직 울리지 않았다.'
          : '비구름이 전화기 위로 몰려왔다. 전화기는 아직 울리지 않았다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'phone', anim: 'ring' }],
        sub: '당신은 벨소리를 세 번이나 잘못 들었다. 전부 빗소리였다.' },
      { bg: 'rain', hold: 3400,
        fx: [{ piece: 'cloud', move: { by: [36, -4], dur: 3200 } }],
        sub: '구름이 천천히 지나가고 나서야 알았다. 기다림은 신호가 아니라, 날씨에 가깝다는 것을.' },
      { bg: 'dusk', hold: 3600,
        fx: [],
        sub: '전화는 끝내 오지 않았다. 대신, 비가 그쳤다.' },
    ],
  },

  /* ── 4. 수신자 부담 — 달 + 전화기 ── */
  {
    id: 'collect-call',
    stars: ['moon', 'phone'],
    priority: 30,
    title: { ko: '수신자 부담', en: 'COLLECT CALL' },
    poster: { sky: '#0E1530', grass: '#1E3326', moon: true },
    match: c => c.has('moon') && c.has('phone'),
    scenes: [
      { bg: 'night', hold: 2800,
        fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '그 전화기는 단 한 곳으로만 연결됐다. 384,400km 떨어진 곳.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'phone', anim: 'ring' }, { piece: 'moon', anim: 'glow' }],
        sub: '요금은 수신자 부담. 달은 지금까지 한 번도 전화를 끊은 적이 없다.' },
      { bg: 'night', hold: 3400,
        fx: [{ piece: 'moon', anim: 'glow', move: { near: 'phone', dy: -24, dur: 3200 } }],
        sub: '통화가 길어지는 밤이면, 달은 조금 더 가까이 내려와 들었다.' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '달이 유난히 밝은 밤은, 통화량이 많은 밤이다.' },
    ],
  },

  /* ── 5. 방화범의 고백 — 불 + 집 ── */
  {
    id: 'arsonist',
    stars: ['fire', 'house'],
    priority: 30,
    title: { ko: '방화범의 고백', en: 'CONFESSION OF AN ARSONIST' },
    poster: { sky: '#7E1D10', grass: '#33251C' },
    match: c => c.has('fire') && c.has('house'),
    scenes: [
      { bg: 'dusk', hold: 2800,
        fx: [{ piece: 'house', anim: 'bob2' }],
        sub: '그 집에는 아무도 살지 않았다. 적어도, 서류상으로는.' },
      { bg: 'dusk', hold: 3200,
        fx: [{ piece: 'fire', anim: 'flicker', move: { near: 'house', dx: -14, dy: 2, dur: 3000 } }],
        sub: '불은 내가 지른 게 아니다. 나는 그저, 불이 가야 할 곳까지 데려다줬을 뿐이다.' },
      { bg: 'fire', hold: 3400,
        fx: [{ piece: 'fire', anim: 'grow', move: { near: 'house', dx: 0, dy: -6, dur: 2800 } },
             { piece: 'house', anim: 'shake' }],
        sub: '타닥, 타닥. 오래된 집이 마지막으로 하는 말을, 나는 끝까지 들어주었다.' },
      { bg: 'night', hold: 3600,
        fx: [],
        sub: '다음 날 아침, 잿더미에서 열쇠 하나가 발견되었다. 내 것이었다.' },
    ],
  },

  /* ── 6. 꺼지지 않는 것 — 불 + 비구름 ── */
  {
    id: 'unquenchable',
    stars: ['fire', 'cloud'],
    priority: 30,
    title: { ko: '꺼지지 않는 것', en: 'WHAT WON\'T GO OUT' },
    poster: { sky: '#4A2430', grass: '#2E2A22' },
    match: c => c.has('fire') && c.has('cloud'),
    scenes: [
      { bg: 'dusk', hold: 2800,
        fx: [{ piece: 'cloud', move: { near: 'fire', dy: -27, dur: 3000 } }],
        sub: '구름이 몰려왔다. 저 아래의 불을 끄기 위해서였다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'cloud', anim: 'bob2' }],
        sub: '비는 사흘 밤낮을 내렸다. 불은 조금 작아졌을 뿐, 꺼지지 않았다.' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'fire', anim: 'grow' }, { piece: 'cloud', anim: 'bob2' }],
        sub: '구름은 이해할 수 없었다. 세상에는 물로 꺼지지 않는 불이 있다는 것을.' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'cloud', move: { by: [34, -3], dur: 3200 } }, { piece: 'fire', anim: 'flicker' }],
        sub: '결국 구름이 먼저 떠났다. 마음에 붙은 불이 그렇다. 비는 그쳤고, 불은 남았다.' },
    ],
  },

  /* ── 7. 같은 정류장 — 우산 2개 이상 ── */
  {
    id: 'same-stop',
    stars: ['umbrella'],
    priority: 35,
    title: { ko: '같은 정류장', en: 'THE SAME BUS STOP' },
    poster: { sky: '#6B7FA8', grass: '#3E6E3B' },
    match: c => c.count('umbrella') >= 2,
    scenes: [
      { bg: 'rain', hold: 2800,
        fx: [{ piece: 'umbrella', anim: 'bob2' }],
        sub: '그 정류장에는 지붕이 없었다. 대신 우산이 두 개, 나란히 펼쳐져 있었다.' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'umbrella', move: { converge: true, k: 0.45, dur: 3000 } }],
        sub: '버스는 오지 않았다. 두 우산은 조금씩, 서로가 있는 쪽으로 기울었다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'umbrella', anim: 'ring' }],
        sub: '빗소리에 묻혀 들리지 않는 말도 있었다. 그래서 둘은 같은 말을 두 번씩 했다.' },
      { bg: 'dusk', hold: 3600,
        fx: [{ piece: 'umbrella', move: { converge: true, k: 0.8, dur: 3200 } }],
        sub: '비가 그쳤는데도, 두 우산은 접히지 않았다. 나란히 있는 이유가 비만은 아니었으므로.' },
    ],
  },

  /* ── 8. 마중 — 개 + 집 ── */
  {
    id: 'out-to-meet',
    stars: ['dog', 'house'],
    priority: 30,
    title: { ko: '마중', en: 'OUT TO MEET YOU' },
    poster: { sky: '#C9693C', grass: '#457A38' },
    match: c => c.has('dog') && c.has('house'),
    scenes: [
      { bg: 'day', hold: 3000,
        fx: [{ piece: 'dog', move: { near: 'house', dx: 20, dy: 4, dur: 3200 } }],
        sub: '그 개는 매일 오후 다섯 시, 대문 앞으로 걸어 나갔다.' },
      { bg: 'dusk', hold: 3000,
        fx: [{ piece: 'dog', anim: 'bob2' }, { piece: 'house', anim: 'bob2' }],
        sub: '아무도 시킨 적 없는 일이었다. 그래서 아무도 말릴 수 없었다.' },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '돌아오지 않는 사람을 기다리는 일은, 개에게는 슬픔이 아니라 일과였다.' },
      { bg: 'night', hold: 3800,
        fx: [{ piece: 'dog', move: { by: [6, 0], dur: 2000 } }],
        sub: '오늘도 대문 앞. 발자국 소리 하나에, 개는 한 걸음 마중을 나갔다.' },
    ],
  },

  /* ── 9. 산책 — 개 + 우산 ── */
  {
    id: 'the-walk',
    stars: ['dog', 'umbrella'],
    priority: 30,
    title: { ko: '산책', en: 'THE WALK' },
    poster: { sky: '#5B6F95', grass: '#3E6E3B' },
    match: c => c.has('dog') && c.has('umbrella'),
    scenes: [
      { bg: 'rain', hold: 2800,
        fx: [{ piece: 'dog', anim: 'bob2' }],
        sub: '비가 오면 산책은 취소. 그것이 이 집안의 규칙이었다.' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'dog', move: { near: 'umbrella', dx: -13, dy: 3, dur: 3000 } },
             { piece: 'umbrella', anim: 'bob2' }],
        sub: '개는 규칙을 이해하지 못했다. 대신, 우산이 어디에 있는지를 기억했다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '현관 앞, 우산 옆. 개는 앉아서 기다렸다. 규칙이 틀렸다는 표정으로.' },
      { bg: 'dusk', hold: 3800,
        fx: [{ piece: 'dog', move: { by: [30, 0], dur: 3400 } },
             { piece: 'umbrella', move: { by: [30, 0], dur: 3400 } }],
        sub: '결국 사람이 졌다. 그날 저녁, 한 우산 아래로 네 개의 발과 두 개의 발이 나란히 걸었다.' },
    ],
  },

  /* ── 10. 장마의 정원 — 꽃 + 비구름 ── */
  {
    id: 'monsoon-garden',
    stars: ['flower', 'cloud'],
    priority: 30,
    title: { ko: '장마의 정원', en: 'GARDEN IN MONSOON' },
    poster: { sky: '#4E7DBE', grass: '#3F8A46' },
    match: c => c.has('flower') && c.has('cloud'),
    scenes: [
      { bg: 'rain', hold: 2800,
        fx: [{ piece: 'cloud', move: { near: 'flower', dy: -25, dur: 3000 } },
             { piece: 'flower', anim: 'bob2' }],
        sub: '구름은 하필 꽃 위에 자리를 잡았다. 꽃은 피하는 법을 배운 적이 없었다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'cloud', anim: 'bob2' }, { piece: 'flower', anim: 'shake' }],
        sub: '일주일 내내 비가 내렸다. 구름은 미안해하지 않았다. 그것이 구름의 직업이었으므로.' },
      { bg: 'day', hold: 3200,
        fx: [{ piece: 'cloud', move: { by: [36, -5], dur: 3200 } }, { piece: 'flower', anim: 'stare' }],
        sub: '구름이 떠나고 나서, 이상한 일. 가장 오래 젖은 꽃이, 가장 꼿꼿하게 서 있었다.' },
      { bg: 'day', hold: 3600,
        fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '장마가 끝났다. 정원에는, 지지 않은 꽃이 하나.' },
    ],
  },

  /* ── 특수: 정의되지 않은 조합 — 조각들을 관계 비트 사슬로 엮은 한 편의 이야기 ── */
  {
    id: 'ensemble',
    stars: 'all',
    priority: 0,
    title: { ko: '오늘의 들판', en: 'THE FIELD, TODAY' },
    poster: { sky: '#3D7BE8', grass: '#4FA53B' },
    match: () => true,
    // 3막 구조: 시작(전원 소개 + 주인공의 욕망) → 전개(합류 비트, 전원이 서서히 모임) → 결말(수렴 + 해소 + 에필로그)
    buildScenes: c => {
      const order = [...new Set(c.placed.slice().sort((a, b) => a.x - b.x).map(p => p.type))];
      const label = t => c.placed.find(p => p.type === t).label;
      const lead = order[0];
      const scenes = [];

      // 1막 — 시작
      scenes.push({
        bg: 'day', hold: 3400,
        fx: [{ piece: lead, anim: 'bob2' }],
        sub: `${c.list}. 오늘 이 들판에 모인 전부다. ${WANTS[lead] || OPENINGS[lead] || ''}`,
      });

      // 2막 — 전개: 새 조각이 합류하고, 이미 등장한 조각들은 매 장면 중심으로 조금씩 모여든다
      if (order.length === 1) {
        const solo = cameoScene(lead, c);
        if (solo) scenes.push(solo);
      } else {
        for (let i = 1; i < order.length; i++) {
          const beat = pairBeat(order[i - 1], order[i], c);
          if (!beat) continue;
          if (typeof beat.sub === 'string') beat.sub = `${joinLine(label(order[i]), i - 1)} ${beat.sub}`;
          order.forEach(t => {
            if (t !== order[i - 1] && t !== order[i]) {
              beat.fx.push({ piece: t, move: { gather: true, k: 0.15, dur: 3000 } });
            }
          });
          scenes.push(beat);
        }
        if (order.length >= 3) {
          scenes.push({
            bg: 'dusk', hold: 3400,
            fx: order.map(t => ({ piece: t, move: { gather: true, k: 0.25, dur: 3000 } })),
            sub: '소동이 한 바퀴 돌고 나자, 모두가 서로의 사정을 조금씩 알게 되었다. 이것은 이제, 누구 하나의 이야기가 아니었다.',
          });
        } else {
          scenes[scenes.length - 1].bg = scenes[scenes.length - 1].bg || 'dusk';
        }
      }

      // 3막 — 결말: 전원 수렴 + 주인공의 욕망 해소, 에필로그
      scenes.push({
        bg: 'night', hold: 3600,
        fx: order.map(t => ({ piece: t, move: { gather: true, k: 0.6, dur: 3200 } })),
        sub: order.length === 1
          ? (RESOLUTIONS[lead] || '')
          : `그날 밤, 모두가 ${label(lead)} 곁으로 모여들었다. ${RESOLUTIONS[lead] || ''}`,
      });
      scenes.push({
        bg: 'night', hold: 3800, fx: [],
        sub: '들판의 밤. 오늘 만난 것들은 내일 또 만날 것이다. 좋은 결말은 대개, 다음 날 아침처럼 생겼다.',
      });
      return scenes;
    },
  },
];
