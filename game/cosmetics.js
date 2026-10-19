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
    ['Шляпа-рыба', 'Fish hat', 1000],
    ['Бини', 'Beanie', 60], ['Берет', 'Beret', 80], ['Панама', 'Sun hat', 90], ['Ведро', 'Bucket hat', 90], ['Ушанка', 'Ushanka', 110],
    ['Самурай', 'Samurai', 220], ['Каска', 'Hard hat', 130], ['Рога оленя', 'Antlers', 140], ['Кошачьи ушки', 'Cat ears', 140], ['Тыква', 'Pumpkin', 160],
    ['Мухомор', 'Mushroom', 170], ['Шлем космонавта', 'Space helmet', 260], ['Арбуз', 'Watermelon', 180], ['Мороженое', 'Ice cream', 190], ['Дракончик', 'Dragon horns', 320], ['Радужная корона', 'Rainbow crown', -1, 'clicker'],
  ];
  const EYES = [['Без очков', 'None', 0], ['Тёмные очки', 'Shades', 100], ['Маска для плавания', 'Goggles', 100], ['Сердечки', 'Heart glasses', 120], ['Монокль', 'Monocle', 150],
    ['Круглые очки', 'Round glasses', 90], ['Звёзды', 'Star shades', 140], ['Киберпанк', 'Visor', 220], ['3D-очки', '3D glasses', 110], ['Пиксельные', 'Pixel shades', 160],
    ['Повязка', 'Eyepatch', 120], ['Зеркальные', 'Mirror shades', 200], ['Радужные', 'Rainbow shades', 380],
  ];
  const TRAILS = [['Нет', 'None', 0], ['Снежок', 'Snow', 100], ['Сердечки', 'Hearts', 200], ['Звёздочки', 'Stars', 250], ['Огонь', 'Fire', 350], ['Радуга', 'Rainbow', 500],
    ['Пузырьки', 'Bubbles', 150], ['Конфетти', 'Confetti', 220], ['Молнии', 'Lightning', 300], ['Листья', 'Leaves', 160], ['Сакура', 'Blossoms', 240],
    ['Дымок', 'Smoke', 180], ['Рыбки', 'Fish', 260], ['Ноты', 'Notes', 240], ['Искры', 'Sparks', 320], ['Галактика', 'Galaxy', 450],
  ];
  const SKINS = [['Пингвин', 'Penguin', 0], ['Верити', 'Veriti', -1, 'code'], ['Лютиков', 'Lyutikov', -1, 'code'], ['Радужный Верити', 'Rainbow Veriti', -1, 'code'], ['Лего 67', 'Lego 67', 67000, '', 'c67']];
  // машины для гонки: [ru, en, цена]; индекс 0 — обычный карт. Все — кабриолеты (без крыши), названия и формы придуманы
  const CARS = [['Карт', 'Kart', 0], ['Красный Хищник', 'Red Predator', 10000], ['Жёлтая машина', 'Yellow Car', 5000], ['Синяя машина', 'Blue Car', 3000], ['Белая Классика', 'White Classic', 6500], ['Зелёная машина', 'Green Car', 2000]];
  // размеры — в долях радиуса пингвина PR; hl/tl — половина длины капота/багажника
  const CAR_SPEC = [null,
    { col: '#8c1230', dk: '#4a0a18', L: 2.0, W: 0.95, bh: 0.4, wr: 0.42, hl: 0.55, tl: 0.3, str: '', vents: 1, seat: '#14141a', lamp: 'round' },
    { col: '#ffcf1a', dk: '#8a6a00', L: 1.85, W: 1.0, bh: 0.3, wr: 0.4, hl: 0.3, tl: 0.5, str: '', louv: 1, seat: '#2a1a10', lamp: 'slit' },
    { col: '#1f78e0', dk: '#0c3b78', L: 1.6, W: 0.9, bh: 0.36, wr: 0.36, hl: 0.34, tl: 0.26, str: '#ffffff', hoops: 1, seat: '#e9edf5', lamp: 'round' },
    { col: '#f2ecdc', dk: '#a8a08a', L: 2.1, W: 0.95, bh: 0.4, wr: 0.42, hl: 0.5, tl: 0.42, str: '', fins: 1, chrome: 1, seat: '#c9222e', lamp: 'round' },
    { col: '#3aa845', dk: '#1b5c24', L: 1.6, W: 0.95, bh: 0.32, wr: 0.56, hl: 0.26, tl: 0.2, str: '', cage: 1, lift: 0.2, seat: '#222831', lamp: 'round' }];
  const SKIN_COL = ['', '#ffd21f', '#8fc0ff', '#ff7ad9', '#2a97e0'];
  const LUT = new Image(); LUT.src = 'lutikov_f.jpg';
  const LUTB = new Image(); LUTB.src = 'lutikov_b.jpg';

  const SLOTS = {
    c: { list: COLORS, nameIdx: 1, priceIdx: 3 },
    p: { list: PATTERNS, nameIdx: 0, priceIdx: 2 },
    h: { list: HATS, nameIdx: 0, priceIdx: 2 },
    e: { list: EYES, nameIdx: 0, priceIdx: 2 },
    t: { list: TRAILS, nameIdx: 0, priceIdx: 2 },
    s: { list: SKINS, nameIdx: 0, priceIdx: 2 },
    k: { list: CARS, nameIdx: 0, priceIdx: 2 },
  };
  const name = (slot, i, lang) => { const s = SLOTS[slot], it = s.list[i]; return lang === 'ru' ? it[s.nameIdx] : it[s.nameIdx + 1]; };
  const price = (slot, i) => { const s = SLOTS[slot]; return s.list[i][s.priceIdx]; };
  const cur = (slot, i) => { const s = SLOTS[slot]; return s.list[i][s.priceIdx + 2] || 'coins'; };
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
      case 16: // бини
        ctx.beginPath(); ctx.ellipse(0, 0.1, 0.84, 0.66, 0, Math.PI, TAU); ctx.closePath(); S('#3f8fe0');
        ctx.fillStyle = '#2a6fb8'; ctx.beginPath(); ctx.rect(-0.88, -0.2, 1.76, 0.3); S('#2a6fb8');
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.05; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 0.25, -0.18); ctx.lineTo(i * 0.25, 0.08); ctx.stroke(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 0.07; circ(ctx, 0, -0.72, 0.2); S('#fff'); break;
      case 17: // берет
        ell(ctx, 0.12, -0.12, 0.92, 0.42, -0.12); S('#c0392b');
        ctx.strokeStyle = INK; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(0.1, -0.52); ctx.lineTo(0.1, -0.66); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.5, -0.12); ctx.quadraticCurveTo(0, -0.38, 0.6, -0.1); ctx.stroke(); break;
      case 18: // панама
        ell(ctx, 0, 0.03, 1.2, 0.3); S('#f3dc9a');
        ctx.beginPath(); ctx.moveTo(-0.55, 0); ctx.quadraticCurveTo(-0.55, -0.75, 0, -0.75); ctx.quadraticCurveTo(0.55, -0.75, 0.55, 0); ctx.closePath(); S('#f8e8b0');
        ctx.fillStyle = '#e8613c'; ctx.fillRect(-0.56, -0.28, 1.12, 0.17); ctx.strokeRect(-0.56, -0.28, 1.12, 0.17); break;
      case 19: // ведро
        ctx.beginPath(); ctx.moveTo(-0.6, -0.7); ctx.lineTo(0.6, -0.7); ctx.lineTo(0.72, -0.05); ctx.lineTo(-0.72, -0.05); ctx.closePath(); S('#7fd36b');
        ell(ctx, 0, 0.02, 1.02, 0.2); S('#5fb84d');
        ctx.fillStyle = '#fff'; for (const [x, y] of [[-0.3, -0.45], [0.2, -0.5], [0.4, -0.25], [-0.1, -0.2]]) { circ(ctx, x, y, 0.06); ctx.fill(); } break;
      case 20: // ушанка
        ctx.beginPath(); ctx.ellipse(0, 0.1, 0.86, 0.6, 0, Math.PI, TAU); ctx.closePath(); S('#8a6a45');
        for (const sd of [-1, 1]) { ell(ctx, sd * 0.92, 0.32, 0.26, 0.5); S('#caa874'); }
        ctx.beginPath(); ctx.rect(-0.9, -0.2, 1.8, 0.28); S('#d9bb86');
        ctx.fillStyle = '#d62839'; ctx.beginPath(); ctx.moveTo(-0.12, -0.52); ctx.lineTo(0.12, -0.52); ctx.lineTo(0.14, -0.34); ctx.lineTo(0, -0.28); ctx.lineTo(-0.14, -0.34); ctx.closePath(); ctx.fill(); break;
      case 21: // самурай (кабуто)
        ctx.beginPath(); ctx.ellipse(0, 0.1, 0.86, 0.66, 0, Math.PI, TAU); ctx.closePath(); S('#4a4f60');
        ctx.beginPath(); ctx.moveTo(-0.95, 0.02); ctx.quadraticCurveTo(-1.05, 0.5, -0.82, 0.55); ctx.lineTo(-0.7, 0); ctx.closePath(); S('#363a48');
        ctx.beginPath(); ctx.moveTo(0.95, 0.02); ctx.quadraticCurveTo(1.05, 0.5, 0.82, 0.55); ctx.lineTo(0.7, 0); ctx.closePath(); S('#363a48');
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-0.15, -0.55); ctx.quadraticCurveTo(-0.55, -1.05, -0.9, -0.95); ctx.quadraticCurveTo(-0.5, -0.7, -0.08, -0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0.15, -0.55); ctx.quadraticCurveTo(0.55, -1.05, 0.9, -0.95); ctx.quadraticCurveTo(0.5, -0.7, 0.08, -0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d62839'; circ(ctx, 0, -0.35, 0.1); ctx.fill(); break;
      case 22: // каска
        ctx.beginPath(); ctx.ellipse(0, 0.1, 0.84, 0.72, 0, Math.PI, TAU); ctx.closePath(); S('#ffc21a');
        ctx.beginPath(); ctx.rect(-0.14, -0.74, 0.28, 0.76); S('#ffd34d');
        ell(ctx, 0, 0.04, 0.98, 0.17); S('#e6a800');
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ell(ctx, -0.5, -0.32, 0.08, 0.15, 0.4); ctx.fill(); break;
      case 23: // рога оленя
        for (const sd of [-1, 1]) {
          ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 0.14; ctx.beginPath(); ctx.moveTo(sd * 0.45, -0.1); ctx.quadraticCurveTo(sd * 0.75, -0.6, sd * 0.6, -1.2); ctx.stroke();
          ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(sd * 0.68, -0.55); ctx.lineTo(sd * 1.0, -0.78); ctx.moveTo(sd * 0.62, -0.95); ctx.lineTo(sd * 0.9, -1.15); ctx.moveTo(sd * 0.6, -1.2); ctx.lineTo(sd * 0.42, -1.4); ctx.stroke();
        }
        ctx.fillStyle = '#e63946'; circ(ctx, 0, -0.05, 0.16); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.05; ctx.stroke(); break;
      case 24: // кошачьи ушки
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 0.25, 0.05); ctx.lineTo(sd * 0.5, -0.82); ctx.lineTo(sd * 0.95, -0.05); ctx.closePath(); S('#444a5c'); ctx.beginPath(); ctx.moveTo(sd * 0.4, -0.1); ctx.lineTo(sd * 0.52, -0.55); ctx.lineTo(sd * 0.75, -0.1); ctx.closePath(); ctx.fillStyle = '#ff9fc0'; ctx.fill(); } break;
      case 25: { // тыква на Хэллоуин: светящаяся Джек-фонарь
        const fl = 0.75 + 0.25 * Math.sin(t / 120) * Math.sin(t / 290);
        const gl = ctx.createRadialGradient(0, -0.4, 0.1, 0, -0.4, 1.5); gl.addColorStop(0, `rgba(255,170,40,${0.35 * fl})`); gl.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.fillStyle = gl; circ(ctx, 0, -0.4, 1.5); ctx.fill();
        const pg = ctx.createRadialGradient(-0.3, -0.7, 0.1, 0, -0.4, 1.1); pg.addColorStop(0, '#ffb347'); pg.addColorStop(0.6, '#ff7a14'); pg.addColorStop(1, '#c94a00');
        ctx.strokeStyle = INK; ctx.lineWidth = 0.07;
        for (const sd of [-1, 1]) { ell(ctx, sd * 0.62, -0.4, 0.4, 0.58); S(pg); }
        ell(ctx, 0, -0.4, 0.78, 0.7); S(pg);
        ctx.strokeStyle = 'rgba(150,50,0,.55)'; ctx.lineWidth = 0.05; for (const x of [-0.3, 0.3]) { ctx.beginPath(); ctx.ellipse(x * 1.0, -0.4, 0.2, 0.62, 0, 0, TAU); ctx.stroke(); }
        // стебель и усик
        ctx.strokeStyle = INK; ctx.lineWidth = 0.07; ctx.fillStyle = '#4c8a2a'; ctx.beginPath(); ctx.moveTo(-0.1, -1.0); ctx.lineTo(-0.06, -1.32); ctx.lineTo(0.16, -1.28); ctx.lineTo(0.12, -0.98); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#3f9a2e'; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(0.14, -1.15); ctx.bezierCurveTo(0.45, -1.2, 0.5, -0.9, 0.34, -0.88); ctx.bezierCurveTo(0.24, -0.86, 0.26, -0.98, 0.34, -0.98); ctx.stroke();
        // вырезанное лицо со светом изнутри
        ctx.fillStyle = `rgba(255,${200 + 40 * fl | 0},60,${0.8 + 0.2 * fl})`; ctx.strokeStyle = '#7a2a00'; ctx.lineWidth = 0.04;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 0.3, -0.76); ctx.lineTo(sd * 0.5, -0.4); ctx.lineTo(sd * 0.12, -0.44); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(0, -0.38); ctx.lineTo(-0.07, -0.26); ctx.lineTo(0.07, -0.26); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-0.62, -0.2); ctx.lineTo(-0.42, -0.03); ctx.lineTo(-0.28, -0.14); ctx.lineTo(-0.14, 0.0); ctx.lineTo(0, -0.12); ctx.lineTo(0.14, 0.0); ctx.lineTo(0.28, -0.14); ctx.lineTo(0.42, -0.03); ctx.lineTo(0.62, -0.2);
        ctx.quadraticCurveTo(0, -0.4, -0.62, -0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
        break; }
      case 26: // мухомор
        ctx.beginPath(); ctx.ellipse(0, 0.08, 0.95, 0.85, 0, Math.PI, TAU); ctx.closePath(); S('#e0262c');
        ctx.fillStyle = '#fff'; for (const [x, y, r] of [[-0.45, -0.35, .15], [0.1, -0.6, .18], [0.5, -0.3, .14], [-0.1, -0.2, .1], [0.75, -0.08, .09], [-0.78, -0.1, .09]]) { circ(ctx, x, y, r); ctx.fill(); } break;
      case 27: { // шлем космонавта: белый корпус, синее стекло, воротник, антенна
        const cy = 0.35;
        ctx.strokeStyle = '#5d6678'; ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(0.45, -0.62); ctx.lineTo(0.62, -1.15); ctx.stroke();
        ctx.fillStyle = '#ff4d4d'; ctx.strokeStyle = INK; ctx.lineWidth = 0.05; circ(ctx, 0.64, -1.2, 0.1); ctx.fill(); ctx.stroke();
        const sh = ctx.createRadialGradient(-0.4, cy - 0.6, 0.1, 0, cy, 1.3); sh.addColorStop(0, '#ffffff'); sh.addColorStop(0.7, '#dfe6f2'); sh.addColorStop(1, '#aab4c8');
        ctx.lineWidth = 0.08; ctx.strokeStyle = INK; const vx = fx * 0.12, vrx = 0.88 - Math.abs(fx) * 0.1;
        ctx.beginPath(); ctx.ellipse(0, cy, 1.18, 1.1, 0, 0, TAU); ctx.moveTo(vx + vrx, cy + 0.32); ctx.ellipse(vx, cy + 0.32, vrx, 0.72, 0, 0, TAU, true);
        ctx.fillStyle = sh; ctx.fill('evenodd'); ctx.stroke();
        ctx.fillStyle = '#c4ccdc'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-0.9, 1.22, 1.8, 0.3, 0.14) : ctx.rect(-0.9, 1.22, 1.8, 0.3); ctx.fill(); ctx.stroke();
        const vg = ctx.createLinearGradient(0, cy - 0.3, 0, cy + 0.95); vg.addColorStop(0, 'rgba(90,170,255,.16)'); vg.addColorStop(1, 'rgba(40,90,180,.10)');
        ell(ctx, fx * 0.12, cy + 0.32, 0.88 - Math.abs(fx) * 0.1, 0.72); ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = '#8a95ab'; ctx.lineWidth = 0.08; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.arc(fx * 0.12 - 0.05, cy + 0.32, 0.66, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();
        ctx.fillStyle = '#e63946'; ctx.fillRect(-0.9, 0.55, 0.0, 0); circ(ctx, -1.0, cy + 0.35, 0.07); ctx.fill();
        ctx.fillStyle = '#3a7bd5'; circ(ctx, 1.0, cy + 0.35, 0.07); ctx.fill(); break; }
      case 28: // арбуз
        ctx.beginPath(); ctx.ellipse(0, 0.08, 0.98, 0.9, 0, Math.PI, TAU); ctx.closePath(); S('#2f9e44');
        ctx.beginPath(); ctx.ellipse(0, 0.08, 0.84, 0.74, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = '#ff5b6e'; ctx.fill();
        ctx.fillStyle = '#1a1a1a'; for (const [x, y] of [[-0.4, -0.25], [0, -0.45], [0.4, -0.25], [-0.18, -0.12], [0.2, -0.12]]) { ell(ctx, x, y, 0.045, 0.08); ctx.fill(); } break;
      case 29: // мороженое
        ctx.beginPath(); ctx.moveTo(-0.38, -0.05); ctx.lineTo(0, 0.55); ctx.lineTo(0.38, -0.05); ctx.closePath(); S('#e0a45c');
        for (const [y, r, col] of [[-0.25, 0.5, '#ff9ecb'], [-0.62, 0.4, '#fff1b8'], [-0.95, 0.28, '#9be7ff']]) { ell(ctx, 0, y, r, 0.26); S(col); }
        ctx.fillStyle = '#d62839'; circ(ctx, 0.05, -1.28, 0.12); ctx.fill(); ctx.stroke(); break;
      case 30: // дракончик
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 0.3, 0.05); ctx.quadraticCurveTo(sd * 0.75, -0.3, sd * 0.6, -1.0); ctx.quadraticCurveTo(sd * 0.95, -0.4, sd * 0.95, 0.05); ctx.closePath(); S('#7a3cc9'); }
        ctx.fillStyle = '#4ad66d'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 0.18 - 0.1, 0); ctx.lineTo(i * 0.18, -0.3 - (2 - Math.abs(i)) * 0.07); ctx.lineTo(i * 0.18 + 0.1, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
      case 31: { // радужная корона
        const hue = (t / 10) % 360;
        const g = ctx.createLinearGradient(-0.8, 0, 0.8, 0);
        for (let i = 0; i <= 4; i++) g.addColorStop(i / 4, `hsl(${(hue + i * 70) % 360},95%,60%)`);
        ctx.beginPath(); ctx.moveTo(-0.72, 0.05); ctx.lineTo(-0.85, -0.85); ctx.lineTo(-0.4, -0.45); ctx.lineTo(0, -1.1); ctx.lineTo(0.4, -0.45); ctx.lineTo(0.85, -0.85); ctx.lineTo(0.72, 0.05); ctx.closePath(); S(g);
        ctx.fillStyle = '#fff'; for (const [x, y] of [[-0.85, -0.88], [0, -1.14], [0.85, -0.88]]) { circ(ctx, x, y, 0.08); ctx.fill(); }
        const tw = (Math.sin(t / 140) + 1) / 2; ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.5})`; star(ctx, -0.35 + tw * 0.7, -0.35, 0.1, t / 300); ctx.fill(); break; }
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
    } else if (e === 5) {
      ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 0.07; ctx.fillStyle = 'rgba(200,235,255,.28)';
      for (const x of [L, R]) { circ(ctx, x, ey, 0.25); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(L + 0.25, ey); ctx.lineTo(R - 0.25, ey); ctx.stroke();
    } else if (e === 6) {
      ctx.fillStyle = '#ffd23f'; for (const x of [L, R]) { star(ctx, x, ey, 0.34, 0); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.7)'; for (const x of [L, R]) { circ(ctx, x - 0.07, ey - 0.07, 0.04); ctx.fill(); }
    } else if (e === 7) { // киберпанк: угловатый визор из чёрного стекла с неоновой окантовкой и лучом-сканером
      const x0 = L - 0.42, x1 = R + 0.42, y0 = ey - 0.2, y1 = ey + 0.22, ch = 0.16, tt = Date.now();
      const path = () => { ctx.beginPath(); ctx.moveTo(x0 + ch, y0); ctx.lineTo(x1 - ch, y0); ctx.lineTo(x1, y0 + ch); ctx.lineTo(x1 - 0.1, y1); ctx.lineTo(x0 + 0.1, y1); ctx.lineTo(x0, y0 + ch); ctx.closePath(); };
      // дужки и датчик
      ctx.strokeStyle = '#0b0b16'; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(x0, ey - 0.06); ctx.lineTo(x0 - 0.45, ey - 0.02); ctx.moveTo(x1, ey - 0.06); ctx.lineTo(x1 + 0.45, ey - 0.02); ctx.stroke();
      ctx.fillStyle = (Math.floor(tt / 500) % 2) ? '#ff2d95' : '#5a1040'; ctx.beginPath(); ctx.arc(x1 + 0.3, ey - 0.03, 0.05, 0, TAU); ctx.fill();
      // стекло
      const gg = ctx.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, '#0a1230'); gg.addColorStop(0.5, '#10143a'); gg.addColorStop(1, '#1a0d33');
      path(); ctx.fillStyle = gg; ctx.fill();
      ctx.save(); path(); ctx.clip();
      // розовый косой блик и голубое отражение
      ctx.fillStyle = 'rgba(255,45,149,.55)'; ctx.beginPath(); ctx.moveTo(x0 + 0.1, y1); ctx.lineTo(x0 + 0.38, y0); ctx.lineTo(x0 + 0.5, y0); ctx.lineTo(x0 + 0.22, y1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,240,255,.35)'; ctx.beginPath(); ctx.moveTo(x0 + 0.3, y1); ctx.lineTo(x0 + 0.58, y0); ctx.lineTo(x0 + 0.62, y0); ctx.lineTo(x0 + 0.34, y1); ctx.closePath(); ctx.fill();
      // луч-сканер бегает туда-сюда
      const p = (Math.sin(tt / 700) + 1) / 2, sx2 = x0 + 0.15 + p * (x1 - x0 - 0.3);
      const sg = ctx.createLinearGradient(sx2 - 0.14, 0, sx2 + 0.14, 0); sg.addColorStop(0, 'rgba(0,240,255,0)'); sg.addColorStop(0.5, 'rgba(120,255,255,.95)'); sg.addColorStop(1, 'rgba(0,240,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx2 - 0.14, y0, 0.28, y1 - y0);
      // HUD-метки
      ctx.fillStyle = 'rgba(0,240,255,.9)'; const hx = x1 - 0.55; ctx.fillRect(hx, ey - 0.08, 0.2, 0.03); ctx.fillRect(hx, ey - 0.01, 0.34, 0.03); ctx.fillRect(hx, ey + 0.06, 0.14, 0.03);
      ctx.restore();
      // неоновая окантовка со свечением
      ctx.save(); ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 6; ctx.strokeStyle = '#27f3ff'; ctx.lineWidth = 0.055; path(); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#ff2d95'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(x0 + ch + 0.05, y0 + 0.04); ctx.lineTo(x0 + ch + 0.4, y0 + 0.04); ctx.stroke();
    } else if (e === 8) {
      for (const [x, col] of [[L, '#ff3b3b'], [R, '#2ec4ff']]) { ctx.fillStyle = col; ctx.globalAlpha *= 0.85; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 0.24, ey - 0.18, 0.48, 0.36, 0.08) : ctx.rect(x - 0.24, ey - 0.18, 0.48, 0.36); ctx.fill(); ctx.globalAlpha /= 0.85; ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(L + 0.24, ey); ctx.lineTo(R - 0.24, ey); ctx.stroke();
    } else if (e === 9) { // пиксельные очки: 8-битная картинка по сетке
      const ROWS = [
        '##############',
        '#wwbbbb##wwbbb',
        '#wbbbbb##wbbbb',
        '.bbbbb..bbbbb.',
        '..bbb....bbb..',
      ];
      const PAL = { '#': '#0b0b12', w: '#ffffff', b: '#1f2b5c' };
      const cell = (R - L + 0.9) / 14, cx0 = (L + R) / 2 - cell * 7, cy0 = ey - cell * 2.1;
      ROWS[1] = '#wwbbb##wwbbb#'.length === 14 ? '#wwbbb##wwbbb#' : ROWS[1];
      ROWS[2] = '#wbbbb##wbbbb#'; ROWS[3] = '.#bbb#..#bbb#.'; ROWS[4] = '..###....###..';
      const arm = '##';
      ctx.fillStyle = PAL['#']; ctx.fillRect(cx0 - cell * 2, cy0, cell * 2, cell); ctx.fillRect(cx0 + cell * 14, cy0, cell * 2, cell);
      for (let r = 0; r < ROWS.length; r++) for (let q = 0; q < 14; q++) { const ch = ROWS[r][q]; if (ch === '.') continue; ctx.fillStyle = PAL[ch]; ctx.fillRect(cx0 + q * cell - 0.004, cy0 + r * cell - 0.004, cell + 0.008, cell + 0.008); }
    } else if (e === 10) {
      ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(L - 0.45, ey - 0.35); ctx.lineTo(R + 0.45, ey - 0.02); ctx.stroke();
      ctx.fillStyle = '#17171f'; ell(ctx, L, ey, 0.25, 0.22); ctx.fill(); ctx.stroke();
    } else if (e === 11) {
      for (const x of [L, R]) { const g = ctx.createLinearGradient(x - 0.25, ey - 0.2, x + 0.25, ey + 0.2); g.addColorStop(0, '#f2f6ff'); g.addColorStop(0.5, '#7f93b8'); g.addColorStop(1, '#e7edf9'); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 0.25, ey - 0.18, 0.5, 0.36, 0.14) : ctx.rect(x - 0.25, ey - 0.18, 0.5, 0.36); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(L + 0.25, ey - 0.04); ctx.lineTo(R - 0.25, ey - 0.04); ctx.stroke();
    } else if (e === 12) {
      const hue = (Date.now() / 8) % 360;
      for (const x of [L, R]) { const g = ctx.createLinearGradient(x - 0.25, ey - 0.2, x + 0.25, ey + 0.2); g.addColorStop(0, `hsl(${hue},95%,60%)`); g.addColorStop(0.5, `hsl(${(hue + 100) % 360},95%,60%)`); g.addColorStop(1, `hsl(${(hue + 200) % 360},95%,60%)`); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 0.25, ey - 0.18, 0.5, 0.36, 0.12) : ctx.rect(x - 0.25, ey - 0.18, 0.5, 0.36); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(L + 0.25, ey - 0.04); ctx.lineTo(R - 0.25, ey - 0.04); ctx.stroke();

    }
  }

  /* ---------- Верити: жёлтый шар с огромной зубастой улыбкой ---------- */
  /* ---------- Лютиков: ледяной шар с лицом (фото) ---------- */

  /* ---------- облик «Лего 67»: две синие кирпичные цифры 6 и 7 с глазами, руками и ботинками ---------- */
  function drawLego67(ctx, o, ox, vis, bounce, wob, sk) {
    const cs = 0.255, GLY = [['.####', '###..', '###..', '#####', '###.#', '###.#', '.###.'], ['#####', '#####', '...##', '..##.', '..##.', '.##..', '.##..']];
    const BODY = ['#1f8ad2', '#2a97e0'], DK = '#0d5a96', STUD = '#5ec0f5', GREY = '#aeb4bd', GDK = '#6e747e';
    const brick = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.strokeStyle = DK; ctx.lineWidth = 0.03; ctx.strokeRect(x, y, w, h); };
    const stud = (x, y, r, c) => { ctx.fillStyle = c; circ(ctx, x, y, r); ctx.fill(); ctx.strokeStyle = 'rgba(0,40,90,.5)'; ctx.lineWidth = 0.02; ctx.stroke(); };
    const sw = Math.sin(o.phase || 0) * sk * 0.14;
    ctx.save(); ctx.scale(1 + bounce * 0.04, 1 - bounce * 0.04);
    const cxs = [-0.74, 0.74], top = -2.58, bot = top + 7 * cs;
    // ноги и ботинки
    cxs.forEach((cx, gi) => {
      const lift = gi ? -sw : sw, ly = bot - 0.05, bty = -0.3 + Math.min(0, lift) * 0.5;
      brick(cx - 0.15, ly, 0.3, bty - ly + 0.02, '#1f8ad2');
      brick(cx - 0.17, ly + (bty - ly) * 0.45, 0.34, 0.12, '#0f6aae');
      const by = bty; brick(cx - 0.3, by, 0.6, 0.3, GREY); stud(cx - 0.12, by + 0.03, 0.06, '#c9ced6'); stud(cx + 0.12, by + 0.03, 0.06, '#c9ced6');
      ctx.fillStyle = GDK; ctx.fillRect(cx - 0.3, by + 0.22, 0.6, 0.08);
    });
    // руки: левая машет, правая опущена
    const wave = Math.sin((o.t || 0) / 260) * 0.12;
    for (const [bx, by, ex2, ey2, hx, hy] of [[-1.38, -1.75, -1.7, -2.05 + wave, -1.86, -2.2 + wave], [1.38, -1.9, 1.72, -1.4, 1.78, -1.05]]) {
      ctx.strokeStyle = DK; ctx.lineWidth = 0.34; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex2, ey2); ctx.stroke();
      ctx.strokeStyle = '#2a97e0'; ctx.lineWidth = 0.27; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex2, ey2); ctx.stroke();
      brick(hx - 0.2, hy - 0.2, 0.4, 0.4, GREY); stud(hx - 0.07, hy - 0.16, 0.05, '#c9ced6'); stud(hx + 0.08, hy - 0.16, 0.05, '#c9ced6');
      ctx.strokeStyle = GDK; ctx.lineWidth = 0.035; for (let f = 1; f < 4; f++) { ctx.beginPath(); ctx.moveTo(hx - 0.2 + f * 0.1, hy + 0.2); ctx.lineTo(hx - 0.2 + f * 0.1, hy + 0.34); ctx.stroke(); }
    }
    // цифры из кирпичиков
    cxs.forEach((cx, gi) => {
      const g = GLY[gi], x0 = cx - 2.5 * cs;
      for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (g[r][q] === '#') {
        const x = x0 + q * cs, y = top + r * cs; brick(x, y, cs, cs, BODY[(r + q) & 1]); stud(x + cs / 2, y + cs / 2, cs * 0.24, STUD);
      }
    });
    // глаза
    const pdx = Math.max(-0.07, Math.min(0.07, ox * 0.14));
    for (const [ex, ey] of [[-0.62, -2.15], [0.58, -2.12]]) {
      ctx.fillStyle = '#d8dce2'; ctx.strokeStyle = '#4b5666'; ctx.lineWidth = 0.05; circ(ctx, ex, ey, 0.34); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f7f8fa'; circ(ctx, ex, ey, 0.27); ctx.fill();
      ctx.fillStyle = '#0b0d14'; circ(ctx, ex + pdx, ey + 0.02, 0.19); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; circ(ctx, ex + pdx - 0.06, ey - 0.06, 0.05); ctx.fill();
    }
    ctx.restore();
  }
  function drawLyutikov(ctx, o, ox, vis, bounce) {
    const cy = -1.25, r = 1.22;
    ctx.save(); ctx.scale(1 + bounce * 0.05, 1 - bounce * 0.05);
    const g = ctx.createRadialGradient(-0.4, cy - 0.5, 0.1, 0, cy, r * 1.15);
    g.addColorStop(0, '#e8f6ff'); g.addColorStop(0.45, '#8fc0ff'); g.addColorStop(1, '#2d5fa8');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(10,40,100,.7)'; ctx.lineWidth = 0.07; circ(ctx, 0, cy, r); ctx.fill(); ctx.stroke();
    ctx.save(); circ(ctx, 0, cy, r - 0.03); ctx.clip();
    const w = r * 2.5, sx = ox * 0.2, y0 = cy - w / 2 + 0.05;
    if (LUTB.complete && LUTB.naturalWidth) ctx.drawImage(LUTB, -w / 2 - sx, y0, w, w);   // затылок
    if (LUT.complete && LUT.naturalWidth && vis > 0.02) { // лицо
      const ga = ctx.globalAlpha; ctx.globalAlpha = ga * vis; ctx.drawImage(LUT, -w / 2 + sx, y0, w, w); ctx.globalAlpha = ga;
    }
    ctx.restore();
    const gl = ctx.createRadialGradient(-0.45, cy - 0.65, 0.05, -0.3, cy - 0.5, 0.9);
    gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; circ(ctx, 0, cy, r); ctx.fill();
    ctx.restore();
  }

  function drawVeriti(ctx, o, ox, vis, bounce, rainbow) {
    const cy = -1.25, r = 1.22;
    let g;
    if (rainbow) {
      const t = o.t || 0, hue = (t / 22) % 360;
      // конический градиент: цветовое колесо без швов (первый и последний цвет совпадают), медленно вращается
      const N = 72, hs = (h) => `hsl(${h % 360},100%,${(69 - 4 * Math.cos((h - 60) * Math.PI / 180)).toFixed(1)}%)`;
      g = ctx.createConicGradient ? ctx.createConicGradient(t / 3200, 0, cy) : ctx.createLinearGradient(-r, cy - r, r, cy + r);
      if (ctx.createConicGradient) for (let i = 0; i <= N; i++) g.addColorStop(i / N, hs(hue + (i % N) * (360 / N)));
      else for (let i = 0; i <= 24; i++) g.addColorStop(i / 24, hs(hue + i * 12));
    } else {
      g = ctx.createRadialGradient(-0.4, cy - 0.5, 0.1, 0, cy, r * 1.15);
      g.addColorStop(0, '#fff6a0'); g.addColorStop(0.35, '#ffe23a'); g.addColorStop(0.8, '#f2b800'); g.addColorStop(1, '#d28a00');
    }
    ctx.save(); ctx.translate(0, 0); ctx.scale(1 + bounce * 0.06, 1 - bounce * 0.06);
    if (rainbow) { // мягкое ровное свечение вокруг шара
      const t = o.t || 0, hue = (t / 22) % 360, ga = ctx.createRadialGradient(0, cy, r * 0.85, 0, cy, r * 1.5);
      ga.addColorStop(0, `hsla(${(hue + 40) % 360},100%,65%,.55)`); ga.addColorStop(1, `hsla(${(hue + 40) % 360},100%,65%,0)`);
      ctx.fillStyle = ga; circ(ctx, 0, cy, r * 1.5); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(120,70,0,.55)'; ctx.lineWidth = 0.06;
    if (rainbow) { // цвет считается для каждой точки плавной косинусной палитрой: без швов, обрывов и полос
      const t = o.t || 0, N = 48; let cvs = drawVeriti.cv;
      if (!cvs) { cvs = drawVeriti.cv = document.createElement('canvas'); cvs.width = cvs.height = N; drawVeriti.im = cvs.getContext('2d').createImageData(N, N); }
      const im = drawVeriti.im, d = im.data, ph = t / 3200;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = i / (N - 1) * 2 - 1, y = j / (N - 1) * 2 - 1;
        const h = ph + 0.42 * (x + y) + 0.12 * Math.sin(x * 2.4 + t / 1700) + 0.1 * Math.cos(y * 2.8 - t / 2100), k = (j * N + i) * 4;
        d[k] = 255 * Math.max(0, Math.min(1, 0.46 + 0.62 * Math.cos(TAU * h)));
        d[k + 1] = 255 * Math.max(0, Math.min(1, 0.46 + 0.62 * Math.cos(TAU * (h + 0.3333))));
        d[k + 2] = 255 * Math.max(0, Math.min(1, 0.46 + 0.62 * Math.cos(TAU * (h + 0.6667))));
        d[k + 3] = 255;
      }
      cvs.getContext('2d').putImageData(im, 0, 0);
      ctx.save(); circ(ctx, 0, cy, r); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.drawImage(cvs, -r, cy - r, r * 2, r * 2); ctx.restore();
      circ(ctx, 0, cy, r); ctx.stroke();
    } else { ctx.fillStyle = g; circ(ctx, 0, cy, r); ctx.fill(); ctx.stroke(); }
    if (rainbow) { // мягкая объёмная тень/свет поверх колеса — переход выглядит гладким
      const sg = ctx.createRadialGradient(-0.4, cy - 0.5, 0.1, 0.1, cy + 0.1, r * 1.15);
      sg.addColorStop(0, 'rgba(255,255,255,.2)'); sg.addColorStop(0.55, 'rgba(255,255,255,.03)'); sg.addColorStop(1, 'rgba(40,10,80,.14)');
      ctx.fillStyle = sg; circ(ctx, 0, cy, r - 0.03); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(ctx, -0.45, cy - 0.6, 0.38, 0.22, -0.7); ctx.fill();
    if (rainbow) { // переливающийся блеск + искорки
      const t = o.t || 0; ctx.save(); circ(ctx, 0, cy, r - 0.03); ctx.clip();
      const sh = ctx.createLinearGradient(-r + ((t / 1400) % 2) * r * 2.4 - r * 0.4, cy - r, -r + ((t / 1400) % 2) * r * 2.4 + r * 0.4, cy + r);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.28)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; ctx.fillRect(-r, cy - r, r * 2, r * 2); ctx.restore();
      // блеск: две полосы света разной скорости + пульсирующий глянцевый блик + мелкие мерцающие точки
      const band = (sp, off, w, al) => { const x = -r * 1.6 + (((t / sp) + off) % 1) * r * 3.2; const bg = ctx.createLinearGradient(x - w, cy - r, x + w, cy + r); bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(0.5, `rgba(255,255,255,${al})`); bg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = bg; ctx.fillRect(-r, cy - r, r * 2, r * 2); };
      ctx.save(); circ(ctx, 0, cy, r - 0.03); ctx.clip();
      band(2300, 0.5, r * 0.22, 0.28); band(3700, 0.1, r * 0.12, 0.2);
      const gp = 0.45 + 0.25 * Math.sin(t / 300), hg = ctx.createRadialGradient(-0.5, cy - 0.65, 0.02, -0.5, cy - 0.65, 0.65);
      hg.addColorStop(0, `rgba(255,255,255,${gp * 0.7 + 0.15})`); hg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = hg; circ(ctx, -0.5, cy - 0.65, 0.65); ctx.fill();
      ctx.restore();
      // блеск в виде четырёхугольной звёздочки (✦): плавно разгорается и тает
      const star4 = (x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.closePath(); };
      for (const [gx, gy, sz, sp, off] of [[-0.55, cy - 0.68, 0.42, 1500, 0], [0.62, cy + 0.5, 0.26, 1900, 0.4], [0.35, cy - 0.85, 0.2, 1300, 0.7]]) {
        const k = Math.pow((Math.sin((t / sp + off) * TAU) + 1) / 2, 2), s = sz * (0.25 + 0.75 * k);
        ctx.save(); ctx.globalAlpha *= 0.25 + 0.75 * k; ctx.shadowColor = '#fff'; ctx.shadowBlur = 0.25 * (o.u || 20) * 0.2 * 4;
        ctx.fillStyle = '#fff'; star4(gx, gy, s); ctx.fill(); ctx.restore();
      }
    }
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
    const veriti = look.s === 1 || look.s === 3, rbw = look.s === 3, lyut = look.s === 2, lego = look.s === 4;
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

    if (lego) {
      drawLego67(ctx, Object.assign({}, o, { t }), ox, vis, Math.sin(t / 220 + id) * (0.3 + sk), wob, sk);
    } else if (lyut) {
      drawLyutikov(ctx, o, ox, vis, Math.sin(t / 220 + id) * (0.3 + sk));
    } else if (veriti) {
      drawVeriti(ctx, Object.assign({}, o, { t }), ox, vis, Math.sin(t / 220 + id) * (0.3 + sk), rbw);
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
    if (look.h === 27 && (veriti || lyut)) { // шар в стеклянном скафандре: купол вокруг шара, воротник, антенна
      const cy = -1.25, R = 1.42;
      ctx.save();
      ctx.fillStyle = 'rgba(170,220,255,.16)'; ctx.strokeStyle = 'rgba(235,248,255,.95)'; ctx.lineWidth = 0.09; circ(ctx, 0, cy, R); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(0, cy, R - 0.16, Math.PI * 1.08, Math.PI * 1.4); ctx.stroke();
      ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(0, cy, R - 0.16, Math.PI * 1.52, Math.PI * 1.6); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.07; ctx.fillStyle = '#c9d2e2'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-0.95, -0.38, 1.9, 0.34, 0.15) : ctx.rect(-0.95, -0.38, 1.9, 0.34); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff7a2f'; ctx.fillRect(-0.95, -0.24, 1.9, 0.1); 
      ctx.strokeStyle = '#5d6678'; ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(0.7, cy - R * 0.72); ctx.lineTo(0.92, cy - R * 0.72 - 0.5); ctx.stroke();
      const bl = (Math.sin(t / 260) + 1) / 2; ctx.fillStyle = `rgb(255,${70 + bl * 60 | 0},60)`; ctx.strokeStyle = INK; ctx.lineWidth = 0.05; circ(ctx, 0.93, cy - R * 0.72 - 0.55, 0.11); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (look.h) {
      ctx.save(); ctx.translate(fx * 0.3 + (veriti ? 0 : 0), veriti ? -2.38 : lyut ? -2.28 : lego ? -2.5 : -2.58); ctx.rotate(fx * 0.1);
      drawHat(ctx, look.h, t, fx); ctx.restore();
    }
    if (lego && look.e) drawEyewear(ctx, look.e, ox * 0.2, 0.62, -2.12);
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
  // картинка машины сбоку (для гардероба): пингвин выглядывает из кабины
  function drawKartSide(c, S, look) {
    const col = SKIN_COL[look && look.s] || color((look && look.c) || 4), gy = S * 0.8, wr = S * 0.12;
    c.save(); c.lineJoin = 'round'; c.strokeStyle = '#0a2540'; c.lineWidth = Math.max(1.5, S * 0.018);
    c.fillStyle = 'rgba(0,30,70,.28)'; c.beginPath(); c.ellipse(S * 0.5, gy + 1, S * 0.4, S * 0.045, 0, 0, Math.PI * 2); c.fill();
    for (const x of [S * 0.28, S * 0.72]) { c.fillStyle = '#12151d'; c.beginPath(); c.arc(x, gy - wr, wr, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9aa3b2'; c.beginPath(); c.arc(x, gy - wr, wr * 0.45, 0, Math.PI * 2); c.fill(); }
    drawPenguin(c, Object.assign({}, look, { k: 0 }), { x: S * 0.48, y: gy - wr * 1.6 + S * 0.19, u: S * 0.15, fx: 0.9, fz: 0.35, t: 1500, id: 1, noShadow: true, speed: 0, phase: 0 });
    c.fillStyle = col; c.beginPath(); c.roundRect(S * 0.1, gy - wr * 2.3, S * 0.8, wr * 1.3, S * 0.05); c.fill(); c.stroke();
    c.fillStyle = '#222a3c'; c.fillRect(S * 0.08, gy - wr * 3.1, S * 0.07, wr * 0.9);
    c.restore();
  }

  // ---------- машины в профиль (гардероб): оригинальные модели, рисуются кривыми и градиентами ----------
  // дизайн-пространство 200×100, земля на y=88, перед машины справа
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function carWheel(c, x, y, R, o) {
    // тень в арке
    c.fillStyle = '#05060a'; c.beginPath(); c.arc(x, y, R + 3.2, 0, Math.PI * 2); c.fill();
    // шина
    let g = c.createRadialGradient(x, y, R * 0.55, x, y, R); g.addColorStop(0, '#2b2d33'); g.addColorStop(0.55, '#111216'); g.addColorStop(1, '#050507');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
    if (o.knob) { c.fillStyle = '#000'; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; c.save(); c.translate(x + Math.cos(a) * (R - 1.2), y + Math.sin(a) * (R - 1.2)); c.rotate(a); c.fillRect(-1.6, -1.1, 3.2, 2.2); c.restore(); } }
    if (o.white) { c.fillStyle = '#f4f1e6'; c.beginPath(); c.arc(x, y, R * 0.8, 0, Math.PI * 2); c.arc(x, y, R * 0.64, 0, Math.PI * 2, true); c.fill('evenodd'); }
    else { c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 0.8; c.beginPath(); c.arc(x, y, R * 0.9, 0, Math.PI * 2); c.stroke(); }
    // тормозной диск и суппорт
    const rr = R * (o.white ? 0.62 : 0.66);
    c.fillStyle = '#3b3e46'; c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
    if (o.caliper) { c.fillStyle = o.caliper; c.beginPath(); c.roundRect(x + rr * 0.15, y - rr * 0.78, rr * 0.5, rr * 0.55, 1.2); c.fill(); }
    // диск
    const rim = o.rim || '#c9ced8', n = o.spokes || 10, ri = rr * 0.97;
    g = c.createRadialGradient(x - ri * 0.3, y - ri * 0.35, 1, x, y, ri); g.addColorStop(0, shade(rim, 0.35)); g.addColorStop(0.6, rim); g.addColorStop(1, shade(rim, -0.4));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, ri, 0, Math.PI * 2); c.fill();
    if (!o.cap) {
      c.fillStyle = '#16181f';
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (o.rot || 0), w = Math.PI / n * 0.62; c.beginPath(); c.moveTo(x + Math.cos(a - w) * ri * 0.3, y + Math.sin(a - w) * ri * 0.3); c.lineTo(x + Math.cos(a - w * 0.8) * ri * 0.9, y + Math.sin(a - w * 0.8) * ri * 0.9); c.lineTo(x + Math.cos(a + w * 0.8) * ri * 0.9, y + Math.sin(a + w * 0.8) * ri * 0.9); c.lineTo(x + Math.cos(a + w) * ri * 0.3, y + Math.sin(a + w) * ri * 0.3); c.closePath(); c.fill(); }
    }
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 0.7; c.beginPath(); c.arc(x, y, ri, 0, Math.PI * 2); c.stroke();
    g = c.createRadialGradient(x - 1, y - 1, 0.5, x, y, R * 0.2); g.addColorStop(0, '#fff'); g.addColorStop(1, '#7c828f');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, o.cap ? R * 0.34 : R * 0.17, 0, Math.PI * 2); c.fill();
    if (o.cap) { c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.6; c.beginPath(); c.arc(x, y, R * 0.34, 0, Math.PI * 2); c.stroke(); }
  }
  const arch = (cx, ra, y) => `L${cx + ra} ${y} A${ra} ${ra} 0 0 0 ${cx - ra} ${y}`;
  const CAR_PROF = [null,
    // 1. Красный Хищник — широкий маслкар-кабриолет, двухцветная покраска
    { R: 17, wx: [48, 146], col: '#8c1230', d: (cy, ra) => `M10 ${cy} L8 52 Q8 41 17 39 L58 37 Q66 37 70 41 L72 45 L112 45 L116 42 L120 41 Q152 40 178 47 Q192 50 194 59 L194 ${cy} ${arch(146, ra, cy)} ${arch(48, ra, cy)} Z`,
      cab: [74, 110], dip: 45, ws: [[114, 43.5], [121, 41], [106, 24], [101, 25]], belt: [[20, 41], [70, 42], [120, 43], [176, 49]], rocker: 66,
      extra: (c, p) => { c.fillStyle = '#0c0c10'; for (const x of [136, 152]) { c.beginPath(); c.roundRect(x, 41.2, 11, 2.4, 1); c.fill(); }
        c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(94, 46); c.lineTo(93, 65); c.moveTo(128, 46); c.quadraticCurveTo(127, 56 , 126, 66); c.stroke();
        c.fillStyle = '#d8dce6'; c.fillRect(100, 48, 7, 1.6); },
      lamp: [189, 55, 'round'], tail: [9, 49, 'bar'], chrome: 0 },
    // 2. Жёлтый Спайдер — низкий клиновидный родстер
    { R: 15, wx: [44, 150], col: '#f0b90a', d: (cy, ra) => `M10 ${cy} L9 60 Q10 49 22 47 L56 45 Q64 45 70 49 L72 52 L112 52 L117 50 Q160 51 191 66 L196 ${cy} ${arch(150, ra, cy)} ${arch(44, ra, cy)} Z`,
      cab: [74, 109], dip: 52, ws: [[113, 51.5], [118, 50], [105, 38], [101, 39]], belt: [[20, 49], [70, 51], [120, 52], [180, 66]], rocker: 70,
      extra: (c, p) => { c.fillStyle = '#16120a'; c.beginPath(); c.moveTo(62, 56); c.lineTo(86, 58); c.lineTo(84, 66); c.lineTo(64, 66); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(66 + i * 5, 57.5); c.lineTo(66 + i * 5 - 1, 65.5); c.stroke(); }
        c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(94, 53); c.lineTo(92, 69); c.moveTo(122, 52); c.lineTo(123, 70); c.stroke(); },
      lamp: [181, 60, 'slit'], tail: [10, 53, 'bar'], rim: '#2b2d34', spokes: 5, caliper: '#e23a2e' },
    // 3. Синий Родстер — компактный лёгкий родстер с дугами
    { R: 14, wx: [50, 140], col: '#1768d1', d: (cy, ra) => `M16 ${cy} L14 60 Q15 51 26 50 L62 49 L72 51 L108 51 L116 47 Q150 45 172 54 Q185 58 185 66 L185 ${cy} ${arch(140, ra, cy)} ${arch(50, ra, cy)} Z`,
      cab: [74, 106], dip: 51, ws: [[112, 49.5], [116, 47], [104, 30], [100, 31]], belt: [[22, 50], [70, 50], [120, 47], [170, 54]], rocker: 69,
      extra: (c, p) => { c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.moveTo(18, 56); c.lineTo(150, 51); c.lineTo(180, 58.5); c.lineTo(180, 62); c.lineTo(150, 55); c.lineTo(18, 60); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(88, 52); c.lineTo(87, 68); c.stroke();
        },
      over: (c) => { c.strokeStyle = '#dfe3ec'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(78, 51); c.lineTo(73, 30); c.stroke(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.6; c.stroke(); },
      lamp: [178, 58, 'round'], tail: [15, 56, 'dot'], rim: '#e6e9f0', spokes: 8 },
    // 4. Белая Классика — кабриолет 50-х с плавниками и хромом
    { R: 17.5, wx: [44, 152], col: '#efe6cf', two: '#b3262f', d: (cy, ra) => `M8 ${cy} L8 56 Q8 48 15 47 L12 46 L7 33 Q30 38 56 47 L70 49 L72 50 L112 50 L118 47 Q156 46 184 53 Q197 56 198 65 L198 ${cy} ${arch(152, ra, cy)} ${arch(44, ra, cy)} Z`,
      cab: [74, 110], dip: 50, ws: [[114, 49], [121, 47], [108, 28], [103, 29]], belt: [[14, 47], [70, 49], [120, 47], [184, 54]], rocker: 70,
      extra: (c, p) => { const g = c.createLinearGradient(0, 55, 0, 63); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#aeb6c4'); g.addColorStop(1, '#eef1f6');
        c.strokeStyle = g; c.lineWidth = 2.2; c.beginPath(); c.moveTo(60, 61); c.quadraticCurveTo(112, 54, 188, 60); c.stroke();
        c.fillStyle = g; c.fillRect(2, 62, 12, 3.2); c.fillRect(190, 62, 10, 3.2);
        c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(94, 51); c.lineTo(93, 68); c.stroke(); },
      lamp: [192, 57, 'chrome'], tail: [8, 54, 'fin'], white: 1, cap: 1, chrome: 1 },
    // 5. Зелёный Багги — высокий внедорожник с каркасом
    { R: 24, wx: [48, 146], col: '#2f9e44', d: (cy, ra) => `M18 ${cy} L16 48 Q16 41 24 41 L60 41 L63 45 L110 45 L114 42 L120 41 L170 41 Q181 42 183 52 L184 ${cy} ${arch(146, ra, cy)} ${arch(48, ra, cy)} Z`,
      cab: [66, 108], dip: 45, ws: [[112, 44], [118, 41], [114, 29], [110, 29]], belt: [[24, 42], [70, 45], [120, 42], [176, 43]], rocker: 62,
      extra: (c, p) => { c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(88, 46); c.lineTo(88, 62); c.stroke();
        c.fillStyle = '#1c2a20'; c.fillRect(172, 56, 8, 5);
        c.fillStyle = '#1c2a20'; c.fillRect(172, 56, 8, 5); },
      over: (c) => { c.strokeStyle = '#22262e'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(64, 45); c.lineTo(68, 14); c.lineTo(112, 14); c.lineTo(114, 30); c.moveTo(68, 14); c.lineTo(36, 41); c.moveTo(90, 14); c.lineTo(90, 45); c.stroke();
        c.fillStyle = '#fffbd0'; for (const x of [78, 88, 98, 108]) { c.beginPath(); c.arc(x, 11.5, 2.3, 0, Math.PI * 2); c.fill(); } },
      lamp: [178, 47, 'round'], tail: [17, 46, 'dot'], knob: 1, rim: '#9aa3b2', spokes: 6, cap: 0 }];

  function drawCarSide(c, size, k, look) {
    const S = size, pf = CAR_PROF[k], sp = CAR_SPEC[k];
    if (!pf) return;
    const K = S / 205, ox = S * 0.012, gyD = 88, oy = S * 0.8 - gyD * K;
    const cyW = gyD - pf.R, ra = pf.R + 3.5;
    c.save(); c.translate(ox, oy); c.scale(K, K); c.lineJoin = 'round';
    // тень на льду и отражение
    let g = c.createRadialGradient(100, gyD + 2, 5, 100, gyD + 2, 100); g.addColorStop(0, 'rgba(0,25,60,.55)'); g.addColorStop(1, 'rgba(0,25,60,0)');
    c.save(); c.translate(100, gyD + 2); c.scale(1, 0.1); c.translate(-100, -(gyD + 2)); c.fillStyle = g; c.beginPath(); c.arc(100, gyD + 2, 100, 0, Math.PI * 2); c.fill(); c.restore();
    // салон
    const cx0 = pf.cab[0], cx1 = pf.cab[1], dip = pf.dip;
    c.fillStyle = '#17181e'; c.fillRect(cx0 - 4, dip - 14, cx1 - cx0 + 8, 20);
    g = c.createLinearGradient(0, dip - 14, 0, dip + 6); g.addColorStop(0, sp.seat === '#14141a' ? '#2a2b33' : sp.seat); g.addColorStop(1, '#0b0b0f');
    c.fillStyle = g; c.beginPath(); c.roundRect(cx0 - 3, dip - 12, 10, 18, 3); c.fill();        // спинка сиденья
    // колёса
    const wo = { rim: pf.rim, spokes: pf.spokes, caliper: pf.caliper, white: pf.white, cap: pf.cap, knob: pf.knob };
    for (const wx of pf.wx) carWheel(c, wx, cyW, pf.R, wo);
    // пингвин (внутри салона, ниже кромки закрывается корпусом)
    c.save(); c.beginPath(); c.rect(0, -60, 220, dip + 60); c.clip();
    c.restore();
    c.restore();
    c.save(); c.beginPath(); c.rect(0, 0, S, oy + dip * K + 1); c.clip();
    const lk = Object.assign({}, look); lk.k = 0;
    drawPenguin(c, lk, { x: ox + ((cx0 + cx1) / 2) * K, y: oy + (dip + 8) * K, u: S * 0.092, fx: 0.9, fz: 0.35, t: 1500, id: 1, noShadow: true, speed: 0, phase: 0 });
    c.restore();
    c.save(); c.translate(ox, oy); c.scale(K, K); c.lineJoin = 'round';
    // корпус
    const body = new Path2D(pf.d(cyW, ra));
    const top = Math.min(...pf.belt.map((q) => q[1])) - 8;
    g = c.createLinearGradient(0, top, 0, gyD); const col = sp.col;
    g.addColorStop(0, shade(col, 0.42)); g.addColorStop(0.16, shade(col, 0.16)); g.addColorStop(0.5, col); g.addColorStop(0.84, shade(col, -0.32)); g.addColorStop(1, shade(col, -0.55));
    c.fillStyle = g; c.fill(body);
    c.save(); c.clip(body);
    if (pf.two) {  // нижняя часть другого цвета / тёмная полоса
      const lowY = (pf.belt[1][1] + cyW) / 2 + (pf.stripe ? -3 : 1);
      const g2 = c.createLinearGradient(0, lowY, 0, gyD);
      if (pf.stripe) { // тёмная «плечевая» полоса вдоль борта
        const gg = c.createLinearGradient(0, top, 0, top + 30); gg.addColorStop(0, 'rgba(34,32,38,.0)'); gg.addColorStop(0.2, 'rgba(34,32,38,.95)'); gg.addColorStop(1, 'rgba(24,22,28,.95)');
        c.fillStyle = gg; c.beginPath(); c.moveTo(14, 42); c.lineTo(70, 42.5); c.lineTo(122, 43.5); c.quadraticCurveTo(160, 41.5, 190, 51); c.lineTo(196, 56); c.lineTo(150, 54); c.lineTo(128, 52); c.quadraticCurveTo(100, 58, 70, 54); c.lineTo(12, 56); c.closePath(); c.fill();
      } else {
        g2.addColorStop(0, shade(pf.two, 0.18)); g2.addColorStop(1, shade(pf.two, -0.4)); c.fillStyle = g2;
        c.beginPath(); c.moveTo(0, 58); c.quadraticCurveTo(110, 51, 200, 58); c.lineTo(200, 100); c.lineTo(0, 100); c.closePath(); c.fill();
      }
    }
    // блики: отражение неба вдоль плеча, нижняя тень, затемнение арок
    const sh = c.createLinearGradient(8, 0, 196, 0);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.18, 'rgba(255,255,255,.55)'); sh.addColorStop(0.4, 'rgba(255,255,255,.12)'); sh.addColorStop(0.7, 'rgba(255,255,255,.5)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = sh; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); pf.belt.forEach((q, i) => (i ? c.lineTo(q[0], q[1] + 3.6) : c.moveTo(q[0], q[1] + 3.6))); c.stroke();
    c.lineWidth = 0.7; c.globalAlpha = 0.55; c.beginPath(); pf.belt.forEach((q, i) => (i ? c.lineTo(q[0], q[1] + 7.5) : c.moveTo(q[0], q[1] + 7.5))); c.stroke(); c.globalAlpha = 1;
    const ao = c.createLinearGradient(0, pf.rocker - 8, 0, cyW + 2); ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = ao; c.fillRect(0, pf.rocker - 8, 210, 30);
    for (const wx of pf.wx) { const rg = c.createRadialGradient(wx, cyW, ra, wx, cyW, ra + 9); rg.addColorStop(0, 'rgba(0,0,0,.5)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(wx - ra - 10, cyW - ra - 10, 2 * ra + 20, ra + 10); }
    if (pf.extra) pf.extra(c, pf);
    c.restore();
    c.strokeStyle = 'rgba(8,10,16,.7)'; c.lineWidth = 0.8; c.stroke(body);
    // фара и стоп
    const [lx, ly, lt] = pf.lamp;
    if (lt === 'slit') { g = c.createLinearGradient(lx - 8, ly, lx + 4, ly); g.addColorStop(0, '#9fd2ff'); g.addColorStop(1, '#fff'); c.fillStyle = '#0c0d12'; c.beginPath(); c.moveTo(lx - 9, ly + 2); c.lineTo(lx + 5, ly - 3); c.lineTo(lx + 6, ly - 0.5); c.lineTo(lx - 7, ly + 4.5); c.closePath(); c.fill(); c.fillStyle = g; c.beginPath(); c.moveTo(lx - 7, ly + 2); c.lineTo(lx + 4, ly - 1.8); c.lineTo(lx + 4.6, ly - 0.4); c.lineTo(lx - 6, ly + 3.2); c.closePath(); c.fill(); }
    else {
      const lr = lt === 'chrome' ? 4.6 : 4.2;
      if (lt === 'chrome') { g = c.createLinearGradient(0, ly - lr - 1.6, 0, ly + lr + 1.6); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#9aa3b2'); g.addColorStop(1, '#eef1f6'); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, lr + 1.7, 0, Math.PI * 2); c.fill(); }
      else { c.fillStyle = '#0c0d12'; c.beginPath(); c.arc(lx, ly, lr + 1.4, 0, Math.PI * 2); c.fill(); }
      g = c.createRadialGradient(lx - 1, ly - 1, 0.5, lx, ly, lr); g.addColorStop(0, '#fff'); g.addColorStop(0.45, '#d8ecff'); g.addColorStop(1, '#6aa4e0');
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, lr, 0, Math.PI * 2); c.fill();
      if (k === 1) { c.strokeStyle = 'rgba(190,225,255,.95)'; c.lineWidth = 0.9; c.beginPath(); c.arc(lx, ly, lr * 0.62, 0, Math.PI * 2); c.stroke(); }
    }
    c.save(); c.globalCompositeOperation = 'lighter'; g = c.createRadialGradient(lx, ly, 1, lx, ly, 13); g.addColorStop(0, 'rgba(200,225,255,.35)'); g.addColorStop(1, 'rgba(200,225,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 13, 0, Math.PI * 2); c.fill(); c.restore();
    const [tx, ty, tt] = pf.tail;
    g = c.createLinearGradient(tx - 2, 0, tx + 5, 0); g.addColorStop(0, '#ff5a4a'); g.addColorStop(1, '#a00f18'); c.fillStyle = g;
    if (tt === 'bar') { c.beginPath(); c.roundRect(tx - 1.5, ty - 1.6, 5, 7, 1.2); c.fill(); }
    else if (tt === 'fin') { c.beginPath(); c.moveTo(tx - 1, ty - 7); c.lineTo(tx + 3, ty - 7); c.lineTo(tx + 3.5, ty + 3); c.lineTo(tx - 1, ty + 3); c.closePath(); c.fill(); }
    else { c.beginPath(); c.arc(tx + 1, ty, 2.8, 0, Math.PI * 2); c.fill(); }
    // лобовое стекло и рамка
    const w = pf.ws; g = c.createLinearGradient(w[3][0], w[3][1], w[0][0], w[0][1]); g.addColorStop(0, 'rgba(245,252,255,.85)'); g.addColorStop(0.5, 'rgba(160,210,240,.55)'); g.addColorStop(1, 'rgba(70,120,170,.65)');
    c.fillStyle = g; c.beginPath(); c.moveTo(w[0][0], w[0][1]); c.lineTo(w[1][0], w[1][1]); c.lineTo(w[2][0], w[2][1]); c.lineTo(w[3][0], w[3][1]); c.closePath(); c.fill();
    c.strokeStyle = pf.chrome ? '#e8ecf2' : '#1a1c23'; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(w[1][0], w[1][1]); c.lineTo(w[2][0], w[2][1]); c.lineTo(w[3][0], w[3][1]); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(w[0][0] - 1, w[0][1] - 1); c.lineTo(w[3][0] + 1.5, w[3][1] + 1.2); c.stroke();
    // зеркало
    c.fillStyle = shade(col, 0.1); c.strokeStyle = 'rgba(8,10,16,.7)'; c.lineWidth = 0.6; c.beginPath(); c.roundRect(w[0][0] - 4, w[0][1] - 5.5, 6.5, 4, 1.6); c.fill(); c.stroke();
    if (pf.over) pf.over(c);
    c.restore();
  }

  function thumb(slot, i, look, size, lang) {
    const cv = document.createElement('canvas'); const D = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.height = Math.round(size * D); cv.style.width = cv.style.height = size + 'px';
    const c = cv.getContext('2d'); c.scale(D, D);
    if (slot === 't') {
      c.font = Math.round(size * 0.55) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(['🚫', '❄️', '💖', '⭐', '🔥', '🌈', '🫧', '🎊', '⚡', '🍃', '🌸', '💨', '🐟', '🎵', '✨', '🌌'][i], size / 2, size / 2 + 2);
      return cv;
    }
    if (slot === 'k') {
      const c0 = c; if (i === 0) { drawKartSide(c0, size, look); return cv; }
      drawCarSide(c0, size, i, Object.assign({ c: 4, p: 0, h: 0, e: 0, t: 0, s: 0 }, look)); return cv;
    }
    const l = Object.assign({ c: 4, p: 0, h: 0, e: 0, t: 0, s: 0 }, look); l[slot] = i;
    if (slot === 'c' || slot === 'p') { l.h = 0; l.e = 0; }
    let u = size * 0.27, y = size * 0.9;
    if (slot === 'h') { u = size * 0.255; y = size * 0.56 + u * 1.9; }
    else if (slot === 'e') { u = size * 0.42; y = size * 0.5 + u * 1.95; l.h = 0; }
    else if (slot === 's') { u = size * 0.27; y = size * 0.9; l.h = 0; l.e = 0; }
    drawPenguin(c, l, { x: size / 2, y, u, fx: 0, fz: 1, t: 1500, id: 1, noShadow: true });
    return cv;
  }

  root.Cosmetics = { CAR_SPEC, SKIN_COL, SLOTS, COLORS, name, price, cur, lock, count, color, drawPenguin, thumb, shade, lum, star, heart, ell, circ };
})(window);
