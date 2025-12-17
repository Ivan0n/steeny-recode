document.addEventListener('DOMContentLoaded', () => {
    const htmlEl = document.documentElement;
    const themeCircles = document.querySelectorAll('.theme-circle');
    const themes = ['light', 'dark', 'purple', 'green', 'blue', 'red'];

    function setTheme(theme) {
      // Удаляем все классы тем
      themes.forEach(t => htmlEl.classList.remove(t));
      
      // Добавляем нужный класс (кроме light, он по умолчанию)
      if (theme !== 'light') {
        htmlEl.classList.add(theme);
      }
      
      localStorage.setItem('theme', theme);

      // Обновляем активный кружок
      themeCircles.forEach(circle => {
        if (circle.dataset.theme === theme) {
          circle.classList.add('active');
        } else {
          circle.classList.remove('active');
        }
      });
    }


    const stored = localStorage.getItem('theme') || 'light';
    setTheme(stored);

    // Клики по кружкам
    themeCircles.forEach(circle => {
      circle.addEventListener('click', () => setTheme(circle.dataset.theme));
    });
  });