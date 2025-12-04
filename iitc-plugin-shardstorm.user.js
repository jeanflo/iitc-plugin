// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Layer
// @version        1.1.0
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques (1-3-5km) avec gestion individuelle des calques.
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312040015';
    plugin_info.pluginId = 'shardstorm';

    // Initialisation
    window.plugin.shardstorm = {};
    // On crée un objet pour stocker nos 3 calques distincts
    window.plugin.shardstorm.layers = {
        zone1: null,
        zone3: null,
        zone5: null
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

        // Options communes pour le style
        var commonStyle = {
            fillOpacity: 0.05,
            weight: 1,
            interactive: false
        };

        // Dessin du cercle 1km
        L.circle(latLng, 1000, $.extend({}, commonStyle, { color: '#FF0000', fillColor: '#FF0000' }))
         .addTo(window.plugin.shardstorm.layers.zone1);

        // Dessin du cercle 3km
        L.circle(latLng, 3000, $.extend({}, commonStyle, { color: '#00FF00', fillColor: '#00FF00' }))
         .addTo(window.plugin.shardstorm.layers.zone3);

        // Dessin du cercle 5km
        L.circle(latLng, 5000, $.extend({}, commonStyle, { color: '#FF0000', fillColor: '#FF0000' }))
         .addTo(window.plugin.shardstorm.layers.zone5);

        window.plugin.shardstorm.activeGuid = guid;
        window.plugin.shardstorm.updateButton(true);
    };

    window.plugin.shardstorm.clear = function() {
        // On vide les 3 calques
        window.plugin.shardstorm.layers.zone1.clearLayers();
        window.plugin.shardstorm.layers.zone3.clearLayers();
        window.plugin.shardstorm.layers.zone5.clearLayers();

        window.plugin.shardstorm.activeGuid = null;
        window.plugin.shardstorm.updateButton(false);
    };

    // --- 2. INTERFACE UTILISATEUR (Bouton Portail) ---
    window.plugin.shardstorm.updateButton = function(isActive) {
        var btn = $('#shardstorm-btn');
        if (btn.length) {
            if (isActive) {
                btn.text('ShardStorm: ON')
                   .css('color', '#ffce00')
                   .css('font-weight', 'bold');
            } else {
                btn.text('ShardStorm: Off')
                   .css('color', '')
                   .css('font-weight', 'normal');
            }
        }
    };

    window.plugin.shardstorm.onPortalSelected = function() {
        var guid = window.selectedPortal;
        if (!guid) return;

        $('#shardstorm-aside').remove();

        var aside = $('<aside id="shardstorm-aside"></aside>');
        var btn = $('<a id="shardstorm-btn" href="#" onclick="return false;" title="Calculer les zones">ShardStorm: Off</a>');

        if (window.plugin.shardstorm.activeGuid === guid) {
            btn.text('ShardStorm: ON')
               .css('color', '#ffce00')
               .css('font-weight', 'bold');
        }

        btn.on('click', function(e) {
            e.preventDefault();
            window.plugin.shardstorm.toggle();
        });

        aside.append(btn);
        $('.linkdetails').append(aside);
    };

    var setup = function() {
        // Création des groupes de calques
        window.plugin.shardstorm.layers.zone1 = new L.LayerGroup();
        window.plugin.shardstorm.layers.zone3 = new L.LayerGroup();
        window.plugin.shardstorm.layers.zone5 = new L.LayerGroup();

        // Ajout au gestionnaire de calques officiel IITC (Menu Layers)
        // Le 'true' à la fin signifie qu'ils sont cochés par défaut
        window.addLayerGroup('ShardStorm (1km)', window.plugin.shardstorm.layers.zone1, true);
        window.addLayerGroup('ShardStorm (3km)', window.plugin.shardstorm.layers.zone3, true);
        window.addLayerGroup('ShardStorm (5km)', window.plugin.shardstorm.layers.zone5, true);

        // CSS minimal
        $('<style>').prop('type', 'text/css').html(`
            #shardstorm-aside {
                display: block;
                margin-top: 2px;
            }
        `).appendTo('head');

        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.onPortalSelected);
        console.log('[ShardStorm] Plugin loaded with multi-layers.');
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
