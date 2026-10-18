/* Пингвины — симулятор кликов: жми на пингвина, копи рыбу, улучшай силу клика и клики в секунду.
 * За набор рыбы пингвин получает новый облик. Прохождение (80 000 🐟) = уникальный цвет и шляпа в гардероб. */
(function (root) {
  'use strict';
  const Pro = root.Profile, Cos = root.Cosmetics, Sc = root.Scene, GA = root.GameAudio;
  const $ = (id) => document.getElementById(id);
  const TXT = {
    ru: {
      title: 'Рыбный симулятор', tapMe: 'Жми на пингвина!', perTap: 'за клик', perSec: 'в секунду', power: 'Сила клика', auto: 'Клики в секунду', lvl: 'ур.', max: 'МАКС',
      next: (n, v) => `Следующий облик «${n}» — ${v} 🐟`, last: 'Финал — получи награду!', goal: (v) => `Цель симулятора: ${v} 🐟`, stageUp: 'Новый облик',
      done: '🎉 Симулятор пройден!', doneTxt: 'Ты получил уникальный цвет «Северное сияние» и «Шляпу-рыбу». Они уже в гардеробе — и надеты на тебя!', toWard: 'В гардероб', goOn: 'Продолжить кликать',
      reward: 'Награда за прохождение: уникальный цвет и шляпа', back: 'Назад', total: 'Всего',
    },
    en: {
      title: 'Fish Simulator', tapMe: 'Tap the penguin!', perTap: 'per tap', perSec: 'per second', power: 'Tap power', auto: 'Taps per second', lvl: 'lv.', max: 'MAX',
      next: (n, v) => `Next look “${n}” — ${v} 🐟`, last: 'Final stretch — claim your reward!', goal: (v) => `Simulator goal: ${v} 🐟`, stageUp: 'New look',
      done: '🎉 Simulator complete!', doneTxt: 'You got the unique “Aurora” color and the “Fish hat”. They are in your wardrobe and already on!', toWard: 'To wardrobe', goOn: 'Keep tapping',
      reward: 'Completion reward: unique color and hat', back: 'Back', total: 'Total',
    },
  };
  let H = { lang: () => 'ru', toast: () => {}, refresh: () => {}, wardrobe: () => {} };
  let cv, ctx, W = 300, Hh = 300, D = 1;
  let pulse = 0, acc = 0, uiT = 0, saveT = 0, lastStage = -1, fl = [];
  const T = (k, ...a) => { const v = TXT[H.lang()][k]; return typeof v === 'function' ? v(...a) : v; };
  const fmt = (n) => { n = Math.floor(n); if (n < 10000) return String(n); if (n < 1e6) return (n / 1000).toFixed(n < 100000 ? 1 : 0).replace(/\.0$/, '') + 'k'; return (n / 1e6).toFixed(2) + 'M'; };
  const K = () => Pro.CLK, S = () => Pro.P.clk;

  function init(hooks) {
    H = Object.assign(H, hooks);
    cv = $('ckCv'); ctx = cv.getContext('2d');
    D = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * D); cv.height = Math.round(Hh * D);
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); GA.init(); const r = cv.getBoundingClientRect(); tap(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * Hh, false); });
    $('ckUpP').addEventListener('click', () => buy('p'));
    $('ckUpA').addEventListener('click', () => buy('a'));
    $('bCkDoneW').addEventListener('click', () => { $('ckDone').classList.add('hide'); H.wardrobe(); });
    $('bCkDoneC').addEventListener('click', () => $('ckDone').classList.add('hide'));
  }

  function gain(n, x, y, auto) {
    const c = S(); c.fish += n; c.total += n;
    Pro.P.stats.taps += auto ? 0 : 1;
    if (x != null) fl.push({ x, y, v: n, life: 0.9, vx: (Math.random() - 0.5) * 40, e: Math.random() < 0.5 ? '🐟' : '🐠' });
    if (fl.length > 40) fl.shift();
    checkProgress();
  }
  function tap(x, y, auto) {
    pulse = 1; GA.play('tap');
    gain(K().power(), x, y, auto);
    saveT = 1.2;
  }
  function checkProgress() {
    const c = S(), st = K().stage();
    if (lastStage >= 0 && st > lastStage) {
      GA.play('ach'); H.toast(`🐧 ${T('stageUp')}: <b>${K().NAMES[st][H.lang() === 'ru' ? 0 : 1]}</b>`); pulse = 1.6;
      for (let i = 0; i < 12; i++) fl.push({ x: W / 2 + (Math.random() - 0.5) * 120, y: Hh * 0.5, v: 0, life: 1.2, vx: (Math.random() - 0.5) * 120, e: '⭐' });
    }
    lastStage = st;
    if (c.total >= K().GOAL && !c.done) {
      if (Pro.clickerReward()) { GA.play('win'); $('ckDone').classList.remove('hide'); H.refresh(); }
    }
  }
  function buy(w) {
    const c = S(), k = K();
    const lv = w === 'p' ? c.lp : c.la, cost = w === 'p' ? k.costP(lv) : k.costA(lv);
    if (lv >= k.MAXL || c.fish < cost) { GA.play('click'); return; }
    c.fish -= cost; if (w === 'p') c.lp++; else c.la++;
    GA.play('buy'); Pro.save(); build();
  }

  function build() {
    const c = S(), k = K(), st = k.stage();
    $('ckTitle').textContent = '🐟 ' + T('title');
    $('ckFish').textContent = '🐟 ' + fmt(c.fish);
    const per = k.power(), ps = c.la * per;
    $('ckInfo').textContent = `+${fmt(per)} ${T('perTap')}  ·  +${fmt(ps)} ${T('perSec')}`;
    const set = (id, w, name) => {
      const lv = w === 'p' ? c.lp : c.la, cost = w === 'p' ? k.costP(lv) : k.costA(lv), el = $(id), max = lv >= k.MAXL;
      el.innerHTML = `<b>${name}</b> <small>${T('lvl')} ${lv}</small><span>${max ? T('max') : '🐟 ' + fmt(cost)}</span>`;
      el.classList.toggle('off', max || c.fish < cost);
    };
    set('ckUpP', 'p', '👆 ' + T('power')); set('ckUpA', 'a', '⏱ ' + T('auto'));
    const nxt = st < k.STAGES.length - 1 ? k.STAGES[st + 1] : k.GOAL;
    const prev = k.STAGES[st];
    const frac = c.done && st >= k.STAGES.length - 1 ? 1 : Math.max(0, Math.min(1, (c.total - prev) / (nxt - prev)));
    $('ckBar').style.width = Math.round(frac * 100) + '%';
    const nm = st < k.STAGES.length - 1 ? k.NAMES[st + 1][H.lang() === 'ru' ? 0 : 1] : '';
    $('ckNext').textContent = st < k.STAGES.length - 1 ? T('next', nm, fmt(nxt)) : (c.done ? T('reward') : T('last'));
    $('ckGoal').textContent = c.done ? '✅ ' + T('reward') : T('goal', fmt(k.GOAL)) + ` · ${T('total')}: ${fmt(c.total)}`;
    $('ckStage').textContent = k.NAMES[st][H.lang() === 'ru' ? 0 : 1];
    $('ckDoneT').textContent = T('done'); $('ckDoneP').textContent = T('doneTxt'); $('bCkDoneW').textContent = '👗 ' + T('toWard'); $('bCkDoneC').textContent = T('goOn');
    $('bCkBack').textContent = T('back');
  }

  function open() { lastStage = K().stage(); acc = 0; fl = []; build(); }

  function frame(now, dt) {
    const c = S(), k = K();
    if (c.la > 0) { acc += c.la * dt; while (acc >= 1) { acc -= 1; gain(k.power(), W / 2 + (Math.random() - 0.5) * 80, Hh * 0.45, true); pulse = Math.max(pulse, 0.55); } }
    if (saveT > 0) { saveT -= dt; if (saveT <= 0) { Pro.save(); Pro.checkAch(); } }
    uiT -= dt; if (uiT <= 0) { uiT = 0.2; build(); }
    pulse = Math.max(0, pulse - dt * 4);
    ctx.setTransform(D, 0, 0, D, 0, 0); ctx.clearRect(0, 0, W, Hh);
    const look = Object.assign({}, k.LOOKS[k.stage()]);
    // кликер показывает облик стадии, а прошедшим симулятор — свою экипировку по умолчанию не подменяет
    Sc.drawStage(ctx, W, Hh, look, now, { u: Hh * 0.3, squash: 1 - 0.09 * Math.min(1, pulse) + 0.05 * Math.sin(now / 400), cheer: pulse > 0.4 });
    for (let i = fl.length - 1; i >= 0; i--) {
      const f = fl[i]; f.life -= dt; if (f.life <= 0) { fl.splice(i, 1); continue; }
      f.y -= 70 * dt; f.x += f.vx * dt; ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.fillText(f.e, f.x, f.y);
      if (f.v) { ctx.font = 'bold 18px "Trebuchet MS",sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,30,60,.85)'; ctx.fillStyle = '#ffe08a'; ctx.strokeText('+' + fmt(f.v), f.x + 22, f.y - 4); ctx.fillText('+' + fmt(f.v), f.x + 22, f.y - 4); }
      ctx.globalAlpha = 1;
    }
  }

  root.Clicker = { init, open, frame, build };
})(window);
