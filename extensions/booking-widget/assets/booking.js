document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('eizo-booking-widget');
  if (!widget) return;
  
  const organizerSlug = widget.dataset.organizer;
  const product = widget.dataset.product;
  
  if (!organizerSlug) {
    widget.innerHTML = '<div class="eizo-error">Organisateur non configuré</div>';
    return;
  }
  
  // Charger les créneaux disponibles pour aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  loadAvailability(today, organizerSlug, product, widget);
  
  // Ajouter un sélecteur de date
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = today;
  dateInput.style.marginBottom = '15px';
  dateInput.style.padding = '8px';
  dateInput.style.border = '1px solid #d1d5db';
  dateInput.style.borderRadius = '4px';
  dateInput.style.width = '100%';
  dateInput.style.maxWidth = '300px';
  
  dateInput.addEventListener('change', (e) => {
    loadAvailability(e.target.value, organizerSlug, product, widget);
  });
  
  widget.insertBefore(dateInput, widget.firstChild);
});

async function loadAvailability(date, organizerSlug, product, widget) {
  try {
    widget.innerHTML = '<div class="eizo-loading">Chargement du calendrier...</div>';
    
    // Use Shopify App Proxy instead of direct API call
    const shop = window.Shopify?.shop || '';
    const proxyUrl = shop 
      ? `https://${shop}/apps/booking/${organizerSlug}/availability?date=${date}`
      : `/api/booking/${organizerSlug}/availability?date=${date}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (data.isBlocked) {
      widget.innerHTML = '<div class="eizo-error">Cette date est bloquée</div>';
      return;
    }
    
    if (!data.isAvailable) {
      widget.innerHTML = '<div class="eizo-error">Aucun créneau disponible pour cette date</div>';
      return;
    }
    
    if (data.availableSlots.length === 0) {
      widget.innerHTML = '<div class="eizo-error">Tous les créneaux sont réservés pour cette date</div>';
      return;
    }
    
    const slotsHtml = data.availableSlots.map(slot => 
      `<button class="eizo-slot" data-time="${slot}">${slot}</button>`
    ).join('');
    
    widget.innerHTML = `
      <h3>Créneaux disponibles pour ${date}</h3>
      <div class="eizo-slots">
        ${slotsHtml}
      </div>
    `;
    
    // Gérer la sélection de créneau
    widget.querySelectorAll('.eizo-slot').forEach(button => {
      button.addEventListener('click', () => {
        const time = button.dataset.time;
        openBookingForm(organizerSlug, date, time, product);
      });
    });
  } catch (error) {
    console.error('Error loading availability:', error);
    widget.innerHTML = '<div class="eizo-error">Erreur lors du chargement du calendrier</div>';
  }
}

function openBookingForm(organizerSlug, date, time, product) {
  // Créer un formulaire modal simple
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  const form = document.createElement('div');
  form.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 8px;
    max-width: 400px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  `;
  
  form.innerHTML = `
    <h3>Réserver un créneau</h3>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Heure:</strong> ${time}</p>
    ${product ? `<p><strong>Produit:</strong> ${product}</p>` : ''}
    <form id="booking-form">
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Nom *</label>
        <input type="text" name="nom" required style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Prénom *</label>
        <input type="text" name="prenom" required style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Email *</label>
        <input type="email" name="email" required style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Téléphone</label>
        <input type="tel" name="telephone" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Message</label>
        <textarea name="message" rows="3" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;"></textarea>
      </div>
      <button type="submit" style="width: 100%; padding: 12px; background: #008060; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
        Confirmer la réservation
      </button>
      <button type="button" id="cancel-btn" style="width: 100%; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 10px;">
        Annuler
      </button>
    </form>
  `;
  
  modal.appendChild(form);
  document.body.appendChild(modal);
  
  // Gérer la soumission du formulaire
  form.querySelector('#booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const bookingData = {
      nom: formData.get('nom'),
      prenom: formData.get('prenom'),
      email: formData.get('email'),
      telephone: formData.get('telephone'),
      message: formData.get('message'),
      date: date,
      heure: time,
      produit: product || '',
    };
    
    try {
      // Use Shopify App Proxy instead of direct API call
      const shop = window.Shopify?.shop || '';
      const proxyUrl = shop 
        ? `https://${shop}/apps/booking/${organizerSlug}/reservation/create`
        : `/api/booking/${organizerSlug}/reservation/create`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert('Réservation confirmée ! Vous recevrez un email de confirmation.');
        document.body.removeChild(modal);
        // Recharger la disponibilité
        const widget = document.getElementById('eizo-booking-widget');
        loadAvailability(date, organizerSlug, product, widget);
      } else {
        alert(result.error || 'Erreur lors de la réservation');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Erreur lors de la réservation');
    }
  });
  
  // Gérer l'annulation
  form.querySelector('#cancel-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Fermer en cliquant en dehors
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}
