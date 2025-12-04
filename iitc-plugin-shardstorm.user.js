// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Anomaly
// @author         Z0mZ0m
// @version        1.1.5
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques (1-3-5km) avec gestion individuelle des calques. Style natif.
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312040018';
    plugin_info.pluginId = 'shardstorm';

    // Initialisation
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.layers = {
        zone1: null,
        zone5: null,
        zone10: null
    };
    window.plugin.shardstorm.activeGuid = null;

    // --- 1. LOGIQUE DE DESSIN ---
    window.plugin.shardstorm.toggle = function() {
        var guid = window.selectedPortal;

        if (!guid) return;

        // Si actif sur ce portail -> On éteint tout
        if (window.plugin.shardstorm.activeGuid === guid) {
            window.plugin.shardstorm.clear();
            return;
        }

        // Sinon on nettoie d'abord et on dessine
        window.plugin.shardstorm.clear();

        var portal = window.portals[guid];
        var latLng = portal ? portal.getLatLng() : null;
        if (!latLng) return;

        var commonStyle = {
            fillOpacity: 0.05,
            weight: 1,
            interactive: false
        };

        L.circle(latLng, 1000, $.extend({}, commonStyle, { color: '#FF0000', fillColor: '#FF0000' }))
         .addTo(window.plugin.shardstorm.layers.zone1);

        L.circle(latLng, 5000, $.extend({}, commonStyle, { color: '#00FF00', fillColor: '#00FF00' }))
         .addTo(window.plugin.shardstorm.layers.zone5);

        L.circle(latLng, 10000, $.extend({}, commonStyle, { color: '#FF0000', fillColor: '#FF0000' }))
         .addTo(window.plugin.shardstorm.layers.zone10);

        window.plugin.shardstorm.activeGuid = guid;
        window.plugin.shardstorm.updateButton(true);
    };

    window.plugin.shardstorm.clear = function() {
        window.plugin.shardstorm.layers.zone1.clearLayers();
        window.plugin.shardstorm.layers.zone5.clearLayers();
        window.plugin.shardstorm.layers.zone10.clearLayers();

        window.plugin.shardstorm.activeGuid = null;
        window.plugin.shardstorm.updateButton(false);
    };

    // --- 2. INTERFACE UTILISATEUR ---
    window.plugin.shardstorm.updateButton = function(isActive) {
        var btn = document.getElementById('shardstorm-btn');
        if (btn) {
            if (isActive) {
                btn.textContent = 'ShardStorm: ON';
                // Couleur jaune standard IITC (#ffce00) pour l'état actif
                btn.style.color = '#ffce00';
            } else {
                btn.textContent = 'ShardStorm: Off';
                // On enlève le style inline pour revenir à la couleur par défaut du lien
                btn.style.color = '';
            }
        }
    };

    window.plugin.shardstorm.addToSidebar = function() {
        if (!window.selectedPortal) return;

        // On vérifie si le conteneur principal existe
        var container = document.getElementById('portaldetails');
        if (!container) return;

        // On cherche la section .linkdetails (standard IITC)
        var linkDetails = container.querySelector('.linkdetails');

        // Si le bouton existe déjà, on ne fait rien
        if (document.getElementById('shardstorm-btn')) return;

        // Création de l'élément <aside> comme dans votre exemple
        var aside = document.createElement('aside');
        aside.id = 'shardstorm-aside';

        // Création du lien <a> (le bouton)
        var btn = document.createElement('a');
        btn.id = 'shardstorm-btn';
        btn.textContent = 'ShardStorm: Off';
        btn.href = '#';
        // On n'ajoute PAS de classe CSS personnalisée pour éviter les styles bizarres
        // On gère juste le clic
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.plugin.shardstorm.toggle();
            return false;
        };

        // Si le plugin était déjà actif sur ce portail (ex: rechargement), on remet l'état visuel
        if (window.plugin.shardstorm.activeGuid === window.selectedPortal) {
            btn.textContent = 'ShardStorm: ON';
            btn.style.color = '#ffce00';
        }

        aside.appendChild(btn);

        // Insertion dans le DOM
        if (linkDetails) {
            linkDetails.appendChild(aside);
        } else {
            container.appendChild(aside);
        }
    };

    var setup = function() {
        // Création des calques
        window.plugin.shardstorm.layers.zone1 = new L.LayerGroup();
        window.plugin.shardstorm.layers.zone5 = new L.LayerGroup();
        window.plugin.shardstorm.layers.zone10 = new L.LayerGroup();

        window.addLayerGroup('ShardStorm (1km)', window.plugin.shardstorm.layers.zone1, true);
        window.addLayerGroup('ShardStorm (5km)', window.plugin.shardstorm.layers.zone5, true);
        window.addLayerGroup('ShardStorm (10km)', window.plugin.shardstorm.layers.zone10, true);

        // PLUS DE CSS INJECTÉ ICI.
        // On laisse IITC gérer le style natif des liens dans <aside>.

        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.addToSidebar);
        console.log('[ShardStorm] Plugin loaded (Native Style).');
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
