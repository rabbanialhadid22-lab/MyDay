'use strict';
/* =========================================================
   MyDay — jadwal, sholat, Al-Qur'an, keuangan, amalan
   Semua data tersimpan di HP (localStorage). Tanpa server.
   ========================================================= */

/* ---------- Util ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => { m = ((m % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const arNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HIJRI = ['Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sya'ban", 'Ramadhan', 'Syawal', "Dzulqa'dah", 'Dzulhijjah'];
const longDate = (s) => { const d = parseYmd(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const shortDate = (s) => { const d = parseYmd(s); return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`; };

function plusMinutes(date, time, min) {
  const d = parseYmd(date);
  d.setMinutes(toMin(time) + min);
  return { date: ymd(d), time: hm(d) };
}
function fmtLeft(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
}
function download(name, text, mime = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}

/* ---------- Data ---------- */
const KEY = 'myday.v1';
const CITIES = [
  ['Medan', 3.5952, 98.6722], ['Banda Aceh', 5.5483, 95.3238], ['Pekanbaru', 0.5071, 101.4478],
  ['Padang', -0.9471, 100.4172], ['Batam', 1.0456, 104.0305], ['Palembang', -2.9761, 104.7754],
  ['Jakarta', -6.2088, 106.8456], ['Bandung', -6.9175, 107.6191], ['Semarang', -6.9667, 110.4167],
  ['Yogyakarta', -7.7956, 110.3695], ['Surabaya', -7.2575, 112.7521], ['Denpasar', -8.6705, 115.2126],
  ['Pontianak', -0.0263, 109.3425], ['Balikpapan', -1.2379, 116.8529], ['Makassar', -5.1477, 119.4327],
];
const DEFAULT_HABITS = () => [
  { id: uid(), name: 'Sholat Dhuha', remindAt: '' },
  { id: uid(), name: 'Sedekah hari ini', remindAt: '' },
  { id: uid(), name: 'Olahraga 20 menit', remindAt: '' },
  { id: uid(), name: 'Baca buku 15 menit', remindAt: '' },
  { id: uid(), name: 'Minum air 8 gelas', remindAt: '' },
  { id: uid(), name: 'Tidur sebelum 22.30', remindAt: '' },
];
const DEFAULTS = () => ({
  settings: {
    name: 'Rabbani', city: 'Medan', lat: 3.5952, lng: 98.6722, method: 20, adj: 0,
    notif: true, leadMin: 10, notifTasks: true,
    quranTime: '05:30', quranTarget: 1, puasaRemind: true, puasaTime: '20:00',
    budget: 0, arSize: 30, showTr: true,
  },
  events: [],
  tx: [],
  habits: DEFAULT_HABITS(),
  habitLog: {},
  prayerDone: {},
  dzikir: {},
  quran: { page: 1, log: {} },
  fired: { date: '', keys: {} },
});
let S = DEFAULTS();
function mergeState(base, raw) {
  const out = { ...base, ...raw };
  out.settings = { ...base.settings, ...(raw.settings || {}) };
  out.quran = { ...base.quran, ...(raw.quran || {}) };
  if (!out.quran.log || typeof out.quran.log !== 'object') out.quran.log = {};
  for (const k of Object.keys(out.quran.log)) if (!Array.isArray(out.quran.log[k])) delete out.quran.log[k];
  out.fired = { ...base.fired, ...(raw.fired || {}) };
  ['events', 'tx', 'habits'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = base[k]; });
  ['habitLog', 'prayerDone', 'dzikir'].forEach((k) => { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
  out.events.forEach((e) => { if (!e.doneDates) e.doneDates = {}; if (!e.repeat) e.repeat = 'none'; });
  return out;
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') S = mergeState(DEFAULTS(), raw);
  } catch (e) { /* data rusak: pakai bawaan */ }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Penyimpanan penuh atau diblokir browser.'); }
}

/* ---------- UI dasar ---------- */
const state = { tab: 'today', sub: null, date: ymd(), month: ymd().slice(0, 7), q: { page: 0, mode: 'surah', search: '' }, dzTab: 'dzikir' };
let toastTimer = null;
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}
function openModal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modal-card').innerHTML = ''; }
const modalOpen = () => !$('#modal').classList.contains('hidden');

/* ---------- Waktu sholat (Aladhan API) ---------- */
const PRAYERS = [
  ['subuh', 'Subuh', 'Fajr'],
  ['dzuhur', 'Dzuhur', 'Dhuhr'],
  ['ashar', 'Ashar', 'Asr'],
  ['maghrib', 'Maghrib', 'Maghrib'],
  ['isya', 'Isya', 'Isha'],
];
let PM = {};
let prayerError = '';
function readPrayerCache() { try { return JSON.parse(localStorage.getItem('myday.prayer') || '{}'); } catch (e) { return {}; } }
function writePrayerCache(c) {
  const keys = Object.keys(c);
  if (keys.length > 10) keys.slice(0, keys.length - 10).forEach((k) => delete c[k]);
  try { localStorage.setItem('myday.prayer', JSON.stringify(c)); } catch (e) { /* abaikan */ }
}
async function fetchMonth(year, month, method) {
  const st = S.settings;
  const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${st.lat}&longitude=${st.lng}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  if (!j || !Array.isArray(j.data) || !j.data.length) throw new Error('Data kosong');
  const days = {};
  for (const x of j.data) {
    const [dd, mm, yy] = x.date.gregorian.date.split('-');
    const t = {};
    for (const k of ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) t[k] = String(x.timings[k]).slice(0, 5);
    const hj = x.date.hijri;
    t.hj = { d: Number(hj.day), m: Number(hj.month && hj.month.number), y: Number(hj.year) };
    days[`${yy}-${mm}-${dd}`] = t;
  }
  return days;
}
async function loadPrayerMonth(year, month) {
  const st = S.settings;
  const ck = `${Number(st.lat).toFixed(3)},${Number(st.lng).toFixed(3)},${st.method}|${year}-${pad(month)}`;
  const cache = readPrayerCache();
  if (cache[ck]) return cache[ck];
  let days;
  try { days = await fetchMonth(year, month, st.method); }
  catch (e) {
    if (Number(st.method) === 3) throw e;
    days = await fetchMonth(year, month, 3); // cadangan: Muslim World League
  }
  cache[ck] = days;
  writePrayerCache(cache);
  return days;
}
async function ensureDay(date) {
  if (PM[date]) return PM[date];
  const [y, m] = date.split('-').map(Number);
  try {
    Object.assign(PM, await loadPrayerMonth(y, m));
    prayerError = '';
  } catch (e) {
    prayerError = 'Jadwal sholat belum bisa dimuat. Periksa internet; jadwal yang pernah dimuat tetap tersimpan.';
  }
  return PM[date] || null;
}
function prayersFor(date) {
  const t = PM[date];
  if (!t) return [];
  const adj = Number(S.settings.adj) || 0;
  return PRAYERS.map(([key, name, api]) => ({ key, name, time: fromMin(toMin(t[api]) + adj) }));
}
function nextPrayerInfo() {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const today = ymd(now);
  for (const p of prayersFor(today)) if (toMin(p.time) > nowM) return { ...p, mins: toMin(p.time) - nowM, tomorrow: false };
  const tm = prayersFor(addDays(today, 1));
  if (tm.length) return { ...tm[0], mins: 1440 - nowM + toMin(tm[0].time), tomorrow: true };
  return null;
}
function onLocationChanged() {
  PM = {};
  save();
  ensureDay(ymd()).then(() => ensureDay(addDays(ymd(), 1))).then(() => { render(true); });
}
function hijriText(date) {
  const t = PM[date];
  if (t && t.hj && t.hj.m) return `${t.hj.d} ${HIJRI[t.hj.m - 1]} ${t.hj.y} H`;
  try { return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseYmd(date)); } catch (e) { return ''; }
}

/* ---------- Puasa sunnah ---------- */
function fastingLabel(date) {
  const t = PM[date];
  if (!t || !t.hj || !t.hj.m) return '';
  const { d, m } = t.hj;
  const wd = parseYmd(date).getDay();
  if (m === 9) return ''; // Ramadhan: puasa wajib
  if (m === 10 && d === 1) return '';
  if (m === 12 && d >= 10 && d <= 13) return '';
  if (m === 12 && d === 9) return 'Puasa Arafah';
  if (m === 1 && d === 10) return "Puasa Asyura (10 Muharram)";
  if (m === 1 && d === 9) return "Puasa Tasu'a (9 Muharram)";
  if (d >= 13 && d <= 15) return 'Puasa Ayyamul Bidh';
  if (wd === 1) return 'Puasa sunnah Senin';
  if (wd === 4) return 'Puasa sunnah Kamis';
  return '';
}

