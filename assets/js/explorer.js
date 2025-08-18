/* global L */
const Explorer = (() => {
  let state = {
    items: [],
    filtered: [],
    markers: [],
    map: null,
    presetCategory: null
  };

  const els = {
    grid: null, q: null, category: null, reset: null, count: null, mapEl: null
  };

  async function init({ presetCategory = null } = {}){
    // bind DOM
    els.grid = document.getElementById('grid');
    els.q = document.getElementById('q');
    els.category = document.getElementById('category');
    els.reset = document.getElementById('reset');
    els.count = document.getElementById('count');
    els.mapEl = document.querySelector('.hbv-map');

    state.presetCategory = presetCategory;

    // Pré-sélection catégorie si page activité
    if (presetCategory && els.category){
      els.category.value = presetCategory;
      els.category.setAttribute('disabled','disabled'); // garde la toolbar cohérente sans permettre de dériver
    }

    // Map
    if (els.mapEl){
      state.map = L.map(els.mapEl, { scrollWheelZoom:false }).setView([46.8, 2.3], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap'
      }).addTo(state.map);
    }

    // Events
    if(els.q) els.q.addEventListener('input', debounce(applyFilters, 250));
    if(els.category && !presetCategory) els.category.addEventListener('change', applyFilters);
    if(els.reset) els.reset.addEventListener('click', () => {
      if(els.q){ els.q.value = ''; }
      if(els.category && !presetCategory){ els.category.value=''; }
      applyFilters();
    });

    // Fetch
    await fetchAndRender();
  }

  async function fetchAndRender(){
    const params = new URLSearchParams();
    if (state.presetCategory) params.set('category', state.presetCategory);
    params.set('limit','200');
    const url = '/.netlify/functions/lodgings' + (params.toString()?`?${params.toString()}`:'');
    const res = await fetch(url);
    const data = await res.json();
    state.items = Array.isArray(data.items) ? data.items : [];
    applyFilters(/* shuffle on first render */ true);
  }

  function applyFilters(shuffleFirst = false){
    const q = (els.q?.value || '').trim().toLowerCase();
    const category = state.presetCategory || (els.category?.value || '').trim();
    let arr = state.items.slice(0);

    if (category) arr = arr.filter(x => (x.category || '').toLowerCase() === category);
    if (q){
      arr = arr.filter(x => {
        const hay = `${x.title} ${x.shortDescription||''} ${x.location?.city||''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // Shuffle par défaut
    if (shuffleFirst) arr = shuffle(arr);

    state.filtered = arr;
    render();
    updateMap();
    updateCount();
  }

  function render(){
    if (!els.grid) return;
    els.grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    let side = 'left';
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries){
        if (e.isIntersecting){
          e.target.classList.add('reveal-visible');
          observer.unobserve(e.target);
        }
      }
    }, { rootMargin:'0px 0px -10% 0px', threshold:0.1 });

    for (const item of state.filtered){
      const card = document.createElement('article');
      card.className = 'card-lodging glass reveal-hidden';
      card.setAttribute('data-side', side);
      side = (side === 'left' ? 'right' : 'left');

      const media = document.createElement('div');
      media.className = 'media';
      const img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async';
      img.alt = `Photo de ${item.title}`;
      img.src = (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop';
      media.appendChild(img);

      const body = document.createElement('div');
      body.className = 'body';
      const h = document.createElement('h3');
      h.className = 'h3'; h.textContent = item.title;
      const p = document.createElement('p');
      p.className = 'muted'; p.textContent = item.shortDescription || '';
      body.appendChild(h); body.appendChild(p);

      const meta = document.createElement('div');
      meta.className = 'meta';
      const price = document.createElement('span');
      price.className = 'badge price';
      price.textContent = `À partir de ${new Intl.NumberFormat('fr-FR').format(item.priceFrom)} €`;

      const cta = document.createElement('a');
      cta.className = 'btn btn-cta';
      cta.href = item.bookingUrl || '#';
      cta.target = '_blank'; cta.rel = 'noopener';
      cta.setAttribute('aria-label', `Réserver ${item.title}`);
      cta.textContent = 'Réserver';

      meta.appendChild(price);
      meta.appendChild(cta);

      // Lien vers fiche optionnelle
      const titleLink = document.createElement('a');
      titleLink.href = `logement.html?id=${encodeURIComponent(item.id)}`;
      titleLink.setAttribute('aria-label', `Voir la fiche de ${item.title}`);
      titleLink.style.textDecoration = 'none';
      h.prepend(titleLink);
      titleLink.append(h.childNodes[1]); // place le texte dans le lien

      card.appendChild(media);
      card.appendChild(body);
      card.appendChild(meta);
      frag.appendChild(card);

      observer.observe(card);
    }
    els.grid.appendChild(frag);
  }

  function updateMap(){
    if (!state.map) return;
    // clear
    state.markers.forEach(m => m.remove());
    state.markers = [];
    for (const item of state.filtered){
      if (!item.location) continue;
      const marker = L.marker([item.location.lat, item.location.lng]).addTo(state.map);
      marker.bindPopup(`<strong>${item.title}</strong><br>${item.location.city||''}`);
      state.markers.push(marker);
    }
  }

  function updateCount(){
    if (!els.count) return;
    els.count.textContent = `${state.filtered.length} logement${state.filtered.length>1?'s':''}`;
  }

  function shuffle(arr){
    // Fisher–Yates
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function debounce(fn, ms){
    let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
  }

  return { init };
})();
