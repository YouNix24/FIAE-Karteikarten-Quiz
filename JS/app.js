const JSON_DIR = 'JSON';
const STORAGE_KEY = 'fiaeq_progress_v1';
function log(msg){
  try {
    const ts = new Date().toISOString();
    fetch('/log', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: `[${ts}] ${msg}` }).catch(()=>{});
  } catch(_) {}
}

// Loading overlay helpers
function setLoading(msg){
  try{
    const el = document.getElementById('loadingOverlay');
    const m = document.getElementById('loadingMsg');
    if (m && msg!=null) m.textContent = msg;
    if (el) el.classList.remove('hidden');
  }catch(_){ }
}
function clearLoading(){
  try{
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('hidden');
  }catch(_){ }
}

// Automatisch den JSON-Basisordner relativ zur aktuellen Seite bestimmen
const JSON_DIR_RESOLVED = (()=>{
  try {
    if (location.protocol === 'file:') return 'JSON';
    const p = new URL('JSON/', location.href).pathname; // z.B. '/JSON/'
    return p.replace(/\/$/, '');
  } catch { return 'JSON'; }
})();

const state = {
  quizzes: [],         // { id, file, title, count, cards }
  progress: loadProgress(),
  run: null            // { id, title, cards, idx, chosen:[], finished:false }
};

function pad2(n){ return String(n).padStart(2,'0'); }
function gradeFromPercent(p){
  // 1.0 best, 6.0 worst â€“ map typical German thresholds
  if (p >= 0.92) return 1.0;
  if (p >= 0.81) return 2.0;
  if (p >= 0.67) return 3.0;
  if (p >= 0.50) return 4.0;
  if (p >= 0.30) return 5.0;
  return 6.0;
}
function fmtPercent(p){ return (p*100).toFixed(0) + '%'; }
function fmtGrade(g){ return g ? g.toFixed(1).replace('.', ',') : '0,0'; }

