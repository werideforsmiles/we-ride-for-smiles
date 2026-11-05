/* Pages légales : sommaire animé sur mobile, section en cours de lecture signalée dans le sommaire. */
(() => {
    const toc = document.querySelector('.legal-toc');
    if (!toc) return;

    const summary = toc.querySelector('summary');
    const panel = toc.querySelector('nav');
    const list = toc.querySelector('ol');
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const sections = links.map((link) => document.getElementById(link.hash.slice(1)));

    const desktop = matchMedia('(min-width: 992px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    // Une section est « en cours » quand son titre a passé le premier tiers de l'écran.
    const READING_LINE = 0.3;
    // Le temps d'un défilement vers un lien : le clic prime sur la position.
    const CLICK_HOLD_MS = 900;

    /* --- Section active --- */
    let activeLink = null;
    let holdUntil = 0;

    const placeMarker = () => {
        if (!activeLink || !activeLink.offsetHeight) return;
        list.style.setProperty('--toc-marker-y', `${activeLink.offsetTop}px`);
        list.style.setProperty('--toc-marker-height', `${activeLink.offsetHeight}px`);
    };

    const setActive = (link) => {
        if (link === activeLink) return;
        activeLink?.removeAttribute('aria-current');
        link.setAttribute('aria-current', 'location');
        activeLink = link;
        placeMarker();
    };

    const updateFromScroll = () => {
        if (performance.now() < holdUntil) return;
        const line = window.innerHeight * READING_LINE;
        let current = 0;
        sections.forEach((section, index) => {
            if (section.getBoundingClientRect().top <= line) current = index;
        });
        // Les dernières sections, trop courtes, n'atteignent jamais la ligne : le bas de page désigne la dernière.
        const root = document.documentElement;
        if (window.scrollY + window.innerHeight >= root.scrollHeight - 2) current = sections.length - 1;
        setActive(links[current]);
    };

    let framePending = false;
    const onScroll = () => {
        if (framePending) return;
        framePending = true;
        requestAnimationFrame(() => {
            framePending = false;
            updateFromScroll();
        });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        placeMarker();
        onScroll();
    }, { passive: true });

    /* --- Ouverture et fermeture sur mobile --- */
    let animation = null;

    const setOpen = (open, onDone) => {
        const startHeight = toc.open ? panel.offsetHeight : 0;
        const startOpacity = toc.open ? Number(getComputedStyle(panel).opacity) : 0;
        animation?.cancel();
        animation = null;

        if (reducedMotion.matches) {
            toc.open = open;
            toc.classList.remove('is-closing', 'is-animating');
            placeMarker();
            onDone?.();
            return;
        }

        toc.open = true;
        toc.classList.add('is-animating');
        toc.classList.toggle('is-closing', !open);
        if (open) placeMarker();

        const current = panel.animate(
            [
                { height: `${startHeight}px`, opacity: startOpacity },
                { height: `${open ? panel.scrollHeight : 0}px`, opacity: open ? 1 : 0 },
            ],
            { duration: open ? 360 : 260, easing: EASE },
        );
        animation = current;
        current.onfinish = () => {
            animation = null;
            toc.open = open;
            toc.classList.remove('is-closing', 'is-animating');
            onDone?.();
        };
    };

    summary.addEventListener('click', (e) => {
        e.preventDefault();
        if (desktop.matches) return;
        const opening = !toc.open || toc.classList.contains('is-closing');
        setOpen(opening);
    });

    const goToSection = (section, hash) => {
        history.pushState(null, '', hash);
        section.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        section.tabIndex = -1;
        section.focus({ preventScroll: true });
    };

    links.forEach((link, index) => {
        link.addEventListener('click', (e) => {
            holdUntil = performance.now() + CLICK_HOLD_MS;
            setActive(link);
            if (desktop.matches) return;
            // Replier d'abord : la hauteur du sommaire ne doit pas décaler l'arrivée sur la section.
            e.preventDefault();
            setOpen(false, () => {
                holdUntil = performance.now() + CLICK_HOLD_MS;
                goToSection(sections[index], link.hash);
            });
        });
    });

    /* --- Ordinateur : toujours ouvert. Mobile : replié pour laisser place au texte --- */
    const applyLayout = () => {
        animation?.cancel();
        animation = null;
        toc.classList.remove('is-closing', 'is-animating');
        toc.open = desktop.matches;
        summary.tabIndex = desktop.matches ? -1 : 0;
        placeMarker();
    };
    desktop.addEventListener('change', applyLayout);
    applyLayout();
    updateFromScroll();

    // Le repère prend sa place sans animation au chargement, puis glisse d'une section à l'autre.
    requestAnimationFrame(() => requestAnimationFrame(() => toc.classList.add('is-ready')));
})();
