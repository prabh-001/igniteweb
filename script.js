/* ========== Ignite - Combined script.js ========== */

/* Helpers */
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => Array.from((el || document).querySelectorAll(s));
const id = (i) => document.getElementById(i);

/* Sections & nav */
const homeSection = qs('#homeSection');
const prodSection = qs('#productivitySection');
const eduSection = qs('#educationSection');
const progressSection = qs('#progressSection');
const duelSection = qs('#duelSection');
function showSection(name){
  [homeSection, prodSection, eduSection, progressSection, duelSection].forEach(s => s.classList.remove('active'));
  if(name === 'home') homeSection.classList.add('active');
  if(name === 'productivity') prodSection.classList.add('active');
  if(name === 'education') eduSection.classList.add('active');
  if(name === 'progress') progressSection.classList.add('active');
  if(name === 'duel') duelSection.classList.add('active');
}

/* Nav bindings */
qs('#enterProductivity').addEventListener('click', () => showSection('productivity'));
qs('#enterEducation').addEventListener('click', () => showSection('education'));
qs('#enterProgress').addEventListener('click', () => showSection('progress'));
qs('#enterDuel').addEventListener('click', () => showSection('duel'));

qs('#goHome').addEventListener('click', () => showSection('home'));
qs('#goProductivity').addEventListener('click', () => showSection('productivity'));
qs('#goEducation').addEventListener('click', () => showSection('education'));
qs('#goProgress').addEventListener('click', () => showSection('progress'));
qs('#goDuel').addEventListener('click', () => showSection('duel'));

/* ---------- DARK MODE ---------- */
const DARK_KEY = 'ignite_dark_v1';
const darkToggle = qs('#darkToggle');
function setDarkMode(val){
  if(val){ document.documentElement.classList.add('dark'); darkToggle.innerText = '☀️'; }
  else { document.documentElement.classList.remove('dark'); darkToggle.innerText = '🌙'; }
  localStorage.setItem(DARK_KEY, val ? '1' : '0');
}
darkToggle.addEventListener('click', () => setDarkMode(localStorage.getItem(DARK_KEY) !== '1'));
setDarkMode(localStorage.getItem(DARK_KEY) === '1');

/* ---------- GLOBAL SEARCH (cross-section) ---------- */
const globalSearch = qs('#globalSearch');
const searchResults = qs('#searchResults');
globalSearch.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if(!q){ searchResults.classList.add('hidden'); return; }
  // search resources, tasks, timetable cells
  const resMatches = loadResources().filter(r => (r.title + ' ' + r.type + ' ' + r.subject + ' ' + r.url).toLowerCase().includes(q));
  const taskMatches = loadTasks().filter(t => t.text.toLowerCase().includes(q));
  const tableMatches = getTimetableCells().filter(cell => cell.text.toLowerCase().includes(q));

  // build html
  let html = '';
  if(resMatches.length){
    html += `<div class="row"><strong>Resources</strong></div>`;
    resMatches.slice(0,6).forEach(r => {
      html += `<div class="row"><a href="${escapeAttr(r.url)}" target="_blank">${escapeHtml(r.title)}</a><div class="muted">${escapeHtml(r.subject)}</div></div>`;
    });
  }
  if(taskMatches.length){
    html += `<div class="row"><strong>Tasks</strong></div>`;
    taskMatches.slice(0,6).forEach(t => {
      html += `<div class="row">${escapeHtml(t.text)}</div>`;
    });
  }
  if(tableMatches.length){
    html += `<div class="row"><strong>Timetable</strong></div>`;
    tableMatches.slice(0,6).forEach(c => {
      html += `<div class="row">${escapeHtml(c.text)} <span class="muted">(${escapeHtml(c.day)} ${escapeHtml(c.slot)})</span></div>`;
    });
  }
  if(!html) html = `<div class="row muted">No results</div>`;
  searchResults.innerHTML = html;
  searchResults.classList.remove('hidden');
});

/* close when click outside */
document.addEventListener('click', (ev) => {
  if(!globalSearch.contains(ev.target) && !searchResults.contains(ev.target)) {
    if(!searchResults.classList.contains('hidden')) searchResults.classList.add('hidden');
  }
});

