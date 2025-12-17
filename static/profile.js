document.addEventListener('DOMContentLoaded', function() {
        const menuLinks = document.querySelectorAll('.menu-link');
        const contentSections = document.querySelectorAll('#content > div[id^="section-"]');
        const profileLink = document.getElementById('profileLink');

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

        // Клик по профилю в шапке
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                showSection('profile');
            });
        }
        
        // По умолчанию показываем 'home'
        showSection('home');
    });