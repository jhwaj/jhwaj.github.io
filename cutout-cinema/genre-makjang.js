(() => {
// 시나리오 정의 — 정식 10편 + 특수 2편(빈 화면, 오늘의 들판) · 장르: 개막장 드라마
// match(ctx) : 상영 조건. priority 높은 순으로 검사, 동순위는 정의 순서.
// stars      : 주연 조각. 배치됐지만 주연이 아닌 조각은 관계 비트로 합류한다.
// scenes[].sub : 문자열 또는 (ctx)=>문자열 — ctx.zone('type') = '하늘'|'들판'
// scenes[].fx  : [{piece, anim?, move?}]
//   anim : bob2|glow|stare|approach|drift|ring|flicker|grow|shake
//   move : {to:[x,y]} | {near:'type',dx,dy} | {by:[dx,dy]} | {gather:true,k} | {converge:true,k} | {scatter:true,spread} + dur(ms)
// scenes[].bg  : day | night | dusk | rain | fire (생략하면 이전 장면 배경 유지)

/* ── 조연 카메오 대본 — 단독 출연용 짧은 장면 ──
   variants: cond(ctx)가 맞는 버전 우선, 아니면 배치 좌표로 버전 선택 */
const CAMEOS = {
  sheep: [
    { cond: c => c.zone('sheep') === '하늘',
      scene: { fx: [{ piece: 'sheep', anim: 'bob2' }],
        sub: '하늘의 양. 놀라지 마시라. 재벌가의 추격을 피해 헬기에서 뛰어내린 것이다.' } },
    { scene: { fx: [{ piece: 'sheep', move: { by: [-13, 2], dur: 2800 } }],
        sub: '양은 조용히 풀을 뜯었다. 폭풍 전야의 식사다. 다 계획이 있는 얼굴이다.' } },
    { scene: { fx: [{ piece: 'sheep', anim: 'stare' }],
        sub: '양이 먼 곳을 응시했다. 회상 신이다. 15년 전 그날로. (화면 흑백 전환)' } },
  ],
  moon: [
    { cond: c => c.zone('moon') === '들판',
      scene: { fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '달이 들판까지 내려왔다. 하늘의 증인이 지상에 내려오면, 반드시 뭔가 터진다.' } },
    { scene: { fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '달은 말없이 지켜봤다. 달은 이 들판의 유일한 목격자다. 모든 사건의.' } },
    { scene: { fx: [{ piece: 'moon', anim: 'glow', move: { by: [-8, -5], dur: 2600 } }],
        sub: '달이 자리를 옮겼다. 더 잘 보이는 곳으로. 오늘 밤 뭔가 터진다는 걸 아는 움직임이다.' } },
  ],
  dog: [
    { cond: c => c.zone('dog') === '하늘',
      scene: { fx: [{ piece: 'dog', anim: 'bob2' }],
        sub: '하늘에 뜬 개. 놀라지 마시라. 이 동네에서 이 정도는 스포일러 축에도 못 낀다.' } },
    { scene: { fx: [{ piece: 'dog', move: { by: [16, 2], dur: 2800 } }],
        sub: '개는 냄새 하나를 쫓는 중이다. 기억상실 전의 흔적. 수사는 계속된다.' } },
    { scene: { fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '개가 카메라를 정면으로 봤다. 4번째 벽이 무너졌다. 개는 이미 다 알고 있다.' } },
  ],
  flower: [
    { cond: c => c.zone('flower') === '하늘',
      scene: { fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '하늘의 꽃. 뿌리도 없이 산다. 재벌가 온실 출신이라 그렇다. 관리받던 몸이다.' } },
    { scene: { fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '꽃은 오늘도 아름다웠다. 이 장르에서 아름다움은 생존 스킬이다.' } },
    { scene: { fx: [{ piece: 'flower', anim: 'shake' }],
        sub: '바람에 꽃이 흔들렸다. 아니, 흔들린 게 아니다. 고개를 저은 거다. 뭔가를 부정하고 있다.' } },
  ],
  phone: [
    { scene: { fx: [{ piece: 'phone', anim: 'bob2' }],
        sub: '전화기는 조용했다. 도청 중이라는 뜻이다. 이 들판의 대화는 전부 녹음되고 있다.' } },
    { scene: { fx: [{ piece: 'phone', anim: 'bob2' }],
        sub: '부재중 전화 1통. 발신번호 표시제한. 불길하다. 이런 전화는 꼭 다시 걸려온다.' } },
  ],
  cloud: [
    { scene: { fx: [{ piece: 'cloud', move: { by: [20, -2], dur: 3000 } }],
        sub: '구름이 이동 중이다. 목적지는 복수의 현장. 구름의 동선에는 낭비가 없다.' } },
    { scene: { fx: [{ piece: 'cloud', anim: 'bob2' }],
        sub: '구름이 해를 가렸다. 조명 감독이 따로 없다. 폭로 신에는 어두운 조명이 필요하니까.' } },
  ],
  fire: [
    { scene: { fx: [{ piece: 'fire', anim: 'flicker' }],
        sub: '불은 구석에서 타고 있었다. 시한부의 시간은 오늘도 줄어든다. 그래도 불은 웃었다.' } },
    { scene: { fx: [{ piece: 'fire', anim: 'flicker' }],
        sub: '불이 흔들렸다. 바람 때문이 아니다. 회한 때문이다.' } },
  ],
  house: [
    { scene: { fx: [{ piece: 'house', anim: 'bob2' }],
        sub: '집은 서 있었다. 아무도 모르는 금고를 품은 채. 유언장 공개일이 다가온다.' } },
    { scene: { fx: [{ piece: 'house', anim: 'bob2' }],
        sub: '집 창문에 불이 켜졌다 꺼졌다. 신호다. 누구에게 보내는 신호인지는, 곧 밝혀진다.' } },
  ],
  umbrella: [
    { scene: { fx: [{ piece: 'umbrella', move: { by: [8, 1], dur: 2600 } }],
        sub: '우산은 펴진 채 대기 중이다. 도망자는 언제든 뛰어들 수 있어야 하니까.' } },
    { scene: { fx: [{ piece: 'umbrella', anim: 'bob2' }],
        sub: '우산이 바람에 밀렸다. 밀린 척한 거다. 사실은 도청 범위를 벗어나는 중이다.' } },
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

/* ── 관계 비트 — 두 조각이 얽히는 막장 사건. 모든 쌍(36개) 커버.
   어떤 조합이든 사슬(A↔B, B↔C…)로 이어 한 편의 연결된 이야기를 만든다. ── */
const OPENINGS = {
  sheep: '주인공은 양. 15년 전 가족과 헤어졌다. 오늘 이 들판에 온 데는 이유가 있다.',
  moon: '주인공은 달. 이 들판의 모든 사건을 하늘에서 지켜본 유일한 목격자다.',
  phone: '주인공은 전화기. 이 들판의 모든 비밀이 이 안에 녹음되어 있다.',
  cloud: '주인공은 구름. 3년 전 이 들판에서 쫓겨났다. 오늘 돌아왔다.',
  fire: '주인공은 불. 시한부 선고를 받았다. 남은 시간은 아침까지.',
  house: '주인공은 집. 금고 안에 아직 공개되지 않은 유언장이 있다.',
  flower: '주인공은 꽃. 재벌가의 숨겨진 상속자다. 본인만 모른다.',
  dog: '주인공은 개. 기억상실이다. 목걸이의 주소 하나만 들고 여기까지 왔다.',
  umbrella: '주인공은 우산. 3년 전 결혼식장에서 도망쳤다. 오늘 돌아왔다.',
};

const PAIR_BEATS = {
  'moon+sheep': {
    fx: [{ piece: 'sheep', anim: 'stare' }, { piece: 'moon', anim: 'glow' }],
    sub: '달이 양을 내려다보다 떨리는 목소리로 말했다. "그 울음소리… 15년 전 잃어버린 내 딸이 분명하다."' },
  'phone+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'phone', dx: -12, dy: 2, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '양이 전화기를 밟자 재다이얼이 눌렸다. 수신처: 15년 전 양을 버린 그 목장. 운명 쪽에서 먼저 걸려왔다.' },
  'cloud+sheep': {
    fx: [{ piece: 'cloud', move: { near: 'sheep', dy: -22, dur: 2800 } }, { piece: 'sheep', anim: 'bob2' }],
    sub: '구름이 양 위에 멈춰 입을 열었다. "네 어미가 나한테 부탁했었다. 비를 피하게 해달라고. 15년 전에."' },
  'fire+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'fire', dx: -16, dy: 2, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '양이 불 앞에서 얼어붙었다. 이 온기… 설마. 그렇다. 불은 화재 그날 헤어진 양의 친오빠였다.' },
  'house+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'house', dx: 10, dy: 5, dur: 2800 } }],
    sub: '양이 대문 앞에서 걸음을 멈췄다. 문기둥의 흠집. 어릴 때 제가 들이받아 낸 그 흠집이었다. 여기다. 그 집.' },
  'flower+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'flower', dx: -13, dy: 2, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '양이 꽃을 먹으려다 멈췄다. 꽃잎의 문양. 제 목의 인식표와 같은 문양이었다. "너… 어느 집 자식이니."' },
  'dog+sheep': {
    fx: [{ piece: 'dog', move: { near: 'sheep', dx: -15, dy: 1, dur: 2800 } }, { piece: 'sheep', anim: 'bob2' }],
    sub: '개와 양이 마주 보고 울었다. 통역하면 이렇다. "너도 버려졌니?" "응." 동병상련은 국경도 종도 넘는다.' },
  'sheep+umbrella': {
    fx: [{ piece: 'sheep', move: { near: 'umbrella', dx: 6, dy: 7, dur: 2800 } }],
    sub: '양이 우산 밑으로 뛰어들었다. "숨겨줘. 목장에서 도망치는 중이야." 우산은 말없이 조금 더 기울어졌다.' },
  'moon+phone': {
    fx: [{ piece: 'moon', anim: 'glow', move: { near: 'phone', dy: -22, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '자정, 전화가 울렸다. 발신자: 달. "녹음 다 됐지? 내일 아침, 전부 폭로한다. 준비해."' },
  'cloud+moon': {
    fx: [{ piece: 'cloud', move: { near: 'moon', dx: -4, dy: 0, dur: 2800 } }, { piece: 'moon', anim: 'glow' }],
    sub: '구름이 달 앞을 막았다. "잠깐만 가려줘. 지금 아래에서 못 볼 짓이 벌어지고 있어. 증거를 잡아야 해."' },
  'fire+moon': {
    fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'moon', anim: 'glow' }],
    sub: '불이 달을 향해 소리쳤다. "하늘에서 다 봤잖아! 그날 밤 진짜 방화범이 누군지!" 달은 침묵했다. 아는 자의 침묵이었다.' },
  'house+moon': {
    fx: [{ piece: 'moon', anim: 'glow', move: { near: 'house', dy: -20, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '달빛이 집 안 금고를 비췄다. 다이얼 번호가 반짝였다. 0415. 누군가의 생일이다. 누구의 생일인지는 곧 밝혀진다.' },
  'flower+moon': {
    fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'flower', anim: 'bob2' }],
    sub: '달이 꽃에게 고백했다. "네 친모가 부탁했다. 밤마다 널 비춰달라고. 그게 마지막 부탁이었다."' },
  'dog+moon': {
    fx: [{ piece: 'dog', anim: 'stare' }, { piece: 'moon', anim: 'glow' }],
    sub: '개가 달을 보고 짖다가 뚝 멈췄다. 기억이 번쩍했다. 저 달 아래에서 누군가와 헤어졌던 기억. 단서다.' },
  'moon+umbrella': {
    fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'umbrella', anim: 'bob2' }],
    sub: '우산이 달빛을 가렸다. "찍히면 안 돼. 지금 파파라치가 쫙 깔렸어." 우산은 연예부 기자 출신이다.' },
  'cloud+phone': {
    fx: [{ piece: 'cloud', move: { near: 'phone', dy: -20, dur: 2800 } }, { piece: 'phone', anim: 'bob2' }],
    sub: '구름이 전화기 옆에 내려앉았다. "도청 자료, 나한테 넘겨. 내 복수에 필요해." 어둠의 거래가 성사됐다.' },
  'fire+phone': {
    fx: [{ piece: 'phone', anim: 'ring' }, { piece: 'fire', anim: 'flicker' }],
    sub: '전화기가 울렸다. 불은 손이 없어 못 받았다. 부재중 1통. 발신자: 담당 의사. 내용은 아무도 모른다. 아직은.' },
  'house+phone': {
    fx: [{ piece: 'phone', move: { near: 'house', dx: 8, dy: 4, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '전화기가 집 거실에 들어온 그날 밤부터, 이상한 전화가 걸려왔다. "그 집에서 당장 나와. 거긴 곧—" 뚝.' },
  'flower+phone': {
    fx: [{ piece: 'phone', move: { near: 'flower', dx: -10, dy: 3, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '전화기가 꽃 옆에서 울렸다. "꽃 본인 되십니까? 유전자 검사 결과가 나왔습니다. …앉아서 들으시죠."' },
  'dog+phone': {
    fx: [{ piece: 'dog', move: { near: 'phone', dx: -12, dy: 2, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '따르릉! 개가 달려왔다. 수화기 너머 목소리에 개가 그대로 굳었다. 잊고 있던 주인의 목소리였다.' },
  'phone+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'phone', dx: 6, dy: -8, dur: 2800 } }],
    sub: '우산이 전화기를 덮었다. "우리 지금 도청당하고 있어. 대화는 여기까지." 들판에 첩보전이 개봉했다.' },
  'cloud+fire': {
    fx: [{ piece: 'cloud', move: { near: 'fire', dy: -24, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '구름이 불 위에 도착했다. "3년 전 내 고향을 태운 게 너지. 복수하러 왔다." 불은 기억이 없었다. 쌍둥이가 있었던 거다.' },
  'cloud+house': {
    fx: [{ piece: 'cloud', move: { near: 'house', dy: -24, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '구름이 집 위에 멈췄다. "이 집, 등기부등본 떼봤어? 소유주가 세 번 바뀌었더라. 전부 같은 날에."' },
  'cloud+flower': {
    fx: [{ piece: 'cloud', move: { near: 'flower', dy: -20, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '구름이 꽃에게만 비를 내렸다. 유언 집행이었다. "네 친모의 마지막 부탁이다. 절대 마르게 두지 말라고."' },
  'cloud+dog': {
    fx: [{ piece: 'cloud', move: { by: [18, -2], dur: 3000 } }, { piece: 'dog', move: { by: [16, 2], dur: 3000 } }],
    sub: '개가 구름을 쫓기 시작했다. 구름이 소리쳤다. "따라오지 마! 나랑 엮이면 다들 위험해져!" 개는 더 빨리 달렸다.' },
  'cloud+umbrella': {
    fx: [{ piece: 'cloud', move: { near: 'umbrella', dy: -22, dur: 2800 } }, { piece: 'umbrella', anim: 'bob2' }],
    sub: '구름과 우산, 3년 만의 재회. "네가 뿌린 비 때문에 내 결혼식이 망했어." "…그날 비는 내가 아니야." 반전이었다.' },
  'fire+house': {
    fx: [{ piece: 'fire', anim: 'flicker', move: { near: 'house', dx: -13, dy: 1, dur: 2800 } }],
    sub: '30억 화재보험이 걸린 집 앞에 불이 나타났다. 전원 불을 의심했다. 불은 벽난로에 스스로 들어가는 것으로 결백을 증명했다.' },
  'fire+flower': {
    fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'flower', anim: 'bob2' }],
    sub: '불이 꽃 앞에서 멈췄다. "너도 주황색이구나. 우리 집안 색이다. 너… 성이 뭐니?" 꽃은 성이 없었다. 아직은.' },
  'dog+fire': {
    fx: [{ piece: 'dog', move: { near: 'fire', dx: -14, dy: 1, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '개가 불 곁에 앉자 온기에 기억이 새어 나왔다. 벽난로, 담요, 그리고 누군가의 손. 개가 소리 없이 울었다.' },
  'fire+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'fire', dx: -11, dy: -2, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '우산이 불 옆에 섰다. "바람은 내가 막는다. 넌 아침까지만 버텨. 시한부라며. 가기 전에 진실은 말하고 가."' },
  'flower+house': {
    fx: [{ piece: 'flower', move: { near: 'house', dx: -15, dy: 3, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '꽃이 집 앞으로 옮겨 온 날, 등기부에 없던 조항이 발견됐다. "이 집은 문 앞에 꽃이 피는 날 상속된다."' },
  'dog+house': {
    fx: [{ piece: 'dog', move: { near: 'house', dx: 14, dy: 3, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '개가 문 앞에 앉아 목걸이를 내밀었다. 목걸이의 주소와 문패가 일치했다. 기억보다 몸이 먼저 울었다.' },
  'house+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'house', dx: 13, dy: 2, dur: 2800 } }],
    sub: '우산이 현관에 기대섰다. 3년 전에도 저기 서 있었다. 집이 말했다. "돌아왔구나. 네 자리는 그대로 뒀다."' },
  'dog+flower': {
    fx: [{ piece: 'dog', move: { near: 'flower', dx: -13, dy: 1, dur: 2800 } }, { piece: 'flower', anim: 'shake' }],
    sub: '개가 꽃 냄새를 맡고 굳었다. 이 향기. 기억상실 전, 매일 맡던 그 향기다. 수사 단서 1호 확보.' },
  'flower+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'flower', dx: 2, dy: -13, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '소나기 속에서 우산이 꽃 위로 기울었다. "왜 나한테 잘해줘?" "…네 친모의 부탁이었다." 이 동네는 전부 친모의 부탁이다.' },
  'dog+umbrella': {
    fx: [{ piece: 'dog', move: { near: 'umbrella', dx: -11, dy: 2, dur: 2800 } }],
    sub: '개가 우산을 물어왔다. 우산 안쪽에 자수가 있었다. 개의 이름이었다. 이 우산은 원래, 개의 주인 것이었다.' },
};

// 두 조각을 잇는 장면 — 비트가 없으면 카메오로 안전망 (fx는 복제해서 반환)
const pickVariant = v => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);
function pairBeat(a, b, ctx) {
  const beat = pickVariant(PAIR_BEATS[[a, b].sort().join('+')]);
  if (!beat) return cameoScene(b, ctx);
  return { hold: 3400, ...beat, fx: [...(beat.fx || [])] };
}

/* ── 3막 구조 재료 — 주인공의 사연(시작)과 결말, 합류 문구(전개) ── */
const WANTS = {
  sheep: '양에게는 목적이 있다. 15년 전 자신을 버린 가족을 찾아 이 들판까지 온 것이다.',
  moon: '달은 오늘 밤 결심했다. 하늘에서 지켜본 15년 치의 진실을, 전부 폭로하기로.',
  phone: '전화기는 이 들판의 모든 비밀을 도청해왔다. 그리고 오늘, 드디어 입을 연다.',
  cloud: '구름은 복수하러 왔다. 3년 전 자신을 쫓아낸 바로 이 들판에.',
  fire: '불은 시한부 선고를 받았다. 남은 시간, 아침까지. 그 전에 끝내야 할 일이 있다.',
  house: '이 집 금고에는 아직 공개되지 않은 유언장이 있다. 공개일이 바로 오늘이다.',
  flower: '꽃은 재벌가의 숨겨진 상속자다. 이 들판에서 본인만 그 사실을 모른다.',
  dog: '개는 기억상실이다. 목걸이에 적힌 주소 하나만 들고 이 들판에 도착했다.',
  umbrella: '우산은 3년 전 결혼식장에서 도망쳤다. 오늘, 진실을 말하러 돌아왔다.',
};
const RESOLUTIONS = {
  sheep: '양은 가족을 찾았다. 여기 모인 전원이었다. 이 동네 족보는 원래 이렇게 얽혀 있다.',
  moon: '달은 전부 폭로했다. 들판이 뒤집혔다. 속은 다 시원했다.',
  phone: '전화기는 녹음본을 전부 공개했다. 이 들판에 이제 비밀은 없다. 평화는 그렇게 왔다.',
  cloud: '구름의 복수는 무산됐다. 다들 너무 반겨줘서. 복수 대상이 그날부로 가족이 됐다.',
  fire: '그리고 불은 아침을 맞았다. 오진이었다. 담당 의사는 그날로 해고됐다.',
  house: '유언장이 공개됐다. 상속자: 여기 모인 전원. 회장님은 처음부터 다 계획이 있었다.',
  flower: '꽃은 제 정체를 알고도 상속을 거부했다. 들판이 더 좋다고. 전원 기절했다.',
  dog: '개는 기억을 되찾았다. 목걸이의 주소는, 처음부터 이 들판이었다.',
  umbrella: '우산은 용서받았다. 도망친 이유가 밝혀졌으니까. 그날의 모든 것은 회장님의 음모였다.',
};
const JOIN_LINES = [
  l => `그때 문을 박차고 나타난 것은…! ${l}.`,
  l => `천둥소리와 함께 ${l} 등장. 우연이 아니다. 운명이다.`,
  l => `${l} 등장. 그 순간 BGM이 바뀌었다.`,
  l => `소문을 듣고 ${l} 도착. 이 동네 소문은 빛보다 빠르다.`,
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
      { bg: 'day', hold: 2800, fx: [], sub: '아무것도 안 놓고 START를 눌렀다. "제작비는 어디 쓴 거야!" 국장이 소리쳤다.' },
      { bg: 'day', hold: 3200, fx: [], sub: '출연진 전원 하차. 작가의 무리한 전개 때문이라는 소문이 파다하다.' },
      { bg: 'night', hold: 3400, fx: [], sub: '그래도 끝까지 본 당신이 진짜 주인공이다. 이 드라마는 이대로 완결. 시즌 2는 없다.' },
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
        sub: '새벽 세 시. 양은 잠들 수 없었다. 내일 아침, 유전자 검사 결과가 나온다.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'sheep', move: { by: [14, 0], dur: 2400 } }, { piece: 'moon', anim: 'glow' }],
        sub: c => `당신이 무심코 양을 세기 시작하자, ${c.zone('sheep')}의 양이 소리쳤다. "지금 양이나 세게 생겼어요?!"` },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'moon', anim: 'glow', move: { near: 'sheep', dx: 11, dy: -17, dur: 2900 } },
             { piece: 'sheep', anim: 'bob2' }],
        sub: '달이 내려왔다. "결과는 안 봐도 된다. 그래… 내가 네 친엄마다. 하늘에서 15년을 지켜봤다."' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'sheep', anim: 'bob2' }],
        sub: '그날 밤 아무도 잠들지 못했다. 15년 만의 모녀 상봉 앞에서 불면증은 아무것도 아니었다.' },
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
        sub: '이 목장의 양은 서류상 여덟 마리. 그런데 세면 아홉이 나온다. 보험사가 조사에 착수했다.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'sheep', move: { converge: true, k: 0.7, dur: 2600 } }],
        sub: '"자수해." 양들이 모여 서로를 노려봤다. 그때 한 마리가 입을 열었다. "…사실 난, 양이 아니야."' },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'sheep', move: { scatter: true, spread: 18, dur: 2600 } }],
        sub: '몸수색 직전, 양들이 사방으로 튀었다. 아홉 번째는 도주했다. 현장에 남은 것은 가발 한 뭉치.' },
      { bg: 'night', hold: 3800,
        fx: [{ piece: 'sheep', anim: 'bob2' }],
        sub: '아홉 번째 양의 정체는 늑대로 밝혀졌다. 그러나 아무도 신고하지 않았다. 양들 사이에서 걔가 제일 착했기 때문이다.' },
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
          ? '전화기는 사흘째 병원 전화를 기다리고 있다. 하늘에 걸어둔 보람도 없이, 하필 비구름이 도착했다.'
          : '전화기는 사흘째 병원 전화를 기다리고 있다. 검사 결과 통보다. 하필 그 위로 비구름이 도착했다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'phone', anim: 'ring' }],
        sub: '따르릉! 받았다. "여보세—" 뚝. 폭우에 끊겼다. 운명은 항상 이렇게 한 박자 엇나간다.' },
      { bg: 'rain', hold: 3400,
        fx: [{ piece: 'cloud', move: { by: [36, -4], dur: 3200 } }],
        sub: '구름이 사색이 되어 비켜섰다. "미안, 나 때문에… 다시 걸려올 거야. 중요한 전화는 반드시 다시 와."' },
      { bg: 'dusk', hold: 3600,
        fx: [],
        sub: '해 질 녘, 전화가 다시 울렸다. "결과 말씀드립니다. …오진이었습니다." 들판 전체가 환호했다.' },
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
        sub: '이 전화기는 달로만 연결된다. 도청이 불가능한 유일한 회선. 비밀을 가진 자들이 줄을 선다.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'phone', anim: 'ring' }, { piece: 'moon', anim: 'glow' }],
        sub: '따르릉. 달에게서 수신자 부담 전화가 왔다. "받아. 오늘 밤 폭로전에 증인이 필요해."' },
      { bg: 'night', hold: 3400,
        fx: [{ piece: 'moon', anim: 'glow', move: { near: 'phone', dy: -24, dur: 3200 } }],
        sub: '달이 내려와 속삭이기 시작했다. 15년 치 목격담이 쏟아졌다. 전화기는 한 마디도 놓치지 않고 녹음했다.' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '다음 날 아침, 들판의 모든 비밀이 공개됐다. 통화료는 달이 냈다. 정의는 원래 수신자 부담이다.' },
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
        sub: '30억 화재보험이 걸린 빈집 앞에 불이 나타났다. 마을이 발칵 뒤집혔다.' },
      { bg: 'dusk', hold: 3200,
        fx: [{ piece: 'fire', anim: 'flicker', move: { near: 'house', dx: -14, dy: 2, dur: 3000 } }],
        sub: '"저 방화범 아닌데요!" 불이 외쳤다. "3년 전 그 화재도 제가 아니에요. 쌍둥이 형이 한 짓이라고요!"' },
      { bg: 'fire', hold: 3400,
        fx: [{ piece: 'fire', anim: 'grow', move: { near: 'house', dx: 0, dy: -6, dur: 2800 } },
             { piece: 'house', anim: 'shake' }],
        sub: '불이 집으로 돌진했다…! 그리고 벽난로 자리에 쏙 들어가 앉았다. "봤죠? 전 태우는 불이 아니라 데우는 불입니다."' },
      { bg: 'night', hold: 3600,
        fx: [],
        sub: '쌍둥이 형은 이웃 마을에서 검거됐다. 불은 무죄. 집은 벽난로를 내줬고, 보험은 그날로 해지했다.' },
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
        sub: '구름이 불 위에 도착했다. "드디어 찾았다. 3년 전 내 고향을 태운 불." 복수의 비가 장전됐다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'cloud', anim: 'bob2' }],
        sub: '사흘 밤낮 폭우가 쏟아졌다. 불은 꺼지지 않고 외쳤다. "난 그날 거기 없었어! 알리바이가 있다고!"' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'fire', anim: 'grow' }, { piece: 'cloud', anim: 'bob2' }],
        sub: '그때 증거가 도착했다. 그날의 진범은 쌍둥이 형. …이 동네 쌍둥이 형들은 정말 쉴 틈이 없다.' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'cloud', move: { by: [34, -3], dur: 3200 } }, { piece: 'fire', anim: 'flicker' }],
        sub: '구름은 사과의 뜻으로 불 옆에 정착했다. 원수가 이웃이 됐다. 이 장르에서는 흔한 결말이다.' },
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
        sub: '지붕 없는 정류장에 우산 둘. 서로를 알아본 순간 정적이 흘렀다. 3년 전 결혼식의 그 두 우산이었다.' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'umbrella', move: { converge: true, k: 0.45, dur: 3000 } }],
        sub: '"왜 도망쳤어." "…회장님이 협박했어. 내가 떠나지 않으면 너희 집안을 무너뜨리겠다고."' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'umbrella', anim: 'ring' }],
        sub: '"그동안 어디 있었어." "비 안 오는 나라에. 우산이 숨기엔 거기가 제일이야." 서로 피식 웃었다.' },
      { bg: 'dusk', hold: 3600,
        fx: [{ piece: 'umbrella', move: { converge: true, k: 0.8, dur: 3200 } }],
        sub: '버스가 왔지만 둘은 타지 않았다. 3년 만에 다시 나란히 접혔다. 그리고 그날 저녁, 회장님은 전 재산을 몰수당했다. 인과응보다.' },
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
        sub: '기억상실증에 걸린 개가, 목걸이에 적힌 주소 하나만 들고 어느 대문 앞에 도착했다.' },
      { bg: 'dusk', hold: 3000,
        fx: [{ piece: 'dog', anim: 'bob2' }, { piece: 'house', anim: 'bob2' }],
        sub: '집이 떨리는 목소리로 물었다. "…초코? 너 초코 맞지?" 개는 기억이 없다. 그런데 꼬리가 먼저 흔들렸다.' },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '그때 발소리가 들렸다. 개의 몸이 굳었다. 기억보다 몸이 먼저 알아챘다. 이 발소리는—' },
      { bg: 'night', hold: 3800,
        fx: [{ piece: 'dog', move: { by: [6, 0], dur: 2000 } }],
        sub: '3년을 찾아 헤맨 주인이었다. 개는 기억을 되찾는 대신, 새로 만들기로 했다. 같은 집에서.' },
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
        sub: '비 오는 날 산책 금지. 이 집의 가훈이다. 그 가훈에는 사연이 있다. 3년 전 비 오는 날, 개가 실종됐었다.' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'dog', move: { near: 'umbrella', dx: -13, dy: 3, dur: 3000 } },
             { piece: 'umbrella', anim: 'bob2' }],
        sub: '그 개가 우산을 물고 현관에 앉았다. 시위가 아니다. 맹세다. "이번엔 절대 안 잃어버려."' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '30분의 대치 끝에 사람이 무릎을 꿇었다. "그래… 네가 그날을 이겨냈구나." 눈물의 화해였다.' },
      { bg: 'dusk', hold: 3800,
        fx: [{ piece: 'dog', move: { by: [30, 0], dur: 3400 } },
             { piece: 'umbrella', move: { by: [30, 0], dur: 3400 } }],
        sub: '한 우산 아래 발 여섯 개. 3년 만의 빗속 산책. 트라우마는 그렇게 극복되는 것이다.' },
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
        sub: '구름이 꽃 위에 자리 잡았다. 우연이 아니다. 유언 집행이다. "그 아이를 절대 마르게 두지 마라."' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'cloud', anim: 'bob2' }, { piece: 'flower', anim: 'shake' }],
        sub: '일주일 폭우. 옆 풀들이 수군댔다. "쟤만 챙기네." "재벌집 자식이래." 소문은, 사실이었다.' },
      { bg: 'day', hold: 3200,
        fx: [{ piece: 'cloud', move: { by: [36, -5], dur: 3200 } }, { piece: 'flower', anim: 'stare' }],
        sub: '구름이 떠나며 통보했다. "넌 온실의 상속자다. 조만간 데리러 오겠다." 꽃은 대답하지 않았다.' },
      { bg: 'day', hold: 3600,
        fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '꽃은 들판에 남았다. 상속 포기 각서를 꽃잎에 써서 바람에 날렸다. 사상 초유의 일이었다.' },
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
    // 3막 구조: 시작(전원 소개 + 주인공의 사연) → 전개(합류 비트, 전원이 서서히 모임) → 결말(수렴 + 진실 + 완결)
    buildScenes: c => {
      const order = [...new Set(c.placed.slice().sort((a, b) => a.x - b.x).map(p => p.type))];
      const label = t => c.placed.find(p => p.type === t).label;
      const lead = order[0];
      const scenes = [];

      // 1막 — 시작
      scenes.push({
        bg: 'day', hold: 3400,
        fx: [{ piece: lead, anim: 'bob2' }],
        sub: `${c.list}. 겉보기엔 평화로운 들판. 그러나 오늘, 묻어둔 진실이 밝혀진다. ${pickVariant(WANTS[lead]) || OPENINGS[lead] || ''}`,
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
            sub: '전원 집합. 폭로전 개시. 기절 1회, 물컵 투척 2회, "어머니!" 3회.',
          });
        } else {
          scenes[scenes.length - 1].bg = scenes[scenes.length - 1].bg || 'dusk';
        }
      }

      // 3막 — 결말: 전원 수렴 + 진실 공개, 완결
      scenes.push({
        bg: 'night', hold: 3600,
        fx: order.map(t => ({ piece: t, move: { gather: true, k: 0.6, dur: 3200 } })),
        sub: order.length === 1
          ? (pickVariant(RESOLUTIONS[lead]) || '')
          : `그날 밤, 전원이 ${label(lead)} 곁으로 모였다. ${pickVariant(RESOLUTIONS[lead]) || ''}`,
      });
      scenes.push({
        bg: 'night', hold: 3800, fx: [],
        sub: '모두 부둥켜안고 울었다. 비밀은 다 밝혀졌고 오해는 다 풀렸다. 이 들판에 더는 숨길 것이 없다. — 끝.',
      });
      return scenes;
    },
  },
];