/* ---------- STORAGE KEYS ---------- */
const TT_KEY = 'ignite_timetable_v1';
const TASKS_KEY = 'ignite_tasks_v1';
const POM_KEY = 'ignite_pom_v1';
const RES_KEY = 'ignite_resources_v1';
const PROG_KEY = 'ignite_prog_v1';
const PROFILE_PREFIX = 'ignite_profile_'; // + name

/* ---------------- TIMETABLE ---------------- */
const timetableEl = qs('#timetable');
const saveTTBtn = qs('#saveTT');
const loadSampleBtn = qs('#loadSampleTT');
const exportTTBtn = qs('#exportTT');

saveTTBtn.addEventListener('click', () => { localStorage.setItem(TT_KEY, timetableEl.querySelector('tbody').innerHTML); alert('Timetable saved'); });
loadSampleBtn.addEventListener('click', loadSampleTimetable);
exportTTBtn.addEventListener('click', () => {
  // quick export: convert non-empty cells to tasks
  const cells = getTimetableCells().filter(c => c.text.trim());
  if(!cells.length) return alert('No items to export');
  const tasks = loadTasks();
  cells.forEach(c => {
    tasks.unshift({ id: 't' + Date.now() + Math.random().toString(36).slice(2,6), text: `Study: ${c.text} (${c.day} ${c.slot})`, done:false });
  });
  saveTasks(tasks);
  renderTasks();
  updateProgressUI();
  alert(`${cells.length} items exported as tasks`);
});

function loadSampleTimetable(){
  const sample = `
<tr><td>Monday</td><td>Math</td><td>Physics</td><td>Mechanics</td><td>Lunch</td><td>Lab</td></tr>
<tr><td>Tuesday</td><td>Programming</td><td>Math</td><td>Punjabi</td><td>English</td><td>Study</td></tr>
<tr><td>Wednesday</td><td>Math</td><td>Physics</td><td>Mechanics</td><td>Break</td><td>Lab</td></tr>
<tr><td>Thursday</td><td>Programming</td><td>Math</td><td>Physics</td><td>English</td><td>Study</td></tr>
<tr><td>Friday</td><td>Mechanics</td><td>Physics</td><td>Programming</td><td>Lunch</td><td>Revision</td></tr>
<tr><td>Saturday</td><td>Practice</td><td>Project</td><td>Notes</td><td>Rest</td><td>Rest</td></tr>
`;
  timetableEl.querySelector('tbody').innerHTML = sample;
  localStorage.setItem(TT_KEY, timetableEl.querySelector('tbody').innerHTML);
}

/* helper: get cells data */
function getTimetableCells(){
  const rows = Array.from(timetableEl.querySelectorAll('tbody tr'));
  const out = [];
  rows.forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll('td'));
    const day = tds[0].innerText.trim();
    const slots = tds.slice(1);
    slots.forEach((td, i) => {
      const slotLabel = ['9-10','10-11','11-12','2-3','3-4'][i] || `slot${i+1}`;
      out.push({ day, slot: slotLabel, text: td.innerText.trim(), cell: td });
    });
  });
  return out;
}

/* double-click cell to add as To-Do */
timetableEl.addEventListener('dblclick', (e) => {
  const td = e.target.closest('td');
  if(!td || td.cellIndex === 0) return; // skip day column
  const text = td.innerText.trim();
  if(!text) return alert('Cell is empty');
  if(confirm(`Add "${text}" to your To-Do list?`)) {
    addTaskFromText(`Study: ${text}`);
  }
});

/* autosave timetable if stored previously */
(function loadTimetable(){
  const raw = localStorage.getItem(TT_KEY);
  if(raw) timetableEl.querySelector('tbody').innerHTML = raw;
})();

/* autosave every 45s */
setInterval(()=> localStorage.setItem(TT_KEY, timetableEl.querySelector('tbody').innerHTML), 45000);

/* ---------------- TASKS ---------------- */
const taskInput = qs('#taskInput');
const addTaskBtn = qs('#addTaskBtn');
const taskListEl = qs('#taskList');
const clearDoneBtn = qs('#clearDone');
const clearAllBtn = qs('#clearAll');

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') addTask(); });
clearDoneBtn.addEventListener('click', () => {
  let tasks = loadTasks().filter(t => !t.done);
  saveTasks(tasks); renderTasks(); updateProgressUI();
});
clearAllBtn.addEventListener('click', () => { if(confirm('Clear all tasks?')) { saveTasks([]); renderTasks(); updateProgressUI(); } });

