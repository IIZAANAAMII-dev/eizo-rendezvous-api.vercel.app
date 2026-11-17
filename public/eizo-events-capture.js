/* EIZO Events : copie des inscriptions Globo de /pages/rencontre-2026 vers le back-office.
   Chargé par une balise <script> dans le contenu de la page ; inactif sur les autres pages.
   Fiabilité : chaque demande est mise en file d'attente dans le navigateur et n'en sort
   qu'une fois confirmée par le serveur ; sinon elle est renvoyée à la visite suivante. */
(function(){
  if (!/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?pages\/rencontre-2026\/?$/i.test(location.pathname)) return;
  if (window.__eizoEventsCapture) return;
  window.__eizoEventsCapture = true;
  var ENDPOINT = "https://eizo-rendezvous-api-vercel-app.vercel.app/api/events/inscriptions/rencontre-2026";
  var FORM_ID = "171416";
  var QUEUE = "eizo-events-pending";
  var FIELDS = {
    "text-1": "first_name", "text": "last_name", "text-2": "company", "text-3": "job_title",
    "email": "email", "select-1": "slot", "textarea": "message"
  };
  var lastSent = "";

  // Partenaires : ajoute Matrox à la bande des partenaires technologiques (sans doublon si le
  // logo est un jour ajouté directement dans le HTML de la page Shopify).
  var PARTNERS = [
    { name: "Matrox", label: "MATROX", logo: "https://cdn.shopify.com/s/files/1/0844/9913/6854/files/matrox_video_logo_400x225_85a463c7-abb9-4725-830e-7c8e6da4eaa7.png?v=1743158949" }
  ];
  function addPartners(){
    var strip = document.querySelector("#elp-partenaires .elp-brand-strip");
    if (!strip) return;
    var added = 0;
    PARTNERS.forEach(function(partner){
      if (strip.querySelector('img[alt="' + partner.name + '"]')) return;
      var item = document.createElement("div");
      item.className = "elp-brand";
      var img = document.createElement("img");
      img.src = partner.logo; img.alt = partner.name; img.width = 155; img.height = 52;
      img.loading = "lazy"; img.decoding = "async";
      var label = document.createElement("span");
      label.textContent = partner.label;
      item.appendChild(img); item.appendChild(label);
      strip.appendChild(item); added++;
    });
    var total = strip.querySelectorAll(".elp-brand").length;
    if (added && !document.getElementById("eizo-partners-style")) {
      var style = document.createElement("style");
      style.id = "eizo-partners-style";
      // Sélecteurs plus précis que ceux de la page, dont le CSS est chargé après ce script.
      style.textContent = "#eizo-lp #elp-partenaires .elp-brand-strip{grid-template-columns:repeat(" + total + ",minmax(0,1fr))}" +
        "@media(max-width:800px){#eizo-lp #elp-partenaires .elp-brand-strip{grid-template-columns:repeat(2,minmax(0,1fr))}" +
        "#eizo-lp #elp-partenaires .elp-brand:last-child:nth-child(2n){border-right:0}}";
      document.head.appendChild(style);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addPartners, { once: true }); else addPartners();

  function readQueue(){ try { return JSON.parse(localStorage.getItem(QUEUE) || "[]"); } catch(e){ return []; } }
  function writeQueue(list){ try { localStorage.setItem(QUEUE, JSON.stringify(list.slice(-10))); } catch(e){} }
  function enqueue(payload){
    var list = readQueue().filter(function(item){ return item.email !== payload.email; });
    list.push(payload); writeQueue(list);
  }
  function dequeue(email){ writeQueue(readQueue().filter(function(item){ return item.email !== email; })); }

  function post(payload){
    var body = JSON.stringify(payload);
    try {
      return fetch(ENDPOINT, { method: "POST", body: body, keepalive: true, mode: "cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" } })
        .then(function(response){ if (response.ok || response.status === 400) dequeue(payload.email); })
        .catch(function(){ /* reste en file : renvoyé à la prochaine visite */ });
    } catch (e) {
      if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    }
  }
  function flush(){ readQueue().forEach(post); }

  function value(form, name){
    var field = form.querySelector('[name="' + name + '"]');
    if (!field) return "";
    if (field.tagName === "SELECT") {
      var option = field.options[field.selectedIndex];
      return option && !option.disabled ? (option.text || option.value).trim() : "";
    }
    return String(field.value || "").trim();
  }
  function capture(form){
    if (form.checkValidity && !form.checkValidity()) return;
    var payload = {};
    Object.keys(FIELDS).forEach(function(name){ payload[FIELDS[name]] = value(form, name); });
    var consent = form.querySelector('[name^="consent"]');
    payload.consent = !!(consent && consent.checked);
    if (!payload.email || payload.email.indexOf("@") < 1) return;
    var body = JSON.stringify(payload);
    if (body === lastSent) return;
    lastSent = body;
    enqueue(payload);
    post(payload);
  }

  document.addEventListener("submit", function(event){
    var form = event.target;
    if (form && form.matches && form.matches('form[data-id="' + FORM_ID + '"]')) capture(form);
  }, true);
  // Filet de sécurité si Globo envoie en AJAX sans déclencher d'événement « submit ».
  document.addEventListener("click", function(event){
    var button = event.target && event.target.closest && event.target.closest('button[type="submit"]');
    var form = button && button.closest('form[data-id="' + FORM_ID + '"]');
    if (form) capture(form);
  }, true);

  // Renvoie ce qui n'a pas pu partir lors d'une visite précédente.
  if (document.readyState === "complete") flush(); else window.addEventListener("load", flush, { once: true });
})();
