// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Layer
// @version        1.0.2
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/main/shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/main/shardstorm.user.js
// @description    Affiche les zones tactiques (1-3-5km) autour du portail sélectionné.
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312040012';
    plugin_info.pluginId = 'shardstorm';

    // Initialisation
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.layerGroup = null;
    window.plugin.shardstorm.activeGuid = null;

    // --- 1. LOGIQUE DE DESSIN ---
    window.plugin.shardstorm.toggle = function() {
        var guid = window.selectedPortal;

        if (!guid) return;

        // Si actif sur ce portail -> On éteint
        if (window.plugin.shardstorm.activeGuid === guid) {
            window.plugin.shardstorm.clear();
            return;
        }

        // Sinon on dessine
        window.plugin.shardstorm.clear();

        var portal = window.portals[guid];
        var latLng = portal ? portal.getLatLng() : null;
        if (!latLng) return;

        // Cercles (Rayons en mètres)
        var circles = [
            { radius: 5000, color: '#FF0000', title: '5km' },
            { radius: 3000, color: '#00FF00', title: '3km' },
            { radius: 1000, color: '#FF0000', title: '1km' }
        ];

        circles.forEach(function(c) {
            var circle = L.circle(latLng, c.radius, {
                color: c.color,
                fillColor: c.color,
                fillOpacity: 0.05, // Opacité très légère pour ne pas gêner
                weight: 1,         // Trait fin
                interactive: false
            });
            window.plugin.shardstorm.layerGroup.addLayer(circle);
        });

        window.plugin.shardstorm.activeGuid = guid;
        window.plugin.shardstorm.updateButton(true);
    };

    window.plugin.shardstorm.clear = function() {
        window.plugin.shardstorm.layerGroup.clearLayers();
        window.plugin.shardstorm.activeGuid = null;
        window.plugin.shardstorm.updateButton(false);
    };

    // --- 2. INTERFACE UTILISATEUR ---
    window.plugin.shardstorm.updateButton = function(isActive) {
        var btn = $('#shardstorm-btn');
        if (btn.length) {
            if (isActive) {
                btn.text('ShardStorm: ON')
                   .css('color', '#ffce00') // Jaune standard IITC pour actif
                   .css('font-weight', 'bold');
            } else {
                btn.text('ShardStorm: Off')
                   .css('color', '') // Retour couleur lien par défaut
                   .css('font-weight', 'normal');
            }
        }
    };

    window.plugin.shardstorm.onPortalSelected = function() {
        var guid = window.selectedPortal;
        if (!guid) return;

        $('#shardstorm-aside').remove();

        // Utilisation d'un simple <a> dans un <aside> pour s'intégrer nativement
        var aside = $('<aside id="shardstorm-aside"></aside>');
        var btn = $('<a id="shardstorm-btn" href="#" onclick="return false;" title="Afficher les zones 1/3/5km">ShardStorm: Off</a>');

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

        // Ajout dans la section linkdetails (là où sont les autres plugins)
        $('.linkdetails').append(aside);
    };

    var setup = function() {
        window.plugin.shardstorm.layerGroup = new L.LayerGroup();
        window.map.addLayer(window.plugin.shardstorm.layerGroup);

        // CSS minimal juste pour l'espacement, sans couleurs forcées
        $('<style>').prop('type', 'text/css').html(`
            #shardstorm-aside {
                display: block;
                margin-top: 2px;
            }
        `).appendTo('head');

        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.onPortalSelected);
        console.log('[ShardStorm] Plugin loaded.');
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
