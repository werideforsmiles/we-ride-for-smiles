// Supprime les réponses au formulaire « S'impliquer » de plus de 3 ans, comme l'annonce la politique de confidentialité.
// Les inscriptions à la newsletter ne sont pas concernées : elles sont conservées jusqu'à la désinscription.
//
// Les journaux GitHub Actions peuvent être lus par d'autres : ce script n'y écrit jamais le contenu d'une réponse.

const API = process.env.NETLIFY_API_URL || 'https://api.netlify.com/api/v1';
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const SITE_ID = process.env.NETLIFY_SITE_ID;
const DRY_RUN = process.env.DRY_RUN === 'true';

const FORMS_TO_PURGE = /^get-involved-/;
const RETENTION_YEARS = 3;
const PER_PAGE = 100;
// L'API renvoie les réponses validées par défaut, et le spam avec state=spam.
const LISTS = ['', '&state=spam'];

const request = async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${path.split('?')[0]} : HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
};

const listSubmissions = async (formId, filter) => {
    const all = [];
    for (let page = 1; ; page += 1) {
        const batch = await request(`/forms/${formId}/submissions?page=${page}&per_page=${PER_PAGE}${filter}`);
        all.push(...batch);
        if (batch.length < PER_PAGE) return all;
    }
};

const main = async () => {
    if (!TOKEN || !SITE_ID) {
        console.log('NETLIFY_AUTH_TOKEN ou NETLIFY_SITE_ID manquant : purge non activée, rien à faire.');
        return;
    }

    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - RETENTION_YEARS);

    const forms = (await request(`/sites/${SITE_ID}/forms`)).filter((form) => FORMS_TO_PURGE.test(form.name));
    console.log(`${forms.length} formulaire(s) concerné(s), suppression avant le ${limit.toISOString().slice(0, 10)}${DRY_RUN ? ' (simulation)' : ''}.`);

    let total = 0;
    for (const form of forms) {
        const expired = new Set();
        for (const filter of LISTS) {
            for (const submission of await listSubmissions(form.id, filter)) {
                // Une date illisible ne compte jamais comme ancienne : dans le doute, on ne supprime pas.
                if (new Date(submission.created_at) < limit) expired.add(submission.id);
            }
        }
        if (!DRY_RUN) {
            for (const id of expired) {
                await request(`/submissions/${id}`, { method: 'DELETE' });
            }
        }
        console.log(`${form.name} : ${expired.size} réponse(s) ${DRY_RUN ? 'à supprimer' : 'supprimée(s)'}.`);
        total += expired.size;
    }
    console.log(`Total : ${total}.`);
};

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
