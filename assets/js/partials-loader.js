/**
 * includePartials()
 * Charge les fragments HTML indiqués par data-include="partials/xxx.html"
 * - Injecte le HTML
 * - Remonte <style> et <link rel="stylesheet"> dans <head> (anti-doublons)
 * - Exécute les <script> (inline & src) dans l'ordre
 * Retourne une Promise résolue quand tout est chargé.
 */
async function includePartials(){
  const slots = Array.from(document.querySelectorAll('[data-include]'));
  for (const slot of slots){
    const url = slot.getAttribute('data-include');
    const html = await fetch(url, {cache:'no-store'}).then(r=>r.text());
    const tmp = document.createElement('div'); tmp.innerHTML = html;

    // Move styles/links to head (avoid duplicates)
    const head = document.head;
    tmp.querySelectorAll('link[rel="stylesheet"], style').forEach(node=>{
      // dedupe by href or content
      if(node.tagName === 'LINK'){
        const href = node.getAttribute('href');
        if(!href) return;
        if(!Array.from(head.querySelectorAll('link[rel="stylesheet"]')).some(l=>l.href.includes(href))){
          head.appendChild(node.cloneNode(true));
        }
      } else {
        head.appendChild(node.cloneNode(true));
      }
      node.remove();
    });

    // Extract scripts in order
    const scripts = Array.from(tmp.querySelectorAll('script'));
    scripts.forEach(s=>s.remove()); // keep clean HTML for inject
    slot.innerHTML = tmp.innerHTML;

    // Execute scripts sequentially
    for(const s of scripts){
      await new Promise((res,rej)=>{
        const el = document.createElement('script');
        // copy attributes
        for(const {name,value} of Array.from(s.attributes)) el.setAttribute(name,value);
        if(s.src){
          el.onload = ()=>res();
          el.onerror = ()=>res(); // ne bloque pas
          document.body.appendChild(el);
        } else {
          el.textContent = s.textContent;
          document.body.appendChild(el);
          res();
        }
      });
    }
  }
}
