// ==UserScript==
// @name           IITC plugin: Bannergress Navigator
// @author         Z0mZ0m
// @category       Layer
// @version        1.0.1
// @description    Navigation piétonne automatisée pour les fresques Bannergress avec auto-validation et Deep Links Ingress Prime.
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/bannergress-navigator/bannergress-navigator.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/bannergress-navigator/bannergress-navigator.user.js
// @id             bannergress-navigator
// @namespace      https://github.com/jeanflo/iitc-plugin
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==
(function (_window) {
    'use strict';

    var window = _window;
    var $ = window.jQuery;
    var L = window.L;

    if (typeof window.plugin !== 'function') window.plugin = function () { };
    window.plugin.bannernavigator = function () { };
    var self = window.plugin.bannernavigator;

    self.id = 'bannernavigator';
    self.title = 'Bannergress Navigator';
    self.panename = 'plugin-bannernavigator';

    self.settings = {
        radius: 40,
        themeColor: '#ffce00',
        routeColor: '#ffce00'
    };

    self.state = {
        currentBanner: null,
        currentMissionIndex: 0,
        currentStepIndex: 0,
        missions: [], // Contiendra les missions téléchargées
        routeLayer: null
    };

    self.userLocation = null;
    self.lastAlerted = null;

    self.objectives = {
        'hack': 'Hack',
        'captureOrUpgrade': 'Capturer ou Améliorer',
        'createLink': 'Créer un Lien',
        'createField': 'Créer un Champ',
        'passphrase': 'Mot de Passe',
        'any': 'Action Libre'
    };

    self.isAndroid = function () {
        return typeof window.useAndroidPanes === 'function' && window.useAndroidPanes();
    };

    // =========================================================================
    // API BANNERGRESS
    // =========================================================================

    self.searchNearbyBanners = async function () {
        let bounds = window.map.getBounds();
        let $res = $('#bannernav-search-results');

        // On masque le filtre au début de la recherche
        let filterInput = document.getElementById('bannernav-filter');
        if (filterInput) filterInput.style.display = 'none';

        $res.html('<div style="text-align:center; padding:10px; color:#ffce00;">Recherche des fresques dans la vue...</div>');

        try {
            let minLat = bounds.getSouth();
            let maxLat = bounds.getNorth();
            let minLng = bounds.getWest();
            let maxLng = bounds.getEast();

            let url = `https://api.bannergress.com/bnrs?minLatitude=${minLat}&maxLatitude=${maxLat}&minLongitude=${minLng}&maxLongitude=${maxLng}&limit=20`;
            let response = await fetch(url);

            if (!response.ok) {
                $res.html(`<div style="color:red; text-align:center;">Erreur serveur (${response.status})</div>`);
                return;
            }

            let data = await response.json();

            let bannersList = [];
            if (Array.isArray(data)) {
                bannersList = data;
            } else if (data && typeof data === 'object') {
                bannersList = data.items || data.bnrs || data.banners || data.data || [];
            }

            if (!bannersList || !Array.isArray(bannersList) || bannersList.length === 0) {
                $res.html('<div style="text-align:center; color:#aaa;">Aucune fresque trouvée. Essayez de dézoomer ou de déplacer la carte.</div>');
                return;
            }

            // 👇 SUCCÈS : On affiche la barre de filtre et on la vide 👇
            if (filterInput) {
                filterInput.style.display = 'block';
                filterInput.value = '';
            }

            let html = `<div style="display:flex; flex-direction:column; gap:8px;">`;
            bannersList.forEach(b => {
                let distance = b.lengthMeters ? (b.lengthMeters / 1000).toFixed(1) + ' km' : 'Distance inconnue';
                let title = b.title || "Fresque Inconnue";
                let missionsCount = b.numberOfMissions || b.length || "?";
                let id = b.id || b.uuid;

                html += `
                    <div class="bannernav-result-item" data-title="${title.replace(/"/g, '&quot;')}" style="background:#111; border:1px solid #333; padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="flex:1; padding-right:10px; overflow:hidden;">
                            <div style="font-weight:bold; color:var(--bannernav-theme); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${title.replace(/"/g, '&quot;')}">${title}</div>
                            <div style="font-size:10px; color:#888;">${missionsCount} missions - ${distance}</div>
                        </div>
                        <button onclick="window.plugin.bannernavigator.loadBanner('${id}')" style="background:#040; color:#0f0; border:1px solid #0a0; padding:5px 10px; cursor:pointer; font-weight:bold; border-radius:3px;">Charger</button>
                    </div>
                `;
            });
            html += `</div>`;
            $res.html(html);
        } catch (e) {
            console.error("Erreur API Bannergress:", e);
            $res.html('<div style="color:red; text-align:center;">Erreur de connexion à Bannergress.</div>');
        }
    };

    self.loadBanner = async function (bannerId) {
        let $res = $('#bannernav-search-results');
        $res.html('<div style="text-align:center; padding:10px; color:#ffce00;">Téléchargement des missions...</div>');

        try {
            // 👇 Le correctif est ici : on utilise bien /bnrs/ et non /banners/
            let response = await fetch(`https://api.bannergress.com/bnrs/${bannerId}`);

            if (!response.ok) {
                $res.html(`<div style="color:red; text-align:center;">Erreur serveur (${response.status})</div>`);
                return;
            }

            let banner = await response.json();

            // Extraction robuste des missions (Tableau ou Dictionnaire selon ce que renvoie l'API)
            let sortedMissions = [];
            if (Array.isArray(banner.missions)) {
                sortedMissions = banner.missions;
            } else if (banner.missions && typeof banner.missions === 'object') {
                sortedMissions = Object.values(banner.missions).sort((a, b) => (a.index || 0) - (b.index || 0));
            }

            if (sortedMissions.length === 0) {
                $res.html('<div style="color:red; text-align:center;">Erreur: Aucune mission trouvée dans cette fresque.</div>');
                return;
            }

            self.state.currentBanner = banner;
            self.state.missions = sortedMissions;
            self.state.currentMissionIndex = 0;
            self.state.currentStepIndex = 0;

            self.drawRoute();
            self.menu(); // Rafraîchir l'interface
            alert(`Fresque "${banner.title}" chargée !\n${sortedMissions.length} missions prêtes à être jouées.`);
        } catch (e) {
            console.error("Erreur API Bannergress Load:", e);
            $res.html('<div style="color:red; text-align:center;">Erreur lors du téléchargement de la fresque.</div>');
        }
    };

    self.loadBanner = async function (bannerId) {
        let $res = $('#bannernav-search-results');
        $res.html('<div style="text-align:center; padding:10px; color:#ffce00;">Téléchargement des missions...</div>');

        try {
            let response = await fetch(`https://api.bannergress.com/bnrs/${bannerId}`);
            let banner = await response.json();

            // On trie les missions pour s'assurer de l'ordre (index)
            let sortedMissions = Object.values(banner.missions).sort((a, b) => a.index - b.index);

            self.state.currentBanner = banner;
            self.state.missions = sortedMissions;
            self.state.currentMissionIndex = 0;
            self.state.currentStepIndex = 0;

            self.drawRoute();
            self.menu(); // Rafraîchir l'interface
            alert(`Fresque "${banner.title}" chargée !\n${sortedMissions.length} missions prêtes.`);
        } catch (e) {
            $res.html('<div style="color:red; text-align:center;">Erreur lors du téléchargement.</div>');
        }
    };

    self.stopBanner = function () {
        if (!confirm("Voulez-vous vraiment arrêter la navigation de cette fresque ?")) return;

        self.state.currentBanner = null;
        self.state.missions = [];
        self.state.currentMissionIndex = 0;
        self.state.currentStepIndex = 0;

        if (self.state.routeLayer) {
            window.map.removeLayer(self.state.routeLayer);
            self.state.routeLayer = null;
        }

        self.hideArrivedPopup();

        // On force le rafraîchissement sans condition
        self.menu();
    };

    self.filterBanners = function () {
        let input = document.getElementById('bannernav-filter');
        if (!input) return;
        let filter = input.value.toLowerCase();
        let items = document.querySelectorAll('.bannernav-result-item');

        items.forEach(item => {
            let title = item.getAttribute('data-title').toLowerCase();
            // Masque ou affiche l'élément en fonction du texte entré
            if (title.indexOf(filter) > -1) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    };

    self.importFromUrl = function () {
        let input = document.getElementById('bannernav-import-url');
        if (!input || !input.value) return;

        let url = input.value.trim();
        // Extraction intelligente de l'ID de la fresque depuis une URL complète
        let match = url.match(/bannergress\.com\/banner\/([^\/\?]+)/);
        let bannerId = match ? match[1] : url; // Si ce n'est pas une URL, on essaie de l'utiliser comme ID direct

        if (bannerId) {
            self.loadBanner(bannerId);
            input.value = ''; // On vide le champ après l'import
        }
    };

    // =========================================================================
    // MOTEUR DE NAVIGATION
    // =========================================================================

    self.getCurrentMission = function() {
        if (!self.state.missions || self.state.missions.length === 0) return null;
        return self.state.missions[self.state.currentMissionIndex];
    };

    self.getCurrentStep = function() {
        let mission = self.getCurrentMission();
        if (!mission || !mission.steps) return null;
        return mission.steps[self.state.currentStepIndex];
    };

    self.drawRoute = async function () {
        if (self.state.routeLayer) window.map.removeLayer(self.state.routeLayer);
        self.state.routeLayer = new L.LayerGroup();

        let mission = self.getCurrentMission();
        if (!mission) return;

        let latlngs = [];
        let osrmCoords = []; // Coordonnées formatées pour l'API OSRM (Longitude,Latitude)

        // 1. Placement des marqueurs de portails
        mission.steps.forEach((step, idx) => {
            if (step.poi && step.poi.type === 'portal') {
                let ll = L.latLng(step.poi.latitude, step.poi.longitude);
                latlngs.push(ll);

                // OSRM demande le format "longitude,latitude"
                osrmCoords.push(`${step.poi.longitude},${step.poi.latitude}`);

                let isDone = idx < self.state.currentStepIndex;
                let isCurrent = idx === self.state.currentStepIndex;

                let color = isDone ? '#555' : (isCurrent ? '#0f0' : self.settings.themeColor);

                let marker = L.circleMarker(ll, {
                    radius: isCurrent ? 8 : 5,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: 2
                });
                self.state.routeLayer.addLayer(marker);
            }
        });

        // 2. Calcul et dessin du tracé piéton
        if (latlngs.length > 1) {
            try {
                // Création de la chaîne de coordonnées séparées par des points-virgules
                let coordString = osrmCoords.join(';');

                // Appel à l'API publique OSRM en mode piéton (foot)
                let response = await fetch(`https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson`);

                if (response.ok) {
                    let data = await response.json();
                    if (data.routes && data.routes.length > 0) {
                        // Récupération des coordonnées du tracé généré par OSRM
                        let routeCoords = data.routes[0].geometry.coordinates;

                        // Attention: GeoJSON utilise [Lng, Lat], Leaflet a besoin de [Lat, Lng]
                        let leafletCoords = routeCoords.map(c => [c[1], c[0]]);

                        // Tracé piéton réel (Ligne continue)
                        let polyline = L.polyline(leafletCoords, { color: self.settings.routeColor, weight: 4, opacity: 0.8 });
                        self.state.routeLayer.addLayer(polyline);
                    } else {
                        throw new Error("Aucune route trouvée par OSRM");
                    }
                } else {
                    throw new Error(`Erreur serveur OSRM : ${response.status}`);
                }
            } catch (e) {
                console.warn("[Bannergress Nav] Échec du routage piéton, repli sur le vol d'oiseau.", e);
                // Tracé de repli à vol d'oiseau (Ligne pointillée) si l'API échoue
                let fallbackPolyline = L.polyline(latlngs, { color: self.settings.routeColor, weight: 3, dashArray: '5, 5', opacity: 0.8 });
                self.state.routeLayer.addLayer(fallbackPolyline);
            }
        }

        window.map.addLayer(self.state.routeLayer);
    };

    self.advanceStep = function() {
        let mission = self.getCurrentMission();
        if (!mission) return;

        self.hideArrivedPopup();
        self.state.currentStepIndex++;

        // Fin de la mission ?
        if (self.state.currentStepIndex >= mission.steps.length) {
            self.state.currentMissionIndex++;
            self.state.currentStepIndex = 0;

            let nextMission = self.getCurrentMission();
            if (nextMission) {
                alert(`Mission terminée !\nPassage à la mission : ${nextMission.title}`);
            } else {
                alert(`Félicitations !\nVous avez terminé la fresque "${self.state.currentBanner.title}".`);
                self.state.currentBanner = null;
                self.state.missions = [];
            }
        }

        self.drawRoute();

        // 👇 CORRECTIF : On ne met à jour le menu QUE s'il est physiquement affiché à l'écran
        let mobileMenuOpen = document.getElementById(`${self.id}menu`);
        let pcDialogOpen = window.DIALOGS && window.DIALOGS[`plugin-${self.id}-dialog`];

        if (mobileMenuOpen || pcDialogOpen) {
            self.menu();
        }
        // 👆 FIN DU CORRECTIF
    };

    // =========================================================================
    // GESTION GPS & POPUPS
    // =========================================================================

    self.updateLocation = function (pos) {
        self.userLocation = L.latLng(pos.coords.latitude, pos.coords.longitude);
        self.checkProximity();
    };

    self.checkProximity = function () {
        if (!self.userLocation) return;
        let step = self.getCurrentStep();
        if (!step || !step.poi || step.poi.type !== 'portal') return;

        let dist = self.userLocation.distanceTo(L.latLng(step.poi.latitude, step.poi.longitude));

        if (dist <= self.settings.radius) {
            if (step.poi.id !== self.lastAlerted) {
                self.lastAlerted = step.poi.id;
                self.showArrivedPopup(step);
            }
        } else if (dist > self.settings.radius + 15) {
            if (step.poi.id === self.lastAlerted) {
                self.lastAlerted = null;
                self.hideArrivedPopup();
            }
        }
    };

    self.openIngressPortal = function (guid, lat, lng) {
        let isAndroid = /android/i.test(navigator.userAgent);
        if (isAndroid && typeof window.android !== 'undefined' && window.android.intent) {
            window.android.intent(`intent://intel.ingress.com/portal/${guid}#Intent;scheme=https;package=com.nianticproject.ingress;end`);
        } else {
            let intelUrl = encodeURIComponent(`https://intel.ingress.com/portal/${guid}`);
            window.location.href = `https://link.ingress.com/?link=${intelUrl}&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress`;
        }
    };

    self.openMissionDeepLink = function (missionId) {
        let intelUrl = encodeURIComponent(`https://intel.ingress.com/mission/${missionId}`);
        window.location.href = `https://link.ingress.com/?link=${intelUrl}&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress`;
    };

    self.showArrivedPopup = function (step) {
        let $popup = $(`#${self.id}-popup`);
        if ($popup.length === 0) {
            $('body').append(`
            <div id="${self.id}-popup" style="display:none; position:fixed; bottom:15%; left:5%; width:90%; background:rgba(0,15,20,0.95); border:2px solid var(--bannernav-theme); border-radius:12px; z-index:10000; padding:15px; box-sizing:border-box; text-align:center; backdrop-filter:blur(5px);">
                <h3 style="margin:0 0 10px 0; color:var(--bannernav-theme); font-size:18px;">🎯 Objectif à portée !</h3>
                <p id="${self.id}-popup-title" style="color:#fff; font-weight:bold; font-size:16px; margin:0 0 5px 0;"></p>
                <div id="${self.id}-popup-action" style="color:#ffce00; font-size:14px; font-weight:bold; margin-bottom:15px; padding:5px; background:rgba(255,204,0,0.2); border-radius:5px;"></div>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button id="${self.id}-btn-portal" style="background:#0af; color:#fff; border:none; padding:12px; font-size:14px; font-weight:bold; border-radius:8px; cursor:pointer;">1. 🚀 Ouvrir le Portail</button>
                    <button id="${self.id}-btn-mission" style="background:#a0f; color:#fff; border:none; padding:10px; font-size:12px; font-weight:bold; border-radius:8px; cursor:pointer;">🔗 Deep Link Mission Prime</button>
                    <button id="${self.id}-btn-next" style="background:#0a0; color:#fff; border:none; padding:12px; font-size:14px; font-weight:bold; border-radius:8px; cursor:pointer;">2. ✅ Valider & Suivant</button>
                </div>
            </div>`);
            $popup = $(`#${self.id}-popup`);
        }

        let objText = self.objectives[step.objective] || step.objective;
        $popup.find(`#${self.id}-popup-title`).text(step.poi.title);
        $popup.find(`#${self.id}-popup-action`).text(`Objectif : ${objText}`);

        $popup.find(`#${self.id}-btn-portal`).off('click').on('click', () => self.openIngressPortal(step.poi.id, step.poi.latitude, step.poi.longitude));

        let mission = self.getCurrentMission();
        $popup.find(`#${self.id}-btn-mission`).off('click').on('click', () => self.openMissionDeepLink(mission.id));

        $popup.find(`#${self.id}-btn-next`).off('click').on('click', () => self.advanceStep());

        $popup.fadeIn(200);
    };

    self.hideArrivedPopup = function () { $(`#${self.id}-popup`).fadeOut(200); };

    // =========================================================================
    // INTERFACE UTILISATEUR
    // =========================================================================

    self.menu = function () {
        let html = $(`<div id="${self.id}menu_content" style="display:flex; flex-direction:column; height:100%;">
            <div style="background:rgba(255,204,0,0.15); padding:10px; border-bottom:1px solid var(--bannernav-theme); display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; color:var(--bannernav-theme);">Bannergress Nav</span>
                <button onclick="window.plugin.bannernavigator.searchNearbyBanners()" style="background:#004; color:#0af; border:1px solid #0af; padding:5px 10px; cursor:pointer; font-size:12px; border-radius:3px;">🔍 Scanner Zone</button>
            </div>

            <div style="padding:10px; background:#0a1014; border-bottom:1px solid #333; display:flex; flex-direction:column; gap:8px;">
                <input type="text" id="bannernav-filter" onkeyup="window.plugin.bannernavigator.filterBanners()" placeholder="🔍 Filtrer les fresques scannées..." style="display:none; width:100%; padding:8px; background:#111; color:#fff; border:1px solid #444; border-radius:4px; box-sizing:border-box;">

                <div style="display:flex; gap:5px;">
                    <input type="text" id="bannernav-import-url" placeholder="🔗 Coller un lien Bannergress..." style="flex:1; padding:8px; background:#111; color:#fff; border:1px solid #444; border-radius:4px; box-sizing:border-box; font-size:12px;">
                    <button onclick="window.plugin.bannernavigator.importFromUrl()" style="background:#060; color:#0f0; border:1px solid #0a0; padding:5px 10px; cursor:pointer; font-weight:bold; border-radius:4px;">Importer</button>
                </div>
            </div>
            <div id="bannernav-search-results" style="padding:10px; border-bottom:1px solid #333; max-height:150px; overflow-y:auto; background:rgba(0,0,0,0.3);"></div>

            <div id="bannernav-dashboard" style="flex:1; overflow-y:auto; padding:10px;"></div>
        </div>`);

        let mission = self.getCurrentMission();
        let dashHtml = '';

        if (mission) {
            dashHtml += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <h3 style="color:#fff; margin:0; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${self.state.currentBanner.title}">${self.state.currentBanner.title}</h3>
                <button onclick="window.plugin.bannernavigator.stopBanner()" style="background:#500; color:#f88; border:1px solid #f00; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:bold;">🛑 Quitter</button>
            </div>`;
            dashHtml += `<div style="background:#222; border:1px solid #444; padding:8px; border-radius:5px; margin-bottom:15px;">
                <div style="color:#ffce00; font-weight:bold;">En cours : Mission ${self.state.currentMissionIndex + 1} / ${self.state.missions.length}</div>
                <div style="font-size:12px; color:#ccc;">${mission.title}</div>
                <button onclick="window.plugin.bannernavigator.openMissionDeepLink('${mission.id}')" style="margin-top:8px; width:100%; background:#a0f; color:#fff; border:none; padding:8px; font-weight:bold; border-radius:3px; cursor:pointer;">Ouvrir la mission dans Prime</button>
            </div>`;

            dashHtml += `<h4 style="color:#aaa; border-bottom:1px solid #333; padding-bottom:3px; margin:0 0 10px 0;">Étapes (Waypoints)</h4>`;

            mission.steps.forEach((step, idx) => {
                let isDone = idx < self.state.currentStepIndex;
                let isCurrent = idx === self.state.currentStepIndex;

                let bg = isCurrent ? 'rgba(0,255,0,0.1)' : (isDone ? 'rgba(255,255,255,0.05)' : 'transparent');
                let border = isCurrent ? '1px solid #0f0' : '1px solid #333';
                let icon = isDone ? '✅' : (isCurrent ? '🎯' : '⚪');

                let objText = self.objectives[step.objective] || step.objective;

                dashHtml += `
                <div style="background:${bg}; border:${border}; padding:8px; border-radius:5px; margin-bottom:5px; display:flex; align-items:center; gap:10px;">
                    <div style="font-size:18px;">${icon}</div>
                    <div style="flex:1;">
                        <div style="font-weight:bold; color:${isDone ? '#888' : '#fff'}; text-decoration:${isDone ? 'line-through' : 'none'};">${step.poi ? step.poi.title : 'Inconnu'}</div>
                        <div style="font-size:10px; color:${isCurrent ? '#0f0' : '#aaa'}; font-weight:bold;">Action : ${objText}</div>
                    </div>
                </div>`;
            });
        } else {
            dashHtml = `<div style="text-align:center; padding:20px; color:#888;">Aucune fresque active.<br>Cliquez sur "Scanner Zone" pour commencer.</div>`;
        }

        html.find('#bannernav-dashboard').html(dashHtml);

        // Appliquer exactement la même logique de menu mobile que tes autres plugins
        if (self.isAndroid() || /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            let existing = document.getElementById(`${self.id}menu`);
            if (existing) {
                $(existing).empty().append(html.contents());
            } else {
                $('<div>').attr('id', `${self.id}menu`).addClass('mobile').append(html.contents()).appendTo(document.body);
            }
        } else {
            // Sur PC, IITC stocke les boîtes de dialogue dans le registre window.DIALOGS
            let dialogId = `plugin-${self.id}-dialog`;
            if (window.DIALOGS && window.DIALOGS[dialogId]) {
                window.DIALOGS[dialogId].html(html.contents());
            } else {
                window.dialog({ html: html, id: dialogId, title: self.title, width: 400, resizable: true });
            }
        }
    };

    self.setup = function () {
        if (window.PLAYER && window.PLAYER.team !== 'RESISTANCE') {
            console.warn("[Bannergress Navigator] Plugin désactivé : l'accès est réservé à la Résistance.");
            return;
        }

        $('<style>').html(`
            :root {
                --bannernav-theme: ${self.settings.themeColor};
            }

            /* 👇 Protection des boîtes de dialogue et du menu plein écran (Le fameux correctif Padding) */
            @media screen and (max-width: 800px) {
                body .ui-dialog {
                    padding-top: calc(25px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) !important;
                    padding-bottom: calc(15px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))) !important;
                    padding-left: var(--safe-area-inset-left, env(safe-area-inset-left, 0px)) !important;
                    padding-right: var(--safe-area-inset-right, env(safe-area-inset-right, 0px)) !important;
                    box-sizing: border-box !important;
                }
            }

            #${self.id}menu.mobile {
                background:#0e161a;
                position:fixed;
                top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
                left: var(--safe-area-inset-left, env(safe-area-inset-left, 0px));
                width: 100%;
                height: 100%;
                z-index:9000;
                overflow:auto;
                padding:5px;
                padding-bottom: calc(5px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
                box-sizing: border-box;
            }
        `).appendTo('head');

        window.map.on('locationfound', function (e) {
            self.updateLocation({ coords: { latitude: e.latlng.lat, longitude: e.latlng.lng } });
        });

        // Activer le tracking GPS natif de Leaflet
        window.map.locate({ watch: true, enableHighAccuracy: true });

        // Ajouter le bouton dans la boîte à outils d'IITC
        // 👇 1. Fonction de nettoyage universelle
        self.closeMenu = function () {
            let m = document.getElementById(`${self.id}menu`);
            if (m) m.remove();

            let dialogId = `plugin-${self.id}-dialog`;
            if (window.DIALOGS && window.DIALOGS[dialogId]) {
                window.DIALOGS[dialogId].dialog('close');
            } else {
                let d = document.getElementById(dialogId);
                if (d) $(d).dialog('close');
            }
        };

        // 👇 2. Ajouter le bouton dans la boîte à outils d'IITC
        let t = document.querySelector('#toolbox');
        if (t) {
            let a = t.appendChild(document.createElement('a'));
            a.innerText = '🚩 ' + self.title;
            a.onclick = () => {
                if (self.isAndroid() && typeof window.show === 'function') {
                    window.show(self.panename); // Laisse IITC gérer l'ouverture et l'historique
                } else {
                    self.menu(); // Ouverture classique sur PC
                }
            };
        }

        // 👇 3. Gestion propre de la navigation (Bouton retour d'IITC Mobile)
        if (self.isAndroid()) {
            if (typeof android !== 'undefined' && android && android.addPane) {
                android.addPane(self.panename, self.title, 'ic_action_view_as_list');
            }
            window.addHook('paneChanged', function (pane) {
                if (pane === self.panename) {
                    self.menu();
                } else {
                    self.closeMenu();
                }
            });
        }
    };

    var setup = function () {
        if (window.iitcLoaded) self.setup(); else window.addHook('iitcLoaded', self.setup);
    };

    var info = {};
    if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
        info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
    }
    setup.info = info;

    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
