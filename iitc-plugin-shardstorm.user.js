// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Anomaly
// @author         Z0mZ0m
// @version        1.25.0
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Affiche les zones tactiques + Export + Traduction (Interface Native).
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312052300';
    plugin_info.pluginId = 'shardstorm';

    // --- INIT ---
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.version = plugin_info.script && plugin_info.script.version ? plugin_info.script.version : '1.25.0';
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

    // VALEURS RÉELLES
    window.plugin.shardstorm.consts = { r1: 1000, r2: 5000, r3: 10000 };

    // --- TRADUCTIONS ---
    window.plugin.shardstorm.TRANS = {
        en: {
            btn_list: "List", btn_export: "Export", btn_config: "Config",
            btn_on: "ShardStorm: ON", btn_off: "ShardStorm: OFF",
            title_activate: "Toggle ON/OFF",
            z1: "Zone 1", z2: "Zone 1-5", z3: "Zone 5-10",
            force_chk: "👁️ Force Load",
            status_loading: "Loading portals...", status_normal: "Normal mode.",
            exp_title: "Export Menu", exp_select: "Selection & Counts",
            exp_btn_draw: "🎨 RESWUE v2 (DrawTools)", exp_btn_csv: "📄 CSV File (Excel)", exp_btn_json: "📦 Plugin Dispatch JSON",
            list_title: "Portals (Live)", list_refresh: "🔄 Refresh",
            list_no_portals: "No portals visible.<br>Enable 'Force Load' and wait.",
            list_loading: "Loading...",
            set_title: "Settings", set_lang: "Language", set_opacity: "Opacity", set_border: "Border",
            alert_activate: "Please activate ShardStorm on a portal first.",
            alert_no_sel: "Nothing selected.", alert_no_data: "No data to export.",
            alert_draw_missing: "Draw Tools plugin missing.",
            export_done: "Export done!\n{count} portals added.",
            csv_name: "Name", csv_team: "Team", csv_zone: "Zone", csv_dist: "Distance(m)",
            csv_btn_list: "📄 Export CSV"
        },
        fr: {
            btn_list: "Liste", btn_export: "Export", btn_config: "Config",
            btn_on: "ShardStorm: ON", btn_off: "ShardStorm: OFF",
            title_activate: "Activer/Désactiver",
            z1: "Zone -1", z2: "Zone 1-5", z3: "Zone 5-10",
            force_chk: "👁️ Force Load",
            status_loading: "Chargement forcé...", status_normal: "Mode normal.",
            exp_title: "Menu Export", exp_select: "Sélection & Compteurs",
            exp_btn_draw: "🎨 RESWUE v2 (DrawTools)", exp_btn_csv: "📄 Fichier CSV (Excel)", exp_btn_json: "📦 Plugin Dispatch JSON",
            list_title: "Portails (Live)", list_refresh: "🔄 Refresh",
            list_no_portals: "Aucun portail visible.<br>Activez 'Force Load' et attendez.",
            list_loading: "Chargement...",
            set_title: "Configuration", set_lang: "Langue", set_opacity: "Opacité", set_border: "Bordure",
            alert_activate: "Activez ShardStorm d'abord.",
            alert_no_sel: "Rien de sélectionné.", alert_no_data: "Rien à exporter.",
            alert_draw_missing: "Draw Tools manquant.",
            export_done: "Export terminé !\n{count} portails ajoutés.",
            csv_name: "Nom", csv_team: "Equipe", csv_zone: "Zone", csv_dist: "Distance(m)",
            csv_btn_list: "📄 Exporter CSV"
        }
    };

    // --- SETTINGS ---
    window.plugin.shardstorm.settings = { lang: 'en', opacity: 0.1, borderWeight: 1, color1: '#FF0000', color2: '#FFFFFF', color3: '#FF0000' };

    window.plugin.shardstorm.loadSettings = function() {
        try {
            var stored = localStorage.getItem('plugin-shardstorm-settings');
            if (stored) window.plugin.shardstorm.settings = $.extend({}, window.plugin.shardstorm.settings, JSON.parse(stored));
        } catch(e) {}
    };
    window.plugin.shardstorm.saveSettings = function() {
        localStorage.setItem('plugin-shardstorm-settings', JSON.stringify(window.plugin.shardstorm.settings));
    };

    window.plugin.shardstorm.t = function(key) {
        var lang = window.plugin.shardstorm.settings.lang || 'en';
        return window.plugin.shardstorm.TRANS[lang][key] || key;
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
        var t = window.plugin.shardstorm.t;

        if (active) {
            if (!window.plugin.shardstorm.originalZoomFunc) window.plugin.shardstorm.originalZoomFunc = window.getDataZoomForMapZoom;
            window.getDataZoomForMapZoom = function() { return 17; };
            $('.shardstorm-force-status').text(t('status_loading')).css('color', '#ffce00');
        } else {
            if (window.plugin.shardstorm.originalZoomFunc) window.getDataZoomForMapZoom = window.plugin.shardstorm.originalZoomFunc;
            $('.shardstorm-force-status').text(t('status_normal')).css('color', '#aaa');
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
        var c = window.plugin.shardstorm.consts;

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
        var c = window.plugin.shardstorm.consts;
        var z = { z1: [], z2: [], z3: [] };
        var cp = window.portals[guid];
        z.z1.push({ guid: guid, name: cp && cp.options.data.title || 'CENTER', team: cp ? cp.options.team : 0, lat: center.lat, lng: center.lng, dist: 0 });

        $.each(window.portals, function(g, p) {
            if (g === guid || !p.options.data.title) return;
            var ll = p.getLatLng();
            var d = center.distanceTo(ll);
            var item = { guid: g, name: p.options.data.title, team: p.options.team, lat: ll.lat, lng: ll.lng, dist: Math.round(d) };
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
        var t = window.plugin.shardstorm.t;
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
        var t = window.plugin.shardstorm.t;

        var zonesData = window.plugin.shardstorm.scanPortals();
        if (!zonesData) return;

        var csvContent = `\uFEFF${t('csv_name')},Latitude,Longitude,Guid,${t('csv_team')},${t('csv_zone')},${t('csv_dist')}\n`;
        var count = 0;

        if(z1 && zonesData.z1.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z1, t('z1')); count += zonesData.z1.length; }
        if(z2 && zonesData.z2.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z2, t('z2')); count += zonesData.z2.length; }
        if(z3 && zonesData.z3.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z3, t('z3')); count += zonesData.z3.length; }

        if(count === 0) { alert(t('alert_no_data')); return; }

        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        window.plugin.shardstorm.saveFile(csvContent, 'shardstorm_export_' + dateStr + '.csv', 'text/csv');
    };

    window.plugin.shardstorm.exportMassCSV = function() {
        $('#list-chk-z1, #list-chk-z2, #list-chk-z3').prop('checked', true);
        window.plugin.shardstorm.exportFromList();
    };

    // --- EXPORT DRAW TOOLS ---
    window.plugin.shardstorm.exportToDrawTools = function() {
        var t = window.plugin.shardstorm.t;
        if (!window.plugin.drawTools) { alert(t('alert_draw_missing')); return; }
        var z1 = $('#chk-z1').prop('checked');
        var z2 = $('#chk-z2').prop('checked');
        var z3 = $('#chk-z3').prop('checked');

        var latLng = window.plugin.shardstorm.currentLatLng;
        var s = window.plugin.shardstorm.settings;
        var c = window.plugin.shardstorm.consts;
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
        alert(t('export_done').replace('{count}', count));
    };

    window.plugin.shardstorm.exportToDispatch = function() {
        var t = window.plugin.shardstorm.t;
        var z1 = $('#chk-z1').prop('checked');
        var z2 = $('#chk-z2').prop('checked');
        var z3 = $('#chk-z3').prop('checked');
        var z = window.plugin.shardstorm.scanPortals();

        var exportData = [];
        var add = function(l, zn) { l.forEach(p => exportData.push({ title: p.name, lat: p.lat, lng: p.lng, guid: p.guid, team: (p.team===1?"RES":(p.team===2?"ENL":"NEU")), zone: zn })); };

        if(z1) add(z.z1, t('z1'));
        if(z2) add(z.z2, t('z2'));
        if(z3) add(z.z3, t('z3'));

        if(!exportData.length) { alert(t('alert_no_data')); return; }
        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        window.plugin.shardstorm.saveFile(JSON.stringify(exportData, null, 2), 'shardstorm_dispatch_' + dateStr + '.json', 'application/json');
    };

    // --- UI EXPORT MENU ---
    window.plugin.shardstorm.updateCounts = function() {
        var z = window.plugin.shardstorm.scanPortals();
        var t = window.plugin.shardstorm.t;
        if (z) {
            $('#count-z1').text(z.z1.length);
            $('#count-z2').text(z.z2.length);
            $('#count-z3').text(z.z3.length);
            $('#list-btn-z1').text(t('z1') + ' ('+z.z1.length+')');
            $('#list-btn-z2').text(t('z2') + ' ('+z.z2.length+')');
            $('#list-btn-z3').text(t('z3') + ' ('+z.z3.length+')');
        }
    };

    window.plugin.shardstorm.openExportMenu = function() {
        var t = window.plugin.shardstorm.t;
        if (!window.plugin.shardstorm.activeGuid) { alert(t('alert_activate')); return; }

        var isChecked = window.plugin.shardstorm.isForceLoading ? 'checked' : '';
        var statusColor = window.plugin.shardstorm.isForceLoading ? '#ffce00' : '#aaa';
        var statusText = window.plugin.shardstorm.isForceLoading ? t('status_loading') : t('status_normal');

        var html = `
            <div style="min-width:300px;">
                <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #444;">
                    <label style="color:#ffce00; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" class="shardstorm-chk-force" ${isChecked} onchange="window.plugin.shardstorm.toggleForceLoad()"> ${t('force_chk')}
                    </label>
                    <div class="shardstorm-force-status" style="font-size:11px; color:${statusColor}; margin-left:20px;">${statusText}</div>
                </div>
                <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #444;">
                    <p style="margin:0 0 5px 0; font-size:12px; color:#aaa; border-bottom:1px solid #444;">${t('exp_select')}</p>
                    <label style="display:block; margin-bottom:3px;"><input type="checkbox" id="chk-z1" checked> <b>${t('z1')}</b> : <span id="count-z1" style="color:#fff">0</span></label>
                    <label style="display:block; margin-bottom:3px;"><input type="checkbox" id="chk-z2" checked> <b>${t('z2')}</b> : <span id="count-z2" style="color:#fff">0</span></label>
                    <label style="display:block;"><input type="checkbox" id="chk-z3" checked> <b>${t('z3')}</b> : <span id="count-z3" style="color:#fff">0</span></label>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.exportToDrawTools(); return false;">${t('exp_btn_draw')}</a>
                    <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.exportMassCSV(); return false;">${t('exp_btn_csv')}</a>
                    <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.exportToDispatch(); return false;">${t('exp_btn_json')}</a>
                </div>
            </div>`;

        window.dialog({
            html: html, id: 'shardstorm-export-menu', title: t('exp_title') + ' v' + window.plugin.shardstorm.version,
            closeCallback: function() { if (window.plugin.shardstorm.monitorInterval) clearInterval(window.plugin.shardstorm.monitorInterval); },
            buttons: { 'Fermer': function() { $(this).dialog('close'); } }
        });
        window.plugin.shardstorm.updateCounts();
        window.plugin.shardstorm.monitorInterval = setInterval(window.plugin.shardstorm.updateCounts, 1000);
    };

    // --- UI LISTING ---
    window.plugin.shardstorm.updateListContent = function() {
        var z = window.plugin.shardstorm.scanPortals();
        if (!z) return;
        z.z1.sort((a,b)=>a.dist-b.dist); z.z2.sort((a,b)=>a.dist-b.dist); z.z3.sort((a,b)=>a.dist-b.dist);

        var t = window.plugin.shardstorm.t;
        $('#list-btn-z1').text(t('z1') + ' ('+z.z1.length+')');
        $('#list-btn-z2').text(t('z2') + ' ('+z.z2.length+')');
        $('#list-btn-z3').text(t('z3') + ' ('+z.z3.length+')');

        var activeId = window.plugin.shardstorm.activeTab;
        var listToRender = [];
        var color = '#fff';

        if (activeId === 'z1') { listToRender = z.z1; color = window.plugin.shardstorm.settings.color1; }
        else if (activeId === 'z2') { listToRender = z.z2; color = window.plugin.shardstorm.settings.color2; }
        else if (activeId === 'z3') { listToRender = z.z3; color = window.plugin.shardstorm.settings.color3; }

        var h = '<table style="width:100%; border-collapse:collapse; font-size:12px;">';
        if (listToRender.length === 0) {
            h = '<p style="text-align:center; font-style:italic; padding:20px;">' + t('list_no_portals') + '</p>';
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
        var t = window.plugin.shardstorm.t;
        if (!window.plugin.shardstorm.activeGuid) { alert(t('alert_activate')); return; }

        var isChecked = window.plugin.shardstorm.isForceLoading ? 'checked' : '';
        var statusColor = window.plugin.shardstorm.isForceLoading ? '#ffce00' : '#aaa';
        var statusText = window.plugin.shardstorm.isForceLoading ? t('status_loading') : t('status_normal');

        var html = `
            <div id="shardstorm-list-wrapper" style="min-width:320px;">
                <div style="display:flex; align-items:center; margin-bottom:10px; background:#222; padding:5px; border-radius:4px; border:1px solid #444;">
                    <label style="color:#ffce00; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" class="shardstorm-chk-force" ${isChecked} onchange="window.plugin.shardstorm.toggleForceLoad()"> ${t('force_chk')}
                    </label>
                    <div class="shardstorm-force-status" style="font-size:10px; color:${statusColor}; margin-left:15px;">${statusText}</div>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; background:#111; padding:5px; border:1px solid #333; border-radius:4px;">
                    <div style="font-size:11px;">
                        <label style="margin-right:5px;"><input type="checkbox" id="list-chk-z1" checked> Z-1</label>
                        <label style="margin-right:5px;"><input type="checkbox" id="list-chk-z2" checked> Z1-5</label>
                        <label><input type="checkbox" id="list-chk-z3" checked> Z5-10</label>
                    </div>
                    <button onclick="window.plugin.shardstorm.exportFromList()" style="padding:2px 8px; font-size:11px; cursor:pointer;">${t('csv_btn_list')}</button>
                </div>

                <div style="display:flex; justify-content:space-around; margin-bottom:5px;">
                    <button id="list-btn-z1" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z1')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:#ddd; cursor:pointer; padding:5px;">${t('z1')}</button>
                    <button id="list-btn-z2" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z2')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:#ddd; cursor:pointer; padding:5px;">${t('z2')}</button>
                    <button id="list-btn-z3" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z3')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:#ddd; cursor:pointer; padding:5px;">${t('z3')}</button>
                </div>

                <div id="shardstorm-list-container" style="max-height:350px; overflow-y:auto; min-height:100px;">
                    <p style="text-align:center; color:#aaa; margin-top:20px;">${t('list_loading')}</p>
                </div>
            </div>`;

        window.dialog({
            html: html, id: 'shardstorm-list-dialog', title: t('list_title'), width: 350,
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

    // --- CONFIG ---
    window.plugin.shardstorm.showSettings = function() {
        var s = window.plugin.shardstorm.settings;
        var t = window.plugin.shardstorm.t;

        var isEn = (s.lang === 'en') ? 'selected' : '';
        var isFr = (s.lang === 'fr') ? 'selected' : '';

        var html = '<div style="min-width:300px">';
        html += '<div style="margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;">';
        html += '<label>'+t('set_lang')+'</label>';
        html += '<select id="shardstorm-lang-select" style="width:100%; margin-top:5px; padding:5px; background:#222; color:#fff; border:1px solid #555;">';
        html += '<option value="en" '+isEn+'>🇬🇧 English</option>';
        html += '<option value="fr" '+isFr+'>🇫🇷 Français</option>';
        html += '</select></div>';

        html += '<div style="margin-bottom:10px;">';
        html += '<label>'+t('z1')+'</label> <input type="color" id="sc1" value="'+s.color1+'"> ';
        html += '<label>'+t('z2')+'</label> <input type="color" id="sc2" value="'+s.color2+'"> ';
        html += '<label>'+t('z3')+'</label> <input type="color" id="sc3" value="'+s.color3+'"></div>';
        html += '<div>'+t('set_opacity')+': <input type="range" min="0" max="1" step="0.05" id="sop" value="'+s.opacity+'"></div>';
        html += '<div>'+t('set_border')+': <input type="range" min="0" max="10" step="1" id="sbw" value="'+s.borderWeight+'"></div></div>';

        window.dialog({ html: html, title: t('set_title') + ' v' + window.plugin.shardstorm.version, buttons: { 'OK': function() { $(this).dialog('close'); } } });

        $('#shardstorm-lang-select').on('change', function() {
            s.lang = this.value;
            window.plugin.shardstorm.saveSettings();
            $(this).closest('.ui-dialog-content').dialog('close');
            setTimeout(function(){ window.plugin.shardstorm.showSettings(); }, 100);
            window.plugin.shardstorm.updateUI();
        });

        $('#sc1').on('change', function() { s.color1 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sc2').on('change', function() { s.color2 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sc3').on('change', function() { s.color3 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sop').on('input', function() { s.opacity = parseFloat(this.value); window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sbw').on('input', function() { s.borderWeight = parseInt(this.value); window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
    };

    window.plugin.shardstorm.redrawIfActive = function() { if (window.plugin.shardstorm.activeGuid) window.plugin.shardstorm.draw(); };

    window.plugin.shardstorm.updateUI = function() {
        var t = window.plugin.shardstorm.t;
        var btn = $('#shardstorm-btn');
        if (btn.length) {
            if (window.plugin.shardstorm.activeGuid) btn.text(t('btn_on')).css('color', '#ffce00');
            else btn.text(t('btn_off')).css('color', '#ffce00');
        }
        $('#shardstorm-aside a[title="List"]').text('📖 ' + t('btn_list'));
        $('#shardstorm-aside a[title="Export"]').text('🎨 ' + t('btn_export'));
        $('#shardstorm-aside a[title="Config"]').text('⚙️ ' + t('btn_config'));
    };

    // --- SIDEBAR (NATIVE STYLE 1.6.0) ---
    window.plugin.shardstorm.addToSidebar = function() {
        if (!window.selectedPortal || $('#shardstorm-aside').length) return;

        var t = window.plugin.shardstorm.t;
        var aside = $('<aside id="shardstorm-aside"></aside>');

        var createLink = function(text, fn, title, id) {
            return $('<a>').text(text).attr({href:'#', title:title, id: id}).on('click', function(e){
                e.preventDefault(); fn(); return false;
            }).css({'margin-right': '5px'});
        };

        aside.append(createLink(t('btn_off'), window.plugin.shardstorm.toggle, t('title_activate'), 'shardstorm-btn'));
        aside.append(createLink('📖 ' + t('btn_list'), window.plugin.shardstorm.listPortals, 'List'));
        aside.append(createLink('🎨 ' + t('btn_export'), window.plugin.shardstorm.openExportMenu, 'Export'));
        aside.append(createLink('⚙️ ' + t('btn_config'), window.plugin.shardstorm.showSettings, 'Config'));

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
            window.plugin.shardstorm.consts = { r1: 850, r2: 6200, r3: 9000 };
        }

        // CSS Minimal Native
        $('<style>').prop('type', 'text/css').html(`
            #shardstorm-export-menu .shardstorm-style-btn { display: block; padding: 10px; margin: 2px 0; background: rgba(8, 48, 78, 0.9); color: #ffce00 !important; border: 1px solid #20A8B1; text-align: center; font-weight: bold; cursor: pointer; text-decoration: none !important; }
            #shardstorm-export-menu .shardstorm-style-btn:hover { background: rgba(8, 48, 78, 1); border-color: #ffce00; }
            .shardstorm-tab-content table tr:hover { background-color: rgba(255,255,255,0.1); }
        `).appendTo('head');

        console.log('[ShardStorm] Plugin loaded v' + window.plugin.shardstorm.version);
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
