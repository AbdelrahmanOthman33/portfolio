// Abdelrahman Osman — genoo.me-inspired interactions (v2 original implementation)
(() => {
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Sticky nav: mobile toggle (placeholder for future sheet)
  const toggle = qs('.nav-toggle');
  toggle?.addEventListener('click', () => {
    // For minimalism: just open the command palette on small screens
    openCmd();
  });

  // Section reveal
  const revealer = 'IntersectionObserver' in window ? new IntersectionObserver((entries, io) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }) : null;
  qsa('.reveal').forEach(el => revealer ? revealer.observe(el) : el.classList.add('in'));

  // Footer year
  const y = new Date().getFullYear();
  const yEl = qs('[data-year]'); if (yEl) yEl.textContent = String(y);

  // Contact form (mailto + inline status)
  const form = qs('#contactForm'); const status = qs('#formStatus');
  function enc(s){ return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16)); }
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const subject = String(fd.get('subject') || '').trim();
    const message = String(fd.get('message') || '').trim();
    if (!name || !email || !subject || !message) { status.textContent = 'Please complete all fields.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = 'Please enter a valid email address.'; return; }
    const body = ['Name: ' + name, 'Email: ' + email, '', message].join('\n');
    const mailto = `mailto:?subject=${enc(subject)}&body=${enc(body)}`;
    status.textContent = 'Opening your email client…';
    setTimeout(() => location.href = mailto, 60);
  });

  // Image placeholder fallbacks
  function placeholder(w=800, h=600, text='Image coming soon'){
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#012318'/><stop offset='100%' stop-color='#064933'/></linearGradient></defs>
      <rect width='100%' height='100%' fill='url(#g)'/><rect x='12' y='12' width='${w-24}' height='${h-24}' rx='12' ry='12' fill='none' stroke='rgba(0,255,163,0.35)' stroke-width='2'/>
      <g fill='#9ee8cd' font-family='sans-serif' font-size='${Math.max(14, Math.min(28, w/20))}'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>${text}</text></g>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  qsa('img[data-fallback]').forEach(img => {
    img.addEventListener('error', () => { img.src = placeholder(800, 600); }, { once:true });
  });

  // Command palette
  const cmd = qs('#cmd');
  const cmdInput = qs('#cmdInput');
  const cmdList = qs('#cmdList');
  function openCmd(){
    cmd?.setAttribute('aria-hidden', 'false');
    setTimeout(() => cmdInput?.focus(), 50);
  }
  function closeCmd(){ cmd?.setAttribute('aria-hidden', 'true'); }

  function handleCmdEnter(){
    const first = cmdList?.querySelector('[aria-selected="true"]') || cmdList?.querySelector('li');
    const target = first?.getAttribute('data-go');
    if (target) {
      closeCmd();
      const el = qs(target);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Search filtering
  cmdInput?.addEventListener('input', () => {
    const q = cmdInput.value.toLowerCase();
    qsa('#cmdList li').forEach(li => {
      const txt = li.textContent?.toLowerCase() || '';
      li.style.display = txt.includes(q) ? '' : 'none';
      li.removeAttribute('aria-selected');
    });
    const firstVisible = qsa('#cmdList li').find(li => li.style.display !== 'none');
    if (firstVisible) firstVisible.setAttribute('aria-selected', 'true');
  });
  cmdList?.addEventListener('click', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    cmdInput.value = ''; qsa('#cmdList li').forEach(x => x.style.display = '');
    li.setAttribute('aria-selected', 'true'); handleCmdEnter();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Open CMD: Ctrl/Meta + K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmd?.getAttribute('aria-hidden') === 'true') openCmd(); else closeCmd();
    }
    // Close CMD
    if (e.key === 'Escape' && cmd?.getAttribute('aria-hidden') === 'false') closeCmd();
    // Move selection
    if (cmd?.getAttribute('aria-hidden') === 'false' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const items = qsa('#cmdList li').filter(li => li.style.display !== 'none');
      const i = items.findIndex(x => x.getAttribute('aria-selected') === 'true');
      const next = e.key === 'ArrowDown' ? Math.min((i+1),(items.length-1)) : Math.max((i-1),0);
      items.forEach(x => x.removeAttribute('aria-selected')); items[next]?.setAttribute('aria-selected','true');
      items[next]?.scrollIntoView({ block: 'nearest' });
    }
    // Enter to go
    if (cmd?.getAttribute('aria-hidden') === 'false' && (e.key === 'Enter')) {
      e.preventDefault();
      handleCmdEnter();
    }
  });

  // GitHub repo fallback
  const GH_API = 'https://api.github.com/repos/';
  function showRepoCard(repoId){ const card = qs(`[data-repo-card="${repoId}"]`); if (card) card.hidden = false; }
  function hideRepoIframe(repoId){ const wrap = qsa('.gh-iframe-wrap').find(w => w.dataset.repo === repoId); if (wrap) wrap.style.display = 'none'; }
  async function hydrateRepo(repoId){
    try{
      const r = await fetch(GH_API + repoId, { headers:{ 'Accept':'application/vnd.github+json' }});
      if(!r.ok) throw new Error('meta ' + r.status);
      const m = await r.json();
      const c = document.querySelector(`[data-repo-card="${repoId}"]`);
      if(!c) return;
      c.querySelector('.repo-desc').textContent = m.description || 'No description.';
      c.querySelector('[data-stars]').textContent = new Intl.NumberFormat().format(m.stargazers_count || 0);
      const d = new Date(m.updated_at); const t = c.querySelector('[data-updated]');
      t.textContent = d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric'}); t.setAttribute('datetime', d.toISOString());
    }catch(e){ console.warn('GitHub meta failed', e); }
  }
  async function loadReadme(repoId){
    const c = qs(`[data-repo-card="${repoId}"]`); const target = c?.querySelector('[data-readme]'); if(!c || !target) return;
    target.innerHTML = '<p class="muted">Loading README…</p>';
    try{
      const r = await fetch(GH_API + repoId + '/readme', { headers:{ 'Accept':'application/vnd.github+json' }});
      if(!r.ok) throw new Error('readme ' + r.status);
      const j = await r.json(); const md = atob((j.content || '').replace(/\n/g,''));
      target.innerHTML = renderMD(md);
    }catch(e){ target.innerHTML = '<p class="muted">README unavailable.</p>'; }
  }
  function renderMD(md){
    const escape = (s) => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const lines = md.split(/\r?\n/); const out = []; let inCode=false;
    for(let line of lines){
      if(/^```/.test(line)){ inCode = !inCode; out.push(inCode?'<pre><code>':'</code></pre>'); continue; }
      if(inCode){ out.push(escape(line) + '\n'); continue; }
      if(/^#\s+/.test(line)) out.push('<h1>'+escape(line.replace(/^#\s+/,'') )+'</h1>');
      else if(/^##\s+/.test(line)) out.push('<h2>'+escape(line.replace(/^##\s+/,'') )+'</h2>');
      else if(/^###\s+/.test(line)) out.push('<h3>'+escape(line.replace(/^###\s+/,'') )+'</h3>');
      else if(line.trim()==='') out.push('');
      else { const html = escape(line).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'); out.push('<p>'+html+'</p>'); }
    }
    return out.join('\n');
  }
  // Initialize GH fallbacks (assume blocked and show card quickly)
  qsa('.gh-iframe-wrap').forEach(w => {
    const repo = w.dataset.repo;
    setTimeout(() => { hideRepoIframe(repo); showRepoCard(repo); hydrateRepo(repo); }, 700);
  });
  qsa('[data-open-readme]').forEach(btn => btn.addEventListener('click', () => loadReadme(btn.getAttribute('data-open-readme'))));

  // --- Draw the transformation network (SVG)
  function drawNN(){
    const svg = qs('#nnCanvas');
    if (!svg) return;
    const cols = 6;                // number of vertical columns
    const rows = [6,5,7,5,6,5];    // node count per column
    const W = 1100, H = 420, padX = 80, padY = 40;
    const colW = (W - padX*2) / (cols - 1);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Helpers
    const ns = 'http://www.w3.org/2000/svg';
    function circle(cx, cy, r){
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
      c.setAttribute('fill', 'rgba(0,255,163,0.3)'); c.setAttribute('stroke', 'rgba(0,255,163,0.85)');
      c.setAttribute('stroke-width', '2');
      return c;
    }
    function line(x1, y1, x2, y2){
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('stroke', 'rgba(0,255,163,0.35)'); l.setAttribute('stroke-width', '1.2');
      return l;
    }
    const nodes = [];
    for (let i=0;i<cols;i++){
      const n = rows[i];
      const x = padX + i*colW;
      const colNodes = [];
      for (let j=0;j<n;j++){
        const y = padY + (H - padY*2) * (j+0.5)/n;
        colNodes.push({x, y});
      }
      nodes.push(colNodes);
    }
    // draw lines between adjacent columns
    for (let i=0;i<cols-1;i++){
      for (const a of nodes[i]){
        for (const b of nodes[i+1]){
          svg.appendChild(line(a.x, a.y, b.x, b.y));
        }
      }
    }
    // draw nodes
    for (const col of nodes){
      for (const n of col){
        svg.appendChild(circle(n.x, n.y, 9));
      }
    }
  }
  drawNN();
})();