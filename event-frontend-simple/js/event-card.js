function formatEventDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Returns an HTML string for one event card. `registerButtonHtml` lets the
// caller decide what the action button looks like (registered / open / closed).
function buildEventCardHtml(event, isRegistered) {
  const deadlinePassed = new Date() > new Date(event.last_date_to_register);
  const imageSrc = event.image_url ? `${API_URL}${event.image_url}` : null;

  const imageHtml = imageSrc
    ? `<img src="${imageSrc}" alt="${escapeHtml(event.title)}" class="event-card-image" />`
    : `<div class="event-card-placeholder"><span>&lt;/&gt;</span></div>`;

  const tagHtml = Number(event.amount) > 0
    ? `<span class="event-card-price-tag">₹${Number(event.amount).toFixed(0)}</span>`
    : `<span class="event-card-free-tag">Free</span>`;

  let buttonHtml;
  if (isRegistered) {
    buttonHtml = `<button class="event-card-registered-btn" disabled>✓ Registered</button>`;
  } else if (deadlinePassed) {
    buttonHtml = `<button class="event-card-disabled-btn" disabled>Registration closed</button>`;
  } else {
    buttonHtml = `<button class="event-card-register-btn" data-register-id="${event.id}">Register now</button>`;
  }

  return `
    <div class="event-card">
      <div class="event-card-image-wrap">
        ${imageHtml}
        ${tagHtml}
      </div>
      <div class="event-card-body">
        <h3 class="event-card-title">${escapeHtml(event.title)}</h3>
        <p class="event-card-organizer">by ${escapeHtml(event.organizer_name)}</p>
        ${event.description ? `<p class="event-card-desc">${escapeHtml(event.description)}</p>` : ''}
        <div class="event-card-meta">
          <div class="event-card-meta-row">
            <span class="event-card-meta-label">Venue</span>
            <span>${escapeHtml(event.venue)}</span>
          </div>
          <div class="event-card-meta-row">
            <span class="event-card-meta-label">Starts</span>
            <span>${formatEventDate(event.event_time)}</span>
          </div>
          <div class="event-card-meta-row">
            <span class="event-card-meta-label">Register by</span>
            <span class="${deadlinePassed ? 'event-card-deadline-passed' : ''}">${formatEventDate(event.last_date_to_register)}</span>
          </div>
        </div>
        ${buttonHtml}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
