
const SUPABASE_URL = 'https://vudpaeodsuqdphxjlaje.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1ZHBhZW9kc3VxZHBoeGpsYWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjUxMTYsImV4cCI6MjEwNDY0MTExNn0.PHS4rWYkSEl2H_k2mivcwqyoFDGVT1gNfmKTkcwwiA0';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);




window.addEventListener('error', (e) => {
  logEvent('error', (e.message || 'Неизвестная ошибка JS'), {
    filename: e.filename, lineno: e.lineno, colno: e.colno,
  });
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const msg = reason && reason.message ? reason.message : String(reason);
  logEvent('error', 'Необработанный promise-reject: ' + msg, {});
});




// Версия текста согласия/политики, фиксируется в метаданных при регистрации
const CONSENT_VERSION = '2026-draft';

const YOOMONEY_WALLET = '4100119630704520';




const PLANS = {
  free: {
    key: 'free', name: 'Free', price: 0, badgeClass: 'plan-free',
    limit: 10, charLimit: 5000, groupLimit: 1, messageLimit: 3,
    features: ['10 заметок', 'До 5 000 символов в заметке', '1 своя группа', '3 сообщения в каждой группе'],
    perks: { search: false, pin: false, tags: false, exportTxt: false, history: false, lockNote: false }
  },
  s: {
    key: 's', name: 'Лайт', price: 39, badgeClass: 'plan-s',
    limit: 30, charLimit: 15000, groupLimit: 3, messageLimit: 8,
    features: ['30 заметок', 'До 15 000 символов в заметке', 'Поиск по заметкам', 'Закрепление важных заметок', '3 свои группы', '8 сообщений в каждой группе'],
    perks: { search: true, pin: true, tags: false, exportTxt: false, history: false, lockNote: false }
  },
  m: {
    key: 'm', name: 'Про', price: 99, badgeClass: 'plan-m',
    limit: 80, charLimit: 35000, groupLimit: 6, messageLimit: 15,
    features: ['80 заметок', 'До 35 000 символов в заметке', 'Всё из "Лайт"', 'Теги и папки для заметок', 'Экспорт заметки в .txt', '6 своих групп', '15 сообщений в каждой группе'],
    perks: { search: true, pin: true, tags: true, exportTxt: true, history: false, lockNote: false }
  },
  l: {
    key: 'l', name: 'Студия', price: 249, badgeClass: 'plan-l',
    limit: 250, charLimit: 80000, groupLimit: 15, messageLimit: 40,
    features: ['250 заметок', 'До 80 000 символов в заметке', 'Всё из "Про"', 'История изменений (откат версий)', 'Пароль на отдельную заметку', '15 своих групп', '40 сообщений в каждой группе'],
    perks: { search: true, pin: true, tags: true, exportTxt: true, history: true, lockNote: true }
  },
  custom: {
    key: 'custom', name: 'Кастомный', price: 0, badgeClass: 'plan-custom',




    limit: 200, charLimit: 50000, groupLimit: 10, messageLimit: 20,
    features: ['Лимиты и функции — по вашему выбору'],
    perks: { search: false, pin: false, tags: false, exportTxt: false, history: false, lockNote: false }
  }
};

function getCharLimit() { return getCurrentPlan().charLimit; }








const LIMIT_OVERRIDE_FIELDS = [
  { column: 'limit_notes',    planKey: 'limit',       label: 'Заметок',              min: 1,   max: 2000,   step: 1,   base: 10,   rate: 0.15 },
  { column: 'limit_chars',    planKey: 'charLimit',   label: 'Символов в заметке',   min: 500, max: 500000, step: 500, base: 5000, rate: 0.002 },
  { column: 'limit_groups',   planKey: 'groupLimit',  label: 'Своих групп',          min: 0,   max: 200,    step: 1,   base: 1,    rate: 2 },
  { column: 'limit_messages', planKey: 'messageLimit',label: 'Сообщ. в каждой группе', min: 0, max: 1000,   step: 1,   base: 3,    rate: 0.6 },
];



const CUSTOM_PERK_PRICES = [
  { key: 'search',    label: 'Поиск по заметкам',                price: 7 },
  { key: 'pin',       label: 'Закрепление важных заметок',       price: 5 },
  { key: 'tags',      label: 'Теги и папки для заметок',         price: 10 },
  { key: 'exportTxt', label: 'Экспорт заметки в .txt',           price: 5 },
  { key: 'history',   label: 'История изменений (откат версий)', price: 18 },
  { key: 'lockNote',  label: 'Пароль на отдельную заметку',      price: 7 },
];







function calcCustomPrice(limitValues, perkKeys, baseValues, basePerks) {
  let total = 0;
  LIMIT_OVERRIDE_FIELDS.forEach(f => {
    const val = Number(limitValues[f.column]) || 0;
    const floor = baseValues ? Number(baseValues[f.column]) || 0 : f.base;
    const billable = Math.max(0, val - floor);
    total += billable * f.rate;
  });
  CUSTOM_PERK_PRICES.forEach(p => {
    const alreadyIncluded = basePerks ? !!basePerks[p.key] : false;
    if (perkKeys[p.key] && !alreadyIncluded) total += p.price;
  });
  return Math.round(total);
}







function getEffectivePlan(profileRow) {
  const key = (profileRow && profileRow.plan) || 'free';
  const base = PLANS[key] || PLANS.free;
  const effective = { ...base, perks: { ...base.perks } };
  LIMIT_OVERRIDE_FIELDS.forEach(f => {
    const override = profileRow ? profileRow[f.column] : null;
    if (override !== null && override !== undefined && override !== '') {
      effective[f.planKey] = Number(override);
    }
  });
  let addOnPerks = null;
  if (profileRow) {
    let storedPerks = profileRow.custom_perks;
    if (typeof storedPerks === 'string') {
      try { storedPerks = JSON.parse(storedPerks); } catch (e) { storedPerks = null; }
    }
    if (storedPerks && typeof storedPerks === 'object') addOnPerks = storedPerks;
  }
  if (addOnPerks) effective.perks = { ...effective.perks, ...addOnPerks };
  const addOnPrice = profileRow ? (Number(profileRow.custom_price) || 0) : 0;
  effective.price = base.price + addOnPrice;
  effective.addOnPrice = addOnPrice;
  return effective;
}

function getCurrentPlan() {
  return getEffectivePlan(currentProfile);
}
function getNoteLimit() { return getCurrentPlan().limit; }
function getMessageLimit() { return getCurrentPlan().messageLimit; }


function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  // innerHTML не экранирует кавычки — без этого значение нельзя безопасно класть в атрибуты
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Идентификатор, который допустимо подставлять в inline-обработчик (uuid / число / слаг).
// HTML-экранирование для JS-строк внутри атрибута НЕ подходит: браузер декодирует
// сущности до выполнения JS, поэтому всё, что не похоже на id, отбрасываем.
function safeId(v) {
  const t = String(v == null ? '' : v);
  return /^[A-Za-z0-9_-]{1,64}$/.test(t) ? t : '';
}



// Ошибка «функция не найдена» — миграция на сервере ещё не применена (совместимость при раскатке)
function isMissingRpc(e) { return !!e && (e.code === 'PGRST202' || e.code === '42883'); }

function copyTextToClipboard(text, onDone) {
  const fallbackCopy = () => {
    const tmp = document.createElement('textarea');
    tmp.value = text;
    tmp.style.position = 'fixed';
    tmp.style.opacity = '0';
    document.body.appendChild(tmp);
    tmp.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(tmp);
    return ok;
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => onDone && onDone(true)).catch(() => {
      onDone && onDone(fallbackCopy());
    });
  } else {
    onDone && onDone(fallbackCopy());
  }
}



const THEME_STORAGE_KEY = 'tetrad_custom_theme_v1';
const THEME_SAVE_DEBOUNCE_MS = 600;
let themeSaveTimer = null;



const THEME_VARS = [
  { key: '--bg',         label: 'Фон',              hint: 'основной фон страницы',     def: '#12141C' },
  { key: '--panel',      label: 'Панель',            hint: 'поля, карточки',            def: '#1A1D28' },
  { key: '--panel-2',    label: 'Панель 2',          hint: 'сайдбар, модалки',          def: '#212533' },
  { key: '--panel-3',    label: 'Панель 3',          hint: 'дополнительные блоки',      def: '#282D3D' },
  { key: '--line',       label: 'Линии',             hint: 'границы, разделители',      def: '#333849' },
  { key: '--text',       label: 'Текст',             hint: 'основной текст',            def: '#EDEEF2' },
  { key: '--text-dim',   label: 'Текст (тусклый)',   hint: 'подписи, второстепенное',   def: '#8C92A6' },
  { key: '--accent',     label: 'Акцент',            hint: 'кнопки, активные элементы', def: '#FF6F5E' },
  { key: '--blue',       label: 'Синий акцент',      hint: 'редкие акценты',            def: '#6C8FAE' },
];

const THEME_PRESETS = [
  { name: 'по умолчанию', colors: null },
  {
    name: 'океан',
    colors: { '--bg': '#0E1520', '--panel': '#16202E', '--panel-2': '#1C2837', '--panel-3': '#22303F',
      '--line': '#2E3F52', '--text': '#EAF1F6', '--text-dim': '#87A0B3', '--accent': '#4FC3E0', '--blue': '#6C8FAE' }
  },
  {
    name: 'лес',
    colors: { '--bg': '#12180F', '--panel': '#1A2417', '--panel-2': '#212E1C', '--panel-3': '#293823',
      '--line': '#38492F', '--text': '#EAF0E4', '--text-dim': '#93A785', '--accent': '#8FBF5C', '--blue': '#6FA37E' }
  },
  {
    name: 'светлая',
    colors: { '--bg': '#F4F3EF', '--panel': '#FFFFFF', '--panel-2': '#ECEAE3', '--panel-3': '#E2DFD6',
      '--line': '#D8D4C8', '--text': '#20211F', '--text-dim': '#6B6A61', '--accent': '#E0563E', '--blue': '#4E6E8C' }
  },
  {
    name: 'ночная слива',
    colors: { '--bg': '#160E1A', '--panel': '#211327', '--panel-2': '#2A1830', '--panel-3': '#341F3C',
      '--line': '#452C4E', '--text': '#F1E9F4', '--text-dim': '#A78FAE', '--accent': '#D46FE0', '--blue': '#8F7FE0' }
  },
];



const WALLPAPERS = [
  {
    id: '34511',
    name: 'зелёная свинка в горах',
    thumb: '34511-thumb.webp',
    full: '34511-full.webp',
  },
  {
    id: '34512',
    name: 'альпинист чб-арт',
    thumb: '34512-thumb.webp',
    full: '34512-full.webp',
  },
  {
    id: '34513',
    name: 'жёлтая игрушка на заборе',
    thumb: '34513-thumb.webp',
    full: '34513-full.webp',
  },
  {
    id: '34514',
    name: 'силуэт с волосами на алом',
    thumb: '34514-thumb.webp',
    full: '34514-full.webp',
  },
  {
    id: '34515',
    name: 'белые крылья на чёрном',
    thumb: '34515-thumb.webp',
    full: '34515-full.webp',
  },
  {
    id: '34516',
    name: 'статуя в облаках',
    thumb: '34516-thumb.webp',
    full: '34516-full.webp',
  },
  {
    id: '90001',
    name: 'аниме-девочка и облачный питомец',
    desktopOnly: true,
    thumb: '90001-thumb.webp',
    full: '90001-full.webp',
  },
  {
    id: '90002',
    name: 'кот и парень в маске',
    desktopOnly: true,
    thumb: '90002-thumb.webp',
    full: '90002-full.webp',
  },
  {
    id: '90003',
    name: 'цветущая сакура',
    desktopOnly: true,
    thumb: '90003-thumb.webp',
    full: '90003-full.webp',
  },
  {
    id: '90004',
    name: 'зелёное поле и облака',
    desktopOnly: true,
    thumb: '90004-thumb.webp',
    full: '90004-full.webp',
  },
];






// Лимит на клиентские события за сессию страницы: циклическая JS-ошибка
// иначе засоряет event_logs тысячами одинаковых строк.
let logEventBudget = 60;
const logEventSeen = new Map();
async function logEvent(category, message, meta) {
  try {
    const msg = String(message == null ? '' : message).slice(0, 500);
    const key = category + '|' + msg;
    const seen = (logEventSeen.get(key) || 0) + 1;
    logEventSeen.set(key, seen);
    if (seen > 3 || logEventBudget <= 0) return;
    logEventBudget--;
    await db.from('event_logs').insert({
      category,
      message: msg,
      user_id: currentUser ? currentUser.id : null,
      meta: meta || null,
    });
  } catch (e) {

    console.warn('logEvent failed:', e);
  }
}
function applySpearCursorSetting(on) {
  document.body.classList.toggle('custom-cursor-spear', !!on);
}

function isSpearCursorOn() {
  return document.body.classList.contains('custom-cursor-spear');
}

function syncCursorToggles() {
  const pick = document.getElementById('cursor-toggle-spear');
  if (pick) pick.checked = isSpearCursorOn();
}

function toggleSpearCursor(on) {
  applySpearCursorSetting(on);
  syncCursorToggles();
  saveCurrentTheme();
  setupSpearSwingFeature();
}

/* ===== Site wallpaper: picked background image, shown when the window is resized
   proportionally (both dimensions), hidden when only one dimension changes so it
   never gets stretched and loses quality. ===== */

let currentWallpaperId = null;
let wallpaperLastW = null;
let wallpaperLastH = null;
let wallpaperResizeHandler = null;

function getWallpaperById(id) {
  return WALLPAPERS.find(w => w.id === id) || null;
}

function applyWallpaperSetting(id) {
  currentWallpaperId = id || null;
  const layer = document.getElementById('site-wallpaper-layer');
  let wp = getWallpaperById(currentWallpaperId);
  if (wp && wp.desktopOnly && isMobile()) wp = null;

  if (!wp) {
    document.body.classList.remove('has-wallpaper');
    if (layer) {
      layer.classList.remove('visible');
      layer.style.backgroundImage = '';
    }
    wallpaperLastW = null;
    wallpaperLastH = null;
    return;
  }

  document.body.classList.add('has-wallpaper');
  if (layer) {
    layer.style.backgroundImage = `url('${wp.full}')`;
    layer.classList.add('visible');
  }
  wallpaperLastW = window.innerWidth;
  wallpaperLastH = window.innerHeight;
}

function isWallpaperOn() {
  return !!currentWallpaperId;
}

function onWallpaperWindowResize() {
  if (!currentWallpaperId) return;
  const layer = document.getElementById('site-wallpaper-layer');
  if (!layer) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  if (wallpaperLastW == null || wallpaperLastH == null) {
    wallpaperLastW = w;
    wallpaperLastH = h;
    return;
  }

  const widthChanged = w !== wallpaperLastW;
  const heightChanged = h !== wallpaperLastH;

  if (widthChanged && heightChanged) {
    // Both dimensions moved together (e.g. proportional window resize) — keep the wallpaper, it scales via cover.
    layer.classList.add('visible');
  } else if (widthChanged || heightChanged) {
    // Only one axis changed — stretching would ruin quality, so hide it instead.
    layer.classList.remove('visible');
  }

  wallpaperLastW = w;
  wallpaperLastH = h;
}

function setupWallpaperResizeWatcher() {
  if (wallpaperResizeHandler) {
    window.removeEventListener('resize', wallpaperResizeHandler);
    wallpaperResizeHandler = null;
  }
  wallpaperResizeHandler = () => onWallpaperWindowResize();
  window.addEventListener('resize', wallpaperResizeHandler);
}

function toggleWallpaper(id) {
  const nextId = (currentWallpaperId === id) ? null : id;
  applyWallpaperSetting(nextId);
  saveCurrentTheme();
  renderThemePanel();
}

/* ===== Crit particles: shown at the click point when the custom cursor is on. ===== */

function ensureCritParticleLayer() {
  let particleLayer = document.getElementById('crit-particle-layer');
  if (!particleLayer) {
    particleLayer = document.createElement('div');
    particleLayer.id = 'crit-particle-layer';
    particleLayer.className = 'crit-particle-layer';
    document.body.appendChild(particleLayer);
  }
  return particleLayer;
}

function spawnCritParticles(x, y) {
  const particleLayer = ensureCritParticleLayer();
  const count = 7 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'crit-particle';
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 26;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 10;
    p.style.setProperty('--crit-x', dx.toFixed(1) + 'px');
    p.style.setProperty('--crit-y', dy.toFixed(1) + 'px');
    p.style.setProperty('--crit-dur', (0.45 + Math.random() * 0.25).toFixed(2) + 's');
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    particleLayer.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
    setTimeout(() => { if (p.parentNode) p.remove(); }, 1200);
  }
}

let spearMouseDownHandler = null;

function setupSpearSwingFeature() {
  if (spearMouseDownHandler) {
    document.removeEventListener('mousedown', spearMouseDownHandler);
    spearMouseDownHandler = null;
  }

  if (!isSpearCursorOn()) return;

  spearMouseDownHandler = (e) => {
    if (!isSpearCursorOn()) return;
    if (e.button !== 0) return;
    spawnCritParticles(e.clientX, e.clientY);
  };

  document.addEventListener('mousedown', spearMouseDownHandler);
}



function resetThemeToDefaults() {
  THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v.key));
  applySpearCursorSetting(false);
  applyWallpaperSetting(null);
  setupSpearSwingFeature();
}

// Приводит сохранённое оформление к безопасному виду: только известные ключи,
// корректные цвета, существующие обои. Битые данные из БД/localStorage не ломают UI.
function sanitizeTheme(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const colorRe = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([0-9.,%\s\/]+\))$/i;
  const out = {};
  THEME_VARS.forEach(v => {
    const val = raw[v.key];
    if (typeof val === 'string' && colorRe.test(val.trim())) out[v.key] = val.trim();
  });
  out.customCursorSpear = raw.customCursorSpear === true;
  out.wallpaperId = (typeof raw.wallpaperId === 'string' && getWallpaperById(raw.wallpaperId)) ? raw.wallpaperId : null;
  return out;
}

function applySavedTheme(rawTheme) {
  resetThemeToDefaults();
  const saved = sanitizeTheme(rawTheme);
  if (!saved) return false;
  const { values } = enforceThemeContrast({ ...getDefaultThemeValues(), ...saved });
  THEME_VARS.forEach(v => {
    if (values[v.key]) document.documentElement.style.setProperty(v.key, values[v.key]);
  });
  applySpearCursorSetting(saved.customCursorSpear);
  setupSpearSwingFeature();
  applyWallpaperSetting(saved.wallpaperId);
  return true;
}

function readLocalTheme() {
  try { return JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || 'null'); } catch (e) { return null; }
}

// Гостевое/локальное оформление (экран входа)
function loadTheme() {
  applySavedTheme(readLocalTheme());
}