function loadTasks(){ const raw = localStorage.getItem(TASKS_KEY); if(!raw) return []; try{ return JSON.parse(raw);}catch{ return []; } }
function saveTasks(arr){ localStorage.setItem(TASKS_KEY, JSON.stringify(arr)); }
function addTask(){ const text = taskInput.value.trim(); if(!text) return; const tasks = loadTasks(); tasks.unshift({ id:'t'+Date.now(), text, done:false }); saveTasks(tasks); taskInput.value=''; renderTasks(); updateProgressUI(); }
function addTaskFromText(text){ if(!text) return; const tasks = loadTasks(); tasks.unshift({ id:'t'+Date.now(), text, done:false }); saveTasks(tasks); renderTasks(); updateProgressUI(); }

function toggleTask(id){ const tasks = loadTasks(); const i = tasks.findIndex(t=>t.id===id); if(i===-1) return; tasks[i].done = !tasks[i].done; saveTasks(tasks); renderTasks(); updateProgressUI(); }
function removeTask(id){ let tasks = loadTasks(); tasks = tasks.filter(t=>t.id!==id); saveTasks(tasks); renderTasks(); updateProgressUI(); }

function renderTasks(){
  const tasks = loadTasks();
  taskListEl.innerHTML = '';
  if(!tasks.length){ taskListEl.innerHTML = '<li class="muted">No tasks yet. Add one above.</li>'; return; }
  tasks.forEach(t=>{
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `<div class="task-left"><input type="checkbox" ${t.done?'checked':''} onchange="(function(){toggleTask('${t.id}')})()"><div class="task-title" style="${t.done?'text-decoration:line-through;color:var(--muted)':''}">${escapeHtml(t.text)}</div></div><div><button class="small" onclick="(function(){removeTask('${t.id}')})()">Delete</button></div>`;
    taskListEl.appendChild(li);
  });
}
renderTasks();

/* ---------------- POMODORO ---------------- */
const timerDisplay = qs('#timerDisplay');
const startBtn = qs('#startPom');
const pauseBtn = qs('#pausePom');
const resetBtn = qs('#resetPom');
const pomSessionsEl = qs('#pomSessions');
const pomMinutesEl = qs('#pomMinutes');

const shortBtn = qs('#shortBtn');
const workBtn = qs('#workBtn');
const longBtn = qs('#longBtn');

shortBtn.addEventListener('click', () => setPomodoroLength(15));
workBtn.addEventListener('click', () => setPomodoroLength(25));
longBtn.addEventListener('click', () => setPomodoroLength(50));

startBtn.addEventListener('click', startPomodoro);
pauseBtn.addEventListener('click', pausePomodoro);
resetBtn.addEventListener('click', resetPomodoro);

let pomState = (function(){ const raw = localStorage.getItem(POM_KEY); if(!raw) return { length:25, left:25*60, running:false, sessions:0, minutes:0 }; try{ return JSON.parse(raw);}catch{return { length:25,left:25*60,running:false,sessions:0,minutes:0 }} })();
let pomInterval = null;
function setPomodoroLength(m){ pomState.length = m; pomState.left = m*60; savePom(); updateTimer(); }
function startPomodoro(){ if(pomState.running) return; pomState.running = true; savePom(); pomInterval = setInterval(()=>{ pomState.left--; if(pomState.left<=0){ // finished
    pomState.sessions++; pomState.minutes += pomState.length;
    const prev = Number(localStorage.getItem('ignite_pomodoro_minutes')||0); localStorage.setItem('ignite_pomodoro_minutes', String(prev + pomState.length));
    alert('Pomodoro finished ✅');
    pomState.left = pomState.length*60; pomState.running = false; clearInterval(pomInterval); pomInterval = null;
    savePom(); updatePomUI(); updateProgressUI(); updateTimer();
    return;
  } savePom(); updateTimer(); }, 1000); updatePomUI(); }
