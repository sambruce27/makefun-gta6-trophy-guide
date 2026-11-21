// Leonida Trophy Guide — tracker logic. Loads app/data/trophies.json (same origin,
// no network beyond the app's own files), keeps earned ticks in localStorage,
// and renders the checklist, roadmap, missables and per-trophy guide pane.
const STORAGE_KEY = 'leonida-trophy-guide-earned-v1';
const SPOILER_KEY = 'leonida-trophy-guide-spoiler-v1';
const params = new URLSearchParams(location.search);

const listEl = document.getElementById('trophyList');
const missableEl = document.getElementById('missableList');
const roadmapEl = document.getElementById('roadmapList');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const kindEl = document.getElementById('kindFilter');
const earnedOnlyEl = document.getElementById('earnedOnly');
const spoilerEl = document.getElementById('spoilerToggle');
const detailPane = document.getElementById('detailPane');
const detailBody = document.getElementById('detailBody');

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;

function loadEarned() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); }
  catch { return new Set(); }
}
let earned = loadEarned();
spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1' || params.get('spoiler') === 'on';

// Seed for screenshots / fresh visitors: ?seed=13 ticks the first 13 story
// trophies only when nothing is saved yet, so the cover shows real progress.
if (params.get('seed') && earned.size === 0) {
  const n = Math.min(54, parseInt(params.get('seed'), 10) || 0);
  // Skip the platinum itself: it only unlocks after the other 54, so a
  // seeded demo should never show it earned while others are missing.
  trophies.filter((t) => t.grade !== 'platinum').slice(0, n).forEach((t) => earned.add(t.name));
  saveEarned();
}
if (params.get('kind')) kindEl.value = params.get('kind');
if (params.get('grade')) gradeEl.value = params.get('grade');

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function gradeLabel(t) { return t.grade; }
function kindLabel(t) {
  return { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' }[t.kind] ?? t.kind;
}
function isHidden(t) {
  return spoilerEl.checked && t.kind === 'story' && !earned.has(t.name);
}

function trophyCard(t) {
  const li = document.createElement('li');
  li.className = 'trophy' + (earned.has(t.name) ? ' earned' : '');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  box.addEventListener('click', (e) => e.stopPropagation());
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name); else earned.delete(t.name);
    saveEarned(); renderAll();
  });
  const main = document.createElement('div');
  const h = document.createElement('h3');
  if (isHidden(t)) {
    h.textContent = 'Hidden story trophy — earn it to reveal';
    h.classList.add('spoiler-hidden');
  } else {
    h.textContent = t.name;
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = ' · story-gated';
      h.append(flag);
    }
  }
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = isHidden(t) ? 'Spoiler-safe mode hides this story trophy until you earn it.' : t.description;
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = kindLabel(t) + ' · Stage ' + t.stage + ' · ' + (t.missable ? 'Treat as missable' : 'Repeatable in free roam');
  const teaser = document.createElement('p');
  teaser.className = 'guide-teaser';
  teaser.textContent = isHidden(t) ? '' : 'Guide: ' + t.guide.slice(0, 160) + (t.guide.length > 160 ? '…' : '');
  main.append(h, desc, meta, teaser);
  const grade = document.createElement('span');
  grade.className = 'grade ' + t.grade;
  grade.textContent = gradeLabel(t);
  li.append(box, main, grade);
  li.addEventListener('click', () => openDetail(t));
  return li;
}

