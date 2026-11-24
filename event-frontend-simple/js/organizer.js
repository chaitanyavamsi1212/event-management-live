const currentUser = requireRole('organizer');

const errorBox = document.getElementById('error-box');
const successBox = document.getElementById('success-box');
const statusEl = document.getElementById('status');
const emptyBox = document.getElementById('empty-box');
const listEl = document.getElementById('event-list');
const toggleFormBtn = document.getElementById('toggle-form-btn');
const createForm = document.getElementById('create-form');
const submitBtn = document.getElementById('submit-btn');

let notifyingId = null;

if (currentUser) {
  renderTopBar(document.getElementById('topbar-root'), currentUser, 'Organizer');
  loadEvents();
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
  successBox.classList.add('hidden');
}

function showSuccess(msg) {
  successBox.textContent = msg;
  successBox.classList.remove('hidden');
  errorBox.classList.add('hidden');
}

toggleFormBtn.addEventListener('click', () => {
  createForm.classList.toggle('hidden');
  toggleFormBtn.textContent = createForm.classList.contains('hidden') ? '+ New event' : 'Cancel';
});

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating…';
  errorBox.classList.add('hidden');

  try {
    const fd = new FormData();
    fd.append('title', document.getElementById('f-title').value);
    fd.append('venue', document.getElementById('f-venue').value);
    fd.append('event_time', document.getElementById('f-event-time').value);
    fd.append('last_date_to_register', document.getElementById('f-deadline').value);
    fd.append('amount', document.getElementById('f-amount').value || '0');
    fd.append('description', document.getElementById('f-description').value);
    const imageFile = document.getElementById('f-image').files[0];
    if (imageFile) fd.append('image', imageFile);

    await api.createEvent(fd);
    showSuccess('Event created and posted for students to see.');
    createForm.reset();
    createForm.classList.add('hidden');
    toggleFormBtn.textContent = '+ New event';
    await loadEvents();
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create event';
  }
});

async function loadEvents() {
  statusEl.classList.remove('hidden');
  statusEl.textContent = 'Loading your events…';
  emptyBox.classList.add('hidden');
  listEl.innerHTML = '';

  try {
    const res = await api.getMyEvents();
    const events = res.events;
    statusEl.classList.add('hidden');

    if (events.length === 0) {
      emptyBox.classList.remove('hidden');
      return;
    }

    const statsList = await Promise.all(events.map((ev) => api.getEventStats(ev.id)));
    const statsById = {};
    events.forEach((ev, i) => { statsById[ev.id] = statsList[i].stats; });

    listEl.innerHTML = events.map((ev) => buildEventRow(ev, statsById[ev.id])).join('');
    attachRowHandlers();
  } catch (err) {
    statusEl.classList.add('hidden');
    showError(err.message);
  }
}

function buildEventRow(event, stats) {
  const imageSrc = event.image_url ? `${API_URL}${event.image_url}` : null;
  const thumbHtml = imageSrc
    ? `<img src="${imageSrc}" alt="${escapeHtml(event.title)}" />`
    : `<span>&lt;/&gt;</span>`;

  return `
    <div class="event-row" data-event-id="${event.id}">
      <div class="event-thumb">${thumbHtml}</div>
      <div class="event-row-info">
        <h3>${escapeHtml(event.title)}</h3>
        <p class="event-row-venue">${escapeHtml(event.venue)} · ${new Date(event.event_time).toLocaleString()}</p>
      </div>
      <div class="metrics">
        <div class="metric">
          <span class="metric-value">${stats.total_registrations ?? '—'}</span>
          <span class="metric-label">registered</span>
        </div>
        <div class="metric">
          <span class="metric-value">₹${stats.total_revenue ?? '0'}</span>
          <span class="metric-label">credited</span>
        </div>
      </div>
      <div class="row-actions" data-actions-for="${event.id}">
        <button class="small-btn-ghost" data-notify-toggle="${event.id}">Notify students</button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function attachRowHandlers() {
  listEl.querySelectorAll('[data-notify-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => openNotifyBox(btn.dataset.notifyToggle));
  });
}

function openNotifyBox(eventId) {
  notifyingId = eventId;
  const actionsEl = listEl.querySelector(`[data-actions-for="${eventId}"]`);
  actionsEl.innerHTML = `
    <div class="notify-box">
      <textarea rows="2" placeholder="e.g. Venue changed to Hall B" id="notify-text-${eventId}"></textarea>
      <div class="notify-btns">
        <button class="small-btn" id="notify-send-${eventId}">Send</button>
        <button class="small-btn-ghost" id="notify-cancel-${eventId}">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById(`notify-text-${eventId}`).focus();
  document.getElementById(`notify-send-${eventId}`).addEventListener('click', () => handleSendNotify(eventId));
  document.getElementById(`notify-cancel-${eventId}`).addEventListener('click', () => loadEvents());
}

async function handleSendNotify(eventId) {
  const textEl = document.getElementById(`notify-text-${eventId}`);
  const message = textEl.value.trim();
  if (!message) return;

  const sendBtn = document.getElementById(`notify-send-${eventId}`);
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';

  try {
    await api.notifyEvent(eventId, message);
    showSuccess('Notification sent to registered students.');
    await loadEvents();
  } catch (err) {
    showError(err.message);
  }
}
