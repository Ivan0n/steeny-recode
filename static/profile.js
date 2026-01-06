document.addEventListener('DOMContentLoaded', function() {
  const menuLinks = document.querySelectorAll('.menu-link');
  const sections = document.querySelectorAll('#content > div[id^="section-"]');
  const profileLink = document.getElementById('profileLink');
  const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
  const settingsTabs = document.querySelectorAll('.settings-tab');
  const sectionMoreBtns = document.querySelectorAll('.section-more-btn');
  const quickCards = document.querySelectorAll('.quick-access-card');

  function showSection(id) {
    sections.forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('section-' + id);
    if (target) target.classList.remove('hidden');

    menuLinks.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.menu-link[data-section="${id}"]`);
    if (activeLink) activeLink.classList.add('active');

    document.getElementById('content').scrollTop = 0;
  }

  menuLinks.forEach(l => {
    l.addEventListener('click', e => {
      e.preventDefault();
      const id = l.dataset.section;
      if (id) showSection(id);
    });
  });

  quickCards.forEach(c => {
    c.addEventListener('click', e => {
      e.preventDefault();
      const id = c.dataset.section;
      if (id) showSection(id);
    });
  });

  sectionMoreBtns.forEach(b => {
    b.addEventListener('click', e => {
      e.preventDefault();
      const id = b.dataset.section;
      if (id) showSection(id);
    });
  });

  if (profileLink) {
    profileLink.addEventListener('click', e => {
      e.preventDefault();
      showSection('profile');
    });
  }

  settingsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      settingsTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settingsTabs.forEach(t => t.classList.add('hidden'));
      const target = document.getElementById('settings-' + tab);
      if (target) target.classList.remove('hidden');
    });
  });

  showSection('home');
});