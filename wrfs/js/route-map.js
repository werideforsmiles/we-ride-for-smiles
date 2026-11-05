/* Carte des pages parcours : MapLibre + tuiles vectorielles OpenFreeMap (sans clé API).
   Les pages gardent leurs coordonnées au format [lat, lng] ; la conversion se fait ici. */
(() => {
    const STYLES = {
        dark: 'https://tiles.openfreemap.org/styles/dark',
        light: 'https://tiles.openfreemap.org/styles/positron',
    };
    const toLngLat = ([lat, lng]) => [lng, lat];
    const noop = () => {};
    const isSmall = () => window.innerWidth < 640;

    window.createRouteMap = (containerId, { center, zoom, theme }) => {
        // Sans MapLibre (CDN bloqué) ni WebGL, le récit du parcours doit rester utilisable.
        const fallback = { setTheme: noop, setPath: noop, flyTo: noop };
        if (!window.maplibregl) return fallback;

        let map;
        try {
            map = new maplibregl.Map({
                container: containerId,
                style: STYLES[theme],
                center: toLngLat(center),
                zoom,
                scrollZoom: false,
                dragRotate: false,
                pitchWithRotate: false,
                touchPitch: false,
                attributionControl: { compact: isSmall() },
            });
        } catch (error) {
            console.warn('Carte indisponible :', error);
            return fallback;
        }
        map.touchZoomRotate.disableRotation();

        // Sur petit écran, l'attribution se replie derrière son bouton « i » pour libérer la carte.
        if (isSmall()) {
            // MapLibre l'ouvre une seule fois, dès que le style fournit son texte : on la replie à cet instant.
            const collapseAttribution = () => {
                const attribution = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
                if (!attribution?.classList.contains('maplibregl-compact')) return;
                attribution.removeAttribute('open');
                attribution.classList.remove('maplibregl-compact-show');
                map.off('styledata', collapseAttribution);
                map.off('sourcedata', collapseAttribution);
            };
            map.on('styledata', collapseAttribution);
            map.on('sourcedata', collapseAttribution);
        }

        // Le style OpenFreeMap référence des icônes absentes de son sprite : rien à dessiner.
        map.on('styleimagemissing', ({ id }) => {
            if (!map.hasImage(id)) map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
        });

        let currentTheme = theme;
        let path = [];
        const routeData = () => ({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: path.map(toLngLat) },
        });

        // Un changement de style efface les couches ajoutées : on retrace la ligne à chaque chargement.
        map.on('style.load', () => {
            map.addSource('route', { type: 'geojson', data: routeData() });
            // Au-dessus des routes, sous le dernier bloc d'étiquettes qui reste ainsi lisible.
            const layers = map.getStyle().layers;
            const labelsStart = layers.findLastIndex((layer) => layer.type !== 'symbol') + 1;
            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#FFA500', 'line-width': 4, 'line-opacity': 0.82 },
            }, layers[labelsStart]?.id);
        });

        return {
            setTheme(nextTheme) {
                if (nextTheme === currentTheme) return;
                currentTheme = nextTheme;
                map.setStyle(STYLES[nextTheme], { diff: false });
            },
            setPath(latlngs) {
                path = latlngs;
                map.getSource('route')?.setData(routeData());
            },
            flyTo(coords, nextZoom) {
                map.flyTo({ center: toLngLat(coords), zoom: nextZoom, duration: 1500 });
            },
        };
    };
})();
