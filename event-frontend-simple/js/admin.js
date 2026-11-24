const currentUser = requireRole('admin');

const errorBox = document.getElementById('error-box');
const successBox = document.getElementById('success-box');
const statusEl = document.getElementById('status');
const contentEl = document.getElementById('content');

if (currentUser) {
  renderTopBar(document.getElementById('topbar-root'), currentUser, 'Admin');
  loadAll();
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function loadAll() {
  statusEl.classList.remove('hidden');
  statusEl.textContent = 'Loading…';
  contentEl.classList.add('hidden');

  try {
    const [dashboard, orgsRes, eventsRes, studentsRes] = await Promise.all([
      api.getDashboard(),
      api.getOrganizers('all'),
      api.getAllEventsAdmin(),
      api.getStudents(),
    ]);

    statusEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    renderStats(dashboard);
    renderOrganizers(orgsRes.organizers);
    renderEvents(eventsRes.events);
    renderStudents(studentsRes.students);
  } catch (err) {
    statusEl.classList.add('hidden');
    showError(err.message);
  }
}

function renderStats(d) {
  document.getElementById('stats-grid').innerHTML = `
    ${statCard(d.total_students, 'Students', 'cyan')}
    ${statCard(d.total_approved_organizers, 'Organizers', 'violet')}
    ${statCard(d.total_events, 'Events', 'amber')}
    ${statCard(d.total_registrations, 'Registrations', 'cyan')}
    ${statCard('₹' + d.total_revenue, 'Revenue', 'amber')}
  `;
}

function statCard(value, label, accent) {
  return `
    <div class="stat-card accent-${accent}">
      <span class="stat-value">${value}</span>
      <span class="stat-label">${label}</span>
    </div>
  `;
}

function renderOrganizers(organizers) {
  const pending = organizers.filter((o) => !o.is_approved);
  const approved = organizers.filter((o) => o.is_approved);

  document.getElementById('pending-title').textContent = `Pending organizer approvals (${pending.length})`;
  document.getElementById('approved-title').textContent = `Approved organizers (${approved.length})`;

  const pendingList = document.getElementById('pending-list');
  pendingList.innerHTML = pending.length === 0
    ? `<p class="page-status">No pending approvals.</p>`
    : pending.map((o) => `
      <div class="admin-row">
        <div>
          <p class="row-title">${escapeHtml(o.name)}</p>
          <p class="row-sub">${escapeHtml(o.email)}</p>
        </div>
        <button class="approve-btn" data-approve-id="${o.id}">Approve</button>
      </div>
    `).join('');

  const approvedList = document.getElementById('approved-list');
  approvedList.innerHTML = approved.map((o) => `
    <div class="admin-row">
      <div>
        <p class="row-title">${escapeHtml(o.name)}</p>
        <p class="row-sub">${escapeHtml(o.email)}</p>
      </div>
      <button class="revoke-btn" data-revoke-id="${o.id}">Revoke access</button>
    </div>
  `).join('');

  pendingList.querySelectorAll('[data-approve-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleApprove(btn.dataset.approveId, btn));
  });
  approvedList.querySelectorAll('[data-revoke-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleRevoke(btn.dataset.revokeId, btn));
  });
}

async function handleApprove(id, btn) {
  btn.disabled = true;
  btn.textContent = 'Approving…';
  try {
    await api.approveOrganizer(id);
    showSuccess('Organizer approved.');
    await loadAll();
  } catch (err) {
    showError(err.message);
  }
}
async function handleRevoke(id, btn) {
  btn.disabled = true;
  btn.textContent = 'Revoking…';
  try {
    await api.revokeOrganizer(id);
    showSuccess('Organizer access revoked.');
    await loadAll();
  } catch (err) {
    showError(err.message);
  }
}

function renderEvents(events) {
  document.getElementById('events-title').textContent = `All events (${events.length})`;
  const grid = document.getElementById('events-grid');

  grid.innerHTML = events.map((ev) => {
    const imageSrc = ev.image_url ? `${API_URL}${ev.image_url}` : null;
    const thumbHtml = imageSrc
      ? `<img src="${imageSrc}" alt="${escapeHtml(ev.title)}" />`
      : `<span>&lt;/&gt;</span>`;

    return `
      <div class="admin-event-card">
        <div class="admin-event-thumb">${thumbHtml}</div>
        <div class="admin-event-body">
          <p class="row-title">${escapeHtml(ev.title)}</p>
          <p class="row-sub">by ${escapeHtml(ev.organizer_name)} · ${ev.total_registrations} registered · ₹${ev.total_revenue}</p>
          <label class="image-upload-label" data-event-id="${ev.id}">
            Replace image
            <input type="file" accept="image/*" hidden data-upload-for="${ev.id}" />
          </label>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-upload-for]').forEach((input) => {
    input.addEventListener('change', (e) => handleImageUpload(input.dataset.uploadFor, e.target.files[0], input));
  });
}

async function handleImageUpload(eventId, file, inputEl) {
  if (!file) return;
  const label = inputEl.closest('.image-upload-label');
  label.firstChild.textContent = 'Uploading… ';

  try {
    const fd = new FormData();
    fd.append('image', file);
    await api.updateEventImage(eventId, fd);
    showSuccess('Event image updated.');
    await loadAll();
  } catch (err) {
    showError(err.message);
    label.firstChild.textContent = 'Replace image ';
  }
}

function renderStudents(students) {
  document.getElementById('students-title').textContent = `Students (${students.length})`;
  document.getElementById('students-list').innerHTML = students.map((s) => `
    <div class="admin-row">
      <div>
        <p class="row-title">${escapeHtml(s.name)}</p>
        <p class="row-sub">${escapeHtml(s.email)}</p>
      </div>
    </div>
  `).join('');
}