function renderChecklist() {
  const q = searchEl.value.trim().toLowerCase();
  const shown = trophies.filter((t) => {
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (kindEl.value === 'online') return false; // this list has no online trophies
    if (kindEl.value === 'missable' && !t.missable) return false;
    if (kindEl.value !== 'all' && kindEl.value !== 'missable' && t.kind !== kindEl.value) return false;
    if (earnedOnlyEl.checked && !earned.has(t.name)) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
  listEl.replaceChildren(...shown.map(trophyCard));
  document.getElementById('emptyState').hidden = shown.length > 0;
  document.getElementById('onlineNote').hidden = kindEl.value !== 'online';
  document.getElementById('countLine').textContent =
    'Showing ' + shown.length + ' of 55 trophies' + (q ? ' for “' + searchEl.value.trim() + '”' : '') + '. Click any trophy for its full guide and sources.';
}

function renderProgress() {
  const n = earned.size;
  document.getElementById('earnedCount').textContent = n;
  document.getElementById('progressFill').style.width = (n / 55 * 100) + '%';
  document.getElementById('progressBar').setAttribute('aria-valuenow', String(n));
  const byGrade = {};
  for (const t of trophies) if (earned.has(t.name)) byGrade[t.grade] = (byGrade[t.grade] ?? 0) + 1;
  document.getElementById('progressText').textContent =
    n + ' of 55 earned · Platinum ' + Math.round(n / 55 * 100) + '% — ' +
    (n === 0 ? 'start with the story.' : n < 20 ? 'story stage: keep going.' : n < 45 ? 'cleanup stage: collectibles and activities.' : n < 54 ? 'almost there — money trophies left.' : 'one more for the platinum!');
  document.getElementById('gradeLine').textContent =
    'Platinum ' + (byGrade.platinum ?? 0) + '/1 · Gold ' + (byGrade.gold ?? 0) + '/2 · Silver ' + (byGrade.silver ?? 0) + '/6 · Bronze ' + (byGrade.bronze ?? 0) + '/46';
}

const STAGES = [
  [1, 'Story first', 'Play Chapters 1–4 and the named missions in order. The final mission ends the story — finish the side strands in Stage 2 before it.'],
  [2, 'Side strands', 'Finish the five named side characters (Andy, Kenton, Billy, Randy, Tyrone) and the other stranger strands. Eight strands earn the silver “Strangers & Freaks”.'],
  [3, 'Collectibles & exploration', 'Explore all 52 areas, meditate at all 18 spots, WAiNK It at 100 locations, complete 3 card sets, discover 100 vehicles. Travel the whole map once, properly.'],
  [4, 'Activities & challenges', 'The skill and grind trophies: 250 stunts, gold in all 42 Shooting Range challenges, 20 different race wins, drone races at all 14 locations, 50 challenges, and the stunt and robbery one-offs.'],
  [5, 'Money & cleanup', 'Rob 5 bank vaults, rob one illegal operation per gang (9 gangs), launder $250,000 in marked bills, spend $100,000 in shops, buy all 8 garages, register 10 vehicles. Then check the in-game tracker for 100% completion.'],
  [6, 'Platinum', '“Vice Got a Price!” unlocks automatically once the other 54 are earned. Nothing extra to do — just the last tick.'],
];
function renderRoadmap() {
  roadmapEl.replaceChildren(...STAGES.map(([num, title, blurb]) => {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.textContent = 'Stage ' + num + ' — ' + title;
    const p = document.createElement('p');
    p.textContent = blurb;
    const ul = document.createElement('ul');
    const stageTrophies = trophies.filter((t) => t.stage === num);
    for (const t of stageTrophies) {
      const item = document.createElement('li');
      item.textContent = (earned.has(t.name) ? '✓ ' : '○ ') + t.name + ' (' + t.grade + ')';
      ul.append(item);
    }
    li.append(h, p, ul);
    return li;
  }));
}

function renderMissables() {
  const miss = trophies.filter((t) => t.missable);
  missableEl.replaceChildren(...miss.map(trophyCard));
}

function openDetail(t) {
  detailBody.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = isHidden(t) ? 'Hidden story trophy' : t.name;
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = isHidden(t) ? 'Spoiler-safe mode hides this story trophy until you earn it.' : 'Official description: “' + t.description + '”';
  const pills = document.createElement('div');
  pills.className = 'pill-row';
  for (const label of [t.grade + ' trophy', kindLabel(t), 'Roadmap stage ' + t.stage, t.missable ? 'Story-gated — treat as missable' : 'Repeatable in free roam']) {
    const s = document.createElement('span');
    s.className = 'pill';
    s.textContent = label;
    pills.append(s);
  }
  const gh = document.createElement('h4');
  gh.textContent = 'Guide';
  const g = document.createElement('p');
  g.textContent = isHidden(t) ? 'Earn this trophy to reveal its guide.' : t.guide;
  const sh = document.createElement('h4');
  sh.textContent = 'Sources';
  const ul = document.createElement('ul');
  for (const s of t.sources) {
    const li = document.createElement('li');
    li.textContent = s;
    ul.append(li);
  }
  const note = document.createElement('p');
  note.textContent = 'Guide text is our own words. Trophy name and description are shown as PlayStation publishes them.';
  detailBody.append(h, desc, pills, gh, g, sh, ul, note);
  detailPane.hidden = false;
  detailPane.scrollTop = 0;
}
document.getElementById('detailClose').addEventListener('click', () => { detailPane.hidden = true; });

function showTab(name) {
  for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('active', tab.dataset.tab === name);
  document.getElementById('tab-checklist').hidden = name !== 'checklist';
  document.getElementById('tab-roadmap').hidden = name !== 'roadmap';
  document.getElementById('tab-missables').hidden = name !== 'missables';
}
for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => showTab(tab.dataset.tab));

function renderAll() { renderProgress(); renderChecklist(); renderRoadmap(); renderMissables(); }
for (const el of [searchEl, gradeEl, kindEl, earnedOnlyEl]) el.addEventListener('input', renderChecklist);
spoilerEl.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0');
  renderAll();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned], exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const names = Array.isArray(parsed) ? parsed : parsed.earned ?? [];
    const valid = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => valid.has(n)));
    saveEarned(); renderAll();
  } catch { alert('That file could not be read as trophy progress.'); }
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Clear all earned ticks? You can export a backup first.')) {
    earned = new Set(); saveEarned(); renderAll();
  }
});

renderAll();
if (params.get('tab')) showTab(params.get('tab'));
if (params.get('open')) {
  const t = trophies.find((x) => String(x.id) === params.get('open') || x.name === params.get('open'));
  if (t) openDetail(t);
}
