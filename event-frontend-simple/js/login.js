let activeRole = 'student';
let mode = 'login'; // 'login' | 'signup'

const tabsEl = document.getElementById('tabs');
const eyebrowEl = document.getElementById('eyebrow');
const errorBox = document.getElementById('error-box');
const infoBox = document.getElementById('info-box');
const form = document.getElementById('login-form');
const nameField = document.getElementById('name-field');
const nameInput = document.getElementById('name-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const submitBtn = document.getElementById('submit-btn');
const switchModeEl = document.getElementById('switch-mode');
const adminNote = document.getElementById('admin-note');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
  infoBox.classList.add('hidden');
}

function showInfo(msg) {
  infoBox.textContent = msg;
  infoBox.classList.remove('hidden');
  errorBox.classList.add('hidden');
}

function clearMessages() {
  errorBox.classList.add('hidden');
  infoBox.classList.add('hidden');
}

function render() {
  eyebrowEl.textContent = mode === 'login' ? `// ${activeRole} login` : `// create ${activeRole} account`;
  nameField.classList.toggle('hidden', mode !== 'signup');
  submitBtn.textContent = mode === 'login' ? 'Log in' : 'Create account';
  emailInput.placeholder = activeRole === 'student' ? 'you@college.edu' : 'you@example.com';

  if (activeRole === 'admin') {
    switchModeEl.classList.add('hidden');
    adminNote.classList.remove('hidden');
  } else {
    switchModeEl.classList.remove('hidden');
    adminNote.classList.add('hidden');
    switchModeEl.innerHTML = mode === 'login'
      ? `New here? <button type="button" id="switch-btn">Create an account</button>`
      : `Already have an account? <button type="button" id="switch-btn">Log in</button>`;
    document.getElementById('switch-btn').addEventListener('click', () => {
      mode = mode === 'login' ? 'signup' : 'login';
      clearMessages();
      render();
    });
  }
}

tabsEl.querySelectorAll('.login-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    tabsEl.querySelectorAll('.login-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeRole = btn.dataset.role;
    mode = 'login';
    clearMessages();
    nameInput.value = '';
    emailInput.value = '';
    passwordInput.value = '';
    render();
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Please wait…';

  try {
    if (mode === 'login') {
      const data = await api.login(emailInput.value, passwordInput.value);
      if (data.user.role !== activeRole) {
        showError(`This account is registered as ${data.user.role}, not ${activeRole}. Switch tabs to log in.`);
        return;
      }
      saveSession(data.token, data.user);
      window.location.href = `${data.user.role}.html`;
    } else {
      const data = await api.register(nameInput.value, emailInput.value, passwordInput.value, activeRole);
      if (activeRole === 'organizer') {
        showInfo('Account created. An admin needs to approve you before you can log in.');
        mode = 'login';
        render();
      } else {
        saveSession(data.token, data.user);
        window.location.href = `${data.user.role}.html`;
      }
    }
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = mode === 'login' ? 'Log in' : 'Create account';
  }
});

render();
