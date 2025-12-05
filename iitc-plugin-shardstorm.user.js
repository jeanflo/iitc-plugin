// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Anomaly
// @author         Z0mZ0m
// @version        1.3.0
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques via simulation d'épaisseur (Courbes Parfaites).
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312040030';
    plugin_info.pluginId = 'shardstorm';

    // Initialisation
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.layers = {
        zone1: null,
        zone2: null,
        zone3: null
    };
    window.plugin.shardstorm.donuts = []; // Stockage pour mise à jour au zoom
    window.plugin.shardstorm.activeGuid = null;
    window.plugin.shardstorm.currentLatLng = null;

    // --- PARAMÈTRES ---
    window.plugin.shardstorm.settings = {
        opacity: 0.1,
        borderWeight: 1, // Épaisseur des traits de délimitation
        color1: '#FF0000',
        color2: '#00FF00',
        color3: '#FF0000'
    };

    window.plugin.shardstorm.loadSettings = function() {
        try {
            var stored = localStorage.getItem('plugin-shardstorm-settings');
            if (stored) {
                var parsed = JSON.parse(stored);
                window.plugin.shardstorm.settings = $.extend({}, window.plugin.shardstorm.settings, parsed);
            }
        } catch(e) { console.warn(e); }
    };

    window.plugin.shardstorm.saveSettings = function() {
        localStorage.setItem('plugin-shardstorm-settings', JSON.stringify(window.plugin.shardstorm.settings));
    };

    // --- CALCUL DES ÉPAISSEURS EN PIXELS ---
    // Cette fonction convertit une distance en mètres en pixels à l'écran selon le zoom actuel
    window.plugin.shardstorm.getPixelRadius = function(latLng, radiusMeters) {
        if (!window.map) return 0;
        
        // On projette le centre
        var p1 = window.map.latLngToLayerPoint(latLng);
        
        // On calcule un point décalé vers l'Est de 'radiusMeters'
        // Approximation rapide suffisante pour l'affichage visuel
        var lat = latLng.lat;
        var lng = latLng.lng;
        var rLng = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
        var p2 = window.map.latLngToLayerPoint(L.latLng(lat, lng + rLng));

        return Math.abs(p2.x - p1.x);
    };

    // Met à jour l'épaisseur des "Donuts" quand on zoome
    window.plugin.shardstorm.updateDonutWidths = function() {
        if (!window.plugin.shardstorm.activeGuid || !window.plugin.shardstorm.currentLatLng) return;

        var latLng = window.plugin.shardstorm.currentLatLng;
        var donuts = window.plugin.shardstorm.donuts;

        // Calcul des rayons en pixels
        var px1km = window.plugin.shardstorm.getPixelRadius(latLng, 1000);
        var px5km = window.plugin.shardstorm.getPixelRadius(latLng, 5000);
        var px10km = window.plugin.shardstorm.getPixelRadius(latLng, 10000);

        // Chevauchement en pixels pour éviter les micro-coupures (1.5px est suffisant)
        var overlap = 1.5;

        // Mise à jour Zone 2 (1km -> 5km)
        // L'épaisseur nécessaire est la différence entre le rayon externe et interne
        var width2 = (px5km - px1km) + overlap;
        if (donuts[0]) donuts[0].setStyle({ weight: width2 });

        // Mise à jour Zone 3 (5km -> 10km)
        var width3 = (px10km - px5km) + overlap;
        if (donuts[1]) donuts[1].setStyle({ weight: width3 });
    };

    // --- DESSIN ---
    window.plugin.shardstorm.draw = function() {
        var guid = window.plugin.shardstorm.activeGuid;
        if (!guid) return;

        window.plugin.shardstorm.clearLayersOnly();

        var portal = window.portals[guid];
        var latLng = portal ? portal.getLatLng() : null;
        if (!latLng) return;
        
        window.plugin.shardstorm.currentLatLng = latLng;
        var s = window.plugin.shardstorm.settings;

        // --- ZONE 1 : 0-1km (Cercle Plein Standard) ---
        // Le cercle natif est parfait pour le centre
        L.circle(latLng, 1000, {
            stroke: false,
            fill: true,
            fillColor: s.color1,
            fillOpacity: s.opacity,
            interactive: false
        }).addTo(window.plugin.shardstorm.layers.zone1);

        // --- ZONE 2 : 1-5km (Cercle à trait épais) ---
        // On crée un cercle au milieu de la zone (à 3km)
        // Son "trait" (stroke) sera élargi dynamiquement pour couvrir de 1 à 5km
        var donut2 = L.circle(latLng, 3000, {
            stroke: true,      // C'est le trait qui fait la couleur
            color: s.color2,
            opacity: s.opacity,// Transparence du trait
            fill: false,       // Pas de remplissage interne
            interactive: false,
            className: 'no-pointer-events' // Optimisation
        }).addTo(window.plugin.shardstorm.layers.zone2);

        // --- ZONE 3 : 5-10km (Cercle à trait épais) ---
        // Centre à 7.5km
        var donut3 = L.circle(latLng, 7500, {
            stroke: true,
            color: s.color3,
            opacity: s.opacity,
            fill: false,
            interactive: false
        }).addTo(window.plugin.shardstorm.layers.zone3);

        // On stocke ces cercles spéciaux pour mettre à jour leur épaisseur
        window.plugin.shardstorm.donuts = [donut2, donut3];

        // --- BORDURES FINES (Délimitations nettes) ---
        // On ajoute des cercles fins par dessus pour avoir des limites propres (1px)
        var borderStyle = {
            fill: false,
            stroke: true,
            weight: s.borderWeight,
            opacity: 0.8, // Toujours bien visible
            interactive: false
        };

        if (s.borderWeight > 0) {
            L.circle(latLng, 1000, $.extend({}, borderStyle, { color: s.color1 })).addTo(window.plugin.shardstorm.layers.zone1);
            L.circle(latLng, 5000, $.extend({}, borderStyle, { color: s.color2 })).addTo(window.plugin.shardstorm.layers.zone2);
            L.circle(latLng, 10000, $.extend({}, borderStyle, { color: s.color3 })).addTo(window.plugin.shardstorm.layers.zone3);
        }

        // Calcul initial des épaisseurs
        window.plugin.shardstorm.updateDonutWidths();
    };

    window.plugin.shardstorm.toggle = function() {
        var guid = window.selectedPortal;
        if (!guid) return;

        if (window.plugin.shardstorm.activeGuid === guid) {
            window.plugin.shardstorm.clear();
            return;
        }
        window.plugin.shardstorm.activeGuid = guid;
        window.plugin.shardstorm.draw();
        window.plugin.shardstorm.updateUI();
    };

    window.plugin.shardstorm.clearLayersOnly = function() {
        window.plugin.shardstorm.layers.zone1.clearLayers();
        window.plugin.shardstorm.layers.zone2.clearLayers();
        window.plugin.shardstorm.layers.zone3.clearLayers();
        window.plugin.shardstorm.donuts = [];
        window.plugin.shardstorm.currentLatLng = null;
    };

    window.plugin.shardstorm.clear = function() {
        window.plugin.shardstorm.clearLayersOnly();
        window.plugin.shardstorm.activeGuid = null;
        window.plugin.shardstorm.updateUI();
    };

    // --- CONFIGURATION ---
    window.plugin.shardstorm.showDialog = function() {
        var s = window.plugin.shardstorm.settings;
        var html = `
            <div style="min-width:300px">
                <p>Configurez l'apparence des zones.</p>
                
                <div style="margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;">
                    <div style="display:flex; align-items:center; margin-bottom:5px;">
                        <input type="color" id="shardstorm-color1" value="${s.color1}" style="margin-right:10px; cursor:pointer;">
                        <label for="shardstorm-color1">Zone 1 (0-1km)</label>
                    </div>
                    <div style="display:flex; align-items:center; margin-bottom:5px;">
                        <input type="color" id="shardstorm-color2" value="${s.color2}" style="margin-right:10px; cursor:pointer;">
                        <label for="shardstorm-color2">Zone 2 (1-5km)</label>
                    </div>
                    <div style="display:flex; align-items:center;">
                        <input type="color" id="shardstorm-color3" value="${s.color3}" style="margin-right:10px; cursor:pointer;">
                        <label for="shardstorm-color3">Zone 3 (5-10km)</label>
                    </div>
                </div>

                <div style="margin-bottom:10px;">
                    <label>Opacité : <span id="shardstorm-opacity-val">${Math.round(s.opacity * 100)}%</span></label>
                    <input type="range" min="0" max="1" step="0.05" id="shardstorm-opacity-input" 
                           value="${s.opacity}" style="width:100%">
                </div>

                <div style="margin-bottom:10px;">
                    <label>Épaisseur bordure : <span id="shardstorm-weight-val">${s.borderWeight}px</span></label>
                    <input type="range" min="0" max="10" step="1" id="shardstorm-weight-input" 
                           value="${s.borderWeight}" style="width:100%">
                </div>
            </div>`;

        window.dialog({
            html: html,
            id: 'plugin-shardstorm-options',
            title: 'Options ShardStorm',
            buttons: {
                'OK': function() { $(this).dialog('close'); }
            }
        });

        $('#shardstorm-color1').on('input change', function() {
            window.plugin.shardstorm.settings.color1 = $(this).val();
            window.plugin.shardstorm.saveSettings();
            if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw();
        });
        $('#shardstorm-color2').on('input change', function() {
            window.plugin.shardstorm.settings.color2 = $(this).val();
            window.plugin.shardstorm.saveSettings();
            if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw();
        });
        $('#shardstorm-color3').on('input change', function() {
            window.plugin.shardstorm.settings.color3 = $(this).val();
            window.plugin.shardstorm.saveSettings();
            if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw();
        });
        $('#shardstorm-opacity-input').on('input change', function() {
            var val = parseFloat($(this).val());
            $('#shardstorm-opacity-val').text(Math.round(val * 100) + '%');
            window.plugin.shardstorm.settings.opacity = val;
            window.plugin.shardstorm.saveSettings();
            if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw();
        });
        $('#shardstorm-weight-input').on('input change', function() {
            var val = parseInt($(this).val());
            $('#shardstorm-weight-val').text(val + 'px');
            window.plugin.shardstorm.settings.borderWeight = val;
            window.plugin.shardstorm.saveSettings();
            if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw();
        });
    };

    window.plugin.shardstorm.updateUI = function() {
        var btn = document.getElementById('shardstorm-btn');
        if (btn) {
            if (window.plugin.shardstorm.activeGuid) {
                btn.textContent = 'ShardStorm: ON';
                btn.style.color = '#ffce00'; 
            } else {
                btn.textContent = 'ShardStorm: Off';
                btn.style.color = ''; 
            }
        }
    };

    window.plugin.shardstorm.addToSidebar = function() {
        if (!window.selectedPortal) return;
        var container = document.getElementById('portaldetails');
        if (!container) return;
        var linkDetails = container.querySelector('.linkdetails');
        
        if (document.getElementById('shardstorm-aside')) return;

        var aside = document.createElement('aside');
        aside.id = 'shardstorm-aside';

        var btn = document.createElement('a');
        btn.id = 'shardstorm-btn';
        btn.textContent = 'ShardStorm: Off';
        btn.href = '#';
        btn.onclick = function(e) {
            e.preventDefault();
            window.plugin.shardstorm.toggle();
            return false;
        };

        var settingsBtn = document.createElement('a');
        settingsBtn.textContent = '⚙️';
        settingsBtn.href = '#';
        settingsBtn.style.textDecoration = 'none';
        settingsBtn.onclick = function(e) {
            e.preventDefault();
            window.plugin.shardstorm.showDialog();
            return false;
        };
        // Espace entre les boutons
        settingsBtn.style.marginLeft = '10px';

        aside.appendChild(btn);
        aside.appendChild(settingsBtn);

        if (linkDetails) linkDetails.appendChild(aside);
        else container.appendChild(aside);
        
        window.plugin.shardstorm.updateUI();
    };

    var setup = function() {
        window.plugin.shardstorm.loadSettings();

        window.plugin.shardstorm.layers.zone1 = new L.LayerGroup();
        window.plugin.shardstorm.layers.zone2 = new L.LayerGroup();
        window.plugin.shardstorm.layers.zone3 = new L.LayerGroup();

        window.addLayerGroup('Zone 1 (0-1km)', window.plugin.shardstorm.layers.zone1, true);
        window.addLayerGroup('Zone 2 (1-5km)', window.plugin.shardstorm.layers.zone2, true);
        window.addLayerGroup('Zone 3 (5-10km)', window.plugin.shardstorm.layers.zone3, true);

        // Hook zoom/move pour recalculer l'épaisseur des donuts
        window.map.on('zoomend', function() {
            window.plugin.shardstorm.updateDonutWidths();
        });

        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.addToSidebar);
        console.log('[ShardStorm] Plugin loaded v1.3.0 (Stroke Simulation)');
    };

    setup.info = plugin_info;
    if(!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    if(window.iitcLoaded && typeof setup === 'function') setup();
}

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