/* ---------- Jadwal ---------- */
function occursOn(ev, date) {
  if (ev.deleted) return false;
  if (ev.repeat === 'daily') return date >= ev.date;
  if (ev.repeat === 'weekly') return date >= ev.date && parseYmd(date).getDay() === parseYmd(ev.date).getDay();
  return ev.date === date;
}
const eventsOn = (date) => S.events.filter((e) => occursOn(e, date));

/* ---------- Kalender (.ics dan tautan Google Kalender) ---------- */
const utc = (date, time) => {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
};
const icsText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 72) { out.push(rest.slice(0, 72)); rest = ' ' + rest.slice(72); }
  out.push(rest);
  return out.join('\r\n');
}
function evTimes(ev) {
  if (!ev.start) return null;
  const e = ev.end && toMin(ev.end) > toMin(ev.start) ? { date: ev.date, time: ev.end } : plusMinutes(ev.date, ev.start, 30);
  return { s: utc(ev.date, ev.start), e: utc(e.date, e.time) };
}
function googleLink(ev) {
  let dates;
  const t = evTimes(ev);
  if (t) dates = `${t.s}/${t.e}`;
  else dates = `${ev.date.replace(/-/g, '')}/${addDays(ev.date, 1).replace(/-/g, '')}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates, details: ev.note || '' });
  if (ev.repeat === 'daily') q.set('recur', 'RRULE:FREQ=DAILY');
  if (ev.repeat === 'weekly') q.set('recur', 'RRULE:FREQ=WEEKLY');
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
async function buildIcs(withEvents, withPrayers, days) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MyDay//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:MyDay'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const today = ymd(), last = addDays(today, days - 1);
  const alarm = (min, desc) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(desc)}`, `TRIGGER:${min === 0 ? 'PT0S' : '-PT' + min + 'M'}`, 'END:VALARM'];
  let count = 0;
  if (withEvents) {
    for (const ev of S.events) {
      if (ev.deleted) continue;
      if (ev.repeat === 'none' && (ev.date < today || ev.date > last)) continue;
      if (ev.repeat !== 'none' && ev.date > last) continue;
      const t = evTimes(ev);
      lines.push('BEGIN:VEVENT', `UID:myday-ev-${ev.id}@myday.app`, `DTSTAMP:${stamp}`);
      if (t) lines.push(`DTSTART:${t.s}`, `DTEND:${t.e}`);
      else lines.push(`DTSTART;VALUE=DATE:${ev.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(ev.date, 1).replace(/-/g, '')}`);
      lines.push(`SUMMARY:${icsText(ev.title)}`);
      if (ev.note) lines.push(`DESCRIPTION:${icsText(ev.note)}`);
      if (ev.repeat === 'daily') lines.push('RRULE:FREQ=DAILY');
      if (ev.repeat === 'weekly') lines.push('RRULE:FREQ=WEEKLY');
      if (t) lines.push(...alarm(10, ev.title));
      lines.push('END:VEVENT');
      count++;
    }
  }
  if (withPrayers) {
    const lead = Number(S.settings.leadMin) || 0;
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      await ensureDay(date);
      for (const p of prayersFor(date)) {
        const end = plusMinutes(date, p.time, 15);
        lines.push('BEGIN:VEVENT', `UID:myday-${date}-${p.key}@myday.app`, `DTSTAMP:${stamp}`,
          `DTSTART:${utc(date, p.time)}`, `DTEND:${utc(end.date, end.time)}`,
          `SUMMARY:${icsText('Sholat ' + p.name)}`, `DESCRIPTION:${icsText('Waktu ' + p.name + ' untuk ' + S.settings.city)}`);
        if (lead > 0) lines.push(...alarm(lead, `Sebentar lagi ${p.name}`));
        lines.push(...alarm(0, `Waktu ${p.name}`), 'END:VEVENT');
        count++;
      }
    }
  }
  lines.push('END:VCALENDAR');
  return { text: lines.map(fold).join('\r\n') + '\r\n', count };
}
function exportModal() {
  openModal(`<h2 style="margin-top:0">Kirim ke Google Kalender</h2>
    <p class="muted">Unduh satu file, lalu buka file itu di HP dan pilih Google Kalender. Tanpa akun atau pengaturan tambahan.</p>
    <label class="row" style="color:var(--text);font-size:15px"><input type="checkbox" id="x-ev" checked><span>Jadwal saya</span></label>
    <label class="row" style="color:var(--text);font-size:15px"><input type="checkbox" id="x-pr" checked><span>Waktu sholat</span></label>
    <label>Untuk berapa hari ke depan?</label>
    <select id="x-days"><option value="7">7 hari</option><option value="14">14 hari</option><option value="30" selected>30 hari</option></select>
    <div class="row mt"><button class="grow" data-act="do-export">Unduh file kalender</button><button class="ghost" data-act="close">Tutup</button></div>
    <p class="muted small mt">Satu jadwal saja? Ketuk jadwalnya lalu pilih "Tambah ke Google Kalender". Setelah file diimpor, atur notifikasi bawaan di Google Kalender agar pengingatnya berbunyi.</p>`);
}

/* ---------- Notifikasi ---------- */
async function showNotif(title, body, tag) {
  toast(`${title}: ${body}`, 6000);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [200, 100, 200] };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch (e) {
    try { new Notification(title, { body }); } catch (e2) { /* abaikan */ }
  }
}
const quranCount = (d) => (S.quran.log[d] || []).length;
function buildReminders() {
  const st = S.settings, date = ymd(), out = [];
  if (st.notif) {
    const lead = Number(st.leadMin) || 0;
    for (const p of prayersFor(date)) {
      if (lead > 0) out.push({ key: `pl-${p.key}`, at: fromMin(toMin(p.time) - lead), title: `Sebentar lagi ${p.name}`, body: `Masuk pukul ${p.time} (${st.city}).` });
      out.push({ key: `p-${p.key}`, at: p.time, title: `Waktu ${p.name} telah tiba`, body: `Pukul ${p.time}. Ayo sholat tepat waktu.` });
    }
  }
  if (st.notifTasks) {
    for (const ev of eventsOn(date)) {
      if (!ev.start || ev.doneDates[date]) continue;
      out.push({ key: `e-${ev.id}`, at: ev.start, title: ev.title, body: ev.note || `Mulai pukul ${ev.start}` });
    }
  }
  const target = Number(st.quranTarget) || 0;
  if (st.quranTime && target > 0 && quranCount(date) < target) {
    out.push({ key: 'quran', at: st.quranTime, title: "Waktunya membaca Al-Qur'an", body: `Target hari ini ${target} halaman (sudah ${quranCount(date)}).` });
  }
  for (const h of S.habits) {
    if (h.remindAt && !(S.habitLog[date] || {})[h.id]) out.push({ key: 'h-' + h.id, at: h.remindAt, title: h.name, body: 'Pengingat kebiasaan harian' });
  }
  if (st.puasaRemind && st.puasaTime) {
    const tm = addDays(date, 1), lbl = fastingLabel(tm);
    if (lbl) out.push({ key: 'fast-' + tm, at: st.puasaTime, title: 'Besok: ' + lbl, body: 'Niatkan puasa dan siapkan sahur.' });
  }
  return out;
}
function tick() {
  const date = ymd();
  if (S.fired.date !== date) { S.fired = { date, keys: {} }; save(); }
  const nowM = toMin(hm());
  for (const r of buildReminders()) {
    if (S.fired.keys[r.key]) continue;
    const diff = nowM - toMin(r.at);
    if (diff >= 0 && diff <= 10) {
      S.fired.keys[r.key] = 1;
      save();
      showNotif(r.title, r.body, r.key);
    }
  }
  const el = $('#np-left');
  const n = nextPrayerInfo();
  if (el && n) el.textContent = `dalam ${fmtLeft(n.mins)}`;
}