/* ── 막장 대본 변형 — 같은 조합도 볼 때마다 다른 전개가 나오도록 ── */
const WANT_VARIANTS = {
  sheep: '양은 오늘 밤 이 들판을 떠나기로 했다. 목장의 빚 때문에 팔려 가기 전에.',
  moon: '달은 오늘 밤이 마지막 근무다. 내일부터 하늘에서 해고라는 소문이 돌고 있다.',
  phone: '전화기는 오늘 밤 걸려올 협박 전화를 기다리고 있다. 이번에는 역추적 준비가 끝났다.',
  cloud: '구름은 유서 깊은 비구름 가문의 장손이다. 오늘, 가문이 정한 정략결혼을 거부하고 도망쳐 왔다.',
  fire: '불은 어젯밤 기억을 잃었다. 눈 떠보니 이 들판. 옷깃에서는 낯선 재가 나왔다.',
  house: '집은 오늘 철거 통보를 받았다. 남은 시간 24시간. 그러나 이 집에는 아직 지킬 것이 있다.',
  flower: '꽃은 어제 우연히 듣고 말았다. 자신이 조화라는 소문을. 오늘 진실을 확인하러 간다.',
  dog: '개는 두 집 살림이 들통났다. 이 들판과 옆 들판. 오늘 안에 하나를 선택해야 한다.',
  umbrella: '우산은 어느 재벌가에서 잃어버린 가보다. 손잡이의 문장이 증거다. 오늘 감정 결과가 나온다.',
};
const RESOLUTION_VARIANTS = {
  sheep: '양은 떠나지 않았다. 들판 식구들이 목장 빚을 십시일반 갚아버렸기 때문이다.',
  moon: '해고는 없던 일이 됐다. 들판 전원이 하늘에 탄원서를 넣은 결과다.',
  phone: '협박범은 검거됐다. 역추적 성공. 범인은 옆 들판의 라디오였다.',
  cloud: '가문은 결혼을 포기했다. 구름은 이 들판에 신접살림을 차렸다. 상대는 옆 산의 안개. 가문도 결국 축복했다.',
  fire: '기억이 돌아왔다. 그날 밤 불은 남의 벽난로를 지키다 쓰러졌던 것이다. 영웅이었다.',
  house: '철거는 취소됐다. 전원의 서명운동 끝에 문화재로 지정됐기 때문이다.',
  flower: '감정 결과, 꽃은 진짜였다. 소문의 출처는 질투하던 옆 화단. 공개 사과를 받아냈다.',
  dog: '개는 선택하지 않았다. 두 들판을 합쳐버렸다. 그게 개의 방식이다.',
  umbrella: '감정 결과는 진품. 그러나 우산은 경매장 대신 들판에 남았다. 값을 매길 수 없는 것들이 여기 있어서.',
};
const BEAT_VARIANTS = {
  'moon+sheep': {
    fx: [{ piece: 'sheep', anim: 'stare' }, { piece: 'moon', anim: 'glow' }],
    sub: '양이 달을 향해 외쳤다. "15년 전 그날 밤, 하늘에서 다 봤죠? 증언해줘요!" 달이 고개를 끄덕였다. 재판이 뒤집히는 순간이었다.' },
  'fire+sheep': {
    fx: [{ piece: 'sheep', move: { by: [-14, 2], dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '불이 양의 털을 보고 경악했다. "그 무늬… 우리 집 벽난로 앞 카펫이랑 똑같아. 너 설마—" 양은 도망쳤다. 사연이 있는 게 분명하다.' },
  'dog+sheep': {
    fx: [{ piece: 'dog', move: { near: 'sheep', dx: 12, dy: 2, dur: 2800 } }],
    sub: '개는 한눈에 직감했다. 저 양, 미행당하고 있다. 개는 조용히 양의 뒤를 지키며 걸었다. 무보수 경호가 시작됐다.' },
  'house+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'house', dx: 8, dy: 5, dur: 2800 } }],
    sub: '양이 대문 앞에서 쓰러졌다. 집이 문을 열었다. "일단 들어와. 사연은 나중에." 이 집 문은 원래 사연 있는 것들에게만 열린다.' },
  'moon+phone': {
    fx: [{ piece: 'phone', anim: 'ring' }, { piece: 'moon', anim: 'glow' }],
    sub: '전화기가 달의 통화를 실수로 녹음해버렸다. 내용이 어마어마했다. 그날부로 전화기는 이 들판에서 가장 위험한 물건이 됐다.' },
  'fire+house': {
    fx: [{ piece: 'fire', anim: 'flicker', move: { near: 'house', dx: -12, dy: 1, dur: 2800 } }],
    sub: '집이 먼저 불을 불러들였다. "벽난로 자리를 주겠다. 조건은 하나. 내 금고를 지켜라." 불은 그을음으로 계약서에 서명했다.' },
  'dog+house': {
    fx: [{ piece: 'dog', move: { near: 'house', dx: -10, dy: 6, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '개가 마당에서 뼈다귀를 파냈다. 그 옆에 낡은 상자. 상자 안에는 사진 한 장. …사진 속에 그 개가 있었다.' },
  'cloud+fire': {
    fx: [{ piece: 'cloud', move: { near: 'fire', dy: -24, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '구름이 비를 뿌리려다 멈췄다. 불 옆에 어린 불씨들이 있었다. "…아이들은 건드리지 않는다." 구름은 그냥 지나갔다.' },
  'dog+fire': {
    fx: [{ piece: 'dog', move: { near: 'fire', dx: -13, dy: 1, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '소방서 신고 전화가 걸려오자 개가 몸으로 막아섰다. "이 불은 좋은 불이에요! 제가 보증합니다!" 개는 확신하고 있었다.' },
  'dog+umbrella': {
    fx: [{ piece: 'dog', move: { near: 'umbrella', dx: -11, dy: 2, dur: 2800 } }],
    sub: '개가 우산 속에서 쪽지를 발견했다. "3년 전 정류장에서. 미안했다." 개는 쪽지 주인을 찾아주기로 했다. 새 임무 발생.' },
  'flower+moon': {
    fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'flower', anim: 'shake' }],
    sub: '꽃이 달에게 물었다. "저 진짜 조화예요?" 달이 웃었다. "조화가 밤마다 달을 기다리니? 넌 진짜야." 꽃이 울었다.' },
  'cloud+umbrella': {
    fx: [{ piece: 'cloud', move: { near: 'umbrella', dy: -20, dur: 2800 } }, { piece: 'umbrella', anim: 'bob2' }],
    sub: '구름이 우산에게 자백했다. "3년 전 결혼식의 비, 사실 아버지 구름이 뿌렸어. 회장님의 사주를 받고." 스케일이 커졌다.' },
};
Object.entries(WANT_VARIANTS).forEach(([k, v]) => { WANTS[k] = [WANTS[k], v]; });
Object.entries(RESOLUTION_VARIANTS).forEach(([k, v]) => { RESOLUTIONS[k] = [RESOLUTIONS[k], v]; });
Object.entries(BEAT_VARIANTS).forEach(([k, v]) => { PAIR_BEATS[k] = [PAIR_BEATS[k], v]; });

GENRE_PACKS.makjang = { id: 'makjang', name: '막장드라마', SCENARIOS, cameoScene, pairBeat, joinLine };
})();
