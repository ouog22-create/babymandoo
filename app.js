const DB_NAME = 'fifty-days-photo-note';
const DB_STORE = 'project';
const STATUS = ['대기', '촬영 중', '완료', '건너뜀'];
const state = { references: [], shots: [], prepared: [], groupMode: 'all', version: 1 };
let db;
let saveQueue = Promise.resolve();
let activePage = 'references';
let editor = null;
let detailId = null;
let focusIndex = 0;
let focusMode = false;
let referenceGroupMode = 'all';
let toastTimer;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const lines = value => String(value || '').split(/[\n,]/).map(item => item.trim()).filter(Boolean);
const attr = (name, value = '') => `name="${name}" value="${esc(value)}"`;
const imageSrc = value => /^data:image\/(png|jpeg|webp|gif|avif|heic|heif);base64,/i.test(value || '') ? value : '';

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeState() {
  saveQueue = saveQueue.catch(() => {}).then(() => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(structuredClone(state), 'main');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  }));
  saveQueue.catch(() => toast('저장 중 문제가 생겼어요. 백업을 확인해 주세요.'));
  return saveQueue;
}

async function loadState() {
  db = await openDB();
  const saved = await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get('main');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (saved) Object.assign(state, {
    references: Array.isArray(saved.references) ? saved.references : [],
    shots: Array.isArray(saved.shots) ? saved.shots : [],
    prepared: Array.isArray(saved.prepared) ? saved.prepared : [],
    groupMode: ['all', 'similar', 'lighting', 'tone', 'orientation', 'customCategory'].includes(saved.groupMode) ? saved.groupMode : 'all'
  });
  referenceGroupMode = state.groupMode;
}

