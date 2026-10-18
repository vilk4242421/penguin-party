/* Пингвины — каталог косметики и 3D-пингвин (объёмный «стоячий» спрайт, поворачивается лицом/боком/спиной) */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  /* ---------- каталог ---------- */
  // цвета: [hex, ru, en, цена, замок]; цена -1 = нельзя купить (замок: 'clicker' | 'code')
  const COLORS = [
    ['#ff5d5d', 'Алый', 'Scarlet', 0], ['#ffa73d', 'Апельсин', 'Orange', 0], ['#ffe14d', 'Лимон', 'Lemon', 0], ['#6be36b', 'Лайм', 'Lime', 0],
    ['#3fd0ff', 'Небо', 'Sky', 0], ['#5b7bff', 'Кобальт', 'Cobalt', 0], ['#c06bff', 'Сирень', 'Lilac', 0], ['#ff6bd0', 'Малина', 'Raspberry', 0],
    ['#2fbf71', 'Изумруд', 'Emerald', 60], ['#1fb5ad', 'Бирюза', 'Teal', 60], ['#7a5cff', 'Индиго', 'Indigo', 80], ['#e8a09a', 'Пудра', 'Blush', 80],
    ['#b9845a', 'Карамель', 'Caramel', 100], ['#3b4254', 'Классика', 'Classic', 120], ['#f2f7ff', 'Снежок', 'Snowy', 150], ['#f5c542', 'Золото', 'Gold', 400],
    ['#5ee6c8', 'Северное сияние', 'Aurora', -1, 'clicker'],
  ];
  const PATTERNS = [
    ['Без узора', 'Plain', 0], ['Полоски', 'Stripes', 80], ['Пятна', 'Spots', 80], ['Шашечки', 'Checkers', 120], ['Звёзды', 'Stars', 150], ['Сердечки', 'Hearts', 150],
  ];
  const HATS = [
    ['Без шляпы', 'No hat', 0], ['Кепка', 'Cap', 0], ['Праздничный', 'Party cone', 40], ['Шеф-повар', 'Chef', 100], ['Венок', 'Flower crown', 120], ['Санта', 'Santa', 120],
    ['Ковбой', 'Cowboy', 150], ['Наушники', 'Headphones', 150], ['Пропеллер', 'Propeller', 160], ['Цилиндр', 'Top hat', 180], ['Волшебник', 'Wizard', 200],
    ['Пират', 'Pirate', 200], ['Викинг', 'Viking', 250], ['Корона', 'Crown', 300], ['Нимб', 'Halo', 400],
    ['Шляпа-рыба', 'Fish hat', -1, 'clicker'],
  ];
  const EYES = [['Без очков', 'None', 0], ['Тёмные очки', 'Shades', 100], ['Маска для плавания', 'Goggles', 100], ['Сердечки', 'Heart glasses', 120], ['Монокль', 'Monocle', 150]];
  const TRAILS = [['Нет', 'None', 0], ['Снежок', 'Snow', 100], ['Сердечки', 'Hearts', 200], ['Звёздочки', 'Stars', 250], ['Огонь', 'Fire', 350], ['Радуга', 'Rainbow', 500]];
  const SKINS = [['Пингвин', 'Penguin', 0], ['Верити', 'Veriti', -1, 'code']];

  const SLOTS = {
    c: { list: COLORS, nameIdx: 1, priceIdx: 3 },
    p: { list: PATTERNS, nameIdx: 0, priceIdx: 2 },
    h: { list: HATS, nameIdx: 0, priceIdx: 2 },
    e: { list: EYES, nameIdx: 0, priceIdx: 2 },
    t: { list: TRAILS, nameIdx: 0, priceIdx: 2 },
    s: { list: SKINS, nameIdx: 0, priceIdx: 2 },
  };
  const name = (slot, i, lang) => { const s = SLOTS[slot], it = s.list[i]; return lang === 'ru' ? it[s.nameIdx] : it[s.nameIdx + 1]; };
  const price = (slot, i) => { const s = SLOTS[slot]; return s.list[i][s.priceIdx]; };
  const lock = (slot, i) => { const s = SLOTS[slot]; return s.list[i][s.priceIdx + 1] || ''; };
  const count = (slot) => SLOTS[slot].list.length;
  const color = (i) => COLORS[i % COLORS.length][0];

  /* ---------- цвет ---------- */
  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function shade(hex, amt) {
    let [r, g, b] = rgb(hex);
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
  }
  function lum(hex) { const c = rgb(hex); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
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
  const ell = (ctx, x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), rot || 0, 0, TAU); };
  const INK = '#0a2540';

  /* ---------- узоры (координаты в «u», тело: x∈[-1,1], y∈[-2.65,0.05]) ---------- */
  function drawPattern(ctx, kind, col) {
    const light = lum(col) > 0.62;
    const ink = light ? 'rgba(20,40,80,.30)' : 'rgba(255,255,255,.45)';
    ctx.fillStyle = ink; ctx.strokeStyle = ink;
    if (kind === 1) { for (const x of [-0.78, -0.26, 0.26, 0.78]) ctx.fillRect(x - 0.1, -2.8, 0.2, 3); }
    else if (kind === 2) { [[-0.55, -2.1, .2], [-0.2, -0.7, .17], [0.4, -2.2, .18], [0.6, -1.0, .22], [-0.7, -1.2, .15], [0.05, -1.5, .13], [0.1, -0.3, .16], [-0.5, -0.3, .13]].forEach(([x, y, r]) => { circ(ctx, x, y, r); ctx.fill(); }); }
    else if (kind === 3) { const s = 0.36; for (let i = -3; i < 3; i++) for (let j = -8; j < 1; j++) if ((i + j) & 1) ctx.fillRect(i * s, j * s, s, s); }
    else if (kind === 4) { [[-0.6, -2.0, .24], [-0.3, -0.7, .2], [0.45, -2.2, .2], [0.62, -0.95, .24], [-0.78, -1.2, .16], [0.1, -0.2, .17]].forEach(([x, y, r], i) => { star(ctx, x, y, r, i); ctx.fill(); }); }
    else if (kind === 5) { [[-0.6, -2.0, .17], [-0.3, -0.7, .16], [0.45, -2.2, .15], [0.62, -0.95, .18], [-0.78, -1.2, .13], [0.1, -0.2, .15]].forEach(([x, y, s]) => { heart(ctx, x, y, s); ctx.fill(); }); }
  }

  /* ---------- шляпы: якорь — макушка (0,0), вверх — минус; fx — поворот головы ---------- */
  function drawHat(ctx, h, t, fx) {
    ctx.lineWidth = 0.07; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const S = (fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
    switch (h) {
      case 1: // кепка
        ctx.beginPath(); ctx.ellipse(0, 0.08, 0.86, 0.62, 0, Math.PI, TAU); ctx.closePath(); S('#e63946');
        ell(ctx, fx * 0.55, 0.06, 0.62, 0.17); S('#a91f2e');
        ctx.fillStyle = '#fff'; circ(ctx, 0, -0.56, 0.08); ctx.fill(); break;
      case 2: // праздничный колпак
        ctx.beginPath(); ctx.moveTo(-0.55, 0.1); ctx.lineTo(0.05, -1.45); ctx.lineTo(0.55, 0.1); ctx.closePath(); S('#b05cff');
        ctx.fillStyle = '#ffd23f'; for (const [x, y] of [[-0.12, -0.4], [0.18, -0.65], [0.0, -0.95], [0.25, -0.2]]) { circ(ctx, x, y, 0.07); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(-0.38, -0.3); ctx.lineTo(0.36, -0.3); ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.07; circ(ctx, 0.05, -1.5, 0.17); S('#ffd23f'); break;
      case 3: // шеф
        ctx.fillStyle = '#fff';
        for (const [x, y, r] of [[-0.42, -0.62, 0.4], [0.42, -0.62, 0.4], [0, -0.92, 0.5]]) { circ(ctx, x, y, r); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.rect(-0.6, -0.55, 1.2, 0.62); S('#fff');
        ctx.strokeStyle = 'rgba(120,140,170,.5)'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.2, -0.5); ctx.lineTo(-0.2, 0.05); ctx.moveTo(0.2, -0.5); ctx.lineTo(0.2, 0.05); ctx.stroke(); break;
      case 4: // венок
        for (let i = 0; i < 8; i++) {
          const a = Math.PI + (i / 7) * Math.PI, x = Math.cos(a) * 0.9, y = Math.sin(a) * 0.35 + 0.05;
          ctx.fillStyle = '#3fae4f'; ell(ctx, x * 0.92, y + 0.02, 0.16, 0.08, a); ctx.fill();
          ctx.fillStyle = ['#ff77b7', '#fff', '#ffd23f', '#ff8a5c'][i % 4]; circ(ctx, x, y - 0.02, 0.2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ff9f1c'; circ(ctx, x, y - 0.02, 0.07); ctx.fill();
        } break;
      case 5: // санта
        ctx.beginPath(); ctx.moveTo(-0.85, 0.05); ctx.quadraticCurveTo(-0.7, -1.2, 0.1, -1.15); ctx.quadraticCurveTo(0.7, -1.1, 0.85, -0.45); ctx.lineTo(0.85, 0.05); ctx.closePath(); S('#d62839');
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-0.92, -0.22, 1.84, 0.34, 0.17) : ctx.rect(-0.92, -0.22, 1.84, 0.34); S('#fff');
        circ(ctx, 0.88, -0.5, 0.2); S('#fff'); break;
      case 6: // ковбой
        ell(ctx, 0, 0.03, 1.28, 0.3); S('#a8743f');
        ctx.beginPath(); ctx.moveTo(-0.5, 0); ctx.quadraticCurveTo(-0.55, -0.8, -0.2, -0.8); ctx.quadraticCurveTo(0, -0.62, 0.2, -0.8); ctx.quadraticCurveTo(0.55, -0.8, 0.5, 0); ctx.closePath(); S('#bf8a52');
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(-0.5, -0.18); ctx.quadraticCurveTo(0, -0.05, 0.5, -0.18); ctx.stroke(); break;
      case 7: // наушники
        ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 0.17; ctx.beginPath(); ctx.moveTo(-0.92, 0.5); ctx.bezierCurveTo(-0.95, -0.85, 0.95, -0.85, 0.92, 0.5); ctx.stroke();
        for (const sd of [-1, 1]) { ctx.strokeStyle = INK; ctx.lineWidth = 0.07; ell(ctx, sd * 0.95, 0.55, 0.26, 0.34); S('#ff4d6d'); ctx.fillStyle = 'rgba(255,255,255,.45)'; ell(ctx, sd * 0.95 - 0.05, 0.45, 0.07, 0.14); ctx.fill(); } break;
      case 8: { // пропеллер
        ctx.beginPath(); ctx.ellipse(0, 0.08, 0.7, 0.45, 0, Math.PI, TAU); ctx.closePath();
        const g = ctx.createLinearGradient(-0.7, 0, 0.7, 0); g.addColorStop(0, '#ff4d4d'); g.addColorStop(0.33, '#ffd23f'); g.addColorStop(0.66, '#3fa7ff'); g.addColorStop(1, '#6be36b'); S(g);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(0, -0.4); ctx.lineTo(0, -0.6); ctx.stroke();
        const sp = Math.cos(t / 60);
        ctx.fillStyle = 'rgba(240,240,255,.85)'; ctx.strokeStyle = 'rgba(10,37,64,.7)'; ctx.lineWidth = 0.05;
        for (const sd of [-1, 1]) { ell(ctx, sd * 0.5 * sp, -0.62, Math.abs(0.5 * sp) + 0.05, 0.08, 0); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#333'; circ(ctx, 0, -0.62, 0.07); ctx.fill(); break; }
      case 9: // цилиндр
        ell(ctx, 0, 0.02, 0.9, 0.22); S('#1d1d26');
        ctx.beginPath(); ctx.rect(-0.52, -1.0, 1.04, 1.02); S('#2c2c3a');
        ctx.fillStyle = '#d62839'; ctx.fillRect(-0.52, -0.3, 1.04, 0.2); ctx.strokeRect(-0.52, -0.3, 1.04, 0.2);
        ell(ctx, 0, -1.0, 0.52, 0.14); S('#3a3a4c');
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(-0.38, -0.85); ctx.lineTo(-0.38, -0.4); ctx.stroke(); break;
      case 10: // волшебник
        ell(ctx, 0, 0.03, 1.02, 0.25); S('#2b3a9f');
        ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.quadraticCurveTo(-0.4, -0.9, 0.35, -1.7); ctx.quadraticCurveTo(0.45, -0.8, 0.6, 0); ctx.closePath(); S('#4558d8');
        ctx.fillStyle = '#ffd23f'; star(ctx, 0, -0.55, 0.17, 0.3); ctx.fill(); star(ctx, 0.2, -1.05, 0.1, 0.1); ctx.fill();
        ctx.fillStyle = '#fff'; for (const [x, y] of [[-0.3, -0.25], [0.3, -0.3]]) { circ(ctx, x, y, 0.04); ctx.fill(); } break;
      case 11: // пират
        ctx.beginPath(); ctx.moveTo(-1.05, -0.1); ctx.quadraticCurveTo(-0.8, -0.95, 0, -0.85); ctx.quadraticCurveTo(0.8, -0.95, 1.05, -0.1); ctx.quadraticCurveTo(0.5, 0.18, 0, 0.1); ctx.quadraticCurveTo(-0.5, 0.18, -1.05, -0.1); ctx.closePath(); S('#17171f');
        ctx.fillStyle = '#f6f6f6'; circ(ctx, 0, -0.38, 0.17); ctx.fill(); ctx.fillRect(-0.08, -0.26, 0.16, 0.12);
        ctx.fillStyle = '#17171f'; circ(ctx, -0.06, -0.4, 0.04); ctx.fill(); circ(ctx, 0.06, -0.4, 0.04); ctx.fill();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.9, -0.08); ctx.quadraticCurveTo(0, 0.1, 0.9, -0.08); ctx.stroke(); break;
      case 12: // викинг
        ctx.strokeStyle = INK; ctx.lineWidth = 0.07;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 0.62, -0.05); ctx.quadraticCurveTo(sd * 1.2, -0.1, sd * 1.15, -0.85); ctx.quadraticCurveTo(sd * 0.95, -0.35, sd * 0.45, -0.28); ctx.closePath(); S('#f2f0e2'); }
        ctx.beginPath(); ctx.ellipse(0, 0.08, 0.78, 0.7, 0, Math.PI, TAU); ctx.closePath(); S('#9aa3b3');
        ctx.fillStyle = '#6d7588'; ctx.fillRect(-0.06, -0.62, 0.12, 0.7); ctx.strokeRect(-0.06, -0.62, 0.12, 0.7); break;
      case 13: // корона
        ctx.beginPath(); ctx.moveTo(-0.7, 0.05); ctx.lineTo(-0.78, -0.75); ctx.lineTo(-0.38, -0.4); ctx.lineTo(0, -0.95); ctx.lineTo(0.38, -0.4); ctx.lineTo(0.78, -0.75); ctx.lineTo(0.7, 0.05); ctx.closePath(); S('#ffd23f');
        ctx.fillStyle = '#e63946'; circ(ctx, 0, -0.3, 0.12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#44d7ff'; for (const x of [-0.45, 0.45]) { circ(ctx, x, -0.2, 0.08); ctx.fill(); }
        ctx.fillStyle = '#fff'; for (const [x, y] of [[-0.78, -0.78], [0, -0.98], [0.78, -0.78]]) { circ(ctx, x, y, 0.07); ctx.fill(); } break;
      case 14: { // нимб
        const bob = Math.sin(t / 300) * 0.06;
        ctx.strokeStyle = 'rgba(255,230,120,.35)'; ctx.lineWidth = 0.34; ell(ctx, 0, -0.62 + bob, 0.68, 0.19); ctx.stroke();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 0.14; ell(ctx, 0, -0.62 + bob, 0.68, 0.19); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.ellipse(0, -0.62 + bob, 0.68, 0.19, 0, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke(); break; }
      case 15: { // шляпа-рыба (награда за кликер)
        const wag = Math.sin(t / 160) * 0.18, hue = (t / 12) % 360;
        const g = ctx.createLinearGradient(-0.8, -0.8, 0.8, 0.2);
        g.addColorStop(0, `hsl(${hue},95%,62%)`); g.addColorStop(0.5, `hsl(${(hue + 70) % 360},95%,60%)`); g.addColorStop(1, `hsl(${(hue + 140) % 360},90%,58%)`);
        ctx.beginPath(); ctx.moveTo(0.62, -0.38); ctx.lineTo(1.12, -0.38 - 0.34 + wag * 1.6); ctx.lineTo(1.12, -0.38 + 0.34 + wag * 1.6); ctx.closePath(); S(g);
        ctx.beginPath(); ctx.moveTo(-0.15, -0.72); ctx.quadraticCurveTo(0.15, -1.12, 0.45, -0.7); ctx.closePath(); S(g);
        ell(ctx, -0.1, -0.38, 0.8, 0.42); S(g);
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.05;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(0.05 + i * 0.22, -0.34 + j * 0.2 - (i % 2) * 0.1, 0.1, -1.2, 1.2); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 0.05; circ(ctx, -0.5, -0.46, 0.12); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; circ(ctx, -0.53, -0.46, 0.06); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.84, -0.3); ctx.quadraticCurveTo(-0.7, -0.22, -0.62, -0.3); ctx.stroke(); break; }
    }
  }

  /* ---------- очки (глаза в (ex±sx, ey)) ---------- */
  function drawEyewear(ctx, e, ex, sx, ey) {
    ctx.lineWidth = 0.06; ctx.strokeStyle = INK;
    const L = ex - sx, R = ex + sx;
    if (e === 1) {
      ctx.fillStyle = '#10131c';
      for (const x of [L, R]) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 0.24, ey - 0.17, 0.48, 0.34, 0.1) : ctx.rect(x - 0.24, ey - 0.17, 0.48, 0.34); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(L + 0.24, ey - 0.05); ctx.lineTo(R - 0.24, ey - 0.05); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; for (const x of [L, R]) ctx.fillRect(x - 0.17, ey - 0.11, 0.09, 0.12);
    } else if (e === 2) {
      ctx.strokeStyle = '#1a2d4a'; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(L - 0.5, ey - 0.02); ctx.lineTo(R + 0.5, ey - 0.02); ctx.stroke();
      for (const x of [L, R]) { ctx.fillStyle = 'rgba(110,200,255,.6)'; ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 0.1; circ(ctx, x, ey, 0.25); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.75)'; circ(ctx, x - 0.08, ey - 0.09, 0.06); ctx.fill(); }
    } else if (e === 3) {
      ctx.fillStyle = '#ff4d8d'; for (const x of [L, R]) { heart(ctx, x, ey, 0.27); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.55)'; circ(ctx, x - 0.1, ey - 0.12, 0.05); ctx.fill(); ctx.fillStyle = '#ff4d8d'; }
    } else if (e === 4) {
      ctx.strokeStyle = '#d9a400'; ctx.lineWidth = 0.09; circ(ctx, R, ey, 0.27); ctx.stroke();
      ctx.fillStyle = 'rgba(200,240,255,.3)'; circ(ctx, R, ey, 0.25); ctx.fill();
      ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(R + 0.14, ey + 0.25); ctx.quadraticCurveTo(R + 0.3, ey + 0.8, R - 0.1, ey + 1.1); ctx.stroke();
    }
  }

  /* ---------- Верити: жёлтый шар с огромной зубастой улыбкой ---------- */
  function drawVeriti(ctx, o, ox, vis, bounce) {
    const cy = -1.25, r = 1.22;
    const g = ctx.createRadialGradient(-0.4, cy - 0.5, 0.1, 0, cy, r * 1.15);
    g.addColorStop(0, '#fff6a0'); g.addColorStop(0.35, '#ffe23a'); g.addColorStop(0.8, '#f2b800'); g.addColorStop(1, '#d28a00');
    ctx.save(); ctx.translate(0, 0); ctx.scale(1 + bounce * 0.06, 1 - bounce * 0.06);
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(120,70,0,.55)'; ctx.lineWidth = 0.06; circ(ctx, 0, cy, r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(ctx, -0.45, cy - 0.6, 0.38, 0.22, -0.7); ctx.fill();
    if (vis > 0.02) {
      ctx.globalAlpha *= vis;
      const fx = ox * 0.9;
      ctx.fillStyle = '#1a1208';
      for (const sd of [-1, 1]) { ell(ctx, fx + sd * 0.36 * (1 - Math.abs(ox) * 0.3), cy - 0.45, 0.1, 0.17); ctx.fill(); }
      // рот
      const mx = fx, my = cy + 0.0, w = 0.86 * (1 - Math.abs(ox) * 0.25);
      ctx.beginPath(); ctx.moveTo(mx - w, my); ctx.quadraticCurveTo(mx, my + 0.05, mx + w, my); ctx.quadraticCurveTo(mx + w * 0.8, my + 0.8, mx, my + 0.82); ctx.quadraticCurveTo(mx - w * 0.8, my + 0.8, mx - w, my); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#3a2208'; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(70,45,20,.55)'; ctx.lineWidth = 0.035;
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(mx + i * w * 0.2, my); ctx.lineTo(mx + i * w * 0.2 * 0.9, my + 0.9); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(mx - w, my + 0.38); ctx.quadraticCurveTo(mx, my + 0.46, mx + w, my + 0.38); ctx.stroke();
      ctx.restore();
      // верхняя губа-линия и щёчки
      ctx.strokeStyle = '#3a2208'; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(mx - w, my); ctx.quadraticCurveTo(mx, my + 0.05, mx + w, my); ctx.stroke();
      ctx.restore && 0;
    }
    ctx.restore();
  }

  /* ---------- главный рисовальщик ----------
   * o: x,y — точка опоры (экран, px), u — масштаб (px на единицу), fx/fz — куда смотрит (fx вправо, fz к камере),
   * t — время мс, id, speed, phase, dash, boost, shield, frozen, hot, sad, cheer, alpha, lift (px над землёй), noShadow */
  function drawPenguin(ctx, look, o) {
    const u = o.u || 20, t = o.t || 0, id = o.id || 0;
    let fx = o.fx == null ? 0 : o.fx, fz = o.fz == null ? 1 : o.fz;
    const nm = Math.hypot(fx, fz) || 1; fx /= nm; fz /= nm;
    const speed = o.speed || 0, sk = Math.min(1, speed / 240);
    const ph = o.phase || 0, wob = Math.sin(ph) * sk;
    const lift = o.lift || 0;
    const veriti = look.s === 1;
    const vis = Math.max(0, Math.min(1, (fz + 0.45) / 0.45));           // насколько видно лицо
    const ox = fx * 0.62;
    const aurora = look.c === 16;
    const col = color(look.c);
    const dark = shade(col, -0.4), light = shade(col, 0.4);
    const a0 = o.alpha == null ? 1 : o.alpha;

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.globalAlpha = a0;
    // тень на земле (не поднимается вместе с прыжком)
    if (!o.noShadow) {
      const sc = Math.max(0.45, 1 - lift / (u * 6));
      ctx.fillStyle = `rgba(0,35,80,${0.3 * sc})`; ell(ctx, 0, u * 0.04, u * 1.05 * sc, u * 0.42 * sc); ctx.fill();
    }
    if (o.boost) {
      const pu = 0.5 + 0.25 * Math.sin(t / 110), g = ctx.createRadialGradient(0, 0, u * 0.3, 0, 0, u * 2.4);
      g.addColorStop(0, `rgba(255,210,60,${pu})`); g.addColorStop(1, 'rgba(255,210,60,0)'); ctx.fillStyle = g; ell(ctx, 0, 0, u * 2.4, u * 1.0); ctx.fill();
    }
    ctx.translate(0, -lift);
    ctx.scale(u, u);
    const bob = Math.abs(Math.sin(ph)) * 0.12 * sk;
    ctx.translate(0, -bob);
    // наклон вперёд и покачивание
    const lean = (o.dash ? 0.2 : 0.07 * sk) * fx, tilt = wob * 0.07 + (o.sad ? 0.05 : 0);
    ctx.transform(1, 0, -lean, 1, 0, 0); ctx.rotate(tilt);
    if (o.dash) ctx.scale(0.92, 1.06);
    if (o.cheer) { const j = Math.abs(Math.sin(t / 150 + id)); ctx.translate(0, -j * 0.35); }
    if (o.inv && Math.floor(t / 90) % 2) ctx.globalAlpha = a0 * 0.4;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    if (veriti) {
      drawVeriti(ctx, o, ox, vis, Math.sin(t / 220 + id) * (0.3 + sk));
    } else {
      // хвост (виден сзади/сбоку)
      ctx.fillStyle = dark; ctx.strokeStyle = INK; ctx.lineWidth = 0.06;
      const tx = -fx * 0.95, tvis = 1 - vis * 0.8;
      if (tvis > 0.1) { ctx.beginPath(); ctx.moveTo(tx - 0.1, -0.5); ctx.lineTo(tx - fx * 0.38 * tvis, -0.12); ctx.lineTo(tx + 0.1, -0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // тело
      let bodyFill;
      if (aurora) {
        const gh = (t / 14) % 360, g = ctx.createLinearGradient(-1, -2.6, 1, 0);
        g.addColorStop(0, `hsl(${gh},90%,66%)`); g.addColorStop(0.5, `hsl(${(gh + 80) % 360},90%,62%)`); g.addColorStop(1, `hsl(${(gh + 170) % 360},85%,58%)`); bodyFill = g;
      } else {
        const g = ctx.createRadialGradient(-0.45, -2.1, 0.1, 0, -1.3, 1.75);
        g.addColorStop(0, light); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.28)); bodyFill = g;
      }
      ctx.fillStyle = bodyFill; ctx.strokeStyle = INK; ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(0, -2.68);
      ctx.bezierCurveTo(0.85, -2.68, 1.02, -1.9, 1.02, -1.2);
      ctx.bezierCurveTo(1.02, -0.45, 0.7, 0.04, 0, 0.04);
      ctx.bezierCurveTo(-0.7, 0.04, -1.02, -0.45, -1.02, -1.2);
      ctx.bezierCurveTo(-1.02, -1.9, -0.85, -2.68, 0, -2.68);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // спина — темнее
      if (fz < 0) { ctx.save(); ctx.clip(); ctx.fillStyle = `rgba(0,10,40,${Math.min(0.32, -fz * 0.34)})`; ctx.fillRect(-1.2, -2.8, 2.4, 3); ctx.restore(); }
      // белое пузико + «маска» лица
      if (vis > 0.02) {
        ctx.save(); ctx.globalAlpha *= vis;
        const bw = 0.66 - 0.17 * Math.abs(fx), bx = ox * 0.55;
        const bg = ctx.createLinearGradient(0, -2.2, 0, 0); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#d8e8f5');
        ctx.fillStyle = bg; ell(ctx, bx, -0.95, bw, 0.98); ctx.fill();
        ell(ctx, ox * 0.9, -1.88, 0.7 - 0.12 * Math.abs(fx), 0.6); ctx.fill();
        ctx.restore();
      }
      // узор
      if (look.p) { ctx.save(); ctx.beginPath(); ctx.moveTo(0, -2.68); ctx.bezierCurveTo(0.85, -2.68, 1.02, -1.9, 1.02, -1.2); ctx.bezierCurveTo(1.02, -0.45, 0.7, 0.04, 0, 0.04); ctx.bezierCurveTo(-0.7, 0.04, -1.02, -0.45, -1.02, -1.2); ctx.bezierCurveTo(-1.02, -1.9, -0.85, -2.68, 0, -2.68); ctx.clip(); drawPattern(ctx, look.p, aurora ? '#7ee' : col); ctx.restore(); }
      // блик
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ell(ctx, -0.5, -2.2, 0.28, 0.14, -0.7); ctx.fill();
      // лапки
      const st = Math.sin(ph) * 0.2 * sk;
      ctx.fillStyle = '#ff9f1c'; ctx.strokeStyle = '#a85c00'; ctx.lineWidth = 0.06;
      const fsp = 0.46 * (1 - 0.55 * Math.abs(fx));
      ell(ctx, -fsp + fx * st, 0.03, 0.4, 0.17); ctx.fill(); ctx.stroke();
      ell(ctx, fsp - fx * st, 0.03 - Math.max(0, st) * 0.3, 0.4, 0.17); ctx.fill(); ctx.stroke();
      // ласты
      const flap = o.cheer ? Math.sin(t / 110) * 0.6 : Math.sin(t / 130 + id) * 0.12 + (o.dash ? 0.7 : 0) + wob * 0.3;
      ctx.fillStyle = dark; ctx.strokeStyle = INK; ctx.lineWidth = 0.07;
      for (const sd of [-1, 1]) {
        const fxp = sd * 1.0 * (1 - 0.45 * Math.abs(fx)) + fx * 0.05;
        ctx.save(); ctx.translate(fxp, -1.55); ctx.rotate(sd * (0.35 + flap) + (o.cheer ? sd * -0.9 : 0));
        ctx.beginPath(); ctx.ellipse(0, 0.5, 0.2, 0.62, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      // лицо
      if (vis > 0.02) {
        ctx.save(); ctx.globalAlpha *= vis;
        const sx = 0.34 * (1 - 0.4 * Math.abs(fx)), ey = -1.95;
        ctx.fillStyle = 'rgba(255,110,140,.42)'; for (const sd of [-1, 1]) { ell(ctx, ox + sd * (sx + 0.22), -1.62, 0.15, 0.09); ctx.fill(); }
        const blink = ((t / 1000 + id * 1.7) % 4.2) < 0.13;
        for (const sd of [-1, 1]) {
          const exx = ox + sd * sx;
          if (o.frozen || blink || o.cheer) {
            ctx.strokeStyle = INK; ctx.lineWidth = 0.07; ctx.beginPath();
            if (o.cheer) { ctx.arc(exx, ey + 0.04, 0.12, Math.PI * 1.1, Math.PI * 1.9); } else { ctx.moveTo(exx - 0.12, ey); ctx.lineTo(exx + 0.12, ey); }
            ctx.stroke(); continue;
          }
          ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 0.06; ell(ctx, exx, ey, 0.17, 0.2); ctx.fill(); ctx.stroke();
          const dx = fx * 0.06 + (o.dash ? fx * 0.04 : 0), dy = o.sad ? 0.05 : 0;
          ctx.fillStyle = INK; circ(ctx, exx + dx, ey + dy, 0.095); ctx.fill();
          ctx.fillStyle = '#fff'; circ(ctx, exx + dx + 0.035, ey + dy - 0.04, 0.032); ctx.fill();
          if (o.sad) { ctx.strokeStyle = INK; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(exx - sd * 0.22, ey - 0.3); ctx.lineTo(exx + sd * 0.12, ey - 0.2); ctx.stroke(); }
        }
        if (o.sad) { ctx.fillStyle = 'rgba(120,200,255,.9)'; const ty = ey + 0.25 + ((t / 500) % 1) * 0.4; ell(ctx, ox + sx + 0.05, ty, 0.04, 0.07); ctx.fill(); }
        // клюв: ромб спереди ↔ треугольник сбоку
        const s = Math.min(1, Math.abs(fx) * 1.5), sg = fx >= 0 ? 1 : -1;
        const F = [[-0.21, -1.64], [0, -1.78], [0.21, -1.64], [0, -1.4]], Sd = [[-0.02, -1.8], [0.64, -1.62], [0.64, -1.58], [-0.02, -1.4]];
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { const px = ox + (F[i][0] + (Sd[i][0] * sg - F[i][0]) * s), py = F[i][1] + (Sd[i][1] - F[i][1]) * s; ctx[i ? 'lineTo' : 'moveTo'](px, py); }
        ctx.closePath(); ctx.fillStyle = '#ffa621'; ctx.strokeStyle = '#a85c00'; ctx.lineWidth = 0.06; ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(168,92,0,.6)'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(ox + sg * s * 0.05, -1.6); ctx.lineTo(ox + sg * (s * 0.55) , -1.6 + (1 - s) * 0.05); ctx.stroke();
        if (look.e) drawEyewear(ctx, look.e, ox, sx, ey);
        ctx.restore();
      }
    }
    // шляпа
    if (look.h) {
      ctx.save(); ctx.translate(fx * 0.3 + (veriti ? 0 : 0), veriti ? -2.38 : -2.58); ctx.rotate(fx * 0.1);
      drawHat(ctx, look.h, t, fx); ctx.restore();
    }
    if (veriti && look.e && vis > 0.02) { ctx.save(); ctx.globalAlpha *= vis; drawEyewear(ctx, look.e, ox * 0.9, 0.36, -1.7); ctx.restore(); }
    // горячая бомба — красное свечение
    if (o.hot) { const pu = 0.5 + 0.5 * Math.sin(t / 70); ctx.fillStyle = `rgba(255,60,40,${0.18 + 0.2 * pu})`; ell(ctx, 0, -1.3, 1.25, 1.55); ctx.fill(); }
    ctx.restore();

    // эффекты поверх (без наклона)
    ctx.save(); ctx.translate(o.x, o.y - lift); ctx.globalAlpha = a0;
    if (o.shield) {
      const pu = 0.5 + 0.2 * Math.sin(t / 160), R = u * 1.95;
      ctx.fillStyle = `rgba(120,225,255,${0.14 + 0.1 * pu})`; ctx.strokeStyle = `rgba(190,245,255,${0.55 + 0.3 * pu})`; ctx.lineWidth = Math.max(2, u * 0.1);
      ell(ctx, 0, -u * 1.3, R * 0.85, R * 1.05); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1.5, u * 0.07); ctx.beginPath(); ctx.ellipse(0, -u * 1.3, R * 0.85 * 0.8, R * 1.05 * 0.8, 0, 3.7, 4.7); ctx.stroke();
    }
    if (o.frozen) {
      ctx.fillStyle = 'rgba(170,230,255,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(2, u * 0.1);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-u * 1.25, -u * 2.9, u * 2.5, u * 3.05, u * 0.35) : ctx.rect(-u * 1.25, -u * 2.9, u * 2.5, u * 3.05); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1.5, u * 0.09); ctx.beginPath(); ctx.moveTo(-u * 0.9, -u * 2.0); ctx.lineTo(-u * 0.5, -u * 2.5); ctx.moveTo(-u * 0.95, -u * 1.5); ctx.lineTo(-u * 0.2, -u * 2.45); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- миниатюры для гардероба ---------- */
  function thumb(slot, i, look, size, lang) {
    const cv = document.createElement('canvas'); const D = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.height = Math.round(size * D); cv.style.width = cv.style.height = size + 'px';
    const c = cv.getContext('2d'); c.scale(D, D);
    if (slot === 't') {
      c.font = Math.round(size * 0.55) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(['🚫', '❄️', '💖', '⭐', '🔥', '🌈'][i], size / 2, size / 2 + 2);
      return cv;
    }
    const l = Object.assign({ c: 4, p: 0, h: 0, e: 0, t: 0, s: 0 }, look); l[slot] = i;
    if (slot === 'c' || slot === 'p') { l.h = 0; l.e = 0; }
    let u = size * 0.27, y = size * 0.9;
    if (slot === 'h') { u = size * 0.3; y = size * 0.5 + u * 1.9; }
    else if (slot === 'e') { u = size * 0.42; y = size * 0.5 + u * 1.95; l.h = 0; }
    else if (slot === 's') { u = size * 0.27; y = size * 0.9; l.h = 0; l.e = 0; }
    drawPenguin(c, l, { x: size / 2, y, u, fx: 0, fz: 1, t: 1500, id: 1, noShadow: true });
    return cv;
  }

  root.Cosmetics = { SLOTS, COLORS, name, price, lock, count, color, drawPenguin, thumb, shade, lum, star, heart, ell, circ };
})(window);
