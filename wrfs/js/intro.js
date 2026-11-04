/* Intro de l'accueil : « We Ride For Smiles » se comprime en « WRFS » au-dessus d'un trait (la route),
   puis le monogramme rejoint sa place exacte dans la navbar pendant que le rideau se lève en arc (le sourire).
   Le <head> décide si elle joue (attribut data-intro), pour éviter tout flash avant le premier rendu. */
(() => {
    const root = document.documentElement;
    const intro = document.querySelector('.preloader');
    if (!intro) return;

    const close = () => {
        delete root.dataset.intro;
        intro.remove();
    };
    const brand = document.querySelector('#navbar .navbar-brand-mark');
    if (!root.dataset.intro || document.hidden || !brand) {
        close();
        return;
    }

    // Repères de la timeline, en ms.
    const COLLAPSE = 950;
    const LIFT = 1750;
    const END = 2550;

    const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const EASE_IN_OUT = 'cubic-bezier(0.76, 0, 0.24, 1)';

    // Métriques d'Inter, en em, depuis le haut de la boîte de texte mesurée.
    const BASELINE = 0.969;
    const CAP_HEIGHT = 0.727;

    const range = document.createRange();
    const textRect = (node, start = 0, end = node.length) => {
        range.setStart(node, start);
        range.setEnd(node, end);
        return range.getBoundingClientRect();
    };

    const clamp01 = (t) => Math.min(1, Math.max(0, t));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOut = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

    const play = () => {
        const logo = intro.querySelector('.preloader-logo-container');
        const curtain = intro.querySelector('.preloader-curtain');
        const road = intro.querySelector('.preloader-road path');
        const words = [...logo.querySelectorAll('.word')];

        const introFont = parseFloat(getComputedStyle(logo).fontSize);
        const brandFont = parseFloat(getComputedStyle(brand).fontSize);
        const stageWidth = intro.clientWidth;
        const stageHeight = intro.clientHeight;

        // Le monogramme central est la navbar agrandie : même crénage, donc aucun saut à l'arrivée.
        const docked = [0, 1, 2, 3].map((i) => textRect(brand.firstChild, i, i + 1));
        const dockedLeft = docked[0].left;
        const monoWidth = Math.min(stageWidth * 0.62, 460);
        const zoom = monoWidth / (docked[3].right - dockedLeft);
        const monoFont = brandFont * zoom;
        const monoLeft = (stageWidth - monoWidth) / 2;
        const roadGap = monoFont * 0.14;
        const capTop = (stageHeight - monoFont * CAP_HEIGHT - roadGap) / 2;
        const monoTop = capTop - monoFont * (BASELINE - CAP_HEIGHT);

        // À mesurer avant de lancer les animations, qui déplacent les lettres.
        const firstLeft = textRect(words[0].firstElementChild.firstChild).left;
        const lastGlyph = textRect(words[3].lastElementChild.firstChild);
        const roadY = lastGlyph.top + introFont * (BASELINE + 0.2);

        const animateChar = (el, keyframes) => el.animate(
            keyframes.map(([time, props, easing]) => ({ offset: time / END, easing, ...props })),
            { duration: END, fill: 'both' },
        );

        words.forEach((word, wordIndex) => {
            const [capital, ...lowers] = word.querySelectorAll('.char');
            const target = docked[wordIndex];
            const compactLeft = monoLeft + (target.left - dockedLeft) * zoom;
            const compactRight = monoLeft + (target.right - dockedLeft) * zoom;
            const compactScale = monoFont / introFont;

            [capital, ...lowers].forEach((el, charIndex) => {
                const box = el.getBoundingClientRect();
                const glyph = textRect(el.firstChild);
                el.style.transformOrigin = `${glyph.left - box.left}px ${glyph.top - box.top}px`;

                const moveTo = (x, y, scale) => `translate(${x - glyph.left}px, ${y - glyph.top}px) scale(${scale})`;
                const home = 'translate(0px, 0px) scale(1)';
                const hidden = 'translate(0px, 110%) scale(1)';
                const riseStart = wordIndex * 70 + charIndex * 14;
                const riseEnd = riseStart + 640;

                if (el === capital) {
                    const flyStart = LIFT + wordIndex * 10;
                    const compact = moveTo(compactLeft, monoTop, compactScale);
                    const dockedAt = moveTo(target.left, target.top, brandFont / introFont);
                    animateChar(el, [
                        [0, { transform: hidden }],
                        [riseStart, { transform: hidden }, EASE_OUT],
                        [riseEnd, { transform: home }],
                        [COLLAPSE, { transform: home }, EASE_IN_OUT],
                        [COLLAPSE + 600, { transform: compact }],
                        [flyStart, { transform: compact }, EASE_IN_OUT],
                        [flyStart + 760, { transform: dockedAt }],
                        [END, { transform: dockedAt }],
                    ]);
                    return;
                }

                // Les minuscules se replient vers leur capitale, de la plus éloignée à la plus proche.
                const foldStart = COLLAPSE + (lowers.length - charIndex) * 22;
                const foldEnd = foldStart + 420;
                // Réduites de moitié sur la ligne de base du monogramme, derrière leur capitale.
                const absorbed = moveTo(compactRight - glyph.width * compactScale * 0.5, monoTop + monoFont * BASELINE * 0.5, compactScale * 0.5);
                animateChar(el, [
                    [0, { transform: hidden, opacity: 1 }],
                    [riseStart, { transform: hidden, opacity: 1 }, EASE_OUT],
                    [riseEnd, { transform: home, opacity: 1 }],
                    [foldStart, { transform: home, opacity: 1 }, EASE_IN_OUT],
                    [foldStart + 200, { opacity: 0 }],
                    [foldEnd, { transform: absorbed, opacity: 0 }],
                    [END, { transform: absorbed, opacity: 0 }],
                ]);
            });

        });

        // Rideau : son bord en arc remonte sur la page, puis tout s'efface.
        curtain.animate(
            [
                { offset: LIFT / END, transform: 'translateY(0)', easing: EASE_IN_OUT },
                { offset: 1, transform: 'translateY(calc(-100% - 24vh))' },
            ],
            { duration: END, fill: 'both' },
        );

        // Horloge commune : les jalons et le tracé suivent la même accélération en cas de saut de l'intro.
        const clock = intro.animate([], { duration: END, fill: 'forwards' });
        const after = (time) => intro.animate([], { duration: time }).finished;

        // Trait : la route se trace sous le nom, se resserre avec lui, puis file vers la droite.
        const drawRoad = () => {
            const t = clock.currentTime ?? 0;
            const head = easeInOut(clamp01((t - 80) / 860));
            const tail = easeInOut(clamp01((t - LIFT) / 420));
            const morph = easeInOut(clamp01((t - COLLAPSE) / 600));

            const left = lerp(firstLeft, monoLeft, morph);
            const right = lerp(lastGlyph.right, monoLeft + monoWidth, morph);
            const y = lerp(roadY, monoTop + monoFont * BASELINE + roadGap, morph);

            if (head - tail > 0.001) {
                road.setAttribute('d', `M${lerp(left, right, tail)} ${y} L${lerp(left, right, head)} ${y}`);
                road.style.strokeWidth = `${lerp(Math.max(2.5, introFont * 0.05), monoFont * 0.045, morph)}px`;
            } else {
                road.removeAttribute('d');
            }
            if (clock.playState !== 'finished') requestAnimationFrame(drawRoad);
        };
        requestAnimationFrame(drawRoad);

        logo.style.visibility = 'visible';

        // Le premier rendu des lettres sort de leur masque ; les capitales doivent ensuite pouvoir s'en échapper.
        after(COLLAPSE).then(() => intro.classList.add('is-collapsing'));
        after(LIFT).then(() => {
            root.dataset.intro = 'reveal';
            intro.style.pointerEvents = 'none';
        });

        // Clic, touche ou scroll : l'intro accélère jusqu'à sa fin au lieu de bloquer la visite.
        const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
        const skip = () => intro.getAnimations({ subtree: true }).forEach((animation) => animation.updatePlaybackRate(4));
        SKIP_EVENTS.forEach((type) => window.addEventListener(type, skip, { passive: true }));

        clock.finished.then(() => {
            SKIP_EVENTS.forEach((type) => window.removeEventListener(type, skip));
            close();
        });
    };

    // Les positions dépendent de la police finale, mais on ne la fait jamais attendre plus de 700 ms.
    const fontReady = document.fonts ? document.fonts.load('900 1em Inter') : Promise.resolve();
    const timeout = new Promise((resolve) => { setTimeout(resolve, 700); });
    Promise.race([fontReady, timeout]).catch(() => {}).then(play);
})();
