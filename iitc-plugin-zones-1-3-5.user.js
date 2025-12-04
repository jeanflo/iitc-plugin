// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Layer
// @version        1.0.0
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
    plugin_info.dateTimeVersion = '202312040010';
    plugin_info.pluginId = 'shardstorm';

    // Initialisation de l'objet principal
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.layerGroup = null;
    window.plugin.shardstorm.activeGuid = null;

    // --- 1. LOGIQUE DE DESSIN ---
    window.plugin.shardstorm.toggle = function() {
        var guid = window.selectedPortal;
        
        if (!guid) return;

        // Si on clique alors que c'est déjà actif sur ce portail -> On éteint
        if (window.plugin.shardstorm.activeGuid === guid) {
            window.plugin.shardstorm.clear();
            return;
        }

        // Sinon on nettoie tout et on dessine
        window.plugin.shardstorm.clear();

        var portal = window.portals[guid];
        var latLng = portal ? portal.getLatLng() : null;
        if (!latLng) return;

        // Configuration des zones (Rayons en mètres)
        var circles = [
            { radius: 5000, color: '#FF0000', title: '5km' }, 
            { radius: 3000, color: '#00FF00', title: '3km' }, 
            { radius: 1000, color: '#FF0000', title: '1km' }
        ];

        circles.forEach(function(c) {
            var circle = L.circle(latLng, c.radius, {
                color: c.color,
                fillColor: c.color,
                fillOpacity: 0.1,
                weight: 2,
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
                btn.text('SHARDSTORM : OFF').addClass('active');
            } else {
                btn.text('SHARDSTORM : ON').removeClass('active');
            }
        }
    };

    window.plugin.shardstorm.onPortalSelected = function() {
        var guid = window.selectedPortal;
        if (!guid) return;

        // Nettoyage de l'interface précédente
        $('#shardstorm-container').remove();

        // Création du conteneur
        var container = $('<div id="shardstorm-container"></div>');
        var btn = $('<a id="shardstorm-btn">SHARDSTORM : ON</a>');

        // Vérification de l'état
        if (window.plugin.shardstorm.activeGuid === guid) {
            btn.text('SHARDSTORM : OFF').addClass('active');
        }

        // Gestion du clic (Tactile + Souris)
        btn.on('click touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.plugin.shardstorm.toggle();
            return false;
        });

        container.append(btn);

        // Ajout à la fin du panneau de détail (Endroit sûr)
        $('#portaldetails').append(container);
    };

    var setup = function() {
        window.plugin.shardstorm.layerGroup = new L.LayerGroup();
        window.addLayer(window.plugin.shardstorm.layerGroup);

        // Styles CSS
        $('<style>').prop('type', 'text/css').html(`
            #shardstorm-container {
                width: 100%;
                text-align: center;
                margin-top: 8px;
                padding-bottom: 5px;
                clear: both;
            }
            #shardstorm-btn { 
                display: inline-block;
                min-width: 150px;
                padding: 6px 12px;
                border: 1px solid #00c2ff; /* Bleu cyan futuriste */
                color: #00c2ff;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
                background: rgba(0, 20, 30, 0.6);
                text-decoration: none;
                box-shadow: 0 0 5px rgba(0, 194, 255, 0.2);
            }
            #shardstorm-btn:hover { 
                background: rgba(0, 194, 255, 0.2); 
                box-shadow: 0 0 10px rgba(0, 194, 255, 0.5);
            }
            #shardstorm-btn.active {
                background: #500000;
                border-color: #ff0000;
                color: #ffcccc;
                box-shadow: 0 0 8px rgba(255, 0, 0, 0.4);
            }
        `).appendTo('head');

        // Hook officiel IITC
        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.onPortalSelected);
        
        console.log('[ShardStorm] Plugin activé.');
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