function pausePomodoro(){ if(pomInterval){ clearInterval(pomInterval); pomInterval=null; } pomState.running=false; savePom(); updatePomUI(); }
function resetPomodoro(){ if(pomInterval){ clearInterval(pomInterval); pomInterval=null; } pomState.left = pomState.length*60; pomState.running=false; savePom(); updateTimer(); updatePomUI(); }
function savePom(){ localStorage.setItem(POM_KEY, JSON.stringify(pomState)); }
function updateTimer(){ const m = Math.floor(pomState.left/60); const s = pomState.left%60; timerDisplay.innerText = `${m}:${s<10?'0':''}${s}`; }
function updatePomUI(){ pomSessionsEl.innerText = pomState.sessions; pomMinutesEl.innerText = pomState.minutes; }
updateTimer();
updatePomUI();

/* ensure persistent pom minutes key exists */
(function ensurePomMinutes(){
  const stored = Number(localStorage.getItem('ignite_pomodoro_minutes') || 0);
  if(stored > pomState.minutes){ pomState.minutes = stored; savePom(); updatePomUI(); } else { localStorage.setItem('ignite_pomodoro_minutes', String(pomState.minutes)); }
})();

/* ---------------- EDUCATION RESOURCES ---------------- */
const defaultResources = [
  { id: 'r1', subject: 'Engineering Mechanics', title: 'Mechanics Lecture 1 - Basics', type: 'Lecture', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', watched: false },
  { id: 'r2', subject: 'Physics', title: 'Kinematics Playlist', type: 'Lecture', url: 'https://www.youtube.com/playlist?list=PL', watched: false },
  { id: 'r3', subject: 'Mathematics', title: 'Calculus Notes (Drive)', type: 'Notes', url: 'https://drive.google.com', watched: false },
  { id: 'r4', subject: 'Programming', title: 'Intro to Programming - Lectures', type: 'Lecture', url: 'https://www.youtube.com', watched: false },
  { id: 'r5', subject: 'English', title: 'Grammar Notes (Drive)', type: 'Notes', url: 'https://drive.google.com', watched: false },
];

function loadResources(){ const raw = localStorage.getItem(RES_KEY); if(!raw){ localStorage.setItem(RES_KEY, JSON.stringify(defaultResources)); return defaultResources.slice(); } try{ return JSON.parse(raw); }catch{ return defaultResources.slice(); } }
function saveResources(arr){ localStorage.setItem(RES_KEY, JSON.stringify(arr)); }

const subjectsContainer = qs('#subjectsContainer');
const eduSearchInput = qs('#eduSearch');
const openAddResourceBtn = qs('#openAddResource');
const resourceModal = qs('#resourceModal');
const cancelModalBtn = qs('#cancelModal');
const addResourceForm = qs('#addResourceForm');

openAddResourceBtn.addEventListener('click', ()=> resourceModal.classList.remove('hidden'));
cancelModalBtn.addEventListener('click', ()=> resourceModal.classList.add('hidden'));

addResourceForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const subject = qs('#resSubject').value;
  const title = qs('#resTitle').value.trim();
  const type = qs('#resType').value;
  const url = qs('#resUrl').value.trim();
  if(!title || !url) return alert('Title and URL required');
  const arr = loadResources();
  arr.push({ id:'r'+Date.now(), subject, title, type, url, watched:false });
  saveResources(arr);
  renderResources(eduSearchInput.value || globalSearch.value || '');
  addResourceForm.reset();
  resourceModal.classList.add('hidden');
});

