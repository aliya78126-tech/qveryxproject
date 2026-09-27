
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


function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'h' + hash.toString(36) + str.length;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}



function copyTextToClipboard(text, onDone) {
  const fallbackCopy = () => {
    const tmp = document.createElement('textarea');
    tmp.value = text;
    tmp.style.position = 'fixed';
    tmp.style.opacity = '0';
    document.body.appendChild(tmp);
    tmp.select();
    try { document.execCommand('copy'); } catch (err) {  }
    document.body.removeChild(tmp);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => onDone && onDone(true)).catch(() => {
      fallbackCopy();
      onDone && onDone(true);
    });
  } else {
    fallbackCopy();
    onDone && onDone(true);
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






async function logEvent(category, message, meta) {
  try {
    await db.from('event_logs').insert({
      category,
      message,
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



function loadTheme() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || 'null'); } catch (e) { saved = null; }
  if (!saved) return;
  const { values } = enforceThemeContrast({ ...getDefaultThemeValues(), ...saved });
  THEME_VARS.forEach(v => {
    if (values[v.key]) document.documentElement.style.setProperty(v.key, values[v.key]);
  });
  applySpearCursorSetting(saved.customCursorSpear);
  setupSpearSwingFeature();
  applyWallpaperSetting(saved.wallpaperId || null);
}





function loadThemeForAccount() {
  const saved = currentProfile && currentProfile.theme;
  if (!saved || typeof saved !== 'object') return;
  const { values } = enforceThemeContrast({ ...getDefaultThemeValues(), ...saved });
  THEME_VARS.forEach(v => {
    if (values[v.key]) document.documentElement.style.setProperty(v.key, values[v.key]);
  });
  applySpearCursorSetting(saved.customCursorSpear);
  setupSpearSwingFeature();
  applyWallpaperSetting(saved.wallpaperId || null);
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





function saveCurrentTheme() {
  const values = getCurrentThemeValues();

  if (!currentUser) {
    try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(values)); } catch (e) {  }
    return;
  }

  if (currentProfile) currentProfile.theme = values;

  if (themeSaveTimer) clearTimeout(themeSaveTimer);
  themeSaveTimer = setTimeout(async () => {
    themeSaveTimer = null;
    const { error } = await db.from('profiles').update({ theme: values }).eq('id', currentUser.id);
    if (error) {
      const el = document.getElementById('theme-warning');
      if (el) {
        el.innerHTML = `<div class="theme-warning-box"><div>Не удалось сохранить оформление на аккаунте: ${escapeHtml(error.message)}</div></div>`;
      }
    }
  }, THEME_SAVE_DEBOUNCE_MS);
}

async function resetTheme() {
  THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v.key));
  applySpearCursorSetting(false);
  setupSpearSwingFeature();
  applyWallpaperSetting(null);
  if (currentUser) {
    if (currentProfile) currentProfile.theme = null;
    if (themeSaveTimer) { clearTimeout(themeSaveTimer); themeSaveTimer = null; }
    await db.from('profiles').update({ theme: null }).eq('id', currentUser.id);
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
    <div class="theme-save-note">Оформление хранится локально в этом браузере и не влияет на других пользователей. Слишком похожие цвета автоматически корректируются, чтобы текст и кнопки оставались читаемыми.</div>
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
      options: { data: { display_name: displayName } }
    });

    hideEmailPendingModal();

    if (error) {
      showError(translateAuthError(error.message));
      logEvent('auth', 'Ошибка регистрации: ' + error.message, { email, displayName });
      return;
    }

    logEvent('auth', 'Регистрация', { email, displayName });
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
      logEvent('auth', 'Ошибка входа: ' + error.message, { email });
      return;
    }

    await enterApp(data.user);
    logEvent('auth', 'Вход выполнен', { email });
    document.getElementById('login-form').reset();
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
      document.getElementById('auth-screen').classList.remove('hidden');
      document.getElementById('app').classList.add('hidden');
      switchTab('reset');
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

async function handleLogout() {
  const ok = await confirmDiscardIfDirty();
  if (!ok) return;

  await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  notes = [];
  activeNoteId = null;
  unlockedNoteId = null;
  activeGroupName = null;
  activeGroupId = null;
  unlockedGroupIds.clear();
  currentSection = 'notes';
  showMobileList();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  switchTab('login');


  THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v.key));
  loadTheme();
  setupSpearSwingFeature();
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



