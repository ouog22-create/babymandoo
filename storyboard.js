const storyboardGroups = [
  {
    id: 'front', title: '정면 · 앉은 아기', subtitle: '눈높이에서 표정과 상반신을 담는 구도', photos: [2, 5, 6, 9, 15, 16, 25, 27],
    props: '아이보리 배경천 또는 침구\n흰색·남색 의상, 보닛\n안정적인 등받이·쿠션\n선택: 작은 과일 2개',
    guide: '카메라를 아기 눈높이에 두고 정면에서 촬영한다. 얼굴이 화면 상단에 너무 붙지 않게 여백을 남긴다.\n\n앉은 자세는 보호자가 바로 옆에서 허리와 목을 지지한다. 표정이 좋을 때 상반신, 얼굴 클로즈업 순으로 찍는다. 과일은 보호자가 들고 아기와 거리를 둔다.'
  },
  {
    id: 'overhead', title: '탑뷰 · 누운 아기', subtitle: '위에서 내려다보며 몸과 소품 배치를 함께 담는 구도', photos: [3, 4, 7, 8, 26, 28],
    props: '넓은 흰색 배경천·침구\n흰 의상·보닛\n꽃 또는 조화, 리본\n선택: 꽃다발 포장지·바구니',
    guide: '아기를 평평하고 안정적인 바닥에 눕히고 카메라를 얼굴 위쪽에서 수직에 가깝게 든다. 손과 발이 잘리지 않게 먼저 전신을 찍은 뒤 얼굴로 가까이 간다.\n\n꽃은 얼굴과 손에서 떨어진 바깥쪽에 배치한다. 포장지나 바구니를 쓸 경우 아기의 호흡과 움직임을 가리지 않도록 보호자가 계속 확인한다.'
  },
  {
    id: 'hands', title: '보호자의 손 · 받쳐 든 구도', subtitle: '손의 크기 대비로 아기의 작음을 보여주는 측면·정면 컷', photos: [10, 13, 18],
    props: '단색 벽 또는 배경천\n아기 의상·기저귀 커버\n보호자 의상(소매 색 통일)',
    guide: '아기를 안거나 두 손으로 안정적으로 받친 뒤, 카메라를 아기 몸과 같은 높이에 둔다. 배경은 단순하게 두고 팔과 손이 어디에서 들어오는지 프레임에 남긴다.\n\n먼저 넓게 찍고 얼굴·발끝이 잘리지 않는 범위에서 크롭한다. 아기를 높이 들거나 불안정한 자세를 오래 유지하지 않는다.'
  },
  {
    id: 'family', title: '가족 교감 · 가까운 거리', subtitle: '부모의 얼굴과 손, 아기의 반응을 같은 프레임에 담기', photos: [11, 12, 19],
    props: '톤이 맞는 가족 의상\n침대·소파 또는 넓은 매트\n밝은 창가 자리',
    guide: '아기를 중앙에 두고 부모가 양옆에서 가까이 다가간다. 한 명은 아기를 보거나 손을 잡고, 다른 한 명은 촬영한다. 둘 다 등장하는 컷은 삼각대·타이머를 활용한다.\n\n얼굴을 마주 보는 타이트 컷과 세 사람이 보이는 넓은 컷을 각각 남긴다. 아기의 눈에 강한 빛이 들어가지 않도록 창가 측면광을 사용한다.'
  },
  {
    id: 'profile', title: '옆모습 · 뒷모습', subtitle: '넓은 여백으로 실루엣과 시선을 강조하는 구도', photos: [20, 21],
    props: '무채색 배경·바닥천\n심플한 의상 또는 기저귀 커버\n선택: 작은 꽃, 가벼운 모형 과일',
    guide: '아기를 프레임 아래쪽이나 한쪽에 두고 시선 방향으로 넓은 여백을 남긴다. 옆모습은 장난감이나 보호자의 목소리로 시선을 유도한다.\n\n뒷모습은 보호자가 가까이서 자세를 지지하고 잠깐 촬영한다. 머리 위 소품은 직접 올려두지 말고, 안전한 위치에서 보호자가 들거나 후편집으로 연출한다.'
  },
  {
    id: 'detail', title: '손·발 디테일 · 콜라주', subtitle: '작은 신체 부위를 가까이 찍어 한 장의 모음으로 구성', photos: [1, 14, 22, 23, 24],
    props: '단색 담요 2종(밝은색·짙은색)\n작은 꽃 한 송이\n가족 손',
    guide: '발바닥, 손가락, 귀, 옆얼굴, 배꼽 등을 각각 클로즈업한다. 같은 거리·방향·빛으로 찍으면 나중에 콜라주로 묶기 쉽다.\n\n디테일마다 가로와 세로를 하나씩 남기고, 손발이 움직일 때 연속으로 여러 장 촬영한다. 꽃은 피부에 얹지 말고 가까운 배경에 둔다.'
  },
  {
    id: 'celebrate', title: '기념 세트 · 전신 정면', subtitle: '50일 소품을 넣어 공간 전체를 보여주는 넓은 구도', photos: [17],
    props: '50일 또는 축하 가랜드\n풍선·꽃병·꽃\n단색 배경천, 촬영 의상\n안정적인 바닥 매트',
    guide: '소품을 먼저 배치하고 아기를 마지막에 앉히거나 눕힌다. 카메라를 멀리 두어 소품과 아기 전신이 모두 들어오게 찍은 뒤, 중간 거리와 표정 컷을 추가한다.\n\n가랜드와 풍선 끈은 아기 손이 닿지 않는 위치에 고정한다. 소품이 많아 보이면 두세 가지만 남겨 얼굴이 중심이 되게 한다.'
  }
];