/* ---------- Al-Qur'an: data surah, juz, halaman ---------- */
const SURAH = [
  ['Al-Fatihah', 7, 1], ['Al-Baqarah', 286, 2], ["Ali 'Imran", 200, 50], ["An-Nisa'", 176, 77], ["Al-Ma'idah", 120, 106], ["Al-An'am", 165, 128],
  ["Al-A'raf", 206, 151], ['Al-Anfal', 75, 177], ['At-Taubah', 129, 187], ['Yunus', 109, 208], ['Hud', 123, 221], ['Yusuf', 111, 235],
  ["Ar-Ra'd", 43, 249], ['Ibrahim', 52, 255], ['Al-Hijr', 99, 262], ['An-Nahl', 128, 267], ["Al-Isra'", 111, 282], ['Al-Kahf', 110, 293],
  ['Maryam', 98, 305], ['Ta Ha', 135, 312], ["Al-Anbiya'", 112, 322], ['Al-Hajj', 78, 332], ["Al-Mu'minun", 118, 342], ['An-Nur', 64, 350],
  ['Al-Furqan', 77, 359], ["Asy-Syu'ara'", 227, 367], ['An-Naml', 93, 377], ['Al-Qasas', 88, 385], ["Al-'Ankabut", 69, 396], ['Ar-Rum', 60, 404],
  ['Luqman', 34, 411], ['As-Sajdah', 30, 415], ['Al-Ahzab', 73, 418], ["Saba'", 54, 428], ['Fatir', 45, 434], ['Ya Sin', 83, 440],
  ['As-Saffat', 182, 446], ['Sad', 88, 453], ['Az-Zumar', 75, 458], ['Gafir', 85, 467], ['Fussilat', 54, 477], ['Asy-Syura', 53, 483],
  ['Az-Zukhruf', 89, 489], ['Ad-Dukhan', 59, 496], ['Al-Jasiyah', 37, 499], ['Al-Ahqaf', 35, 502], ['Muhammad', 38, 507], ['Al-Fath', 29, 511],
  ['Al-Hujurat', 18, 515], ['Qaf', 45, 518], ['Az-Zariyat', 60, 520], ['At-Tur', 49, 523], ['An-Najm', 62, 526], ['Al-Qamar', 55, 528],
  ['Ar-Rahman', 78, 531], ["Al-Waqi'ah", 96, 534], ['Al-Hadid', 29, 537], ['Al-Mujadalah', 22, 542], ['Al-Hasyr', 24, 545], ['Al-Mumtahanah', 13, 549],
  ['As-Saff', 14, 551], ["Al-Jumu'ah", 11, 553], ['Al-Munafiqun', 11, 554], ['At-Tagabun', 18, 556], ['At-Talaq', 12, 558], ['At-Tahrim', 12, 560],
  ['Al-Mulk', 30, 562], ['Al-Qalam', 52, 564], ['Al-Haqqah', 52, 566], ["Al-Ma'arij", 44, 568], ['Nuh', 28, 570], ['Al-Jinn', 28, 572],
  ['Al-Muzzammil', 20, 574], ['Al-Muddassir', 56, 575], ['Al-Qiyamah', 40, 577], ['Al-Insan', 31, 578], ['Al-Mursalat', 50, 580], ["An-Naba'", 40, 582],
  ["An-Nazi'at", 46, 583], ["'Abasa", 42, 585], ['At-Takwir', 29, 586], ['Al-Infitar', 19, 587], ['Al-Mutaffifin', 36, 587], ['Al-Insyiqaq', 25, 589],
  ['Al-Buruj', 22, 590], ['At-Tariq', 17, 591], ["Al-A'la", 19, 591], ['Al-Gasyiyah', 26, 592], ['Al-Fajr', 30, 593], ['Al-Balad', 20, 594],
  ['Asy-Syams', 15, 595], ['Al-Lail', 21, 595], ['Ad-Duha', 11, 596], ['Asy-Syarh', 8, 596], ['At-Tin', 8, 597], ["Al-'Alaq", 19, 597],
  ['Al-Qadr', 5, 598], ['Al-Bayyinah', 8, 598], ['Az-Zalzalah', 8, 599], ["Al-'Adiyat", 11, 599], ["Al-Qari'ah", 11, 600], ['At-Takasur', 8, 600],
  ["Al-'Asr", 3, 601], ['Al-Humazah', 9, 601], ['Al-Fil', 5, 601], ['Quraisy', 4, 602], ["Al-Ma'un", 7, 602], ['Al-Kausar', 3, 602],
  ['Al-Kafirun', 6, 603], ['An-Nasr', 3, 603], ['Al-Lahab', 5, 603], ['Al-Ikhlas', 4, 604], ['Al-Falaq', 5, 604], ['An-Nas', 6, 604],
];
const JUZ_START = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
const juzOfPage = (p) => { let j = 1; for (let i = 0; i < JUZ_START.length; i++) if (JUZ_START[i] <= p) j = i + 1; return j; };
const QAPI = 'https://api.alquran.cloud/v1';
const QP = {}; // halaman -> data
const stripDia = (s) => s.normalize('NFD').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
async function loadQuranPage(p) {
  if (QP[p]) return QP[p];
  let ar = null, tr = null;
  try {
    const res = await fetch(`${QAPI}/page/${p}/editions/quran-uthmani,id.indonesian`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const pick = (ident, i) => (j.data.find((x) => x.edition && x.edition.identifier === ident) || j.data[i] || {}).ayahs;
    ar = pick('quran-uthmani', 0);
    tr = pick('id.indonesian', 1);
  } catch (e) {
    const res = await fetch(`${QAPI}/page/${p}/quran-uthmani`); // cadangan: hanya teks Arab
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ar = (await res.json()).data.ayahs;
  }
  if (!Array.isArray(ar) || !ar.length) throw new Error('Data kosong');
  const ayahs = ar.map((a, i) => {
    const n = a.surah ? Number(a.surah.number) : 0;
    let text = a.text;
    if (n !== 1 && n !== 9 && a.numberInSurah === 1) {
      const w = text.split(' ');
      if (w.length > 4 && stripDia(w[0]).startsWith('بسم')) text = w.slice(4).join(' ');
    }
    return { surah: n, no: a.numberInSurah, ar: text, tr: tr && tr[i] ? tr[i].text : '' };
  });
  QP[p] = ayahs;
  return ayahs;
}

/* ---------- Tampilan: Hari Ini ---------- */
function viewToday() {
  const date = state.date, isToday = date === ymd();
  const items = prayersFor(date).map((p) => ({ kind: 'prayer', time: p.time, p }));
  for (const ev of eventsOn(date)) items.push({ kind: 'ev', time: ev.start || '', ev });
  items.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  const nm = (S.settings.name || '').trim();
  const nextP = isToday ? nextPrayerInfo() : null;

  let html = `<div class="head-row">
    <button class="icon" data-act="day" data-d="-1" aria-label="Hari sebelumnya">‹</button>
    <div class="head-c">
      <div class="h1 serif">${isToday ? (nm ? `<span class="greet">Assalamu'alaikum,</span>${esc(nm)}` : "Assalamu'alaikum") : esc(HARI[parseYmd(date).getDay()])}</div>
      <div class="muted">${esc(longDate(date))}</div>
      ${hijriText(date) ? `<div class="muted small">${esc(hijriText(date))}</div>` : ''}
    </div>
    <button class="icon" data-act="day" data-d="1" aria-label="Hari berikutnya">›</button>
  </div>`;
  if (!isToday) html += `<div class="center mb"><button class="pill" data-act="day" data-d="0">Kembali ke hari ini</button></div>`;

  if (isToday) {
    if (nextP) {
      const rise = PM[date] ? fromMin(toMin(PM[date].Sunrise) + (Number(S.settings.adj) || 0)) : '';
      html += `<div class="hero">
        <div class="hero-label">${nextP.tomorrow ? 'Besok' : 'Sholat berikutnya'} · ${esc(S.settings.city)}</div>
        <div class="hero-name serif">${esc(nextP.name)}</div>
        <div class="hero-time serif">${esc(nextP.time)}</div>
        <div class="hero-left" id="np-left">dalam ${fmtLeft(nextP.mins)}</div>
        ${rise ? `<div class="hero-sub">Terbit matahari ${esc(rise)}</div>` : ''}
      </div>`;
    } else {
      html += `<div class="card warn"><b>Jadwal sholat belum termuat</b><div class="small">${esc(prayerError || 'Sedang memuat…')}</div><button class="small mt" data-act="retry-prayer">Coba lagi</button></div>`;
    }
    const f = fastingLabel(date), ft = fastingLabel(addDays(date, 1));
    if (f) html += `<div class="hint">Hari ini: ${esc(f)}</div>`;
    else if (ft && toMin(hm()) >= 15 * 60) html += `<div class="hint">Besok: ${esc(ft)}</div>`;
  }

  html += `<div class="group-t"><b>${isToday ? 'Jadwal hari ini' : 'Jadwal'}</b></div><div class="card flush">`;
  if (!items.length) html += `<div class="empty">Belum ada jadwal.<br>Ketuk tombol + untuk menambahkan.</div>`;
  for (const it of items) {
    if (it.kind === 'prayer') {
      const dn = !!(S.prayerDone[date] || {})[it.p.key];
      html += `<div class="item prayer ${dn ? 'done' : ''}">
        <input type="checkbox" data-change="toggle-prayer" data-key="${it.p.key}" ${dn ? 'checked' : ''} aria-label="Sudah sholat ${esc(it.p.name)}">
        <div class="t">${esc(it.p.time)}</div>
        <div class="grow"><div class="title"><span class="dot"></span>Sholat ${esc(it.p.name)}</div></div>
      </div>`;
    } else {
      const ev = it.ev, dn = !!ev.doneDates[date];
      const meta = [ev.end ? 's/d ' + ev.end : '', ev.repeat === 'daily' ? 'setiap hari' : ev.repeat === 'weekly' ? 'setiap pekan' : '', ev.note || ''].filter(Boolean).join(' · ');
      html += `<div class="item ${dn ? 'done' : ''}">
        <input type="checkbox" data-change="toggle-ev" data-id="${ev.id}" ${dn ? 'checked' : ''} aria-label="Selesai">
        <div class="t">${ev.start ? esc(ev.start) : 'Seharian'}</div>
        <div class="grow" data-act="edit-ev" data-id="${ev.id}" style="cursor:pointer">
          <div class="title">${esc(ev.title)}</div>${meta ? `<div class="sub">${esc(meta)}</div>` : ''}
        </div>
      </div>`;
    }
  }
  html += `</div>`;

  if (isToday) {
    const target = Number(S.settings.quranTarget) || 0, got = quranCount(date);
    if (target > 0) {
      const pct = Math.min(100, Math.round((got / target) * 100));
      html += `<div class="card soft"><div class="row between"><h3 style="margin:0">Al-Qur'an hari ini</h3><span class="muted">${got}/${target} halaman</span></div>
        <div class="bar mt"><i style="width:${pct}%"></i></div>
        <div class="row between mt"><span class="muted small">${quranStreak() > 0 ? 'Beruntun ' + quranStreak() + ' hari' : 'Mulai hari ini'}</span><button class="small" data-act="open-last">Lanjut membaca</button></div></div>`;
    }
  }
  html += `<button class="fab" data-act="add-ev" aria-label="Tambah jadwal">＋</button>`;
  return html;
}
function evForm(ev) {
  const sel = (v) => (ev.repeat === v ? 'selected' : '');
  return `<h2 style="margin-top:0">${ev.id ? 'Ubah jadwal' : 'Jadwal baru'}</h2>
    <label style="margin-top:0">Judul</label><input type="text" id="f-title" value="${esc(ev.title)}" placeholder="Contoh: Rapat, olahraga, belanja">
    <label>Tanggal</label><input type="date" id="f-date" value="${esc(ev.date)}">
    <div class="row">
      <div class="grow"><label>Mulai (kosong = seharian)</label><input type="time" id="f-start" value="${esc(ev.start)}"></div>
      <div class="grow"><label>Selesai</label><input type="time" id="f-end" value="${esc(ev.end)}"></div>
    </div>
    <label>Ulangi</label>
    <select id="f-repeat"><option value="none" ${sel('none')}>Tidak</option><option value="daily" ${sel('daily')}>Setiap hari</option><option value="weekly" ${sel('weekly')}>Setiap pekan</option></select>
    <label>Catatan</label><textarea id="f-note">${esc(ev.note)}</textarea>
    <div class="row mt"><button class="grow" data-act="save-ev" data-id="${ev.id || ''}">Simpan</button>${ev.id ? `<button class="danger" data-act="del-ev" data-id="${ev.id}">Hapus</button>` : ''}<button class="ghost" data-act="close">Batal</button></div>
    ${ev.id ? `<div class="center mt"><button class="pill" data-act="to-gcal" data-id="${ev.id}">Tambah ke Google Kalender</button></div>` : ''}`;
}
function quranStreak() {
  let n = 0, d = ymd();
  if (!quranCount(d)) d = addDays(d, -1);
  while (quranCount(d) > 0) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- Tampilan: Al-Qur'an ---------- */
function viewQuran() {
  const q = state.q;
  if (q.page) {
    return `<div class="row between" style="margin-top:4px">
        <button class="pill" data-act="q-list">‹ Daftar</button>
        <div class="center"><div class="serif" style="font-size:18px;font-weight:600" id="q-title">Halaman ${q.page}</div><div class="muted small" id="q-sub">Juz ${juzOfPage(q.page)}</div></div>
        <div class="row" style="gap:4px"><button class="pill" data-act="q-font" data-d="-2" aria-label="Kecilkan huruf">A−</button><button class="pill" data-act="q-font" data-d="2" aria-label="Besarkan huruf">A+</button></div>
      </div>
      <div class="row between mt"><label class="row small" style="margin:0;color:var(--muted)"><input type="checkbox" data-set="showTr" ${S.settings.showTr ? 'checked' : ''}><span>Tampilkan terjemahan</span></label></div>
      <div id="q-body"><div class="empty">Memuat halaman…</div></div>`;
  }
  const last = S.quran.page || 1;
  const f = q.search.trim().toLowerCase().replace(/['’\-\s]/g, '');
  let rows = '';
  if (q.mode === 'surah') {
    SURAH.forEach((s, i) => {
      const n = i + 1;
      if (f && String(n) !== f && !s[0].toLowerCase().replace(/['’\-\s]/g, '').includes(f)) return;
      rows += `<button class="rowlink" data-act="q-open" data-p="${s[2]}"><span class="n">${n}</span><span><b>${esc(s[0])}</b><div class="muted small">${s[1]} ayat · halaman ${s[2]}</div></span><span class="chev">›</span></button>`;
    });
  } else {
    JUZ_START.forEach((p, i) => { rows += `<button class="rowlink" data-act="q-open" data-p="${p}"><span class="n">${i + 1}</span><span><b>Juz ${i + 1}</b><div class="muted small">mulai halaman ${p}</div></span><span class="chev">›</span></button>`; });
  }
  return `<div class="card soft mt"><div class="row between"><div><div class="muted small">Terakhir dibaca</div><div class="serif" style="font-size:19px;font-weight:600">Halaman ${last} · Juz ${juzOfPage(last)}</div></div><button data-act="open-last">Lanjutkan</button></div></div>
    <div class="seg mb"><button class="${q.mode === 'surah' ? 'on' : ''}" data-act="q-mode" data-m="surah">Surah</button><button class="${q.mode === 'juz' ? 'on' : ''}" data-act="q-mode" data-m="juz">Juz</button></div>
    ${q.mode === 'surah' ? `<input type="text" id="qsearch" data-input="qsearch" value="${esc(q.search)}" placeholder="Cari surah (nama atau nomor)">` : ''}
    <div class="row mt mb"><input type="number" id="q-goto" min="1" max="604" inputmode="numeric" placeholder="Ke halaman (1-604)"><button class="small" data-act="q-goto">Buka</button></div>
    <div class="card flush" id="surah-list">${rows || '<div class="empty">Tidak ditemukan.</div>'}</div>`;
}
async function postQuran() {
  const p = state.q.page;
  if (!p) return;
  const body = $('#q-body');
  if (!body) return;
  document.documentElement.style.setProperty('--ar-size', (Number(S.settings.arSize) || 30) + 'px');
  try {
    const ayahs = await loadQuranPage(p);
    if (state.q.page !== p || state.tab !== 'quran' || !$('#q-body')) return;
    const first = SURAH[(ayahs[0].surah || 1) - 1];
    const sub = $('#q-sub');
    if (sub) sub.textContent = `Juz ${juzOfPage(p)}${first ? ' · ' + first[0] : ''}`;
    let html = '', open = false;
    const close = () => { if (open) { html += '</div>'; open = false; } };
    for (const a of ayahs) {
      if (a.no === 1) {
        close();
        const s = SURAH[a.surah - 1];
        html += `<div class="surah-head"><div class="serif">${s ? 'Surah ' + esc(s[0]) : ''}</div><div class="muted small">${s ? s[1] + ' ayat' : ''}</div></div>`;
        if (a.surah !== 1 && a.surah !== 9) html += `<div class="basmalah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>`;
      }
      if (!open) { html += '<div class="mushaf">'; open = true; }
      html += `${esc(a.ar)} <span class="end">﴿${arNum(a.no)}﴾</span> `;
    }
    close();
    if (S.settings.showTr && ayahs.some((a) => a.tr)) {
      html += `<div class="tr-list"><h3>Terjemahan</h3>${ayahs.map((a) => `<div class="tr-item"><b>${a.surah}:${a.no}</b> ${esc(a.tr)}</div>`).join('')}</div>`;
    }
    const done = (S.quran.log[ymd()] || []).includes(p);
    html += `<div class="row mt" style="margin-bottom:6px">
      <button class="ghost" data-act="q-prev" ${p <= 1 ? 'disabled' : ''}>‹</button>
      <button class="grow" data-act="q-done">${done ? 'Sudah tercatat · Halaman berikutnya' : 'Selesai halaman ini'}</button>
      <button class="ghost" data-act="q-next" ${p >= 604 ? 'disabled' : ''}>›</button></div>`;
    body.innerHTML = html;
    body.dataset.p = String(p);
    S.quran.page = p;
    save();
    window.scrollTo(0, 0);
  } catch (e) {
    body.innerHTML = `<div class="empty">Halaman ini belum bisa dimuat.<br>Periksa internet lalu coba lagi.<br><button class="small mt" data-act="q-retry">Coba lagi</button></div>`;
  }
}

