// ==UserScript==
// @id             iitc-plugin-zones-1-3-5
// @name           IITC plugin: Zones 1-3-5km
// @category       Layer
// @version        1.0.0
// @namespace      https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-zones-1-3-5
// @updateURL      https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-zones-1-3-5.meta.js
// @downloadURL    https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-zones-1-3-5.user.js
// @description    Affiche 3 zones concentriques (0-1km rouge, 1-3km vert, 3-5km rouge) autour du portail sélectionné.
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-zones-1-3-5';
    plugin_info.dateTimeVersion = '202310270002';
    plugin_info.pluginId = 'zones-1-3-5';

    window.plugin.zones135 = {};
    window.plugin.zones135.layerGroup = null;
    window.plugin.zones135.activeGuid = null; // Stocke le GUID du portail actif

    // --- 1. FONCTION DE DESSIN ---
    window.plugin.zones135.toggleZones = function() {
        var guid = window.selectedPortal;
        
        // Si les zones sont déjà affichées pour CE portail, on les efface (Toggle OFF)
        if (window.plugin.zones135.activeGuid === guid) {
            window.plugin.zones135.clearZones();
            return;
        }

        // Sinon, on efface tout et on redessine (Toggle ON ou Changement de portail)
        window.plugin.zones135.clearZones();

        if (!guid) return;
        var portal = window.portals[guid];
        var latLng = portal ? portal.getLatLng() : null;
        if (!latLng) return;

        // Configuration des cercles (du plus grand au plus petit)
        var circles = [
            { radius: 5000, color: '#FF0000' }, // 3-5km (Fond Rouge)
            { radius: 3000, color: '#00FF00' }, // 1-3km (Milieu Vert)
            { radius: 1000, color: '#FF0000' }  // 0-1km (Centre Rouge)
        ];

        circles.forEach(function(c) {
            var circle = L.circle(latLng, c.radius, {
                color: c.color,
                fillColor: c.color,
                fillOpacity: 0.15,
                weight: 2,
                interactive: false // Les clics traversent les zones
            });
            window.plugin.zones135.layerGroup.addLayer(circle);
        });

        window.plugin.zones135.activeGuid = guid;
        window.plugin.zones135.updateButtonState(true);
    };

    window.plugin.zones135.clearZones = function() {
        window.plugin.zones135.layerGroup.clearLayers();
        window.plugin.zones135.activeGuid = null;
        window.plugin.zones135.updateButtonState(false);
    };

    // --- 2. GESTION DU BOUTON (Inspiré de Intel Helper) ---
    window.plugin.zones135.updateButtonState = function(isActive) {
        var btn = $('#zones135-btn');
        if (btn.length) {
            if (isActive) {
                btn.text('MASQUER ZONES').addClass('active');
            } else {
                btn.text('ZONES 1-3-5 KM').removeClass('active');
            }
        }
    };

    window.plugin.zones135.onPortalSelected = function() {
        // Nettoyage de l'ancien bouton s'il existe (pour éviter les doublons)
        $('.zones135-container').remove();

        var guid = window.selectedPortal;
        if (!guid) return;

        // Création du conteneur et du bouton
        var container = $('<div class="zones135-container"></div>');
        var btn = $('<a id="zones135-btn">ZONES 1-3-5 KM</a>');

        // Vérifier si ce portail a déjà les zones actives
        if (window.plugin.zones135.activeGuid === guid) {
            btn.text('MASQUER ZONES').addClass('active');
        }

        // --- FIX MOBILE IMPORTANT ---
        // Utilisation de 'touchstart' ET 'click' avec stopPropagation
        // C'est la méthode utilisée dans Intel Helper Enhanced pour garantir le fonctionnement mobile
        btn.on('click touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Empêche IITC de fermer le panneau ou de cliquer sur la carte
            window.plugin.zones135.toggleZones();
            return false;
        });

        container.append(btn);

        // Insertion dans l'interface
        // On cherche '.link-list' (présent sur mobile et desktop)
        var linkList = $('.link-list');
        if (linkList.length > 0) {
            // On l'ajoute juste après les liens (Intel/GMap)
            linkList.after(container); 
        } else {
            $('#portaldetails').append(container);
        }
    };

    var setup = function() {
        // Création du LayerGroup
        window.plugin.zones135.layerGroup = new L.LayerGroup();
        window.addLayer(window.plugin.zones135.layerGroup);

        // Injection CSS (Inspiré de Intel Helper)
        $('<style>').prop('type', 'text/css').html(`
            .zones135-container { 
                text-align: center; 
                margin: 8px 0; 
                padding: 0 5px;
            }
            #zones135-btn { 
                display: block; 
                background: rgba(8, 48, 78, 0.9); 
                border: 1px solid #20A8B1; 
                color: #ffce00; 
                padding: 8px; 
                cursor: pointer; 
                font-weight: bold; 
                text-align: center;
                text-decoration: none;
                user-select: none; /* Empêche la sélection de texte sur mobile */
            }
            #zones135-btn:hover { 
                background: rgba(8, 48, 78, 1); 
                border-color: #ffce00; 
            }
            #zones135-btn.active {
                background: #400000; /* Fond rouge sombre quand actif */
                color: #ff8888;
                border-color: #ff0000;
            }
        `).appendTo('head');

        // Hook quand on clique sur un portail
        window.addHook('portalDetailsUpdated', window.plugin.zones135.onPortalSelected);
        
        console.log('[Zones 1-3-5] Plugin chargé.');
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
