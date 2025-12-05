// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Anomaly
// @author         Z0mZ0m
// @version        1.18.0
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques + Export (Style natif IITC).
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312051500';
    plugin_info.pluginId = 'shardstorm';

    // --- INIT ---
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.layers = { zone1: null, zone2: null, zone3: null };
    window.plugin.shardstorm.donuts = [];
    window.plugin.shardstorm.activeGuid = null;
    window.plugin.shardstorm.currentLatLng = null;
    window.plugin.shardstorm.currentListData = null;
    window.plugin.shardstorm.originalZoomFunc = null;
    window.plugin.shardstorm.monitorInterval = null; 
    window.plugin.shardstorm.listInterval = null;
    window.plugin.shardstorm.isForceLoading = false;

    // --- SETTINGS ---
    window.plugin.shardstorm.settings = { opacity: 0.1, borderWeight: 1, color1: '#FF0000', color2: '#FFFFFF', color3: '#FF0000' };

    window.plugin.shardstorm.loadSettings = function() {
        try {
            var stored = localStorage.getItem('plugin-shardstorm-settings');
            if (stored) window.plugin.shardstorm.settings = $.extend({}, window.plugin.shardstorm.settings, JSON.parse(stored));
        } catch(e) {}
    };
    window.plugin.shardstorm.saveSettings = function() {
        localStorage.setItem('plugin-shardstorm-settings', JSON.stringify(window.plugin.shardstorm.settings));
    };

    // --- MATHS ---
    window.plugin.shardstorm.getCirclePoints = function(center, radiusMeters) {
        var points = [];
        var count = 360;
        var earthR = 6378137;
        var lat1 = (center.lat * Math.PI) / 180;
        var lon1 = (center.lng * Math.PI) / 180;
        var d = radiusMeters / earthR;
        for (var i = 0; i < count; i++) {
            var theta = (i / count) * (2 * Math.PI);
            var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(theta));
            var lon2 = lon1 + Math.atan2(Math.sin(theta) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
            points.push([lat2 * 180 / Math.PI, lon2 * 180 / Math.PI]);
        }
        return points;
    };

    // --- FORCE LOAD ---
    window.plugin.shardstorm.toggleForceLoad = function() {
        window.plugin.shardstorm.isForceLoading = !window.plugin.shardstorm.isForceLoading;
        var active = window.plugin.shardstorm.isForceLoading;

        if (active) {
            if (!window.plugin.shardstorm.originalZoomFunc) window.plugin.shardstorm.originalZoomFunc = window.getDataZoomForMapZoom;
            window.getDataZoomForMapZoom = function() { return 17; };
            $('.shardstorm-force-status').text("Chargement forcé...").css('color', '#ffce00');
        } else {
            if (window.plugin.shardstorm.originalZoomFunc) window.getDataZoomForMapZoom = window.plugin.shardstorm.originalZoomFunc;
            $('.shardstorm-force-status').text("Mode normal.").css('color', '#aaa');
        }
        $('.shardstorm-chk-force').prop('checked', active);
        window.mapDataRequest.start();
    };

    // --- DRAWING ---
    window.plugin.shardstorm.draw = function() {
        var guid = window.plugin.shardstorm.activeGuid;
        if (!guid) return;
        window.plugin.shardstorm.clearLayersOnly();
        
        var p = window.portals[guid];
        if (!p) return;
        var latLng = p.getLatLng();
        window.plugin.shardstorm.currentLatLng = latLng;
        var s = window.plugin.shardstorm.settings;

        var overlap = 5;
        var poly1_Outer = window.plugin.shardstorm.getCirclePoints(latLng, 1000);
        var poly2_Outer = window.plugin.shardstorm.getCirclePoints(latLng, 5000);
        var poly2_Inner = window.plugin.shardstorm.getCirclePoints(latLng, 1000 - overlap);
        var poly3_Outer = window.plugin.shardstorm.getCirclePoints(latLng, 10000);
        var poly3_Inner = window.plugin.shardstorm.getCirclePoints(latLng, 5000 - overlap);

        var commonStyle = { stroke: false, fill: true, fillOpacity: s.opacity, interactive: false };

        L.circle(latLng, 1000, $.extend({}, commonStyle, { fillColor: s.color1 })).addTo(window.plugin.shardstorm.layers.zone1);
        L.polygon([poly2_Outer, poly2_Inner], $.extend({}, commonStyle, { fillColor: s.color2 })).addTo(window.plugin.shardstorm.layers.zone2);
        L.polygon([poly3_Outer, poly3_Inner], $.extend({}, commonStyle, { fillColor: s.color3 })).addTo(window.plugin.shardstorm.layers.zone3);

        if (s.borderWeight > 0) {
            var bOpts = { fill: false, stroke: true, weight: s.borderWeight, opacity: 0.8, interactive: false };
            L.circle(latLng, 1000, $.extend({}, bOpts, { color: s.color1 })).addTo(window.plugin.shardstorm.layers.zone1);
            L.circle(latLng, 5000, $.extend({}, bOpts, { color: s.color2 })).addTo(window.plugin.shardstorm.layers.zone2);
            L.circle(latLng, 10000, $.extend({}, bOpts, { color: s.color3 })).addTo(window.plugin.shardstorm.layers.zone3);
        }
    };

    window.plugin.shardstorm.toggle = function() {
        var guid = window.selectedPortal;
        if (!guid) return;
        if (window.plugin.shardstorm.activeGuid === guid) { window.plugin.shardstorm.clear(); return; }
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

    // --- SCANNER ---
    window.plugin.shardstorm.scanPortals = function() {
        var guid = window.plugin.shardstorm.activeGuid;
        if (!guid) return null;
        var center = window.plugin.shardstorm.currentLatLng;
        var z = { z1: [], z2: [], z3: [] };
        var cp = window.portals[guid];
        z.z1.push({ guid: guid, name: cp && cp.options.data.title || 'CENTER', team: cp ? cp.options.team : 0, lat: center.lat, lng: center.lng, dist: 0 });

        $.each(window.portals, function(g, p) {
            if (g === guid || !p.options.data.title) return;
            var ll = p.getLatLng();
            var d = center.distanceTo(ll);
            var item = { guid: g, name: p.options.data.title, team: p.options.team, lat: ll.lat, lng: ll.lng, dist: Math.round(d) };
            if (d <= 1000) z.z1.push(item);
            else if (d <= 5000) z.z2.push(item);
            else if (d <= 10000) z.z3.push(item);
        });
        return z;
    };

    // --- DOWNLOAD ROBUSTE ---
    window.plugin.shardstorm.saveFile = function(content, filename, mimeType) {
        if (typeof android !== 'undefined' && android && android.saveFile) {
            android.saveFile(filename, mimeType, content);
            return;
        }
        var blob = new Blob([content], { type: mimeType });
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filename);
            return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    };

    // --- EXPORT MENU ---
    window.plugin.shardstorm.updateCounts = function() {
        var z = window.plugin.shardstorm.scanPortals();
        if (z) {
            $('#count-z1').text(z.z1.length);
            $('#count-z2').text(z.z2.length);
            $('#count-z3').text(z.z3.length);
            $('#list-btn-z1').text('Zone -1 ('+z.z1.length+')');
            $('#list-btn-z2').text('Zone 1-5 ('+z.z2.length+')');
            $('#list-btn-z3').text('Zone 5-10 ('+z.z3.length+')');
        }
    };

    window.plugin.shardstorm.openExportMenu = function() {
        if (!window.plugin.shardstorm.activeGuid) { alert('Activez ShardStorm d\'abord.'); return; }

        var isChecked = window.plugin.shardstorm.isForceLoading ? 'checked' : '';
        var statusColor = window.plugin.shardstorm.isForceLoading ? '#ffce00' : '#aaa';
        var statusText = window.plugin.shardstorm.isForceLoading ? 'Chargement forcé...' : 'Mode normal.';

        var html = `
            <div style="min-width:300px;">
                <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #444;">
                    <label style="color:#ffce00; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" class="shardstorm-chk-force" ${isChecked} onchange="window.plugin.shardstorm.toggleForceLoad()"> 👁️ Force Load
                    </label>
                    <div class="shardstorm-force-status" style="font-size:11px; color:${statusColor}; margin-left:20px;">${statusText}</div>
                </div>

                <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #444;">
                    <p style="margin:0 0 5px 0; font-size:12px; color:#aaa; border-bottom:1px solid #444;">Zones à exporter :</p>
                    <label style="display:block; margin-bottom:3px;"><input type="checkbox" id="chk-z1" checked> <b>Zone -1</b> : <span id="count-z1" style="color:#fff">0</span></label>
                    <label style="display:block; margin-bottom:3px;"><input type="checkbox" id="chk-z2" checked> <b>Zone 1-5</b> : <span id="count-z2" style="color:#fff">0</span></label>
                    <label style="display:block;"><input type="checkbox" id="chk-z3" checked> <b>Zone 5-10</b> : <span id="count-z3" style="color:#fff">0</span></label>
                </div>

                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button onclick="window.plugin.shardstorm.exportToDrawTools()">🎨 RESWUE v2 (DrawTools)</button>
                    <button onclick="window.plugin.shardstorm.exportToCSV()">📄 Fichier CSV (Excel)</button>
                    <button onclick="window.plugin.shardstorm.exportToDispatch()">📦 Plugin Dispatch JSON</button>
                </div>
            </div>`;

        window.dialog({
            html: html,
            id: 'shardstorm-export-menu',
            title: 'Menu Export ShardStorm',
            closeCallback: function() {
                if (window.plugin.shardstorm.monitorInterval) { clearInterval(window.plugin.shardstorm.monitorInterval); window.plugin.shardstorm.monitorInterval = null; }
            },
            buttons: { 'Fermer': function() { $(this).dialog('close'); } }
        });

        window.plugin.shardstorm.updateCounts();
        window.plugin.shardstorm.monitorInterval = setInterval(window.plugin.shardstorm.updateCounts, 1000);
    };

    // --- 1. EXPORT DRAWTOOLS ---
    window.plugin.shardstorm.exportToDrawTools = function() {
        if (!window.plugin.drawTools) { alert('Draw Tools manquant.'); return; }
        
        var z1 = $('#chk-z1').prop('checked');
        var z2 = $('#chk-z2').prop('checked');
        var z3 = $('#chk-z3').prop('checked');
        if (!z1 && !z2 && !z3) { alert("Rien de sélectionné."); return; }

        var latLng = window.plugin.shardstorm.currentLatLng;
        var s = window.plugin.shardstorm.settings;
        var zonesData = window.plugin.shardstorm.scanPortals();
        var count = 0;

        var makePts = function(r) { return window.plugin.shardstorm.getCirclePoints(latLng, r); }; 
        var r1 = makePts(1000); var r5 = makePts(5000); var r10 = makePts(10000);

        var addP = function(p) {
            var m = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'plugin-draw-tools-layer-marker', html: '', iconAnchor: [6,6], iconSize: [12,12] }), color: '#fff', title: p.name });
            window.plugin.drawTools.drawnItems.addLayer(m);
            count++;
        };

        if (z1) {
            window.plugin.drawTools.drawnItems.addLayer(L.polygon(r1, { color: s.color1, fillColor: s.color1, fillOpacity: s.opacity, weight: 2 }));
            zonesData.z1.forEach(addP);
        }
        if (z2) {
            window.plugin.drawTools.drawnItems.addLayer(L.polygon([r5, r1], { color: s.color2, fill: false, weight: 2 }));
            zonesData.z2.forEach(addP);
        }
        if (z3) {
            window.plugin.drawTools.drawnItems.addLayer(L.polygon([r10, r5], { color: s.color3, fill: false, weight: 2 }));
            zonesData.z3.forEach(addP);
        }

        window.plugin.drawTools.save();
        alert("Export DrawTools terminé !\n" + count + " portails ajoutés.");
    };

    // --- 2. EXPORT CSV ---
    window.plugin.shardstorm.exportToCSV = function() {
        var z1 = $('#chk-z1').prop('checked');
        var z2 = $('#chk-z2').prop('checked');
        var z3 = $('#chk-z3').prop('checked');
        var zonesData = window.plugin.shardstorm.scanPortals();
        
        var csvContent = "\uFEFFName,Latitude,Longitude,Guid,Team,Zone,Distance(m)\n";
        var count = 0;

        var addToCSV = function(list, zoneName) {
            list.forEach(function(p) {
                var teamStr = (p.team === 1 ? "RES" : (p.team === 2 ? "ENL" : "NEU"));
                var safeName = '"' + p.name.replace(/"/g, '""') + '"';
                csvContent += `${safeName},${p.lat},${p.lng},${p.guid},${teamStr},${zoneName},${p.dist}\n`;
                count++;
            });
        };

        if(z1) addToCSV(zonesData.z1, "Zone -1");
        if(z2) addToCSV(zonesData.z2, "Zone 1-5");
        if(z3) addToCSV(zonesData.z3, "Zone 5-10");

        if(count === 0) { alert("Rien à exporter."); return; }

        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        window.plugin.shardstorm.saveFile(csvContent, 'shardstorm_' + dateStr + '.csv', 'text/csv');
    };

    // --- 3. EXPORT DISPATCH ---
    window.plugin.shardstorm.exportToDispatch = function() {
        var z1 = $('#chk-z1').prop('checked');
        var z2 = $('#chk-z2').prop('checked');
        var z3 = $('#chk-z3').prop('checked');
        var zonesData = window.plugin.shardstorm.scanPortals();
        
        var exportData = [];

        var addToList = function(list, zoneName) {
            list.forEach(function(p) {
                exportData.push({
                    title: p.name,
                    lat: p.lat,
                    lng: p.lng,
                    guid: p.guid,
                    team: (p.team === 1 ? "RES" : (p.team === 2 ? "ENL" : "NEU")),
                    zone: zoneName
                });
            });
        };

        if(z1) addToList(zonesData.z1, "Zone -1");
        if(z2) addToList(zonesData.z2, "Zone 1-5");
        if(z3) addToList(zonesData.z3, "Zone 5-10");

        if(exportData.length === 0) { alert("Rien à exporter."); return; }

        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        window.plugin.shardstorm.saveFile(JSON.stringify(exportData, null, 2), 'shardstorm_dispatch_' + dateStr + '.json', 'application/json');
    };

    // --- UI LISTING ---
    window.plugin.shardstorm.refreshList = function() {
        var visibleTab = $('.shardstorm-tab-content:visible').attr('id');
        if (visibleTab) {
            var zoneId = visibleTab.replace('shardstorm-tab-', '');
            $('#shardstorm-list-dialog').dialog('close');
            window.plugin.shardstorm.listPortals();
            setTimeout(function(){ window.plugin.shardstorm.switchTab(zoneId); }, 150);
        }
    };

    window.plugin.shardstorm.listPortals = function() {
        var z = window.plugin.shardstorm.scanPortals();
        if (!z) { alert("Activez d'abord."); return; }
        z.z1.sort((a,b)=>a.dist-b.dist); z.z2.sort((a,b)=>a.dist-b.dist); z.z3.sort((a,b)=>a.dist-b.dist);

        var isChecked = window.plugin.shardstorm.isForceLoading ? 'checked' : '';
        var statusColor = window.plugin.shardstorm.isForceLoading ? '#ffce00' : '#aaa';
        var statusText = window.plugin.shardstorm.isForceLoading ? 'Chargement forcé...' : 'Mode normal.';

        var html = '<div id="shardstorm-list-tabs">';
        
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:#222; padding:5px; border-radius:4px; border:1px solid #444;">';
        html += '  <div style="flex:1;">';
        html += '    <label style="color:#ffce00; font-weight:bold; cursor:pointer;"><input type="checkbox" class="shardstorm-chk-force" '+isChecked+' onchange="window.plugin.shardstorm.toggleForceLoad()"> 👁️ Force Load</label>';
        html += '    <div class="shardstorm-force-status" style="font-size:10px; color:'+statusColor+'; margin-left:20px;">'+statusText+'</div>';
        html += '  </div>';
        html += '  <div><button onclick="window.plugin.shardstorm.refreshList()" style="padding:2px 8px; cursor:pointer;">🔄 Refresh</button></div>';
        html += '</div>';

        html += '<div style="display:flex;justify-content:space-around;padding-bottom:5px;border-bottom:1px solid #444;">';
        html += '<button id="list-btn-z1" onclick="window.plugin.shardstorm.switchTab(\'z1\')" style="flex:1">Zone -1 ('+z.z1.length+')</button>';
        html += '<button id="list-btn-z2" onclick="window.plugin.shardstorm.switchTab(\'z2\')" style="flex:1">Zone 1-5 ('+z.z2.length+')</button>';
        html += '<button id="list-btn-z3" onclick="window.plugin.shardstorm.switchTab(\'z3\')" style="flex:1">Zone 5-10 ('+z.z3.length+')</button></div>';
        
        var mkList = function(id, list, col) {
            var h = '<div id="shardstorm-tab-'+id+'" class="shardstorm-tab-content" style="display:none;">';
            if (list.length > 0) h += '<div style="text-align:right;padding:4px;background:rgba(0,0,0,0.2);"><a href="#" onclick="window.plugin.shardstorm.exportToCSV();return false;" style="color:#fff;">📄 Exporter CSV</a></div>';
            h += '<div style="max-height:300px;overflow-y:auto;"><table>';
            list.forEach(function(p) {
                h += '<tr><td style="color:#aaa;padding:2px 5px;">'+(p.dist<1000?p.dist+'m':(p.dist/1000).toFixed(1)+'km')+'</td>';
                h += '<td><a href="#" style="color:'+col+';'+(p.dist===0?'font-weight:bold':'')+'" onclick="window.zoomToAndShowPortal(\''+p.guid+'\', ['+p.lat+','+p.lng+']);return false;">'+p.name+'</a></td></tr>';
            });
            return h + '</table></div></div>';
        };
        html += mkList('z1', z.z1, window.plugin.shardstorm.settings.color1);
        html += mkList('z2', z.z2, window.plugin.shardstorm.settings.color2);
        html += mkList('z3', z.z3, window.plugin.shardstorm.settings.color3);
        
        window.dialog({
            html: html, id: 'shardstorm-list-dialog', title: 'Portails par Zone', width: 350,
            closeCallback: function() { if (window.plugin.shardstorm.listInterval) clearInterval(window.plugin.shardstorm.listInterval); }
        });
        window.plugin.shardstorm.listInterval = setInterval(window.plugin.shardstorm.updateCounts, 1000);
        setTimeout(function(){ window.plugin.shardstorm.switchTab('z1'); }, 100);
    };
    
    window.plugin.shardstorm.switchTab = function(id) { $('.shardstorm-tab-content').hide(); $('#shardstorm-tab-'+id).show(); };

    window.plugin.shardstorm.showSettings = function() {
        var s = window.plugin.shardstorm.settings;
        var html = '<div style="min-width:300px"><div style="margin-bottom:10px;">';
        html += '<label>Zone -1</label> <input type="color" id="sc1" value="'+s.color1+'"> ';
        html += '<label>Zone 1-5</label> <input type="color" id="sc2" value="'+s.color2+'"> ';
        html += '<label>Zone 5-10</label> <input type="color" id="sc3" value="'+s.color3+'"></div>';
        html += '<div>Opacité: <input type="range" min="0" max="1" step="0.05" id="sop" value="'+s.opacity+'"></div>';
        html += '<div>Bordure: <input type="range" min="0" max="10" step="1" id="sbw" value="'+s.borderWeight+'"></div></div>';
        window.dialog({ html: html, title: 'Options', buttons: { 'OK': function() { $(this).dialog('close'); } } });
        
        $('#sc1').on('change', function() { s.color1 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sc2').on('change', function() { s.color2 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sc3').on('change', function() { s.color3 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sop').on('input', function() { s.opacity = parseFloat(this.value); window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sbw').on('input', function() { s.borderWeight = parseInt(this.value); window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
    };

    window.plugin.shardstorm.redrawIfActive = function() { if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw(); };

    window.plugin.shardstorm.updateUI = function() {
        var btn = $('#shardstorm-btn');
        if (btn.length) {
            if (window.plugin.shardstorm.activeGuid) {
                btn.text('ShardStorm: ON').css('color', '#ffce00');
            } else {
                btn.text('ShardStorm: Off').css('color', '#ffce00');
            }
        }
    };

    // --- SIDEBAR UI (STYLE STANDARD IITC) ---
    window.plugin.shardstorm.addToSidebar = function() {
        if (!window.selectedPortal || $('#shardstorm-aside').length) return;
        
        // On utilise la structure native d'IITC <aside><a>...</a></aside>
        // Cela garantit l'alignement standard avec les autres plugins.
        var aside = $('<aside id="shardstorm-aside"></aside>');
        
        var createLink = function(text, fn, title) {
            return $('<a>').text(text).attr({href:'#', title:title}).on('click', function(e){
                e.preventDefault(); fn(); return false;
            }).css({'margin-right': '5px'}); // Petit espacement natif
        };

        // On affiche les liens en ligne, simples
        var btnToggle = createLink('ShardStorm: Off', window.plugin.shardstorm.toggle, 'Activer/Désactiver');
        btnToggle.attr('id', 'shardstorm-btn');
        
        var btnList = createLink('📖 Liste', window.plugin.shardstorm.listPortals, 'Liste des portails');
        var btnExport = createLink('🎨 Export', window.plugin.shardstorm.openExportMenu, 'Menu Export');
        var btnConfig = createLink('⚙️ Config', window.plugin.shardstorm.showSettings, 'Configuration');

        aside.append(btnToggle).append(btnList).append(btnExport).append(btnConfig);

        $('.linkdetails').append(aside);
        window.plugin.shardstorm.updateUI();
    };

    var setup = function() {
        window.plugin.shardstorm.loadSettings();
        window.plugin.shardstorm.layers.zone1 = new L.LayerGroup();
        window.plugin.shardstorm.layers.zone2 = new L.LayerGroup();
        window.plugin.shardstorm.layers.zone3 = new L.LayerGroup();
        window.addLayerGroup('Zone -1', window.plugin.shardstorm.layers.zone1, true);
        window.addLayerGroup('Zone 1-5', window.plugin.shardstorm.layers.zone2, true);
        window.addLayerGroup('Zone 5-10', window.plugin.shardstorm.layers.zone3, true);
        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.addToSidebar);
        
        // CSS Minimal pour la liste (hover)
        $('<style>').prop('type', 'text/css').html(`
            .shardstorm-tab-content table tr:hover { background-color: rgba(255,255,255,0.1); }
        `).appendTo('head');
        
        console.log('[ShardStorm] Plugin loaded v1.18.0 (Native Style)');
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
