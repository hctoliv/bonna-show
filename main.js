(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* vinheta: uma vez por sessão, ?intro repete */
  const intro = $('#intro');
  let showIntro = !reduce;
  try { showIntro = showIntro && (!sessionStorage.getItem('bs-intro') || location.search.includes('intro')); sessionStorage.setItem('bs-intro', '1'); } catch (e) {}
  if (showIntro) {
    document.documentElement.classList.add('intro-on');
    const end = () => { intro.classList.add('out'); setTimeout(() => document.documentElement.classList.remove('intro-on'), 700); };
    const t = setTimeout(end, 2500);
    intro.addEventListener('click', () => { clearTimeout(t); end(); });
    addEventListener('keydown', () => { clearTimeout(t); end(); }, { once: true });
  }

  /* menu */
  const burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = '';
  }));

  /* próxima exibição (horário de Brasília) */
  const slots = [
    { d: 2, h: 14, ch: 'Com Brasil TV' },
    { d: 6, h: 21, ch: 'TV Libertas' }
  ];
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function brNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), m: (+p.hour % 24) * 60 + +p.minute };
  }
  function nextSlot() {
    const n = brNow(), now = n.d * 1440 + n.m;
    let best = null;
    for (const s of slots) {
      const start = s.d * 1440 + s.h * 60;
      let diff = start - now;
      if (diff < -60) diff += 7 * 1440;
      if (!best || diff < best.diff) best = { ...s, diff };
    }
    return best;
  }
  function renderNext() {
    const s = nextSlot();
    let when;
    if (s.diff <= 0) { $('#nextLabel').textContent = 'No ar agora'; when = s.ch; }
    else {
      $('#nextLabel').textContent = 'Próxima exibição';
      const h = Math.floor(s.diff / 60), m = s.diff % 60;
      const quando = s.diff < 24 * 60 ? (h ? `em ${h}h${String(m).padStart(2, '0')}` : `em ${m} min`) : `${dias[s.d]}, ${s.h}h`;
      when = `${s.ch} · ${quando}`;
    }
    $('#nextWhen').textContent = when;
    $$('.gcard[data-day]').forEach(c => c.classList.toggle('next', +c.dataset.day === s.d));
  }
  renderNext(); setInterval(renderNext, 30000);

  /* TV com zapping */
  const chans = [
    { src: 'media/tv-combrasil.mp4', poster: 'media/tv-combrasil.jpg' },
    { src: 'media/tv-uai.mp4', poster: 'media/tv-uai.jpg' },
    { src: 'media/tv-estudio.mp4', poster: 'media/tv-estudio.jpg' }
  ];
  const tv = $('#tvVideo'), screen = $('.tv-screen'), osd = $('#tvOsd'), cv = $('#tvNoise'), snd = $('#tvSound');
  const ctx = cv.getContext('2d');
  cv.width = 160; cv.height = 90;
  let cur = 0, tvVisible = false, noiseRaf = 0, osdT;
  function noise() {
    const img = ctx.createImageData(cv.width, cv.height);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    noiseRaf = requestAnimationFrame(noise);
  }
  function setChannel(i, user) {
    cur = (i + chans.length) % chans.length;
    $$('#chList button').forEach(b => b.classList.toggle('on', +b.dataset.ch === cur));
    screen.classList.add('zap'); cancelAnimationFrame(noiseRaf); noise();
    osd.textContent = 'CH ' + String(cur + 1).padStart(2, '0'); osd.classList.add('show');
    clearTimeout(osdT); osdT = setTimeout(() => osd.classList.remove('show'), 1800);
    setTimeout(() => {
      tv.src = chans[cur].src; tv.poster = chans[cur].poster;
      if (tvVisible || user) tv.play().catch(() => {});
      setTimeout(() => { screen.classList.remove('zap'); cancelAnimationFrame(noiseRaf); }, 220);
    }, 260);
  }
  tv.muted = true;
  tv.addEventListener('ended', () => setChannel(cur + 1));
  $$('#chList button').forEach(b => b.addEventListener('click', () => setChannel(+b.dataset.ch, true)));
  $('#chUp').addEventListener('click', () => setChannel(cur + 1, true));
  $('#chDown').addEventListener('click', () => setChannel(cur - 1, true));
  snd.addEventListener('click', () => {
    tv.muted = !tv.muted;
    snd.textContent = tv.muted ? '🔇 Ligar som' : '🔊 Som ligado';
    if (!tv.muted) { stopReels(); tv.play().catch(() => {}); }
  });
  tv.src = chans[0].src;

  /* episódios */
  const eps = [
    ['jpegTO2xwOc', '99', 'Catedral de Pouso Alegre', '30/10/2026', 0],
    ['I_s30WKGZKo', '98', 'Comandante Hamilton em Jacutinga', '18/10/2026', 5409],
    ['ULBpbknkGKU', '97', 'Drone N. S. das Graças', '07/10/2026', 2739],
    ['q-iN9mMx_sQ', '96', 'Comandante Hamilton em Bueno Brandão', '22/09/2026', 5151],
    ['S51d-P20EOU', '95', 'Rota do Sabor: Alinne no Hocca Bar', '12/09/2026', 5108],
    ['0uUmTUGGPrE', '94', 'Comandante Hamilton no Rodeio de Ouro Fino', '03/09/2026', 3342],
    ['z1P42EuWA94', '90', 'Bona Show & Amigos', '07/07/2026', 1977],
    ['ji9SbsmD6Ow', '83', 'Pastor Evandro e Uai Veículos', '20/05/2026', 1531],
    ['4jwjXnqzV_M', '82', 'Café e Charretes', '05/05/2026', 1386],
    ['lCjLuRdTtJs', '81', 'Bueno Brandão: Pousada Serra Verde, Castelo e Ecotrilhas', '18/04/2026', 2071],
    ['cu0at6lWgCI', '80', 'Entrevistas, histórias e sucesso', '10/03/2026', 2584],
    ['lfBai0RjHik', '79', 'Bona Show & Amigos', '23/02/2026', 2821]
  ];
  const track = $('#epsTrack');
  track.innerHTML = eps.map(([id, n, t, d, v]) => `
    <button class="ep" data-yt="${id}" aria-label="Assistir programa ${n}: ${t}">
      <div class="ep-thumb"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="ep-num">${n}</span><span class="ep-play">▶</span></div>
      <div class="ep-body"><b>${t}</b><small>${d}${v ? ' · ' + v.toLocaleString('pt-BR') + ' visualizações' : ' · novo'}</small></div>
    </button>`).join('');
  const step = () => track.querySelector('.ep').offsetWidth + 18;
  $('#epsNext').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  $('#epsPrev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));

  const modal = $('#modal'), frame = $('#modalFrame');
  function closeModal() { modal.hidden = true; frame.innerHTML = ''; }
  track.addEventListener('click', e => {
    const b = e.target.closest('.ep'); if (!b) return;
    tv.pause(); stopReels();
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Bonna Show & Amigos"></iframe>`;
    modal.hidden = false;
  });
  $('#modalX').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* bastidores: toque toca com som */
  const reels = $$('.reel');
  function stopReels(except) {
    reels.forEach(r => { if (r === except) return; const v = $('video', r); v.pause(); v.muted = true; r.classList.remove('playing'); });
  }
  reels.forEach(r => {
    const v = $('video', r);
    r.addEventListener('click', () => {
      if (!v.src) v.src = r.dataset.src;
      if (r.classList.contains('playing')) { v.pause(); r.classList.remove('playing'); return; }
      stopReels(r); tv.muted = true; snd.textContent = '🔇 Ligar som';
      v.muted = false; v.currentTime = 0; v.play().catch(() => {}); r.classList.add('playing');
    });
  });

  /* vídeos só tocam quando aparecem */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (v === tv) { tvVisible = e.isIntersecting; }
    if (e.isIntersecting) { if (v.dataset.lazy !== undefined && !v.getAttribute('preload-done')) { v.preload = 'auto'; v.setAttribute('preload-done', ''); } if (v.muted) v.play().catch(() => {}); }
    else v.pause();
  }), { rootMargin: '120px' });
  [tv, $('.cidade-bg'), $('.hero-monitor video')].forEach(v => vio.observe(v));
  reels.forEach(r => new IntersectionObserver(([e]) => { if (!e.isIntersecting) { const v = $('video', r); v.pause(); r.classList.remove('playing'); } }).observe(r));

  /* revelar */
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { threshold: .2 });
  $$('.tl li, .gcard, .reach, .ops, .stop, .ads-img, .ads-form-wrap, .tv, .tv-intro').forEach(el => { if (!el.closest('.tl')) el.classList.add('rv'); rio.observe(el); });

  /* header + parallax num só rAF */
  const hd = $('#hd'), par = $$('[data-par]');
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY;
    hd.classList.toggle('solid', y > 40);
    hd.classList.toggle('hide', y > lastY && y > 400 && !nav.classList.contains('open'));
    lastY = y;
    if (!reduce && y < innerHeight * 1.2) par.forEach(el => {
      const k = +el.dataset.par;
      el.style.translate = `0 ${y * k}px`;
    });
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* anuncie → WhatsApp */
  $('#adsForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const linhas = [
      'Olá, Bonna! Vim pelo site e quero anunciar no Bonna Show & Amigos.',
      `Interesse: ${f.get('fmt')}`,
      `Nome: ${f.get('nome')}`,
      f.get('empresa') && `Empresa: ${f.get('empresa')}`,
      f.get('cidade') && `Cidade: ${f.get('cidade')}`
    ].filter(Boolean);
    window.open('https://wa.me/5535998075560?text=' + encodeURIComponent(linhas.join('\n')), '_blank', 'noopener');
  });
})();
