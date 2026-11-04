/* Modals du site, sur toutes les pages.
   <dialog> natif : focus piégé, Échap et bouton retour Android sont gérés par le navigateur.
   Les formulaires s'envoient sans quitter la page ; si l'envoi échoue, ils repartent en POST classique.
   Netlify retire data-netlify du HTML publié : ne jamais s'en servir comme sélecteur. */
(() => {
    const TEXT = {
        fr: {
            firstname: 'Indiquez votre prénom.',
            email: 'Indiquez un email valide, par exemple nom@exemple.com.',
            roles: 'Choisissez au moins une façon de nous soutenir.',
            consent: 'Cochez cette case pour recevoir les actualités.',
            offline: 'Envoi impossible. Vérifiez votre connexion, puis réessayez.',
            copied: 'Lien copié',
            days: (n) => `Départ dans ${n} jour${n > 1 ? 's' : ''}`,
            thanks: (name) => `Merci ${name} !`,
        },
        en: {
            firstname: 'Please enter your first name.',
            email: 'Please enter a valid email, for example name@example.com.',
            roles: 'Please choose at least one way to support us.',
            consent: 'Please tick this box to receive our news.',
            offline: 'Couldn’t send. Check your connection, then try again.',
            copied: 'Link copied',
            days: (n) => `${n} day${n > 1 ? 's' : ''} to the start`,
            thanks: (name) => `Thank you, ${name}!`,
        },
        es: {
            firstname: 'Indica tu nombre.',
            email: 'Indica un email válido, por ejemplo nombre@ejemplo.com.',
            roles: 'Elige al menos una forma de apoyarnos.',
            consent: 'Marca esta casilla para recibir las novedades.',
            offline: 'No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.',
            copied: 'Enlace copiado',
            days: (n) => `Salida en ${n} día${n > 1 ? 's' : ''}`,
            thanks: (name) => `¡Gracias, ${name}!`,
        },
    };

    const lang = document.documentElement.lang.slice(0, 2);
    const t = TEXT[lang] || TEXT.en;
    const root = document.documentElement;
    const { body } = document;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const CLOSE_MS = 160;
    const START_DATE = new Date('2027-06-14T09:00:00');
    const NEWSLETTER_SEEN = 'newsletterModalSeen';

    const hasSeenNewsletter = () => {
        try { return !!localStorage.getItem(NEWSLETTER_SEEN); } catch (e) { return false; }
    };
    const markNewsletterSeen = () => {
        try { localStorage.setItem(NEWSLETTER_SEEN, 'true'); } catch (e) { /* navigation privée */ }
    };

    // Email déjà saisi : gardé en mémoire le temps de la page pour ne pas le redemander, jamais stocké.
    let knownEmail = '';

    /* --- Ouverture et fermeture --- */
    const openDialogs = () => document.querySelectorAll('dialog.modal[open]');

    const closeNow = (dialog) => {
        dialog.classList.remove('is-closing');
        if (dialog.open) dialog.close();
    };

    const closeModal = (dialog) => {
        if (!dialog.open || dialog.classList.contains('is-closing')) return;
        dialog.classList.add('is-closing');
        setTimeout(() => closeNow(dialog), reducedMotion.matches ? 0 : CLOSE_MS);
    };

    const openModal = (id, { automatic = false } = {}) => {
        const dialog = document.getElementById(id);
        if (!dialog || dialog.open) return;

        openDialogs().forEach(closeNow);
        if (body.classList.contains('mobile-nav-open')) document.getElementById('nav-mobile-close')?.click();

        // Mesuré avant de masquer la barre de défilement, pour que la page ne saute pas.
        root.style.setProperty('--scrollbar-width', `${window.innerWidth - root.clientWidth}px`);
        body.classList.add('modal-open');

        if (id === 'involve-modal' && knownEmail) {
            const email = dialog.querySelector('input[type="email"]');
            if (!email.value) email.value = knownEmail;
        }
        dialog.showModal();

        if (id === 'newsletter-modal') {
            markNewsletterSeen();
            // Sur téléphone, ne pas ouvrir le clavier d'office : il cacherait le panneau.
            if (!automatic && finePointer.matches) dialog.querySelector('input[type="email"]')?.focus();
        }
    };

    document.querySelectorAll('dialog.modal').forEach((dialog) => {
        // Un texte sélectionné à la souris peut finir hors du panneau : seul un appui commencé dehors ferme.
        let pressedOutside = false;
        dialog.addEventListener('pointerdown', (e) => { pressedOutside = e.target === dialog; });
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog && pressedOutside) closeModal(dialog);
        });
        dialog.querySelectorAll('[data-modal-close]').forEach((button) => {
            button.addEventListener('click', () => closeModal(dialog));
        });
        dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            closeModal(dialog);
        });
        dialog.addEventListener('close', () => {
            if (!openDialogs().length) body.classList.remove('modal-open');
            const form = dialog.querySelector('form');
            const success = dialog.querySelector('.modal-success');
            if (form && success && !success.hidden) {
                form.reset();
                form.hidden = false;
                success.hidden = true;
            }
        });
    });

    document.querySelectorAll('[data-modal-trigger]').forEach((trigger) => {
        const open = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal(trigger.dataset.modalTrigger);
        };
        trigger.addEventListener('click', open);
        // Les cartes d'équipe sont des <div> : elles doivent aussi répondre au clavier.
        if (!trigger.matches('a, button')) {
            trigger.tabIndex = 0;
            trigger.setAttribute('role', 'button');
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') open(e);
            });
        }
    });

    const days = Math.floor((START_DATE.getTime() - Date.now()) / 864e5);
    if (days > 0) {
        document.querySelectorAll('[data-modal-countdown]').forEach((el) => {
            el.textContent = t.days(days);
            el.hidden = false;
        });
    }

    /* --- Validation --- */
    const errorIn = (host) => host.querySelector(':scope > .modal-error');
    let errorCount = 0;

    const showError = ({ host, inputs = [], message }) => {
        let error = errorIn(host);
        if (!error) {
            errorCount += 1;
            error = document.createElement('p');
            error.className = 'modal-error';
            error.id = `modal-error-${errorCount}`;
            error.setAttribute('role', 'alert');
            host.append(error);
        }
        error.textContent = message;
        inputs.forEach((input) => {
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', error.id);
        });
    };

    const clearError = (host) => {
        errorIn(host)?.remove();
        host.querySelectorAll('[aria-invalid]').forEach((input) => {
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
        });
    };

    const fieldProblem = (input) => {
        const filled = input.type === 'checkbox' ? input.checked : input.value.trim();
        if (filled && input.checkValidity()) return null;
        const message = input.type === 'checkbox' ? t.consent : t[input.type === 'email' ? 'email' : 'firstname'];
        return { host: input.closest('.modal-field'), inputs: [input], message };
    };

    const formProblems = (form) => {
        const problems = [];
        const roles = [...form.querySelectorAll('input[name^="involvement_"]')];
        if (roles.length && !roles.some((role) => role.checked)) {
            problems.push({ host: form.querySelector('.modal-options'), inputs: roles, message: t.roles });
        }
        form.querySelectorAll('.modal-field input').forEach((input) => {
            const problem = fieldProblem(input);
            if (problem) problems.push(problem);
        });
        return problems;
    };

    /* --- Envoi --- */
    const sendForm = async (form, { button, loadingClass, onSent, onOffline }) => {
        markNewsletterSeen();
        button.disabled = true;
        button.classList.add(loadingClass);

        let failed = false;
        try {
            // Même adresse et même encodage que le POST natif, que Netlify traite déjà.
            const response = await fetch(location.pathname, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(new FormData(form)).toString(),
            });
            failed = !response.ok;
        } catch (error) {
            failed = true;
        }

        // En ligne, le POST natif garde une chance de transmettre le contact.
        if (failed && navigator.onLine !== false) {
            form.submit();
            return;
        }

        button.disabled = false;
        button.classList.remove(loadingClass);
        if (failed) {
            onOffline();
            return;
        }
        knownEmail = form.elements.email?.value.trim() || knownEmail;
        onSent();
    };

    const showSuccess = (form, success) => {
        form.hidden = true;
        success.hidden = false;
        success.focus({ preventScroll: true });
    };

    document.querySelectorAll('dialog.modal form').forEach((form) => {
        const button = form.querySelector('.modal-cta');
        const actions = form.querySelector('.modal-actions');
        const success = form.parentElement.querySelector('.modal-success');
        // La validation native reste active si ce script ne se charge pas.
        form.noValidate = true;

        form.querySelectorAll('.modal-field input').forEach((input) => {
            const eventName = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventName, () => clearError(input.closest('.modal-field')));
            if (input.type === 'email') {
                input.addEventListener('blur', () => {
                    if (input.value.trim() && !input.checkValidity()) showError(fieldProblem(input));
                });
            }
        });
        const options = form.querySelector('.modal-options');
        options?.addEventListener('change', () => clearError(options));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (button.disabled) return;

            form.querySelectorAll('.modal-field, .modal-options, .modal-actions').forEach(clearError);
            const problems = formProblems(form);
            if (problems.length) {
                problems.forEach(showError);
                const [first] = problems[0].inputs;
                first.focus({ preventScroll: true });
                problems[0].host.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
                return;
            }

            sendForm(form, {
                button,
                loadingClass: 'is-loading',
                onSent: () => {
                    const title = success.querySelector('[data-modal-thanks]');
                    const firstname = form.elements.firstname?.value.trim();
                    if (title && firstname) title.textContent = t.thanks(firstname);
                    showSuccess(form, success);
                },
                onOffline: () => showError({ host: actions, message: t.offline }),
            });
        });
    });

    document.querySelectorAll('[data-modal-share]').forEach((button) => {
        const label = button.textContent;
        button.addEventListener('click', async () => {
            const url = `${location.origin}/${lang}/`;
            try {
                if (navigator.share) {
                    await navigator.share({ title: 'We Ride For Smiles', url });
                    return;
                }
                await navigator.clipboard.writeText(url);
                button.textContent = t.copied;
                setTimeout(() => { button.textContent = label; }, 2000);
            } catch (error) { /* partage annulé */ }
        });
    });

    /* --- Newsletter du pied de page : quand « submit » arrive, la validation native est déjà passée --- */
    document.querySelectorAll('form[name]').forEach((form) => {
        if (form.closest('dialog.modal')) return;
        const button = form.querySelector('.form-submit-btn');
        const success = form.parentElement.querySelector('.footer-newsletter-success');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (button.disabled) return;
            errorIn(form)?.remove();
            sendForm(form, {
                button,
                loadingClass: 'loading',
                onSent: () => showSuccess(form, success),
                onOffline: () => showError({ host: form, message: t.offline }),
            });
        });
    });

    // Après un POST natif puis un retour arrière, le navigateur restaure la page telle quelle : le bouton doit redevenir utilisable.
    window.addEventListener('pageshow', () => {
        document.querySelectorAll('.form-submit-btn.loading, .modal-cta.is-loading').forEach((button) => {
            button.classList.remove('loading', 'is-loading');
            button.disabled = false;
        });
    });

    /* --- Newsletter proposée une seule fois : à mi-page, ou quand la souris quitte la fenêtre --- */
    const newsletter = document.getElementById('newsletter-modal');
    if (newsletter?.hasAttribute('data-modal-auto') && !hasSeenNewsletter()) {
        let onScroll;
        let onLeave;
        const propose = () => {
            const busy = openDialogs().length
                || body.classList.contains('mobile-nav-open')
                || root.dataset.intro
                || document.activeElement?.matches('input, textarea');
            if (busy) return;
            window.removeEventListener('scroll', onScroll);
            root.removeEventListener('mouseleave', onLeave);
            if (!hasSeenNewsletter()) openModal('newsletter-modal', { automatic: true });
        };
        onScroll = () => {
            if (window.scrollY / (root.scrollHeight - window.innerHeight) > 0.5) propose();
        };
        onLeave = (e) => {
            if (e.clientY <= 0 && window.scrollY > 600) propose();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        if (finePointer.matches) root.addEventListener('mouseleave', onLeave);
    }

    // Lien direct vers un modal, par exemple /fr/#involve-modal (déjà annoncé dans les données structurées).
    if (location.hash && document.getElementById(location.hash.slice(1))?.matches('dialog.modal')) {
        openModal(location.hash.slice(1));
    }
})();
