// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Anomaly
// @author         Z0mZ0m
// @version        1.4.5
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques, liste les portails + Export JSON (Retour au style simple v1.3.0).
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312050030';
    plugin_info.pluginId = 'shardstorm';

    // Initialisation
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.layers = {
        zone1: null,
        zone2: null,
        zone3: null
    };
    window.plugin.shardstorm.donuts = [];
    window.plugin.shardstorm.activeGuid = null;
    window.plugin.shardstorm.currentLatLng = null;
    window.plugin.shardstorm.currentListData = null;

    // --- PARAMÈTRES PAR DÉFAUT ---
    window.plugin.shardstorm.settings = {
        opacity: 0.1,
        borderWeight: 1,
        color1: '#FF0000', // Rouge
        color2: '#FFFFFF', // Blanc
        color3: '#FF0000'  // Rouge
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

    // --- OUTILS GRAPHIQUES ---
    window.plugin.shardstorm.getPixelRadius = function(latLng, radiusMeters) {
        if (!window.map) return 0;
        var p1 = window.map.latLngToLayerPoint(latLng);
        var lat = latLng.lat;
        var lng = latLng.lng;
        var rLng = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
        var p2 = window.map.latLngToLayerPoint(L.latLng(lat, lng + rLng));
        return Math.abs(p2.x - p1.x);
    };

    window.plugin.shardstorm.updateDonutWidths = function() {
        if (!window.plugin.shardstorm.activeGuid || !window.plugin.shardstorm.currentLatLng) return;

        var latLng = window.plugin.shardstorm.currentLatLng;
        var donuts = window.plugin.shardstorm.donuts;

        var px1km = window.plugin.shardstorm.getPixelRadius(latLng, 1000);
        var px5km = window.plugin.shardstorm.getPixelRadius(latLng, 5000);
        var px10km = window.plugin.shardstorm.getPixelRadius(latLng, 10000);

        var overlap = 1.5;

        var width2 = (px5km - px1km) + overlap;
        if (donuts[0]) donuts[0].setStyle({ weight: width2 });

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

        L.circle(latLng, 1000, {
            stroke: false, fill: true, fillColor: s.color1, fillOpacity: s.opacity, interactive: false
        }).addTo(window.plugin.shardstorm.layers.zone1);

        var donut2 = L.circle(latLng, 3000, {
            stroke: true, color: s.color2, opacity: s.opacity, fill: false, interactive: false, className: 'no-pointer-events'
        }).addTo(window.plugin.shardstorm.layers.zone2);

        var donut3 = L.circle(latLng, 7500, {
            stroke: true, color: s.color3, opacity: s.opacity, fill: false, interactive: false
        }).addTo(window.plugin.shardstorm.layers.zone3);

        window.plugin.shardstorm.donuts = [donut2, donut3];

        var borderStyle = { fill: false, stroke: true, weight: s.borderWeight, opacity: 0.8, interactive: false };
        if (s.borderWeight > 0) {
            L.circle(latLng, 1000, $.extend({}, borderStyle, { color: s.color1 })).addTo(window.plugin.shardstorm.layers.zone1);
            L.circle(latLng, 5000, $.extend({}, borderStyle, { color: s.color2 })).addTo(window.plugin.shardstorm.layers.zone2);
            L.circle(latLng, 10000, $.extend({}, borderStyle, { color: s.color3 })).addTo(window.plugin.shardstorm.layers.zone3);
        }

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

    // --- EXPORT JSON ---
    window.plugin.shardstorm.exportJSON = function(zoneId) {
        var data = window.plugin.shardstorm.currentListData;
        if (!data || !data[zoneId] || data[zoneId].length === 0) {
            alert("Aucune donnée à exporter pour cette zone.");
            return;
        }

        var jsonContent = JSON.stringify(data[zoneId], null, 2);
        var blob = new Blob([jsonContent], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        
        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        var filename = 'shardstorm_' + zoneId + '_' + dateStr + '.json';

        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- LISTING ---
    window.plugin.shardstorm.listPortals = function() {
        var centerGuid = window.plugin.shardstorm.activeGuid;
        if (!centerGuid) {
            alert("Veuillez d'abord activer ShardStorm sur un portail.");
            return;
        }

        var centerPortal = window.portals[centerGuid];
        if (!centerPortal) return;
        var centerLatLng = centerPortal.getLatLng();

        var zones = { z1: [], z2: [], z3: [] };
        
        $.each(window.portals, function(guid, p) {
            if (!p.options.data.title) return;

            var latLng = p.getLatLng();
            var dist = centerLatLng.distanceTo(latLng);

            var item = {
                guid: guid,
                name: p.options.data.title,
                team: p.options.team,
                lat: latLng.lat,
                lng: latLng.lng,
                dist: Math.round(dist)
            };

            if (dist <= 1000) zones.z1.push(item);
            else if (dist <= 5000) zones.z2.push(item);
            else if (dist <= 10000) zones.z3.push(item);
        });

        var sorter = function(a, b) { return a.dist - b.dist; };
        zones.z1.sort(sorter);
        zones.z2.sort(sorter);
        zones.z3.sort(sorter);

        window.plugin.shardstorm.currentListData = zones;

        var html = '<div id="shardstorm-list-tabs">';
        html += '<div style="display:flex; justify-content:space-around; margin-bottom:10px; border-bottom:1px solid #444; padding-bottom:5px;">';
        html += '<button onclick="window.plugin.shardstorm.switchTab(\'z1\')" style="flex:1;">Zone 1 ('+zones.z1.length+')</button>';
        html += '<button onclick="window.plugin.shardstorm.switchTab(\'z2\')" style="flex:1;">Zone 2 ('+zones.z2.length+')</button>';
        html += '<button onclick="window.plugin.shardstorm.switchTab(\'z3\')" style="flex:1;">Zone 3 ('+zones.z3.length+')</button>';
        html += '</div>';

        var renderList = function(id, list, color) {
            var h = '<div id="shardstorm-tab-'+id+'" class="shardstorm-tab-content" style="display:none;">';
            if (list.length > 0) {
                h += '<div style="text-align:right; margin-bottom:5px; padding:4px; background:rgba(0,0,0,0.2); border-radius:4px;">';
                h += '<a href="#" onclick="window.plugin.shardstorm.exportJSON(\''+id+'\'); return false;" style="color:#fff; text-decoration:none; font-size:12px; display:inline-block;">💾 Exporter JSON</a>';
                h += '</div>';
            }
            h += '<div style="max-height:300px; overflow-y:auto;">';
            if (list.length === 0) {
                h += '<p style="text-align:center; font-style:italic;">Aucun portail chargé.</p>';
            } else {
                h += '<table style="width:100%; border-collapse:collapse; font-size:12px;">';
                h += '<tr><th style="text-align:left;">Dist.</th><th style="text-align:left;">Nom</th></tr>';
                list.forEach(function(p) {
                    var distStr = p.dist < 1000 ? p.dist+'m' : (p.dist/1000).toFixed(2)+'km';
                    var jsLink = 'window.zoomToAndShowPortal(\''+p.guid+'\', ['+p.lat+','+p.lng+']); return false;';
                    var nameStyle = 'color:'+color+';';
                    if (p.dist === 0) nameStyle += ' font-weight:bold; text-decoration:underline;';
                    h += '<tr style="border-bottom:1px solid #222;">';
                    h += '<td style="padding:4px; color:#aaa;">'+distStr+'</td>';
                    h += '<td style="padding:4px;"><a href="#" onclick="'+jsLink+'" style="'+nameStyle+'">'+p.name+'</a></td>';
                    h += '</tr>';
                });
                h += '</table>';
            }
            h += '</div></div>';
            return h;
        };

        html += renderList('z1', zones.z1, window.plugin.shardstorm.settings.color1);
        html += renderList('z2', zones.z2, window.plugin.shardstorm.settings.color2);
        html += renderList('z3', zones.z3, window.plugin.shardstorm.settings.color3);
        html += '</div>';

        window.dialog({
            html: html,
            id: 'plugin-shardstorm-list',
            title: 'Portails par Zone',
            width: 350
        });

        setTimeout(function(){ window.plugin.shardstorm.switchTab('z1'); }, 100);
    };

    window.plugin.shardstorm.switchTab = function(tabId) {
        $('.shardstorm-tab-content').hide();
        $('#shardstorm-tab-' + tabId).show();
    };

    // --- CONFIGURATION ---
    window.plugin.shardstorm.showSettings = function() {
        var s = window.plugin.shardstorm.settings;
        var html = `
            <div style="min-width:300px">
                <div style="margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;">
                    <div style="display:flex; align-items:center; margin-bottom:5px;">
                        <input type="color" id="shardstorm-color1" value="${s.color1}" style="margin-right:10px; cursor:pointer;">
                        <label>Zone 1 (0-1km)</label>
                    </div>
                    <div style="display:flex; align-items:center; margin-bottom:5px;">
                        <input type="color" id="shardstorm-color2" value="${s.color2}" style="margin-right:10px; cursor:pointer;">
                        <label>Zone 2 (1-5km)</label>
                    </div>
                    <div style="display:flex; align-items:center;">
                        <input type="color" id="shardstorm-color3" value="${s.color3}" style="margin-right:10px; cursor:pointer;">
                        <label>Zone 3 (5-10km)</label>
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
            buttons: { 'OK': function() { $(this).dialog('close'); } }
        });

        $('#shardstorm-color1').on('input change', function() { s.color1 = $(this).val(); window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#shardstorm-color2').on('input change', function() { s.color2 = $(this).val(); window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#shardstorm-color3').on('input change', function() { s.color3 = $(this).val(); window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#shardstorm-opacity-input').on('input change', function() { 
            s.opacity = parseFloat($(this).val()); 
            $('#shardstorm-opacity-val').text(Math.round(s.opacity * 100) + '%'); 
            window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); 
        });
        $('#shardstorm-weight-input').on('input change', function() { 
            s.borderWeight = parseInt($(this).val()); 
            $('#shardstorm-weight-val').text(s.borderWeight + 'px'); 
            window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); 
        });
    };

    window.plugin.shardstorm.redrawIfActive = function() {
        if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw();
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

    // --- UI SIDEBAR : RETOUR STYLE 1.3.0 ---
    window.plugin.shardstorm.addToSidebar = function() {
        if (!window.selectedPortal) return;
        var container = document.getElementById('portaldetails');
        if (!container) return;
        var linkDetails = container.querySelector('.linkdetails');
        
        if (document.getElementById('shardstorm-aside')) return;

        var aside = document.createElement('aside');
        aside.id = 'shardstorm-aside';
        
        // 1. Bouton LISTE (Livre)
        var listBtn = document.createElement('a');
        listBtn.textContent = '📖';
        listBtn.href = '#';
        listBtn.title = 'Liste des portails';
        listBtn.style.textDecoration = 'none';
        listBtn.style.marginRight = '10px';
        listBtn.onclick = function(e) { 
            e.preventDefault(); 
            window.plugin.shardstorm.listPortals(); 
            return false; 
        };

        // 2. Bouton PRINCIPAL
        var btn = document.createElement('a');
        btn.id = 'shardstorm-btn';
        btn.textContent = 'ShardStorm: Off';
        btn.href = '#';
        btn.onclick = function(e) {
            e.preventDefault();
            window.plugin.shardstorm.toggle();
            return false;
        };

        // 3. Bouton SETTINGS (Engrenage)
        var settingsBtn = document.createElement('a');
        settingsBtn.textContent = '⚙️';
        settingsBtn.href = '#';
        settingsBtn.title = 'Configuration';
        settingsBtn.style.textDecoration = 'none';
        settingsBtn.style.marginLeft = '10px';
        settingsBtn.onclick = function(e) {
            e.preventDefault();
            window.plugin.shardstorm.showSettings();
            return false;
        };

        aside.appendChild(listBtn);
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

        window.map.on('zoomend', function() { window.plugin.shardstorm.updateDonutWidths(); });
        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.addToSidebar);
        
        $('<style>').prop('type', 'text/css').html('.shardstorm-tab-content table tr:hover { background-color: rgba(255,255,255,0.1); }').appendTo('head');
        
        console.log('[ShardStorm] Plugin loaded v1.4.5 (Layout 1.3.0 + Features)');
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
