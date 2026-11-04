/* Accessibilité commune à toutes les pages : FAQ et menu mobile annoncés aux lecteurs d'écran et utilisables au clavier.
   Les clics restent gérés par les scripts de chaque page : ce fichier suit seulement leur état. */
(() => {
    /* --- FAQ --- */
    const questions = [...document.querySelectorAll('.faq-question')];
    const syncFaq = () => {
        questions.forEach((question) => {
            question.setAttribute('aria-expanded', String(question.classList.contains('active')));
        });
    };
    questions.forEach((question, index) => {
        const answer = question.nextElementSibling;
        if (!answer) return;
        answer.id = answer.id || `faq-answer-${index + 1}`;
        question.setAttribute('aria-controls', answer.id);
    });
    syncFaq();
    // Écouté sur document : s'exécute après le script de la page, une fois la question ouverte ou fermée.
    document.addEventListener('click', (e) => {
        if (e.target.closest('.faq-question')) syncFaq();
    });

    /* --- Sommaire des pages légales : replié sur mobile pour laisser place au texte, ouvert sur ordinateur --- */
    const legalToc = document.querySelector('.legal-toc');
    if (legalToc && matchMedia('(min-width: 992px)').matches) legalToc.open = true;

    /* --- Menu mobile --- */
    const toggle = document.getElementById('nav-toggle');
    const overlay = document.getElementById('nav-mobile-overlay');
    const close = document.getElementById('nav-mobile-close');
    if (!toggle || !overlay || !close) return;

    const background = document.querySelectorAll('body > nav, body > main, body > footer, body > aside');
    let isOpen = false;

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', overlay.id);

    new MutationObserver(() => {
        const open = overlay.classList.contains('is-active');
        if (open === isOpen) return;
        isOpen = open;
        toggle.setAttribute('aria-expanded', String(open));
        // Le reste de la page sort du parcours clavier tant que le menu la recouvre.
        background.forEach((element) => { element.inert = open; });
        if (open) close.focus({ preventScroll: true });
        else if (!document.querySelector('dialog[open]')) toggle.focus({ preventScroll: true });
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) close.click();
    });
})();
