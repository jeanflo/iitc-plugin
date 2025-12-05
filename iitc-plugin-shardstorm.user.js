// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Anomaly
// @author         Z0mZ0m
// @version        1.2.3
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques (1-5-10km) avec menu de configuration (Transparence/Épaisseur).
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312040022';
    plugin_info.pluginId = 'shardstorm';

    // Initialisation
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.layers = {
        zone1: null,
        zone2: null,
        zone3: null
    };
    window.plugin.shardstorm.activeGuid = null;

    // --- PARAMÈTRES PAR DÉFAUT ---
    window.plugin.shardstorm.settings = {
        opacity: 0.1,
        weight: 1,
        color1: '#FF0000', // Rouge
        color2: '#00FF00', // Vert
        color3: '#FF0000'  // Rouge
    };

    // Charger les paramètres
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

    // --- OUTIL MATHÉMATIQUE : Générer les points d'un cercle ---
    window.plugin.shardstorm.getCirclePoints = function(center, radiusMeters) {
        var points = [];
        var count = 720; // Lissage
        var earthR = 6378137;
        var lat1 = (center.lat * Math.PI) / 180;
        var lon1 = (center.lng * Math.PI) / 180;
        var d = radiusMeters / earthR;

        for (var i = 0; i <= count; i++) {
            var theta = (i / count) * (2 * Math.PI);
            var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(theta));
            var lon2 = lon1 + Math.atan2(Math.sin(theta) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
            points.push([lat2 * 180 / Math.PI, lon2 * 180 / Math.PI]);
        }
        return points;
    };

    // --- 1. LOGIQUE DE DESSIN ---
    window.plugin.shardstorm.draw = function() {
        var guid = window.plugin.shardstorm.activeGuid;
        if (!guid) return;

        window.plugin.shardstorm.clearLayersOnly();

        var portal = window.portals[guid];
        var latLng = portal ? portal.getLatLng() : null;
        if (!latLng) return;

        var s = window.plugin.shardstorm.settings;
        var commonStyle = {
            fillOpacity: s.opacity,
            weight: s.weight,
            interactive: false
        };

        // --- ZONE 1 : 0 à 1km (Cercle simple) ---
        L.circle(latLng, 1000, $.extend({}, commonStyle, { color: s.color1, fillColor: s.color1 }))
         .addTo(window.plugin.shardstorm.layers.zone1);

        // --- ZONE 2 : Anneau 1km à 5km ---
        var poly2Outer = window.plugin.shardstorm.getCirclePoints(latLng, 5000);
        var poly2Inner = window.plugin.shardstorm.getCirclePoints(latLng, 1000);
        
        L.polygon([poly2Outer, poly2Inner], $.extend({}, commonStyle, { color: s.color2, fillColor: s.color2 }))
         .addTo(window.plugin.shardstorm.layers.zone2);

        // --- ZONE 3 : Anneau 5km à 10km ---
        var poly3Outer = window.plugin.shardstorm.getCirclePoints(latLng, 10000);
        var poly3Inner = window.plugin.shardstorm.getCirclePoints(latLng, 5000);

        L.polygon([poly3Outer, poly3Inner], $.extend({}, commonStyle, { color: s.color3, fillColor: s.color3 }))
         .addTo(window.plugin.shardstorm.layers.zone3);
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
    };

    window.plugin.shardstorm.clear = function() {
        window.plugin.shardstorm.clearLayersOnly();
        window.plugin.shardstorm.activeGuid = null;
        window.plugin.shardstorm.updateUI();
    };

    // --- 3. BOITE DE DIALOGUE CONFIGURATION ---
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
                    <label>Épaisseur du trait : <span id="shardstorm-weight-val">${s.weight}px</span></label>
                    <input type="range" min="1" max="10" step="1" id="shardstorm-weight-input" 
                           value="${s.weight}" style="width:100%">
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

        // Listeners pour les couleurs
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

        // Listeners pour les sliders
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
            window.plugin.shardstorm.settings.weight = val;
            window.plugin.shardstorm.saveSettings();
            if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw();
        });
    };

    // --- 2. INTERFACE UTILISATEUR ---
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
        btn.title = 'Activer/Désactiver les zones';
        btn.style.marginRight = '10px';
        btn.onclick = function(e) {
            e.preventDefault();
            window.plugin.shardstorm.toggle();
            return false;
        };

        var settingsBtn = document.createElement('a');
        settingsBtn.textContent = '⚙️';
        settingsBtn.href = '#';
        settingsBtn.title = 'Configurer ShardStorm';
        settingsBtn.style.textDecoration = 'none';
        settingsBtn.onclick = function(e) {
            e.preventDefault();
            window.plugin.shardstorm.showDialog();
            return false;
        };

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

        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.addToSidebar);
        console.log('[ShardStorm] Plugin loaded v1.2.2 (Colors)');
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
