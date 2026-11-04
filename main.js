(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* liga a TV: uma vez por sessão */
  try { if (sessionStorage.getItem('bs-on')) document.documentElement.classList.add('seen'); sessionStorage.setItem('bs-on', '1'); } catch (e) {}

  /* menu */
  const burger = $('#burger'), nav = $('#nav');
  const setMenu = open => { nav.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* relógio e próxima exibição, no horário de Brasília */
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  const slots = [{ d: 2, h: 14, ch: 'Com Brasil TV' }, { d: 6, h: 21, ch: 'TV Libertas' }];
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function tick() {
    const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
    const hh = +p.hour % 24, mm = +p.minute;
    $('#clock').textContent = `${String(hh).padStart(2, '0')}:${p.minute} BRT`;
    const now = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) * 1440 + hh * 60 + mm;
    let best;
    for (const s of slots) {
      let diff = s.d * 1440 + s.h * 60 - now;
      if (diff < -60) diff += 7 * 1440;
      if (!best || diff < best.diff) best = { ...s, diff };
    }
    let txt;
    if (best.diff <= 0) txt = `No ar agora · ${best.ch}`;
    else if (best.diff < 1440) { const h = Math.floor(best.diff / 60), m = best.diff % 60; txt = `${best.ch} · em ${h ? h + 'h' + String(m).padStart(2, '0') : m + ' min'}`; }
    else txt = `${best.ch} · ${dias[best.d]}, ${best.h}h`;
    $('#nextWhen').textContent = txt;
    $$('.guide-row[data-day]').forEach(r => {
      const on = +r.dataset.day === best.d;
      r.classList.toggle('now', on);
      $('.guide-flag', r).textContent = on ? (best.diff <= 0 ? 'NO AR' : 'PRÓXIMO') : '';
    });
  }
  tick(); setInterval(tick, 20000);

  /* player com troca de canal */
  const chans = [
    { src: 'media/tv-combrasil.mp4', poster: 'media/tv-combrasil.jpg', t: 'Chamada no estúdio do Com Brasil' },
    { src: 'media/tv-uai.mp4', poster: 'media/tv-uai.jpg', t: 'Bona & Uai Veículos' },
    { src: 'media/tv-estudio.mp4', poster: 'media/tv-estudio.jpg', t: 'Bonna no estúdio' }
  ];
  const tv = $('#tvVideo'), scr = $('.player-screen'), osd = $('#tvOsd'), cv = $('#tvNoise'), snd = $('#tvSound');
  const ctx = cv.getContext('2d'); cv.width = 160; cv.height = 90;
  let cur = 0, tvSeen = false, nRaf = 0, osdT;
  const noise = () => {
    const img = ctx.createImageData(160, 90);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0); nRaf = requestAnimationFrame(noise);
  };
  function setCh(i) {
    cur = (i + chans.length) % chans.length;
    scr.classList.add('zap'); cancelAnimationFrame(nRaf); noise();
    osd.textContent = 'CH ' + String(cur + 1).padStart(2, '0'); osd.classList.add('show');
    clearTimeout(osdT); osdT = setTimeout(() => osd.classList.remove('show'), 1600);
    $('#tvTitle').textContent = chans[cur].t;
    setTimeout(() => {
      tv.src = chans[cur].src; tv.poster = chans[cur].poster;
      if (tvSeen) tv.play().catch(() => {});
      setTimeout(() => { scr.classList.remove('zap'); cancelAnimationFrame(nRaf); }, 200);
    }, 240);
  }
  tv.muted = true; tv.src = chans[0].src;
  tv.addEventListener('ended', () => setCh(cur + 1));
  $('#chUp').addEventListener('click', () => setCh(cur + 1));
  $('#chDown').addEventListener('click', () => setCh(cur - 1));
  snd.addEventListener('click', () => {
    tv.muted = !tv.muted; snd.textContent = tv.muted ? '🔇 Som' : '🔊 Som';
    if (!tv.muted) { stopReels(); tv.play().catch(() => {}); }
  });

  /* episódios do canal */
  const eps = [
    ['jpegTO2xwOc', '99', 'Catedral de Pouso Alegre', '30/10/2026'],
    ['I_s30WKGZKo', '98', 'Comandante Hamilton em Jacutinga', '18/10/2026'],
    ['ULBpbknkGKU', '97', 'Drone N. S. das Graças', '07/10/2026'],
    ['q-iN9mMx_sQ', '96', 'Comandante Hamilton em Bueno Brandão', '22/09/2026'],
    ['S51d-P20EOU', '95', 'Rota do Sabor: Alinne no Hocca Bar', '12/09/2026'],
    ['0uUmTUGGPrE', '94', 'Comandante Hamilton no Rodeio de Ouro Fino', '03/09/2026']
  ];
  $('#eps').innerHTML = eps.map(([id, n, t, d]) => `
    <button class="ep" data-yt="${id}" aria-label="Assistir programa ${n}: ${t}">
      <div class="ep-thumb"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="ep-play">▶</span></div>
      <div class="ep-body"><span class="ep-n">${n}</span><div><b>${t}</b><small>${d}</small></div></div>
    </button>`).join('');

  const modal = $('#modal'), frame = $('#modalFrame');
  const closeModal = () => { modal.hidden = true; frame.innerHTML = ''; };
  $('#eps').addEventListener('click', e => {
    const b = e.target.closest('.ep'); if (!b) return;
    tv.pause(); stopReels();
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Bonna Show & Amigos"></iframe>`;
    modal.hidden = false;
  });
  $('#modalX').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* bastidores com som ao tocar */
  const reels = $$('.reel');
  function stopReels(except) { reels.forEach(r => { if (r !== except) { $('video', r).pause(); r.classList.remove('playing'); } }); }
  reels.forEach(r => {
    const v = $('video', r);
    r.addEventListener('click', () => {
      if (!v.src) v.src = r.dataset.src;
      if (r.classList.contains('playing')) { v.pause(); r.classList.remove('playing'); return; }
      stopReels(r); tv.muted = true; snd.textContent = '🔇 Som';
      v.play().catch(() => {}); r.classList.add('playing');
    });
  });

  /* vídeos tocam só quando visíveis */
  const vio = new IntersectionObserver(es => es.forEach(({ target: v, isIntersecting: on }) => {
    if (v === tv) tvSeen = on;
    if (v.closest('.reel')) { if (!on) { v.pause(); v.closest('.reel').classList.remove('playing'); } return; }
    if (on) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: '100px' });
  [tv, ...$$('video.autoplay'), ...$$('.reel video')].forEach(v => vio.observe(v));

  /* entrada suave */
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { threshold: .15 });
  $$('.perfil-photo, .perfil-txt, .stats, .player, .guide, .ep, .road-txt, .road-vid, .reel, .biz-l, .form').forEach(el => { el.classList.add('rv'); rio.observe(el); });

  /* contato → WhatsApp */
  $('#form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const msg = [
      'Olá, Bonna! Vim pelo site e quero anunciar no Bonna Show & Amigos.',
      `Interesse: ${f.get('fmt')}`,
      `Nome: ${f.get('nome')}`,
      f.get('empresa') && `Empresa: ${f.get('empresa')}`,
      f.get('cidade') && `Cidade: ${f.get('cidade')}`
    ].filter(Boolean).join('\n');
    window.open('https://wa.me/5535998075560?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });
})();