async function enterApp(user) {
  currentUser = user;

  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {

    let retryProfile = null;
    for (let i = 0; i < 5 && !retryProfile; i++) {
      await new Promise(r => setTimeout(r, 500));
      const retry = await db.from('profiles').select('*').eq('id', user.id).single();
      if (retry.data) retryProfile = retry.data;
    }
    currentProfile = retryProfile || { id: user.id, display_name: user.email, plan: 'free' };
  } else {
    currentProfile = profile;
  }

  if (currentProfile.banned) {
    await db.auth.signOut();
    currentUser = null;
    currentProfile = null;
    unlockedGroupIds.clear();
    showError('Этот аккаунт заблокирован администратором.');
    return;
  }

  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('current-username').textContent = currentProfile.display_name;
  renderUserId();
  document.getElementById('admin-row').classList.toggle('hidden', !currentProfile.is_admin);
  loadThemeForAccount();

  activeGroupName = null;
  activeGroupId = null;
  currentSection = 'notes';
  showMobileList();
  document.getElementById('tab-section-notes').classList.add('active');
  document.getElementById('tab-section-groups').classList.remove('active');
  document.getElementById('notes-section').classList.remove('hidden');
  document.getElementById('groups-panel').classList.add('hidden');

  await loadNotes();
  renderSidebar();
  renderEditor();
}

async function loadNotes() {
  const { data, error } = await db
    .from('notes')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  notes = error ? [] : data;
  activeNoteId = notes.length > 0 ? notes[0].id : null;
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
        note.pinned = !note.pinned;
        await db.from('notes').update({ pinned: note.pinned }).eq('id', note.id);
        await loadNotes();
        activeNoteId = note.id;
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
  if (next === null) return;
  note.title = next.trim();
  await db.from('notes').update({ title: note.title, updated_at: new Date().toISOString() }).eq('id', id);
  await loadNotes();
  activeNoteId = id;
  renderSidebar();
  if (activeNoteId === id) renderEditor();
}