// Shuffle helpers for randomized answer order per question
function shuffleArray(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function prepareCard(card){
  try {
    const idxs = Array.isArray(card.choices) ? card.choices.map((_, i) => i) : [];
    const perm = shuffleArray(idxs);
    const choices = perm.map(i => card.choices[i]);
    const correct_index = perm.indexOf(card.correct_index);
    const copy = { question: card.question, choices, correct_index, hint: card.hint };
    if (card.topic) copy.topic = card.topic;
    if (card.tags) copy.tags = card.tags;
    return copy;
  } catch(_) {
    return JSON.parse(JSON.stringify(card));
  }
}

function getCards(obj){
  if (!obj) return null;
  if (Array.isArray(obj)) return obj;
  if (obj.cards && Array.isArray(obj.cards)) return obj.cards;
  return null;
}

function getTopicForCard(c){
  if (c && c.topic && typeof c.topic === 'string') return c.topic.trim();
  if (c && c.tags) {
    if (Array.isArray(c.tags) && c.tags.length) return String(c.tags[0]).trim();
    if (typeof c.tags === 'string' && c.tags) return c.tags.trim();
  }
  var q = (c && c.question ? String(c.question) : '').toLowerCase();
  function has(k){ return q.indexOf(k) !== -1; }
  // Netzwerke
  if (has('osi') || has('switch') || has('router') || has('vlan') || has('dhcp') || has('ipv4') || has('subnetz') || has('tcp') || has('udp') || has('icmp') || has('arp') || has('routing') || has('nat') || has('ospf') || has('wpa')) return 'Netzwerke';
  // Datenbanken (Modellierung/Normalformen erlaubt)
  if (has('sql') || has('normalform') || has('create table') || has('insert') || has('primary') || has('schl') || has('fremdschl')) return 'Datenbanken';
  // Projektmanagement (inkl. Agile/Scrum/Kanban)
  if (has('scrum') || has('product owner') || has('scrum master') || has('backlog') || has('daily') || has('sprint') || has('kanban') || has('wip') || has('burndown') || has('kritischer pfad') || has('stakeholder') || has('raci') || has('earned value') || has('gantt') || has('pert') || has('schaetz') || has('schaetzung') || has('budget') || has('projekt') || has('velocity') || has('cycle time')) return 'Projektmanagement';
  // Cloud/Virtualisierung/Storage
  if (has('cloud') || has('saas') || has('paas') || has('iaas') || has('faas')) return 'Cloud & Virtualisierung';
  if (has('raid') || has('platte') || has('speicher') || has('storage')) return 'Speicher & RAID';
  // Qualität & Tests
  if (has('test') || has('unit') || has('e2e') || has('integrations') || has('coverage') || has('pyramide') || has('severity') || has('prio') || has('mock')) return 'Qualität & Tests';
  // IT-Sicherheit
  if (has('sicher') || has('security') || has('verschl') || has('authent') || has('risik') || has('owasp') || has('tls') || has('x.509') || has('waf') || has('ips') || has('dsgvo')) return 'IT-Sicherheit';
  // Web & HTTP
  if (has('http') || has('https') || has('rest') || has('cookie') || has('cors') || has('jwt') || has('json') || has('same-origin') || has('content-type')) return 'Web & HTTP';
  // Betriebssysteme & Tools (Linux/Windows/Git/Docker)
  if (has('chmod') || has('chown') || has('systemctl') || has('docker') || has('git') || has('ipconfig') || has('hypervisor')) return 'Betriebssysteme & Tools';
  // Recht & BWL
  if (has('kaufvertrag') || has('tarif') || has('gmbh') || has('ohg') || has('eigentumsvorbehalt') || has('skonto') || has('liquidit') || has('abschreibung') || has('inventur') || has('break-even') || has('magisches dreieck')) return 'Recht & BWL';
  // Softwareentwurf & UML
  if (has('uml') || has('use-case') || has('komposition') || has('aggregation') || has('zustands') || has('sequenz') || has('ocp') || has('lsp') || has('solid')) return 'Softwareentwurf & UML';
  // Fallback: Benenne neutral
  return 'Allgemeine IT-Grundlagen';
}

function summarizeTopicsFromRun(run){
  var topics = {};
  for (var i=0; i<run.cards.length; i++){
    var card = run.cards[i];
    var t = getTopicForCard(card);
    if (!topics[t]) topics[t] = { correct: 0, total: 0 };
    topics[t].total += 1;
    var sel = run.chosen[i];
    if (sel === card.correct_index) topics[t].correct += 1;
  }
  return topics;
}

function mergeTopicStats(base, add){
  for (var k in add){
    if (!base[k]) base[k] = { correct: 0, total: 0 };
    base[k].correct += add[k].correct;
    base[k].total += add[k].total;
  }
}

async function discoverQuizzes(max = 200){
  const found = [];
  let missStreak = 0;
  // Scan sequentially without directory listing
  // Try fast path via /list if available
  try {
    if (location.protocol !== 'file:'){
      const rList = await fetch('/list', { cache:'no-store' });
      if (rList.ok){
        const names = await rList.json();
        if (Array.isArray(names) && names.length){
          log(`Fast-Scan via /list: ${names.length} Datei(en)`);
          for (const nameOnly of names){
            const url = `${JSON_DIR}/${nameOnly}`;
            try{
              const txt = await (await fetch(url, { cache:'no-store' })).text();
              try{
                const data = JSON.parse(txt);
                const cards = getCards(data);
                if (!cards || !cards.length) { log(`${nameOnly}: JSON ok, aber keine Karten gefunden`); continue; }
                const m = nameOnly.match(/^Quiz(\d{1,})\.json$/i);
                const num = m ? m[1] : null; const id = num ? (`Quiz${pad2(Number(num))}`) : nameOnly.replace(/\.json$/i,'');
                const title = num ? (`Quiz ${pad2(Number(num))}`) : id;
                const item = { id, file: url, title, count: cards.length, cards };
                found.push(item);
                log(`${nameOnly}: OK (${cards.length} Karten)`);
                // Inkrementell: upsert in bestehende Liste (nicht überschreiben)
                try {
                  const byId = new Map(state.quizzes.map(q=>[q.id,q]));
                  byId.set(item.id, item);
                  state.quizzes = Array.from(byId.values()).sort((a,b)=> a.id.localeCompare(b.id,'de',{numeric:true}));
                  renderGrid();
                } catch(_){}
              } catch(e){ log(`${nameOnly}: JSON-Fehler: ${e.message}`); }
            } catch(e){ log(`${nameOnly}: Fetch-Fehler: ${e.message}`); }
          }
          { const byId = new Map(state.quizzes.map(q=>[q.id,q])); for (const it of found){ byId.set(it.id, it); } state.quizzes = Array.from(byId.values()).sort((a,b)=> a.id.localeCompare(b.id,'de',{numeric:true})); }
          try { renderGrid(); } catch(_){}
          log(`Fast-Scan beendet. Gefunden: ${state.quizzes.length} Quiz-Datei(en).`);
          return;
        }
      }
    }
  } catch(e){ /* ignore and fall back */ }

  log(`Scan starte: JSON/Quiz01.json .. Quiz${pad2(max)}.json`);
  const envNote = document.getElementById('envNote');
  for (let i=1;i<=max;i++){
    const name = `Quiz${pad2(i)}.json`;
    const url = `${JSON_DIR}/${name}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        missStreak++; log(`${name}: ${res.status} ${res.statusText}`);
        if (envNote) envNote.textContent = `Scanne … ${name}: ${res.status}. Gefunden: ${found.length}`;
        if (found.length>0 && missStreak>=5) { log(`Frühes Ende nach ${missStreak} Fehlversuchen.`); break; }
        continue;
      }
      missStreak = 0;
      const txt = await res.text();
      try {
        const data = JSON.parse(txt);
        const cards = getCards(data);
        if (!cards || !cards.length) { missStreak++; log(`${name}: JSON ok, aber keine Karten gefunden`); if (found.length>0 && missStreak>=5) { break; } continue; }
        found.push({ id: `Quiz${pad2(i)}`, file: url, title: `Quiz ${pad2(i)}`, count: cards.length, cards });
        log(`${name}: OK (${cards.length} Karten)`);
        // Incrementell rendern
        state.quizzes = found.slice().sort((a,b)=> a.id.localeCompare(b.id,'de',{numeric:true}));
        try { renderGrid(); } catch(_){}
        if (envNote) envNote.textContent = `Gefunden: ${found.length} (zuletzt ${name})`;
      } catch (e) {
        missStreak++; log(`${name}: JSON-Fehler: ${e.message}`);
      }
    } catch(e){ missStreak++; log(`${name}: Fetch-Fehler: ${e.message}`); }
  }
  { const byId = new Map(state.quizzes.map(q=>[q.id,q])); for (const it of found){ byId.set(it.id, it); } state.quizzes = Array.from(byId.values()).sort((a,b)=> a.id.localeCompare(b.id,'de',{numeric:true})); }
  log(`Scan beendet. Gefunden: ${found.length} Quiz-Datei(en).`);
}

// Manuelles Laden ausgewählter JSON-Dateien (über Datei-/Ordnerauswahl)
async function loadFilesIntoQuizzes(files){
  if (!files || !files.length) { log('Kein Fileinput erhalten.'); return; }
  try { setLoading(`Lade ${files.length} Datei(en) …`); } catch(_){ }
  const newlyFound = [];
  for (const f of files){
    try {
      let txt;
      if (typeof f.text === 'function') {
        txt = await f.text();
      } else {
        txt = await new Promise((resolve, reject)=>{
          try {
            const reader = new FileReader();
            reader.onload = ()=> resolve(String(reader.result||''));
            reader.onerror = ()=> reject(reader.error || new Error('Lesefehler'));
            reader.readAsText(f);
          } catch (err) { reject(err); }
        });
      }
      try {
        const data = JSON.parse(txt);
        const cards = getCards(data);
        if (!cards || !cards.length) { log(`${f.name}: JSON ok, aber keine Karten gefunden`); continue; }
        const base = (f.webkitRelativePath && f.webkitRelativePath.length) ? f.webkitRelativePath : f.name;
        const nameOnly = base.split(/[\\\/]/).pop();
        const m = nameOnly.match(/^Quiz(\d{1,})\.json$/i);
        const num = m ? m[1] : null;
        const id = num ? (`Quiz${pad2(Number(num))}`) : (nameOnly.replace(/\.json$/i,''));
        const title = num ? (`Quiz ${pad2(Number(num))}`) : id;
        newlyFound.push({ id, file: nameOnly, title, count: cards.length, cards });
        log(`${nameOnly}: OK (${cards.length} Karten)`);
      } catch(e){
        log(`${f.name}: JSON-Fehler: ${e.message}`);
      }
    } catch(e){
      log(`${f.name}: Lesefehler: ${e.message}`);
    }
  }
  // Merge dedupliziert nach ID
  const byId = new Map(state.quizzes.map(q=>[q.id, q]));
  for (const q of newlyFound){ byId.set(q.id, q); }
  state.quizzes = Array.from(byId.values()).sort((a,b)=> a.id.localeCompare(b.id,'de',{numeric:true}));
  log(`Manuell geladen: ${newlyFound.length} Datei(en). Gesamt: ${state.quizzes.length}`);
  try { clearLoading(); } catch(_){ }
}

function loadProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: [] };
    const obj = JSON.parse(raw);
    if (!obj.attempts) obj.attempts = [];
    if (!obj.topicsStats) obj.topicsStats = {};
    // Migrate legacy topic names to new scheme
    const mapOld = {
      'Agile': 'Projektmanagement',
      'Netzwerk': 'Netzwerke',
      'Qualitaet & Tests': 'Qualität & Tests',
      'Storage': 'Speicher & RAID',
      'Cloud': 'Cloud & Virtualisierung',
      'Sonstiges': 'Allgemeine IT-Grundlagen'
    };
    const merged = {};
    for (const k in obj.topicsStats){
      const nk = mapOld[k] || k;
      if (!merged[nk]) merged[nk] = { correct: 0, total: 0 };
      merged[nk].correct += obj.topicsStats[k].correct||0;
      merged[nk].total += obj.topicsStats[k].total||0;
    }
    obj.topicsStats = merged;
    return obj;
  }catch{ return { attempts: [], topicsStats: {} }; }
}
function saveProgress(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }

function updateDashboard(){
  const attempts = state.progress.attempts || [];
  const byQuizBest = new Map();
  let best = null, worst = null;
  for (const a of attempts){
    best = best==null? a.grade : Math.min(best, a.grade);
    worst = worst==null? a.grade : Math.max(worst, a.grade);
    const prev = byQuizBest.get(a.quizId);
    if (!prev || a.percent > prev.percent) byQuizBest.set(a.quizId, a);
  }
  const completed = byQuizBest.size;
  const avg = (completed>0) ? ([...byQuizBest.values()].reduce((s,a)=>s+a.percent,0)/completed) : null;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('statAttempts').textContent = attempts.length;
  document.getElementById('statAvg').textContent = (avg==null? '0%' : fmtPercent(avg));
  document.getElementById('statBest').textContent = fmtGrade(best);
  document.getElementById('statWorst').textContent = fmtGrade(worst);
  renderGrid();
  renderTopics();
}

function renderGrid(){
  const grid = document.getElementById('quizGrid');
  grid.innerHTML = '';
  if (!state.quizzes.length){
    const empty = document.createElement('div');
    empty.className = 'card';
    const helpFile = 'Tipp: Prüfe, ob der Ordner "JSON" neben der HTML-Datei liegt und Dateien wie "Quiz01.json" enthält. Nutze die Buttons oben oder starte start_quiz_server.bat.';
    empty.innerHTML = `<div class="meta">Keine Quiz-Dateien gefunden. ${helpFile}</div>`;
    grid.appendChild(empty);
    return;
  }
  // Determine completed quizzes (best attempt per quiz)
  const attempts = (state.progress && state.progress.attempts) ? state.progress.attempts : [];
  const byQuizBest = new Map();
  for (const a of attempts){
    const prev = byQuizBest.get(a.quizId);
    if (!prev || a.percent > prev.percent) byQuizBest.set(a.quizId, a);
  }
  for (const q of state.quizzes){
    const card = document.createElement('div');
    card.className = 'card';
    const h3 = document.createElement('h3'); h3.textContent = q.title;
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${q.count} Karten`;
    const row = document.createElement('div'); row.className = 'actions';
    const start = document.createElement('button'); start.className='btn primary'; start.textContent='Starten';
    start.onclick = ()=> startRun(q);
    const pill = document.createElement('span'); pill.className='pill'; pill.textContent = 'JSON geladen';
    row.append(start, pill);
    // Completed badge (top-right)
    if (byQuizBest.has(q.id)){
      card.classList.add('completed');
      const best = byQuizBest.get(q.id);
      const pct = Math.round((best.percent||0)*100);
      const badge = document.createElement('span');
      badge.className = 'badge done';
      badge.textContent = `✓ Abgeschlossen (${pct}%)`;
      badge.title = `Bestes Ergebnis: ${pct}%`;
      card.appendChild(badge);
    }
    card.append(h3, meta, row);
    grid.appendChild(card);
  }
}

function renderTopics(){
  var list = document.getElementById('topicsList'); if (!list) return;
  list.innerHTML = '';
  var stats = (state.progress && state.progress.topicsStats) ? state.progress.topicsStats : {};
  var items = [];
  for (var k in stats){
    var t = stats[k]; var wrong = t.total - t.correct; var rate = (t.total>0)? (wrong/t.total) : 0;
    items.push({ name: k, total: t.total, correct: t.correct, wrong: wrong, rate: rate });
  }
  // Sort by absolute Fehler zuerst, dann Fehlerquote, dann Umfang
  items.sort(function(a,b){ return (b.wrong - a.wrong) || (b.rate - a.rate) || (b.total - a.total) || a.name.localeCompare(b.name); });
  var shown = 0;
  for (var i=0; i<items.length && shown<8; i++){
    var it = items[i];
    // Zeige nur echte Problemthemen (mind. 1 Fehler insgesamt)
    if (it.wrong < 1) continue;
    var div = document.createElement('div'); div.className = 'item';
    var name = document.createElement('div'); name.className = 'name'; name.textContent = it.name;
    var meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `Falsch: ${it.wrong}/${it.total} (${fmtPercent(it.rate)})`;
    div.appendChild(name); div.appendChild(meta); list.appendChild(div); shown++;
  }
  if (shown===0){
    var empty = document.createElement('div'); empty.className='item';
    empty.innerHTML = '<div class="name">Noch keine auffälligen Problemthemen</div><div class="meta">Spiele ein paar Quizze, dann erscheinen hier Themen mit hohem Fehleranteil.</div>';
    list.appendChild(empty);
  }
}

function startRun(q){
  const cards = q.cards.map(prepareCard);
  state.run = { id: q.id, title: q.title, cards, idx: 0, chosen: Array(cards.length).fill(-1), finished:false };
  document.getElementById('runnerTitle').textContent = `${q.title} • ${cards.length} Fragen`;
  document.getElementById('resultBox').classList.add('hidden');
  document.getElementById('btnFinish').disabled = false;
  document.getElementById('overlay').classList.remove('hidden');
  renderRun();
}

function renderRun(){
  const r = state.run; if (!r) return;
  const c = r.cards[r.idx];
  document.getElementById('questionText').textContent = `Frage ${r.idx+1}/${r.cards.length}: ${c.question}`;
  document.getElementById('hintText').textContent = '';
  const wrap = document.getElementById('choices'); wrap.innerHTML='';
  c.choices.forEach((txt, i)=>{
    const b = document.createElement('button'); b.className='choice'; b.textContent = txt;
    b.onclick = ()=> choose(i);
    wrap.appendChild(b);
  });
  if (r.chosen[r.idx] !== -1){
    showCorrection(r.idx, r.chosen[r.idx]);
  }
  document.getElementById('progressFill').style.width = `${((r.idx)/r.cards.length)*100}%`;
  document.getElementById('btnPrev').disabled = (r.idx===0);
  document.getElementById('btnNext').disabled = (r.idx===r.cards.length-1);
}

function showCorrection(qIdx, choiceIdx){
  const c = state.run.cards[qIdx];
  [...document.getElementById('choices').children].forEach((btn, i)=>{
    btn.classList.toggle('correct', i===c.correct_index);
    btn.classList.toggle('wrong', i===choiceIdx && i!==c.correct_index);
  });
}

function choose(i){
  if (!state.run) return;
  state.run.chosen[state.run.idx] = i;
  showCorrection(state.run.idx, i);
}

function next(){ const r = state.run; if (r && r.idx < r.cards.length-1){ r.idx++; renderRun(); } }
function prev(){ const r = state.run; if (r && r.idx > 0){ r.idx--; renderRun(); } }

function hint(){
  const r = state.run; if (!r) return;
  const c = r.cards[r.idx];
  document.getElementById('hintText').textContent = c.hint ? `Hinweis: ${c.hint}` : '';
}

function finish(){
  const r = state.run; if (!r || r.finished) return;
  r.finished = true; document.getElementById('btnFinish').disabled = true;
  const total = r.cards.length;
  let correct = 0; r.chosen.forEach((sel, idx)=>{ if (sel === r.cards[idx].correct_index) correct++; });
  const percent = total? (correct/total) : 0; const grade = gradeFromPercent(percent);
  // Per-topic summary
  const topics = summarizeTopicsFromRun(r);
  // Save attempt
  state.progress.attempts.push({ quizId: r.id, ts: Date.now(), correct, total, percent, grade, topics });
  // Merge into cumulative topic stats
  if (!state.progress.topicsStats) state.progress.topicsStats = {};
  mergeTopicStats(state.progress.topicsStats, topics);
  saveProgress(); updateDashboard();
  // Show result
  document.getElementById('resultScore').textContent = `${correct} / ${total} korrekt • ${fmtPercent(percent)}`;
  document.getElementById('resultGrade').textContent = `Note: ${fmtGrade(grade)}`;
  const bar = document.getElementById('resultBar');
  bar.style.width = '0%'; requestAnimationFrame(()=>{ bar.style.width = `${percent*100}%`; });
  document.getElementById('resultBox').classList.remove('hidden');
}

function closeOverlay(){ document.getElementById('overlay').classList.add('hidden'); state.run = null; }
function retry(){ if (!state.run) return; const q = state.quizzes.find(x=>x.id===state.run.id); if (q) startRun(q); }

function exportIni(){
  const attempts = state.progress.attempts || [];
  const byQuizBest = new Map();
  for (const a of attempts){
    const p = byQuizBest.get(a.quizId); if (!p || a.percent>p.percent) byQuizBest.set(a.quizId, a);
  }
  const completed = byQuizBest.size;
  const avg = (completed>0) ? ([...byQuizBest.values()].reduce((s,a)=>s+a.percent,0)/completed) : 0;
  let best=null, worst=null; attempts.forEach(a=>{ best = best==null? a.grade : Math.min(best, a.grade); worst = worst==null? a.grade : Math.max(worst, a.grade); });
  const dt = new Date().toISOString();
  let ini = '';
  ini += '[meta]\nversion=1\nupdated='+dt+'\n';
  ini += '\n[stats]\ncompleted='+completed+'\nattempts='+(attempts.length)+'\navg_percent='+(avg*100).toFixed(1)+'\nbest_grade='+(best==null?'' : best)+'\nworst_grade='+(worst==null?'' : worst)+'\n';
  ini += '\n[attempts]\n';
  for (const a of attempts){ ini += `${a.quizId}@${new Date(a.ts).toISOString()}=${a.correct}/${a.total}:${a.grade}\n`; }
  // Topics summary
  ini += '\n[topics]\n';
  const topicsStats = (state.progress.topicsStats)||{};
  for (const k in topicsStats){
    const t = topicsStats[k]; const wrong = (t.total - t.correct);
    ini += `${k}=${t.correct}/${t.total} (${Math.round((wrong/Math.max(1,t.total))*100)}% falsch)\n`;
  }
  const blob = new Blob([ini], { type:'text/plain' });
  const aEl = document.createElement('a'); aEl.href = URL.createObjectURL(blob); aEl.download = 'progress.ini'; aEl.click(); URL.revokeObjectURL(aEl.href);
}

function importIni(text){
  const lines = text.split(/\r?\n/);
  const attempts = [];
  let section = '';
  const topicsStats = {};
  for (const ln of lines){
    const l = ln.trim(); if (!l) continue; if (l.startsWith('#')||l.startsWith(';')) continue;
    const sec = l.match(new RegExp("^\\[(.+)\\]$")); if (sec){ section = sec[1]; continue; }
    if (section==='attempts'){
      // Quiz01@ISO=10/12:2.0
      const m = l.match(new RegExp("^(\\w+)@([^=]+)=(\\d+)/(\\d+):(\\d+(?:\\.\\d+)?)$"));
      if (m){
        attempts.push({ quizId: m[1], ts: Date.parse(m[2])||Date.now(), correct: +m[3], total: +m[4], percent: (+m[3])/(+m[4]), grade: +m[5] });
      }
    } else if (section==='topics'){
      // TopicName=correct/total (optional suffix ignored)
      const t = l.match(new RegExp("^(.+?)=(\\d+)\\/(\\d+)"));
      if (t){
        const name = t[1];
        const corr = +t[2]; const tot = +t[3];
        topicsStats[name] = { correct: corr, total: tot };
      }
    }
  }
  if (!state.progress) state.progress = { attempts: [] };
  state.progress.attempts = attempts;
  if (Object.keys(topicsStats).length){ state.progress.topicsStats = topicsStats; }
  saveProgress(); updateDashboard(); alert('INI importiert.');
}

// Wire UI events (after DOM is loaded)
function boot(){
  try { window.__app_booted = true; if (typeof window.__clearBootWarn === 'function') window.__clearBootWarn(); } catch(_){ }
  document.getElementById('btnPrev').onclick = prev;
  document.getElementById('btnNext').onclick = next;
  document.getElementById('btnHint').onclick = hint;
  document.getElementById('btnFinish').onclick = finish;
  document.getElementById('btnBack').onclick = closeOverlay;
  document.getElementById('btnClose').onclick = closeOverlay;
  document.getElementById('btnRetry').onclick = retry;
  // Override reset to also clear topic stats
  document.getElementById('btnReset').onclick = ()=>{
    if (confirm('Verlauf wirklich löschen?')){ state.progress = { attempts: [], topicsStats: {} }; saveProgress(); updateDashboard(); }
  };
  document.getElementById('btnExport').onclick = exportIni;
  // Loading overlay controls
  (function(){
    var btnSkip = document.getElementById('btnSkipLoading');
    var btnManual = document.getElementById('btnLoadManual');
    if (btnSkip){ btnSkip.addEventListener('click', ()=>{ clearLoading(); }); }
    if (btnManual){ btnManual.addEventListener('click', ()=>{ try{ clearLoading(); document.getElementById('dirJson').click(); }catch(_){ } }); }
  })();
  // Manual JSON loader (fallback for file://)
  document.getElementById('fileJson').addEventListener('change', async (ev)=>{
    const files = Array.from(ev.target.files||[]).filter(f=>/\.json$/i.test(f.name));
    log(`Lade ${files.length} lokale Datei(en)`);
    await loadFilesIntoQuizzes(files);
    renderGrid();
    ev.target.value = '';
  });
  // Folder picker (loads entire JSON directory)
  document.getElementById('dirJson').addEventListener('change', async (ev)=>{
    const files = Array.from(ev.target.files||[]).filter(f=>/\.json$/i.test(f.name));
    log(`Lade Ordner – ${files.length} JSON-Datei(en)`);
    await loadFilesIntoQuizzes(files);
    renderGrid();
    ev.target.value = '';
  });

  // Validate button: re-scan via HTTP
  // removed UI log buttons

  document.getElementById('fileImport').addEventListener('change', async (ev)=>{
    var f = (ev.target.files && ev.target.files[0]) ? ev.target.files[0] : null; if (!f) return; var txt = await f.text(); importIni(txt);
    ev.target.value = '';
  });
  // Reset topics stats
  document.getElementById('btnResetTopics').addEventListener('click', ()=>{
    if (confirm('Themen-Statistik wirklich löschen?')){
      if (!state.progress) state.progress = { attempts: [] };
      state.progress.topicsStats = {};
      saveProgress(); updateDashboard();
    }
  });

  // Init
  (async function init(){
    updateDashboard();
    log(`Seite geladen. Modus: ${location.protocol} Host: ${location.host}`);
    setLoading('Lade JSON in die Karteikarten …');
    try {
      await discoverQuizzes(200);
    } catch(e) {
      try { log(`discoverQuizzes Fehler: ${e && e.message}`); } catch(_){}
    } finally {
      try { renderGrid(); } catch(_){}
      clearLoading();
    }
    // Environment note
    const envNote = document.getElementById('envNote');
    if (location.protocol === 'file:') {
      envNote.textContent = 'Dateimodus: Auto-Scan aus. Bitte oben JSON-Dateien/Ordner wählen oder start_quiz_server.bat nutzen.';
    } else {
      envNote.textContent = 'Servermodus: Auto-Scan aktiv. JSON werden aus dem Ordner "JSON" geladen.';
    }
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}