// Оформление аккаунта. Если на аккаунте его ещё нет, а в браузере остался локальный
// вариант от старой версии, переносим его на аккаунт один раз.
function loadThemeForAccount() {
  const accountTheme = currentProfile && currentProfile.theme;
  if (sanitizeTheme(accountTheme)) {
    applySavedTheme(accountTheme);
    return;
  }
  const legacy = sanitizeTheme(readLocalTheme());
  if (legacy && currentProfile && currentProfile.theme == null) {
    applySavedTheme(legacy);
    currentProfile.theme = legacy;
    const userId = currentUser.id;
    persistTheme(userId, legacy).then(ok => {
      if (ok) { try { localStorage.removeItem(THEME_STORAGE_KEY); } catch (e) {} }
    });
    return;
  }
  applySavedTheme(null);
}

function getDefaultThemeValues() {
  const out = {};
  THEME_VARS.forEach(v => { out[v.key] = v.def; });
  return out;
}

function getCurrentThemeValues() {
  const styles = getComputedStyle(document.documentElement);
  const out = {};
  THEME_VARS.forEach(v => {
    const inline = document.documentElement.style.getPropertyValue(v.key).trim();
    out[v.key] = inline || styles.getPropertyValue(v.key).trim() || v.def;
  });
  out.customCursorSpear = isSpearCursorOn();
  out.wallpaperId = currentWallpaperId || null;
  return out;
}

function applyThemeValue(key, value) {
  document.documentElement.style.setProperty(key, value);
}

function applyThemeValues(values) {
  THEME_VARS.forEach(v => {
    if (values[v.key]) document.documentElement.style.setProperty(v.key, values[v.key]);
  });
}





let pendingThemeSave = null;   // { userId, values } — ещё не отправлено на сервер
let themeSaveChain = Promise.resolve();

function saveCurrentTheme() {
  const values = getCurrentThemeValues();

  if (!currentUser) {
    try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(values)); } catch (e) {  }
    return;
  }

  if (currentProfile) currentProfile.theme = values;

  // id аккаунта фиксируем сейчас: к моменту отправки пользователь может смениться
  pendingThemeSave = { userId: currentUser.id, values };
  if (themeSaveTimer) clearTimeout(themeSaveTimer);
  themeSaveTimer = setTimeout(() => {
    themeSaveTimer = null;
    flushPendingThemeSave();
  }, THEME_SAVE_DEBOUNCE_MS);
}

// Запросы идут строго по очереди, поэтому более старое оформление
// не может прийти на сервер позже нового.
function persistTheme(userId, values) {
  const run = async () => {
    let error = null;
    try {
      ({ error } = await db.from('profiles').update({ theme: values }).eq('id', userId));
    } catch (e) {
      error = e;
    }
    const el = document.getElementById('theme-warning');
    if (error) {
      console.warn('theme save failed:', error);
      if (el) {
        el.innerHTML = `<div class="theme-warning-box"><div>Не удалось сохранить оформление на аккаунте: ${escapeHtml(error.message || String(error))}</div></div>`;
      }
      return false;
    }
    return true;
  };
  themeSaveChain = themeSaveChain.then(run, run);
  return themeSaveChain;
}

// Отправить отложенное изменение немедленно (выход из аккаунта, закрытие вкладки)
async function flushPendingThemeSave() {
  if (themeSaveTimer) { clearTimeout(themeSaveTimer); themeSaveTimer = null; }
  const pending = pendingThemeSave;
  pendingThemeSave = null;
  if (!pending) return true;
  return persistTheme(pending.userId, pending.values);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPendingThemeSave();
});
window.addEventListener('pagehide', () => { flushPendingThemeSave(); });

async function resetTheme() {
  THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v.key));
  applySpearCursorSetting(false);
  setupSpearSwingFeature();
  applyWallpaperSetting(null);
  if (currentUser) {
    if (currentProfile) currentProfile.theme = null;
    if (themeSaveTimer) { clearTimeout(themeSaveTimer); themeSaveTimer = null; }
    pendingThemeSave = null;
    const ok = await persistTheme(currentUser.id, null);
    if (!ok) await showAlert('Оформление сброшено на этом устройстве, но не сохранено на аккаунте.', 'ошибка');
  } else {
    try { localStorage.removeItem(THEME_STORAGE_KEY); } catch (e) {  }
  }
  renderThemePanel();
}

function applyThemePreset(index) {
  const preset = THEME_PRESETS[index];
  if (!preset) return;
  if (!preset.colors) {
    THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v.key));
  } else {
    const { values } = enforceThemeContrast({ ...getDefaultThemeValues(), ...preset.colors });
    applyThemeValues(values);
  }
  saveCurrentTheme();
  renderThemePanel();
}

function openThemePanel() {
  renderThemePanel();
  document.getElementById('theme-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeThemePanel() {
  document.getElementById('theme-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function renderThemePanel() {
  const card = document.getElementById('theme-card');
  const current = getCurrentThemeValues();

  card.innerHTML = `
    <button class="modal-close" onclick="closeThemePanel()" type="button" aria-label="Закрыть">×</button>
    <div class="modal-eyebrow">персонализация</div>
    <h2 class="modal-title">Настройте <em>цвета сайта.</em></h2>
    <p class="modal-sub">Измените любой цвет интерфейса под себя — изменения применяются сразу и сохраняются на этом устройстве.</p>

    <div class="theme-presets" id="theme-presets"></div>

    <div id="theme-warning"></div>

    <div class="theme-grid" id="theme-grid"></div>

    <div class="theme-field theme-field-cursor">
      <span class="theme-field-label">Кастомный курсор<span class="theme-field-hint">ледяное и фиолетовое копья вместо системного (только на ПК)</span></span>
      <label class="theme-toggle">
        <input type="checkbox" id="cursor-toggle-spear" ${isSpearCursorOn() ? 'checked' : ''} onchange="toggleSpearCursor(this.checked)">
        <span class="theme-toggle-track"><span class="theme-toggle-thumb"></span></span>
      </label>
    </div>

    <div class="theme-field-label" style="margin-top:6px;">Обои сайта<span class="theme-field-hint">необязательно — фоновая картинка вместо однотонного фона. При изменении размера окна только по одной стороне обои скрываются, чтобы не терять качество от растяжения.</span></div>
    <div class="wallpaper-grid" id="wallpaper-grid"></div>

    <div class="theme-actions">
      <button type="button" class="theme-reset-btn" onclick="resetTheme()">Сбросить кастомное оформление</button>
    </div>
    <div class="theme-save-note">Оформление (цвета, курсор и обои) сохраняется на вашем аккаунте, подтягивается на любом устройстве и не влияет на других пользователей. Слишком похожие цвета автоматически корректируются, чтобы текст и кнопки оставались читаемыми.</div>
  `;

  const presetsEl = document.getElementById('theme-presets');
  THEME_PRESETS.forEach((preset, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-preset-swatch';
    const swatchColor = preset.colors ? preset.colors['--accent'] : THEME_VARS.find(v => v.key === '--accent').def;
    const swatchBg = preset.colors ? preset.colors['--bg'] : THEME_VARS.find(v => v.key === '--bg').def;
    btn.innerHTML = `<span class="theme-preset-dot" style="background:linear-gradient(135deg, ${swatchBg} 50%, ${swatchColor} 50%)"></span><span class="theme-preset-label">${escapeHtml(preset.name)}</span>`;
    btn.onclick = () => applyThemePreset(i);
    presetsEl.appendChild(btn);
  });

  const wallpaperGridEl = document.getElementById('wallpaper-grid');
  if (wallpaperGridEl) {
    WALLPAPERS.forEach(wp => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wallpaper-swatch' + (currentWallpaperId === wp.id ? ' active' : '');
      btn.title = wp.name;
      btn.style.backgroundImage = `url('${wp.thumb}')`;
      btn.onclick = () => toggleWallpaper(wp.id);
      wallpaperGridEl.appendChild(btn);
    });
  }

  const gridEl = document.getElementById('theme-grid');
  const inputsByKey = {};
  THEME_VARS.forEach(v => {
    const field = document.createElement('div');
    field.className = 'theme-field';
    field.innerHTML = `
      <span class="theme-field-label">${escapeHtml(v.label)}<span class="theme-field-hint">${escapeHtml(v.hint)}</span></span>
    `;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = toHexColor(current[v.key], v.def);
    input.oninput = () => {
      const values = getCurrentThemeValues();
      values[v.key] = input.value;
      const { values: fixed, warnings } = enforceThemeContrast(values);
      applyThemeValues(fixed);
      saveCurrentTheme();

      Object.keys(fixed).forEach(k => {
        if (inputsByKey[k] && inputsByKey[k].value.toLowerCase() !== fixed[k].toLowerCase()) {
          inputsByKey[k].value = fixed[k];
        }
      });
      showThemeWarning(warnings);
    };
    inputsByKey[v.key] = input;
    field.appendChild(input);
    gridEl.appendChild(field);
  });
}

function showThemeWarning(warnings) {
  const el = document.getElementById('theme-warning');
  if (!el) return;
  if (!warnings || warnings.length === 0) { el.innerHTML = ''; return; }
  const labelOf = key => (THEME_VARS.find(v => v.key === key) || {}).label || key;
  const lines = warnings.map(w => `«${escapeHtml(labelOf(w.key))}» был слишком похож на «${escapeHtml(labelOf(w.against))}» — цвет немного скорректирован для читаемости.`);
  el.innerHTML = `<div class="theme-warning-box">${lines.map(l => `<div>${l}</div>`).join('')}</div>`;
}



function toHexColor(value, fallback) {
  if (!value) return fallback;
  const v = value.trim();
  if (/^#([0-9a-f]{6})$/i.test(v)) return v;
  if (/^#([0-9a-f]{3})$/i.test(v)) {
    return '#' + v.slice(1).split('').map(c => c + c).join('');
  }
  const m = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (m) {
    const toHex = n => Number(n).toString(16).padStart(2, '0');
    return '#' + toHex(m[1]) + toHex(m[2]) + toHex(m[3]);
  }
  return fallback;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const c = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}




function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}




function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = c => {
    const p = c / 255;
    return p <= 0.03928 ? p / 12.92 : Math.pow((p + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}








function ensureContrast(hex, referenceHex, minRatio) {
  if (contrastRatio(hex, referenceHex) >= minRatio) return hex;
  const refIsLight = relativeLuminance(referenceHex) > 0.5;
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);


  const target = refIsLight ? 0 : 1;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const newL = l + (target - l) * t;
    const { r: cr, g: cg, b: cb } = hslToRgb(h, s, newL);
    const candidate = rgbToHex(cr, cg, cb);
    if (contrastRatio(candidate, referenceHex) >= minRatio) return candidate;
  }
  return refIsLight ? '#0A0A0A' : '#FFFFFF';
}










const THEME_CONTRAST_RULES = [
  { key: '--accent',   against: '--panel-3', minRatio: 2.2 },
  { key: '--accent',   against: '--bg',      minRatio: 1.8 },
  { key: '--text',     against: '--bg',      minRatio: 4.5 },
  { key: '--text',     against: '--panel',   minRatio: 4.5 },
  { key: '--text',     against: '--panel-2', minRatio: 4.5 },
  { key: '--text',     against: '--panel-3', minRatio: 4.5 },
  { key: '--text-dim', against: '--bg',      minRatio: 2.5 },
  { key: '--text-dim', against: '--panel',   minRatio: 2.5 },
  { key: '--text-dim', against: '--panel-2', minRatio: 2.5 },
  { key: '--text-dim', against: '--panel-3', minRatio: 2.5 },
];





function enforceThemeContrast(values) {
  const result = { ...values };
  const warnings = [];
  THEME_CONTRAST_RULES.forEach(rule => {
    const color = result[rule.key];
    const reference = result[rule.against];
    if (!color || !reference) return;
    const fixed = ensureContrast(color, reference, rule.minRatio);
    if (fixed.toLowerCase() !== color.toLowerCase()) {
      result[rule.key] = fixed;
      warnings.push({ key: rule.key, against: rule.against });
    }
  });
  return { values: result, warnings };
}



function closeDialog() {
  const overlay = document.getElementById('dialog-overlay');
  overlay.classList.add('hidden');
  document.getElementById('dialog-card').innerHTML = '';
}

function showAlert(message, eyebrow) {
  return new Promise(resolve => {
    const overlay = document.getElementById('dialog-overlay');
    const card = document.getElementById('dialog-card');
    card.innerHTML = `
      ${eyebrow ? `<div class="dialog-eyebrow">${escapeHtml(eyebrow)}</div>` : ''}
      <div class="dialog-message"></div>
      <div class="dialog-actions">
        <button type="button" class="dialog-btn primary" id="dialog-ok-btn">Понятно</button>
      </div>
    `;
    card.querySelector('.dialog-message').textContent = message;
    overlay.classList.remove('hidden');
    const finish = () => { closeDialog(); resolve(); };
    document.getElementById('dialog-ok-btn').onclick = finish;
    overlay.onclick = (e) => { if (e.target === overlay) finish(); };
    document.getElementById('dialog-ok-btn').focus();
  });
}

function showConfirm(message, opts) {
  opts = opts || {};
  return new Promise(resolve => {
    const overlay = document.getElementById('dialog-overlay');
    const card = document.getElementById('dialog-card');
    const confirmLabel = opts.confirmLabel || 'Да';
    const cancelLabel = opts.cancelLabel || 'Отмена';
    const danger = opts.danger;
    card.innerHTML = `
      ${opts.eyebrow ? `<div class="dialog-eyebrow">${escapeHtml(opts.eyebrow)}</div>` : ''}
      <div class="dialog-message"></div>
      <div class="dialog-actions">
        <button type="button" class="dialog-btn" id="dialog-cancel-btn">${escapeHtml(cancelLabel)}</button>
        <button type="button" class="dialog-btn ${danger ? 'danger' : 'primary'}" id="dialog-confirm-btn">${escapeHtml(confirmLabel)}</button>
      </div>
    `;
    card.querySelector('.dialog-message').textContent = message;
    overlay.classList.remove('hidden');
    const finish = (result) => { closeDialog(); resolve(result); };
    document.getElementById('dialog-confirm-btn').onclick = () => finish(true);
    document.getElementById('dialog-cancel-btn').onclick = () => finish(false);
    overlay.onclick = (e) => { if (e.target === overlay) finish(false); };
  });
}

function showUnsavedChangesPrompt(message) {
  // Returns Promise resolving to 'save' | 'discard' | 'cancel'
  return new Promise(resolve => {
    const overlay = document.getElementById('dialog-overlay');
    const card = document.getElementById('dialog-card');
    card.innerHTML = `
      <div class="dialog-eyebrow">несохранённые изменения</div>
      <div class="dialog-message"></div>
      <div class="dialog-actions dialog-actions-col">
        <button type="button" class="dialog-btn primary" id="dialog-save-btn">Сохранить</button>
        <button type="button" class="dialog-btn danger" id="dialog-discard-btn">Не сохранять</button>
        <button type="button" class="dialog-btn" id="dialog-cancel-btn">Отмена</button>
      </div>
    `;
    card.querySelector('.dialog-message').textContent = message || 'В заметке есть несохранённые изменения. Сохранить их перед выходом?';
    overlay.classList.remove('hidden');
    const finish = (result) => { closeDialog(); resolve(result); };
    document.getElementById('dialog-save-btn').onclick = () => finish('save');
    document.getElementById('dialog-discard-btn').onclick = () => finish('discard');
    document.getElementById('dialog-cancel-btn').onclick = () => finish('cancel');
    overlay.onclick = (e) => { if (e.target === overlay) finish('cancel'); };
  });
}

function showPrompt(message, defaultValue, opts) {
  opts = opts || {};
  return new Promise(resolve => {
    const overlay = document.getElementById('dialog-overlay');
    const card = document.getElementById('dialog-card');
    card.innerHTML = `
      ${opts.eyebrow ? `<div class="dialog-eyebrow">${escapeHtml(opts.eyebrow)}</div>` : ''}
      <div class="dialog-message"></div>
      <input type="${opts.password ? 'password' : 'text'}" class="dialog-input" id="dialog-prompt-input">
      <div class="dialog-actions">
        <button type="button" class="dialog-btn" id="dialog-cancel-btn">Отмена</button>
        <button type="button" class="dialog-btn primary" id="dialog-confirm-btn">${escapeHtml(opts.confirmLabel || 'Готово')}</button>
      </div>
    `;
    card.querySelector('.dialog-message').textContent = message;
    const input = document.getElementById('dialog-prompt-input');
    input.value = defaultValue || '';
    overlay.classList.remove('hidden');
    const finish = (result) => { closeDialog(); resolve(result); };
    document.getElementById('dialog-confirm-btn').onclick = () => finish(input.value);
    document.getElementById('dialog-cancel-btn').onclick = () => finish(null);
    overlay.onclick = (e) => { if (e.target === overlay) finish(null); };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') finish(input.value);
      if (e.key === 'Escape') finish(null);
    });
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}


function showHistoryPicker(historyRows) {
  return new Promise(resolve => {
    const overlay = document.getElementById('dialog-overlay');
    const card = document.getElementById('dialog-card');
    const itemsHtml = historyRows.map((h, i) => {
      const d = new Date(h.at);
      const pad = n => String(n).padStart(2, '0');
      const time = pad(d.getHours()) + ':' + pad(d.getMinutes());
      const preview = (h.content || '').slice(0, 60).replace(/\n/g, ' ');
      return `
        <button type="button" class="dialog-history-item" data-idx="${i}">
          <span class="dialog-history-time">${time}</span><span class="dialog-history-preview">${escapeHtml(preview || '(пусто)')}</span>
        </button>`;
    }).join('');
    card.innerHTML = `
      <div class="dialog-eyebrow">история версий</div>
      <div class="dialog-message">Выберите версию, чтобы восстановить её (сверху — самая новая).</div>
      <div class="dialog-history-list">${itemsHtml}</div>
      <div class="dialog-actions">
        <button type="button" class="dialog-btn" id="dialog-cancel-btn" style="width:100%;">Отмена</button>
      </div>
    `;
    overlay.classList.remove('hidden');
    const finish = (result) => { closeDialog(); resolve(result); };
    card.querySelectorAll('.dialog-history-item').forEach(btn => {
      btn.onclick = () => finish(parseInt(btn.dataset.idx, 10));
    });
    document.getElementById('dialog-cancel-btn').onclick = () => finish(null);
    overlay.onclick = (e) => { if (e.target === overlay) finish(null); };
  });
}



let currentUser = null;
let currentProfile = null;
// «Эпоха» сессии: увеличивается при каждом входе/выходе/смене аккаунта. Любой асинхронный
// запрос запоминает эпоху и, если к ответу она изменилась, ничего не пишет в интерфейс.
let authEpoch = 0;
let editorRenderedNoteId = null;   // какая заметка сейчас открыта в редакторе
const savingNotes = new Map();     // id заметки -> Promise идущего сохранения
let notes = [];
let activeNoteId = null;
let saveTimer = null;
let unlockedNoteId = null;
let noteHasUnsavedChanges = false;
let noteSavedSnapshot = null; // { title, content, tag } as last saved on server
let currentSection = 'notes';
let activeGroupName = null;
let activeGroupId = null;
let groupManageOpen = false;
const unlockedGroupIds = new Set();
// password_hash клиенту недоступен — читаем только публичные столбцы
// lock_password клиенту недоступен — только флаг locked
const NOTE_COLUMNS = 'id, user_id, title, content, tag, pinned, locked, updated_at';
const GROUP_COLUMNS = 'id, name, name_lower, owner_id, has_password';
let noteSelectMode = false;
let selectedNoteIds = new Set();



function switchTab(which) {
  const loginTab = document.getElementById('tab-login');
  const regTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const forgotForm = document.getElementById('forgot-form');
  const resetForm = document.getElementById('reset-form');
  const tabsRow = document.querySelector('.auth-tabs');
  hideError();

  loginForm.classList.add('hidden');
  regForm.classList.add('hidden');
  forgotForm.classList.add('hidden');
  resetForm.classList.add('hidden');
  loginTab.classList.remove('active');
  regTab.classList.remove('active');

  if (which === 'login') {
    tabsRow.classList.remove('hidden');
    loginTab.classList.add('active');
    loginForm.classList.remove('hidden');
  } else if (which === 'register') {
    tabsRow.classList.remove('hidden');
    regTab.classList.add('active');
    regForm.classList.remove('hidden');
  } else if (which === 'forgot') {
    tabsRow.classList.add('hidden');
    forgotForm.classList.remove('hidden');
  } else if (which === 'reset') {
    tabsRow.classList.add('hidden');
    resetForm.classList.remove('hidden');
  }
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError() {
  document.getElementById('auth-error').classList.add('hidden');
}

async function handleRegister(e) {
  e.preventDefault();
  hideError();

  const displayName = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;

  if (displayName.length < 2) { showError('Имя должно содержать не менее 2 символов.'); return; }
  if (password.length < 6) { showError('Пароль должен содержать не менее 6 символов.'); return; }
  if (password !== password2) { showError('Пароли не совпадают.'); return; }
  const consentBox = document.getElementById('reg-consent');
  if (consentBox && !consentBox.checked) { showError('Необходимо согласие на обработку персональных данных.'); return; }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  showEmailPendingModal(email);

  try {
    const { data, error } = await db.auth.signUp({
      email, password,
      options: { data: { display_name: displayName, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION } }
    });

    hideEmailPendingModal();

    if (error) {
      showError(translateAuthError(error.message));
      logEvent('auth', 'Ошибка регистрации: ' + error.message, {});
      return;
    }

    logEvent('auth', 'Регистрация', {});
    if (data.session) {
      await enterApp(data.session.user);
    } else {
      showError('Проверьте почту — нужно подтвердить email, затем войдите.');
      switchTab('login');
    }
  } catch (err) {
    hideEmailPendingModal();
    console.error('Registration failed:', err);
    showError('Не удалось зарегистрироваться: ' + (err && err.message ? err.message : 'неизвестная ошибка') + '. Попробуйте ещё раз.');
  } finally {
    submitBtn.disabled = false;
  }
}

function showEmailPendingModal(email) {
  const textEl = document.getElementById('email-pending-text');
  if (textEl) {
    textEl.textContent = email
      ? `Отправляем письмо с подтверждением на ${email} — проверьте почту (в том числе папку «Спам») и перейдите по ссылке из письма, чтобы завершить регистрацию.`
      : 'Отправляем письмо с подтверждением — проверьте почту (в том числе папку «Спам») и перейдите по ссылке из письма, чтобы завершить регистрацию.';
  }
  document.getElementById('email-pending-modal').classList.remove('hidden');
}
function hideEmailPendingModal() {
  document.getElementById('email-pending-modal').classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  hideError();

  const email = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      showError(translateAuthError(error.message));
      logEvent('auth', 'Ошибка входа: ' + error.message, {});
      return;
    }

    const entered = await enterApp(data.user);
    document.getElementById('login-form').reset();
    if (entered) logEvent('auth', 'Вход выполнен', {});
  } catch (err) {
    console.error('Login failed:', err);
    showError('Не удалось войти: ' + (err && err.message ? err.message : 'неизвестная ошибка') + '. Попробуйте ещё раз.');
  } finally {
    submitBtn.disabled = false;
  }
}