function renderEditor() {
  const area = document.getElementById('editor-area');
  area.innerHTML = '';

  const note = notes.find(n => n.id === activeNoteId);
  const plan = getCurrentPlan();

  if (!note) {
    area.innerHTML = `<div class="editor-empty"></div>`;
    return;
  }

  if (plan.perks.lockNote && note.locked && note.id !== unlockedNoteId) {
    area.innerHTML = `
      <div class="editor-empty">
        <div class="editor-empty-title">🔒 Заметка защищена паролем</div>
        <div>Введите пароль, чтобы открыть «${escapeHtml(note.title || 'без названия')}».</div>
        <input type="password" id="unlock-input" class="unlock-input">
        <button type="button" onclick="tryUnlockNote('${note.id}')">Открыть</button>
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
    copyTextToClipboard(textarea.value, () => {
      copyBtn.textContent = 'скопировано ✓';
      setTimeout(() => { copyBtn.textContent = 'скопировать'; }, 1200);
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

  // baseline snapshot for "unsaved changes" comparison
  noteSavedSnapshot = { title: note.title || '', content: note.content || '', tag: note.tag || '' };
  noteHasUnsavedChanges = false;

  textarea.oninput = () => {
    if (textarea.value.length > charLimit) {

      const trimmedValue = textarea.value.slice(0, charLimit);
      const cursorAtEnd = textarea.selectionStart === textarea.value.length;
      textarea.value = trimmedValue + (cursorAtEnd ? '' : textarea.value.slice(trimmedValue.length));
      if (cursorAtEnd) textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
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
  if (window.innerWidth > 760) textarea.focus();
}

let unlockedNoteIdTemp = null;

function tryUnlockNote(id) {
  const note = notes.find(n => n.id === id);
  const input = document.getElementById('unlock-input');
  if (!note || !input) return;
  if (input.value === note.lock_password) {
    unlockedNoteId = id;
    renderEditor();
  } else {
    input.style.borderColor = 'var(--error)';
    input.value = '';
    input.placeholder = 'неверный пароль';
  }
}

async function toggleLock(note) {
  if (note.locked) {
    note.locked = false;
    note.lock_password = null;
  } else {
    const pass = await showPrompt('Придумайте пароль для этой заметки:', '', { eyebrow: 'защита паролем', password: true, confirmLabel: 'Поставить' });
    if (!pass) return;
    note.locked = true;
    note.lock_password = pass;
  }
  await db.from('notes').update({ locked: note.locked, lock_password: note.lock_password }).eq('id', note.id);
  renderSidebar();
  renderEditor();
}

async function exportNote(note) {
  const filename = (note.title && note.title.trim() ? note.title.trim() : 'без названия') + '.txt';
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

  if (error || !history || history.length === 0) {
    await showAlert('История версий пока пуста — она начнёт заполняться по мере редактирования.', 'история версий');
    return;
  }

  const idx = await showHistoryPicker(history);
  if (idx === null) return;
  if (idx >= 0 && idx < history.length) {
    note.content = history[idx].content;
    await db.from('notes').update({ content: note.content, updated_at: new Date().toISOString() }).eq('id', note.id);
    await loadNotes();
    activeNoteId = note.id;
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



async function createNote() {
  if (notes.length >= getNoteLimit()) return;
  const ok = await confirmDiscardIfDirty();
  if (!ok) return;

  const { data, error } = await db
    .from('notes')
    .insert({ user_id: currentUser.id, title: '', content: '', tag: '' })
    .select()
    .single();

  if (error) { await showAlert('Не удалось создать заметку: ' + error.message, 'ошибка'); return; }

  logEvent('user_action', 'Создана заметка', { note_id: data.id });
  await loadNotes();
  activeNoteId = data.id;
  renderSidebar();
  renderEditor();
  collapseMobileSidebar();
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

async function deleteNote(id) {
  const ok = await showConfirm('Удалить эту заметку без возможности восстановления?', { eyebrow: 'удаление заметки', confirmLabel: 'Удалить', danger: true });
  if (!ok) return;

  const { error } = await db
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', currentUser.id);

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

  const { error } = await db
    .from('notes')
    .delete()
    .in('id', ids)
    .eq('user_id', currentUser.id);

  if (error) {
    await showAlert('Не удалось удалить заметки: ' + error.message, 'ошибка');
    return;
  }

  notes = notes.filter(n => !selectedNoteIds.has(n.id));
  if (selectedNoteIds.has(activeNoteId)) {
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

async function saveNote(note) {
  if (!note) note = notes.find(n => n.id === activeNoteId);
  if (!note) return;

  const statusEl = document.getElementById('save-status');
  const btn = document.getElementById('save-note-btn');
  if (statusEl) {
    statusEl.textContent = 'сохранение…';
    statusEl.classList.remove('saved', 'unsaved');
  }
  if (btn) btn.disabled = true;

  const nowIso = new Date().toISOString();
  note.updated_at = nowIso;

  const { error } = await db.from('notes').update({
    title: note.title, content: note.content, tag: note.tag, updated_at: nowIso
  }).eq('id', note.id);

  if (error) {
    if (statusEl) {
      statusEl.textContent = 'ошибка сохранения';
      statusEl.classList.add('unsaved');
    }
    if (btn) btn.disabled = false;
    await showAlert('Не удалось сохранить заметку: ' + error.message, 'ошибка');
    return false;
  }

  if (getCurrentPlan().perks.history) {
    await db.from('note_history').insert({ note_id: note.id, content: note.content });
  }

  noteHasUnsavedChanges = false;
  noteSavedSnapshot = { title: note.title || '', content: note.content || '', tag: note.tag || '' };

  const el = document.getElementById('save-status');
  if (el) {
    el.textContent = formatUpdated(nowIso);
    el.classList.add('saved');
    el.classList.remove('unsaved');
  }
  const btn2 = document.getElementById('save-note-btn');
  if (btn2) { btn2.disabled = false; btn2.classList.remove('has-changes'); }

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
    return await saveNote(note);
  }
  if (choice === 'discard') {
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
  await setUserPlan('free');
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

async function confirmCustomPayment(limits, perks, addOnPrice) {
  if (addOnPrice <= 0) {


    currentProfile.limit_notes = limits.limit_notes;
    currentProfile.limit_chars = limits.limit_chars;
    currentProfile.limit_groups = limits.limit_groups;
    currentProfile.limit_messages = limits.limit_messages;
    currentProfile.custom_perks = perks;
    currentProfile.custom_price = 0;

    const { error } = await db.from('profiles').update({
      limit_notes: limits.limit_notes,
      limit_chars: limits.limit_chars,
      limit_groups: limits.limit_groups,
      limit_messages: limits.limit_messages,
      custom_perks: perks,
      custom_price: 0
    }).eq('id', currentUser.id);

    if (error) {
      await showAlert('Не удалось сохранить лимиты: ' + error.message, 'ошибка сохранения');
      return;
    }

    showPaymentSuccess({ name: 'Кастомный план', price: 0 }, 'Лимиты обновлены — доплата не требовалась.');
    renderSidebar();
    renderEditor();
    if (currentSection === 'groups') { renderGroupsPanel(); renderGroupArea(); }
    return;
  }

  const label = await buildYoomoneyCheckout({
    amount: addOnPrice,
    kind: 'custom',
    customPayload: { limits, perks },
  });
  if (!label) return;
  redirectToYoomoney(label, addOnPrice, 'Тетрадь — докупка лимитов');
}



function generatePaymentLabel() {



  return 'pay_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

async function buildYoomoneyCheckout({ amount, kind, planKey, customPayload }) {
  const label = generatePaymentLabel();

  const { error } = await db.from('payments').insert({
    user_id: currentUser.id,
    label,
    kind,
    plan_key: planKey || null,
    custom_payload: customPayload || null,
    amount,
    status: 'pending',
  });

  if (error) {
    await showAlert('Не удалось создать заказ на оплату: ' + error.message + '\n\nПроверьте, что в базе создана таблица payments (см. инструкцию в исходном коде страницы).', 'ошибка');
    logEvent('payment', 'Ошибка создания заказа: ' + error.message, { kind, planKey, amount });
    return null;
  }

  logEvent('payment', 'Создан заказ на оплату', { label, kind, planKey, amount });
  return label;
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
    const { data: payment } = await db.from('payments').select('*').eq('label', label).single();

    if (payment && payment.status === 'paid') {
      const { data: freshProfile } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
      if (freshProfile) currentProfile = freshProfile;

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
  const label = await buildYoomoneyCheckout({ amount: p.price, kind: 'plan', planKey });
  if (!label) return;
  redirectToYoomoney(label, p.price, `Тетрадь — план «${p.name}»`);
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





async function setUserPlan(planKey) {
  currentProfile.plan = planKey;
  const clearFields = { plan: planKey, custom_perks: null, custom_price: 0 };
  LIMIT_OVERRIDE_FIELDS.forEach(f => { clearFields[f.column] = null; currentProfile[f.column] = null; });
  currentProfile.custom_perks = null;
  currentProfile.custom_price = 0;
  await db.from('profiles').update(clearFields).eq('id', currentUser.id);
}



let adminLookupResult = null;
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
  let query = db.from('event_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (adminLogsCategory !== 'all') query = query.eq('category', adminLogsCategory);
  const { data, error } = await query;

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
    <div class="admin-log-row admin-log-cat-${escapeHtml(row.category)}">
      <div class="admin-log-row-top">
        <span class="admin-log-time">${time}</span>
        <span class="admin-log-cat">${escapeHtml(catLabel)}</span>
        <span class="admin-log-source">${row.source === 'webhook' ? 'webhook' : 'клиент'}</span>
      </div>
      <div class="admin-log-message">${escapeHtml(row.message)}</div>
      ${row.user_id ? `<div class="admin-log-user" onclick="selectAdminUserById('${row.user_id}')">пользователь: ${userName ? escapeHtml(userName) + ' · ' : ''}${escapeHtml(row.user_id)}</div>` : ''}
      ${metaStr ? `<div class="admin-log-meta">${escapeHtml(metaStr)}</div>` : ''}
    </div>
  `;
}

async function runAdminSearch() {
  const query = document.getElementById('admin-search-input').value.trim();
  if (!query) return;

  const resultEl = document.getElementById('admin-result');
  resultEl.innerHTML = `<div class="admin-empty loading-pulse">Поиск…</div>`;


  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

  let rows = [];
  if (looksLikeUuid) {
    const { data } = await db.from('profiles').select('*').eq('id', query).limit(1);
    rows = data || [];
  } else {
    const { data } = await db.from('profiles').select('*').ilike('display_name', `%${query}%`).limit(10);
    rows = data || [];
  }

  if (rows.length === 0) {
    resultEl.innerHTML = `<div class="admin-empty">Никого не найдено. Проверьте ID или имя.</div>`;
    return;
  }

  if (rows.length === 1) {
    await loadAdminUser(rows[0]);
    return;
  }


  resultEl.innerHTML = rows.map(r => `
    <div class="recent-group-item" onclick="selectAdminUserById('${r.id}')">
      <span class="recent-group-name">${escapeHtml(r.display_name || '(без имени)')}</span>
      <span class="recent-group-owner-tag" style="border-color:var(--line); color:var(--text-dim);">${r.plan || 'free'}</span>
    </div>
  `).join('');
}

async function selectAdminUserById(id) {
  const { data } = await db.from('profiles').select('*').eq('id', id).single();
  if (data) await loadAdminUser(data);
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
  resultEl.innerHTML = `<div class="admin-empty loading-pulse">Загрузка данных…</div>`;

  const [{ count: noteCount }, { count: groupCount }, { data: noteRows }] = await Promise.all([
    db.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
    db.from('groups').select('id', { count: 'exact', head: true }).eq('owner_id', u.id),
    db.from('notes').select('id, title, updated_at').eq('user_id', u.id).order('updated_at', { ascending: false }).limit(20)
  ]);

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
      <div class="admin-user-id">id: ${u.id}</div>

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
            onclick="adminSetPlan('${u.id}', '${key}')">${PLANS[key].name}</button>
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
              <button type="button" class="admin-limit-reset-btn" ${isOverridden ? '' : 'disabled'} onclick="adminResetLimitField('${u.id}', '${f.column}')">сбросить</button>
            </div>
          </div>
        `;
      }).join('')}
      <div class="admin-plan-btns">
        <button type="button" class="admin-plan-btn" style="border-color:var(--accent); color:var(--accent);" onclick="adminSaveLimitOverrides('${u.id}')">Сохранить лимиты</button>
      </div>

      <div class="admin-section-title">Доступ</div>
      <div class="admin-toggle-row">
        <div>
          <div class="admin-toggle-label">Блокировка входа</div>
          <div class="admin-toggle-sub">Заблокированный пользователь не сможет пользоваться аккаунтом.</div>
        </div>
        <button type="button" class="admin-toggle-btn${u.banned ? ' on' : ''}" onclick="adminToggleBan('${u.id}', ${!u.banned})">
          ${u.banned ? 'разблокировать' : 'заблокировать'}
        </button>
      </div>
      <div class="admin-toggle-row">
        <div>
          <div class="admin-toggle-label">Права администратора</div>
          <div class="admin-toggle-sub">Доступ к этой панели для данного пользователя.</div>
        </div>
        <button type="button" class="admin-toggle-btn${u.is_admin ? ' admin-on' : ''}" ${isSelf ? 'disabled title="Нельзя снять доступ у самого себя"' : ''} onclick="adminToggleAdmin('${u.id}', ${!u.is_admin})">
          ${u.is_admin ? 'снять права' : 'сделать админом'}
        </button>
      </div>

      <div class="admin-section-title">Заметки пользователя (последние 20)</div>
      ${notesHtml}

      <div class="admin-danger-row">
        <button type="button" class="admin-danger-btn" onclick="adminResetPlanConfirm('${u.id}')">Сбросить план на Free</button>
      </div>
    </div>
  `;
}

async function adminSetPlan(userId, planKey) {
  const { error } = await db.from('profiles').update({ plan: planKey }).eq('id', userId);
  if (error) {
    await showAlert('Не удалось изменить план: ' + error.message + '\n\nПроверьте, что в Supabase настроена RLS-политика, разрешающая администраторам обновлять чужие профили.', 'ошибка доступа');
    return;
  }
  adminLookupResult.plan = planKey;
  if (userId === currentUser.id) {
    currentProfile.plan = planKey;
    renderSidebar();
    renderEditor();
  }
  await renderAdminUserCard();
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

  const { error } = await db.from('profiles').update(updates).eq('id', userId);
  if (error) {
    await showAlert('Не удалось сохранить лимиты: ' + error.message + '\n\nПроверьте, что в таблице profiles есть колонки limit_notes, limit_chars, limit_groups, limit_messages.', 'ошибка сохранения');
    return;
  }
  Object.assign(adminLookupResult, updates);
  if (userId === currentUser.id) {
    Object.assign(currentProfile, updates);
    renderSidebar();
    renderEditor();
  }
  await renderAdminUserCard();
}

async function adminResetLimitField(userId, column) {
  const { error } = await db.from('profiles').update({ [column]: null }).eq('id', userId);
  if (error) {
    await showAlert('Не удалось сбросить лимит: ' + error.message, 'ошибка сохранения');
    return;
  }
  adminLookupResult[column] = null;
  if (userId === currentUser.id) {
    currentProfile[column] = null;
    renderSidebar();
    renderEditor();
  }
  await renderAdminUserCard();
}

async function adminResetPlanConfirm(userId) {
  const ok = await showConfirm('Сбросить план этого пользователя на Free?', { eyebrow: 'сброс плана', confirmLabel: 'Сбросить', danger: true });
  if (!ok) return;
  await adminSetPlan(userId, 'free');
}

async function adminToggleBan(userId, nextValue) {
  const { error } = await db.from('profiles').update({ banned: nextValue }).eq('id', userId);
  if (error) {
    await showAlert('Не удалось изменить статус блокировки: ' + error.message, 'ошибка доступа');
    return;
  }
  adminLookupResult.banned = nextValue;
  await renderAdminUserCard();
}

async function adminToggleAdmin(userId, nextValue) {
  if (userId === currentUser.id) return;
  const ok = await showConfirm(nextValue ? 'Выдать этому пользователю права администратора?' : 'Забрать права администратора у этого пользователя?', { eyebrow: 'права доступа', confirmLabel: 'Подтвердить', danger: !nextValue });
  if (!ok) return;
  const { error } = await db.from('profiles').update({ is_admin: nextValue }).eq('id', userId);
  if (error) {
    await showAlert('Не удалось изменить права: ' + error.message, 'ошибка доступа');
    return;
  }
  adminLookupResult.is_admin = nextValue;
  await renderAdminUserCard();
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




  const [owned, recentResult] = await Promise.all([
    getOwnedGroupsCount(),
    db
      .from('recent_groups')
      .select('group_id, last_visited, groups(id, name, name_lower, owner_id, password_hash)')
      .eq('user_id', currentUser.id)
      .order('last_visited', { ascending: false })
      .limit(30),
  ]);

  const limitReached = owned >= plan.groupLimit;
  const recentRows = recentResult.data;

  const recent = (recentRows || []).filter(r => r.groups);
  const myGroups = recent.filter(r => r.groups.owner_id === currentUser.id);
  const otherGroups = recent.filter(r => r.groups.owner_id !== currentUser.id);

  function renderGroupItem(r, i) {
    const g = r.groups;
    const isProtected = !!g.password_hash;
    const isOwn = g.owner_id === currentUser.id;
    const delay = Math.min(i * 30, 240);
    const alreadyUnlocked = isProtected && unlockedGroupIds.has(g.id);
    const clickHandler = (isProtected && !alreadyUnlocked)
      ? `openGroupPrompt('${g.name_lower.replace(/'/g,"\\'")}', '${escapeHtml(g.name).replace(/'/g,"\\'")}')`
      : `enterOpenGroup('${g.id}')`;
    return `
      <div class="recent-group-item${g.name_lower === activeGroupName ? ' active' : ''}" style="animation-delay:${delay}ms" onclick="${clickHandler}">
        <span class="recent-group-name">${escapeHtml(g.name)}</span>
        ${!isProtected ? '<span class="group-lock-tag">без пароля</span>' : ''}
        ${isOwn ? `<button type="button" class="recent-group-delete" title="Удалить группу" aria-label="Удалить группу" onclick="event.stopPropagation(); deleteGroup('${g.id}', '${escapeHtml(g.name).replace(/'/g,"\\'")}')">✕</button>` : ''}
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
  await db.from('recent_groups').upsert({ user_id: currentUser.id, group_id: groupId, last_visited: new Date().toISOString() });
  const { data: g } = await db.from('groups').select('*').eq('id', groupId).maybeSingle();
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

  const { data, error } = await db
    .from('groups')
    .insert({ name, password_hash: wantsPassword ? simpleHash(password) : null, owner_id: currentUser.id })
    .select()
    .single();

  if (error) {
    showGroupFormError('create-group-error', error.code === '23505' ? 'Группа с таким названием уже существует.' : error.message);
    return;
  }

  await db.from('recent_groups').upsert({ user_id: currentUser.id, group_id: data.id, last_visited: new Date().toISOString() });
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

  const { data: g, error } = await db
    .from('groups')
    .select('*')
    .eq('name_lower', name.toLowerCase())
    .maybeSingle();

  if (error || !g) {
    showGroupFormError('join-group-error', 'Группа с таким названием не найдена.');
    return;
  }

  const isProtected = !!g.password_hash;
  if (isProtected && (!password || g.password_hash !== simpleHash(password))) {
    showGroupFormError('join-group-error', 'Неверный пароль группы.');
    return;
  }

  await db.from('recent_groups').upsert({ user_id: currentUser.id, group_id: g.id, last_visited: new Date().toISOString() });

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



  await Promise.all([
    db.from('group_posts').delete().eq('group_id', groupId),
    db.from('recent_groups').delete().eq('group_id', groupId),
  ]);

  const { error } = await db
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('owner_id', currentUser.id);

  if (error) {
    await showAlert('Не удалось удалить группу: ' + error.message, 'ошибка');
    return;
  }

  logEvent('user_action', 'Удалена группа', { group_id: groupId, name: groupName });
  if (activeGroupId === groupId) { activeGroupName = null; activeGroupId = null; }
  await renderGroupsPanel();
  await renderGroupArea();
  showMobileList();
}

async function forgetRecentGroup(groupId) {
  await db.from('recent_groups').delete().eq('user_id', currentUser.id).eq('group_id', groupId);
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


  const isProtected = !!g.password_hash;
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

  const membersById = new Map();
  posts.forEach(p => {
    if (p.author_id === g.owner_id) return;
    if (!membersById.has(p.author_id)) membersById.set(p.author_id, p.author_name);
  });

  const memberList = document.createElement('div');
  memberList.className = 'group-member-list';

  if (membersById.size === 0) {
    memberList.innerHTML = `<div class="group-member-empty">Пока никто из участников не писал в группу.</div>`;
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
  const password_hash = plainPassword ? simpleHash(plainPassword) : null;
  const { error } = await db.from('groups').update({ password_hash }).eq('id', g.id).eq('owner_id', currentUser.id);
  if (error) {
    await showAlert('Не удалось обновить пароль: ' + error.message, 'ошибка');
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

  const [postsRes, recentRes] = await Promise.all([
    db.from('group_posts').delete().eq('group_id', g.id).eq('author_id', authorId).select('id'),
    db.from('recent_groups').delete().eq('group_id', g.id).eq('user_id', authorId).select('user_id'),
  ]);

  if (postsRes.error || recentRes.error) {
    await showAlert('Не удалось удалить участника: ' + (postsRes.error?.message || recentRes.error?.message), 'ошибка');
    return;
  }

  if ((postsRes.data || []).length === 0) {
    await showAlert('Участник не был удалён: недостаточно прав на удаление его сообщений. Проверьте политику доступа (RLS) для таблицы group_posts — владельцу группы нужно разрешить удаление чужих постов в своей группе.', 'ошибка');
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




  const [groupResult, postsResult, myCount] = await Promise.all([
    db.from('groups').select('*').eq('id', activeGroupId).single(),
    db.from('group_posts').select('*').eq('group_id', activeGroupId).order('created_at', { ascending: true }),
    getMyMessageCountInGroup(activeGroupId),
  ]);

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
        copyTextToClipboard(p.text, () => {
          copyPostBtn.textContent = 'скопировано ✓';
          setTimeout(() => { copyPostBtn.textContent = 'скопировать'; }, 1200);
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

async function sendGroupPost(groupId, textarea) {
  const text = textarea.value.trim();
  if (!text) return;

  const count = await getMyMessageCountInGroup(groupId);
  if (count >= getMessageLimit()) { await renderGroupArea(); return; }

  const { error } = await db.from('group_posts').insert({
    group_id: groupId,
    author_id: currentUser.id,
    author_name: currentProfile.display_name,
    text
  });

  if (error) { await showAlert('Не удалось отправить сообщение: ' + error.message, 'ошибка'); return; }

  textarea.value = '';
  await renderGroupArea();
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

  const { data } = await db.auth.getSession();
  if (data.session && !passwordRecoveryLinkPresent()) {
    await enterApp(data.session.user);
    await checkReturnFromYoomoney();
  }
})();
