// assets/js/partials-loader.js
// Loader professionnel de partials HTML avec exécution de <script> (inline/src, module ou non)

export async function includePartials(root = document) {
  const slots = Array.from(root.querySelectorAll('[data-include]'));
  for (const slot of slots) {
    const url = slot.getAttribute('data-include');
    if (!url) continue;

    // Chemins relatifs uniquement (évite les 404 hors racine)
    const fixedUrl = url.startsWith('/') ? url.replace(/^\//, '') : url;

    try {
      const res = await fetch(fixedUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} @ ${fixedUrl}`);
      const html = await res.text();

      // Parse
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Injecte le contenu sans scripts pour éviter double exécution
      const fragment = document.createElement('div');
      fragment.innerHTML = doc.body ? doc.body.innerHTML : html;
      fragment.querySelectorAll('script').forEach(s => s.remove());
      slot.innerHTML = fragment.innerHTML;

      // Exécute les scripts du partial dans l'ordre
      const scripts = Array.from(doc.querySelectorAll('script'));
      for (const sc of scripts) {
        await runScript(sc, slot);
      }
    } catch (err) {
      console.error(err);
      slot.innerHTML = `
        <div style="padding:16px;border:1px solid rgba(255,255,255,.25);
                    border-radius:12px;background:rgba(255,255,255,.06);color:#EDE6DA">
          <strong>Erreur de chargement</strong><br>
          <code>${fixedUrl}</code><br>${String(err.message || err)}
        </div>`;
    }
  }
}

async function runScript(sourceScript, mount) {
  const s = document.createElement('script');
  for (const a of sourceScript.attributes) s.setAttribute(a.name, a.value);

  if (sourceScript.src) {
    // Respect de l'ordre si pas async
    await new Promise((resolve, reject) => {
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Erreur chargement script ${sourceScript.src}`));
      mount.appendChild(s);
    });
  } else {
    s.textContent = sourceScript.textContent;
    mount.appendChild(s);
  }
}
