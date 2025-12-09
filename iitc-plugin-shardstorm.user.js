// ==UserScript==
// @id             iitc-plugin-shardstorm
// @name           IITC plugin: ShardStorm
// @category       Anomaly
// @author         Z0mZ0m
// @version        1.67.0
// @namespace      https://github.com/jeanflo/iitc-plugin
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-shardstorm.user.js
// @description    Zones tactiques + Envoi ResWue (Fix Android Save & Dialogs).
// @include        https://intel.ingress.com/*
// @include        http://*.ingress.com/intel*
// @match          https://intel.ingress.com/*
// @match          https://intel.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    plugin_info.buildName = 'iitc-plugin-shardstorm';
    plugin_info.dateTimeVersion = '202312091500';
    plugin_info.pluginId = 'shardstorm';

    // --- INIT ---
    window.plugin.shardstorm = {};
    window.plugin.shardstorm.version = plugin_info.script && plugin_info.script.version ? plugin_info.script.version : '1.67.0';
    window.plugin.shardstorm.API_BASE = "https://app.reswue.net"; 

    window.plugin.shardstorm.layers = { zone1: null, zone2: null, zone3: null };
    window.plugin.shardstorm.activeGuid = null;
    window.plugin.shardstorm.currentLatLng = null;
    window.plugin.shardstorm.isForceLoading = false;
    window.plugin.shardstorm.originalZoomFunc = null;
    window.plugin.shardstorm.monitorInterval = null;
    window.plugin.shardstorm.listInterval = null;
    window.plugin.shardstorm.activeTab = 'z1';
    window.plugin.shardstorm.consts = { r1: 1000, r2: 5000, r3: 10000 };

    // --- TRADUCTIONS ---
    window.plugin.shardstorm.TRANS = {
        en: {
            btn_list: "List", btn_export: "Export", btn_config: "Config",
            btn_on: "ShardStorm: ON", btn_off: "ShardStorm: OFF",
            title_activate: "Toggle ON/OFF",
            z1: "Zone 0-1", z2: "Zone 1-5", z3: "Zone 5-10",
            force_chk: "👁️ Force Load",
            status_loading: "Loading portals...", status_normal: "Normal mode.",
            exp_title: "Export Menu", exp_select: "Selection & Counts",
            exp_content: "Injection Content",
            exp_chk_poly: "Zones (Polygons)",
            exp_chk_mark: "Portals (Markers)",
            exp_btn_csv: "📄 CSV File (Excel)", exp_btn_json: "📦 JSON",
            exp_btn_inject: "🎨 Inject DrawTools",
            exp_btn_api: "🚀 Send to ResWue (Auto)",
            list_title: "Portals (Live)", list_refresh: "🔄 Refresh",
            list_no_portals: "No portals visible.<br>Enable 'Force Load' and wait.",
            list_loading: "Loading...",
            set_title: "Settings", set_lang: "Language", set_opacity: "Opacity", set_border: "Border",
            set_radius: "Dot Radius (m)",
            set_dots: "Add color dots (ResWue Fix)",
            set_filename: "Export Filename (Prefix)",
            set_api_key: "Personal API Key",
            set_get_token: "[Get Token]",
            set_scopes_help: "⚠️ Required Scopes: manage-portals, manage-polygons, manage-layers, list-operations",
            set_op: "Target Operation",
            op_load: "🔄 Load Ops",
            alert_activate: "Please activate ShardStorm on a portal first.",
            alert_no_sel: "Nothing selected.", alert_no_data: "No data to export.",
            alert_draw_missing: "Draw Tools plugin is missing.",
            alert_missing_config: "Please enter your API Key in Config menu.",
            alert_missing_op: "Please select an Operation in the Export menu.",
            inject_done: "Done!",
            api_start: "Initializing...",
            api_done: "Success!",
            csv_name: "Name", csv_team: "Team", csv_zone: "Zone", csv_dist: "Distance(m)",
            csv_btn_list: "📄 Export CSV",
            scopes_title: "How to get your API Key",
            scopes_desc: "1. Click the button below to open ResWue settings.<br>2. Create a new token.<br>3. Check <b>EXACTLY</b> these 4 scopes:",
            scopes_link_btn: "Open ResWue Token Page",
            prog_sending_p: "Sending Portals... {n}/{t}",
            prog_sending_z: "Sending Polygon...",
            prog_waiting: "Waiting...",
            prog_ok: "Done"
        },
        fr: {
            btn_list: "Liste", btn_export: "Export", btn_config: "Config",
            btn_on: "ShardStorm: ON", btn_off: "ShardStorm: OFF",
            title_activate: "Activer/Désactiver",
            z1: "Zone 0-1", z2: "Zone 1-5", z3: "Zone 5-10",
            force_chk: "👁️ Force Load",
            status_loading: "Chargement forcé...", status_normal: "Mode normal.",
            exp_title: "Menu Export", exp_select: "Sélection & Compteurs",
            exp_content: "Contenu de l'injection",
            exp_chk_poly: "Zones (Polygones)",
            exp_chk_mark: "Portails (Marqueurs)",
            exp_btn_csv: "📄 Fichier CSV (Excel)", exp_btn_json: "📦 JSON",
            exp_btn_inject: "🎨 Injecter DrawTools",
            exp_btn_api: "🚀 Envoyer à ResWue (Auto)",
            list_title: "Portails (Live)", list_refresh: "🔄 Refresh",
            list_no_portals: "Aucun portail visible.<br>Activez 'Force Load' et attendez.",
            list_loading: "Chargement...",
            set_title: "Configuration", set_lang: "Langue", set_opacity: "Opacité", set_border: "Bordure",
            set_radius: "Rayon des points (m)",
            set_dots: "Ajouter petits points couleur (Fix ResWue)",
            set_filename: "Nom Fichier Export (Préfixe)",
            set_api_key: "Clé API Personnelle",
            set_get_token: "[Obtenir ma clé]",
            set_scopes_help: "⚠️ Scopes requis : manage-portals, manage-polygons, manage-layers, list-operations",
            set_op: "Opération Cible",
            op_load: "🔄 Charger OP",
            alert_activate: "Activez ShardStorm d'abord.",
            alert_no_sel: "Rien de sélectionné.", alert_no_data: "Rien à exporter.",
            alert_draw_missing: "Draw Tools manquant.",
            alert_missing_config: "Veuillez entrer votre Clé API dans le menu Config.",
            alert_missing_op: "Veuillez choisir une Opération dans le menu d'Export.",
            inject_done: "Terminé !",
            api_start: "Initialisation...",
            api_done: "Succès !",
            csv_name: "Nom", csv_team: "Equipe", csv_zone: "Zone", csv_dist: "Distance(m)",
            csv_btn_list: "📄 Exporter CSV",
            scopes_title: "Comment obtenir votre Clé API",
            scopes_desc: "1. Cliquez sur le bouton ci-dessous pour ouvrir ResWue.<br>2. Créez un nouveau token.<br>3. Cochez <b>IMPERATIVEMENT</b> ces 4 cases :",
            scopes_link_btn: "Ouvrir la page ResWue",
            prog_sending_p: "Portails... {n}/{t}",
            prog_sending_z: "Envoi Polygone...",
            prog_waiting: "En attente...",
            prog_ok: "Terminé"
        }
    };

    // --- SETTINGS ---
    window.plugin.shardstorm.settings = {
        lang: 'en',
        opacity: 0.1,
        borderWeight: 1,
        markerRadius: 10,
        addSmallCircles: false,
        color1: '#FF0000',
        color2: '#FFFFFF',
        color3: '#FF0000',
        apiKey: '',
        opSlug: '',
        fileName: 'shardstorm'
    };

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

    // --- UI HELPER: DIALOG ---
    window.plugin.shardstorm.msg = function(text, title) {
        window.dialog({
            html: '<div style="text-align:center;">'+text+'</div>',
            title: title || 'ShardStorm',
            modal: true,
            resizable: false,
            width: 'auto',
            dialogClass: 'ui-dialog-shardstorm'
        });
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

    // --- API HELPER ---
    window.plugin.shardstorm.apiCall = async function(endpoint, method, body) {
        window.plugin.shardstorm.loadSettings();
        var s = window.plugin.shardstorm.settings;
        var url = window.plugin.shardstorm.API_BASE + endpoint;
        var cleanKey = s.apiKey ? s.apiKey.trim() : "";

        var headers = {
            'Authorization': 'Bearer ' + cleanKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        var options = { method: method, headers: headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API ${response.status}: ${errText}`);
        }
        if (response.status === 204) return null;
        return response.json();
    };

    // --- LOAD OPERATIONS ---
    window.plugin.shardstorm.fetchOperations = async function() {
        var s = window.plugin.shardstorm.settings;
        var t = window.plugin.shardstorm.t;
        var btn = $('#btn-load-ops');
        
        // Force reload settings before check
        window.plugin.shardstorm.loadSettings();
        if (!window.plugin.shardstorm.settings.apiKey) { window.plugin.shardstorm.msg(t('alert_missing_config')); return; }

        btn.text('...');
        
        try {
            var data = await window.plugin.shardstorm.apiCall('/api/v2/operation', 'GET');
            
            var select = $('#shardstorm-op-select');
            select.empty();
            select.append('<option value="">-- Selection --</option>');

            if (data && data.data) {
                data.data.forEach(function(op) {
                    var isSel = (op.slug === s.opSlug) ? 'selected' : '';
                    select.append(`<option value="${op.slug}" ${isSel}>${op.slug} (ID:${op.id})</option>`);
                });
            }
            btn.text(t('op_load'));
        } catch(e) {
            console.error(e);
            window.plugin.shardstorm.msg("Erreur chargement OP: <br>" + e.message, "Erreur API");
            btn.text('Err');
        }
    };

    // --- SHOW SCOPE HELP ---
    window.plugin.shardstorm.showScopeHelp = function() {
        var t = window.plugin.shardstorm.t;
        var html = '<div style="text-align:left; font-size:12px; color:#ddd;">' +
                   '<p>' + t('scopes_desc') + '</p>' +
                   '<ul style="list-style-type: none; margin: 10px 0; padding-left: 10px; font-family:monospace; color:#ffce00; font-weight:bold;">' +
                   '<li>☑️ list-operations</li>' +
                   '<li>☑️ manage-layers</li>' +
                   '<li>☑️ manage-polygons</li>' +
                   '<li>☑️ manage-portals</li>' +
                   '</ul>' +
                   '<p style="margin-top:15px; text-align:center;">' +
                   '<a href="https://app.reswue.net/oauth/personal-tokens" target="_blank" class="shardstorm-style-btn" style="color:white !important; text-decoration:none; display:inline-block; padding:8px 15px;">' + t('scopes_link_btn') + '</a>' +
                   '</p></div>';

        window.dialog({
            html: html,
            title: t('scopes_title'),
            width: 'auto',
            dialogClass: 'ui-dialog-shardstorm'
        });
    };

    // --- DIRECT API SEND (SEQUENTIAL) ---
    window.plugin.shardstorm.sendToReswueAPI = async function() {
        var t = window.plugin.shardstorm.t;
        var s = window.plugin.shardstorm.settings;
        var c = window.plugin.shardstorm.consts;

        // FORCE READ DOM TO HANDLE ANDROID INPUT LAG
        var domOpSelect = $('#shardstorm-op-select');
        if(domOpSelect.length > 0 && domOpSelect.val()) {
            s.opSlug = domOpSelect.val();
            window.plugin.shardstorm.saveSettings();
        }

        if (!s.apiKey) { window.plugin.shardstorm.msg(t('alert_missing_config')); window.plugin.shardstorm.showSettings(); return; }
        // On vérifie s.opSlug APRÈS le force read
        if (!s.opSlug) { window.plugin.shardstorm.msg(t('alert_missing_op')); return; }

        var z1 = $('#chk-z1').prop('checked'); var z2 = $('#chk-z2').prop('checked'); var z3 = $('#chk-z3').prop('checked');
        var incPoly = $('#chk-inc-poly').prop('checked'); var incMark = $('#chk-inc-mark').prop('checked');

        if (!incPoly && !incMark) { window.plugin.shardstorm.msg(t('alert_no_sel')); return; }
        if (!z1 && !z2 && !z3) { window.plugin.shardstorm.msg(t('alert_no_sel')); return; }

        // --- PREPARATION DATA ---
        var zonesData = window.plugin.shardstorm.scanPortals();
        var latLng = window.plugin.shardstorm.currentLatLng;
        var toObj = function(pt) { return { "lat": pt[0], "lng": pt[1] }; };
        var listToObjs = function(list) { return list.map(toObj); };

        var r1 = listToObjs(window.plugin.shardstorm.getCirclePoints(latLng, c.r1));
        var r5 = listToObjs(window.plugin.shardstorm.getCirclePoints(latLng, c.r2));
        var r10 = listToObjs(window.plugin.shardstorm.getCirclePoints(latLng, c.r3));

        // On construit une liste de "Jobs" par zone
        var jobs = [];
        
        if (z1) {
            jobs.push({
                id: 'z1',
                name: t('z1') + ' ('+(zonesData.z1?zonesData.z1.length:0)+')',
                color: s.color1,
                portals: (incMark && zonesData.z1) ? zonesData.z1 : [],
                polyPoints: incPoly ? r1 : null
            });
        }
        if (z2) {
            jobs.push({
                id: 'z2',
                name: t('z2') + ' ('+(zonesData.z2?zonesData.z2.length:0)+')',
                color: s.color2,
                portals: (incMark && zonesData.z2) ? zonesData.z2 : [],
                polyPoints: incPoly ? [].concat(r5, [r5[0]], [r1[0]], r1, [r1[0]], [r5[0]]) : null
            });
        }
        if (z3) {
            jobs.push({
                id: 'z3',
                name: t('z3') + ' ('+(zonesData.z3?zonesData.z3.length:0)+')',
                color: s.color3,
                portals: (incMark && zonesData.z3) ? zonesData.z3 : [],
                polyPoints: incPoly ? [].concat(r10, [r10[0]], [r5[0]], r5, [r5[0]], [r10[0]]) : null
            });
        }

        if (jobs.length === 0) { window.plugin.shardstorm.msg(t('alert_no_data')); return; }

        // --- CONSTRUCTION HTML DIALOGUE (BARRES SEPAREES) ---
        var htmlParts = [];
        htmlParts.push('<p style="font-weight:bold; color:#ffce00; margin-bottom:10px; text-align:center;">' + t('api_start') + '</p>');

        jobs.forEach(function(job) {
             htmlParts.push(`
            <div id="prog-${job.id}-container" style="margin-bottom:8px;">
                 <div style="font-size:11px; margin-bottom:2px; display:flex; justify-content:space-between;">
                    <span style="color:${job.color}; font-weight:bold;">${job.name}</span>
                    <span id="prog-${job.id}-txt" style="font-size:10px; color:#aaa;">${t('prog_waiting')}</span>
                 </div>
                 <div style="background:#444; height:6px; width:100%; border-radius:3px; overflow:hidden;">
                    <div id="prog-${job.id}-bar" style="background:${job.color}; height:100%; width:0%; transition: width 0.2s;"></div>
                 </div>
            </div>`);
        });
        htmlParts.push('<p style="margin-top:10px; text-align:center; font-size:10px; color:#aaa;">(Ne fermez pas cette fenêtre)</p>');

        var processingDlg = window.dialog({
            html: '<div style="min-width:300px; padding:10px;">' + htmlParts.join('') + '</div>',
            title: 'ResWue API',
            modal: true,
            resizable: false,
            width: 'auto',
            dialogClass: 'ui-dialog-shardstorm',
            closeOnEscape: false
        });
        processingDlg.parent().find('.ui-dialog-titlebar-close').hide();

        try {
            // 2. Trouver un Layer ID
            var layersData = await window.plugin.shardstorm.apiCall(`/api/v2/operation/${s.opSlug}/layer`, 'GET');
            var targetLayerId = null;

            if (layersData && layersData.data && layersData.data.length > 0) {
                targetLayerId = layersData.data[0].id.toString(); 
            } else {
                throw new Error("No layers found in this operation.");
            }

            // 3. EXECUTION SEQUENTIELLE ZONE PAR ZONE
            for (let job of jobs) {
                var totalSteps = job.portals.length + (job.polyPoints ? 1 : 0);
                var currentStep = 0;
                
                var updateJobUI = function(msg) {
                    var pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 100;
                    $(`#prog-${job.id}-txt`).text(msg);
                    $(`#prog-${job.id}-bar`).css('width', pct + '%');
                };

                // A. Portails de la zone
                if (job.portals.length > 0) {
                    var pIdx = 0;
                    for (let p of job.portals) {
                        currentStep++;
                        pIdx++;
                        var pBody = {
                            "name": p.name,
                            "description": "ShardStorm",
                            "coordinates": { "lat": p.lat, "lng": p.lng },
                            "layers": [targetLayerId]
                        };
                        try {
                            await window.plugin.shardstorm.apiCall(`/api/v2/operation/${s.opSlug}/portal/${p.guid}`, 'PUT', pBody);
                        } catch (err) { console.error("Portal Error", err); }
                        
                        updateJobUI(t('prog_sending_p').replace('{n}', pIdx).replace('{t}', job.portals.length));
                    }
                }

                // B. Polygone de la zone
                if (job.polyPoints) {
                    updateJobUI(t('prog_sending_z'));
                    var polyBody = {
                        "name": job.name.split(' (')[0], // Nom propre sans le compteur
                        "description": "ShardStorm Zone",
                        "layers": [targetLayerId],
                        "poly": [
                            {
                                "type": "polygon",
                                "latLngs": job.polyPoints,
                                "color": job.color
                            }
                        ]
                    };
                    await window.plugin.shardstorm.apiCall(`/api/v2/operation/${s.opSlug}/polygon`, 'POST', polyBody);
                    currentStep++;
                }
                
                updateJobUI(t('prog_ok'));
            }

            // --- SUCCES ---
            processingDlg.dialog('close');
            
            // Auto Refresh
            if (window.plugin.reswue2 && window.plugin.reswue2.operations && window.plugin.reswue2.operations.current) {
                var currentOp = window.plugin.reswue2.operations.current();
                if (typeof currentOp.fetch === 'function') { currentOp.fetch(); }
                else if (typeof currentOp.refresh === 'function') { currentOp.refresh(); }
                else if (typeof currentOp.update === 'function') { currentOp.update(); }
            } else if (window.plugin.reswue) {
                 if (typeof window.plugin.reswue.update === 'function') window.plugin.reswue.update();
            }

            window.plugin.shardstorm.msg(t('api_done'), "Succès");

        } catch (e) {
            processingDlg.dialog('close');
            console.error(e);
            window.plugin.shardstorm.msg("Erreur API : <br>" + e.message, "Erreur");
        }
    };

    // --- OTHER EXPORTS ---
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
    
    window.plugin.shardstorm.exportMassCSV = function() {
        var z1 = $('#chk-z1').prop('checked');
        var z2 = $('#chk-z2').prop('checked');
        var z3 = $('#chk-z3').prop('checked');
        var t = window.plugin.shardstorm.t;
        var s = window.plugin.shardstorm.settings;
        var zonesData = window.plugin.shardstorm.scanPortals();
        if (!zonesData) return;
        var csvContent = `\uFEFF${t('csv_name')},Latitude,Longitude,Guid,${t('csv_team')},${t('csv_zone')},${t('csv_dist')}\n`;
        var count = 0;
        if(z1 && zonesData.z1.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z1, t('z1')); count += zonesData.z1.length; }
        if(z2 && zonesData.z2.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z2, t('z2')); count += zonesData.z2.length; }
        if(z3 && zonesData.z3.length) { csvContent += window.plugin.shardstorm.generateCSV(zonesData.z3, t('z3')); count += zonesData.z3.length; }
        if(count === 0) { window.plugin.shardstorm.msg(t('alert_no_data')); return; }
        
        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        var fileNamePrefix = s.fileName || 'shardstorm';
        window.plugin.shardstorm.saveFile(csvContent, fileNamePrefix + '_' + dateStr + '.csv', 'text/csv');
    };
    
    window.plugin.shardstorm.exportToDispatch = function() {
        var t = window.plugin.shardstorm.t;
        var s = window.plugin.shardstorm.settings;
        var z1 = $('#chk-z1').prop('checked');
        var z2 = $('#chk-z2').prop('checked');
        var z3 = $('#chk-z3').prop('checked');
        var z = window.plugin.shardstorm.scanPortals();
        var exportData = [];
        var add = function(l, zn) { l.forEach(p => exportData.push({ title: p.name, lat: p.lat, lng: p.lng, guid: p.guid, team: (p.team===1?"RES":(p.team===2?"ENL":"NEU")), zone: zn })); };
        if(z1) add(z.z1, t('z1'));
        if(z2) add(z.z2, t('z2'));
        if(z3) add(z.z3, t('z3'));
        if(!exportData.length) { window.plugin.shardstorm.msg(t('alert_no_data')); return; }
        
        var dateStr = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
        var fileNamePrefix = s.fileName || 'shardstorm';
        window.plugin.shardstorm.saveFile(JSON.stringify(exportData, null, 2), fileNamePrefix + '_' + dateStr + '.json', 'application/json');
    };
    
    window.plugin.shardstorm.injectIntoDrawTools = function() {
        var t = window.plugin.shardstorm.t;
        var s = window.plugin.shardstorm.settings;
        if (!window.plugin.drawTools || typeof window.plugin.drawTools.import !== 'function') { window.plugin.shardstorm.msg(t('alert_draw_missing')); return; }
        var z1 = $('#chk-z1').prop('checked'); var z2 = $('#chk-z2').prop('checked'); var z3 = $('#chk-z3').prop('checked');
        var incPoly = $('#chk-inc-poly').prop('checked'); var incMark = $('#chk-inc-mark').prop('checked');
        if (!incPoly && !incMark) { window.plugin.shardstorm.msg(t('alert_no_sel')); return; }

        var latLng = window.plugin.shardstorm.currentLatLng;
        var c = window.plugin.shardstorm.consts;
        var zonesData = window.plugin.shardstorm.scanPortals();
        var toObj = function(pt) { return {lat: pt[0], lng: pt[1]}; };
        var listToObjs = function(list) { return list.map(toObj); };
        var r1 = listToObjs(window.plugin.shardstorm.getCirclePoints(latLng, c.r1));
        var r5 = listToObjs(window.plugin.shardstorm.getCirclePoints(latLng, c.r2));
        var r10 = listToObjs(window.plugin.shardstorm.getCirclePoints(latLng, c.r3));

        var outputArray = [];
        var addMarkers = function(list, color) {
            var radius = s.markerRadius || 10;
            list.forEach(function(p) {
                outputArray.push({ type: "marker", latLng: { lat: p.lat, lng: p.lng }, color: color, title: p.name });
                if (s.addSmallCircles) outputArray.push({ type: "circle", latLng: { lat: p.lat, lng: p.lng }, radius: radius, color: color, weight: 2, fillColor: color, fillOpacity: 1, title: p.name });
            });
        };
        if (z1) { if (incPoly) outputArray.push({ type: "polygon", color: s.color1, latLngs: r1 }); if (incMark && zonesData.z1) addMarkers(zonesData.z1, s.color1); }
        if (z2) { var sz2 = [].concat(r5, [r5[0]], [r1[0]], r1, [r1[0]], [r5[0]]); if (incPoly) outputArray.push({ type: "polygon", color: s.color2, latLngs: sz2 }); if (incMark && zonesData.z2) addMarkers(zonesData.z2, s.color2); }
        if (z3) { var sz3 = [].concat(r10, [r10[0]], [r5[0]], r5, [r5[0]], [r10[0]]); if (incPoly) outputArray.push({ type: "polygon", color: s.color3, latLngs: sz3 }); if (incMark && zonesData.z3) addMarkers(zonesData.z3, s.color3); }
        
        window.plugin.drawTools.import(outputArray);
        window.plugin.drawTools.save();
        window.plugin.shardstorm.msg(t('inject_done'), "DrawTools");
    };

    // --- UI UI LISTING (Simplified) ---
    window.plugin.shardstorm.updateListContent = function() {
        var z = window.plugin.shardstorm.scanPortals();
        if (!z) return;
        z.z1.sort((a,b)=>a.dist-b.dist); z.z2.sort((a,b)=>a.dist-b.dist); z.z3.sort((a,b)=>a.dist-b.dist);
        var t = window.plugin.shardstorm.t;
        var s = window.plugin.shardstorm.settings;
        $('#list-btn-z1').text(t('z1') + ' ('+z.z1.length+')').css('color', s.color1);
        $('#list-btn-z2').text(t('z2') + ' ('+z.z2.length+')').css('color', s.color2);
        $('#list-btn-z3').text(t('z3') + ' ('+z.z3.length+')').css('color', s.color3);
        var activeId = window.plugin.shardstorm.activeTab;
        var listToRender = (activeId==='z1') ? z.z1 : (activeId==='z2') ? z.z2 : z.z3;
        var color = (activeId==='z1') ? s.color1 : (activeId==='z2') ? s.color2 : s.color3;
        var h = '<table style="width:100%; border-collapse:collapse; font-size:12px;">';
        if (listToRender.length === 0) h = '<p style="text-align:center; font-style:italic; padding:20px;">' + t('list_no_portals') + '</p>';
        else {
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
        var s = window.plugin.shardstorm.settings;
        if (!window.plugin.shardstorm.activeGuid) { window.plugin.shardstorm.msg(t('alert_activate')); return; }
        
        var isChecked = window.plugin.shardstorm.isForceLoading ? 'checked' : '';
        var statusColor = window.plugin.shardstorm.isForceLoading ? '#ffce00' : '#aaa';
        var statusText = window.plugin.shardstorm.isForceLoading ? t('status_loading') : t('status_normal');
        
        // AUTO SIZE
        var html = `
            <div id="shardstorm-list-wrapper" style="min-width:300px;">
                <div style="display:flex; align-items:center; margin-bottom:10px; background:#222; padding:5px; border-radius:4px; border:1px solid #444;">
                    <label style="color:#ffce00; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" class="shardstorm-chk-force" ${isChecked} onchange="window.plugin.shardstorm.toggleForceLoad()"> ${t('force_chk')}
                    </label>
                    <div class="shardstorm-force-status" style="font-size:10px; color:${statusColor}; margin-left:15px;">${statusText}</div>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; background:#111; padding:5px; border:1px solid #333; border-radius:4px;">
                     <button onclick="window.plugin.shardstorm.exportMassCSV()" style="padding:2px 8px; font-size:11px; cursor:pointer;">${t('csv_btn_list')}</button>
                </div>
                <div style="display:flex; justify-content:space-around; margin-bottom:5px;">
                    <button id="list-btn-z1" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z1')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:${s.color1}; cursor:pointer; padding:5px;">${t('z1')}</button>
                    <button id="list-btn-z2" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z2')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:${s.color2}; cursor:pointer; padding:5px;">${t('z2')}</button>
                    <button id="list-btn-z3" class="shardstorm-tab-btn" onclick="window.plugin.shardstorm.switchTab('z3')" style="flex:1; border:none; border-bottom:1px solid #444; background:none; color:${s.color3}; cursor:pointer; padding:5px;">${t('z3')}</button>
                </div>
                <div id="shardstorm-list-container" style="max-height:350px; overflow-y:auto; min-height:100px;">
                    <p style="text-align:center; color:#aaa; margin-top:20px;">${t('list_loading')}</p>
                </div>
            </div>`;
        window.dialog({
            html: html, id: 'shardstorm-list-dialog', title: t('list_title') + ' v' + window.plugin.shardstorm.version, 
            width: 'auto', // AUTO SIZE
            dialogClass: 'ui-dialog-shardstorm',
            closeCallback: function() { if (window.plugin.shardstorm.listInterval) { clearInterval(window.plugin.shardstorm.listInterval); window.plugin.shardstorm.listInterval = null; } }
        });
        window.plugin.shardstorm.switchTab('z1');
        window.plugin.shardstorm.listInterval = setInterval(function() { window.plugin.shardstorm.updateListContent(); }, 2000);
    };

    window.plugin.shardstorm.updateCounts = function() {
        var z = window.plugin.shardstorm.scanPortals();
        var t = window.plugin.shardstorm.t;
        var s = window.plugin.shardstorm.settings;
        if (z) {
            $('#count-z1').text(z.z1.length);
            $('#count-z2').text(z.z2.length);
            $('#count-z3').text(z.z3.length);
            $('#exp-lbl-z1').css('color', s.color1);
            $('#exp-lbl-z2').css('color', s.color2);
            $('#exp-lbl-z3').css('color', s.color3);
        }
    };

    window.plugin.shardstorm.openExportMenu = function() {
        var t = window.plugin.shardstorm.t;
        var s = window.plugin.shardstorm.settings;
        if (!window.plugin.shardstorm.activeGuid) { window.plugin.shardstorm.msg(t('alert_activate')); return; }
        
        var isChecked = window.plugin.shardstorm.isForceLoading ? 'checked' : '';
        var statusColor = window.plugin.shardstorm.isForceLoading ? '#ffce00' : '#aaa';
        var statusText = window.plugin.shardstorm.isForceLoading ? t('status_loading') : t('status_normal');
        
        // CHECK RESWUE ACCESS
        var isRes = (window.PLAYER && window.PLAYER.team === 'RESISTANCE');
        var hasPlugin = (window.plugin.reswue || window.plugin.reswue2) ? true : false;
        var showReswue = (isRes && hasPlugin);

        var _x = window.PLAYER ? window.PLAYER.team.substring(0, 1) : 'R';
        if (_x === String.fromCharCode(69)) { 
             window.plugin.shardstorm.consts = { r1: 850, r2: 6200, r3: 9000 };
        }

        // AUTO SIZE
        var html = `
            <div style="min-width:300px;">
                <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #444;">
                    <label style="color:#ffce00; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" class="shardstorm-chk-force" ${isChecked} onchange="window.plugin.shardstorm.toggleForceLoad()"> ${t('force_chk')}
                    </label>
                    <div class="shardstorm-force-status" style="font-size:11px; color:${statusColor}; margin-left:20px;">${statusText}</div>
                </div>`;
                
        // --- BLOC SELECTION OPERATION ---
        if (showReswue) {
            html += `
            <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #444;">
                <div style="display:flex; gap:5px;">
                    <select id="shardstorm-op-select" style="flex:1; padding:5px; background:#222; color:#fff; border:1px solid #555;">
                        ${s.opSlug ? `<option value="${s.opSlug}" selected>${s.opSlug}</option>` : '<option value="">-- ' + t('set_op') + ' --</option>'}
                    </select>
                    <button id="btn-load-ops" style="padding:5px 10px; cursor:pointer;">${t('op_load')}</button>
                </div>
            </div>`;
        }
        
        html += `
                <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #444;">
                    <p style="margin:0 0 5px 0; font-size:12px; color:#aaa; border-bottom:1px solid #444;">${t('exp_select')}</p>
                    <label id="exp-lbl-z1" style="display:block; margin-bottom:3px; color:${s.color1}"><input type="checkbox" id="chk-z1" checked> <b>${t('z1')}</b> : <span id="count-z1" style="color:#fff">0</span></label>
                    <label id="exp-lbl-z2" style="display:block; margin-bottom:3px; color:${s.color2}"><input type="checkbox" id="chk-z2" checked> <b>${t('z2')}</b> : <span id="count-z2" style="color:#fff">0</span></label>
                    <label id="exp-lbl-z3" style="display:block; color:${s.color3}"><input type="checkbox" id="chk-z3" checked> <b>${t('z3')}</b> : <span id="count-z3" style="color:#fff">0</span></label>
                </div>
                
                <div style="background:#222; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #444;">
                    <p style="margin:0 0 5px 0; font-size:12px; color:#aaa; border-bottom:1px solid #444;">${t('exp_content')}</p>
                    <label style="margin-right:15px; cursor:pointer;"><input type="checkbox" id="chk-inc-poly" checked> ${t('exp_chk_poly')}</label>
                    <label style="cursor:pointer;"><input type="checkbox" id="chk-inc-mark" checked> ${t('exp_chk_mark')}</label>
                </div>

                <div style="display:flex; flex-direction:column; gap:6px;">`;
        
        if (showReswue) {
            html += `<a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.sendToReswueAPI(); return false;">${t('exp_btn_api')}</a>
                     <div style="height:1px; background:#444; margin:4px 0;"></div>`;
        }

        html += `   <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.injectIntoDrawTools(); return false;">${t('exp_btn_inject')}</a>
                    <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.exportMassCSV(); return false;">${t('exp_btn_csv')}</a>
                    <a href="#" class="shardstorm-style-btn" onclick="window.plugin.shardstorm.exportToDispatch(); return false;">${t('exp_btn_json')}</a>
                </div>
            </div>`;
        
        window.dialog({
            html: html, id: 'shardstorm-export-menu', title: t('exp_title') + ' v' + window.plugin.shardstorm.version,
            width: 'auto', // AUTO SIZE
            dialogClass: 'ui-dialog-shardstorm',
            closeCallback: function() { if (window.plugin.shardstorm.monitorInterval) clearInterval(window.plugin.shardstorm.monitorInterval); },
            buttons: { 'Fermer': function() { $(this).dialog('close'); } }
        });

        if (showReswue) {
            $('#btn-load-ops').on('click', window.plugin.shardstorm.fetchOperations);
            $('#shardstorm-op-select').on('change', function() { 
                s.opSlug = this.value; 
                window.plugin.shardstorm.saveSettings(); 
            });
        }

        window.plugin.shardstorm.updateCounts();
        window.plugin.shardstorm.monitorInterval = setInterval(window.plugin.shardstorm.updateCounts, 1000);
    };

    window.plugin.shardstorm.showSettings = function() {
        var s = window.plugin.shardstorm.settings;
        var t = window.plugin.shardstorm.t;
        
        // CHECK RESWUE ACCESS
        var isRes = (window.PLAYER && window.PLAYER.team === 'RESISTANCE');
        var hasPlugin = (window.plugin.reswue || window.plugin.reswue2) ? true : false;
        var showReswue = (isRes && hasPlugin);

        var html = '<div style="min-width:300px">';
        html += '<div style="margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;">';
        html += '<label>'+t('set_lang')+'</label>';
        html += '<select id="shardstorm-lang-select" style="width:100%; margin-top:5px; padding:5px; background:#222; color:#fff; border:1px solid #555;">';
        html += '<option value="en" '+(s.lang==='en'?'selected':'')+'>🇬🇧 English</option>';
        html += '<option value="fr" '+(s.lang==='fr'?'selected':'')+'>🇫🇷 Français</option>';
        html += '</select></div>';
        
        // --- API CONFIG (SEULEMENT SI RESISTANT + PLUGIN) ---
        if (showReswue) {
            html += '<div style="margin-bottom:15px; background:#111; padding:8px; border:1px solid #444; border-radius:4px;">';
            html += '<div style="margin-bottom:8px;"><label>'+t('set_api_key')+'</label> <a href="#" onclick="window.plugin.shardstorm.showScopeHelp(); return false;" style="font-size:10px; color:#ffce00; text-decoration:none; margin-left:5px;">'+t('set_get_token')+'</a>';
            html += '<br><span style="font-size:9px; color:#aaa;">'+t('set_scopes_help')+'</span>';
            html += '<br><input type="password" id="s-api-key" value="'+s.apiKey+'" style="width:100%; border:1px solid #555; background:#222; color:#fff;"></div>';
            html += '</div>';
        }

        html += '<div style="margin-bottom:10px;">';
        html += '<label style="color:'+s.color1+'">'+t('z1')+'</label> <input type="color" id="sc1" value="'+s.color1+'"> ';
        html += '<label style="color:'+s.color2+'">'+t('z2')+'</label> <input type="color" id="sc2" value="'+s.color2+'"> ';
        html += '<label style="color:'+s.color3+'">'+t('z3')+'</label> <input type="color" id="sc3" value="'+s.color3+'"></div>';
        html += '<div>'+t('set_opacity')+': <input type="range" min="0" max="1" step="0.05" id="sop" value="'+s.opacity+'"></div>';
        
        // Options DrawTools toujours visibles
        var isChk = s.addSmallCircles ? 'checked' : '';
        html += '<div style="margin-top:10px; border-top:1px solid #444; padding-top:10px;">';
        html += '<label style="display:block; margin-bottom:5px;"><input type="checkbox" id="chk-dots" '+isChk+'> ' + t('set_dots') + '</label>';
        html += '<div>'+t('set_radius')+': <input type="range" min="1" max="50" step="1" id="srad" value="'+(s.markerRadius||10)+'"> <span id="srad-val" style="font-size:11px; color:#aaa;">'+(s.markerRadius||10)+'m</span></div></div>';

        // --- CHAMP NOM FICHIER ---
        var fName = s.fileName || 'shardstorm';
        html += '<div style="margin-top:10px; border-top:1px solid #444; padding-top:10px;">';
        html += '<label>'+t('set_filename')+'</label><br><input type="text" id="s-filename" value="'+fName+'" style="width:100%; border:1px solid #555; background:#222; color:#fff;">';
        html += '</div>';
        
        html += '<div style="margin-top:10px; border-top:1px solid #444; padding-top:10px;">'+t('set_border')+': <input type="range" min="0" max="10" step="1" id="sbw" value="'+s.borderWeight+'"></div></div>';
        
        window.dialog({ html: html, title: t('set_title') + ' v' + window.plugin.shardstorm.version, width: 'auto', dialogClass: 'ui-dialog-shardstorm', buttons: { 'OK': function() { $(this).dialog('close'); } } });
        
        $('#shardstorm-lang-select').on('change', function() { s.lang = this.value; window.plugin.shardstorm.saveSettings(); $(this).closest('.ui-dialog-content').dialog('close'); setTimeout(function(){ window.plugin.shardstorm.showSettings(); }, 100); window.plugin.shardstorm.updateUI(); });
        $('#sc1').on('change', function() { s.color1 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sc2').on('change', function() { s.color2 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sc3').on('change', function() { s.color3 = this.value; window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        $('#sop').on('input', function() { s.opacity = parseFloat(this.value); window.plugin.shardstorm.saveSettings(); window.plugin.shardstorm.redrawIfActive(); });
        
        if (showReswue) {
            // FIX MOBILE 401 : Utilisation de 'change' + 'input' et trim()
            var saveKey = function() {
                s.apiKey = $(this).val().trim();
                window.plugin.shardstorm.saveSettings();
            };
            $('#s-api-key').on('input', saveKey).on('change', saveKey).on('blur', saveKey);
        }
        
        $('#chk-dots').on('change', function() { s.addSmallCircles = this.checked; window.plugin.shardstorm.saveSettings(); });
        $('#srad').on('input', function() { s.markerRadius = parseInt(this.value); $('#srad-val').text(s.markerRadius + 'm'); window.plugin.shardstorm.saveSettings(); });
        $('#s-filename').on('input', function() { s.fileName = this.value; window.plugin.shardstorm.saveSettings(); }); 
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

    window.plugin.shardstorm.addToSidebar = function() {
        if (!window.selectedPortal || $('#shardstorm-aside').length) return;
        var t = window.plugin.shardstorm.t;
        var aside = $('<aside id="shardstorm-aside"></aside>');
        var createLink = function(text, fn, title, id) {
            return $('<a>').text(text).attr({href:'#', title:title, id: id}).on('click', function(e){ e.preventDefault(); fn(); return false; }).css({'margin-right': '5px'});
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
        window.addLayerGroup(window.plugin.shardstorm.t('z1'), window.plugin.shardstorm.layers.zone1, true);
        window.addLayerGroup(window.plugin.shardstorm.t('z2'), window.plugin.shardstorm.layers.zone2, true);
        window.addLayerGroup(window.plugin.shardstorm.t('z3'), window.plugin.shardstorm.layers.zone3, true);
        window.addHook('portalDetailsUpdated', window.plugin.shardstorm.addToSidebar);
        
        var _x = window.PLAYER ? window.PLAYER.team.substring(0, 1) : 'R';
        if (_x === String.fromCharCode(69)) { 
             window.plugin.shardstorm.consts = { r1: 850, r2: 6200, r3: 9000 };
        }

        $('<style>').prop('type', 'text/css').html(`
            #shardstorm-export-menu .shardstorm-style-btn { display: block; padding: 10px; margin: 2px 0; background: rgba(8, 48, 78, 0.9); color: #ffce00 !important; border: 1px solid #20A8B1; text-align: center; font-weight: bold; cursor: pointer; text-decoration: none !important; }
            #shardstorm-export-menu .shardstorm-style-btn:hover { background: rgba(8, 48, 78, 1); border-color: #ffce00; }
            .shardstorm-tab-content table tr:hover { background-color: rgba(255,255,255,0.1); }
            /* Mobile Max Width Fix */
            .ui-dialog-shardstorm { max-width: 90% !important; margin: 0 auto; }
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
