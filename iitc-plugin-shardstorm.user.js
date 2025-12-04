// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Layer
// @version        1.2.0
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
    plugin_info.dateTimeVersion = '202312040020';
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
        opacity: 0.05, // 5%
        weight: 1      // 1px
    };

    // Charger les paramètres stockés
    window.plugin.shardstorm.loadSettings = function() {
        try {
            var stored = localStorage.getItem('plugin-shardstorm-settings');
            if (stored) {
                var parsed = JSON.parse(stored);
                // On fusionne avec les défauts pour éviter les erreurs si des clés manquent
                window.plugin.shardstorm.settings = $.extend({}, window.plugin.shardstorm.settings, parsed);
            }
        } catch(e) { console.warn(e); }
    };

    // Sauvegarder les paramètres
    window.plugin.shardstorm.saveSettings = function() {
        localStorage.setItem('plugin-shardstorm-settings', JSON.stringify(window.plugin.shardstorm.settings));
    };

    // --- 1. LOGIQUE DE DESSIN ---
    window.plugin.shardstorm.draw = function() {
        var guid = window.plugin.shardstorm.activeGuid;
        if (!guid) return;

        window.plugin.shardstorm.clearLayersOnly();

        var portal = window.portals[guid];
        var latLng = portal ? portal.getLatLng() : null;
        if (!latLng) return;

        // Utilisation des paramètres configurés
        var commonStyle = {
            fillOpacity: window.plugin.shardstorm.settings.opacity,
            weight: window.plugin.shardstorm.settings.weight,
            interactive: false
        };

        // Zone 1 : 1km (Rouge)
        L.circle(latLng, 1000, $.extend({}, commonStyle, { color: '#FF0000', fillColor: '#FF0000' }))
         .addTo(window.plugin.shardstorm.layers.zone1);

        // Zone 2 : 5km (Vert)
        L.circle(latLng, 5000, $.extend({}, commonStyle, { color: '#00FF00', fillColor: '#00FF00' }))
         .addTo(window.plugin.shardstorm.layers.zone2);

        // Zone 3 : 10km (Bleu)
        L.circle(latLng, 10000, $.extend({}, commonStyle, { color: '#FF0000', fillColor: '#FF0000' }))
         .addTo(window.plugin.shardstorm.layers.zone3);
    };

    window.plugin.shardstorm.toggle = function() {
        var guid = window.selectedPortal;
        if (!guid) return;

        // Si actif sur ce portail -> On éteint
        if (window.plugin.shardstorm.activeGuid === guid) {
            window.plugin.shardstorm.clear();
            return;
        }

        // Sinon on active
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
        var html = `
            <div style="min-width:300px">
                <p>Configurez l'apparence des zones.</p>

                <div style="margin-bottom:10px;">
                    <label>Opacité (Transparence) : <span id="shardstorm-opacity-val">${Math.round(window.plugin.shardstorm.settings.opacity * 100)}%</span></label>
                    <input type="range" min="0" max="1" step="0.05" id="shardstorm-opacity-input"
                           value="${window.plugin.shardstorm.settings.opacity}" style="width:100%">
                </div>

                <div style="margin-bottom:10px;">
                    <label>Épaisseur du trait : <span id="shardstorm-weight-val">${window.plugin.shardstorm.settings.weight}px</span></label>
                    <input type="range" min="1" max="10" step="1" id="shardstorm-weight-input"
                           value="${window.plugin.shardstorm.settings.weight}" style="width:100%">
                </div>
            </div>`;

        window.dialog({
            html: html,
            id: 'plugin-shardstorm-options',
            title: 'Options ShardStorm',
            buttons: {
                'OK': function() {
                    $(this).dialog('close');
                }
            }
        });

        // Gestion des événements live (prévisualisation)
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

        // Bouton Toggle ON/OFF
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

        // Bouton Paramètres (Engrenage)
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

        window.addLayerGroup('Zone 1 (1km)', window.plugin.shardstorm.layers.zone1, true);
        window.addLayerGroup('Zone 2 (5km)', window.plugin.shardstorm.layers.zone2, true);
        window.addLayerGroup('Zone 3 (10km)', window.plugin.shardstorm.layers.zone3, true);

        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.addToSidebar);
        console.log('[ShardStorm] Plugin loaded v1.2.0');
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