/* ---------- Tampilan: Keuangan ---------- */
const CAT_OUT = ['Makan & minum', 'Transportasi', 'Belanja rumah', 'Tagihan', 'Pendidikan', 'Kesehatan', 'Sedekah & zakat', 'Hiburan', 'Cicilan & utang', 'Lainnya'];
const CAT_IN = ['Gaji', 'Usaha', 'Hadiah', 'Lainnya'];
const monthLabel = (m) => { const [y, mo] = m.split('-').map(Number); return `${BULAN[mo - 1]} ${y}`; };
function viewMoney() {
  const m = state.month;
  const txs = S.tx.filter((t) => t.date.startsWith(m)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const inc = txs.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const out = txs.filter((t) => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const budget = Number(S.settings.budget) || 0;
  const pct = budget > 0 ? Math.min(100, Math.round((out / budget) * 100)) : 0;
  let html = `<div class="head-row"><button class="icon" data-act="month" data-d="-1" aria-label="Bulan sebelumnya">‹</button><div class="head-c"><div class="h1 serif">${esc(monthLabel(m))}</div></div><button class="icon" data-act="month" data-d="1" aria-label="Bulan berikutnya">›</button></div>
  <div class="card"><div class="stat">
    <div><div class="muted small">Masuk</div><div class="v in">${rupiah(inc)}</div></div>
    <div><div class="muted small">Keluar</div><div class="v out">${rupiah(out)}</div></div>
    <div><div class="muted small">Selisih</div><div class="v ${inc - out >= 0 ? 'in' : 'out'}">${rupiah(inc - out)}</div></div>
  </div></div>
  <div class="card">
    <h3>Anggaran bulanan</h3>
    <input type="number" inputmode="numeric" data-set="budget" value="${budget || ''}" placeholder="Batas pengeluaran bulan ini (Rp)">
    ${budget > 0 ? `<div class="bar mt ${out > budget ? 'over' : ''}"><i style="width:${pct}%"></i></div>
      <div class="small mt ${out > budget ? 'bad' : 'muted'}">${out > budget ? 'Melebihi anggaran ' + rupiah(out - budget) : 'Sisa ' + rupiah(budget - out) + ' · ' + pct + '% terpakai'}</div>` : ''}
  </div>
  <div class="group-t"><b>Transaksi</b></div><div class="card flush">`;
  if (!txs.length) html += `<div class="empty">Belum ada transaksi bulan ini.</div>`;
  for (const t of txs) {
    html += `<div class="item" data-act="edit-tx" data-id="${t.id}" style="cursor:pointer">
      <div class="grow"><div class="title">${esc(t.cat)}</div><div class="sub">${esc(shortDate(t.date))}${t.note ? ' · ' + esc(t.note) : ''}</div></div>
      <b class="${t.type === 'in' ? 'in' : 'out'}">${t.type === 'in' ? '+' : '−'}${rupiah(t.amount)}</b></div>`;
  }
  return html + `</div><button class="fab" data-act="add-tx" aria-label="Tambah transaksi">＋</button>`;
}
function txForm(t) {
  const cats = t.type === 'in' ? CAT_IN : CAT_OUT;
  return `<h2 style="margin-top:0">${t.id ? 'Ubah transaksi' : 'Transaksi baru'}</h2>
    <div class="seg"><button class="${t.type === 'out' ? 'on' : ''}" data-act="tx-type" data-t="out" data-id="${t.id || ''}">Pengeluaran</button><button class="${t.type === 'in' ? 'on' : ''}" data-act="tx-type" data-t="in" data-id="${t.id || ''}">Pemasukan</button></div>
    <input type="hidden" id="f-type" value="${t.type}">
    <label>Jumlah (Rp)</label><input type="number" inputmode="numeric" id="f-amount" value="${t.amount || ''}" placeholder="0">
    <label>Kategori</label><select id="f-cat">${cats.map((c) => `<option ${c === t.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <label>Tanggal</label><input type="date" id="f-date" value="${esc(t.date)}">
    <label>Catatan</label><input type="text" id="f-note" value="${esc(t.note || '')}" placeholder="Opsional">
    <div class="row mt"><button class="grow" data-act="save-tx" data-id="${t.id || ''}">Simpan</button>${t.id ? `<button class="danger" data-act="del-tx" data-id="${t.id}">Hapus</button>` : ''}<button class="ghost" data-act="close">Batal</button></div>`;
}

/* ---------- Tampilan: Lainnya ---------- */
const DZIKIR = [
  { id: 'tasbih', ar: 'سُبْحَانَ ٱللّٰهِ', mean: 'Maha Suci Allah', target: 33 },
  { id: 'tahmid', ar: 'ٱلْحَمْدُ لِلّٰهِ', mean: 'Segala puji bagi Allah', target: 33 },
  { id: 'takbir', ar: 'ٱللّٰهُ أَكْبَرُ', mean: 'Allah Maha Besar', target: 33 },
  { id: 'istighfar', ar: 'أَسْتَغْفِرُ ٱللّٰهَ', mean: 'Aku memohon ampun kepada Allah', target: 100 },
  { id: 'tahlil', ar: 'لَا إِلٰهَ إِلَّا ٱللّٰهُ', mean: 'Tiada tuhan selain Allah', target: 100 },
  { id: 'hawqalah', ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللّٰهِ', mean: 'Tiada daya dan kekuatan kecuali dengan pertolongan Allah', target: 33 },
  { id: 'shalawat', ar: 'ٱللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', mean: 'Ya Allah, limpahkan shalawat kepada Muhammad', target: 100 },
];
const DOA = [
  { t: 'Bangun tidur', ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', mean: 'Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dikembalikan.' },
  { t: 'Sebelum tidur', ar: 'بِاسْمِكَ اللَّهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوتُ', mean: 'Dengan nama-Mu ya Allah aku hidup dan aku mati.' },
  { t: 'Sebelum makan', ar: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', mean: 'Ya Allah, berkahilah rezeki yang Engkau berikan kepada kami dan jagalah kami dari azab neraka.' },
  { t: 'Sesudah makan', ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', mean: 'Segala puji bagi Allah yang telah memberi kami makan dan minum serta menjadikan kami muslim.' },
  { t: 'Keluar rumah', ar: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', mean: 'Dengan nama Allah, aku bertawakal kepada Allah. Tiada daya dan kekuatan kecuali dengan pertolongan Allah.' },
  { t: 'Menuntut ilmu', ar: 'رَبِّ زِدْنِي عِلْمًا وَارْزُقْنِي فَهْمًا', mean: 'Ya Tuhanku, tambahkanlah ilmu kepadaku dan berilah aku pemahaman.' },
  { t: 'Untuk orang tua', ar: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', mean: 'Ya Tuhanku, ampunilah aku dan kedua orang tuaku, dan sayangilah mereka sebagaimana mereka menyayangiku waktu kecil.' },
  { t: 'Kebaikan dunia dan akhirat', ar: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', mean: 'Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka.' },
];
function streak(hid) {
  let n = 0, d = ymd();
  if (!(S.habitLog[d] || {})[hid]) d = addDays(d, -1);
  while ((S.habitLog[d] || {})[hid]) { n++; d = addDays(d, -1); }
  return n;
}
const backBtn = () => `<button class="icon back" data-act="back" aria-label="Kembali">‹</button>`;
function viewMore() {
  const sub = state.sub;
  if (sub === 'habits') return viewHabits();
  if (sub === 'amalan') return viewAmalan();
  if (sub === 'settings') return viewSettings();
  const row = (act, title, desc) => `<button class="rowlink" data-act="${act}"><span><b>${title}</b><div class="muted small">${desc}</div></span><span class="chev">›</span></button>`;
  return `<div class="head-row"><div class="head-c" style="text-align:left"><div class="h1 serif">Lainnya</div></div></div>
    <div class="card flush">
      ${row('go-habits', 'Kebiasaan harian', 'Centang kebiasaan baik dan jaga rangkaian harinya')}
      ${row('go-dzikir', 'Dzikir', 'Penghitung dzikir harian')}
      ${row('go-doa', 'Doa harian', 'Doa-doa pendek sehari-hari')}
    </div>
    <div class="card flush">
      ${row('export', 'Kirim ke Google Kalender', 'Jadwal dan waktu sholat ke kalender Anda')}
      ${row('go-settings', 'Pengaturan', 'Lokasi sholat, notifikasi, cadangan data')}
    </div>
    <div class="center muted small" style="margin-top:24px">MyDay · data tersimpan di HP ini</div>`;
}
function viewHabits() {
  const today = ymd(), hd = S.habitLog[today] || {};
  const done = S.habits.filter((h) => hd[h.id]).length;
  let html = `<div class="row">${backBtn()}<div class="grow"><div class="h1 serif">Kebiasaan</div></div><button class="pill" data-act="add-habit">＋ Tambah</button></div>
    <div class="muted mb" style="margin-top:2px">Hari ini ${done} dari ${S.habits.length} selesai</div><div class="card flush">`;
  if (!S.habits.length) html += `<div class="empty">Belum ada kebiasaan.</div>`;
  for (const h of S.habits) {
    const st = streak(h.id);
    html += `<div class="item ${hd[h.id] ? 'done' : ''}">
      <input type="checkbox" data-change="toggle-habit" data-id="${h.id}" ${hd[h.id] ? 'checked' : ''} aria-label="${esc(h.name)}">
      <div class="grow" data-act="edit-habit" data-id="${h.id}" style="cursor:pointer"><div class="title">${esc(h.name)}</div>
      <div class="sub">${st > 0 ? st + ' hari beruntun' : 'Belum ada rangkaian'}${h.remindAt ? ' · pengingat ' + esc(h.remindAt) : ''}</div></div></div>`;
  }
  return html + `</div>`;
}
function habitForm(h) {
  return `<h2 style="margin-top:0">${h.id ? 'Ubah kebiasaan' : 'Kebiasaan baru'}</h2>
    <label style="margin-top:0">Nama</label><input type="text" id="f-name" value="${esc(h.name)}" placeholder="Contoh: Baca Al-Qur'an setelah Maghrib">
    <label>Pengingat jam (opsional)</label><input type="time" id="f-remind" value="${esc(h.remindAt || '')}">
    <div class="row mt"><button class="grow" data-act="save-habit" data-id="${h.id || ''}">Simpan</button>${h.id ? `<button class="danger" data-act="del-habit" data-id="${h.id}">Hapus</button>` : ''}<button class="ghost" data-act="close">Batal</button></div>`;
}
function viewAmalan() {
  const tab = state.dzTab, d = ymd(), log = S.dzikir[d] || {};
  let html = `<div class="row">${backBtn()}<div class="grow"><div class="h1 serif">${tab === 'dzikir' ? 'Dzikir' : 'Doa harian'}</div></div></div>`;
  if (tab === 'dzikir') {
    html += `<div class="muted mb" style="margin-top:2px">Ketuk angka untuk menghitung. Tersimpan per hari.</div>`;
    for (const z of DZIKIR) {
      const c = log[z.id] || 0, pct = Math.min(100, Math.round((c / z.target) * 100));
      html += `<div class="card dz">
        <div class="ar-line">${z.ar}</div><div class="muted center">${esc(z.mean)}</div>
        <div class="bar mt ${c >= z.target ? 'gold' : ''}"><i style="width:${pct}%"></i></div>
        <div class="row between mt"><button class="ghost small" data-act="dz-reset" data-id="${z.id}">Ulang</button>
        <button class="count" data-act="dz-add" data-id="${z.id}" aria-label="Tambah hitungan"><span id="dz-${z.id}">${c}</span><small>/ ${z.target}</small></button><span style="width:56px"></span></div>
      </div>`;
    }
  } else {
    for (const x of DOA) html += `<div class="card"><h3>${esc(x.t)}</h3><div class="ar-line">${x.ar}</div><div class="muted">${esc(x.mean)}</div></div>`;
    html += `<div class="muted small center">Mohon periksa kembali bacaan dengan sumber yang Anda percaya.</div>`;
  }
  return html;
}
function viewSettings() {
  const st = S.settings;
  const perm = 'Notification' in window ? Notification.permission : 'na';
  const permTxt = { granted: 'Diizinkan', denied: 'Ditolak (ubah di pengaturan browser)', default: 'Belum diminta', na: 'Tidak didukung browser ini' }[perm];
  const sw = (k, label) => `<label class="row" style="color:var(--text);font-size:15px;margin:10px 0"><input type="checkbox" data-set="${k}" ${st[k] ? 'checked' : ''}><span>${label}</span></label>`;
  const known = CITIES.some((c) => Math.abs(c[1] - st.lat) < 0.001 && Math.abs(c[2] - st.lng) < 0.001);
  return `<div class="row">${backBtn()}<div class="grow"><div class="h1 serif">Pengaturan</div></div></div>
  <div class="group-t"><b>Profil</b></div><div class="card"><label style="margin-top:0">Nama untuk sapaan</label><input type="text" data-set="name" value="${esc(st.name)}"></div>
  <div class="group-t"><b>Waktu sholat</b></div><div class="card">
    <label style="margin-top:0">Kota</label>
    <select data-act-change="city">${CITIES.map((c) => `<option value="${esc(c[0])}" ${known && c[0] === st.city ? 'selected' : ''}>${esc(c[0])}</option>`).join('')}${known ? '' : `<option selected>${esc(st.city)}</option>`}</select>
    <button class="ghost small mt" data-act="geo">Pakai lokasi HP saya</button>
    <label>Metode perhitungan</label>
    <select data-set="method"><option value="20" ${+st.method === 20 ? 'selected' : ''}>Kemenag RI (Indonesia)</option><option value="11" ${+st.method === 11 ? 'selected' : ''}>MUIS (Singapura)</option><option value="3" ${+st.method === 3 ? 'selected' : ''}>Muslim World League</option><option value="4" ${+st.method === 4 ? 'selected' : ''}>Umm al-Qura (Makkah)</option></select>
    <label>Koreksi waktu (menit, boleh minus)</label><input type="number" data-set="adj" value="${st.adj}">
    <div class="muted small mt">Bandingkan dengan jadwal masjid setempat. Bila selisih, geser dengan koreksi menit.</div>
  </div>
  <div class="group-t"><b>Notifikasi</b></div><div class="card">
    <div class="small">Izin notifikasi: <b>${esc(permTxt)}</b></div>
    <div class="row wrap mt"><button class="small" data-act="ask-notif">Aktifkan</button><button class="small ghost" data-act="test-notif">Coba notifikasi</button></div>
    ${sw('notif', 'Ingatkan waktu sholat')}
    <label style="margin-top:0">Ingatkan sebelum sholat (menit, 0 = mati)</label><input type="number" min="0" data-set="leadMin" value="${st.leadMin}">
    ${sw('notifTasks', 'Ingatkan jadwal harian')}
    ${sw('puasaRemind', 'Ingatkan malam sebelum puasa sunnah')}
    <div class="row"><div class="grow"><label style="margin-top:0">Jam baca Al-Qur'an</label><input type="time" data-set="quranTime" value="${esc(st.quranTime)}"></div>
    <div class="grow"><label style="margin-top:0">Target halaman/hari</label><input type="number" min="0" data-set="quranTarget" value="${st.quranTarget}"></div></div>
    <div class="card warn small mt" style="margin-bottom:0">Notifikasi dari aplikasi berbunyi saat MyDay terbuka atau masih berjalan di latar belakang. Untuk pengingat saat aplikasi benar-benar tertutup, kirim jadwal ke Google Kalender (menu Lainnya).</div>
  </div>
  <div class="group-t"><b>Data</b></div><div class="card">
    <div class="muted small mb">Semua data tersimpan di HP ini saja. Cadangkan berkala.</div>
    <div class="row wrap"><button class="small" data-act="backup">Unduh cadangan</button>
    <label class="btn small ghost" style="margin:0;display:inline-block;color:var(--primary)">Pulihkan<input type="file" accept="application/json" data-change="restore" style="display:none"></label>
    <button class="small ghost" data-act="export-csv">Keuangan (CSV)</button>
    <button class="small danger" data-act="wipe">Hapus semua</button></div>
  </div>`;
}

/* ---------- Render utama ---------- */
function render(force = false) {
  if (modalOpen()) return renderLater();
  if (!force && state.tab === 'quran' && state.q.page && $('#q-body') && $('#q-body').dataset.p) return;
  const active = document.activeElement;
  const typing = active && active.closest && active.closest('#view') && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && !['checkbox', 'button'].includes(active.type)));
  if (typing && !force) return;
  const v = $('#view');
  const y = window.scrollY;
  let html = '';
  if (state.tab === 'today') html = viewToday();
  else if (state.tab === 'quran') html = viewQuran();
  else if (state.tab === 'money') html = viewMoney();
  else html = viewMore();
  v.innerHTML = html;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  if (state.tab === 'quran') postQuran();
  else window.scrollTo(0, y);
}
let renderPending = false;
function renderLater() {
  if (renderPending) return;
  renderPending = true;
  const t = setInterval(() => { if (!modalOpen()) { clearInterval(t); renderPending = false; render(); } }, 300);
}

/* ---------- Aksi (klik) ---------- */
const ACT = {};
ACT.close = () => closeModal();
ACT.back = () => { state.sub = null; render(true); window.scrollTo(0, 0); };
ACT.day = (el) => { const d = Number(el.dataset.d); state.date = d === 0 ? ymd() : addDays(state.date, d); ensureDay(state.date).then(() => render(true)); render(true); };
ACT['retry-prayer'] = async () => { await ensureDay(ymd()); await ensureDay(addDays(ymd(), 1)); render(true); };
ACT.chip = () => exportModal();
ACT.export = () => exportModal();
ACT['do-export'] = async (el) => {
  const ev = $('#x-ev').checked, pr = $('#x-pr').checked, days = Number($('#x-days').value);
  if (!ev && !pr) return toast('Pilih minimal satu.');
  el.disabled = true; el.textContent = 'Menyiapkan…';
  try {
    const r = await buildIcs(ev, pr, days);
    if (!r.count) { toast('Tidak ada yang bisa diekspor. Jadwal sholat mungkin belum termuat.'); return; }
    download('myday-jadwal.ics', r.text, 'text/calendar');
    toast(`${r.count} acara siap. Buka file yang terunduh.`, 5000);
    closeModal();
  } catch (e) { toast('Gagal membuat file kalender.'); }
  finally { el.disabled = false; el.textContent = 'Unduh file kalender'; }
};
ACT['to-gcal'] = (el) => {
  const ev = S.events.find((e) => e.id === el.dataset.id);
  if (ev) window.open(googleLink(ev), '_blank', 'noopener');
};

// Jadwal
ACT['add-ev'] = () => openModal(evForm({ title: '', date: state.date, start: '', end: '', note: '', repeat: 'none' }));
ACT['edit-ev'] = (el) => { const ev = S.events.find((e) => e.id === el.dataset.id); if (ev) openModal(evForm(ev)); };
ACT['save-ev'] = (el) => {
  const title = $('#f-title').value.trim();
  const date = $('#f-date').value, start = $('#f-start').value, end = $('#f-end').value;
  if (!title) return toast('Judul belum diisi.');
  if (!date) return toast('Tanggal belum diisi.');
  if (start && end && toMin(end) <= toMin(start)) return toast('Jam selesai harus setelah jam mulai.');
  const data = { title, date, start, end: start ? end : '', note: $('#f-note').value.trim(), repeat: $('#f-repeat').value };
  const id = el.dataset.id;
  if (id) Object.assign(S.events.find((e) => e.id === id), data);
  else S.events.push({ id: uid(), doneDates: {}, ...data });
  save(); closeModal(); render(true);
};
ACT['del-ev'] = (el) => {
  const ev = S.events.find((e) => e.id === el.dataset.id);
  if (!ev) return;
  if (!confirm(ev.repeat !== 'none' ? 'Hapus jadwal berulang ini beserta semua pengulangannya?' : 'Hapus jadwal ini?')) return;
  S.events = S.events.filter((e) => e !== ev);
  save(); closeModal(); render(true);
};

// Al-Qur'an
ACT['q-open'] = (el) => { state.q.page = Number(el.dataset.p); render(true); };
ACT['q-list'] = () => { state.q.page = 0; render(true); window.scrollTo(0, 0); };
ACT['q-mode'] = (el) => { state.q.mode = el.dataset.m; render(true); };
ACT['q-goto'] = () => {
  const p = Math.floor(Number($('#q-goto').value));
  if (!(p >= 1 && p <= 604)) return toast('Isi nomor halaman 1 sampai 604.');
  state.q.page = p; render(true);
};
ACT['open-last'] = () => { state.tab = 'quran'; state.sub = null; state.q.page = S.quran.page || 1; render(true); };
ACT['q-retry'] = () => { delete QP[state.q.page]; render(true); };
ACT['q-prev'] = () => { if (state.q.page > 1) { state.q.page--; render(true); } };
ACT['q-next'] = () => { if (state.q.page < 604) { state.q.page++; render(true); } };
ACT['q-done'] = () => {
  const d = ymd(), p = state.q.page;
  const list = S.quran.log[d] || (S.quran.log[d] = []);
  const fresh = !list.includes(p);
  if (fresh) list.push(p);
  S.quran.page = Math.min(604, p + 1);
  save();
  const target = Number(S.settings.quranTarget) || 0;
  toast(fresh ? `Tercatat ✓ · hari ini ${list.length}${target ? '/' + target : ''} halaman` : 'Lanjut ke halaman berikutnya');
  if (p < 604) { state.q.page = p + 1; render(true); } else render(true);
};
ACT['q-font'] = (el) => {
  const s = Math.max(22, Math.min(44, (Number(S.settings.arSize) || 30) + Number(el.dataset.d)));
  S.settings.arSize = s; save();
  document.documentElement.style.setProperty('--ar-size', s + 'px');
};

// Keuangan
ACT.month = (el) => {
  const [y, m] = state.month.split('-').map(Number);
  const d = new Date(y, m - 1 + Number(el.dataset.d), 1);
  state.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  render(true);
};
ACT['add-tx'] = () => openModal(txForm({ type: 'out', amount: '', cat: CAT_OUT[0], date: state.month === ymd().slice(0, 7) ? ymd() : state.month + '-01', note: '' }));
ACT['edit-tx'] = (el) => { const t = S.tx.find((x) => x.id === el.dataset.id); if (t) openModal(txForm(t)); };
ACT['tx-type'] = (el) => openModal(txForm({ id: el.dataset.id || '', type: el.dataset.t, amount: Number($('#f-amount').value) || '', cat: el.dataset.t === 'in' ? CAT_IN[0] : CAT_OUT[0], date: $('#f-date').value, note: $('#f-note').value }));
ACT['save-tx'] = (el) => {
  const amount = Number($('#f-amount').value);
  if (!(amount > 0)) return toast('Isi jumlah lebih dari 0.');
  const date = $('#f-date').value;
  if (!date) return toast('Tanggal belum diisi.');
  const data = { type: $('#f-type').value, amount, cat: $('#f-cat').value, date, note: $('#f-note').value.trim() };
  const id = el.dataset.id;
  if (id) Object.assign(S.tx.find((t) => t.id === id), data); else S.tx.push({ id: uid(), ...data });
  state.month = date.slice(0, 7);
  save(); closeModal(); render(true); toast('Tersimpan ✓');
};
ACT['del-tx'] = (el) => { if (!confirm('Hapus transaksi ini?')) return; S.tx = S.tx.filter((t) => t.id !== el.dataset.id); save(); closeModal(); render(true); };
ACT['export-csv'] = () => {
  const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
  const rows = S.tx.filter((t) => t.date.startsWith(state.month)).sort((a, b) => a.date.localeCompare(b.date));
  const csv = ['Tanggal,Jenis,Kategori,Jumlah,Catatan', ...rows.map((t) => [t.date, t.type === 'in' ? 'Pemasukan' : 'Pengeluaran', q(t.cat), t.amount, q(t.note)].join(','))].join('\n');
  download(`keuangan-${state.month}.csv`, '\ufeff' + csv, 'text/csv');
};

// Lainnya
ACT['go-habits'] = () => { state.sub = 'habits'; render(true); window.scrollTo(0, 0); };
ACT['go-dzikir'] = () => { state.sub = 'amalan'; state.dzTab = 'dzikir'; render(true); window.scrollTo(0, 0); };
ACT['go-doa'] = () => { state.sub = 'amalan'; state.dzTab = 'doa'; render(true); window.scrollTo(0, 0); };
ACT['go-settings'] = () => { state.sub = 'settings'; render(true); window.scrollTo(0, 0); };
ACT['add-habit'] = () => openModal(habitForm({ name: '', remindAt: '' }));
ACT['edit-habit'] = (el) => { const h = S.habits.find((x) => x.id === el.dataset.id); if (h) openModal(habitForm(h)); };
ACT['save-habit'] = (el) => {
  const name = $('#f-name').value.trim();
  if (!name) return toast('Nama belum diisi.');
  const data = { name, remindAt: $('#f-remind').value };
  const id = el.dataset.id;
  if (id) Object.assign(S.habits.find((h) => h.id === id), data); else S.habits.push({ id: uid(), ...data });
  save(); closeModal(); render(true);
};
ACT['del-habit'] = (el) => { if (!confirm('Hapus kebiasaan ini?')) return; S.habits = S.habits.filter((h) => h.id !== el.dataset.id); save(); closeModal(); render(true); };
ACT['dz-add'] = (el) => {
  const d = ymd(), id = el.dataset.id;
  S.dzikir[d] = S.dzikir[d] || {};
  S.dzikir[d][id] = (S.dzikir[d][id] || 0) + 1;
  save();
  if (navigator.vibrate) navigator.vibrate(12);
  const z = DZIKIR.find((x) => x.id === id), c = S.dzikir[d][id];
  const span = $('#dz-' + id);
  if (span) span.textContent = c;
  const card = el.closest('.card'), bar = card && card.querySelector('.bar');
  if (bar && z) { bar.classList.toggle('gold', c >= z.target); bar.firstElementChild.style.width = Math.min(100, Math.round((c / z.target) * 100)) + '%'; }
  if (z && c === z.target) { if (navigator.vibrate) navigator.vibrate([30, 40, 30]); toast('Target tercapai'); }
};
ACT['dz-reset'] = (el) => { const d = ymd(); if (S.dzikir[d]) S.dzikir[d][el.dataset.id] = 0; save(); render(true); };
ACT.geo = () => {
  if (!navigator.geolocation) return toast('Browser tidak mendukung lokasi.');
  toast('Mencari lokasi…');
  navigator.geolocation.getCurrentPosition((pos) => {
    S.settings.lat = Number(pos.coords.latitude.toFixed(4));
    S.settings.lng = Number(pos.coords.longitude.toFixed(4));
    S.settings.city = 'Lokasi saya';
    save(); onLocationChanged(); toast('Lokasi diperbarui ✓');
  }, () => toast('Izin lokasi ditolak atau gagal.'), { timeout: 15000 });
};
ACT['ask-notif'] = async () => {
  if (!('Notification' in window)) return toast('Browser ini tidak mendukung notifikasi.');
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Notifikasi diaktifkan ✓' : 'Izin notifikasi tidak diberikan.');
  render(true);
};
ACT['test-notif'] = () => showNotif('Tes notifikasi', 'Jika Anda melihat ini, notifikasi berfungsi.', 'test-' + Date.now());
ACT.backup = () => download(`myday-cadangan-${ymd()}.json`, JSON.stringify(S, null, 1));
ACT.wipe = () => {
  if (!confirm('Hapus SEMUA data di HP ini? Tindakan ini tidak bisa dibatalkan.')) return;
  if (!confirm('Yakin? Pertimbangkan mengunduh cadangan dulu.')) return;
  ['myday.v1', 'myday.prayer'].forEach((k) => localStorage.removeItem(k));
  location.reload();
};

/* ---------- Perubahan input ---------- */
const CHG = {};
CHG['toggle-prayer'] = (el) => { const d = state.date; S.prayerDone[d] = S.prayerDone[d] || {}; S.prayerDone[d][el.dataset.key] = el.checked; save(); render(true); };
CHG['toggle-ev'] = (el) => { const ev = S.events.find((e) => e.id === el.dataset.id); if (!ev) return; ev.doneDates[state.date] = el.checked; save(); render(true); };
CHG['toggle-habit'] = (el) => { const d = ymd(); S.habitLog[d] = S.habitLog[d] || {}; S.habitLog[d][el.dataset.id] = el.checked; save(); render(true); };
CHG.restore = (el) => {
  const f = el.files && el.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const raw = JSON.parse(r.result);
      if (!raw || typeof raw !== 'object' || !raw.settings) throw new Error('bukan cadangan');
      if (!confirm('Ganti semua data saat ini dengan isi cadangan?')) return;
      S = mergeState(DEFAULTS(), raw);
      save(); PM = {}; toast('Data dipulihkan ✓'); init2();
    } catch (e) { toast('File cadangan tidak valid.'); }
  };
  r.readAsText(f);
};
CHG.set = (el) => {
  const k = el.dataset.set;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') { v = parseFloat(el.value); if (Number.isNaN(v)) v = k === 'budget' ? 0 : S.settings[k]; }
  else v = el.value;
  S.settings[k] = v;
  save();
  if (['method', 'adj'].includes(k)) onLocationChanged();
  else if (k === 'budget') render(true);
  else if (k === 'showTr') render(true);
};
CHG.city = (el) => {
  const c = CITIES.find((x) => x[0] === el.value);
  if (!c) return;
  S.settings.city = c[0]; S.settings.lat = c[1]; S.settings.lng = c[2];
  save(); onLocationChanged();
};
const INP = {};
INP.qsearch = (el) => {
  state.q.search = el.value;
  const f = el.value.trim().toLowerCase().replace(/['’\-\s]/g, '');
  let rows = '';
  SURAH.forEach((s, i) => {
    const n = i + 1;
    if (f && String(n) !== f && !s[0].toLowerCase().replace(/['’\-\s]/g, '').includes(f)) return;
    rows += `<button class="rowlink" data-act="q-open" data-p="${s[2]}"><span class="n">${n}</span><span><b>${esc(s[0])}</b><div class="muted small">${s[1]} ayat · halaman ${s[2]}</div></span><span class="chev">›</span></button>`;
  });
  $('#surah-list').innerHTML = rows || '<div class="empty">Tidak ditemukan.</div>';
};

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'modal') return closeModal();
  const el = e.target.closest && e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (fn) fn(el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest && e.target.closest('[data-change],[data-set],[data-act-change]');
  if (!el) return;
  if (el.dataset.change && CHG[el.dataset.change]) CHG[el.dataset.change](el, e);
  else if (el.dataset.actChange && CHG[el.dataset.actChange]) CHG[el.dataset.actChange](el, e);
  else if (el.dataset.set) CHG.set(el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest && e.target.closest('[data-input]');
  if (el && INP[el.dataset.input]) INP[el.dataset.input](el, e);
});
$('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  state.tab = b.dataset.tab;
  state.sub = null;
  if (state.tab !== 'quran') state.q.page = 0;
  render(true);
  window.scrollTo(0, 0);
});

/* ---------- Mulai ---------- */
async function init2() {
  render(true);
  const today = ymd();
  await ensureDay(today);
  await ensureDay(addDays(today, 1));
  render(true);
}
function hideSplash() {
  const s = $('#splash');
  if (!s) return;
  s.classList.add('hide');
  setTimeout(() => s.remove(), 800);
}
function init() {
  load();
  document.documentElement.style.setProperty('--ar-size', (Number(S.settings.arSize) || 30) + 'px');
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(() => {});
  const hdr = $('#hdr-sync');
  if (hdr) { hdr.textContent = 'Kalender'; hdr.dataset.act = 'chip'; }
  init2();
  setTimeout(hideSplash, 900);
  setInterval(tick, 20000);
  setTimeout(tick, 1500);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    tick();
    ensureDay(ymd()).then(() => render());
  });
}
init();
