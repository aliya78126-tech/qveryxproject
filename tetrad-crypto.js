/*
 * tetrad-crypto.js — шифрование заметок и групп, формат v1.
 * Только Web Crypto API (без внешних библиотек). Все секреты живут в памяти вкладки.
 *
 * Модель ключей (см. ENCRYPTION_DESIGN.md):
 *   пароль ──PBKDF2-HMAC-SHA-256(salt, iter)──► KEK (AES-256)
 *   DEK (случайный AES-256) ──AES-GCM(KEK)──► dek_user            (открывает пользователь)
 *   DEK ──RSA-OAEP-SHA-256(публичный ключ администратора)──► dek_admin  (открывает владелец сайта)
 *   содержимое ──AES-GCM(DEK, случайный nonce 96 бит, AAD)──► ct
 *
 * ВАЖНО: здесь только ПУБЛИЧНЫЙ ключ администратора. Приватный ключ никогда не попадает в сайт.
 */
(function (global) {
  'use strict';

  // ====== КОНФИГУРАЦИЯ АДМИНИСТРАТОРСКОГО КЛЮЧА ======
  // Вставьте вывод `python admin_tool.py keygen` (поле spki_b64). Пока пусто — шифрование
  // НЕ включается (fail closed): без ключа администратора данные зашифровать нельзя.
  const ADMIN_PUBLIC_KEY_SPKI_B64 = '';

  const FORMAT_VERSION = 1;
  const PBKDF2_ITERATIONS = 600000;        // OWASP 2023 для PBKDF2-HMAC-SHA-256
  const PBKDF2_MIN_ITERATIONS = 300000;    // ниже — считаем запись подозрительной
  const PBKDF2_MAX_ITERATIONS = 3000000;   // защита от DoS подделанным параметром
  const SALT_BYTES = 16;
  const NONCE_BYTES = 12;                  // 96 бит
  const KEY_BITS = 256;
  const MAX_B64_CHARS = 8 * 1024 * 1024;
  // ключи групп сами служат KEK для цепочки «prev», поэтому нужны wrapKey/unwrapKey
  const KEY_USAGES = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];

  const subtle = global.crypto && global.crypto.subtle;
  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8', { fatal: true });

  class CryptoFailure extends Error {
    // code: 'unavailable' | 'no_admin_key' | 'bad_format' | 'wrong_password' | 'corrupt'
    constructor(code, message) { super(message); this.name = 'CryptoFailure'; this.code = code; }
  }

  // ---------- base64 ----------
  function b64encode(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64decode(str) {
    if (typeof str !== 'string' || str.length > MAX_B64_CHARS || !/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
      throw new CryptoFailure('bad_format', 'Некорректные данные');
    }
    const s = atob(str);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function randomBytes(n) { const b = new Uint8Array(n); global.crypto.getRandomValues(b); return b; }
  const ctx = (...parts) => enc.encode(['tetrad', 'v' + FORMAT_VERSION, ...parts.map(String)].join('/'));

  function requireSubtle() {
    if (!subtle) throw new CryptoFailure('unavailable', 'Шифрование недоступно: нужен HTTPS и современный браузер.');
  }

  // ---------- ключ администратора ----------
  let adminKeyPromise = null;
  async function adminKey() {
    requireSubtle();
    if (!ADMIN_PUBLIC_KEY_SPKI_B64) {
      throw new CryptoFailure('no_admin_key', 'Шифрование не настроено: не задан публичный ключ администратора.');
    }
    if (!adminKeyPromise) {
      adminKeyPromise = (async () => {
        const der = b64decode(ADMIN_PUBLIC_KEY_SPKI_B64);
        const key = await subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['wrapKey']);
        const kid = await keyId(der);
        return { key, kid };
      })();
    }
    return adminKeyPromise;
  }
  async function keyId(spkiDer) {
    const h = new Uint8Array(await subtle.digest('SHA-256', spkiDer));
    return Array.from(h.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function isConfigured() { return !!subtle && !!ADMIN_PUBLIC_KEY_SPKI_B64; }
  async function adminKeyId() { return (await adminKey()).kid; }

  // ---------- KDF ----------
  function newKdfParams() {
    return { name: 'PBKDF2', hash: 'SHA-256', iter: PBKDF2_ITERATIONS, salt: b64encode(randomBytes(SALT_BYTES)) };
  }
  function checkKdf(kdf) {
    if (!kdf || kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256' ||
        !Number.isInteger(kdf.iter) || kdf.iter < PBKDF2_MIN_ITERATIONS || kdf.iter > PBKDF2_MAX_ITERATIONS) {
      throw new CryptoFailure('bad_format', 'Неподдерживаемые параметры ключа');
    }
    const salt = b64decode(kdf.salt);
    if (salt.length < 16 || salt.length > 64) throw new CryptoFailure('bad_format', 'Некорректная соль');
    return salt;
  }
  async function deriveKek(password, kdf) {
    requireSubtle();
    if (typeof password !== 'string' || password.length === 0) throw new CryptoFailure('wrong_password', 'Введите пароль');
    const salt = checkKdf(kdf);
    const base = await subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: kdf.iter },
      base, { name: 'AES-GCM', length: KEY_BITS }, false, ['wrapKey', 'unwrapKey']
    );
  }

  // ---------- обёртка ключа AES-GCM (raw key ↔ {nonce, ct}) ----------
  async function wrapWithKek(kek, keyToWrap, aad) {
    const nonce = randomBytes(NONCE_BYTES);
    const ct = await subtle.wrapKey('raw', keyToWrap, kek, { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 });
    return { nonce: b64encode(nonce), ct: b64encode(ct) };
  }
  async function unwrapWithKek(kek, wrapped, aad, extractable) {
    try {
      return await subtle.unwrapKey('raw', b64decode(wrapped.ct), kek,
        { name: 'AES-GCM', iv: b64decode(wrapped.nonce), additionalData: aad, tagLength: 128 },
        { name: 'AES-GCM', length: KEY_BITS }, !!extractable, KEY_USAGES);
    } catch (e) {
      if (e instanceof CryptoFailure) throw e;
      throw new CryptoFailure('wrong_password', 'Неверный пароль или данные повреждены');
    }
  }
  async function wrapForAdmin(key, label) {
    const a = await adminKey();
    const ct = await subtle.wrapKey('raw', key, a.key, { name: 'RSA-OAEP', label });
    return { alg: 'RSA-OAEP-256', kid: a.kid, ct: b64encode(ct) };
  }

  // ---------- шифрование содержимого ----------
  async function sealText(key, plaintext, aad) {
    const nonce = randomBytes(NONCE_BYTES);           // новый nonce на КАЖДУЮ операцию
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, key, enc.encode(plaintext));
    return { nonce: b64encode(nonce), ct: b64encode(ct) };
  }
  async function openText(key, sealed, aad) {
    if (!sealed || typeof sealed.nonce !== 'string' || typeof sealed.ct !== 'string') throw new CryptoFailure('bad_format', 'Нет данных для расшифровки');
    const nonce = b64decode(sealed.nonce);
    if (nonce.length !== NONCE_BYTES) throw new CryptoFailure('bad_format', 'Некорректный nonce');
    let buf;
    try {
      buf = await subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, key, b64decode(sealed.ct));
    } catch (e) {
      if (e instanceof CryptoFailure) throw e;
      throw new CryptoFailure('corrupt', 'Не удалось расшифровать: данные повреждены или подменены');
    }
    try { return dec.decode(buf); } catch (e) { throw new CryptoFailure('corrupt', 'Расшифровано некорректное содержимое'); }
  }

  function assertVersion(rec) {
    if (!rec || typeof rec !== 'object' || rec.v !== FORMAT_VERSION || rec.alg !== 'A256GCM') {
      throw new CryptoFailure('bad_format', 'Неподдерживаемая версия формата шифрования');
    }
  }

  // ============================ ЗАМЕТКИ ============================
  const noteAad = (noteId, userId) => ctx('note', noteId, userId);
  const noteHistAad = (noteId, userId) => ctx('note-history', noteId, userId);
  const noteDekAad = (noteId, userId) => ctx('note-dek', noteId, userId);
  const noteDekLabel = (noteId, userId) => ctx('note-dek-admin', noteId, userId);

  /** Создаёт зашифрованную запись заметки. Возвращает { enc, dek } (dek — non-extractable). */
  async function encryptNewNote({ noteId, userId, password, plaintext }) {
    requireSubtle();
    const dekRaw = await subtle.generateKey({ name: 'AES-GCM', length: KEY_BITS }, true, KEY_USAGES);
    const kdf = newKdfParams();
    const kek = await deriveKek(password, kdf);
    const dekUser = await wrapWithKek(kek, dekRaw, noteDekAad(noteId, userId));
    const dekAdmin = await wrapForAdmin(dekRaw, noteDekLabel(noteId, userId));
    const sealed = await sealText(dekRaw, plaintext, noteAad(noteId, userId));
    // рабочий ключ в памяти — неэкспортируемый (получаем заново из обёртки)
    const dek = await unwrapWithKek(kek, dekUser, noteDekAad(noteId, userId), false);
    return {
      dek,
      enc: { v: FORMAT_VERSION, alg: 'A256GCM', nonce: sealed.nonce, ct: sealed.ct, kdf, dek_user: dekUser, dek_admin: dekAdmin }
    };
  }

  /** Открывает заметку паролем. Возвращает { dek, plaintext }. Неверный пароль → CryptoFailure('wrong_password'). */
  async function unlockNote({ noteId, userId, password, record }) {
    assertVersion(record);
    const kek = await deriveKek(password, record.kdf);
    const dek = await unwrapWithKek(kek, record.dek_user, noteDekAad(noteId, userId), false);
    const plaintext = await openText(dek, record, noteAad(noteId, userId));
    return { dek, plaintext };
  }

  async function encryptNoteContent({ noteId, userId, dek, plaintext }) {
    return sealText(dek, plaintext, noteAad(noteId, userId));           // → {nonce, ct}
  }
  async function decryptNoteContent({ noteId, userId, dek, record }) {
    return openText(dek, record, noteAad(noteId, userId));
  }
  async function encryptHistory({ noteId, userId, dek, plaintext }) {
    const s = await sealText(dek, plaintext, noteHistAad(noteId, userId));
    return { v: FORMAT_VERSION, alg: 'A256GCM', nonce: s.nonce, ct: s.ct };
  }
  async function decryptHistory({ noteId, userId, dek, record }) {
    assertVersion(record);
    return openText(dek, record, noteHistAad(noteId, userId));
  }

  /**
   * Смена пароля заметки: DEK остаётся прежним, но перешифровывается ключом от НОВОГО пароля
   * с новой солью. Содержимое (ct) не трогается. Возвращает { kdf, dek_user }.
   */
  async function rewrapNotePassword({ noteId, userId, record, oldPassword, newPassword }) {
    assertVersion(record);
    const oldKek = await deriveKek(oldPassword, record.kdf);
    const dekRaw = await unwrapWithKek(oldKek, record.dek_user, noteDekAad(noteId, userId), true);
    const kdf = newKdfParams();
    const newKek = await deriveKek(newPassword, kdf);
    const dekUser = await wrapWithKek(newKek, dekRaw, noteDekAad(noteId, userId));
    return { kdf, dek_user: dekUser };
  }

  // ============================ ГРУППЫ ============================
  // Ключ группы = симметричный ключ ЭПОХИ (эпоха меняется при ротации). Им шифруются сообщения
  // эпохи. Каждая эпоха: ключ, обёрнутый паролем группы; тот же ключ, обёрнутый для администратора;
  // и «prev» — ключ предыдущей эпохи, зашифрованный ключом этой эпохи (цепочка назад).
  const gKeyAad = (gid, epoch) => ctx('group-key', gid, epoch);
  const gKeyLabel = (gid, epoch) => ctx('group-key-admin', gid, epoch);
  const gPrevAad = (gid, epoch) => ctx('group-prev', gid, epoch);
  const gPostAad = (gid, epoch, authorId) => ctx('group-post', gid, epoch, authorId);

  /**
   * Создаёт запись эпохи. prevKey — ключ предыдущей эпохи (extractable) или null.
   * Возвращает { enc, key } (key — extractable, нужен для следующей ротации).
   */
  async function createGroupEpoch({ groupId, epoch, password, prevKey }) {
    requireSubtle();
    const key = await subtle.generateKey({ name: 'AES-GCM', length: KEY_BITS }, true, KEY_USAGES);
    const kdf = newKdfParams();
    const kek = await deriveKek(password, kdf);
    const keyUser = await wrapWithKek(kek, key, gKeyAad(groupId, epoch));
    const keyAdmin = await wrapForAdmin(key, gKeyLabel(groupId, epoch));
    let prev = null;
    if (prevKey) prev = await wrapWithKek(key, prevKey, gPrevAad(groupId, epoch));
    return { key, enc: { v: FORMAT_VERSION, alg: 'A256GCM', epoch, kdf, key_user: keyUser, key_admin: keyAdmin, prev } };
  }

  /**
   * Открывает цепочку ключей группы паролем ПОСЛЕДНЕЙ эпохи.
   * rows: [{epoch, enc}] в любом порядке. Возвращает { latest, keys: Map(epoch → CryptoKey) }.
   */
  async function unlockGroup({ groupId, password, rows }) {
    if (!Array.isArray(rows) || rows.length === 0) throw new CryptoFailure('bad_format', 'У группы нет ключей');
    const sorted = rows.slice().sort((a, b) => a.epoch - b.epoch);
    const top = sorted[sorted.length - 1];
    assertVersion(top.enc);
    const kek = await deriveKek(password, top.enc.kdf);
    const keys = new Map();
    let cur = await unwrapWithKek(kek, top.enc.key_user, gKeyAad(groupId, top.epoch), true);
    keys.set(top.epoch, cur);
    for (let i = sorted.length - 1; i > 0; i--) {
      const e = sorted[i].enc;
      if (!e.prev) break;                                   // цепочка начинается здесь
      try {
        cur = await unwrapWithKek(cur, e.prev, gPrevAad(groupId, sorted[i].epoch), true);
      } catch (err) { break; }                              // старые эпохи недоступны — новые остаются рабочими
      keys.set(sorted[i - 1].epoch, cur);
    }
    return { latest: top.epoch, keys };
  }

  async function encryptGroupPost({ groupId, epoch, authorId, key, plaintext }) {
    const s = await sealText(key, plaintext, gPostAad(groupId, epoch, authorId));
    return { v: FORMAT_VERSION, alg: 'A256GCM', epoch, nonce: s.nonce, ct: s.ct };
  }
  async function decryptGroupPost({ groupId, authorId, keyring, record }) {
    assertVersion(record);
    const key = keyring.keys.get(record.epoch);
    if (!key) throw new CryptoFailure('corrupt', 'Нет ключа этой эпохи');
    return openText(key, record, gPostAad(groupId, record.epoch, authorId));
  }

  global.TetradCrypto = {
    FORMAT_VERSION, PBKDF2_ITERATIONS, CryptoFailure,
    isConfigured, adminKeyId,
    encryptNewNote, unlockNote, encryptNoteContent, decryptNoteContent,
    encryptHistory, decryptHistory, rewrapNotePassword,
    createGroupEpoch, unlockGroup, encryptGroupPost, decryptGroupPost,
    _internal: { b64encode, b64decode, ctx }
  };
})(typeof window !== 'undefined' ? window : globalThis);
