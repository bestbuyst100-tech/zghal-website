// public/translation.js

document.addEventListener('DOMContentLoaded', () => {
    const langSwitcher = document.getElementById('lang-switcher');
    let translations = {};

    // 1. جلب ملف الترجمات
    async function fetchTranslations() {
        const response = await fetch('/translations.json');
        translations = await response.json();
    }

    // 2. وظيفة لتطبيق الترجمة
    function translatePage(lang) {
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.getAttribute('data-key');
            if (translations[lang] && translations[lang][key]) {
                element.innerHTML = translations[lang][key];
            }
        });
        // تحديث اتجاه الصفحة والخط
        if (lang === 'ar') {
            document.documentElement.lang = 'ar';
            document.documentElement.dir = 'rtl';
            document.body.style.fontFamily = "'Tajawal', sans-serif"; // (سنضيف هذا الخط لاحقاً)
            langSwitcher.textContent = 'FR';
        } else {
            document.documentElement.lang = 'fr';
            document.documentElement.dir = 'ltr';
            document.body.style.fontFamily = "'Poppins', sans-serif";
            langSwitcher.textContent = 'ع';
        }
        // حفظ اللغة المختارة
        localStorage.setItem('language', lang);
    }

    // 3. التعامل مع زر تغيير اللغة
    langSwitcher.addEventListener('click', () => {
        const currentLang = localStorage.getItem('language') || 'fr';
        const newLang = currentLang === 'fr' ? 'ar' : 'fr';
        translatePage(newLang);
    });

    // 4. عند تحميل الصفحة، تحقق من اللغة المحفوظة وطبقها
    async function init() {
        await fetchTranslations();
        const savedLang = localStorage.getItem('language') || 'fr';
        translatePage(savedLang);
    }

    init();
});
