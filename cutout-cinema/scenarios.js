// 시나리오 정의 — 정식 10편 + 특수 2편(빈 화면, 오늘의 들판)
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
        sub: '하늘의 양은 구름인 척하는 중이다. 아무도 안 속았다. 근데 다들 모른 척해줬다.' } },
    { scene: { fx: [{ piece: 'sheep', move: { by: [-13, 2], dur: 2800 } }],
        sub: '양은 그 와중에 풀을 찾아냈다. 어디서든 밥은 챙겨 먹는 성격이다.' } },
    { scene: { fx: [{ piece: 'sheep', anim: 'stare' }],
        sub: '양은 소동에 관심이 없다. 양의 관심사는 딱 두 개다. 풀, 그리고 낮잠.' } },
  ],
  moon: [
    { cond: c => c.zone('moon') === '들판',
      scene: { fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '들판에 내려온 달은 오늘 하늘 출근을 안 하기로 했다. 무단결근이다. 오늘 밤하늘이 어두운 건 그래서다.' } },
    { scene: { fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '달은 위에서 다 보고 있었다. 참견은 안 한다. 그게 달의 스타일이다.' } },
    { scene: { fx: [{ piece: 'moon', anim: 'glow', move: { by: [-8, -5], dur: 2600 } }],
        sub: '달이 슬쩍 자리를 옮겼다. 더 잘 보이는 자리로. 구경에도 명당이 있다.' } },
  ],
  dog: [
    { cond: c => c.zone('dog') === '하늘',
      scene: { fx: [{ piece: 'dog', anim: 'bob2' }],
        sub: '하늘에 뜬 개는 상황 파악을 포기하고 경치를 즐기기로 했다. 적응력 하나는 최고다.' } },
    { scene: { fx: [{ piece: 'dog', move: { by: [16, 2], dur: 2800 } }],
        sub: '개는 아까부터 냄새 하나를 추적 중이다. 뭔지는 모른다. 일단 쫓는 거다.' } },
    { scene: { fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '개가 카메라 쪽을 한 번 봤다. 다 안다는 표정. 그리고 다시 제 갈 길을 갔다.' } },
  ],
  flower: [
    { cond: c => c.zone('flower') === '하늘',
      scene: { fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '하늘에 심긴 꽃은 뿌리 대신 바람을 붙잡았다. 본인 말로는 의외로 살 만하다고 한다.' } },
    { scene: { fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '꽃은 소동과 무관하게 꽃잎 정리 중이다. 셀프 관리. 프로는 다르다.' } },
    { scene: { fx: [{ piece: 'flower', anim: 'shake' }],
        sub: '바람이 불자 꽃이 크게 흔들렸다. 손 흔드는 것처럼 보였는데, 맞다. 인사한 거다.' } },
  ],
  phone: [
    { scene: { fx: [{ piece: 'phone', anim: 'bob2' }],
        sub: '전화기는 이번에도 안 울렸다. 하지만 언제 울릴지 모른다는 긴장감. 그게 전화기의 존재감이다.' } },
    { scene: { fx: [{ piece: 'phone', anim: 'bob2' }],
        sub: '방금 누군가 이 번호를 반쯤 누르다 말았다. 전화기는 모른다. 모르는 게 낫다.' } },
  ],
  cloud: [
    { scene: { fx: [{ piece: 'cloud', move: { by: [20, -2], dur: 3000 } }],
        sub: '구름은 계속 지나가는 중이다. 어디로? 구름도 모른다. 원래 그렇게 산다.' } },
    { scene: { fx: [{ piece: 'cloud', anim: 'bob2' }],
        sub: '구름이 해를 잠깐 가렸다가 비켜줬다. 배경도 매너가 있다.' } },
  ],
  fire: [
    { scene: { fx: [{ piece: 'fire', anim: 'flicker' }],
        sub: '불은 구석에서 조용히 타는 중이다. 아무것도 안 태우는 불. 사실상 조명이다.' } },
    { scene: { fx: [{ piece: 'fire', anim: 'flicker' }],
        sub: '불은 자기 차례를 기다리는 중이다. 그 차례는 안 오는 게 모두에게 좋다. 본인도 안다.' } },
  ],
  house: [
    { scene: { fx: [{ piece: 'house', anim: 'bob2' }],
        sub: '집은 그냥 서 있다. 그게 집의 일이다. 오늘도 무사히 근무 완료.' } },
    { scene: { fx: [{ piece: 'house', anim: 'bob2' }],
        sub: '집 창문에 불이 들어왔다 꺼졌다. 누가 있나? 집은 말이 없다. 미스터리는 남겨두는 편이 재밌다.' } },
  ],
  umbrella: [
    { scene: { fx: [{ piece: 'umbrella', move: { by: [8, 1], dur: 2600 } }],
        sub: '우산이 바람에 살짝 밀렸다. 그래도 안 접혔다. 대기 중인 자의 자존심이다.' } },
    { scene: { fx: [{ piece: 'umbrella', anim: 'bob2' }],
        sub: '우산은 비가 안 와도 우산이다. 출동 대기. 그것도 엄연한 근무다.' } },
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

/* ── 관계 비트 — 두 조각이 실제로 얽히는 사건. 모든 쌍(36개) 커버.
   어떤 조합이든 사슬(A↔B, B↔C…)로 이어 한 편의 연결된 이야기를 만든다. ── */
const OPENINGS = {
  sheep: '주인공은 양이다. 풀을 씹다가 방금 고개를 들었다.',
  moon: '주인공은 달이다. 오늘따라 낮게 떴다. 이유가 있을 것이다.',
  phone: '주인공은 전화기다. 들판 한가운데 놓여 있다. 번호는 아무도 모른다.',
  cloud: '주인공은 구름이다. 지금 막 이 들판 상공에 도착했다.',
  fire: '주인공은 불이다. 어디서 왔는지는 아무도 모른다. 본인도 모른다.',
  house: '주인공은 집이다. 이 들판에 혼자 서 있은 지 3년째다.',
  flower: '주인공은 꽃이다. 심은 사람은 기억에 없지만 어쨌든 폈다.',
  dog: '주인공은 개다. 지금 몹시 할 일을 찾고 있다.',
  umbrella: '주인공은 우산이다. 비도 안 오는데 펼쳐져 있다. 사연이 있다.',
};

const PAIR_BEATS = {
  'moon+sheep': {
    fx: [{ piece: 'sheep', anim: 'stare' }, { piece: 'moon', anim: 'glow' }],
    sub: '양이 달을 보고 울었다. "메에엥." 달이 밝기를 두 칸 올려줬다. 달식 위로다.' },
  'phone+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'phone', dx: -12, dy: 2, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '양이 전화기를 풀인 줄 알고 씹었다. 따르릉! 양이 3미터를 점프했다. 들판 신기록이다.' },
  'cloud+sheep': {
    fx: [{ piece: 'cloud', move: { near: 'sheep', dy: -22, dur: 2800 } }, { piece: 'sheep', anim: 'bob2' }],
    sub: '구름이 양 위에 그늘을 깔아줬다. 양은 시원해서 좋고, 구름은 양이 폭신해 보여서 좋고.' },
  'fire+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'fire', dx: -16, dy: 2, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '양이 불에게 다가가 물었다. "너 꽃이야?" "아니, 위험이야." 불이 먼저 한 걸음 물러났다. 양털은 잘 타니까.' },
  'house+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'house', dx: 10, dy: 5, dur: 2800 } }],
    sub: '양이 집 그림자에 들어가 낮잠을 잤다. 3년 만의 손님. 집은 잔뜩 신났지만 티는 안 냈다.' },
  'flower+sheep': {
    fx: [{ piece: 'sheep', move: { near: 'flower', dx: -13, dy: 2, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '양이 꽃 앞에서 고민했다. 먹을까, 말까. 5분 고민 끝에 옆의 풀을 먹었다. 꽃은 살았다.' },
  'dog+sheep': {
    fx: [{ piece: 'dog', move: { near: 'sheep', dx: -15, dy: 1, dur: 2800 } }, { piece: 'sheep', anim: 'bob2' }],
    sub: '개가 양몰이를 시작했다. 문제: 양이 한 마리뿐이다. 어디로 몰지? 둘은 그냥 나란히 산책했다.' },
  'sheep+umbrella': {
    fx: [{ piece: 'sheep', move: { near: 'umbrella', dx: 6, dy: 7, dur: 2800 } }],
    sub: '양이 우산 밑에 들어가 봤다. 딱 맞았다. 양은 거기서 안 나오기로 했다. 우산의 첫 단골손님이다.' },
  'moon+phone': {
    fx: [{ piece: 'moon', anim: 'glow', move: { near: 'phone', dy: -22, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '따르릉. 달한테서 온 전화다. "잘 있나 해서." 용건은 없다. 달의 전화는 원래 용건이 없다.' },
  'cloud+moon': {
    fx: [{ piece: 'cloud', move: { near: 'moon', dx: -4, dy: 0, dur: 2800 } }, { piece: 'moon', anim: 'glow' }],
    sub: '구름이 달 앞을 막아섰다. "비켜봐." "싫은데." 실랑이는 구름의 패배로 끝났다. 달빛에 눈이 부셔서.' },
  'fire+moon': {
    fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'moon', anim: 'glow' }],
    sub: '땅의 빛과 하늘의 빛이 눈을 마주쳤다. "네가 더 밝다." "아니, 네가." 겸손 배틀은 무승부였다.' },
  'house+moon': {
    fx: [{ piece: 'moon', anim: 'glow', move: { near: 'house', dy: -20, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '달빛이 빈집 창문으로 들어갔다. 방 하나가 환해졌다. 달은 오늘 밤 거기서 묵기로 했다. 숙박비는 달빛으로 냈다.' },
  'flower+moon': {
    fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'flower', anim: 'bob2' }],
    sub: '밤인데 꽃이 안 잔다. "왜 안 자?" "너 보느라." 달이 순간 두 배로 밝아졌다. 다 티가 났다.' },
  'dog+moon': {
    fx: [{ piece: 'dog', anim: 'stare' }, { piece: 'moon', anim: 'glow' }],
    sub: '개가 달을 보고 짖었다. "멍!" 무응답. "멍멍!" 역시 무응답. 달은 원래 새침하다. 개는 내일 또 짖을 예정이다.' },
  'moon+umbrella': {
    fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'umbrella', anim: 'bob2' }],
    sub: '우산이 달빛을 가려줬다. "달빛도 오래 쬐면 탄다던데." 근거는 없다. 우산은 그냥 일하고 싶었던 거다.' },
  'cloud+phone': {
    fx: [{ piece: 'cloud', move: { near: 'phone', dy: -20, dur: 2800 } }, { piece: 'phone', anim: 'bob2' }],
    sub: '구름이 전화기 옆에 내려앉았다. "너도 소식 전하는 일 하지? 나도야." 동종업계의 만남이었다.' },
  'fire+phone': {
    fx: [{ piece: 'phone', anim: 'ring' }, { piece: 'fire', anim: 'flicker' }],
    sub: '전화기가 울렸다. 불은 손이 없어서 못 받았다. 발신자: 소방서. …안 받길 잘했다.' },
  'house+phone': {
    fx: [{ piece: 'phone', move: { near: 'house', dx: 8, dy: 4, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '전화기가 집으로 이사했다. 거실 자리 배정. 집은 이제 "전화 있는 집"이 됐다. 어깨가 좀 올라갔다.' },
  'flower+phone': {
    fx: [{ piece: 'phone', move: { near: 'flower', dx: -10, dy: 3, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '전화기가 꽃 옆에 자리를 잡았다. 꽃한테 오는 전화는 봄뿐이라, 지금부터 봄을 대기하는 중이다.' },
  'dog+phone': {
    fx: [{ piece: 'dog', move: { near: 'phone', dx: -12, dy: 2, dur: 2800 } }, { piece: 'phone', anim: 'ring' }],
    sub: '따르릉! 개가 전속력으로 달려왔다. 받지는 못한다. 대신 온 동네에 알렸다. "전화 왔다!! 전화!!"' },
  'phone+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'phone', dx: 6, dy: -8, dur: 2800 } }],
    sub: '우산이 전화기 쪽으로 기울었다. 뇌물성 친절이다. 비 소식은 전화가 제일 먼저 아니까, 잘 보여야 한다.' },
  'cloud+fire': {
    fx: [{ piece: 'cloud', move: { near: 'fire', dy: -24, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '소방수 구름이 불을 조준했다. …그런데 불이 너무 당당했다. 구름은 일단 옆 땅에만 뿌렸다. 경고 사격이다.' },
  'cloud+house': {
    fx: [{ piece: 'cloud', move: { near: 'house', dy: -24, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '구름이 집 위에 주차했다. "언제 갈 거야?" "글쎄, 여기 뷰가 좋아서." 집은 하루 종일 그늘 옷을 입었다.' },
  'cloud+flower': {
    fx: [{ piece: 'cloud', move: { near: 'flower', dy: -20, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '구름이 꽃에게만 비를 줬다. 딱 한 송이 분량. 옆의 풀들이 항의했다. "쟤만 주냐?" "응. 쟤만."' },
  'cloud+dog': {
    fx: [{ piece: 'cloud', move: { by: [18, -2], dur: 3000 } }, { piece: 'dog', move: { by: [16, 2], dur: 3000 } }],
    sub: '개가 구름을 쫓아 달리기 시작했다. 구름은 그냥 가던 길을 갔을 뿐인데. 개 인생 최고의 추격전이 개봉했다.' },
  'cloud+umbrella': {
    fx: [{ piece: 'cloud', move: { near: 'umbrella', dy: -22, dur: 2800 } }, { piece: 'umbrella', anim: 'bob2' }],
    sub: '구름과 우산이 대치했다. "내가 비 뿌리면 넌 펴질 거잖아." "이미 펴져 있는데?" 구름이 말문이 막혔다.' },
  'fire+house': {
    fx: [{ piece: 'fire', anim: 'flicker', move: { near: 'house', dx: -13, dy: 1, dur: 2800 } }],
    sub: '불이 집을 자꾸 쳐다보자 집이 먼저 말했다. "태우지 말고 그냥 들어와. 벽난로 자리 비었어." 파격 제안이었다.' },
  'fire+flower': {
    fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'flower', anim: 'bob2' }],
    sub: '불이 꽃의 색을 따라 해봤다. 주황, 빨강. "우리 좀 닮았지?" 꽃은 부정하지 않았다. 무서워서가 아니라 사실이라서.' },
  'dog+fire': {
    fx: [{ piece: 'dog', move: { near: 'fire', dx: -14, dy: 1, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '개가 불 옆에 자리 잡고 몸을 말렸다. 따뜻했다. 5분 만에 잠들었다. 불은 밤새 코 고는 소리를 들어줬다.' },
  'fire+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'fire', dx: -11, dy: -2, dur: 2800 } }, { piece: 'fire', anim: 'flicker' }],
    sub: '우산이 불 옆에 섰다. 비 막기용이 아니라 바람막이용. 불이 안 꺼지게. 우산 경력에 없던 신규 업무다.' },
  'flower+house': {
    fx: [{ piece: 'flower', move: { near: 'house', dx: -15, dy: 3, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '꽃이 집 앞으로 이사 왔다. 그날부터 이 집 주소는 "꽃 있는 집"이 됐다. 집도 그 이름이 꽤 마음에 들었다.' },
  'dog+house': {
    fx: [{ piece: 'dog', move: { near: 'house', dx: 14, dy: 3, dur: 2800 } }, { piece: 'house', anim: 'bob2' }],
    sub: '개가 집을 한 바퀴 돌더니 문 앞에 앉았다. 면접 끝. 채용 확정. 개는 오늘부터 이 집 경비다.' },
  'house+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'house', dx: 13, dy: 2, dur: 2800 } }],
    sub: '우산이 현관에 기대섰다. 원래 우산의 지정석은 현관이다. 집도 우산도 그걸 안다. 즉시 입주 완료.' },
  'dog+flower': {
    fx: [{ piece: 'dog', move: { near: 'flower', dx: -13, dy: 1, dur: 2800 } }, { piece: 'flower', anim: 'shake' }],
    sub: '개가 꽃 냄새를 맡았다. "에취!" 꽃가루 직격. 꽃은 그걸 칭찬으로 알아들었다. 사이좋게 지내기로 했다.' },
  'flower+umbrella': {
    fx: [{ piece: 'umbrella', move: { near: 'flower', dx: 2, dy: -13, dur: 2800 } }, { piece: 'flower', anim: 'bob2' }],
    sub: '소나기가 지나갈 때 우산이 꽃 위로 기울었다. 자기는 젖으면서. "왜 그래?" "예쁜 건 지켜야지."' },
  'dog+umbrella': {
    fx: [{ piece: 'dog', move: { near: 'umbrella', dx: -11, dy: 2, dur: 2800 } }],
    sub: '개가 우산을 물어다 놨다. 누구 주려고? 아직 미정이다. 개는 일단 준비부터 하는 타입이다.' },
};

// 두 조각을 잇는 장면 — 비트가 없으면 카메오로 안전망 (fx는 복제해서 반환)
function pairBeat(a, b, ctx) {
  const beat = PAIR_BEATS[[a, b].sort().join('+')];
  if (!beat) return cameoScene(b, ctx);
  return { hold: 3400, ...beat, fx: [...(beat.fx || [])] };
}

/* ── 3막 구조 재료 — 주인공의 목표(시작)와 달성(결말), 합류 문구(전개) ── */
const WANTS = {
  sheep: '양의 오늘 목표: 친구 사귀기. 마감은 해 지기 전까지.',
  moon: '달은 오늘 구경만 하다 끝내지 않기로 했다. 오늘은 이야기에 낀다.',
  phone: '전화기의 목표는 하나다. 오늘 안에 한 번은 울려보기.',
  cloud: '구름은 오늘 정착지를 구하는 중이다. 떠돌이 생활 3년 차, 지쳤다.',
  fire: '불의 목표: 아무것도 안 태우고 아침까지 생존하기. 난이도: 최상.',
  house: '빈집 3년 차. 집은 오늘 세입자를 구하기로 했다. 보증금 없음.',
  flower: '꽃은 지기 전에 유명해지고 싶다. 방법은 아직 모른다.',
  dog: '개는 오늘 지킬 것을 구하는 중이다. 무직 상태를 못 견디는 성격이라.',
  umbrella: '우산은 비 오는 날만 일하는 처지가 불만이다. 오늘 이직을 결심했다.',
};
const RESOLUTIONS = {
  sheep: '양은 친구 사귀기에 성공했다. 그것도 단체로.',
  moon: '달은 오늘 처음으로 이야기에 꼈다. 소감: 재밌었다고 한다.',
  phone: '그리고 전화기는 결국 울렸다. 다들 곁에 있어서 벨소리를 같이 들었다.',
  cloud: '구름은 정착했다. 여기가 마음에 든단다.',
  fire: '불은 생존에 성공했다. 무사고 기록 갱신 중이다.',
  house: '집은 세입자를 구했다. 그것도 여럿. 보증금은 그냥 안 받기로 했다.',
  flower: '꽃은 유명해졌다. 적어도 이 들판에서 모르는 이가 없다.',
  dog: '개는 취직했다. 담당 업무: 여기 있는 전부 지키기.',
  umbrella: '우산은 이직에 성공했다. 새 직업: 같이 있어주기.',
};
const JOIN_LINES = [
  l => `그때 ${l} 등장. 구경을 못 참는 성격이다.`,
  l => `소문을 듣고 ${l} 도착.`,
  l => `${l} 난입. 아무도 안 불렀는데 왔다.`,
  l => `지나가던 ${l} 합류. 원래 지나가던 쪽이 제일 오래 남는다.`,
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
      { bg: 'day', hold: 2800, fx: [], sub: '아무것도 안 놓고 START를 눌렀다. 대담한 선택이다.' },
      { bg: 'day', hold: 3200, fx: [], sub: '출연자 없음. 소품 없음. 제작비 0원. 그래도 영화는 시작됐다.' },
      { bg: 'night', hold: 3400, fx: [], sub: '그리고 이걸 끝까지 본 당신이 오늘의 주인공이다. 박수.' },
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
        sub: '새벽 세 시. 잠이 안 온 당신은 양을 세기로 했다. 마침 저기 한 마리 있다.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'sheep', move: { by: [14, 0], dur: 2400 } }, { piece: 'moon', anim: 'glow' }],
        sub: c => `"한 마리." 세는 순간 ${c.zone('sheep')}의 양이 딱 멈췄다. "저기요. 셀 거면 허락받고 세세요."` },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'moon', anim: 'glow', move: { near: 'sheep', dx: 11, dy: -17, dur: 2900 } },
             { piece: 'sheep', anim: 'bob2' }],
        sub: '달이 내려와서 중재했다. "얘도 불면증이야. 사흘째 못 잤대." 양에게도 사정이 있었다.' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'moon', anim: 'glow' }, { piece: 'sheep', anim: 'bob2' }],
        sub: '결국 셋 다 밤을 새웠다. 불면증 환자끼리는 이상하게 말이 잘 통한다.' },
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
        sub: '이 들판의 양은 분명 여덟 마리다. 그런데 세면 아홉이 나온다. 다시 세도 아홉.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'sheep', move: { converge: true, k: 0.7, dur: 2600 } }],
        sub: '"자수해." 양들이 모여서 서로를 노려봤다. 전원 시치미. 털 때문에 다 똑같이 생겼다.' },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'sheep', move: { scatter: true, spread: 18, dur: 2600 } }],
        sub: '몸수색이 시작되자 양들이 사방으로 튀었다. 아홉 번째 양은 끝내 안 잡혔다.' },
      { bg: 'night', hold: 3800,
        fx: [{ piece: 'sheep', anim: 'bob2' }],
        sub: '범인은 아직 이 안에 있다. 당신이 방금 센 그 양일 수도 있다.' },
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
          ? '전화기는 사흘째 전화를 기다리는 중이다. 하늘에 걸어둔 보람도 없이, 하필 비구름이 도착했다.'
          : '전화기는 사흘째 전화를 기다리는 중이다. 그 위로 하필 비구름이 도착했다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'phone', anim: 'ring' }],
        sub: '따르릉! 드디어! …아니었다. 빗방울이 다이얼을 누른 거였다. 전화기는 오늘만 두 번 속았다.' },
      { bg: 'rain', hold: 3400,
        fx: [{ piece: 'cloud', move: { by: [36, -4], dur: 3200 } }],
        sub: '구름이 미안해져서 슬쩍 비켰다. "미안, 나 때문에 벨소리 안 들렸지?"' },
      { bg: 'dusk', hold: 3600,
        fx: [],
        sub: '비가 그쳤고, 전화는 안 왔고, 대신 노을이 왔다. 전화기는 그걸로 퉁치기로 했다.' },
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
        sub: '이 전화기는 달로만 연결된다. 38만 킬로미터 국제전화. 요금이 무서워서 아무도 안 쓴다.' },
      { bg: 'night', hold: 3000,
        fx: [{ piece: 'phone', anim: 'ring' }, { piece: 'moon', anim: 'glow' }],
        sub: '따르릉. 달 쪽에서 먼저 걸어왔다. 수신자 부담. 받을까 말까. …받았다.' },
      { bg: 'night', hold: 3400,
        fx: [{ piece: 'moon', anim: 'glow', move: { near: 'phone', dy: -24, dur: 3200 } }],
        sub: '"어, 난데. 심심해서." 용건은 없었다. 달의 전화는 원래 용건이 없다. 통화는 길어졌다.' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'moon', anim: 'glow' }],
        sub: '요금 고지서는 끝내 안 왔다. 달이 냈다. 걔가 그런 건 또 잘 챙긴다.' },
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
        sub: '빈집 앞에 불이 서성거리고 있다. 누가 봐도 수상하다.' },
      { bg: 'dusk', hold: 3200,
        fx: [{ piece: 'fire', anim: 'flicker', move: { near: 'house', dx: -14, dy: 2, dur: 3000 } }],
        sub: '"저 방화범 아닌데요." 불이 먼저 말했다. 아무도 안 물어봤는데.' },
      { bg: 'fire', hold: 3400,
        fx: [{ piece: 'fire', anim: 'grow', move: { near: 'house', dx: 0, dy: -6, dur: 2800 } },
             { piece: 'house', anim: 'shake' }],
        sub: '불이 결국 집으로 돌진했다…! 그리고 벽난로 자리에 쏙 들어가 앉았다. 그게 목적이었다.' },
      { bg: 'night', hold: 3600,
        fx: [],
        sub: '그날 밤 빈집에 불이 켜졌다. 마을에선 누가 이사 왔다고 소문이 났다. 반은 맞는 말이다.' },
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
        sub: '소방 담당 구름이 출동했다. 목표: 저 아래 불. 예상 진압 시간: 5분.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'fire', anim: 'flicker' }, { piece: 'cloud', anim: 'bob2' }],
        sub: '비를 사흘 내내 퍼부었다. 불이 우산도 없이 버텼다. 구름은 자존심이 상하기 시작했다.' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'fire', anim: 'grow' }, { piece: 'cloud', anim: 'bob2' }],
        sub: '"너 대체 뭐야?" "나? 오기." 불은 오기로 타는 중이었다. 물로는 오기를 못 끈다.' },
      { bg: 'night', hold: 3600,
        fx: [{ piece: 'cloud', move: { by: [34, -3], dur: 3200 } }, { piece: 'fire', anim: 'flicker' }],
        sub: '구름은 결국 철수했다. 불은 지금도 탄다. 소문에 의하면 그날보다 더 크게.' },
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
        sub: '지붕 없는 정류장에 우산 둘. 버스는 40분째 안 온다.' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'umbrella', move: { converge: true, k: 0.45, dur: 3000 } }],
        sub: '왼쪽 우산이 슬쩍 기울었다. 오른쪽 우산도 슬쩍. 둘 다 아닌 척했다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'umbrella', anim: 'ring' }],
        sub: '"버스 원래 이래요?" "네. 여기 버스 유명해요. 안 오는 걸로." 대화가 시작됐다.' },
      { bg: 'dusk', hold: 3600,
        fx: [{ piece: 'umbrella', move: { converge: true, k: 0.8, dur: 3200 } }],
        sub: '버스가 왔다. 근데 둘 다 안 탔다. 다음 버스를 기다리기로 했다. 나란히.' },
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
        sub: '오후 다섯 시. 개가 대문 앞으로 출근했다. 이 개의 직업은 마중이다.' },
      { bg: 'dusk', hold: 3000,
        fx: [{ piece: 'dog', anim: 'bob2' }, { piece: 'house', anim: 'bob2' }],
        sub: '집이 물었다. "오늘도 나가?" 개는 대답 대신 꼬리를 흔들었다. 저게 "응"이라는 뜻이다.' },
      { bg: 'night', hold: 3200,
        fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '발소리! …택배였다. 개는 실망했지만 일단 택배 기사님도 반겨줬다. 프로니까.' },
      { bg: 'night', hold: 3800,
        fx: [{ piece: 'dog', move: { by: [6, 0], dur: 2000 } }],
        sub: '진짜 발소리는 그다음에 왔다. 개는 오늘도 마중에 성공했다. 통산 성공률 100%.' },
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
        sub: '비 오는 날 산책 금지. 이 집의 규칙이다. 개는 그 규칙에 반대표를 던졌다.' },
      { bg: 'rain', hold: 3200,
        fx: [{ piece: 'dog', move: { near: 'umbrella', dx: -13, dy: 3, dur: 3000 } },
             { piece: 'umbrella', anim: 'bob2' }],
        sub: '개는 우산 옆에 가서 앉았다. 시위다. 아주 효과적인 종류의.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'dog', anim: 'stare' }],
        sub: '30분 버티기 성공. 사람이 항복했다. "알았어, 알았다고. 가자."' },
      { bg: 'dusk', hold: 3800,
        fx: [{ piece: 'dog', move: { by: [30, 0], dur: 3400 } },
             { piece: 'umbrella', move: { by: [30, 0], dur: 3400 } }],
        sub: '한 우산 아래로 발 여섯 개가 걸어갔다. 넷은 신나서, 둘은 어쩔 수 없이.' },
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
        sub: '구름이 하필 꽃 바로 위에 주차했다. 꽃 입장에서는 기가 막힌 일이다.' },
      { bg: 'rain', hold: 3000,
        fx: [{ piece: 'cloud', anim: 'bob2' }, { piece: 'flower', anim: 'shake' }],
        sub: '일주일 내내 비. 꽃은 이사도 못 간다. 뿌리가 있으니까.' },
      { bg: 'day', hold: 3200,
        fx: [{ piece: 'cloud', move: { by: [36, -5], dur: 3200 } }, { piece: 'flower', anim: 'stare' }],
        sub: '구름이 떠나며 내려다봤다. 어라. 꽃이 멀쩡하다. 아니, 오히려 더 커졌다.' },
      { bg: 'day', hold: 3600,
        fx: [{ piece: 'flower', anim: 'bob2' }],
        sub: '그 비를 다 마시고 자란 거다. 꽃은 동네 최대어가 됐다. 구름 덕이라고는 절대 말 안 한다.' },
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
    // 3막 구조: 시작(전원 소개 + 주인공의 목표) → 전개(합류 비트, 전원이 서서히 모임) → 결말(수렴 + 목표 달성 + 에필로그)
    buildScenes: c => {
      const order = [...new Set(c.placed.slice().sort((a, b) => a.x - b.x).map(p => p.type))];
      const label = t => c.placed.find(p => p.type === t).label;
      const lead = order[0];
      const scenes = [];

      // 1막 — 시작
      scenes.push({
        bg: 'day', hold: 3400,
        fx: [{ piece: lead, anim: 'bob2' }],
        sub: `${c.list}. 오늘의 출연진이다. ${WANTS[lead] || OPENINGS[lead] || ''}`,
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
            sub: '어쩌다 보니 전원 집합했다. 각자 볼일은 핑계였고, 사실 다들 심심했던 거다.',
          });
        } else {
          scenes[scenes.length - 1].bg = scenes[scenes.length - 1].bg || 'dusk';
        }
      }

      // 3막 — 결말: 전원 수렴 + 주인공의 목표 달성, 에필로그
      scenes.push({
        bg: 'night', hold: 3600,
        fx: order.map(t => ({ piece: t, move: { gather: true, k: 0.6, dur: 3200 } })),
        sub: order.length === 1
          ? (RESOLUTIONS[lead] || '')
          : `그날 밤, 전원이 ${label(lead)} 곁으로 모였다. ${RESOLUTIONS[lead] || ''}`,
      });
      scenes.push({
        bg: 'night', hold: 3800, fx: [],
        sub: '내일 또 보자는 약속은 안 했다. 어차피 다들 여기 산다. 끝.',
      });
      return scenes;
    },
  },
];
