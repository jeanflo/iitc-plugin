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
    // Assure que le plugin est chargé dans le contexte IITC
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-zones-1-3-5';
    plugin_info.dateTimeVersion = '202310270000';
    plugin_info.pluginId = 'zones-1-3-5';

    // Initialisation de l'objet du plugin
    window.plugin.zones135 = {};

    // Stockage des layers (cercles)
    window.plugin.zones135.layerGroup = null;
    // État du bouton (actif ou non pour le portail courant)
    window.plugin.zones135.active = false;
    // GUID du portail sur lequel les zones sont affichées
    window.plugin.zones135.currentPortalGuid = null;

    // Fonction principale pour dessiner les zones
    window.plugin.zones135.drawZones = function() {
        var guid = window.selectedPortal;

        // Si aucun portail sélectionné, on arrête
        if (!guid) {
            alert("Veuillez d'abord sélectionner un portail.");
            return;
        }

        // Récupération des coordonnées du portail
        var portal = window.portals[guid];
        var latLng = portal ? portal.getLatLng() : null;

        if (!latLng) return;

        // Si on clique sur le bouton et que c'est déjà actif sur ce portail, on efface tout (Toggle OFF)
        if (window.plugin.zones135.active && window.plugin.zones135.currentPortalGuid === guid) {
            window.plugin.zones135.clearZones();
            return;
        }

        // Si on change de portail ou si c'était éteint, on efface d'abord les anciennes zones
        window.plugin.zones135.clearZones();

        // Configuration des cercles (du plus grand au plus petit pour la superposition)
        var circles = [
            { radius: 5000, color: '#FF0000', fill: true }, // Zone 3-5km (Fond Rouge)
            { radius: 3000, color: '#00FF00', fill: true }, // Zone 1-3km (Milieu Vert)
            { radius: 1000, color: '#FF0000', fill: true }  // Zone 0-1km (Centre Rouge)
        ];

        // Création des cercles
        circles.forEach(function(c) {
            var circle = L.circle(latLng, c.radius, {
                color: c.color,
                fillColor: c.color,
                fillOpacity: 0.2, // Transparence
                weight: 2,        // Épaisseur du contour
                interactive: false // Les clics traversent les cercles
            });
            window.plugin.zones135.layerGroup.addLayer(circle);
        });

        // Mise à jour de l'état
        window.plugin.zones135.active = true;
        window.plugin.zones135.currentPortalGuid = guid;
        
        // Mettre à jour le texte du bouton si nécessaire (optionnel)
        $('#zones135-btn').text('Masquer Zones');
    };

    // Fonction pour effacer les zones
    window.plugin.zones135.clearZones = function() {
        window.plugin.zones135.layerGroup.clearLayers();
        window.plugin.zones135.active = false;
        window.plugin.zones135.currentPortalGuid = null;
        $('#zones135-btn').text('Afficher Zones');
    };

    // Fonction appelée quand un portail est sélectionné
    window.plugin.zones135.onPortalSelected = function() {
        // Ajout du bouton dans la barre latérale des détails du portail
        // On vérifie si le bouton existe déjà pour ne pas le dupliquer
        if ($('#zones135-link').length === 0) {
             // On ajoute un lien dans la liste d'actions (près de "Portal link")
            $('.link-list').append('<aside><a id="zones135-btn" onclick="window.plugin.zones135.drawZones();return false;">Afficher Zones 1-3-5km</a></aside>');
        }
        
        // Si on change de portail, on peut choisir de masquer les zones de l'ancien portail automatiquement
        // Décommenter la ligne suivante si vous voulez que les zones disparaissent en changeant de portail
        // if (window.plugin.zones135.currentPortalGuid !== window.selectedPortal) window.plugin.zones135.clearZones();
    };

    var setup = function() {
        // Création du groupe de calques
        window.plugin.zones135.layerGroup = new L.LayerGroup();
        window.addLayer(window.plugin.zones135.layerGroup);

        // Hook : Quand les détails d'un portail sont affichés
        window.addHook('portalDetailsUpdated', window.plugin.zones135.onPortalSelected);
    };

    // Amorçage du plugin
    setup.info = plugin_info;
    if(!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    
    // Si IITC est déjà chargé
    if(window.iitcLoaded && typeof setup === 'function') setup();
}

// Injection du script
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
