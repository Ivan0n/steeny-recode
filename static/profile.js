document.addEventListener('DOMContentLoaded', function() {
    const menuLinks = document.querySelectorAll('.menu-link');
    const quickCards = document.querySelectorAll('.quick-card');
    const contentSections = document.querySelectorAll('#content > div[id^="section-"]');
    const profileLink = document.getElementById('profileLink');

    // Вкладки настроек
    const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
    const settingsTabs = document.querySelectorAll('.settings-tab');

    function showSection(sectionId) {
        // Скрываем все секции
        contentSections.forEach(section => {
            section.classList.add('hidden');
        });
        // Показываем нужную
        const activeSection = document.getElementById(`section-${sectionId}`);
        if (activeSection) {
            activeSection.classList.remove('hidden');
        }
        // Обновляем активную ссылку в меню
        menuLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });
    }

    // Клики по меню
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            showSection(sectionId);
        });
    });

    // Клики по quick-cards на главной
    quickCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = card.dataset.section;
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });

    // Клик по профилю в шапке
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('profile');
        });
    }

    // Переключение вкладок в настройках
    settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            settingsTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            settingsTabs.forEach(tab => tab.classList.add('hidden'));

            const targetTab = document.getElementById(`settings-${tabId}`);
            if (targetTab) {
                targetTab.classList.remove('hidden');
            }
        });
    });

    // По умолчанию показываем 'home'
    showSection('home');
});