eduSearchInput.addEventListener('input', (e) => renderResources(e.target.value || globalSearch.value || ''));
qsa('.filter').forEach(btn => btn.addEventListener('click', (ev) => {
  qsa('.filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderResources(eduSearchInput.value || globalSearch.value || '');
}));

function renderResources(filterText=''){
  const arr = loadResources();
  const bySubject = {};
  arr.forEach(r => { if(!bySubject[r.subject]) bySubject[r.subject]=[]; bySubject[r.subject].push(r); });
  const subjectOrder = ['Engineering Mechanics','Physics','Mathematics','Programming','English','Punjabi'];
  subjectsContainer.innerHTML = '';
  subjectOrder.forEach(subject => {
    const items = bySubject[subject] || [];
    const filtered = items.filter(r => (r.title + ' ' + r.type + ' ' + r.url + ' ' + r.subject).toLowerCase().includes(filterText.toLowerCase()));
    const card = document.createElement('div'); card.className='subject-card';
    card.innerHTML = `<h3>${subject} <span class="muted">(${filtered.length})</span></h3>`;
    const list = document.createElement('div'); list.className='resource-list';
    if(filtered.length===0) list.innerHTML = `<div class="muted">No resources. Add one with +Add.</div>`;
    else {
      filtered.forEach(r => {
        const el = document.createElement('div');
        el.className = 'resource-item';
        el.innerHTML = `<div><strong>${escapeHtml(r.title)}</strong><div class="muted">${escapeHtml(r.type)} · ${escapeHtml(r.url.replace(/^https?:\/\//,''))}</div></div>
        <div>
          <a class="btn small" target="_blank" rel="noopener" href="${escapeAttr(r.url)}">Open</a>
          <button class="btn small" onclick="studyNow('${r.id}')">Study Now</button>
          <button class="btn small" onclick="toggleWatched('${r.id}')">${r.watched ? '✓ Studied' : 'Mark Studied'}</button>
          <button class="btn small danger" onclick="removeResource('${r.id}')">Remove</button>
        </div>`;
        list.appendChild(el);
      });
    }
    card.appendChild(list); subjectsContainer.appendChild(card);
  });
  updateProgressFromResources();
}
renderResources('');

/* studyNow: open resource, add task, optional start pomodoro (confirm) */
window.studyNow = function(id){
  const arr = loadResources(); const r = arr.find(x=>x.id===id); if(!r) return;
  // open resource in new tab
  window.open(r.url, '_blank');
  // add task
  addTaskFromText(`Study: ${r.title}`);
  // ask to start pomodoro
  if(confirm('Start a Pomodoro session for this study now? (25 min)')) {
    setPomodoroLength(25);
    startPomodoro();
  }
};

/* toggleWatched / remove */
window.toggleWatched = function(id){
  const arr = loadResources(); const idx = arr.findIndex(x=>x.id===id); if(idx===-1) return;
  arr[idx].watched = !arr[idx].watched; saveResources(arr); renderResources(eduSearchInput.value || globalSearch.value || '');
};
window.removeResource = function(id){ if(!confirm('Remove resource?')) return; let arr = loadResources(); arr = arr.filter(x=>x.id!==id); saveResources(arr); renderResources(eduSearchInput.value || globalSearch.value || ''); };

/* ---------------- PROGRESS TRACKER ---------------- */
const progressDoneCount = qs('#progressDoneCount');
const progressMinutes = qs('#progressMinutes');
const progressResourcesWatched = qs('#progressResourcesWatched');
const weeklyGoalBar = qs('#weeklyGoalBar');
const weeklyGoalPercent = qs('#weeklyGoalPercent');
const weeklyGoalInput = qs('#weeklyGoalInput');
const saveGoalBtn = qs('#saveGoal');
const autoProfileSave = qs('#autoProfileSave');

saveGoalBtn.addEventListener('click', () => {
  const val = Number(weeklyGoalInput.value);
  if(!val || val <= 0) return alert('Enter a positive number');
  localStorage.setItem(PROG_KEY, JSON.stringify({ weeklyGoal: val }));
  updateProgressUI();
});

/* compute progress and update UI */
function getWeeklyGoal(){ const raw = localStorage.getItem(PROG_KEY); if(!raw) return 300; try{ const obj = JSON.parse(raw); return Number(obj.weeklyGoal) || 300 }catch{return 300} }

function updateProgressUI(){
  const tasks = loadTasks(); const done = tasks.filter(t=>t.done).length;
  progressDoneCount.innerText = done;

  const pomMinutes = Number(localStorage.getItem('ignite_pomodoro_minutes') || pomState.minutes || 0);
  const resources = loadResources(); const watchedCount = resources.filter(r=>r.watched).length;
  const resourceMinutes = watchedCount * 25;
  progressResourcesWatched.innerText = watchedCount;

  const totalMinutes = pomMinutes + resourceMinutes;
  progressMinutes.innerText = totalMinutes;

  const goal = getWeeklyGoal(); const percent = Math.min(100, Math.round((totalMinutes / goal) * 100));
  weeklyGoalBar.style.width = percent + '%'; weeklyGoalPercent.innerText = percent + '%';

  // auto-save profile if enabled and you have a name set
  if(autoProfileSave && autoProfileSave.checked){
    const myNameVal = (qs('#myName') && qs('#myName').value.trim()) || '';
    if(myNameVal) saveProfileFromCurrent(myNameVal);
  }
}
updateProgressUI();

/* update when resources change */
function updateProgressFromResources(){ updateProgressUI(); }

/* run update when tasks/pomodoro change: already called in respective functions */

/* ---------- PROFILES & DUEL ---------- */
/* Save a profile snapshot (local only) */
function gatherCurrentStats(){
  const tasks = loadTasks();
  const done = tasks.filter(t=>t.done).length;
  const pomMinutes = Number(localStorage.getItem('ignite_pomodoro_minutes') || pomState.minutes || 0);
  const resources = loadResources(); const watchedCount = resources.filter(r=>r.watched).length;
  return { tasksDone: done, minutes: pomMinutes, resourcesWatched: watchedCount, updated: Date.now() };
}

/* save profile under name */
function saveProfile(name, stats){
  if(!name) return;
  localStorage.setItem(PROFILE_PREFIX + name, JSON.stringify(Object.assign({ name }, stats)));
  alert(`Profile saved for ${name}`);
}
/* load profile */
function loadProfile(name){
  const raw = localStorage.getItem(PROFILE_PREFIX + name);
  if(!raw) return null;
  try{ return JSON.parse(raw); } catch { return null; }
}

/* UI: save my profile */
qs('#saveMyProfile').addEventListener('click', () => {
  const name = qs('#myName').value.trim();
  if(!name) return alert('Enter your name first');
  const stats = gatherCurrentStats();
  saveProfileFromCurrent(name);
  populateMyProfileUI(name, stats);
});
qs('#loadMyProfile').addEventListener('click', () => {
  const name = qs('#myName').value.trim();
  if(!name) return alert('Enter your name to load');
  const p = loadProfile(name);
  if(!p) return alert('No profile found for ' + name);
  populateMyProfileUI(p.name, p);
});

function saveProfileFromCurrent(name){
  const stats = gatherCurrentStats();
  saveProfile(name, stats);
}

/* populate my UI numbers */
function populateMyProfileUI(name, stats){
  if(qs('#myName')) qs('#myName').value = name;
  id('myTasks').innerText = stats.tasksDone || 0;
  id('myMinutes').innerText = stats.minutes || 0;
  id('myResources').innerText = stats.resourcesWatched || 0;
}

/* load opponent profile into UI */
qs('#loadOppProfile').addEventListener('click', () => {
  const name = qs('#oppName').value.trim();
  if(!name) return alert('Enter opponent name');
  const p = loadProfile(name);
  if(!p) return alert('No profile found for ' + name);
  populateOppProfileUI(p.name, p);
});
qs('#manualSetOpp').addEventListener('click', () => {
  const name = qs('#oppName').value.trim() || 'Friend';
  const t = Number(prompt('Enter opponent tasks done (number):', '0') || 0);
  const m = Number(prompt('Enter opponent study minutes (number):', '0') || 0);
  const r = Number(prompt('Enter opponent resources watched (number):', '0') || 0);
  const p = { name, tasksDone: t, minutes: m, resourcesWatched: r, updated: Date.now() };
  populateOppProfileUI(name, p);
});
function populateOppProfileUI(name, stats){
  if(qs('#oppName')) qs('#oppName').value = name;
  qs('#oppTasks').innerText = stats.tasksDone || 0;
  qs('#oppMinutes').innerText = stats.minutes || 0;
  qs('#oppResources').innerText = stats.resourcesWatched || 0;
}

/* When user clicks Compare Now: compute who leads */
qs('#runCompare').addEventListener('click', () => {
  // gather left = my UI stats (if saved, it's UI; otherwise current)
  const myName = (qs('#myName') && qs('#myName').value.trim()) || 'You';
  const myStats = { tasksDone: Number(qs('#myTasks').innerText) || 0, minutes: Number(qs('#myMinutes').innerText) || 0, resourcesWatched: Number(qs('#myResources').innerText) || 0 };
  // if my name not set, use real current stats
  if(!qs('#myName').value.trim()){
    const s = gatherCurrentStats(); myStats.tasksDone = s.tasksDone; myStats.minutes = s.minutes; myStats.resourcesWatched = s.resourcesWatched;
    if(qs('#myName')) qs('#myName').value = myName;
    populateMyProfileUI(myName, myStats);
  }
  const oppName = (qs('#oppName') && qs('#oppName').value.trim()) || 'Friend';
  const oppStats = { tasksDone: Number(qs('#oppTasks').innerText) || 0, minutes: Number(qs('#oppMinutes').innerText) || 0, resourcesWatched: Number(qs('#oppResources').innerText) || 0 };

  // compute percent bars (normalize to max)
  const maxTasks = Math.max(1, myStats.tasksDone, oppStats.tasksDone);
  const maxMinutes = Math.max(1, myStats.minutes, oppStats.minutes);

  const leftTasksPct = Math.round((myStats.tasksDone / maxTasks) * 100);
  const rightTasksPct = Math.round((oppStats.tasksDone / maxTasks) * 100);
  const leftMinPct = Math.round((myStats.minutes / maxMinutes) * 100);
  const rightMinPct = Math.round((oppStats.minutes / maxMinutes) * 100);

  // set bars
  qs('#barTasksLeft').style.width = leftTasksPct + '%';
  // create pseudo right bar by inverting background? For simplicity we show left only and show numeric comparisons below
  qs('#barMinutesLeft').style.width = leftMinPct + '%';

  // winner logic: points for tasks and minutes
  let myPoints = 0, oppPoints = 0;
  if(myStats.tasksDone > oppStats.tasksDone) myPoints++; else if(myStats.tasksDone < oppStats.tasksDone) oppPoints++;
  if(myStats.minutes > oppStats.minutes) myPoints++; else if(myStats.minutes < oppStats.minutes) oppPoints++;
  let resultText = '';
  if(myPoints > oppPoints) resultText = `${myName} is leading! (${myPoints} vs ${oppPoints}) 🔥`;
  else if(myPoints < oppPoints) resultText = `${oppName} is leading! (${oppPoints} vs ${myPoints})`;
  else resultText = `It's a tie! (${myPoints} vs ${oppPoints}) Keep studying!`;

  qs('#duelResult').innerText = resultText;
});

/* copy result */
qs('#copyResult').addEventListener('click', () => {
  const txt = qs('#duelResult').innerText || 'No result yet';
  navigator.clipboard?.writeText(txt).then(()=> alert('Result copied to clipboard'), ()=> alert('Could not copy'));
});

/* auto-populate "my" stats when page loads (current snapshot) */
(function initMyUI(){
  const s = gatherCurrentStats();
  populateMyProfileUI(qs('#myName')?.value || 'You', s);
})();

/* ---------- Profiles: helper shortcuts ---------- */
function saveProfileQuick(name, stats){ localStorage.setItem(PROFILE_PREFIX + name, JSON.stringify(Object.assign({name}, stats))); }
function loadProfileQuick(name){ const raw = localStorage.getItem(PROFILE_PREFIX + name); if(!raw) return null; try{return JSON.parse(raw)}catch{ return null } }

/* ---------- UTILS ---------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
function escapeAttr(s){ return String(s).replace(/"/g,'&quot;') }

/* ---------- Init/update loops to keep UI in sync ---------- */
setInterval(()=> {
  // ensure pom/minutes persisted
  localStorage.setItem('ignite_pomodoro_minutes', String(Number(localStorage.getItem('ignite_pomodoro_minutes') || 0)));
  updatePomUI();
  updateProgressUI();
}, 5000);

/* Expose some functions used in inline handlers */
window.toggleTask = toggleTask;
window.removeTask = removeTask;
window.toggleWatched = window.toggleWatched;
window.removeResource = window.removeResource;
window.studyNow = window.studyNow;

/* ---------- On load, ensure progress UI sync ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderTasks();
  renderResources('');
  updatePomUI();
  updateProgressUI();
  // set quick bindings for header buttons
  qs('#repoLink').href = '#';
  qs('#submitForm').addEventListener('click', (e)=> { e.preventDefault(); window.open('https://forms.gle/9S1r7EJTaoMCjXPd6','_blank'); });
});