function translateAuthError(msg) {
  if (/invalid login credentials/i.test(msg)) return 'Неверный email или пароль.';
  if (/already registered/i.test(msg)) return 'Такой email уже зарегистрирован.';
  if (/password.*at least/i.test(msg)) return 'Пароль слишком короткий.';
  if (/same password/i.test(msg)) return 'Новый пароль должен отличаться от текущего.';
  if (/rate limit|too many/i.test(msg)) return 'Слишком много попыток. Подождите немного и попробуйте снова.';
  if (/email not confirmed/i.test(msg)) return 'Email не подтверждён. Перейдите по ссылке из письма.';
  if (/session.*missing|token.*(expired|invalid)|otp.*expired|link.*expired/i.test(msg)) return 'Ссылка недействительна или устарела. Запросите новую.';
  if (/failed to fetch|network/i.test(msg)) return 'Нет соединения с сервером. Проверьте интернет и повторите.';
  return msg;
}


async function handleForgotPassword(e) {
  e.preventDefault();
  hideError();

  const email = document.getElementById('forgot-email').value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });

    if (error) {
      showError(translateAuthError(error.message));
      return;
    }

    e.target.reset();
    switchTab('login');
    showError('Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля. Проверьте почту.');
  } catch (err) {
    console.error('Password reset request failed:', err);
    showError('Не удалось отправить письмо: ' + (err && err.message ? err.message : 'неизвестная ошибка') + '. Попробуйте ещё раз.');
  } finally {
    submitBtn.disabled = false;
  }
}


function setupPasswordRecoveryListener() {
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      // сессия восстановления не должна наследовать данные ранее открытого аккаунта
      clearSessionState();
      document.getElementById('auth-screen').classList.remove('hidden');
      document.getElementById('app').classList.add('hidden');
      switchTab('reset');
      return;
    }
    if (!currentUser) return;
    if (event === 'SIGNED_OUT') {
      // выход в другой вкладке или истечение/отзыв сессии
      clearSessionState();
      document.getElementById('app').classList.add('hidden');
      document.getElementById('auth-screen').classList.remove('hidden');
      switchTab('login');
      loadTheme();
      showError('Сессия завершена. Войдите снова.');
      return;
    }
    // в другой вкладке вошли под другим аккаунтом (сессия общая на весь браузер):
    // самый надёжный способ не смешать данные — перезагрузить страницу
    if (session && session.user && session.user.id !== currentUser.id &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
      setTimeout(() => window.location.reload(), 0);
    }
  });
}

function passwordRecoveryLinkPresent() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return /type=recovery/.test(hash) || /type=recovery/.test(search);
}

async function handleResetPassword(e) {
  e.preventDefault();
  hideError();

  const password = document.getElementById('reset-password').value;
  const password2 = document.getElementById('reset-password2').value;

  if (password.length < 6) { showError('Пароль должен содержать не менее 6 символов.'); return; }
  if (password !== password2) { showError('Пароли не совпадают.'); return; }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const { data, error } = await db.auth.updateUser({ password });

    if (error) {
      showError(translateAuthError(error.message));
      return;
    }



    history.replaceState(null, '', window.location.pathname);

    e.target.reset();
    if (data.user) {
      await enterApp(data.user);
    } else {
      switchTab('login');
      showError('Пароль обновлён. Войдите с новым паролем.');
    }
  } catch (err) {
    console.error('Password update failed:', err);
    showError('Не удалось сохранить пароль: ' + (err && err.message ? err.message : 'неизвестная ошибка') + '. Попробуйте ещё раз.');
  } finally {
    submitBtn.disabled = false;
  }
}


function openChangePasswordDialog() {
  return new Promise(resolve => {
    const overlay = document.getElementById('dialog-overlay');
    const card = document.getElementById('dialog-card');
    card.innerHTML = `
      <div class="dialog-eyebrow">смена пароля</div>
      <div class="dialog-message">Придумайте новый пароль для входа в аккаунт.</div>
      <input type="password" class="dialog-input" id="change-pw-1" placeholder="новый пароль" autocomplete="new-password">
      <input type="password" class="dialog-input" id="change-pw-2" placeholder="повторите пароль" autocomplete="new-password" style="margin-top:10px;">
      <div id="change-pw-error"></div>
      <div class="dialog-actions">
        <button type="button" class="dialog-btn" id="change-pw-cancel">Отмена</button>
        <button type="button" class="dialog-btn primary" id="change-pw-confirm">Сохранить</button>
      </div>
    `;
    overlay.classList.remove('hidden');
    const input1 = document.getElementById('change-pw-1');
    const input2 = document.getElementById('change-pw-2');
    const errorEl = document.getElementById('change-pw-error');
    const confirmBtn = document.getElementById('change-pw-confirm');

    const showLocalError = (msg) => {
      errorEl.innerHTML = `<div class="auth-error" style="margin:10px 0 0;">${escapeHtml(msg)}</div>`;
    };

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      overlay.classList.add('hidden');
      card.innerHTML = '';
      overlay.onclick = null;
      resolve(result);
    };

    const submit = async () => {
      const pw1 = input1.value;
      const pw2 = input2.value;
      errorEl.innerHTML = '';

      if (pw1.length < 6) { showLocalError('Пароль должен содержать не менее 6 символов.'); return; }
      if (pw1 !== pw2) { showLocalError('Пароли не совпадают.'); return; }

      confirmBtn.disabled = true;
      try {
        const { error } = await db.auth.updateUser({ password: pw1 });
        if (error) {
          showLocalError(translateAuthError(error.message));
          confirmBtn.disabled = false;
          return;
        }



        card.innerHTML = `
          <div class="dialog-eyebrow">готово</div>
          <div class="dialog-message">Пароль успешно изменён.</div>
          <div class="dialog-actions">
            <button type="button" class="dialog-btn primary" id="change-pw-ok">Понятно</button>
          </div>
        `;
        const okBtn = document.getElementById('change-pw-ok');
        okBtn.onclick = () => finish(true);
        overlay.onclick = (e) => { if (e.target === overlay) finish(true); };
        okBtn.focus();
      } catch (err) {
        showLocalError('Не удалось сохранить пароль: ' + (err && err.message ? err.message : 'неизвестная ошибка'));
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.onclick = submit;
    document.getElementById('change-pw-cancel').onclick = () => finish(false);
    overlay.onclick = (e) => { if (e.target === overlay) finish(false); };
    [input1, input2].forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') finish(false);
      });
    });
    setTimeout(() => input1.focus(), 30);
  });
}

// Полный сброс данных аккаунта в памяти. Увеличивает authEpoch, поэтому все запросы,
// начатые до этого момента, не смогут изменить интерфейс.
function clearSessionState() {
  authEpoch++;
  currentUser = null;
  currentProfile = null;
  notes = [];
  activeNoteId = null;
  unlockedNoteId = null;
  noteHasUnsavedChanges = false;
  noteSavedSnapshot = null;
  editorRenderedNoteId = null;
  noteSelectMode = false;
  selectedNoteIds.clear();
  savingNotes.clear();
  activeGroupName = null;
  activeGroupId = null;
  groupManageOpen = false;
  unlockedGroupIds.clear();
  currentSection = 'notes';
  adminLookupResult = null;
  if (themeSaveTimer) { clearTimeout(themeSaveTimer); themeSaveTimer = null; }
  pendingThemeSave = null;
  const editorArea = document.getElementById('editor-area');
  if (editorArea) editorArea.innerHTML = '';
  const noteList = document.getElementById('note-list');
  if (noteList) noteList.innerHTML = '';
  const groupsPanel = document.getElementById('groups-panel');
  if (groupsPanel) groupsPanel.innerHTML = '';
  ['pricing-modal', 'admin-modal', 'theme-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  document.body.style.overflow = '';
}

async function handleLogout() {
  const ok = await confirmDiscardIfDirty();
  if (!ok) return;

  await flushPendingThemeSave();
  try { await db.auth.signOut(); } catch (e) { console.warn('signOut failed:', e); }
  clearSessionState();
  showMobileList();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  switchTab('login');


  loadTheme();   // внутри — полный сброс оформления прошлого аккаунта
}

window.addEventListener('beforeunload', (e) => {
  if (currentNoteIsDirty()) {
    e.preventDefault();
    e.returnValue = '';
  }
});



function renderUserId() {
  const el = document.getElementById('current-user-id');
  if (!el) return;
  if (currentUser && currentUser.id) {
    el.textContent = 'id: ' + currentUser.id;
    el.classList.remove('hidden');
  } else {
    el.textContent = '';
  }
}

function copyUserId() {
  if (!currentUser || !currentUser.id) return;
  const el = document.getElementById('current-user-id');
  const restore = () => { if (el) renderUserId(); };

  const fallbackCopy = () => {
    const tmp = document.createElement('textarea');
    tmp.value = currentUser.id;
    tmp.style.position = 'fixed';
    tmp.style.opacity = '0';
    document.body.appendChild(tmp);
    tmp.select();
    try { document.execCommand('copy'); } catch (err) {  }
    document.body.removeChild(tmp);
  };

  const showCopied = () => {
    if (!el) return;
    el.textContent = 'id скопирован ✓';
    setTimeout(restore, 1200);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentUser.id).then(showCopied).catch(() => {
      fallbackCopy();
      showCopied();
    });
  } else {
    fallbackCopy();
    showCopied();
  }
}



// Возвращает true, если пользователь вошёл, false — если вход не состоялся или устарел.
async function enterApp(user) {
  // Если параллельно запущен другой вход/выход, эпоха изменится, и этот вызов молча завершится.
  const epoch = ++authEpoch;
  currentUser = user;
  const stale = () => epoch !== authEpoch || !currentUser || currentUser.id !== user.id;

  const fetchProfile = () => db.from('profiles').select('*').eq('id', user.id).single();
  let { data: profile, error } = await fetchProfile();
  if (stale()) return false;

  if (error || !profile) {
    // Профиль создаётся триггером после регистрации и может появиться с задержкой.
    let retryProfile = null;
    let lastError = error;
    for (let i = 0; i < 5 && !retryProfile; i++) {
      await new Promise(r => setTimeout(r, 500));
      const retry = await fetchProfile();
      if (stale()) return false;
      if (retry.data) retryProfile = retry.data; else lastError = retry.error;
    }
    if (retryProfile) {
      profile = retryProfile;
    } else if (lastError && lastError.code !== 'PGRST116') {
      // Сетевая/серверная ошибка: не пускаем с «заглушкой» — иначе заблокированный
      // аккаунт (banned) прошёл бы проверку только потому, что профиль не загрузился.
      currentUser = null;
      try { await db.auth.signOut(); } catch (e) {}
      showError('Не удалось загрузить профиль: ' + translateAuthError(lastError.message || 'ошибка сети') + ' Попробуйте ещё раз.');
      return false;
    } else {
      profile = { id: user.id, display_name: user.email, plan: 'free' };
    }
  }
  currentProfile = profile;

  if (currentProfile.banned) {
    if (themeSaveTimer) { clearTimeout(themeSaveTimer); themeSaveTimer = null; }
    pendingThemeSave = null;
    try { await db.auth.signOut(); } catch (e) {}
    clearSessionState();
    loadTheme();
    showError('Этот аккаунт заблокирован администратором.');
    return false;
  }

  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('current-username').textContent = currentProfile.display_name;
  renderUserId();
  document.getElementById('admin-row').classList.toggle('hidden', !currentProfile.is_admin);
  loadThemeForAccount();

  // чистое состояние интерфейса для нового аккаунта
  notes = [];
  activeNoteId = null;
  unlockedNoteId = null;
  noteHasUnsavedChanges = false;
  noteSavedSnapshot = null;
  editorRenderedNoteId = null;
  selectedNoteIds.clear();
  noteSelectMode = false;
  activeGroupName = null;
  activeGroupId = null;
  groupManageOpen = false;
  currentSection = 'notes';
  showMobileList();
  document.getElementById('tab-section-notes').classList.add('active');
  document.getElementById('tab-section-groups').classList.remove('active');
  document.getElementById('notes-section').classList.remove('hidden');
  document.getElementById('groups-panel').classList.add('hidden');

  await loadNotes();
  if (stale()) return false;
  renderSidebar();
  renderEditor();
  return true;
}

async function loadNotes() {
  if (!currentUser) return false;
  const epoch = authEpoch;
  const uid = currentUser.id;
  const { data, error } = await db
    .from('notes')
    .select(NOTE_COLUMNS)
    .eq('user_id', uid)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  // за время запроса аккаунт сменился — этот ответ уже чужой
  if (epoch !== authEpoch || !currentUser || currentUser.id !== uid) return false;

  if (error) {
    // не подменяем список пустым — иначе кажется, что заметки пропали
    await showAlert('Не удалось загрузить заметки: ' + error.message, 'ошибка');
    return false;
  }

  // Объекты заметок сохраняем (редактор привязан к ним), а несохранённые правки
  // открытой заметки не затираем серверной версией.
  const dirtyId = currentNoteIsDirty() ? activeNoteId : null;
  const prevById = new Map(notes.map(n => [n.id, n]));
  notes = data.map(row => {
    const prev = prevById.get(row.id);
    if (!prev) return row;
    if (row.id === dirtyId) {
      const { title, content, tag } = prev;
      Object.assign(prev, row, { title, content, tag });
    } else {
      Object.assign(prev, row);
    }
    return prev;
  });
  if (!notes.some(n => n.id === activeNoteId)) {
    activeNoteId = notes.length > 0 ? notes[0].id : null;
  }
  return true;
}



function isMobile() { return window.innerWidth <= 760; }




function showMobileEditor() {
  if (!isMobile()) return;
  document.getElementById('sidebar').classList.add('mobile-hidden');
  document.getElementById('editor-area').classList.add('mobile-visible');
}
function showMobileList() {
  if (!isMobile()) return;
  document.getElementById('sidebar').classList.remove('mobile-hidden');
  document.getElementById('editor-area').classList.remove('mobile-visible');
}
function collapseMobileSidebar() {
  showMobileEditor();
  document.getElementById('app').classList.remove('editor-collapsed');
}




async function goBackFromNote() {
  const ok = await confirmDiscardIfDirty();
  if (!ok) return;
  if (isMobile()) {
    showMobileList();
    return;
  }
  document.getElementById('app').classList.add('editor-collapsed');
}



