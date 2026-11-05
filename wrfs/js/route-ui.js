/* Pages parcours : colle la carte sous le menu et permet de changer de jour au doigt. */
(() => {
    const navbar = document.getElementById('navbar');
    const banner = document.querySelector('.route-edition-banner');
    const map = document.getElementById('map');
    const previous = document.getElementById('route-step-prev');
    const next = document.getElementById('route-step-next');
    if (!navbar || !map || !previous || !next) return;

    const { body } = document;
    const steps = [...document.querySelectorAll('.step-content')];
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const stacked = matchMedia('(max-width: 992px)');

    /* --- Mise en page : le bandeau change de hauteur selon la largeur et la langue, on mesure --- */
    const syncLayout = () => {
        const navBottom = navbar.getBoundingClientRect().bottom;
        body.style.setProperty('--route-nav-bottom', `${navBottom}px`);
        body.style.setProperty('--route-top', `${navBottom + (banner ? banner.getBoundingClientRect().height : 0)}px`);
    };
    syncLayout();
    const layoutObserver = new ResizeObserver(syncLayout);
    layoutObserver.observe(navbar);
    if (banner) layoutObserver.observe(banner);

    /* --- Gestes tactiles --- */
    const AXIS_LOCK = 10;
    const SWIPE_DISTANCE = 56;
    const FLICK_DISTANCE = 24;
    const FLICK_VELOCITY = 0.4;
    const VERTICAL_DISTANCE = 50;
    // Les bords de l'écran servent au geste « retour » du téléphone.
    const SCREEN_EDGE = 20;
    const FOLLOW = 0.4;
    const RESIST = 0.12;
    const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

    const activeIndex = () => steps.findIndex((step) => step.classList.contains('is-active'));

    const resetStep = (step, animated) => {
        if (!step) return;
        step.style.transition = animated ? `transform 0.28s ${EASE_OUT}, opacity 0.28s ease` : '';
        step.style.transform = '';
        step.style.opacity = '';
        if (animated) {
            step.addEventListener('transitionend', () => { step.style.transition = ''; }, { once: true });
        }
    };

    // Le geste est horizontal : le nouveau jour arrive de côté, sans faire défiler toute la page.
    const slideTo = (index, direction) => {
        const target = steps[index];
        const offset = stacked.matches ? map.getBoundingClientRect().bottom : 96;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'instant' });
        if (reducedMotion.matches) return;
        target.animate(
            [
                { transform: `translateX(${direction * 28}%)`, opacity: 0 },
                { transform: 'translateX(0)', opacity: 1 },
            ],
            { duration: 340, easing: EASE_OUT },
        );
    };

    let gesture = null;

    const cancelGesture = () => {
        if (gesture?.axis === 'x') resetStep(gesture.step, true);
        gesture = null;
    };

    window.addEventListener('touchstart', (e) => {
        gesture = null;
        const blocked = body.classList.contains('modal-open') || body.classList.contains('mobile-nav-open');
        if (blocked || e.touches.length !== 1) return;
        // La carte se déplace au doigt ; les liens et boutons gardent leur clic.
        if (!e.target.closest('.story-container') || e.target.closest('a, button')) return;
        const [touch] = e.touches;
        const index = activeIndex();
        const nearEdge = touch.clientX < SCREEN_EDGE || touch.clientX > window.innerWidth - SCREEN_EDGE;
        gesture = {
            startX: touch.clientX,
            startY: touch.clientY,
            lastX: touch.clientX,
            lastTime: e.timeStamp,
            velocity: 0,
            axis: null,
            index,
            step: steps[index],
            horizontalAllowed: !nearEdge,
        };
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!gesture) return;
        if (e.touches.length !== 1) {
            cancelGesture();
            return;
        }
        const [touch] = e.touches;
        const dx = touch.clientX - gesture.startX;
        const dy = touch.clientY - gesture.startY;

        if (!gesture.axis) {
            if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
            const horizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
            if (horizontal && !gesture.horizontalAllowed) {
                gesture = null;
                return;
            }
            gesture.axis = horizontal ? 'x' : 'y';
        }
        if (gesture.axis !== 'x') return;

        const elapsed = e.timeStamp - gesture.lastTime;
        if (elapsed > 0) gesture.velocity = 0.4 * gesture.velocity + 0.6 * ((touch.clientX - gesture.lastX) / elapsed);
        gesture.lastX = touch.clientX;
        gesture.lastTime = e.timeStamp;

        if (reducedMotion.matches || !gesture.step) return;
        const hasTarget = dx < 0 ? gesture.index < steps.length - 1 : gesture.index > 0;
        gesture.step.style.transition = 'none';
        gesture.step.style.transform = `translateX(${dx * (hasTarget ? FOLLOW : RESIST)}px)`;
        if (hasTarget) gesture.step.style.opacity = String(Math.max(0.6, 1 - Math.abs(dx) / window.innerWidth));
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (!gesture) return;
        const current = gesture;
        gesture = null;
        const [touch] = e.changedTouches;
        const dx = touch.clientX - current.startX;
        const dy = touch.clientY - current.startY;

        if (current.axis === 'y') {
            if (Math.abs(dy) > VERTICAL_DISTANCE) (dy < 0 ? next : previous).click();
            return;
        }
        if (current.axis !== 'x') return;

        const flicked = Math.abs(dx) > FLICK_DISTANCE && Math.abs(current.velocity) > FLICK_VELOCITY;
        const direction = dx < 0 ? 1 : -1;
        const target = current.index + direction;
        if ((Math.abs(dx) > SWIPE_DISTANCE || flicked) && target >= 0 && target < steps.length) {
            resetStep(current.step, false);
            slideTo(target, direction);
        } else {
            resetStep(current.step, true);
        }
    }, { passive: true });

    window.addEventListener('touchcancel', cancelGesture, { passive: true });
})();
