/* Penguin Sumo — каталог косметики и отрисовка пингвина */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  /* ---------- каталог: [ru, en, цена] ---------- */
  const COLORS = [
    ['#ff5d5d', 'Алый', 'Scarlet', 0], ['#ffa73d', 'Апельсин', 'Orange', 0], ['#ffe14d', 'Лимон', 'Lemon', 0], ['#6be36b', 'Лайм', 'Lime', 0],
    ['#3fd0ff', 'Небо', 'Sky', 0], ['#5b7bff', 'Кобальт', 'Cobalt', 0], ['#c06bff', 'Сирень', 'Lilac', 0], ['#ff6bd0', 'Малина', 'Raspberry', 0],
    ['#2fbf71', 'Изумруд', 'Emerald', 60], ['#1fb5ad', 'Бирюза', 'Teal', 60], ['#7a5cff', 'Индиго', 'Indigo', 80], ['#e8a09a', 'Пудра', 'Blush', 80],
    ['#b9845a', 'Карамель', 'Caramel', 100], ['#3b4254', 'Классика', 'Classic', 120], ['#f2f7ff', 'Снежок', 'Snowy', 150], ['#f5c542', 'Золото', 'Gold', 400],
  ];
  const PATTERNS = [
    ['Без узора', 'Plain', 0], ['Полоски', 'Stripes', 80], ['Пятна', 'Spots', 80], ['Шашечки', 'Checkers', 120], ['Звёзды', 'Stars', 150], ['Сердечки', 'Hearts', 150],
  ];
  const HATS = [
    ['Без шляпы', 'No hat', 0], ['Кепка', 'Cap', 0], ['Праздничный', 'Party cone', 40], ['Шеф-повар', 'Chef', 100], ['Венок', 'Flower crown', 120], ['Санта', 'Santa', 120],
    ['Ковбой', 'Cowboy', 150], ['Наушники', 'Headphones', 150], ['Пропеллер', 'Propeller', 160], ['Цилиндр', 'Top hat', 180], ['Волшебник', 'Wizard', 200],
    ['Пират', 'Pirate', 200], ['Викинг', 'Viking', 250], ['Корона', 'Crown', 300], ['Нимб', 'Halo', 400],
  ];
  const EYES = [['Без очков', 'None', 0], ['Тёмные очки', 'Shades', 100], ['Маска для плавания', 'Goggles', 100], ['Сердечки', 'Heart glasses', 120], ['Монокль', 'Monocle', 150]];
  const TRAILS = [['Нет', 'None', 0], ['Снежок', 'Snow', 100], ['Сердечки', 'Hearts', 200], ['Звёздочки', 'Stars', 250], ['Огонь', 'Fire', 350], ['Радуга', 'Rainbow', 500]];

  const SLOTS = {
    c: { list: COLORS, nameIdx: 1, priceIdx: 3 },
    p: { list: PATTERNS, nameIdx: 0, priceIdx: 2 },
    h: { list: HATS, nameIdx: 0, priceIdx: 2 },
    e: { list: EYES, nameIdx: 0, priceIdx: 2 },
    t: { list: TRAILS, nameIdx: 0, priceIdx: 2 },
  };
  const name = (slot, i, lang) => { const s = SLOTS[slot], it = s.list[i]; return lang === 'ru' ? it[s.nameIdx] : it[s.nameIdx + 1]; };
  const price = (slot, i) => { const s = SLOTS[slot]; return s.list[i][s.priceIdx]; };
  const count = (slot) => SLOTS[slot].list.length;
  const color = (i) => COLORS[i % COLORS.length][0];

  /* ---------- цветовые помощники ---------- */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
  }
  function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }

  function star(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
  }
  function heart(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.5, y - s * 0.1, x, y + s * 0.9); ctx.closePath();
  }
  const circ = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };
  const ell = (ctx, x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); };

  /* ---------- узоры (внутри круга тела r=26, клип уже включён) ---------- */
  function drawPattern(ctx, kind, col) {
    const light = lum(col) > 0.62;
    const ink = light ? 'rgba(20,40,80,.28)' : 'rgba(255,255,255,.42)';
    ctx.fillStyle = ink; ctx.strokeStyle = ink;
    if (kind === 1) { for (const x of [-18, -6, 6, 18]) { ctx.fillRect(x - 2.5, -27, 5, 54); } }
    else if (kind === 2) { [[-14, -12, 5], [-6, 12, 4], [8, -16, 4.5], [14, 8, 5.5], [-18, 3, 3.5], [2, 0, 3]].forEach(([x, y, r]) => { circ(ctx, x, y, r); ctx.fill(); }); }
    else if (kind === 3) { for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) if ((i + j) & 1) ctx.fillRect(i * 9, j * 9, 9, 9); }
    else if (kind === 4) { [[-14, -10, 5], [-8, 13, 4.5], [8, -14, 4], [16, 10, 5], [-20, 2, 3.5]].forEach(([x, y, r], i) => { star(ctx, x, y, r, i); ctx.fill(); }); }
    else if (kind === 5) { [[-14, -8, 4], [-7, 12, 3.6], [6, -15, 3.4], [15, 9, 4.2], [-20, 4, 3]].forEach(([x, y, s]) => { heart(ctx, x, y, s); ctx.fill(); }); }
  }

  /* ---------- шляпы (лицо вдоль +x, центр головы ≈ (-2,0)) ---------- */
  function drawHat(ctx, h, t) {
    const dk = '#0a2540';
    ctx.lineWidth = 2; ctx.strokeStyle = dk; ctx.lineJoin = 'round';
    switch (h) {
      case 1: // кепка
        ctx.fillStyle = '#c0283a'; ell(ctx, 13, 0, 8, 13); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e63946'; circ(ctx, -2, 0, 15); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; circ(ctx, -2, 0, 2.6); ctx.fill(); break;
      case 2: // праздничный
        ctx.fillStyle = '#b05cff'; circ(ctx, -2, 0, 12); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; for (const r of [4, 8]) { circ(ctx, -2, 0, r); ctx.stroke(); }
        ctx.fillStyle = '#ffd23f'; circ(ctx, -2, 0, 3.6); ctx.fill(); break;
      case 3: // шеф
        ctx.fillStyle = '#fff'; for (const [x, y, r] of [[-2, -9, 8], [-2, 9, 8], [7, 0, 8], [-11, 0, 8], [-2, 0, 10]]) { circ(ctx, x, y, r); ctx.fill(); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(120,140,170,.6)'; ctx.lineWidth = 1.4; circ(ctx, -2, 0, 5); ctx.stroke(); break;
      case 4: // венок
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU, x = -2 + Math.cos(a) * 15, y = Math.sin(a) * 15;
          ctx.fillStyle = ['#ff77b7', '#fff', '#ffd23f'][i % 3]; circ(ctx, x, y, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ff9f1c'; circ(ctx, x, y, 1.8); ctx.fill();
        } break;
      case 5: // санта
        ctx.fillStyle = '#d62839'; circ(ctx, -2, 0, 15); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; circ(ctx, -2, 0, 13); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = dk; ctx.lineWidth = 1.6; circ(ctx, -14, 0, 5.5); ctx.fill(); ctx.stroke(); break;
      case 6: // ковбой
        ctx.fillStyle = '#9c6b3d'; ell(ctx, -1, 0, 21, 17); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7d5430'; ell(ctx, -2, 0, 11, 10); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.4; ell(ctx, -2, 0, 9, 8); ctx.stroke(); break;
      case 7: // наушники
        ctx.strokeStyle = '#222'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(-2, -22); ctx.lineTo(-2, 22); ctx.stroke();
        for (const s of [-1, 1]) { ctx.fillStyle = '#ff4d6d'; ctx.strokeStyle = dk; ctx.lineWidth = 2; ell(ctx, -2, s * 23, 7, 9.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ell(ctx, -3, s * 23, 2.4, 4); ctx.fill(); } break;
      case 8: { // пропеллер
        const seg = ['#ff4d4d', '#3fa7ff', '#ffd23f', '#6be36b'];
        for (let i = 0; i < 4; i++) { ctx.fillStyle = seg[i]; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.arc(-2, 0, 13, (i * TAU) / 4, ((i + 1) * TAU) / 4); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = dk; ctx.lineWidth = 2; circ(ctx, -2, 0, 13); ctx.stroke();
        ctx.save(); ctx.translate(-2, 0); ctx.rotate(t / 70); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.strokeStyle = 'rgba(10,37,64,.6)'; ctx.lineWidth = 1.2;
        for (const r of [0, Math.PI]) { ctx.save(); ctx.rotate(r); ell(ctx, 10, 0, 11, 3.4); ctx.fill(); ctx.stroke(); ctx.restore(); }
        ctx.restore(); ctx.fillStyle = '#222'; circ(ctx, -2, 0, 2.4); ctx.fill(); break; }
      case 9: // цилиндр
        ctx.fillStyle = '#1d1d26'; circ(ctx, -2, 0, 17); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2c2c3a'; circ(ctx, -2, 0, 11); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#d62839'; ctx.lineWidth = 3; circ(ctx, -2, 0, 10); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-2, 0, 14, 3.6, 4.6); ctx.stroke(); break;
      case 10: // волшебник
        ctx.fillStyle = '#2b3a9f'; circ(ctx, -2, 0, 19); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4558d8'; circ(ctx, -3, 0, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd23f'; star(ctx, -3, 0, 5, 0.3); ctx.fill();
        ctx.fillStyle = '#fff'; for (const [x, y] of [[-12, -10], [8, 11], [10, -10], [-10, 12]]) { circ(ctx, x, y, 1.5); ctx.fill(); } break;
      case 11: // пират
        ctx.fillStyle = '#17171f'; ell(ctx, -2, 0, 12, 19, 0); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f6f6f6'; circ(ctx, 0, 0, 5); ctx.fill(); ctx.fillStyle = '#17171f'; circ(ctx, 1.5, -1.8, 1.2); ctx.fill(); circ(ctx, 1.5, 1.8, 1.2); ctx.fill();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.8; ell(ctx, -2, 0, 11, 17); ctx.stroke(); break;
      case 12: // викинг
        ctx.strokeStyle = '#f0f0e0'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-2, s * 11); ctx.quadraticCurveTo(0, s * 22, 11, s * 27); ctx.stroke(); }
        ctx.lineCap = 'butt'; ctx.strokeStyle = dk; ctx.lineWidth = 1.5;
        ctx.fillStyle = '#9aa3b3'; circ(ctx, -2, 0, 13); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6d7588'; ctx.fillRect(-2 - 1.6, -13, 3.2, 26); break;
      case 13: // корона
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#a97800'; ctx.lineWidth = 2;
        ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r = i % 2 ? 11 : 17; ctx[i ? 'lineTo' : 'moveTo'](-2 + Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e63946'; circ(ctx, -2, 0, 4.2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#44d7ff'; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.26; circ(ctx, -2 + Math.cos(a) * 14, Math.sin(a) * 14, 1.8); ctx.fill(); } break;
      case 14: // нимб
        ctx.strokeStyle = 'rgba(255,230,120,.3)'; ctx.lineWidth = 11; circ(ctx, -3, 0, 15); ctx.stroke();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4.2; circ(ctx, -3, 0, 15); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-3, 0, 15, 3.8, 5); ctx.stroke(); break;
    }
  }

  /* ---------- очки ---------- */
  function drawEyewear(ctx, e) {
    const dk = '#0a2540';
    ctx.lineWidth = 1.8; ctx.strokeStyle = dk;
    if (e === 1) { // тёмные очки
      ctx.fillStyle = '#10131c'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(7, s * 8 - 6, 13, 12, 4) : ctx.rect(7, s * 8 - 6, 13, 12); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(13, -2); ctx.lineTo(13, 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; for (const s of [-1, 1]) { ctx.fillRect(9, s * 8 - 4.5, 2.4, 3.4); }
    } else if (e === 2) { // маска
      ctx.strokeStyle = '#1a2d4a'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(8, -24); ctx.lineTo(8, 24); ctx.stroke();
      for (const s of [-1, 1]) { ctx.fillStyle = 'rgba(110,200,255,.55)'; ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 3; circ(ctx, 14, s * 8.5, 7.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; circ(ctx, 12, s * 8.5 - 2.5, 1.9); ctx.fill(); }
    } else if (e === 3) { // сердечки
      ctx.fillStyle = '#ff4d8d'; for (const s of [-1, 1]) { heart(ctx, 15, s * 8.2, 7.2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.55)'; circ(ctx, 12, s * 8 - 2, 1.6); ctx.fill(); ctx.fillStyle = '#ff4d8d'; }
    } else if (e === 4) { // монокль
      ctx.strokeStyle = '#d9a400'; ctx.lineWidth = 2.6; circ(ctx, 15, 8.5, 8.4); ctx.stroke();
      ctx.fillStyle = 'rgba(200,240,255,.35)'; circ(ctx, 15, 8.5, 7.4); ctx.fill();
      ctx.strokeStyle = '#d9a400'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(10, 15); ctx.quadraticCurveTo(0, 24, -12, 22); ctx.stroke();
    }
  }

  /* ---------- главный рисовальщик ---------- */
  /* ctx уже в нужной системе; рисуем в «единицах» радиуса 26; o.s — масштаб */
  function drawPenguin(ctx, look, o) {
    const s = o.s || 1, t = o.t || 0, id = o.id || 0;
    const col = color(look.c);
    const dark = shade(col, -0.38), light = shade(col, 0.35);
    const speed = o.speed || 0;
    const wob = Math.sin(o.phase || 0) * Math.min(1, speed / 260);
    ctx.save();
    ctx.translate(o.x || 0, o.y || 0);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.scale(s, s);
    // тень (в экранной ориентации)
    ctx.fillStyle = 'rgba(0,30,70,.28)'; ell(ctx, 3, 8 + Math.abs(wob) * 1.5, 25, 20.5); ctx.fill();
    // аура усиления
    if (o.boost) {
      const g = ctx.createRadialGradient(0, 0, 14, 0, 0, 56), pu = 0.5 + 0.25 * Math.sin(t / 110);
      g.addColorStop(0, `rgba(255,210,60,${pu})`); g.addColorStop(1, 'rgba(255,210,60,0)'); ctx.fillStyle = g; circ(ctx, 0, 0, 56); ctx.fill();
    }
    ctx.translate(0, -Math.abs(wob) * 1.6);
    ctx.rotate((o.face || 0) + wob * 0.09 + (o.spin || 0));
    if (o.dash) ctx.scale(1.14, 0.9);
    ctx.lineJoin = 'round';
    // хвост
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-23, -5); ctx.lineTo(-33, 0); ctx.lineTo(-23, 5); ctx.closePath(); ctx.fill();
    // лапки
    const step = Math.sin(o.phase || 0) * 5 * Math.min(1, speed / 200);
    ctx.fillStyle = '#ff9f1c'; ctx.strokeStyle = '#b86b00'; ctx.lineWidth = 1.3;
    ell(ctx, -17 + step, 9, 8, 4.8); ctx.fill(); ctx.stroke(); ell(ctx, -17 - step, -9, 8, 4.8); ctx.fill(); ctx.stroke();
    // ласты
    const fl = Math.sin(t / 130 + id) * 0.22 + (o.dash ? 0.5 : 0);
    ctx.fillStyle = dark; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 1.6;
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(-1, sd * 24); ctx.rotate(sd * (0.55 + fl)); ell(ctx, 0, 0, 12, 5.8); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // тело
    const g = ctx.createRadialGradient(-8, -10, 3, 0, 0, 29);
    g.addColorStop(0, light); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.18));
    ctx.fillStyle = g; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 3; circ(ctx, 0, 0, 26); ctx.fill(); ctx.stroke();
    if (look.p) { ctx.save(); circ(ctx, 0, 0, 25); ctx.clip(); drawPattern(ctx, look.p, col); ctx.restore(); }
    // мордочка
    const fg = ctx.createRadialGradient(10, -4, 2, 11, 0, 22); fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, '#dcecf7');
    ctx.fillStyle = fg; ell(ctx, 11, 0, 14.5, 19.5); ctx.fill();
    // румянец
    ctx.fillStyle = 'rgba(255,110,140,.4)'; for (const sd of [-1, 1]) { ell(ctx, 17, sd * 13.5, 3.6, 2.6); ctx.fill(); }
    // глаза
    const blink = ((t / 1000 + id * 1.7) % 4.2) < 0.13 || o.frozen;
    for (const sd of [-1, 1]) {
      if (blink && !o.frozen) { ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, sd * 8); ctx.lineTo(17, sd * 8); ctx.stroke(); continue; }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 1.6; circ(ctx, 13, sd * 8, 6); ctx.fill(); ctx.stroke();
      const dx = o.dash ? 2.5 : 1.6;
      ctx.fillStyle = '#0a2540'; circ(ctx, 13 + dx, sd * 8, 3.2); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, 14 + dx, sd * 8 - 1.2, 1.1); ctx.fill();
    }
    // клюв
    ctx.fillStyle = '#ffa621'; ctx.strokeStyle = '#b86b00'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(20, -5.5); ctx.quadraticCurveTo(29, -3, 32, 0); ctx.quadraticCurveTo(29, 3, 20, 5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(184,107,0,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(21, 0); ctx.lineTo(30, 0); ctx.stroke();
    if (look.e) drawEyewear(ctx, look.e);
    if (look.h) drawHat(ctx, look.h, t);
    // блик на теле
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ell(ctx, -10, -13, 8, 4, -0.6); ctx.fill();
    ctx.restore();
    // эффекты поверх (в экранной ориентации)
    ctx.save(); ctx.translate(o.x || 0, o.y || 0); ctx.scale(s, s); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.shield) {
      const pu = 0.5 + 0.2 * Math.sin(t / 160);
      ctx.fillStyle = `rgba(120,225,255,${0.16 + 0.1 * pu})`; ctx.strokeStyle = `rgba(190,245,255,${0.55 + 0.3 * pu})`; ctx.lineWidth = 3; circ(ctx, 0, 0, 37); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 31, 3.7, 4.7); ctx.stroke();
    }
    if (o.frozen) {
      ctx.fillStyle = 'rgba(170,230,255,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-33, -33, 66, 66, 12) : ctx.rect(-33, -33, 66, 66); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-24, -14); ctx.lineTo(-14, -24); ctx.moveTo(-26, -4); ctx.lineTo(-4, -26); ctx.stroke();
    }
    ctx.restore();
  }

  /* миниатюры для гардероба: slot/index с остальным образом из look */
  function thumb(slot, i, look, size, lang) {
    const cv = document.createElement('canvas'); const D = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.height = Math.round(size * D); cv.style.width = cv.style.height = size + 'px';
    const c = cv.getContext('2d'); c.scale(D, D);
    if (slot === 't') {
      c.font = Math.round(size * 0.55) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(['🚫', '❄️', '💖', '⭐', '🔥', '🌈'][i], size / 2, size / 2 + 2);
      return cv;
    }
    const l = Object.assign({}, look); l[slot] = i;
    if (slot === 'c' || slot === 'p') { l.h = 0; l.e = 0; }
    const zoom = slot === 'h' || slot === 'e' ? 1.0 : 0.92;
    drawPenguin(c, l, { x: size / 2, y: size / 2, s: (size / 66) * zoom, face: -Math.PI / 2 + 0.0, t: 0 });
    return cv;
  }

  root.Cosmetics = { SLOTS, COLORS, name, price, count, color, drawPenguin, thumb, shade, lum, star, heart };
})(window);
