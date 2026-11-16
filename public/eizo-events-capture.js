/* EIZO Events : copie des inscriptions Globo de /pages/rencontre-2026 vers le back-office.
   Chargé sur la boutique via un ScriptTag Shopify ; inactif sur les autres pages. */
(function(){
  if (!/^\/pages\/rencontre-2026\/?$/.test(location.pathname)) return;
  if (window.__eizoEventsCapture) return;
  window.__eizoEventsCapture = true;
  var ENDPOINT = "https://eizo-rendezvous-api-vercel-app.vercel.app/api/events/inscriptions/rencontre-2026";
  var FORM_ID = "171416";
  var FIELDS = {
    "text-1": "first_name", "text": "last_name", "text-2": "company", "text-3": "job_title",
    "email": "email", "select-1": "slot", "textarea": "message"
  };
  var lastSent = "";
  function value(form, name){
    var field = form.querySelector('[name="' + name + '"]');
    if (!field) return "";
    if (field.tagName === "SELECT") {
      var option = field.options[field.selectedIndex];
      return option && !option.disabled ? (option.text || option.value).trim() : "";
    }
    return String(field.value || "").trim();
  }
  function send(form){
    var payload = {};
    Object.keys(FIELDS).forEach(function(name){ payload[FIELDS[name]] = value(form, name); });
    var consent = form.querySelector('[name^="consent"]');
    payload.consent = !!(consent && consent.checked);
    if (!payload.email || payload.email.indexOf("@") < 1) return;
    var body = JSON.stringify(payload);
    if (body === lastSent) return;
    lastSent = body;
    var blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
    if (!(navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob))) {
      fetch(ENDPOINT, { method: "POST", body: body, keepalive: true, mode: "cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(function(){});
    }
  }
  document.addEventListener("submit", function(event){
    var form = event.target;
    if (!form || !form.matches || !form.matches('form[data-id="' + FORM_ID + '"]')) return;
    if (form.checkValidity && !form.checkValidity()) return;
    send(form);
  }, true);
  // Filet de sécurité si Globo envoie en AJAX sans déclencher d'événement « submit ».
  document.addEventListener("click", function(event){
    var button = event.target && event.target.closest && event.target.closest('button[type="submit"]');
    var form = button && button.closest('form[data-id="' + FORM_ID + '"]');
    if (!form || (form.checkValidity && !form.checkValidity())) return;
    send(form);
  }, true);
})();
