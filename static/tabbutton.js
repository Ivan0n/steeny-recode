  document.addEventListener('DOMContentLoaded', function() {
    // Переключение вкладок в настройках
    const tabButtons = document.querySelectorAll('.settings-tab-btn');
    const tabs = document.querySelectorAll('.settings-tab');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // Активная кнопка
        tabButtons.forEach(b => b.classList.toggle('active', b === btn));

        // Показ нужного раздела
        tabs.forEach(tab => {
          tab.classList.toggle('hidden', tab.id !== 'settings-' + tabId);
        });
      });
    });
  });