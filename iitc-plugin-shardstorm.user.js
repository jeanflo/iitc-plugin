// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Anomaly
// @author         Z0mZ0m
// @version        1.21.0
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques + Export (Secure Faction Check).
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312051900';
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
    window.plugin.shardstorm.activeTab = 'z1';

    // VALEURS RÉELLES PAR DÉFAUT
    window.plugin.shardstorm.consts = { r1: 1000, r2: 5000, r3: 10000 };

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
        var c = window.plugin.shardstorm.consts; // Utilise les constantes (vraies ou fausses)

        var overlap = 5;
        var poly1_Outer = window.plugin.shardstorm.getCirclePoints(latLng, c.r1);
        var poly2_Outer = window.plugin.shardstorm.getCirclePoints(latLng, c.r2);
        var poly2_Inner = window.plugin.shardstorm.getCirclePoints(latLng, c.r1 - overlap);
        var poly3_Outer = window.plugin.shardstorm.getCirclePoints(latLng, c.r3);
        var poly3_Inner = window.plugin.shardstorm.getCirclePoints(latLng, c.r2 - overlap);

        var commonStyle = { stroke: false, fill: true, fillOpacity: s.opacity, interactive: false };

        L.circle(latLng, c.r1, $.extend({}, commonStyle, { fillColor: s.color1 })).addTo(window.plugin.shardstorm.layers.zone1);
        L.polygon([poly2_Outer, poly2_Inner], $.extend({}, commonStyle, { fillColor: s.color2 })).addTo(window.plugin.shardstorm.layers.zone2);
        L.polygon([poly3_Outer, poly3_Inner], $.extend({}, commonStyle, { fillColor: s.color3 })).addTo(window.plugin.shardstorm.layers.zone3);

        if (s.borderWeight > 0) {
            var bOpts = { fill: false, stroke: true, weight: s.borderWeight, opacity: 0.8, interactive: false };
            L.circle(latLng, c.r1, $.extend({}, bOpts, { color: s.color1 })).addTo(window.plugin.shardstorm.layers.zone1);
            L.circle(latLng, c.r2, $.extend({}, bOpts, { color: s.color2 })).addTo(window.plugin.shardstorm.layers.zone2);
            L.circle(latLng, c.r3, $.extend({}, bOpts, { color: s.color3 })).addTo(window.plugin.shardstorm.layers.zone3);
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
        var c = window.plugin.shardstorm.consts; // Utilise les constantes (vraies ou fausses)
        var z = { z1: [], z2: [], z3: [] };
        var cp = window.portals[guid];

        // Ajout du centre
        z.z1.push({ guid: guid, name: cp && cp.options.data.title || 'CENTER', team: cp ? cp.options.team : 0, lat: center.lat, lng: center.lng, dist: 0 });

        $.each(window.portals, function(g, p) {
            if (g === guid || !p.options.data.title) return;
            var ll = p.getLatLng();
            var d = center.distanceTo(ll);
            var item = { guid: g, name: p.options.data.title, team: p.options.team, lat: ll.lat, lng: ll.lng, dist: Math.round(d) };

            // Utilisation des seuils dynamiques
            if (d <= c.r1) z.z1.push(item);
            else if (d <= c.r2) z.z2.push(item);
            else if (d <= c.r3) z.z3.push(item);
        });
        return z;
    };

    // --- DOWNLOAD ---
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

    // --- CSV GENERATOR ---
    window.plugin.shardstorm.generateCSV = function(list, zoneName) {
        var csvContent = "";
        list.forEach(function(p) {
            var teamStr = (p.team === 1 ? "RES" : (p.team === 2 ? "ENL" : "NEU"));
            var safeName = '"' + p.name.replace(/"/g, '""') + '"';
            csvContent += `${safeName},${p.lat},${p.lng},${p.guid},${teamStr},${zoneName},${p.dist}\n`;
        });
        return csvContent;
    };

    window.plugin.shardstorm.exportFromList = function() {
        var z1 = $('#list-chk-z1').prop('checked');
        var z2 = $('#list-chk-z2').prop('checked');
        var z3 = $('#list-chk-z3').prop('checked');

        var zonesData = window.plugin.shardstorm.scanPortals();
        if (!zonesData) return;

        var csvContent = "\uFEFFName,Latitude,Longitude,Guid,Team,Zone,Distance(m)\n";
        var count = 0;

        if(z1 && zonesData.z1.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z1, "Zone -1"); count += zonesData.z1.length; }
        if(z2 && zonesData.z2.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z2, "Zone 1-5"); count += zonesData.z2.length; }
        if(z3 && zonesData.z3.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z3, "Zone 5-10"); count += zonesData.z3.length; }

        if(count === 0) { alert("Rien à exporter."); return; }

        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        window.plugin.shardstorm.saveFile(csvContent, 'shardstorm_export_' + dateStr + '.csv', 'text/csv');
    };

    // --- EXPORT MENU GENERIC ---
    window.plugin.shardstorm.exportMassCSV = function() {
        $('#list-chk-z1, #list-chk-z2, #list-chk-z3').prop('checked', true);
        window.plugin.shardstorm.exportFromList();
    };

    // --- EXPORT DRAW TOOLS ---
    window.plugin.shardstorm.exportToDrawTools = function() {
        if (!window.plugin.drawTools) { alert('Draw Tools manquant.'); return; }
        var z1 = $('#chk-z1').prop('checked');
        var z2 = $('#chk-z2').prop('checked');
        var z3 = $('#chk-z3').prop('checked');

        var latLng = window.plugin.shardstorm.currentLatLng;
        var s = window.plugin.shardstorm.settings;
        var c = window.plugin.shardstorm.consts; // Constantes dynamiques
        var zonesData = window.plugin.shardstorm.scanPortals();
        var count = 0;

        var makePts = function(r) { return window.plugin.shardstorm.getCirclePoints(latLng, r); };
        var r1 = makePts(c.r1); var r5 = makePts(c.r2); var r10 = makePts(c.r3);

        var addP = function(p) {
            var m = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'plugin-draw-tools-layer-marker', html: '', iconAnchor: [6,6], iconSize: [12,12] }), color: '#fff', title: p.name });
            window.plugin.drawTools.drawnItems.addLayer(m);
            count++;
        };

        if (z1) { window.plugin.drawTools.drawnItems.addLayer(L.polygon(r1, { color: s.color1, fillColor: s.color1, fillOpacity: s.opacity, weight: 2 })); zonesData.z1.forEach(addP); }
        if (z2) { window.plugin.drawTools.drawnItems.addLayer(L.polygon([r5, r1], { color: s.color2, fill: false, weight: 2 })); zonesData.z2.forEach(addP); }
        if (z3) { window.plugin.drawTools.drawnItems.addLayer(L.polygon([r10, r5], { color: s.color3, fill: false, weight: 2 })); zonesData.z3.forEach(addP); }

        window.plugin.drawTools.save();
        alert("Export DrawTools terminé !\n" + count + " portails ajoutés.");
    };

    window.plugin.shardstorm.exportToDispatch = function() {
        var z = window.plugin.shardstorm.scanPortals();
        var exportData = [];
        var add = function(l, zn) { l.forEach(p => exportData.push({ title: p.name, lat: p.lat, lng: p.lng, guid: p.guid, team: (p.team===1?"RES":(p.team===2?"ENL":"NEU")), zone: zn })); };
        add(z.z1, "Zone -1"); add(z.z2, "Zone 1-5"); add(z.z3, "Zone 5-10");
        if(!exportData.length) { alert("Rien à exporter."); return; }
        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        window.plugin.shardstorm.saveFile(JSON.stringify(exportData, null, 2), 'shardstorm_dispatch_' + dateStr + '.json', 'application/json');
    };

    // --- UI LISTING ---
    window.plugin.shardstorm.updateListContent = function() {
        var z = window.plugin.shardstorm.scanPortals();
        if (!z) return;
        z.z1.sort((a,b)=>a.dist-b.dist); z.z2.sort((a,b)=>a.dist-b.dist); z.z3.sort((a,b)=>a.dist-b.dist);

        $('#list-btn-z1').text('Zone -1 ('+z.z1.length+')');
        $('#list-btn-z2').text('Zone 1-5 ('+z.z2.length+')');
        $('#list-btn-z3').text('Zone 5-10 ('+z.z3.length+')');

        var activeId = window.plugin.shardstorm.activeTab;
        var listToRender = [];
        var color = '#fff';

        if (activeId === 'z1') { listToRender = z.z1; color = window.plugin.shardstorm.settings.color1; }
        else if (activeId === 'z2') { listToRender = z.z2; color = window.plugin.shardstorm.settings.color2; }
        else if (activeId === 'z3') { listToRender = z.z3; color = window.plugin.shardstorm.settings.color3; }

        var h = '<table style="width:100%; border-collapse:collapse; font-size:12px;">';
        if (listToRender.length === 0) {
            h = '<p style="text-align:center; font-style:italic; padding:20px;">Aucun portail visible.<br>Activez "Force Load" et attendez.</p>';
        } else {
            listToRender.forEach(function(p) {
                h += '<tr style="border-bottom:1px solid #222;">';
                h += '<td style="padding:4px; color:#aaa; width:60px;">'+(p.dist<1000?p.dist+'m':(p.dist/1000).toFixed(1)+'km')+'</td>';
                h += '<td style="padding:4px;"><a href="#" onclick="window.zoomToAndShowPortal(\''+p.guid+'\', ['+p.lat+','+p.lng+']);return false;" style="color:'+color+';'+(p.dist===0?'font-weight:bold':'')+'">'+p.name+'</a></td>';
                h += '</tr>';
            });
            h += '</table>';
        }
        $('#shardstorm-list-container').html(h);
    };

    window.plugin.shardstorm.switchTab = function(id) {
        window.plugin.shardstorm.activeTab = id;
        $('.shardstorm-tab-btn').css('border-bottom', '1px solid #444').css('background', '');
        $('#list-btn-' + id).css('border-bottom', '2px solid #ffce00').css('background', '#222');
        window.plugin.shardstorm.updateListContent();
    };

    window.plugin.shardstorm.listPortals = function() {
        if (!window.plugin.shardstorm.activeGuid) { alert("Activez d'abord."); return; }

        var isChecked = window.plugin.shardstorm.isForceLoading ? 'checked' : '';
        var statusColor = window.plugin.shardstorm.isForceLoading ? '#ffce00' : '#aaa';
        var statusText = window.plugin.shardstorm.isForceLoading ? 'Chargement forcé...' : 'Mode normal.';

        var html = `
            <div id="shardstorm-list-wrapper" style="min-width:320px;">
                <div style="display:flex; align-items:center; margin-bottom:10px; background:#222; padding:5px; border-radius:4px; border:1px solid #444;">
                    <label style="color:#ffce00; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" class="shardstorm-chk-force" ${isChecked} onchange="window.plugin.shardstorm.toggleForceLoad()"> 👁️ Force Load
                    </label>
                    <div class="shardstorm-force-status" style="font-size:10px; color:${statusColor}; margin-left:15px;">${statusText}</div>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; background:#111; padding:5px; border:1px solid #333; border-radius:4px;">
                    <div style="font-size:11px;">
                        <label style="margin-right:5px;"><input type="checkbox" id="list-chk-z1" checked> Z-1</label>
                        <label style="margin-right:5px;"><input type="checkbox" id="list-chk-z2" checked> Z1-5</label>
                        <label><input type="checkbox" id="list-chk-z3" checked> Z5-10</label>
                    </div>
                    <button onclick="window.plugin.shardstorm.exportFromList()" style="padding:2px 8px; font-size:11px; cursor:pointer;">📄 CSV</button>
                </div>

                <div style="display:flex; justify-content:space-around; margin-bottom:5px;">
                    <button id="list-btn-z1" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z1')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:#ddd; cursor:pointer; padding:5px;">Zone -1</button>
                    <button id="list-btn-z2" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z2')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:#ddd; cursor:pointer; padding:5px;">Zone 1-5</button>
                    <button id="list-btn-z3" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z3')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:#ddd; cursor:pointer; padding:5px;">Zone 5-10</button>
                </div>

                <div id="shardstorm-list-container" style="max-height:350px; overflow-y:auto; min-height:100px;">
                    <p style="text-align:center; color:#aaa; margin-top:20px;">Chargement...</p>
                </div>
            </div>`;

        window.dialog({
            html: html, id: 'shardstorm-list-dialog', title: 'Portails (Live)', width: 350,
            closeCallback: function() {
                if (window.plugin.shardstorm.listInterval) {
                    clearInterval(window.plugin.shardstorm.listInterval);
                    window.plugin.shardstorm.listInterval = null;
                }
            }
        });

        window.plugin.shardstorm.switchTab('z1');

        window.plugin.shardstorm.listInterval = setInterval(function() {
            window.plugin.shardstorm.updateListContent();
        }, 2000);
    };

    // --- UI EXPORT GLOBAL ---
    window.plugin.shardstorm.updateCounts = function() {
        var z = window.plugin.shardstorm.scanPortals();
        if (z) {
            $('#count-z1').text(z.z1.length);
            $('#count-z2').text(z.z2.length);
            $('#count-z3').text(z.z3.length);
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
                    <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.exportToDrawTools(); return false;">🎨 RESWUE v2 (DrawTools)</a>
                    <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.exportMassCSV(); return false;">📄 Fichier CSV (Excel)</a>
                    <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.exportToDispatch(); return false;">📦 Plugin Dispatch JSON</a>
                </div>
            </div>`;

        window.dialog({
            html: html, id: 'shardstorm-export-menu', title: 'Menu Export ShardStorm',
            closeCallback: function() { if (window.plugin.shardstorm.monitorInterval) clearInterval(window.plugin.shardstorm.monitorInterval); },
            buttons: { 'Fermer': function() { $(this).dialog('close'); } }
        });
        window.plugin.shardstorm.updateCounts();
        window.plugin.shardstorm.monitorInterval = setInterval(window.plugin.shardstorm.updateCounts, 1000);
    };

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
            if (window.plugin.shardstorm.activeGuid) { btn.text('ShardStorm: ON').css('color', '#ffce00'); }
            else { btn.text('ShardStorm: Off').css('color', '#ffce00'); }
        }
    };

    // --- SIDEBAR UI ---
    window.plugin.shardstorm.addToSidebar = function() {
        if (!window.selectedPortal || $('#shardstorm-aside').length) return;
        var aside = $('<aside id="shardstorm-aside"></aside>');
        var createLink = function(text, fn, title) {
            return $('<a>').text(text).attr({href:'#', title:title}).on('click', function(e){ e.preventDefault(); fn(); return false; }).css({'margin-right': '5px'});
        };
        aside.append(createLink('ShardStorm: Off', window.plugin.shardstorm.toggle, 'Activer').attr('id', 'shardstorm-btn'));
        aside.append(createLink('📖 Liste', window.plugin.shardstorm.listPortals, 'Liste'));
        aside.append(createLink('🎨 Export', window.plugin.shardstorm.openExportMenu, 'Export'));
        aside.append(createLink('⚙️ Config', window.plugin.shardstorm.showSettings, 'Config'));
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

        // CHECK FACTION
        if (window.PLAYER && window.PLAYER.team === 'ENLIGHTENED') {
            // MODE FAKE (Discret)
            window.plugin.shardstorm.consts = { r1: 850, r2: 6200, r3: 9000 };
        }

        $('<style>').prop('type', 'text/css').html(`
            #shardstorm-export-menu .shardstorm-style-btn { display: block; padding: 10px; margin: 2px 0; background: rgba(8, 48, 78, 0.9); color: #ffce00 !important; border: 1px solid #20A8B1; text-align: center; font-weight: bold; cursor: pointer; text-decoration: none !important; }
            #shardstorm-export-menu .shardstorm-style-btn:hover { background: rgba(8, 48, 78, 1); border-color: #ffce00; }
            .shardstorm-tab-content table tr:hover { background-color: rgba(255,255,255,0.1); }
        `).appendTo('head');

        console.log('[ShardStorm] Plugin loaded v1.21.0 (Secure)');
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