function pageFromHash() { return location.hash === '#storyboard' ? 'storyboard' : 'references'; }
function navigate() {
  activePage = pageFromHash();
  $('#references-page').hidden = activePage !== 'references';
  $('#storyboard-page').hidden = activePage !== 'storyboard';
  $$('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === activePage));
  $('#mobile-add').setAttribute('aria-label', activePage === 'references' ? '레퍼런스 추가' : '촬영 컷 추가');
  focusMode = false;
  $('#focus-view').hidden = true;
  $('#shot-list').hidden = false;
  $('#shot-empty').hidden = state.shots.length > 0;
  $('#toggle-focus').textContent = '▣ 촬영 모드';
  window.scrollTo({ top: 0 });
}

function render() {
  $('#nav-ref-count').textContent = state.references.length;
  $('#nav-shot-count').textContent = state.shots.length;
  $('#reference-count').textContent = state.references.length;
  $('#shot-count').textContent = state.shots.length;
  renderReferences();
  renderShots();
  if (focusMode) renderFocus();
}

function renderReferences() {
  const search = $('#reference-search').value.trim().toLowerCase();
  const device = $('#reference-filter').value;
  const results = state.references.filter(ref => {
    const classification = ref.classification;
    const haystack = `${ref.title || ''} ${ref.tags || ''} ${ref.customCategory || ''} ${classification?.lighting || ''} ${classification?.tone || ''} ${classification?.orientation || ''}`.toLowerCase();
    return haystack.includes(search) && (device === 'all' || (ref.plannedDevice || '미정') === device);
  });
  $('#reference-empty').hidden = state.references.length > 0;
  $('#reference-no-results').hidden = !state.references.length || results.length > 0;
  $('#group-toolbar').hidden = state.references.length === 0;
  $('#classification-note').hidden = state.references.length === 0;
  $$('[data-group]').forEach(button => {
    button.classList.toggle('active', button.dataset.group === referenceGroupMode);
    button.setAttribute('aria-pressed', String(button.dataset.group === referenceGroupMode));
  });
  const card = ref => {
    const linked = state.shots.filter(shot => (shot.referenceIds || []).includes(ref.id)).length;
    const auto = ref.classification;
    const chips = [...(auto ? [auto.lighting, auto.tone, auto.orientation] : []), ...lines(ref.tags).slice(0, 2), ref.plannedDevice || '미정'];
    return `<article class="reference-card" data-reference="${esc(ref.id)}" tabindex="0" role="button" aria-label="${esc(ref.title)} 자세히 보기"><div class="reference-image"><img src="${imageSrc(ref.image)}" alt="${esc(ref.title)}" /></div><div class="reference-card-body"><div class="reference-card-title"><h3>${esc(ref.title)}</h3><span aria-hidden="true">↗</span></div><p>${esc(ref.reason || ref.composition || '촬영 아이디어를 기록해두었어요.')}</p><div class="chip-row">${chips.map((chip, index) => `<span class="chip ${index < 3 && auto ? 'auto' : ''} ${index === chips.length - 1 ? 'device' : ''}">${esc(chip)}</span>`).join('')}</div><div class="card-meta"><span>연결된 촬영 컷 ${linked}</span><span>자세히 보기 →</span></div></div></article>`;
  };
  const list = $('#reference-list');
  if (referenceGroupMode === 'all') {
    list.className = 'reference-grid';
    list.innerHTML = results.map(card).join('');
    return;
  }
  list.className = 'reference-groups';
  let groups;
  if (referenceGroupMode === 'similar') {
    groups = PhotoClassifier.similarGroups(results).map((group, index) => ({
      title: group.unclassified ? '분석되지 않은 사진' : group.members.length > 1 ? `비슷한 사진 ${index + 1}` : '단독 사진',
      members: group.members
    }));
  } else {
    const grouped = new Map();
    results.forEach(ref => {
      const name = referenceGroupMode === 'customCategory' ? ref.customCategory || '분류 미지정' : ref.classification?.[referenceGroupMode] || '분석되지 않은 사진';
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(ref);
    });
    groups = [...grouped].map(([title, members]) => ({ title, members }));
  }
  list.innerHTML = groups.map(group => `<section class="reference-group"><div class="reference-group-head"><h3>${esc(group.title)}</h3><span>${group.members.length}장</span></div><div class="reference-grid">${group.members.map(card).join('')}</div></section>`).join('');
}

function sumProps() {
  const props = new Map();
  state.shots.forEach(shot => lines(shot.props).forEach(name => {
    const key = name.toLocaleLowerCase();
    if (!props.has(key)) props.set(key, { key, name, count: 0 });
    props.get(key).count += 1;
  }));
  return [...props.values()];
}

function renderShots() {
  const done = state.shots.filter(shot => shot.status === '완료').length;
  const progress = state.shots.length ? Math.round(done / state.shots.length * 100) : 0;
  $('#stat-total').innerHTML = `${state.shots.length}<small>컷</small>`;
  $('#stat-must').innerHTML = `${state.shots.filter(shot => shot.priority === '꼭 찍기').length}<small>컷</small>`;
  $('#stat-duration').innerHTML = `${state.shots.reduce((total, shot) => total + (Number(shot.duration) || 0), 0)}<small>분</small>`;
  $('#stat-progress').innerHTML = `${progress}<small>%</small>`;
  $('#progress-fill').style.width = `${progress}%`;
  $('#shot-empty').hidden = state.shots.length > 0 || focusMode;
  $('#needed-count').textContent = sumProps().filter(item => !state.prepared.includes(item.key)).length || '';
  $('#shot-list').innerHTML = state.shots.map((shot, index) => {
    const reference = state.references.find(ref => (shot.referenceIds || []).includes(ref.id));
    const thumb = reference ? `<img src="${imageSrc(reference.image)}" alt="" />` : '✳';
    const devices = shot.device === '두 기기' ? '후지 + 핸드폰' : shot.device || '기기 미정';
    return `<article class="shot-card" data-shot="${esc(shot.id)}"><span class="shot-order">${String(index + 1).padStart(2, '0')}</span><div class="shot-thumb">${thumb}</div><div class="shot-main"><h3>${esc(shot.title)}</h3><p>${esc(shot.goal || '촬영 목표를 적어보세요.')}</p><div class="shot-meta"><span class="${shot.priority === '꼭 찍기' ? 'must' : ''}">${esc(shot.priority || '여유 있으면')}</span><span>${esc(devices)}</span><span>${Number(shot.duration) || 0}분</span><span>레퍼런스 ${(shot.referenceIds || []).length}</span></div>${shot.device === '두 기기' ? `<div class="device-checks"><label><input type="checkbox" data-device-check="fuji" data-shot-id="${esc(shot.id)}" ${shot.deviceDone?.fuji ? 'checked' : ''} />후지 촬영</label><label><input type="checkbox" data-device-check="phone" data-shot-id="${esc(shot.id)}" ${shot.deviceDone?.phone ? 'checked' : ''} />핸드폰 촬영</label></div>` : ''}</div><div class="shot-actions"><select class="status-select" data-status="${esc(shot.status || '대기')}" data-status-for="${esc(shot.id)}" aria-label="${esc(shot.title)} 상태">${STATUS.map(status => `<option value="${status}" ${status === (shot.status || '대기') ? 'selected' : ''}>${status}</option>`).join('')}</select><div class="mini-actions"><button type="button" data-move="up" data-id="${esc(shot.id)}" aria-label="위로 이동" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move="down" data-id="${esc(shot.id)}" aria-label="아래로 이동" ${index === state.shots.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-edit-shot="${esc(shot.id)}" aria-label="${esc(shot.title)} 편집">편집</button></div></div></article>`;
  }).join('');
  $$('#shot-list .mini-actions').forEach((actions, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.deleteShot = state.shots[index].id;
    button.setAttribute('aria-label', `${state.shots[index].title} 삭제`);
    button.textContent = '삭제';
    actions.append(button);
  });
}

function field(label, name, value = '', options = {}) {
  const { full = false, multiline = false, placeholder = '', hint = '', type = 'text', required = false } = options;
  return `<div class="field ${full ? 'full' : ''}"><label for="field-${name}">${label}${required ? ' *' : ''}</label>${multiline ? `<textarea id="field-${name}" name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input id="field-${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} />`}${hint ? `<span class="field-help">${hint}</span>` : ''}</div>`;
}

function selectField(label, name, value, values, full = false) {
  return `<div class="field ${full ? 'full' : ''}"><label for="field-${name}">${label}</label><select id="field-${name}" name="${name}">${values.map(item => `<option value="${esc(item)}" ${value === item ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select></div>`;
}

function openEditor(type, id = null) {
  const item = type === 'reference' ? state.references.find(ref => ref.id === id) : state.shots.find(shot => shot.id === id);
  editor = { type, id };
  $('#editor-kicker').textContent = type === 'reference' ? 'REFERENCE NOTE' : 'SHOOTING PLAN';
  $('#editor-title').textContent = `${type === 'reference' ? '레퍼런스' : '촬영 컷'} ${id ? '편집' : '추가'}`;
  $('#editor-save').textContent = id ? '변경사항 저장' : '추가하기';
  $('#editor-body').innerHTML = type === 'reference' ? referenceForm(item || {}) : shotForm(item || {});
  $('#editor-dialog').showModal();
}

function referenceForm(ref) {
  return `<div class="form-grid"><div class="field full"><span class="field-label">레퍼런스 이미지 *</span><label class="image-picker" for="reference-image">${ref.image ? `<img class="image-preview" src="${imageSrc(ref.image)}" alt="현재 레퍼런스 이미지" />` : '<span style="font-size:24px">▧</span>'}<strong>${ref.image ? '다른 이미지로 바꾸기' : '이미지 파일 선택하기'}</strong><span class="field-help">최대 20MB · ${ref.id ? '이미지 교체' : '여러 장 선택 시 공통 분석 내용을 적용하고 별도 레퍼런스로 추가'} · 브라우저에 저장</span><input id="reference-image" name="image" type="file" accept="image/*" ${ref.id ? '' : 'multiple required'} /></label></div>
  ${field('제목', 'title', ref.title, { required: true, placeholder: '예: 창가에서 바라보는 아기' })}
  ${field('태그', 'tags', ref.tags, { placeholder: '예: 자연광, 클로즈업' })}
  ${field('내 분류', 'customCategory', ref.customCategory, { full: true, placeholder: '예: 아기 단독, 가족사진, 소품컷', hint: '자동 분류와 별도로 원하는 이름으로 묶을 수 있어요.' })}
  ${field('마음에 드는 이유', 'reason', ref.reason, { full: true, multiline: true, placeholder: '이 장면에서 남기고 싶은 느낌' })}
  <div class="form-divider">장면 분석</div>
  ${field('구도', 'composition', ref.composition, { full: true, multiline: true, placeholder: '카메라 높이, 앵글, 아기 위치, 여백 등' })}
  ${field('조명', 'lighting', ref.lighting, { full: true, multiline: true, placeholder: '빛 방향, 시간대, 그림자, 커튼 또는 반사판' })}
  ${field('소품 · 의상', 'props', ref.props, { full: true, multiline: true, placeholder: '배경천, 의상, 기념 소품 등' })}
  ${selectField('원본 촬영 기기', 'sourceDevice', ref.sourceDevice || '미정', ['미정', '후지 카메라', '핸드폰', '기타'])}
  ${selectField('내 촬영 계획', 'plannedDevice', ref.plannedDevice || '미정', ['미정', '후지 카메라', '핸드폰'])}
  ${field('렌즈 · 화각 · 촬영 설정', 'settings', ref.settings, { full: true, multiline: true, placeholder: '확인된 정보와 예상한 내용을 구분해 적어주세요' })}
  ${field('보정 방법', 'editing', ref.editing, { full: true, multiline: true, placeholder: '밝기, 화이트밸런스, 피부톤, 색감, 크롭' })}
  ${field('우리 공간에서 재현할 방법', 'plan', ref.plan, { full: true, multiline: true, placeholder: '어디에서 어떻게 찍을지 적어보세요' })}
  <div class="form-divider">출처</div>
  ${field('원본 링크', 'sourceUrl', ref.sourceUrl, { full: true, type: 'url', placeholder: 'https://...' })}
  ${field('작가 · 계정 또는 출처 메모', 'sourceNote', ref.sourceNote, { full: true, placeholder: '출처를 기억할 수 있게 적어두세요' })}</div>`;
}

function shotForm(shot) {
  return `<div class="form-grid">${field('컷 제목', 'title', shot.title, { required: true, placeholder: '예: 잠든 아기 클로즈업' })}
  ${selectField('우선순위', 'priority', shot.priority || '꼭 찍기', ['꼭 찍기', '여유 있으면'])}
  ${field('한 줄 촬영 목표', 'goal', shot.goal, { full: true, placeholder: '이 사진에 담고 싶은 순간' })}
  <div class="field full"><span class="field-label">연결할 레퍼런스</span><div class="reference-options">${state.references.length ? state.references.map(ref => `<label class="reference-option"><input type="checkbox" name="referenceIds" value="${esc(ref.id)}" ${(shot.referenceIds || []).includes(ref.id) ? 'checked' : ''} /><img src="${imageSrc(ref.image)}" alt="" />${esc(ref.title)}</label>`).join('') : '<span class="field-help">아직 추가한 레퍼런스가 없어요. 나중에 연결할 수 있습니다.</span>'}</div></div>
  <div class="form-divider">촬영 계획</div>
  ${field('장소 · 배경', 'location', shot.location, { placeholder: '예: 거실 창가, 아이보리 배경천' })}
  ${field('예상 시간 (분)', 'duration', shot.duration ?? 5, { type: 'number', placeholder: '5' })}
  ${field('구도 · 아기 위치', 'composition', shot.composition, { full: true, multiline: true, placeholder: '어느 방향에서 어떤 높이로 찍을지' })}
  ${field('조명', 'lighting', shot.lighting, { full: true, multiline: true, placeholder: '빛 방향과 필요한 조명 도구' })}
  ${field('소품 · 의상', 'props', shot.props, { full: true, multiline: true, placeholder: '준비물은 쉼표 또는 줄바꿈으로 구분' })}
  ${selectField('사용할 기기', 'device', shot.device || '후지 카메라', ['후지 카메라', '핸드폰', '두 기기', '미정'])}
  ${selectField('대체 기기', 'backupDevice', shot.backupDevice || '없음', ['없음', '후지 카메라', '핸드폰'])}
  ${field('후지 카메라 촬영 메모', 'fujiNotes', shot.fujiNotes, { full: true, multiline: true, placeholder: '렌즈, 필름 시뮬레이션, 노출 등' })}
  ${field('핸드폰 촬영 메모', 'phoneNotes', shot.phoneNotes, { full: true, multiline: true, placeholder: '모드, 화각, 노출 등' })}
  ${field('아기 자세 · 보호자 역할 · 안전 메모', 'safety', shot.safety, { full: true, multiline: true, placeholder: '아기 컨디션에 따라 바꿀 점도 적어두세요' })}
  ${field('촬영 후 확인 메모', 'afterNotes', shot.afterNotes, { full: true, multiline: true, placeholder: '추가로 찍을 사진이나 확인할 점' })}</div>`;
}

async function fileToDataUrl(file) {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일을 선택해 주세요.');
  if (file.size > 20 * 1024 * 1024) throw new Error('20MB 이하 이미지를 선택해 주세요.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'));
    reader.readAsDataURL(file);
  });
}

async function saveEditor(event) {
  event.preventDefault();
  const form = $('#editor-form');
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const type = editor.type;
  const id = editor.id || uid();
  const collection = type === 'reference' ? state.references : state.shots;
  const previous = collection.find(item => item.id === id) || {};
  const item = { ...previous, id };
  try {
    if (type === 'reference') {
      const files = data.getAll('image').filter(file => file?.size);
      const images = await Promise.all(files.map(fileToDataUrl));
      if (images.length) item.image = images[0];
      if (!item.image) throw new Error('이미지를 선택해 주세요.');
      for (const name of ['title','tags','customCategory','reason','composition','lighting','props','sourceDevice','plannedDevice','settings','editing','plan','sourceUrl','sourceNote']) item[name] = String(data.get(name) || '').trim();
      if (!editor.id && images.length > 1) {
        for (const [index, image] of images.entries()) collection.push({ ...item, id: index === 0 ? id : uid(), image, title: index === 0 ? item.title : `${item.title} ${index + 1}`, classification: await analyzeSafely(image) });
        referenceGroupMode = state.groupMode = 'similar';
      } else {
        if (images.length || !item.classification) item.classification = await analyzeSafely(item.image);
        if (!editor.id) collection.push(item);
      }
    } else {
      for (const name of ['title','priority','goal','location','composition','lighting','props','device','backupDevice','fujiNotes','phoneNotes','safety','afterNotes']) item[name] = String(data.get(name) || '').trim();
      const duration = Number(data.get('duration'));
      if (!Number.isFinite(duration) || duration < 0 || duration > 600) throw new Error('예상 시간은 0~600분 사이로 입력해 주세요.');
      item.duration = duration;
      item.referenceIds = data.getAll('referenceIds');
      item.status ||= '대기';
    }
    if (type === 'shot' && !editor.id) collection.push(item);
    $('#editor-dialog').close();
    await writeState();
    render();
    toast(editor.id ? '변경사항을 저장했어요.' : type === 'reference' && data.getAll('image').filter(file => file?.size).length > 1 ? '레퍼런스를 여러 장 추가했어요.' : '새 항목을 추가했어요.');
  } catch (error) { toast(error.message || '저장에 실패했어요.'); }
}

function detailRow(label, value) { return value ? `<div class="detail-row"><strong>${label}</strong><span>${esc(value)}</span></div>` : ''; }
async function analyzeSafely(image) {
  try { return await PhotoClassifier.analyze(image); }
  catch (error) { console.warn('이미지 자동 분류 실패:', error); return null; }
}
function openDetail(id) {
  const ref = state.references.find(item => item.id === id);
  if (!ref) return;
  detailId = id;
  $('#detail-title').textContent = ref.title;
  const linked = state.shots.filter(shot => (shot.referenceIds || []).includes(id));
  $('#detail-body').innerHTML = `<div class="detail-layout"><div><img class="detail-image" src="${imageSrc(ref.image)}" alt="${esc(ref.title)}" /><div class="chip-row" style="margin-top:12px">${lines(ref.tags).map(tag => `<span class="chip">${esc(tag)}</span>`).join('')}</div>${ref.sourceUrl && /^https?:\/\//i.test(ref.sourceUrl) ? `<p style="margin-top:13px;font-size:11px"><a href="${esc(ref.sourceUrl)}" target="_blank" rel="noopener noreferrer" style="color:#4d7657;text-decoration:underline">원본 링크 열기 ↗</a></p>` : ''}</div><div><p class="detail-summary">${esc(ref.reason || '이 장면을 촬영 계획에 연결해보세요.')}</p>${ref.classification ? detailRow('자동 분류 · 이미지의 밝기, 색, 방향', `${ref.classification.lighting} · ${ref.classification.tone} · ${ref.classification.orientation}`) : ''}${detailRow('내 분류',ref.customCategory)}${detailRow('구도',ref.composition)}${detailRow('조명',ref.lighting)}${detailRow('소품 · 의상',ref.props)}${detailRow('원본 촬영 기기',ref.sourceDevice)}${detailRow('내 촬영 계획',ref.plannedDevice)}${detailRow('렌즈 · 화각 · 촬영 설정',ref.settings)}${detailRow('보정 방법',ref.editing)}${detailRow('재현 계획',ref.plan)}${detailRow('출처',ref.sourceNote)}<div class="detail-row"><strong>연결된 촬영 컷</strong>${linked.length ? `<div class="linked-shots">${linked.map(shot => `<button type="button" data-linked-shot="${esc(shot.id)}">${esc(shot.title)} ↗</button>`).join('')}</div>` : '<span>아직 연결된 컷이 없어요.</span>'}</div></div></div>`;
  $('#detail-dialog').showModal();
}

async function deleteReference() {
  const ref = state.references.find(item => item.id === detailId);
  if (!ref) return;
  const linked = state.shots.filter(shot => (shot.referenceIds || []).includes(detailId)).length;
  const message = linked ? `이 레퍼런스는 촬영 컷 ${linked}개와 연결되어 있어요. 레퍼런스를 삭제해도 컷은 유지됩니다. 삭제할까요?` : '이 레퍼런스를 삭제할까요?';
  if (!confirm(message)) return;
  state.references = state.references.filter(item => item.id !== detailId);
  state.shots.forEach(shot => { shot.referenceIds = (shot.referenceIds || []).filter(id => id !== detailId); });
  $('#detail-dialog').close();
  await writeState();
  render();
  toast('레퍼런스를 삭제했어요.');
}

async function deleteShot(id) {
  const shot = state.shots.find(item => item.id === id);
  if (!shot || !confirm(`'${shot.title}' 촬영 컷을 삭제할까요?`)) return;
  state.shots = state.shots.filter(item => item.id !== id);
  focusIndex = Math.min(focusIndex, state.shots.length - 1);
  await writeState(); render(); toast('촬영 컷을 삭제했어요.');
}

function renderChecklist() {
  const props = sumProps();
  $('#checklist-body').innerHTML = props.length ? props.map(item => `<label class="checklist-item"><input type="checkbox" data-prop="${esc(item.key)}" ${state.prepared.includes(item.key) ? 'checked' : ''} /><span>${esc(item.name)}</span><small>${item.count}개 컷에서 사용</small></label>`).join('') : '<p class="data-note">촬영 컷에 소품이나 의상을 입력하면 이곳에 모아 보여드려요.</p>';
}

function renderFocus() {
  if (!state.shots.length) { focusMode = false; $('#focus-view').hidden = true; $('#shot-list').hidden = false; return; }
  focusIndex = Math.max(0, Math.min(focusIndex, state.shots.length - 1));
  const shot = state.shots[focusIndex];
  const ref = state.references.find(item => (shot.referenceIds || []).includes(item.id));
  $('#focus-view').innerHTML = `<div class="focus-card"><div class="focus-image">${ref ? `<img src="${imageSrc(ref.image)}" alt="${esc(ref.title)}" />` : '✳'}</div><div class="focus-content"><span class="step">SHOT ${String(focusIndex + 1).padStart(2, '0')} / ${String(state.shots.length).padStart(2, '0')}</span><h2>${esc(shot.title)}</h2><p>${esc(shot.goal || '이 장면을 천천히 담아보세요.')}</p><div class="focus-notes"><div><strong>기기</strong> · ${esc(shot.device || '미정')}${shot.backupDevice && shot.backupDevice !== '없음' ? ` / 대체: ${esc(shot.backupDevice)}` : ''}</div>${shot.composition ? `<div><strong>구도</strong> · ${esc(shot.composition)}</div>` : ''}${shot.lighting ? `<div><strong>조명</strong> · ${esc(shot.lighting)}</div>` : ''}${shot.props ? `<div><strong>준비물</strong> · ${esc(shot.props)}</div>` : ''}${shot.device !== '핸드폰' && shot.fujiNotes ? `<div><strong>후지</strong> · ${esc(shot.fujiNotes)}</div>` : ''}${shot.device !== '후지 카메라' && shot.phoneNotes ? `<div><strong>핸드폰</strong> · ${esc(shot.phoneNotes)}</div>` : ''}${shot.safety ? `<div><strong>아기 · 안전</strong> · ${esc(shot.safety)}</div>` : ''}</div><div class="focus-controls"><button class="ghost-button" id="focus-prev" ${focusIndex === 0 ? 'disabled' : ''}>← 이전 컷</button><button class="ghost-button" id="focus-next" ${focusIndex === state.shots.length - 1 ? 'disabled' : ''}>다음 컷 →</button><button class="primary-button" id="focus-done">${shot.status === '완료' ? '✓ 완료됨' : '✓ 이 컷 완료'}</button></div></div></div>`;
  if (shot.device === '두 기기') $('#focus-view .focus-controls').insertAdjacentHTML('beforebegin', `<div class="device-checks focus-device-checks"><label><input type="checkbox" data-device-check="fuji" data-shot-id="${esc(shot.id)}" ${shot.deviceDone?.fuji ? 'checked' : ''} />후지 촬영 완료</label><label><input type="checkbox" data-device-check="phone" data-shot-id="${esc(shot.id)}" ${shot.deviceDone?.phone ? 'checked' : ''} />핸드폰 촬영 완료</label></div>`);
}

async function changeDeviceDone(input) {
  const shot = state.shots.find(item => item.id === input.dataset.shotId);
  if (!shot || shot.device !== '두 기기') return;
  shot.deviceDone ||= { fuji: false, phone: false };
  shot.deviceDone[input.dataset.deviceCheck] = input.checked;
  shot.status = shot.deviceDone.fuji && shot.deviceDone.phone ? '완료' : '촬영 중';
  await writeState(); render();
}

async function exportData() {
  const backup = JSON.stringify({ app: DB_NAME, exportedAt: new Date().toISOString(), data: state });
  const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `50일-촬영노트-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('백업 파일을 내려받았어요.');
}

async function importData(file) {
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (backup.app !== DB_NAME || !backup.data || !Array.isArray(backup.data.references) || !Array.isArray(backup.data.shots) || !Array.isArray(backup.data.prepared)) throw new Error('이 사이트의 백업 파일이 아니에요.');
    if (backup.data.references.some(ref => !ref.id || !imageSrc(ref.image)) || backup.data.shots.some(shot => !shot.id || !Array.isArray(shot.referenceIds))) throw new Error('백업 파일의 이미지나 기록이 올바르지 않아요.');
    if (!confirm(`현재 레퍼런스 ${state.references.length}개와 촬영 컷 ${state.shots.length}개를 백업 파일 내용으로 교체할까요? 필요하면 먼저 현재 데이터를 내보내세요.`)) return;
    Object.assign(state, { references: backup.data.references, shots: backup.data.shots, prepared: backup.data.prepared, groupMode: ['all', 'similar', 'lighting', 'tone', 'orientation', 'customCategory'].includes(backup.data.groupMode) ? backup.data.groupMode : 'all' });
    referenceGroupMode = state.groupMode;
    await writeState();
    $('#data-dialog').close();
    render();
    toast('백업 파일을 가져왔어요.');
  } catch (error) { toast(error.message || '백업 파일을 읽지 못했어요.'); }
  $('#import-file').value = '';
}

async function reclassifyAll() {
  const button = $('#reclassify');
  button.disabled = true;
  try {
    let analyzed = 0;
    for (const [index, ref] of state.references.entries()) {
      button.textContent = `분석 중 ${index + 1}/${state.references.length}`;
      ref.classification = await analyzeSafely(ref.image);
      if (ref.classification) analyzed++;
    }
    await writeState();
    renderReferences();
    toast(`${analyzed}장 분석을 마쳤어요.`);
  } finally {
    button.disabled = false;
    button.textContent = '↻ 다시 분석';
  }
}

function bindEvents() {
  window.addEventListener('hashchange', navigate);
  ['#add-reference','#empty-add-reference'].forEach(selector => $(selector).addEventListener('click', () => openEditor('reference')));
  ['#add-shot','#empty-add-shot'].forEach(selector => $(selector).addEventListener('click', () => openEditor('shot')));
  $('#mobile-add').addEventListener('click', () => openEditor(activePage === 'references' ? 'reference' : 'shot'));
  $('#reference-search').addEventListener('input', renderReferences);
  $('#reference-filter').addEventListener('change', renderReferences);
  $('#group-toolbar').addEventListener('click', event => {
    const group = event.target.closest('[data-group]');
    if (!group) return;
    referenceGroupMode = state.groupMode = group.dataset.group;
    renderReferences();
    writeState();
  });
  $('#reclassify').addEventListener('click', reclassifyAll);
  $('#reference-list').addEventListener('click', event => { const card = event.target.closest('[data-reference]'); if (card) openDetail(card.dataset.reference); });
  $('#reference-list').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { const card = event.target.closest('[data-reference]'); if (card) { event.preventDefault(); openDetail(card.dataset.reference); } } });
  $('#editor-form').addEventListener('submit', saveEditor);
  $('#editor-body').addEventListener('change', event => {
    if (event.target.id !== 'reference-image') return;
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast('20MB 이하 이미지를 선택해 주세요.'); event.target.value = ''; return; }
    const url = URL.createObjectURL(file);
    const preview = $('.image-preview') || document.createElement('img');
    preview.className = 'image-preview';
    preview.alt = '선택한 이미지 미리보기';
    preview.onload = () => URL.revokeObjectURL(url);
    preview.src = url;
    if (!preview.isConnected) $('.image-picker').prepend(preview);
  });
  $$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  $('#detail-edit').addEventListener('click', () => { const id = detailId; $('#detail-dialog').close(); openEditor('reference', id); });
  $('#detail-delete').addEventListener('click', deleteReference);
  $('#detail-body').addEventListener('click', event => {
    const button = event.target.closest('[data-linked-shot]');
    if (!button) return;
    const id = button.dataset.linkedShot;
    $('#detail-dialog').close();
    location.hash = '#storyboard';
    setTimeout(() => document.querySelector(`[data-shot="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  });
  $('#shot-list').addEventListener('change', async event => {
    const deviceCheck = event.target.closest('[data-device-check]');
    if (deviceCheck) { await changeDeviceDone(deviceCheck); return; }
    const select = event.target.closest('[data-status-for]');
    if (!select) return;
    const shot = state.shots.find(item => item.id === select.dataset.statusFor);
    if (!shot) return;
    shot.status = select.value;
    if (shot.device === '두 기기' && shot.status === '완료') shot.deviceDone = { fuji: true, phone: true };
    await writeState(); render();
  });
  $('#shot-list').addEventListener('click', async event => {
    const remove = event.target.closest('[data-delete-shot]');
    if (remove) { deleteShot(remove.dataset.deleteShot); return; }
    const edit = event.target.closest('[data-edit-shot]');
    if (edit) { openEditor('shot', edit.dataset.editShot); return; }
    const move = event.target.closest('[data-move]');
    if (move) {
      const index = state.shots.findIndex(shot => shot.id === move.dataset.id);
      const target = index + (move.dataset.move === 'up' ? -1 : 1);
      if (index < 0 || target < 0 || target >= state.shots.length) return;
      [state.shots[index], state.shots[target]] = [state.shots[target], state.shots[index]];
      await writeState(); render();
    }
  });
  $('#open-checklist').addEventListener('click', () => { renderChecklist(); $('#checklist-dialog').showModal(); });
  $('#checklist-body').addEventListener('change', async event => {
    const input = event.target.closest('[data-prop]');
    if (!input) return;
    state.prepared = input.checked ? [...new Set([...state.prepared, input.dataset.prop])] : state.prepared.filter(key => key !== input.dataset.prop);
    await writeState(); renderShots();
  });
  $('#toggle-focus').addEventListener('click', () => {
    if (!state.shots.length) { toast('먼저 촬영 컷을 추가해 주세요.'); return; }
    focusMode = !focusMode;
    $('#focus-view').hidden = !focusMode;
    $('#shot-list').hidden = focusMode;
    $('#toggle-focus').textContent = focusMode ? '▤ 목록 보기' : '▣ 촬영 모드';
    if (focusMode) renderFocus();
  });
  $('#focus-view').addEventListener('click', async event => {
    if (event.target.closest('#focus-prev')) { focusIndex--; renderFocus(); }
    if (event.target.closest('#focus-next')) { focusIndex++; renderFocus(); }
    if (event.target.closest('#focus-done')) {
      state.shots[focusIndex].status = '완료';
      if (state.shots[focusIndex].device === '두 기기') state.shots[focusIndex].deviceDone = { fuji: true, phone: true };
      await writeState(); render();
      toast('이 컷을 완료했어요.');
    }
  });
  $('#focus-view').addEventListener('change', async event => {
    const deviceCheck = event.target.closest('[data-device-check]');
    if (deviceCheck) await changeDeviceDone(deviceCheck);
  });
  $('#open-data').addEventListener('click', () => $('#data-dialog').showModal());
  $('#mobile-data').addEventListener('click', () => $('#data-dialog').showModal());
  $('#export-data').addEventListener('click', exportData);
  $('#import-data').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', event => importData(event.target.files[0]));
}

async function init() {
  bindEvents();
  try { await loadState(); render(); navigate(); }
  catch (error) { toast('브라우저 저장소를 열지 못했어요. 다른 브라우저에서 시도해 주세요.'); console.error(error); }
}
init();
