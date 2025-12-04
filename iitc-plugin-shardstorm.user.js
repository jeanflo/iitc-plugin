// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Layer
// @version        1.1.3
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques (1-3-5km) avec gestion individuelle des calques. Optimisé Mobile.
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312040016';
    plugin_info.pluginId = 'shardstorm';

    // Initialisation
    window.plugin.shardstorm = {};
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

        // Dessin des cercles dans leurs calques respectifs
        L.circle(latLng, 1000, $.extend({}, commonStyle, { color: '#FF0000', fillColor: '#FF0000' }))
         .addTo(window.plugin.shardstorm.layers.zone1);

        L.circle(latLng, 3000, $.extend({}, commonStyle, { color: '#00FF00', fillColor: '#00FF00' }))
         .addTo(window.plugin.shardstorm.layers.zone3);

        L.circle(latLng, 5000, $.extend({}, commonStyle, { color: '#FF0000', fillColor: '#FF0000' }))
         .addTo(window.plugin.shardstorm.layers.zone5);

        window.plugin.shardstorm.activeGuid = guid;
        window.plugin.shardstorm.updateButton(true);
    };

    window.plugin.shardstorm.clear = function() {
        window.plugin.shardstorm.layers.zone1.clearLayers();
        window.plugin.shardstorm.layers.zone3.clearLayers();
        window.plugin.shardstorm.layers.zone5.clearLayers();
        
        window.plugin.shardstorm.activeGuid = null;
        window.plugin.shardstorm.updateButton(false);
    };

    // --- 2. INTERFACE UTILISATEUR ---
    window.plugin.shardstorm.updateButton = function(isActive) {
        var btn = $('#shardstorm-btn');
        if (btn.length) {
            if (isActive) {
                btn.text('ShardStorm: ON')
                   .addClass('active');
            } else {
                btn.text('ShardStorm: Off')
                   .removeClass('active');
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
               .addClass('active');
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

        // Ajout au menu Layers
        window.addLayerGroup('ShardStorm (1km)', window.plugin.shardstorm.layers.zone1, true);
        window.addLayerGroup('ShardStorm (3km)', window.plugin.shardstorm.layers.zone3, true);
        window.addLayerGroup('ShardStorm (5km)', window.plugin.shardstorm.layers.zone5, true);

        // CSS Optimisé Mobile
        $('<style>').prop('type', 'text/css').html(`
            #shardstorm-aside {
                display: block;
                text-align: center; /* Centre le bouton */
                margin: 6px 0;      /* Un peu d'espace vertical */
            }
            #shardstorm-btn {
                display: inline-block; /* Le bouton s'adapte à la taille du texte */
                padding: 4px 10px;     /* Espace intérieur confortable */
                border: 1px solid rgba(255, 255, 255, 0.2); /* Bordure très légère style IITC */
                border-radius: 4px;
                text-decoration: none;
                color: #ddd;           /* Couleur par défaut */
                background: rgba(0, 0, 0, 0.2);
                cursor: pointer;
            }
            #shardstorm-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            #shardstorm-btn.active {
                color: #ffce00;        /* Jaune actif IITC */
                border-color: #ffce00;
                background: rgba(100, 80, 0, 0.3);
                font-weight: bold;
            }
        `).appendTo('head');

        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.onPortalSelected);
        console.log('[ShardStorm] Plugin loaded (Mobile fix).');
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