function renderSidebar() {
  const plan = getCurrentPlan();
  const limit = plan.limit;

  const badge = document.getElementById('plan-badge');
  badge.textContent = plan.name.toLowerCase();
  badge.className = 'plan-badge ' + plan.badgeClass;

  const searchBox = document.getElementById('sidebar-search');
  searchBox.classList.toggle('hidden', !plan.perks.search);
  if (!plan.perks.search) document.getElementById('search-input').value = '';

  const query = plan.perks.search ? document.getElementById('search-input').value.trim().toLowerCase() : '';






  notes.forEach((n, i) => { n.__noteIdx = i; });

  let ordered = notes.slice();
  if (!plan.perks.pin) {

    ordered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  let visible = ordered;
  if (query) {
    visible = ordered.filter(n =>
      (n.title || '').toLowerCase().includes(query) ||
      (n.content || '').toLowerCase().includes(query) ||
      (n.tag || '').toLowerCase().includes(query)
    );
  }

  const listEl = document.getElementById('note-list');
  listEl.innerHTML = '';

  if (notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'note-item-empty-state';
    empty.textContent = 'Заметок пока нет';
    listEl.appendChild(empty);
  } else if (visible.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'note-item-empty-state';
    empty.textContent = 'Ничего не найдено';
    listEl.appendChild(empty);
  }

  visible.forEach((note, visibleIdx) => {
    const idx = note.__noteIdx;
    const isChecked = selectedNoteIds.has(note.id);
    const item = document.createElement('div');
    item.className = 'note-item'
      + (note.id === activeNoteId ? ' active' : '')
      + (noteSelectMode ? ' select-mode' : '')
      + (isChecked ? ' checked' : '');
    item.style.animationDelay = Math.min(visibleIdx * 25, 300) + 'ms';
    item.onclick = () => {
      if (noteSelectMode) toggleNoteSelected(note.id);
      else selectNote(note.id);
    };

    const check = document.createElement('span');
    check.className = 'note-check';

    const num = document.createElement('span');
    num.className = 'note-num';
    num.textContent = String(idx + 1).padStart(2, '0');

    const title = document.createElement('span');
    const hasTitle = note.title && note.title.trim().length > 0;
    title.className = 'note-item-title' + (hasTitle ? '' : ' note-item-empty');
    title.textContent = hasTitle ? note.title : 'без названия';
    title.title = 'Двойной клик — переименовать';
    title.ondblclick = (e) => { e.stopPropagation(); renameNotePrompt(note.id); };

    item.appendChild(check);
    item.appendChild(num);

    if (plan.perks.pin) {
      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = 'note-pin-btn' + (note.pinned ? ' pinned' : '');
      pinBtn.textContent = note.pinned ? '★' : '☆';
      pinBtn.title = note.pinned ? 'Открепить' : 'Закрепить';
      pinBtn.onclick = async (e) => {
        e.stopPropagation();
        const prevPinned = note.pinned;
        note.pinned = !prevPinned;
        const { error: pinError } = await db.from('notes').update({ pinned: note.pinned }).eq('id', note.id).eq('user_id', currentUser.id);
        if (pinError) {
          note.pinned = prevPinned;
          await showAlert('Не удалось изменить закрепление: ' + pinError.message, 'ошибка');
          return;
        }
        await loadNotes();
        renderSidebar();
      };
      item.appendChild(pinBtn);
    }

    item.appendChild(title);

    if (plan.perks.tags && note.tag) {
      const tagEl = document.createElement('span');
      tagEl.className = 'note-tag';
      tagEl.textContent = note.tag;
      item.appendChild(tagEl);
    }

    if (plan.perks.lockNote && note.locked) {
      const lockEl = document.createElement('span');
      lockEl.style.fontSize = '12px';
      lockEl.style.color = 'var(--text-dim)';
      lockEl.style.flexShrink = '0';
      lockEl.textContent = '🔒';
      item.appendChild(lockEl);
    }

    listEl.appendChild(item);
  });

  const toolbar = document.getElementById('list-toolbar');
  if (toolbar) toolbar.classList.toggle('hidden', notes.length === 0);
  updateSelectBar();

  const count = notes.length;
  document.getElementById('quota-text').textContent = count + ' / ' + limit + ' заметок';
  const fill = document.getElementById('quota-fill');
  const pct = Math.min(100, (count / limit) * 100);
  fill.style.width = pct + '%';
  fill.classList.toggle('full', count >= limit);

  const limitReached = count >= limit;
  const newBtn = document.getElementById('new-note-btn');
  newBtn.disabled = false;
  if (limitReached) {
    newBtn.textContent = 'лимит исчерпан — улучшить план →';
    newBtn.onclick = openPricing;
  } else {
    newBtn.textContent = '+ новая заметка';
    newBtn.onclick = createNote;
  }

  const hintRow = document.getElementById('locked-hint');
  const hintText = document.getElementById('locked-hint-text');
  const missingPerks = CUSTOM_PERK_PRICES.filter(p => !plan.perks[p.key]);
  if (missingPerks.length) {
    hintRow.classList.remove('hidden');
    hintText.textContent = missingPerks.map(p => p.label.toLowerCase()).slice(0, 2).join(', ') + ' — донастройте тариф';
  } else {
    hintRow.classList.add('hidden');
  }
}

async function renameNotePrompt(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  const next = await showPrompt('Название заметки:', note.title || '', { eyebrow: 'переименовать' });
  if (next === null || !currentUser || !notes.includes(note)) return;
  const prevTitle = note.title;
  note.title = next.trim();
  const { error: renameError } = await db.from('notes').update({ title: note.title, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', currentUser.id);
  if (renameError) {
    note.title = prevTitle;
    await showAlert('Не удалось переименовать заметку: ' + renameError.message, 'ошибка');
    return;
  }
  if (id === activeNoteId && noteSavedSnapshot) noteSavedSnapshot.title = note.title || '';
  await loadNotes();
  renderSidebar();
  if (id === activeNoteId) renderEditor();
}



function renderEditor() {
  const area = document.getElementById('editor-area');
  area.innerHTML = '';

  const note = notes.find(n => n.id === activeNoteId);
  const plan = getCurrentPlan();

  if (!note) {
    area.innerHTML = `<div class="editor-empty"></div>`;
    editorRenderedNoteId = null;
    noteHasUnsavedChanges = false;
    noteSavedSnapshot = null;
    return;
  }

  if (plan.perks.lockNote && note.locked && note.id !== unlockedNoteId) {
    editorRenderedNoteId = null;
    noteHasUnsavedChanges = false;
    noteSavedSnapshot = null;
    area.innerHTML = `
      <div class="editor-empty">
        <div class="editor-empty-title">🔒 Заметка защищена паролем</div>
        <div>Введите пароль, чтобы открыть «${escapeHtml(note.title || 'без названия')}».</div>
        <input type="password" id="unlock-input" class="unlock-input">
        <button type="button" onclick="tryUnlockNote('${safeId(note.id)}')">Открыть</button>
      </div>`;
    const unlockInput = document.getElementById('unlock-input');
    unlockInput.focus();
    unlockInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlockNote(note.id); });
    return;
  }

  const topbar = document.createElement('div');
  topbar.className = 'editor-topbar';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'mobile-back-btn';
  backBtn.textContent = '← назад';
  backBtn.onclick = goBackFromNote;
  topbar.appendChild(backBtn);

  const titleInput = document.createElement('input');
  titleInput.className = 'editor-title-input';
  titleInput.placeholder = 'Название заметки';
  titleInput.value = note.title || '';
  titleInput.oninput = () => {
    note.title = titleInput.value;
    markUnsaved();
    renderSidebarTitleOnly();
  };

  const actions = document.createElement('div');
  actions.className = 'editor-actions';

  if (plan.perks.tags) {
    const tagInput = document.createElement('input');
    tagInput.value = note.tag || '';
    tagInput.placeholder = 'тег';
    tagInput.style.cssText = 'width:90px;background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius-sm);color:var(--text-dim);font-family:"Ubuntu",sans-serif;font-size:12px;padding:8px 10px;outline:none;min-height:38px;';
    tagInput.oninput = () => { note.tag = tagInput.value.trim(); markUnsaved(); };
    tagInput.onblur = () => renderSidebar();
    actions.appendChild(tagInput);
  }

  if (plan.perks.exportTxt) {
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'icon-btn neutral';
    exportBtn.textContent = 'экспорт .txt';
    exportBtn.onclick = () => exportNote(note);
    actions.appendChild(exportBtn);
  }

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'icon-btn neutral';
  copyBtn.textContent = 'скопировать';
  copyBtn.onclick = () => {
    copyTextToClipboard(textarea.value, (ok) => {
      copyBtn.textContent = ok ? 'скопировано ✓' : 'не удалось скопировать';
      setTimeout(() => { copyBtn.textContent = 'скопировать'; }, ok ? 1200 : 2000);
    });
  };
  actions.appendChild(copyBtn);

  if (plan.perks.history) {
    const histBtn = document.createElement('button');
    histBtn.type = 'button';
    histBtn.className = 'icon-btn neutral';
    histBtn.textContent = 'история';
    histBtn.onclick = () => showHistory(note);
    actions.appendChild(histBtn);
  }

  if (plan.perks.lockNote) {
    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = 'icon-btn neutral';
    lockBtn.textContent = note.locked ? 'снять пароль' : 'поставить пароль';
    lockBtn.onclick = () => toggleLock(note);
    actions.appendChild(lockBtn);
  }

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'icon-btn save-btn';
  saveBtn.id = 'save-note-btn';
  saveBtn.textContent = 'сохранить';
  saveBtn.onclick = () => saveNote(note);
  actions.appendChild(saveBtn);

  const status = document.createElement('span');
  status.className = 'save-status';
  status.id = 'save-status';
  status.textContent = formatUpdated(note.updated_at);

  const charCounter = document.createElement('span');
  charCounter.className = 'word-counter';
  charCounter.id = 'word-counter';

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'icon-btn';
  delBtn.textContent = 'удалить';
  delBtn.onclick = () => deleteNote(note.id);

  actions.appendChild(charCounter);
  actions.appendChild(status);
  actions.appendChild(delBtn);
  topbar.appendChild(titleInput);
  topbar.appendChild(actions);

  const textarea = document.createElement('textarea');
  textarea.id = 'note-textarea';
  textarea.spellcheck = false;
  textarea.value = note.content || '';
  textarea.placeholder = 'Пишите или вставляйте сюда что угодно — текст или код.\nТабуляция, пробелы и переносы строк сохранятся ровно так, как есть.';

  const charLimit = getCharLimit();

  function updateCharCounter() {
    const count = textarea.value.length;
    charCounter.textContent = count.toLocaleString('ru-RU') + ' / ' + charLimit.toLocaleString('ru-RU') + ' симв.';
    charCounter.classList.toggle('limit-reached', count >= charLimit);
  }
  updateCharCounter();

  function markUnsaved() {
    noteHasUnsavedChanges = true;
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
      statusEl.textContent = 'не сохранено';
      statusEl.classList.add('unsaved');
      statusEl.classList.remove('saved');
    }
    const btn = document.getElementById('save-note-btn');
    if (btn) btn.classList.add('has-changes');
  }

  // baseline snapshot for "unsaved changes" comparison.
  // Повторная отрисовка той же заметки (после переименования другой, закрепления и т.п.)
  // не должна сбрасывать признак несохранённых правок.
  const keepDirty = !!(noteHasUnsavedChanges && noteSavedSnapshot && editorRenderedNoteId === note.id);
  if (!keepDirty) {
    noteSavedSnapshot = { title: note.title || '', content: note.content || '', tag: note.tag || '' };
    noteHasUnsavedChanges = false;
  }
  editorRenderedNoteId = note.id;

  // Вставка в середину текста раньше обходила лимит (обрезалось только при курсоре в конце)
  textarea.maxLength = charLimit;
  textarea.oninput = () => {
    if (textarea.value.length > charLimit) {
      const caret = Math.min(textarea.selectionStart, charLimit);
      textarea.value = textarea.value.slice(0, charLimit);
      textarea.selectionStart = textarea.selectionEnd = caret;
    }
    note.content = textarea.value;
    updateCharCounter();
    markUnsaved();
  };
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (textarea.value.length - (end - start) + 1 > charLimit) return;
      textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      note.content = textarea.value;
      updateCharCounter();
      markUnsaved();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveNote(note);
    }
  });

  area.appendChild(topbar);
  area.appendChild(textarea);
  if (keepDirty) markUnsaved();
  if (window.innerWidth > 760) textarea.focus();
}

async function tryUnlockNote(id) {
  const note = notes.find(n => n.id === id);
  const input = document.getElementById('unlock-input');
  if (!note || !input) return;
  // пароль заметки проверяется на сервере, клиент хеш не получает
  const { data: ok, error } = await db.rpc('verify_note_lock', { p_note_id: String(id), p_password: input.value });
  if (error) {
    await showAlert('Не удалось проверить пароль: ' + error.message, 'ошибка');
    return;
  }
  if (ok === true) {
    unlockedNoteId = id;
    renderEditor();
  } else {
    input.style.borderColor = 'var(--error)';
    input.value = '';
    input.placeholder = 'неверный пароль';
  }
}

async function toggleLock(note) {
  let newPassword = null;
  if (!note.locked) {
    const pass = await showPrompt('Придумайте пароль для этой заметки:', '', { eyebrow: 'защита паролем', password: true, confirmLabel: 'Поставить' });
    if (!pass) return;
    newPassword = pass;
  }
  // хеширование (bcrypt) и запись — на сервере; null снимает защиту
  const { data: res, error } = await db.rpc('set_note_lock', { p_note_id: String(note.id), p_password: newPassword });
  if (error || !res || res.status !== 'ok') {
    const reason = error ? error.message : (res && res.status === 'weak' ? 'пароль слишком короткий (минимум 4 символа)' : 'нет прав на это действие');
    await showAlert('Не удалось изменить защиту заметки: ' + reason, 'ошибка');
    return;
  }
  note.locked = newPassword !== null;
  renderSidebar();
  renderEditor();
}

