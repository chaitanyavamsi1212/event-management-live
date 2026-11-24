function renderTopBar(container, user, roleLabel) {
  container.classList.add('topbar');
  container.innerHTML = `
    <div class="topbar-brand">
      <span class="topbar-mark">{ }</span>
      <span class="topbar-name">HackFest</span>
      <span class="topbar-role-tag">${roleLabel}</span>
    </div>
    <div class="topbar-right">
      <span class="topbar-user">${user.name}</span>
      <button class="topbar-logout" id="logout-btn">Log out</button>
    </div>
  `;
  container.querySelector('#logout-btn').addEventListener('click', logout);
}