const storageKey = '50day-composition-storyboard-v1';
let notes = {};
try { notes = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { notes = {}; }

const boards = document.getElementById('boards');
const jump = document.getElementById('jump');
const status = document.getElementById('save-status');
const lightbox = document.getElementById('lightbox');
document.getElementById('group-count').textContent = storyboardGroups.length;
document.getElementById('photo-count').textContent = storyboardGroups.reduce((n, group) => n + group.photos.length, 0);

storyboardGroups.forEach((group, index) => {
  const link = document.createElement('a');
  link.href = `#${group.id}`;
  link.textContent = `${String(index + 1).padStart(2, '0')} ${group.title}`;
  jump.append(link);

  const board = document.createElement('section');
  board.className = 'board'; board.id = group.id;
  const left = document.createElement('div');
  left.className = 'board-left';
  const head = document.createElement('div'); head.className = 'board-head';
  const number = document.createElement('span'); number.className = 'board-no'; number.textContent = String(index + 1).padStart(2, '0');
  const titleWrap = document.createElement('div');
  const title = document.createElement('h2'); title.textContent = group.title;
  const subtitle = document.createElement('p'); subtitle.textContent = `${group.subtitle} · ${group.photos.length}장`;
  titleWrap.append(title, subtitle); head.append(number, titleWrap);
  const grid = document.createElement('div'); grid.className = 'photo-grid';
  group.photos.forEach(photoNumber => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'photo';
    button.setAttribute('aria-label', `레퍼런스 ${photoNumber} 크게 보기`);
    const img = document.createElement('img');
    img.src = `./ref/${encodeURIComponent(storyboardPhotos[photoNumber - 1])}`;
    img.alt = `${group.title} 레퍼런스 ${photoNumber}`; img.loading = 'eager';
    const badge = document.createElement('span'); badge.textContent = `REF ${String(photoNumber).padStart(2, '0')}`;
    button.append(img, badge); grid.append(button);
    button.addEventListener('click', () => {
      document.getElementById('large-photo').src = img.src;
      document.getElementById('large-photo').alt = img.alt;
      document.getElementById('photo-caption').textContent = `${group.title} · REF ${String(photoNumber).padStart(2, '0')}`;
      lightbox.showModal();
    });
  });
  left.append(head, grid);

  const aside = document.createElement('aside'); aside.className = 'notes';
  const notesTitle = document.createElement('div'); notesTitle.className = 'notes-title';
  notesTitle.innerHTML = '<span>SHOOTING NOTES</span><small>직접 수정 가능</small>';
  aside.append(notesTitle);
  [['props', '필요한 소품'], ['guide', '촬영 가이드']].forEach(([field, label]) => {
    const wrapper = document.createElement('div'); wrapper.className = `note-field ${field}`;
    const labelEl = document.createElement('label'); labelEl.textContent = label;
    labelEl.htmlFor = `${group.id}-${field}`;
    const input = document.createElement('textarea'); input.id = `${group.id}-${field}`;
    input.value = notes[group.id]?.[field] ?? group[field];
    input.addEventListener('input', () => {
      notes[group.id] = { ...(notes[group.id] || {}), [field]: input.value };
      try { localStorage.setItem(storageKey, JSON.stringify(notes)); status.textContent = '저장됨'; }
      catch { status.textContent = '저장 실패 · 내보내기를 사용하세요'; }
    });
    wrapper.append(labelEl, input); aside.append(wrapper);
  });
  board.append(left, aside); boards.append(board);
});

document.getElementById('close-lightbox').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
document.getElementById('print').addEventListener('click', () => window.print());
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('.note-field textarea').forEach(input => { input.style.height = `${input.scrollHeight}px`; });
});
window.addEventListener('afterprint', () => {
  document.querySelectorAll('.note-field textarea').forEach(input => { input.style.height = ''; });
});
document.getElementById('export').addEventListener('click', () => {
  const data = storyboardGroups.map(group => ({
    title: group.title,
    photos: group.photos.map(n => storyboardPhotos[n - 1]),
    props: notes[group.id]?.props ?? group.props,
    guide: notes[group.id]?.guide ?? group.guide
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = '50일-구도별-스토리보드.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