async function exportNote(note) {
  const safeTitle = (note.title && note.title.trim() ? note.title.trim() : 'без названия')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 100);
  const filename = safeTitle + '.txt';
  const ok = await showConfirm(`Файл «${filename}» будет сохранён на устройство.`, { eyebrow: 'экспорт заметки', confirmLabel: 'Скачать' });
  if (!ok) return;

  const blob = new Blob([note.content || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function showHistory(note) {
  const { data: history, error } = await db
    .from('note_history')
    .select('*')
    .eq('note_id', note.id)
    .order('at', { ascending: false })
    .limit(10);

  if (error) {
    await showAlert('Не удалось загрузить историю версий: ' + error.message, 'ошибка');
    return;
  }
  if (!history || history.length === 0) {
    await showAlert('История версий пока пуста — она начнёт заполняться по мере редактирования.', 'история версий');
    return;
  }

  const idx = await showHistoryPicker(history);
  if (idx === null) return;
  if (idx >= 0 && idx < history.length) {
    // восстановление заменяет содержимое — сначала решаем судьбу несохранённых правок
    if (!(await confirmDiscardIfDirty())) return;
    const epoch = authEpoch;
    const restored = history[idx].content;
    const { data: upd, error: restoreError } = await db.from('notes')
      .update({ content: restored, updated_at: new Date().toISOString() })
      .eq('id', note.id).eq('user_id', currentUser.id)
      .select('updated_at');
    if (epoch !== authEpoch) return;
    if (restoreError || !upd || upd.length === 0) {
      await showAlert('Не удалось восстановить версию: ' + (restoreError ? restoreError.message : 'заметка не найдена'), 'ошибка');
      return;
    }
    note.content = restored;
    note.updated_at = upd[0].updated_at;
    noteHasUnsavedChanges = false;
    noteSavedSnapshot = { title: note.title || '', content: restored, tag: note.tag || '' };
    await loadNotes();
    if (epoch !== authEpoch) return;
    activeNoteId = note.id;
    renderSidebar();
    renderEditor();
  }
}

function renderSidebarTitleOnly() {
  const listEl = document.getElementById('note-list');
  const items = listEl.querySelectorAll('.note-item-title');
  notes.forEach((note, idx) => {
    const el = items[idx];
    if (!el) return;
    const hasTitle = note.title && note.title.trim().length > 0;
    el.textContent = hasTitle ? note.title : 'без названия';
    el.classList.toggle('note-item-empty', !hasTitle);
  });
}

function formatUpdated(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return 'сохранено ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}



let creatingNote = false;
async function createNote() {
  if (creatingNote) return;              // защита от двойного клика
  if (notes.length >= getNoteLimit()) return;
  creatingNote = true;
  try {
    const ok = await confirmDiscardIfDirty();
    if (!ok) return;
    const epoch = authEpoch;

    const { data, error } = await db
      .from('notes')
      .insert({ user_id: currentUser.id, title: '', content: '', tag: '' })
      .select(NOTE_COLUMNS)
      .single();

    if (epoch !== authEpoch) return;
    if (error) { await showAlert('Не удалось создать заметку: ' + error.message, 'ошибка'); return; }

    logEvent('user_action', 'Создана заметка', { note_id: data.id });
    await loadNotes();
    if (epoch !== authEpoch) return;
    activeNoteId = data.id;
    unlockedNoteId = null;
    renderSidebar();
    renderEditor();
    collapseMobileSidebar();
  } finally {
    creatingNote = false;
  }
}

async function selectNote(id) {
  if (id === activeNoteId) { collapseMobileSidebar(); return; }
  const ok = await confirmDiscardIfDirty();
  if (!ok) return;
  activeNoteId = id;
  unlockedNoteId = null;
  renderSidebar();
  renderEditor();
  collapseMobileSidebar();
}

// Удаление заметок вместе с историей одной транзакцией на сервере (RPC delete_my_notes).
// Если миграция ещё не применена — прямое удаление, как раньше.
async function deleteNotesByIds(ids) {
  const { error } = await db.rpc('delete_my_notes', { p_ids: ids.map(String) });
  if (!error) return { error: null };
  if (error.code === 'PGRST202' || error.code === '42883') {
    return await db.from('notes').delete().in('id', ids).eq('user_id', currentUser.id);
  }
  return { error };
}

async function deleteNote(id) {
  const ok = await showConfirm('Удалить эту заметку без возможности восстановления?', { eyebrow: 'удаление заметки', confirmLabel: 'Удалить', danger: true });
  if (!ok) return;

  const epoch = authEpoch;
  const { error } = await deleteNotesByIds([id]);
  if (epoch !== authEpoch) return;

  if (error) {
    await showAlert('Не удалось удалить заметку: ' + error.message, 'ошибка');
    return;
  }

  logEvent('user_action', 'Удалена заметка', { note_id: id });

  if (activeNoteId === id) {
    noteHasUnsavedChanges = false;
    noteSavedSnapshot = null;
  }

  notes = notes.filter(n => n.id !== id);
  if (activeNoteId === id) {
    activeNoteId = notes.length > 0 ? notes[0].id : null;
  }
  renderSidebar();
  renderEditor();

  await loadNotes();
  renderSidebar();
  renderEditor();
  showMobileList();
}

function toggleSelectMode() {
  noteSelectMode = !noteSelectMode;
  if (!noteSelectMode) selectedNoteIds.clear();
  renderSidebar();
}

function toggleNoteSelected(id) {
  if (selectedNoteIds.has(id)) selectedNoteIds.delete(id);
  else selectedNoteIds.add(id);
  renderSidebar();
}

function selectAllNotesVisible() {
  const query = document.getElementById('search-input') ? document.getElementById('search-input').value.trim().toLowerCase() : '';
  const target = query
    ? notes.filter(n =>
        (n.title || '').toLowerCase().includes(query) ||
        (n.content || '').toLowerCase().includes(query) ||
        (n.tag || '').toLowerCase().includes(query))
    : notes;
  const allSelected = target.length > 0 && target.every(n => selectedNoteIds.has(n.id));
  if (allSelected) {
    target.forEach(n => selectedNoteIds.delete(n.id));
  } else {
    target.forEach(n => selectedNoteIds.add(n.id));
  }
  renderSidebar();
}

function updateSelectBar() {
  const bar = document.getElementById('select-bar');
  const toggleBtn = document.getElementById('select-mode-toggle');
  if (!bar) return;
  bar.classList.toggle('active', noteSelectMode);
  if (toggleBtn) toggleBtn.classList.toggle('hidden', noteSelectMode);
  const countEl = document.getElementById('select-bar-count');
  if (countEl) {
    const n = selectedNoteIds.size;
    countEl.textContent = n + (n === 1 ? ' выбрана' : ' выбрано');
  }
}

async function deleteSelectedNotes() {
  const ids = Array.from(selectedNoteIds);
  if (ids.length === 0) return;

  const ok = await showConfirm(
    ids.length === 1
      ? 'Удалить выбранную заметку без возможности восстановления?'
      : `Удалить выбранные заметки (${ids.length}) без возможности восстановления?`,
    { eyebrow: 'удаление заметок', confirmLabel: 'Удалить', danger: true }
  );
  if (!ok) return;

  const epoch = authEpoch;
  const { error } = await deleteNotesByIds(ids);
  if (epoch !== authEpoch) return;

  if (error) {
    await showAlert('Не удалось удалить заметки: ' + error.message, 'ошибка');
    return;
  }

  if (selectedNoteIds.has(activeNoteId)) {
    noteHasUnsavedChanges = false;
    noteSavedSnapshot = null;
  }
  notes = notes.filter(n => !selectedNoteIds.has(n.id));
  if (!notes.some(n => n.id === activeNoteId)) {
    activeNoteId = notes.length > 0 ? notes[0].id : null;
  }
  selectedNoteIds.clear();
  noteSelectMode = false;
  renderSidebar();
  renderEditor();

  await loadNotes();
  renderSidebar();
  renderEditor();
  showMobileList();
}

// Параллельные сохранения одной заметки склеиваются в одно (нажали «сохранить» и Ctrl+S подряд).
function saveNote(note) {
  if (!note) note = notes.find(n => n.id === activeNoteId);
  if (!note) return Promise.resolve(undefined);
  const running = savingNotes.get(note.id);
  if (running) return running;
  const promise = doSaveNote(note).finally(() => { savingNotes.delete(note.id); });
  savingNotes.set(note.id, promise);
  return promise;
}

async function doSaveNote(note) {
  if (!currentUser) return false;
  const epoch = authEpoch;
  const uid = currentUser.id;
  const isActive = () => epoch === authEpoch && note.id === activeNoteId;

  const statusEl = document.getElementById('save-status');
  const btn = document.getElementById('save-note-btn');
  if (statusEl) {
    statusEl.textContent = 'сохранение…';
    statusEl.classList.remove('saved', 'unsaved');
  }
  if (btn) btn.disabled = true;

  // Что именно отправляем: правки, сделанные во время запроса, останутся «несохранёнными»
  const sent = { title: note.title || '', content: note.content || '', tag: note.tag || '' };
  const contentChanged = !(note.id === activeNoteId && noteSavedSnapshot) || noteSavedSnapshot.content !== sent.content;
  const expectedUpdatedAt = note.updated_at;
  const nowIso = new Date().toISOString();

  const fail = async (msg) => {
    if (epoch !== authEpoch) return false;
    const st = document.getElementById('save-status');
    if (st && isActive()) { st.textContent = 'ошибка сохранения'; st.classList.add('unsaved'); }
    const b = document.getElementById('save-note-btn');
    if (b) b.disabled = false;
    await showAlert(msg, 'ошибка');
    return false;
  };

  // Оптимистичная блокировка: обновляем только если запись не менялась с момента загрузки
  const doUpdate = (guard) => {
    let q = db.from('notes')
      .update({ title: sent.title, content: sent.content, tag: sent.tag, updated_at: nowIso })
      .eq('id', note.id).eq('user_id', uid);
    if (guard && expectedUpdatedAt) q = q.eq('updated_at', expectedUpdatedAt);
    return q.select('updated_at');
  };

  let res = await doUpdate(true);
  if (epoch !== authEpoch) return false;

  if (!res.error && (!res.data || res.data.length === 0)) {
    const cur = await db.from('notes').select('id').eq('id', note.id).eq('user_id', uid).maybeSingle();
    if (epoch !== authEpoch) return false;
    if (cur.error) return fail('Не удалось сохранить заметку: ' + cur.error.message);
    if (!cur.data) return fail('Не удалось сохранить: заметка была удалена в другом окне или на другом устройстве.');
    const overwrite = await showConfirm(
      'Эта заметка была изменена в другом окне или на другом устройстве. Перезаписать ту версию текстом, который открыт здесь?',
      { eyebrow: 'конфликт версий', confirmLabel: 'Перезаписать', danger: true }
    );
    if (epoch !== authEpoch) return false;
    if (!overwrite) return fail('Сохранение отменено: на сервере более новая версия заметки.');
    res = await doUpdate(false);
    if (epoch !== authEpoch) return false;
  }

  if (res.error) return fail('Не удалось сохранить заметку: ' + res.error.message);
  if (!res.data || res.data.length === 0) return fail('Не удалось сохранить заметку: запись не найдена или нет прав.');

  note.updated_at = res.data[0].updated_at || nowIso;

  if (contentChanged && getCurrentPlan().perks.history) {
    const { error: histError } = await db.from('note_history').insert({ note_id: note.id, content: sent.content });
    if (epoch !== authEpoch) return true;
    if (histError) {
      console.warn('note_history insert failed:', histError);
      logEvent('error', 'Не удалось сохранить историю заметки', { note_id: note.id, error: histError.message });
      await showAlert('Заметка сохранена, но запись в историю изменений не удалась: ' + histError.message, 'предупреждение');
    }
  }
  if (epoch !== authEpoch) return true;

  if (note.id === activeNoteId) {
    noteSavedSnapshot = sent;
    noteHasUnsavedChanges = (note.title || '') !== sent.title || (note.content || '') !== sent.content || (note.tag || '') !== sent.tag;
  }

  const el = document.getElementById('save-status');
  if (el && isActive()) {
    if (noteHasUnsavedChanges) {
      el.textContent = 'не сохранено';
      el.classList.add('unsaved');
      el.classList.remove('saved');
    } else {
      el.textContent = formatUpdated(note.updated_at);
      el.classList.add('saved');
      el.classList.remove('unsaved');
    }
  }
  const btn2 = document.getElementById('save-note-btn');
  if (btn2) { btn2.disabled = false; btn2.classList.toggle('has-changes', !!(isActive() && noteHasUnsavedChanges)); }

  renderSidebar();
  return true;
}

function currentNoteIsDirty() {
  if (!noteHasUnsavedChanges) return false;
  const note = notes.find(n => n.id === activeNoteId);
  if (!note || !noteSavedSnapshot) return noteHasUnsavedChanges;
  return (note.title || '') !== noteSavedSnapshot.title
      || (note.content || '') !== noteSavedSnapshot.content
      || (note.tag || '') !== noteSavedSnapshot.tag;
}

// Returns true if it's OK to proceed (navigate away / switch note), false if the action should be cancelled.
async function confirmDiscardIfDirty() {
  if (!currentNoteIsDirty()) return true;
  const choice = await showUnsavedChangesPrompt();
  if (choice === 'save') {
    const note = notes.find(n => n.id === activeNoteId);
    return (await saveNote(note)) === true;
  }
  if (choice === 'discard') {
    // «Не сохранять» должно реально откатить правки в памяти: иначе при возврате к заметке
    // несохранённый текст выглядел бы сохранённым.
    const note = notes.find(n => n.id === activeNoteId);
    if (note && noteSavedSnapshot) {
      note.title = noteSavedSnapshot.title;
      note.content = noteSavedSnapshot.content;
      note.tag = noteSavedSnapshot.tag;
    }
    noteHasUnsavedChanges = false;
    return true;
  }
  return false; // cancel
}



function openPricing() {
  renderPricingGrid();
  document.getElementById('pricing-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closePricing() {
  document.getElementById('pricing-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function renderPricingGrid() {
  const card = document.getElementById('pricing-card');
  const currentPlan = getCurrentPlan();
  const currentKey = currentPlan.key;
  const order = ['free', 's', 'm', 'l'];

  const cardsHtml = order.map(key => {
    const p = PLANS[key];
    const isCurrent = key === currentKey;
    const featured = key === 'm';
    const priceLabel = p.price === 0 ? 'бесплатно' : p.price + ' ₽<span> / мес</span>';
    const btnLabel = isCurrent ? 'текущий план' : (p.price === 0 ? 'перейти на free' : 'оформить');
    const addOnNote = (isCurrent && currentPlan.addOnPrice > 0)
      ? `<div class="plan-card-addon">+ докуплено на ${currentPlan.addOnPrice} ₽/мес сверху</div>`
      : '';
    const buyBtn = isCurrent
      ? ''
      : `<button type="button" class="plan-card-btn" onclick="${p.price === 0 ? `downgradeToFree()` : `openCheckout('${key}')`}">${btnLabel}</button>`;
    const addOnBtn = isCurrent
      ? `<button type="button" class="plan-card-btn plan-card-btn-secondary" onclick="openCustomBuilder()">${currentPlan.addOnPrice > 0 ? 'изменить докупленное' : 'докупить лимиты →'}</button>`
      : '';
    return `
      <div class="plan-card${isCurrent ? ' current' : ''}${featured ? ' featured' : ''}">
        <div class="plan-card-name"><span>${p.name}</span>${featured ? '<span class="plan-card-featured-tag">популярный</span>' : ''}</div>
        <div class="plan-card-price">${priceLabel}</div>
        ${addOnNote}
        <div class="plan-card-quota">${p.limit} заметок · ${p.groupLimit} групп · ${p.messageLimit} сообщ./группу</div>
        <ul class="plan-card-features">${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
        ${buyBtn}${addOnBtn}
      </div>`;
  }).join('');

  card.innerHTML = `
    <button class="modal-close" onclick="closePricing()" type="button" aria-label="Закрыть">×</button>
    <div class="modal-eyebrow">подписка</div>
    <h2 class="modal-title">Выберите план, <em>докупите под себя.</em></h2>
    <p class="modal-sub">4 плана с базовыми лимитами и функциями. К любому из них, включая бесплатный, можно докупить лимиты по заметкам, символам, группам и сообщениям, а также недостающие функции — цена докупки считается сверху. Отменить можно в любой момент.</p>
    <div class="plans-grid">${cardsHtml}</div>
    <div class="modal-foot-note">Оплата проходит через ЮMoney — картой или с кошелька.</div>
  `;
}

async function downgradeToFree() {
  const ok = await showConfirm('Перейти на бесплатный план? Платные функции станут недоступны.', { eyebrow: 'смена тарифа', confirmLabel: 'Перейти на Free', danger: true });
  if (!ok) return;
  if (!(await setUserPlan('free'))) return;
  renderPricingGrid();
  renderSidebar();
  renderEditor();
}

function openCheckout(planKey) {
  const p = PLANS[planKey];
  renderGenericCheckout(p, () => confirmPayment(planKey));
}




let customBuilderState = null;

function openCustomBuilder() {
  const planKey = (currentProfile && currentProfile.plan) || 'free';
  const planBase = PLANS[planKey] || PLANS.free;
  const current = getCurrentPlan();
  const limits = {};
  LIMIT_OVERRIDE_FIELDS.forEach(f => {
    limits[f.column] = current[f.planKey];
  });
  const perks = {};
  CUSTOM_PERK_PRICES.forEach(p => { perks[p.key] = !!current.perks[p.key]; });
  customBuilderState = { planKey, planBase, limits, perks };
  renderCustomBuilder();
}

function renderCustomBuilder() {
  const card = document.getElementById('pricing-card');
  const { planBase, limits, perks } = customBuilderState;
  const baseValues = {};
  LIMIT_OVERRIDE_FIELDS.forEach(f => { baseValues[f.column] = planBase[f.planKey]; });
  const price = calcCustomPrice(limits, perks, baseValues, planBase.perks);

  const limitsHtml = LIMIT_OVERRIDE_FIELDS.map(f => {
    const val = limits[f.column];
    const floor = baseValues[f.column];
    const sliderMax = Math.max(f.max, val * 2, floor * 2);
    return `
      <div class="admin-limit-row">
        <div class="admin-limit-head">
          <span class="admin-limit-label">${escapeHtml(f.label)}</span>
          <span class="custom-limit-value">${val.toLocaleString('ru-RU')}</span>
        </div>
        <div class="admin-limit-controls">
          <input type="range" id="custom-range-${f.column}" min="${floor}" max="${sliderMax}" step="${f.step}" value="${val}"
            oninput="syncCustomLimitInput('${f.column}', this.value)">
          <input type="number" id="custom-number-${f.column}" min="${floor}" max="${sliderMax}" step="${f.step}" value="${val}"
            oninput="syncCustomLimitInput('${f.column}', this.value)">
        </div>
        <div class="custom-limit-included">включено в план: ${floor.toLocaleString('ru-RU')}</div>
      </div>`;
  }).join('');

  const perksHtml = CUSTOM_PERK_PRICES.map(p => {
    const includedFree = !!planBase.perks[p.key];
    const checked = includedFree || perks[p.key];
    return `
    <label class="custom-perk-row${checked ? ' checked' : ''}${includedFree ? ' included' : ''}" for="custom-perk-${p.key}">
      <span class="custom-perk-label">
        <input type="checkbox" id="custom-perk-${p.key}" ${checked ? 'checked' : ''} ${includedFree ? 'disabled' : ''} onchange="toggleCustomPerk('${p.key}', this.checked)">
        ${escapeHtml(p.label)}
      </span>
      <span class="custom-perk-price">${includedFree ? 'уже в плане' : '+' + p.price + ' ₽'}</span>
    </label>`;
  }).join('');

  card.innerHTML = `
    <button class="modal-close" onclick="closePricing()" type="button" aria-label="Закрыть">×</button>
    <div class="modal-eyebrow">докупка · план «${escapeHtml(planBase.name)}»</div>
    <h2 class="modal-title">Докупите <em>сверху плана.</em></h2>
    <p class="modal-sub">Лимиты и функции вашего плана уже включены бесплатно — здесь докупается только то, что выше них. Цена пересчитывается сразу и добавляется к стоимости плана.</p>

    <div class="custom-builder-section-title">Лимиты</div>
    ${limitsHtml}

    <div class="custom-builder-section-title">Функции</div>
    ${perksHtml}

    <div class="custom-builder-sticky">
      <div>
        <div class="custom-builder-price-label">доплата сверху плана</div>
        <div class="custom-builder-price" id="custom-price-display">+${price} ₽<span> / мес</span></div>
      </div>
      <button type="button" class="btn-primary" style="width:auto; padding:13px 22px;" onclick="proceedToCustomCheckout()">К оплате →</button>
    </div>
    <button type="button" class="upgrade-link" style="margin-top:14px; width:100%; text-align:center;" onclick="renderPricingGrid()">← назад к тарифам</button>
  `;
}

function syncCustomLimitInput(column, value) {
  const field = LIMIT_OVERRIDE_FIELDS.find(f => f.column === column);
  if (!field) return;
  const rangeEl = document.getElementById('custom-range-' + column);
  const minAllowed = rangeEl ? Number(rangeEl.min) : field.min;
  const maxAllowed = rangeEl ? Number(rangeEl.max) : field.max;
  let num = Number(value);
  if (Number.isNaN(num)) return;
  num = Math.max(minAllowed, Math.min(maxAllowed, num));
  customBuilderState.limits[column] = num;

  const numberEl = document.getElementById('custom-number-' + column);
  if (rangeEl) rangeEl.value = num;
  if (numberEl) numberEl.value = num;
  const valueLabel = rangeEl && rangeEl.closest('.admin-limit-row').querySelector('.custom-limit-value');
  if (valueLabel) valueLabel.textContent = num.toLocaleString('ru-RU');

  updateCustomPriceDisplay();
}

function toggleCustomPerk(key, checked) {
  customBuilderState.perks[key] = checked;
  const row = document.getElementById('custom-perk-' + key).closest('.custom-perk-row');
  if (row) row.classList.toggle('checked', checked);
  updateCustomPriceDisplay();
}

function updateCustomPriceDisplay() {
  const { planBase, limits, perks } = customBuilderState;
  const baseValues = {};
  LIMIT_OVERRIDE_FIELDS.forEach(f => { baseValues[f.column] = planBase[f.planKey]; });
  const price = calcCustomPrice(limits, perks, baseValues, planBase.perks);
  const el = document.getElementById('custom-price-display');
  if (el) el.innerHTML = `+${price} ₽<span> / мес</span>`;
}

function proceedToCustomCheckout() {
  const { planBase, limits, perks } = customBuilderState;
  const baseValues = {};
  LIMIT_OVERRIDE_FIELDS.forEach(f => { baseValues[f.column] = planBase[f.planKey]; });
  const addOnPrice = calcCustomPrice(limits, perks, baseValues, planBase.perks);
  const totalPrice = planBase.price + addOnPrice;
  const planForCheckout = {
    key: planBase.key,
    name: planBase.name + ' + докупка',
    price: totalPrice,
    limit: limits.limit_notes,
    charLimit: limits.limit_chars,
    groupLimit: limits.limit_groups,
    messageLimit: limits.limit_messages,
    perks: { ...planBase.perks, ...perks }
  };
  renderGenericCheckout(planForCheckout, () => confirmCustomPayment(limits, perks, addOnPrice));
  const backBtn = document.querySelector('#pricing-card .upgrade-link');
  if (backBtn) backBtn.onclick = renderCustomBuilder;
}

// Сброс докупленного до базовых значений плана. Раньше клиент сам писал лимиты в profiles —
// то же самое действие позволяло выдать себе любые лимиты бесплатно. Теперь это делает сервер.
async function clearMyAddons() {
  const { error } = await db.rpc('clear_my_addons');
  if (!error) return { error: null };
  if (isMissingRpc(error)) {
    const cleared = { custom_perks: null, custom_price: 0 };
    LIMIT_OVERRIDE_FIELDS.forEach(f => { cleared[f.column] = null; });
    return await db.from('profiles').update(cleared).eq('id', currentUser.id);
  }
  return { error };
}

async function refreshCurrentProfile() {
  const epoch = authEpoch;
  const uid = currentUser && currentUser.id;
  if (!uid) return false;
  const { data, error } = await db.from('profiles').select('*').eq('id', uid).single();
  if (epoch !== authEpoch || error || !data) return false;
  currentProfile = data;
  return true;
}

async function confirmCustomPayment(limits, perks, addOnPrice) {
  if (addOnPrice <= 0) {
    // Доплата не нужна: выбранные значения не превышают тариф, значит это возврат к базовым
    // лимитам плана. Локальный профиль обновляем только после успешного ответа сервера.
    const epoch = authEpoch;
    const { error } = await clearMyAddons();
    if (epoch !== authEpoch) return;
    if (error) {
      await showAlert('Не удалось сохранить лимиты: ' + error.message, 'ошибка сохранения');
      return;
    }
    await refreshCurrentProfile();

    showPaymentSuccess({ name: 'Кастомный план', price: 0 }, 'Лимиты обновлены — доплата не требовалась.');
    renderSidebar();
    renderEditor();
    if (currentSection === 'groups') { renderGroupsPanel(); renderGroupArea(); }
    return;
  }

  const order = await buildYoomoneyCheckout({
    amount: addOnPrice,
    kind: 'custom',
    customPayload: { limits, perks },
  });
  if (!order) return;
  redirectToYoomoney(order.label, order.amount, 'Тетрадь — докупка лимитов');
}



// Заказ создаёт сервер (RPC create_payment_order): он сам считает сумму по своим тарифам,
// проверяет состав докупки и выдаёт непредсказуемый label. Клиент больше не может записать
// в payments произвольные amount/status/custom_payload. Сумма из клиента передаётся
// только для сверки — при расхождении оплата не начинается.
async function buildYoomoneyCheckout({ amount, kind, planKey, customPayload }) {
  const { data, error } = await db.rpc('create_payment_order', {
    p_kind: kind,
    p_plan_key: planKey || null,
    p_custom_payload: customPayload || null,
    p_client_amount: amount,
  });

  if (error || !data || !data.label) {
    const missing = isMissingRpc(error);
    const reason = missing
      ? 'на сервере не применена миграция создания заказов (create_payment_order).'
      : (error ? error.message : 'пустой ответ сервера');
    await showAlert('Не удалось создать заказ на оплату: ' + reason, 'ошибка');
    logEvent('payment', 'Ошибка создания заказа: ' + (error ? error.message : 'пустой ответ'), { kind, planKey });
    return null;
  }

  if (Number(data.amount) !== Number(amount)) {
    await showAlert('Стоимость изменилась (' + data.amount + ' ₽ вместо ' + amount + ' ₽). Обновите страницу и повторите.', 'цена изменилась');
    logEvent('payment', 'Расхождение суммы клиента и сервера', { kind, planKey, client: amount, server: data.amount });
    return null;
  }

  logEvent('payment', 'Создан заказ на оплату', { label: data.label, kind, planKey, amount: data.amount });
  return { label: data.label, amount: Number(data.amount) };
}

function redirectToYoomoney(label, amount, description) {
  const successUrl = window.location.origin + window.location.pathname + '?paid_label=' + encodeURIComponent(label);
  const params = new URLSearchParams({
    receiver: YOOMONEY_WALLET,
    'quickpay-form': 'shop',
    'paymentType': 'AC',
    sum: String(amount),
    label,
    targets: description,
    successURL: successUrl,
  });
  window.location.href = 'https://yoomoney.ru/quickpay/confirm?' + params.toString();
}

async function checkReturnFromYoomoney() {
  const url = new URL(window.location.href);
  const label = url.searchParams.get('paid_label');
  if (!label) return;


  history.replaceState(null, '', window.location.pathname);

  if (!currentUser) return;
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(label)) return;
  const epoch = authEpoch;
  const uid = currentUser.id;

  openPricing();
  const card = document.getElementById('pricing-card');
  card.innerHTML = `
    <div class="modal-eyebrow">оплата</div>
    <h2 class="modal-title">Проверяем оплату<em>…</em></h2>
    <p class="modal-sub">Обычно это занимает несколько секунд. Не закрывайте окно.</p>
    <div class="checkout-box" style="text-align:center; padding:40px 20px;">
      <div class="loading-pulse">Ожидание подтверждения от ЮMoney…</div>
    </div>
  `;

  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    const { data: payment } = await db.from('payments').select('*').eq('label', label).eq('user_id', uid).maybeSingle();
    if (epoch !== authEpoch) return;   // пока ждали подтверждение, сменили аккаунт

    if (payment && payment.status === 'paid') {
      await refreshCurrentProfile();
      if (epoch !== authEpoch) return;

      const p = payment.kind === 'plan'
        ? PLANS[payment.plan_key]
        : { name: 'Кастомный план', price: payment.amount };
      showPaymentSuccess(p || { name: 'план', price: payment.amount }, 'Оплата подтверждена, новые лимиты уже применены.');
      renderSidebar();
      renderEditor();
      if (currentSection === 'groups') { renderGroupsPanel(); renderGroupArea(); }
      return;
    }

    if (payment && payment.status === 'failed') {
      card.innerHTML = `
        <div class="modal-eyebrow">оплата</div>
        <h2 class="modal-title">Не удалось подтвердить оплату</h2>
        <p class="modal-sub">Если деньги списались, они автоматически вернутся отправителю в течение нескольких минут. Попробуйте ещё раз или напишите в поддержку.</p>
        <button type="button" class="btn-primary" style="max-width:220px;" onclick="closePricing()">Понятно</button>
      `;
      return;
    }

    await new Promise(r => setTimeout(r, 2000));
    if (epoch !== authEpoch) return;
  }

  card.innerHTML = `
    <div class="modal-eyebrow">оплата</div>
    <h2 class="modal-title">Оплата ещё обрабатывается</h2>
    <p class="modal-sub">Иногда подтверждение приходит чуть дольше обычного. План подключится автоматически в течение нескольких минут после оплаты — обновите страницу чуть позже.</p>
    <button type="button" class="btn-primary" style="max-width:220px;" onclick="closePricing()">Понятно</button>
  `;
}

function renderGenericCheckout(p, onConfirm) {
  const card = document.getElementById('pricing-card');
  card.innerHTML = `
    <button class="modal-close" onclick="closePricing()" type="button" aria-label="Закрыть">×</button>
    <div class="modal-eyebrow">оплата</div>
    <h2 class="modal-title">Подключить «<em>${p.name}</em>»</h2>
    <p class="modal-sub">Оплата через ЮMoney — картой или с кошелька. После оплаты вы автоматически вернётесь сюда, план подключится сам.</p>
    <div class="checkout-box">
      <div class="checkout-row"><span>План</span><strong>${p.name}</strong></div>
      <div class="checkout-row"><span>Период</span><strong>1 месяц</strong></div>
      <div class="checkout-divider"></div>
      <div class="checkout-total"><span>Итого</span><span>${p.price} ₽</span></div>
      <button type="button" class="btn-primary" id="checkout-confirm-btn">Оплатить через ЮMoney — ${p.price} ₽</button>
      <button type="button" class="upgrade-link" style="margin-top:14px; width:100%; text-align:center;" onclick="renderPricingGrid()">← назад к тарифам</button>
    </div>
  `;
  document.getElementById('checkout-confirm-btn').onclick = onConfirm;
}

function luhnValid(digits) {
  let sum = 0, shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

async function confirmPayment(planKey) {
  const p = PLANS[planKey];
  if (!p || !(p.price > 0)) return;
  const order = await buildYoomoneyCheckout({ amount: p.price, kind: 'plan', planKey });
  if (!order) return;
  redirectToYoomoney(order.label, order.amount, `Тетрадь — план «${p.name}»`);
}





function showPaymentSuccess(p, subMessage) {
  const card = document.getElementById('pricing-card');
  card.innerHTML = `
    <button class="modal-close" onclick="closePricing()" type="button" aria-label="Закрыть">×</button>
    <div class="modal-eyebrow">готово</div>
    <h2 class="modal-title">План «<em>${p.name}</em>» подключён</h2>
    <p class="modal-sub">${subMessage}</p>
    <button type="button" class="btn-primary" style="max-width:220px;" onclick="closePricing()">Отлично</button>
  `;
}





// Переход на Free выполняет сервер (RPC downgrade_to_free): прямая запись поля plan из
// браузера означала бы, что любой пользователь может выставить себе платный план.
async function setUserPlan(planKey) {
  if (planKey !== 'free') {
    await showAlert('Платный план подключается только через оплату.', 'ошибка');
    return false;
  }
  const epoch = authEpoch;
  let { error } = await db.rpc('downgrade_to_free');
  if (isMissingRpc(error)) {
    const clearFields = { plan: 'free', custom_perks: null, custom_price: 0 };
    LIMIT_OVERRIDE_FIELDS.forEach(f => { clearFields[f.column] = null; });
    ({ error } = await db.from('profiles').update(clearFields).eq('id', currentUser.id));
  }
  if (epoch !== authEpoch) return false;
  if (error) {
    await showAlert('Не удалось сменить план: ' + error.message, 'ошибка');
    return false;
  }
  // локальный профиль обновляем только по данным сервера
  await refreshCurrentProfile();
  return true;
}



let adminLookupResult = null;
let adminSearchSeq = 0;       // номер последнего поиска: запоздавшие ответы отбрасываются
let adminLogsSeq = 0;
let adminLookupNotesExpanded = false;
let adminPanelTab = 'users';
let adminLogsCategory = 'all';

function openAdminPanel() {
  if (!currentProfile || !currentProfile.is_admin) return;
  adminPanelTab = 'users';
  renderAdminSearch();
  document.getElementById('admin-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeAdminPanel() {
  document.getElementById('admin-modal').classList.add('hidden');
  document.body.style.overflow = '';
  adminSearchSeq++;
  adminLogsSeq++;
  adminLookupResult = null;
  adminLookupNotesExpanded = false;
}

function adminTabsHtml() {
  return `
    <div class="admin-tabs">
      <button type="button" class="admin-tab-btn${adminPanelTab === 'users' ? ' active' : ''}" onclick="switchAdminTab('users')">пользователи</button>
      <button type="button" class="admin-tab-btn${adminPanelTab === 'logs' ? ' active' : ''}" onclick="switchAdminTab('logs')">логи</button>
    </div>
  `;
}

function switchAdminTab(tab) {
  adminPanelTab = tab;
  if (tab === 'users') renderAdminSearch();
  else renderAdminLogs();
}

function renderAdminSearch(errorMsg) {
  const card = document.getElementById('admin-card');
  card.innerHTML = `
    <button class="modal-close" onclick="closeAdminPanel()" type="button" aria-label="Закрыть">×</button>
    <div class="modal-eyebrow">админ-панель</div>
    <h2 class="modal-title">Управление <em>пользователями.</em></h2>
    ${adminTabsHtml()}
    <p class="modal-sub">Найдите пользователя по ID (UUID) или по отображаемому имени, чтобы выдать план, включить/выключить админ-доступ или заблокировать аккаунт.</p>
    ${errorMsg ? `<div class="admin-error">${escapeHtml(errorMsg)}</div>` : ''}
    <div class="admin-search-row">
      <input type="text" id="admin-search-input" placeholder="ID пользователя или имя…">
      <button type="button" onclick="runAdminSearch()">Найти</button>
    </div>
    <div id="admin-result"></div>
  `;
  const input = document.getElementById('admin-search-input');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runAdminSearch(); });
  input.focus();
}

const ADMIN_LOG_CATEGORIES = [
  { key: 'all', label: 'все' },
  { key: 'auth', label: 'вход/регистрация' },
  { key: 'payment', label: 'платежи' },
  { key: 'user_action', label: 'действия' },
  { key: 'error', label: 'ошибки' },
];

async function renderAdminLogs() {
  const card = document.getElementById('admin-card');
  card.innerHTML = `
    <button class="modal-close" onclick="closeAdminPanel()" type="button" aria-label="Закрыть">×</button>
    <div class="modal-eyebrow">админ-панель</div>
    <h2 class="modal-title">Журнал <em>событий.</em></h2>
    ${adminTabsHtml()}
    <div class="admin-log-filters">
      ${ADMIN_LOG_CATEGORIES.map(c => `<button type="button" class="admin-log-filter-btn${adminLogsCategory === c.key ? ' active' : ''}" onclick="setAdminLogsCategory('${c.key}')">${c.label}</button>`).join('')}
    </div>
    <div id="admin-logs-list" class="admin-empty loading-pulse">Загрузка…</div>
  `;
  await loadAdminLogs();
}

function setAdminLogsCategory(cat) {
  adminLogsCategory = cat;
  renderAdminLogs();
}

async function loadAdminLogs() {
  const seq = ++adminLogsSeq;
  const epoch = authEpoch;
  let query = db.from('event_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (adminLogsCategory !== 'all') query = query.eq('category', adminLogsCategory);
  const { data, error } = await query;
  if (seq !== adminLogsSeq || epoch !== authEpoch) return;

  const listEl = document.getElementById('admin-logs-list');
  if (!listEl) return;

  if (error) {
    listEl.innerHTML = `<div class="admin-error">Не удалось загрузить логи: ${escapeHtml(error.message)}</div>`;
    return;
  }
  if (!data || data.length === 0) {
    listEl.innerHTML = `<div class="admin-empty">Событий пока нет.</div>`;
    return;
  }

  const userIds = [...new Set(data.map(row => row.user_id).filter(Boolean))];
  let namesById = {};
  if (userIds.length > 0) {
    const { data: profiles } = await db.from('profiles').select('id, display_name').in('id', userIds);
    if (seq !== adminLogsSeq || epoch !== authEpoch) return;
    (profiles || []).forEach(p => { namesById[p.id] = p.display_name; });
  }

  listEl.className = 'admin-logs-list';
  listEl.innerHTML = data.map(row => logRowHtml(row, namesById)).join('');
}

function logRowHtml(row, namesById) {
  const dt = new Date(row.created_at);
  const time = dt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const catLabel = (ADMIN_LOG_CATEGORIES.find(c => c.key === row.category) || { label: row.category }).label;
  const metaStr = row.meta ? JSON.stringify(row.meta) : '';
  const userName = row.user_id ? ((namesById || {})[row.user_id] || null) : null;
  return `
    <div class="admin-log-row admin-log-cat-${escapeHtml(String(row.category).replace(/[^a-z_]/gi, ''))}">
      <div class="admin-log-row-top">
        <span class="admin-log-time">${time}</span>
        <span class="admin-log-cat">${escapeHtml(catLabel)}</span>
        <span class="admin-log-source">${row.source === 'webhook' ? 'webhook' : 'клиент'}</span>
      </div>
      <div class="admin-log-message">${escapeHtml(row.message)}</div>
      ${row.user_id ? `<div class="admin-log-user" ${safeId(row.user_id) ? `onclick="selectAdminUserById('${safeId(row.user_id)}')"` : ''}>пользователь: ${userName ? escapeHtml(userName) + ' · ' : ''}${escapeHtml(row.user_id)}</div>` : ''}
      ${metaStr ? `<div class="admin-log-meta">${escapeHtml(metaStr)}</div>` : ''}
    </div>
  `;
}

async function runAdminSearch() {
  const query = document.getElementById('admin-search-input').value.trim();
  if (!query) return;

  const seq = ++adminSearchSeq;
  const epoch = authEpoch;
  const resultEl = document.getElementById('admin-result');
  resultEl.innerHTML = `<div class="admin-empty loading-pulse">Поиск…</div>`;


  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

  let res;
  if (looksLikeUuid) {
    res = await db.from('profiles').select('*').eq('id', query).limit(1);
  } else {
    // % и _ в имени — обычные символы, а не шаблон
    const pattern = query.replace(/[\\%_]/g, m => '\\' + m);
    res = await db.from('profiles').select('*').ilike('display_name', `%${pattern}%`).limit(10);
  }
  if (seq !== adminSearchSeq || epoch !== authEpoch) return;   // пришёл устаревший ответ

  if (res.error) {
    resultEl.innerHTML = `<div class="admin-error">Ошибка поиска: ${escapeHtml(res.error.message)}</div>`;
    return;
  }
  const rows = res.data || [];

  if (rows.length === 0) {
    resultEl.innerHTML = `<div class="admin-empty">Никого не найдено. Проверьте ID или имя.</div>`;
    return;
  }

  if (rows.length === 1) {
    await loadAdminUser(rows[0]);
    return;
  }


  resultEl.innerHTML = rows.map(r => `
    <div class="recent-group-item" onclick="selectAdminUserById('${safeId(r.id)}')">
      <span class="recent-group-name">${escapeHtml(r.display_name || '(без имени)')}</span>
      <span class="recent-group-owner-tag" style="border-color:var(--line); color:var(--text-dim);">${escapeHtml(r.plan || 'free')}</span>
    </div>
  `).join('');
}

async function selectAdminUserById(id) {
  const seq = ++adminSearchSeq;
  const epoch = authEpoch;
  const { data, error } = await db.from('profiles').select('*').eq('id', id).single();
  if (seq !== adminSearchSeq || epoch !== authEpoch) return;
  if (error || !data) {
    const el = document.getElementById('admin-result');
    if (el) el.innerHTML = `<div class="admin-error">Не удалось загрузить пользователя${error ? ': ' + escapeHtml(error.message) : ''}</div>`;
    return;
  }
  await loadAdminUser(data);
}

async function loadAdminUser(profileRow) {
  adminLookupResult = profileRow;
  adminLookupNotesExpanded = false;
  await renderAdminUserCard();
}

async function renderAdminUserCard() {
  const resultEl = document.getElementById('admin-result');
  if (!resultEl || !adminLookupResult) return;

  const u = adminLookupResult;
  const uid = safeId(u.id);
  const epoch = authEpoch;
  resultEl.innerHTML = `<div class="admin-empty loading-pulse">Загрузка данных…</div>`;

  const [noteCountRes, groupCountRes, noteRowsRes] = await Promise.all([
    db.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
    db.from('groups').select('id', { count: 'exact', head: true }).eq('owner_id', u.id),
    db.from('notes').select('id, title, updated_at').eq('user_id', u.id).order('updated_at', { ascending: false }).limit(20)
  ]);
  // пока грузилось, карточку закрыли/открыли другую, либо сменился аккаунт
  if (epoch !== authEpoch || adminLookupResult !== u) return;
  const failed = noteCountRes.error || groupCountRes.error || noteRowsRes.error;
  if (failed) {
    resultEl.innerHTML = `<div class="admin-error">Не удалось загрузить данные пользователя: ${escapeHtml(failed.message)}</div>`;
    return;
  }
  const noteCount = noteCountRes.count, groupCount = groupCountRes.count, noteRows = noteRowsRes.data;

  const plan = getEffectivePlan(u);
  const planOrder = ['free', 's', 'm', 'l'];
  const isSelf = u.id === currentUser.id;

  const notesHtml = (noteRows || []).length === 0
    ? `<div class="admin-empty" style="padding:14px 0;">Заметок нет</div>`
    : (noteRows || []).map(n => `
        <div class="admin-note-row">
          <span>${escapeHtml(n.title && n.title.trim() ? n.title : 'без названия')}</span>
          <span>${formatUpdated(n.updated_at)}</span>
        </div>
      `).join('');

  resultEl.innerHTML = `
    <div class="admin-user-card">
      <div class="admin-user-head">
        <span class="admin-user-name">${escapeHtml(u.display_name || '(без имени)')}</span>
        <span class="plan-badge ${plan.badgeClass}">${plan.name.toLowerCase()}</span>
      </div>
      <div class="admin-user-id">id: ${escapeHtml(u.id)}</div>

      <div class="admin-stat-grid">
        <div class="admin-stat">
          <div class="admin-stat-label">заметок</div>
          <div class="admin-stat-value">${noteCount ?? 0} / ${plan.limit}</div>
        </div>
        <div class="admin-stat">
          <div class="admin-stat-label">своих групп</div>
          <div class="admin-stat-value">${groupCount ?? 0} / ${plan.groupLimit}</div>
        </div>
        <div class="admin-stat">
          <div class="admin-stat-label">статус</div>
          <div class="admin-stat-value" style="font-size:14px;">${u.banned ? 'заблокирован' : 'активен'}</div>
        </div>
      </div>

      <div class="admin-section-title">Выдать план (без оплаты)</div>
      <div class="admin-plan-btns">
        ${planOrder.map(key => `
          <button type="button" class="admin-plan-btn${u.plan === key ? ' current' : ''}"
            ${u.plan === key ? 'disabled' : ''}
            onclick="adminSetPlan('${uid}', '${key}')">${PLANS[key].name}</button>
        `).join('')}
      </div>

      <div class="admin-section-title">Индивидуальные лимиты <span style="text-transform:none;">(перекрывают тариф для этого пользователя)</span></div>
      ${LIMIT_OVERRIDE_FIELDS.map(f => {
        const base = PLANS[u.plan] || PLANS.free;
        const overrideVal = u[f.column];
        const isOverridden = overrideVal !== null && overrideVal !== undefined && overrideVal !== '';
        const currentVal = isOverridden ? Number(overrideVal) : base[f.planKey];


        const sliderMax = Math.max(f.max, base[f.planKey] * 2);
        return `
          <div class="admin-limit-row">
            <div class="admin-limit-head">
              <span class="admin-limit-label">${escapeHtml(f.label)}</span>
              <span class="admin-limit-tag${isOverridden ? ' overridden' : ''}">${isOverridden ? 'переопределено' : 'по тарифу (' + base[f.planKey].toLocaleString('ru-RU') + ')'}</span>
            </div>
            <div class="admin-limit-controls">
              <input type="range" id="admin-limit-range-${f.column}" min="${f.min}" max="${sliderMax}" step="${f.step}" value="${currentVal}"
                oninput="syncAdminLimitInputs('${f.column}', this.value, 'range')">
              <input type="number" id="admin-limit-number-${f.column}" min="${f.min}" max="${sliderMax}" step="${f.step}" value="${currentVal}"
                oninput="syncAdminLimitInputs('${f.column}', this.value, 'number')">
              <button type="button" class="admin-limit-reset-btn" ${isOverridden ? '' : 'disabled'} onclick="adminResetLimitField('${uid}', '${f.column}')">сбросить</button>
            </div>
          </div>
        `;
      }).join('')}
      <div class="admin-plan-btns">
        <button type="button" class="admin-plan-btn" style="border-color:var(--accent); color:var(--accent);" onclick="adminSaveLimitOverrides('${uid}')">Сохранить лимиты</button>
      </div>

      <div class="admin-section-title">Доступ</div>
      <div class="admin-toggle-row">
        <div>
          <div class="admin-toggle-label">Блокировка входа</div>
          <div class="admin-toggle-sub">Заблокированный пользователь не сможет пользоваться аккаунтом.</div>
        </div>
        <button type="button" class="admin-toggle-btn${u.banned ? ' on' : ''}" onclick="adminToggleBan('${uid}', ${!u.banned})">
          ${u.banned ? 'разблокировать' : 'заблокировать'}
        </button>
      </div>
      <div class="admin-toggle-row">
        <div>
          <div class="admin-toggle-label">Права администратора</div>
          <div class="admin-toggle-sub">Доступ к этой панели для данного пользователя.</div>
        </div>
        <button type="button" class="admin-toggle-btn${u.is_admin ? ' admin-on' : ''}" ${isSelf ? 'disabled title="Нельзя снять доступ у самого себя"' : ''} onclick="adminToggleAdmin('${uid}', ${!u.is_admin})">
          ${u.is_admin ? 'снять права' : 'сделать админом'}
        </button>
      </div>

      <div class="admin-section-title">Заметки пользователя (последние 20)</div>
      ${notesHtml}

      <div class="admin-danger-row">
        <button type="button" class="admin-danger-btn" onclick="adminResetPlanConfirm('${uid}')">Сбросить план на Free</button>
      </div>
    </div>
  `;
}

// Карточку могли закрыть или открыть другую, пока шёл запрос
function adminCardIs(userId) {
  return !!adminLookupResult && String(adminLookupResult.id) === String(userId);
}

async function adminSetPlan(userId, planKey) {
  const epoch = authEpoch;
  const { error } = await db.from('profiles').update({ plan: planKey }).eq('id', userId);
  if (epoch !== authEpoch) return;
  if (error) {
    await showAlert('Не удалось изменить план: ' + error.message + '\n\nПроверьте, что в Supabase настроена RLS-политика, разрешающая администраторам обновлять чужие профили.', 'ошибка доступа');
    return;
  }
  if (adminCardIs(userId)) adminLookupResult.plan = planKey;
  if (userId === currentUser.id) {
    currentProfile.plan = planKey;
    renderSidebar();
    renderEditor();
  }
  if (adminCardIs(userId)) await renderAdminUserCard();
}



function syncAdminLimitInputs(column, value, source) {
  const field = LIMIT_OVERRIDE_FIELDS.find(f => f.column === column);
  if (!field) return;
  let num = Number(value);
  if (Number.isNaN(num)) return;
  num = Math.max(field.min, Math.min(Number(document.getElementById('admin-limit-range-' + column).max), num));
  const rangeEl = document.getElementById('admin-limit-range-' + column);
  const numberEl = document.getElementById('admin-limit-number-' + column);
  if (rangeEl) rangeEl.value = num;
  if (numberEl) numberEl.value = num;
}

async function adminSaveLimitOverrides(userId) {
  const updates = {};
  LIMIT_OVERRIDE_FIELDS.forEach(f => {
    const el = document.getElementById('admin-limit-number-' + f.column);
    if (!el) return;
    const num = Number(el.value);
    updates[f.column] = Number.isNaN(num) ? null : num;
  });

  const epoch = authEpoch;
  const { error } = await db.from('profiles').update(updates).eq('id', userId);
  if (epoch !== authEpoch) return;
  if (error) {
    await showAlert('Не удалось сохранить лимиты: ' + error.message + '\n\nПроверьте, что в таблице profiles есть колонки limit_notes, limit_chars, limit_groups, limit_messages.', 'ошибка сохранения');
    return;
  }
  if (adminCardIs(userId)) Object.assign(adminLookupResult, updates);
  if (userId === currentUser.id) {
    Object.assign(currentProfile, updates);
    renderSidebar();
    renderEditor();
  }
  if (adminCardIs(userId)) await renderAdminUserCard();
}

async function adminResetLimitField(userId, column) {
  const epoch = authEpoch;
  const { error } = await db.from('profiles').update({ [column]: null }).eq('id', userId);
  if (epoch !== authEpoch) return;
  if (error) {
    await showAlert('Не удалось сбросить лимит: ' + error.message, 'ошибка сохранения');
    return;
  }
  if (adminCardIs(userId)) adminLookupResult[column] = null;
  if (userId === currentUser.id) {
    currentProfile[column] = null;
    renderSidebar();
    renderEditor();
  }
  if (adminCardIs(userId)) await renderAdminUserCard();
}

async function adminResetPlanConfirm(userId) {
  const ok = await showConfirm('Сбросить план этого пользователя на Free?', { eyebrow: 'сброс плана', confirmLabel: 'Сбросить', danger: true });
  if (!ok) return;
  await adminSetPlan(userId, 'free');
}

async function adminToggleBan(userId, nextValue) {
  if (nextValue && userId === currentUser.id) {
    await showAlert('Нельзя заблокировать самого себя.', 'ошибка');
    return;
  }
  const epoch = authEpoch;
  const { error } = await db.from('profiles').update({ banned: nextValue }).eq('id', userId);
  if (epoch !== authEpoch) return;
  if (error) {
    await showAlert('Не удалось изменить статус блокировки: ' + error.message, 'ошибка доступа');
    return;
  }
  if (adminCardIs(userId)) {
    adminLookupResult.banned = nextValue;
    await renderAdminUserCard();
  }
}

async function adminToggleAdmin(userId, nextValue) {
  if (userId === currentUser.id) return;
  const ok = await showConfirm(nextValue ? 'Выдать этому пользователю права администратора?' : 'Забрать права администратора у этого пользователя?', { eyebrow: 'права доступа', confirmLabel: 'Подтвердить', danger: !nextValue });
  if (!ok) return;
  const epoch = authEpoch;
  const { error } = await db.from('profiles').update({ is_admin: nextValue }).eq('id', userId);
  if (epoch !== authEpoch) return;
  if (error) {
    await showAlert('Не удалось изменить права: ' + error.message, 'ошибка доступа');
    return;
  }
  if (adminCardIs(userId)) {
    adminLookupResult.is_admin = nextValue;
    await renderAdminUserCard();
  }
}



async function getOwnedGroupsCount() {
  const { count } = await db
    .from('groups')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', currentUser.id);
  return count || 0;
}

async function getMyMessageCountInGroup(groupId) {
  const { count } = await db
    .from('group_posts')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('author_id', currentUser.id);
  return count || 0;
}

function switchSection(section) {
  currentSection = section;
  showMobileList();
  document.getElementById('app').classList.remove('editor-collapsed');
  document.getElementById('tab-section-notes').classList.toggle('active', section === 'notes');
  document.getElementById('tab-section-groups').classList.toggle('active', section === 'groups');
  document.getElementById('notes-section').classList.toggle('hidden', section !== 'notes');
  document.getElementById('groups-panel').classList.toggle('hidden', section !== 'groups');

  if (section === 'groups') {
    renderGroupsPanel();
    renderGroupArea();
  } else {
    renderEditor();
  }
}

async function renderGroupsPanel() {
  const panel = document.getElementById('groups-panel');
  panel.innerHTML = `<div class="groups-block-title loading-pulse">Загрузка…</div>`;

  const plan = getCurrentPlan();




  const epoch = authEpoch;
  const [owned, recentResult] = await Promise.all([
    getOwnedGroupsCount(),
    db
      .from('recent_groups')
      .select('group_id, last_visited, groups(id, name, name_lower, owner_id, has_password)')
      .eq('user_id', currentUser.id)
      .order('last_visited', { ascending: false })
      .limit(30),
  ]);

  if (epoch !== authEpoch) return;   // за время запроса сменился аккаунт
  const limitReached = owned >= plan.groupLimit;
  const recentRows = recentResult.data;
  if (recentResult.error) {
    panel.innerHTML = `<div class="groups-block-title">Не удалось загрузить группы: ${escapeHtml(recentResult.error.message)}</div>`;
    return;
  }

  const recent = (recentRows || []).filter(r => r.groups);
  const myGroups = recent.filter(r => r.groups.owner_id === currentUser.id);
  const otherGroups = recent.filter(r => r.groups.owner_id !== currentUser.id);

  // Данные группы в inline-обработчики не подставляем (название задаёт пользователь —
  // это был путь для XSS). Обработчики навешиваются ниже по индексу в groupRefs.
  const groupRefs = [];
  function renderGroupItem(r, i) {
    const g = r.groups;
    const isProtected = !!g.has_password;
    const isOwn = g.owner_id === currentUser.id;
    const delay = Math.min(i * 30, 240);
    const ref = groupRefs.push(g) - 1;
    return `
      <div class="recent-group-item${g.name_lower === activeGroupName ? ' active' : ''}" style="animation-delay:${delay}ms" data-gref="${ref}" role="button" tabindex="0">
        <span class="recent-group-name">${escapeHtml(g.name)}</span>
        ${!isProtected ? '<span class="group-lock-tag">без пароля</span>' : ''}
        ${isOwn ? `<button type="button" class="recent-group-delete" title="Удалить группу" aria-label="Удалить группу">✕</button>` : ''}
      </div>`;
  }

  const myGroupsHtml = myGroups.length === 0 ? '' : `
    <div class="groups-block-title">Мои группы</div>
    ${myGroups.map(renderGroupItem).join('')}
  `;

  const otherGroupsHtml = otherGroups.length === 0 ? '' : `
    <div class="groups-block-title">Группы</div>
    ${otherGroups.map(renderGroupItem).join('')}
  `;

  const recentHtml = myGroupsHtml + otherGroupsHtml;

  panel.innerHTML = `
    <div class="groups-block-title-row">
      <span class="groups-block-title">Войти в группу</span>
      <button type="button" class="info-btn" onclick="showAlert('Войдите в группу по названию и паролю или создайте свою — ниже.', 'как это работает')" title="Подробнее" aria-label="Подробнее">?</button>
    </div>
    <div class="group-form">
      <div id="join-group-error"></div>
      <div class="field">
        <label>Название группы</label>
        <input type="text" id="join-group-name" placeholder="например, family-chat">
      </div>
      <div class="field">
        <label>Пароль группы (если есть)</label>
        <input type="password" id="join-group-password" placeholder="оставьте пустым, если группа без пароля">
      </div>
      <button type="button" class="group-form-btn" onclick="joinGroup()">Войти</button>
    </div>

    ${recentHtml}

    <div class="groups-block-title">Создать группу</div>
    <div class="group-form">
      <div class="group-quota-line">
        <span>создано вами: ${owned} / ${plan.groupLimit}</span>
        ${plan.key === 'l' ? '' : `<button type="button" onclick="openPricing()">улучшить →</button>`}
      </div>
      <div id="create-group-error"></div>
      ${limitReached ? `
        <button type="button" class="group-form-btn" onclick="openPricing()">Лимит групп исчерпан — улучшить план</button>
      ` : `
        <div class="field">
          <label>Название группы</label>
          <input type="text" id="new-group-name" placeholder="придумайте название">
        </div>
        <div class="group-form-checkbox" onclick="event.target.tagName!=='INPUT' && document.getElementById('new-group-has-password').click()">
          <input type="checkbox" id="new-group-has-password" checked onchange="toggleNewGroupPasswordField()">
          <label for="new-group-has-password">Защитить группу паролем</label>
        </div>
        <div class="field" id="new-group-password-field">
          <label>Пароль группы</label>
          <input type="password" id="new-group-password" placeholder="придумайте пароль">
        </div>
        <button type="button" class="group-form-btn" onclick="createGroup()">Создать группу</button>
      `}
    </div>

    <div class="groups-block-title">Сообщения в группах</div>
    <div class="group-form">
      <div class="group-quota-line">
        <span>лимит на группу: ${plan.messageLimit} сообщений</span>
        ${plan.key === 'l' ? '' : `<button type="button" onclick="openPricing()">улучшить →</button>`}
      </div>
    </div>
  `;

  panel.querySelectorAll('.recent-group-item[data-gref]').forEach(el => {
    const g = groupRefs[Number(el.dataset.gref)];
    if (!g) return;
    const open = () => {
      if (g.has_password && !unlockedGroupIds.has(g.id)) openGroupPrompt(g.name_lower, g.name);
      else enterOpenGroup(g.id);
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (ev) => {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === el) { ev.preventDefault(); open(); }
    });
    const del = el.querySelector('.recent-group-delete');
    if (del) del.addEventListener('click', (ev) => { ev.stopPropagation(); deleteGroup(g.id, g.name); });
  });
}

function toggleNewGroupPasswordField() {
  const checked = document.getElementById('new-group-has-password').checked;
  const field = document.getElementById('new-group-password-field');
  if (!field) return;
  field.classList.toggle('hidden', !checked);
  if (!checked) document.getElementById('new-group-password').value = '';
}

function openGroupPrompt(nameLower, displayName) {
  document.getElementById('join-group-name').value = displayName;
  document.getElementById('join-group-password').focus();
}

async function enterOpenGroup(groupId) {
  const epoch = authEpoch;
  // Только обновляем существующую запись о членстве. Раньше здесь был upsert: он позволял
  // «вступить» в любую группу по её id из консоли, минуя пароль.
  const { data: touched, error: recentErr } = await db.from('recent_groups')
    .update({ last_visited: new Date().toISOString() })
    .eq('user_id', currentUser.id).eq('group_id', groupId)
    .select('group_id');
  if (epoch !== authEpoch) return;
  if (recentErr) {
    await showAlert('Не удалось открыть группу: ' + recentErr.message, 'ошибка');
    return;
  }
  if (!touched || touched.length === 0) {
    await showAlert('Вы больше не состоите в этой группе. Войдите в неё снова по названию и паролю.', 'группа недоступна');
    await renderGroupsPanel();
    return;
  }
  const { data: g, error: gErr } = await db.from('groups').select(GROUP_COLUMNS).eq('id', groupId).maybeSingle();
  if (epoch !== authEpoch) return;
  if (gErr) {
    await showAlert('Не удалось загрузить группу: ' + gErr.message, 'ошибка');
    return;
  }
  if (!g) return;
  if (activeGroupId !== g.id) groupManageOpen = false;
  unlockedGroupIds.add(g.id);
  activeGroupName = g.name_lower;
  activeGroupId = g.id;
  await renderGroupsPanel();
  await renderGroupArea();
  collapseMobileSidebar();
}

function showGroupFormError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<div class="group-form-error">${escapeHtml(msg)}</div>`;
}
function clearGroupFormError(elId) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = '';
}

async function createGroup() {
  clearGroupFormError('create-group-error');
  const plan = getCurrentPlan();
  const owned = await getOwnedGroupsCount();
  if (owned >= plan.groupLimit) {
    showGroupFormError('create-group-error', 'Лимит созданных групп исчерпан для вашего тарифа.');
    return;
  }

  const name = document.getElementById('new-group-name').value.trim();
  const hasPasswordEl = document.getElementById('new-group-has-password');
  const wantsPassword = hasPasswordEl ? hasPasswordEl.checked : true;
  const password = document.getElementById('new-group-password').value;

  if (name.length < 2) { showGroupFormError('create-group-error', 'Название группы должно содержать не менее 2 символов.'); return; }
  if (wantsPassword && (!password || password.length < 4)) { showGroupFormError('create-group-error', 'Пароль группы должен содержать не менее 4 символов.'); return; }

  // пароль хешируется на сервере (bcrypt через pgcrypto)
  const epoch = authEpoch;
  const { data, error } = await db.rpc('create_group', {
    p_name: name,
    p_password: wantsPassword ? password : null,
  });
  if (epoch !== authEpoch) return;

  if (error) {
    showGroupFormError('create-group-error', error.code === '23505' ? 'Группа с таким названием уже существует.' : error.message);
    return;
  }

  const { error: recentErr } = await db.from('recent_groups').upsert({ user_id: currentUser.id, group_id: data.id, last_visited: new Date().toISOString() });
  if (recentErr) {
    showGroupFormError('create-group-error', 'Группа создана, но не добавлена в ваш список: ' + recentErr.message);
    await renderGroupsPanel();
    return;
  }
  logEvent('user_action', 'Создана группа', { group_id: data.id, name });

  groupManageOpen = false;
  activeGroupName = data.name_lower;
  activeGroupId = data.id;
  await renderGroupsPanel();
  await renderGroupArea();
  collapseMobileSidebar();
}

async function joinGroup() {
  clearGroupFormError('join-group-error');
  const name = document.getElementById('join-group-name').value.trim();
  const password = document.getElementById('join-group-password').value;

  if (!name) { showGroupFormError('join-group-error', 'Введите название группы.'); return; }

  // проверка пароля выполняется на сервере
  const epoch = authEpoch;
  // join_group_and_record проверяет пароль и записывает членство на сервере одной операцией.
  // Если миграция не применена — прежний путь (join_group + запись из клиента).
  let legacy = false;
  let { data: res, error } = await db.rpc('join_group_and_record', { p_name: name, p_password: password || null });
  if (isMissingRpc(error)) {
    legacy = true;
    ({ data: res, error } = await db.rpc('join_group', { p_name: name, p_password: password || null }));
  }
  if (epoch !== authEpoch) return;

  if (error) {
    showGroupFormError('join-group-error', 'Не удалось войти в группу: ' + error.message);
    return;
  }
  if (!res || res.status === 'not_found') {
    showGroupFormError('join-group-error', 'Группа с таким названием не найдена.');
    return;
  }
  if (res.status === 'wrong_password') {
    showGroupFormError('join-group-error', 'Неверный пароль группы.');
    return;
  }

  const g = { id: res.group_id, name_lower: res.name_lower };

  if (legacy) {
    const { error: recentErr } = await db.from('recent_groups').upsert({ user_id: currentUser.id, group_id: g.id, last_visited: new Date().toISOString() });
    if (recentErr) {
      showGroupFormError('join-group-error', 'Не удалось добавить группу в список: ' + recentErr.message);
      return;
    }
  }

  unlockedGroupIds.add(g.id);
  groupManageOpen = false;
  activeGroupName = g.name_lower;
  activeGroupId = g.id;
  document.getElementById('join-group-password').value = '';
  await renderGroupsPanel();
  await renderGroupArea();
  collapseMobileSidebar();
}

async function deleteGroup(groupId, groupName) {
  const ok = await showConfirm(
    `Удалить группу «${groupName}» без возможности восстановления? Все сообщения в ней также будут удалены.`,
    { eyebrow: 'удаление группы', confirmLabel: 'Удалить', danger: true }
  );
  if (!ok) return;

  // Всё удаление (сообщения, recent_groups, сама группа) выполняется в одной
  // транзакции на сервере: при любой ошибке откатывается целиком.
  const epoch = authEpoch;
  const { data: res, error } = await db.rpc('delete_group', { p_group_id: String(groupId) });
  if (epoch !== authEpoch) return;

  if (error || !res || res.status !== 'ok') {
    const reason = error ? error.message : 'у вас нет прав на это действие';
    await showAlert('Не удалось удалить группу: ' + reason, 'ошибка');
    return;
  }

  logEvent('user_action', 'Удалена группа', { group_id: groupId, name: groupName });
  if (String(activeGroupId) === String(groupId)) { activeGroupName = null; activeGroupId = null; groupManageOpen = false; }
  await renderGroupsPanel();
  await renderGroupArea();
  showMobileList();
}

async function forgetRecentGroup(groupId) {
  const { error } = await db.from('recent_groups').delete().eq('user_id', currentUser.id).eq('group_id', groupId);
  if (error) {
    await showAlert('Не удалось убрать группу из списка: ' + error.message, 'ошибка');
    return;
  }
  if (activeGroupId === groupId) { activeGroupName = null; activeGroupId = null; }
  await renderGroupsPanel();
  await renderGroupArea();
  showMobileList();
}

async function exitGroupView() {
  activeGroupName = null;
  activeGroupId = null;
  groupManageOpen = false;
  await renderGroupsPanel();
  await renderGroupArea();
  showMobileList();
}



async function buildGroupManagePanel(g, posts) {
  const panel = document.createElement('div');
  panel.className = 'group-manage-panel';


  const renameRow = document.createElement('div');
  renameRow.className = 'group-manage-row';
  renameRow.innerHTML = `
    <span class="group-manage-label">название</span>
    <span class="group-manage-value">${escapeHtml(g.name)}</span>
  `;
  const renameActions = document.createElement('div');
  renameActions.className = 'group-manage-actions';
  const renameBtn = document.createElement('button');
  renameBtn.type = 'button';
  renameBtn.className = 'group-manage-mini-btn';
  renameBtn.textContent = 'переименовать';
  renameBtn.onclick = () => renameGroupPrompt(g);
  renameActions.appendChild(renameBtn);
  renameRow.appendChild(renameActions);
  panel.appendChild(renameRow);


  const isProtected = !!g.has_password;
  const passRow = document.createElement('div');
  passRow.className = 'group-manage-row';
  passRow.innerHTML = `
    <span class="group-manage-label">пароль</span>
    <span class="group-manage-value">${isProtected ? 'установлен' : 'выключен'}</span>
  `;
  const passActions = document.createElement('div');
  passActions.className = 'group-manage-actions';

  if (isProtected) {
    const changeBtn = document.createElement('button');
    changeBtn.type = 'button';
    changeBtn.className = 'group-manage-mini-btn';
    changeBtn.textContent = 'сменить';
    changeBtn.onclick = () => changeGroupPasswordPrompt(g);
    passActions.appendChild(changeBtn);

    const offBtn = document.createElement('button');
    offBtn.type = 'button';
    offBtn.className = 'group-manage-mini-btn danger';
    offBtn.textContent = 'отключить';
    offBtn.onclick = () => setGroupPassword(g, null);
    passActions.appendChild(offBtn);
  } else {
    const onBtn = document.createElement('button');
    onBtn.type = 'button';
    onBtn.className = 'group-manage-mini-btn';
    onBtn.textContent = 'включить';
    onBtn.onclick = () => changeGroupPasswordPrompt(g);
    passActions.appendChild(onBtn);
  }
  passRow.appendChild(passActions);
  panel.appendChild(passRow);






  const membersWrap = document.createElement('div');
  membersWrap.className = 'group-manage-row';
  membersWrap.style.flexDirection = 'column';
  membersWrap.style.alignItems = 'stretch';

  const membersLabel = document.createElement('span');
  membersLabel.className = 'group-manage-label';
  membersLabel.textContent = 'участники';
  membersWrap.appendChild(membersLabel);

  // Список участников берём с сервера (включая тех, кто ни разу не писал: иначе владелец
  // не мог бы закрыть им доступ). Если RPC ещё нет — прежний способ, по авторам сообщений.
  const membersById = new Map();
  let emptyMembersText = 'Пока никто из участников не писал в группу.';
  const { data: memberRows, error: memberErr } = await db.rpc('list_group_members', { p_group_id: String(g.id) });
  if (!memberErr && Array.isArray(memberRows)) {
    memberRows.forEach(m => { if (m.user_id !== g.owner_id) membersById.set(m.user_id, m.display_name || '(без имени)'); });
    emptyMembersText = 'В группе пока нет других участников.';
  } else {
    posts.forEach(p => {
      if (p.author_id === g.owner_id) return;
      if (!membersById.has(p.author_id)) membersById.set(p.author_id, p.author_name);
    });
  }

  const memberList = document.createElement('div');
  memberList.className = 'group-member-list';

  if (membersById.size === 0) {
    memberList.innerHTML = `<div class="group-member-empty">${escapeHtml(emptyMembersText)}</div>`;
  } else {
    membersById.forEach((name, authorId) => {
      const row = document.createElement('div');
      row.className = 'group-member-row';
      const nameEl = document.createElement('span');
      nameEl.className = 'group-member-name';
      nameEl.textContent = name;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'group-manage-mini-btn danger';
      removeBtn.textContent = 'удалить';
      removeBtn.onclick = () => removeGroupMember(g, authorId, name);
      row.appendChild(nameEl);
      row.appendChild(removeBtn);
      memberList.appendChild(row);
    });
  }
  membersWrap.appendChild(memberList);
  panel.appendChild(membersWrap);

  return panel;
}

async function renameGroupPrompt(g) {
  const next = await showPrompt('Название группы:', g.name, { eyebrow: 'переименовать группу' });
  if (next === null) return;
  const name = next.trim();
  if (name.length < 2) { await showAlert('Название группы должно содержать не менее 2 символов.', 'ошибка'); return; }

  const { error } = await db.from('groups').update({ name }).eq('id', g.id).eq('owner_id', currentUser.id);
  if (error) {
    await showAlert(error.code === '23505' ? 'Группа с таким названием уже существует.' : 'Не удалось переименовать группу: ' + error.message, 'ошибка');
    return;
  }
  await renderGroupsPanel();
  await renderGroupArea();
}

async function changeGroupPasswordPrompt(g) {
  const next = await showPrompt('Новый пароль группы:', '', { eyebrow: 'пароль группы', password: true, confirmLabel: 'Сохранить' });
  if (next === null) return;
  if (!next || next.length < 4) { await showAlert('Пароль группы должен содержать не менее 4 символов.', 'ошибка'); return; }
  await setGroupPassword(g, next);
}

async function setGroupPassword(g, plainPassword) {
  const { data: res, error } = await db.rpc('set_group_password', {
    p_group_id: String(g.id),
    p_password: plainPassword || null,
  });
  if (error || !res || res.status !== 'ok') {
    const reason = error ? error.message : (res && res.status === 'forbidden' ? 'нет прав на это действие' : 'недопустимый пароль');
    await showAlert('Не удалось обновить пароль: ' + reason, 'ошибка');
    return;
  }
  await renderGroupsPanel();
  await renderGroupArea();
}

async function removeGroupMember(g, authorId, authorName) {
  const ok = await showConfirm(
    `Удалить участника «${authorName}» из группы? Его сообщения будут удалены, а группа пропадёт из его списка.`,
    { eyebrow: 'удаление участника', confirmLabel: 'Удалить', danger: true }
  );
  if (!ok) return;

  const epoch = authEpoch;
  // Сообщения и членство удаляются одной транзакцией на сервере
  const { data: res, error } = await db.rpc('remove_group_member', { p_group_id: String(g.id), p_user_id: authorId });
  if (epoch !== authEpoch) return;

  if (!error) {
    if (!res || res.status !== 'ok') {
      await showAlert('Не удалось удалить участника: нет прав на это действие.', 'ошибка');
      return;
    }
    await renderGroupArea();
    return;
  }
  if (!isMissingRpc(error)) {
    await showAlert('Не удалось удалить участника: ' + error.message, 'ошибка');
    return;
  }

  // миграция не применена — прежний путь (две независимые операции)
  const [postsRes, recentRes] = await Promise.all([
    db.from('group_posts').delete().eq('group_id', g.id).eq('author_id', authorId).select('id'),
    db.from('recent_groups').delete().eq('group_id', g.id).eq('user_id', authorId).select('user_id'),
  ]);
  if (epoch !== authEpoch) return;
  if (postsRes.error || recentRes.error) {
    await showAlert('Не удалось удалить участника (часть данных могла быть удалена — повторите действие): ' + (postsRes.error?.message || recentRes.error?.message), 'ошибка');
    await renderGroupArea();
    return;
  }
  await renderGroupArea();
}

async function renderGroupArea() {
  const area = document.getElementById('editor-area');

  if (!activeGroupId) {
    area.innerHTML = `<div class="editor-empty"></div>`;
    return;
  }

  area.innerHTML = `<div class="editor-empty"><div class="editor-empty-title loading-pulse">Загрузка…</div></div>`;

  const epoch = authEpoch;
  const requestedGroupId = activeGroupId;
  const [groupResult, postsResult, myCount] = await Promise.all([
    db.from('groups').select(GROUP_COLUMNS).eq('id', requestedGroupId).single(),
    db.from('group_posts').select('*').eq('group_id', requestedGroupId).order('created_at', { ascending: true }),
    getMyMessageCountInGroup(requestedGroupId),
  ]);
  // аккаунт или открытая группа сменились, пока шёл запрос — ответ устарел
  if (epoch !== authEpoch || requestedGroupId !== activeGroupId) return;

  if (groupResult.error || postsResult.error) {
    const msg = (groupResult.error || postsResult.error).message;
    area.innerHTML = `<div class="editor-empty"><div class="editor-empty-title">Не удалось загрузить группу</div><div>${escapeHtml(msg)}</div></div>`;
    return;
  }

  const g = groupResult.data;
  if (!g) {
    activeGroupName = null;
    activeGroupId = null;
    await renderGroupArea();
    return;
  }

  const isOwner = g.owner_id === currentUser.id;
  const posts = postsResult.data;
  const myLimit = getMessageLimit();
  const limitReached = myCount >= myLimit;

  area.innerHTML = '';

  const topbar = document.createElement('div');
  topbar.className = 'group-topbar';
  topbar.innerHTML = `
    <button type="button" class="mobile-back-btn group-topbar-back" onclick="exitGroupView()">← назад</button>
    <div class="group-topbar-center">
      <div class="group-topbar-title">${escapeHtml(g.name)}</div>
      <div class="group-topbar-sub">${isOwner ? 'вы создатель группы' : 'участник группы'}</div>
    </div>
    <div class="group-topbar-actions"></div>
  `;
  const topbarActions = topbar.querySelector('.group-topbar-actions');
  if (isOwner) {
    const manageBtn = document.createElement('button');
    manageBtn.type = 'button';
    manageBtn.className = 'group-manage-btn' + (groupManageOpen ? ' active' : '');
    manageBtn.textContent = 'настройки';
    manageBtn.onclick = () => { groupManageOpen = !groupManageOpen; renderGroupArea(); };
    topbarActions.appendChild(manageBtn);
  }

  area.appendChild(topbar);

  if (isOwner && groupManageOpen) {
    const manage = await buildGroupManagePanel(g, posts || []);
    area.appendChild(manage);
  }

  const feed = document.createElement('div');
  feed.className = 'group-feed';

  if (!posts || posts.length === 0) {
    feed.innerHTML = `<div class="group-feed-empty">Пока никто ничего не отправил в эту группу.<br>Будьте первым — напишите сообщение ниже.</div>`;
  } else {
    const staggerFrom = Math.max(0, posts.length - 8);
    posts.forEach((p, i) => {
      const postEl = document.createElement('div');
      postEl.className = 'group-post';
      if (i >= staggerFrom) {
        postEl.style.animationDelay = ((i - staggerFrom) * 40) + 'ms';
      } else {
        postEl.style.animation = 'none';
      }
      postEl.innerHTML = `
        <div class="group-post-head">
          <span class="group-post-author">${escapeHtml(p.author_name)}</span>
          <span class="group-post-meta">
            <button type="button" class="group-post-copy-btn">скопировать</button>
            <span class="group-post-time">${formatGroupTime(p.created_at)}</span>
          </span>
        </div>
        <div class="group-post-text"></div>
      `;
      postEl.querySelector('.group-post-text').textContent = p.text;
      const copyPostBtn = postEl.querySelector('.group-post-copy-btn');
      copyPostBtn.onclick = () => {
        copyTextToClipboard(p.text, (ok) => {
          copyPostBtn.textContent = ok ? 'скопировано ✓' : 'не удалось скопировать';
          setTimeout(() => { copyPostBtn.textContent = 'скопировать'; }, ok ? 1200 : 2000);
        });
      };
      feed.appendChild(postEl);
    });
  }

  const limitRow = document.createElement('div');
  limitRow.className = 'group-composer-limit';
  limitRow.innerHTML = `
    <span>ваши сообщения в этой группе: ${myCount} / ${myLimit}</span>
    ${limitReached ? '<button type="button" onclick="openPricing()">улучшить →</button>' : ''}
  `;

  const composer = document.createElement('div');
  composer.className = 'group-composer';
  const textarea = document.createElement('textarea');
  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  textarea.rows = 1;

  if (limitReached) {
    textarea.placeholder = 'Лимит сообщений в этой группе исчерпан для вашего тарифа.';
    textarea.disabled = true;
    sendBtn.textContent = 'Улучшить план';
    sendBtn.onclick = openPricing;
  } else {
    textarea.placeholder = 'Написать в группу «' + g.name + '»…';
    sendBtn.textContent = 'Отправить';
    sendBtn.disabled = true;
    textarea.addEventListener('input', () => {
      sendBtn.disabled = textarea.value.trim().length === 0;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    });
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendGroupPost(g.id, textarea);
      }
    });
    sendBtn.onclick = () => sendGroupPost(g.id, textarea);
  }

  composer.appendChild(textarea);
  composer.appendChild(sendBtn);

  area.appendChild(feed);
  area.appendChild(limitRow);
  area.appendChild(composer);

  const prevScrollBehavior = feed.style.scrollBehavior;
  feed.style.scrollBehavior = 'auto';
  feed.scrollTop = feed.scrollHeight;
  feed.style.scrollBehavior = prevScrollBehavior;
}

let sendingPost = false;
async function sendGroupPost(groupId, textarea) {
  const text = textarea.value.trim();
  if (!text || sendingPost) return;
  sendingPost = true;
  try {
    const epoch = authEpoch;
    const count = await getMyMessageCountInGroup(groupId);
    if (epoch !== authEpoch) return;
    if (count >= getMessageLimit()) { await renderGroupArea(); return; }

    const { error } = await db.from('group_posts').insert({
      group_id: groupId,
      author_id: currentUser.id,
      author_name: currentProfile.display_name,
      text
    });
    if (epoch !== authEpoch) return;

    if (error) { await showAlert('Не удалось отправить сообщение: ' + error.message, 'ошибка'); return; }

    textarea.value = '';
    await renderGroupArea();
  } finally {
    sendingPost = false;
  }
}

function formatGroupTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (sameDay) return time;
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ' ' + time;
}


const SIDEBAR_WIDTH_KEY = 'sidebarWidth';
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 480;

function clampSidebarWidth(w) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, w));
}

function applySidebarWidth(w) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.style.width = w + 'px';
}

function loadSidebarWidth() {
  const saved = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10);
  if (!isNaN(saved)) applySidebarWidth(clampSidebarWidth(saved));
}

function setupSidebarResize() {
  const handle = document.getElementById('sidebar-resize-handle');
  const sidebar = document.getElementById('sidebar');
  if (!handle || !sidebar) return;

  let dragging = false;

  function onPointerMove(e) {
    if (!dragging) return;
    const rect = sidebar.getBoundingClientRect();
    const width = clampSidebarWidth(e.clientX - rect.left);
    applySidebarWidth(width);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('resizing');
    document.body.classList.remove('sidebar-resizing');
    const currentWidth = sidebar.getBoundingClientRect().width;
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(currentWidth)));
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  handle.addEventListener('pointerdown', (e) => {
    if (window.innerWidth <= 760) return;
    dragging = true;
    handle.classList.add('resizing');
    document.body.classList.add('sidebar-resizing');
    e.preventDefault();
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  });

  handle.addEventListener('dblclick', () => {
    if (window.innerWidth <= 760) return;
    sidebar.style.width = '';
    localStorage.removeItem(SIDEBAR_WIDTH_KEY);
  });
}


(async function init() {
  loadTheme();
  setupSpearSwingFeature();
  setupWallpaperResizeWatcher();
  loadSidebarWidth();
  setupSidebarResize();
  switchTab('login');
  setupPasswordRecoveryListener();






  if (passwordRecoveryLinkPresent()) {
    switchTab('reset');
  }

  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    if (data.session && !passwordRecoveryLinkPresent()) {
      const entered = await enterApp(data.session.user);
      if (entered) await checkReturnFromYoomoney();
    }
  } catch (err) {
    console.error('Session restore failed:', err);
    showError('Не удалось восстановить сессию: ' + translateAuthError(err && err.message ? err.message : 'ошибка сети') + ' Войдите заново.');
  }
})();
