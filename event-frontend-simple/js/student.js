const currentUser = requireRole('student');

const statusEl = document.getElementById('status');
const errorBox = document.getElementById('error-box');
const emptyBox = document.getElementById('empty-box');
const gridEl = document.getElementById('event-grid');
const regCountEl = document.getElementById('reg-count');

if (currentUser) {
  renderTopBar(document.getElementById('topbar-root'), currentUser, 'Student');
  loadData();
}

let registeredEventIds = new Set();

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

async function loadData() {
  statusEl.classList.remove('hidden');
  statusEl.textContent = 'Loading events…';
  errorBox.classList.add('hidden');
  emptyBox.classList.add('hidden');
  gridEl.innerHTML = '';

  try {
    const [eventsRes, regsRes] = await Promise.all([api.getEvents(), api.getMyRegistrations()]);
    const events = eventsRes.events;
    registeredEventIds = new Set(regsRes.registrations.map((r) => r.event_id));
    regCountEl.textContent = `${regsRes.registrations.length} registered`;

    statusEl.classList.add('hidden');

    if (events.length === 0) {
      emptyBox.classList.remove('hidden');
      return;
    }

    gridEl.innerHTML = events.map((ev) => buildEventCardHtml(ev, registeredEventIds.has(ev.id))).join('');

    gridEl.querySelectorAll('[data-register-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleRegister(btn.dataset.registerId, btn));
    });
  } catch (err) {
    statusEl.classList.add('hidden');
    showError(err.message);
  }
}

async function handleRegister(eventId, btn) {
  btn.disabled = true;
  btn.textContent = 'Registering…';
  try {
    await api.registerForEvent(eventId);
    await loadData();
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Register now';
  }
}
