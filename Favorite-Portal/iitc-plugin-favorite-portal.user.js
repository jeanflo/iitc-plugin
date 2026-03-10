// ==UserScript==
// @name           IITC plugin: Favorite portal details (Toolbar Integration)
// @author         DanielOnDiordna / Gemini
// @category       Info
// @version        1.2.28.20260310-Update
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/Favorite-Portal/iitc-plugin-favorite-portal.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/Favorite-Portal/iitc-plugin-favorite-portal.user.js
// @description    [1.2.28] L'icône d'alerte (⚠️) est désormais cliquable et ouvre le portail directement dans Ingress Prime.
// @id             iitc-plugin-favorite-portal-details
// @namespace      https://softspot.nl/ingress/
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    window.plugin.favoriteportaldetails = function() {};
    var self = window.plugin.favoriteportaldetails;
    self.id = 'favoriteportaldetails';
    self.title = 'Favorite portal details';
    self.version = '1.2.28.20260310-Update';
    self.author = 'DanielOnDiordna';
    self.changelog = `
Changelog:
version 1.2.28.20260310-Update
- NOUVEAUTÉ : Le triangle d'alerte jaune (⚠️) sur la carte est maintenant cliquable et ouvre le portail directement dans l'application Ingress Prime via un deeplink.
version 1.2.27.20260303-Update
- NOUVEAUTÉ : Le bouton d'ajout/retrait des favoris a été déplacé dans une barre d'outils native Leaflet sur la gauche de l'écran.
version 1.2.26.20260302-Update
- OPTIMISATION : Suppression des doublons dans le format d'exportation.
`;
    self.namespace = `window.plugin.${self.id}.`;
    self.pluginname = `plugin-${self.id}`;

    self.panename = `plugin-${self.id}`;
    self.localstoragesettings = `${self.panename}-settings`;
    self.dialogobject = null;
    self.settings = { refreshonstart: false, healthThreshold: 30 };
    self.favoriteslist = [];
    self.favorites = {};
    self.favorite = {
        title: '', team: '?', level: '?', resonators: [], mods: [],
        health: '?', owner: '?', timestamp: 0, lat: 0.0, lng: 0.0
    };
    self.storagename = self.panename + '-favorites';
    self.requestlist = {};
    self.requestrunning = false;
    self.requestguid = null;
    self.requesttimerid = 0;
    self.ownercolor = 'black';
    self.refreshonload_runonce = true;
    self.shortnames = {
        '':' ', 'Heat Sink':'H', 'Portal Shield':'S', 'Link Amp':'L', 'Turret':'T',
        'Multi-hack':'M', 'Aegis Shield':'A', 'Force Amp':'F', 'SoftBank Ultra Link':'U',
        'Ito En Transmuter (+)':'I+', 'Ito En Transmuter (-)':'I-'
    };
    self.shortrarities = { '':' ', 'COMMON':'c', 'RARE':'r', 'VERY_RARE':'v' };

    self.isDraggingHandle = false;
    self.alertLayerGroup = null;
    self.edgeIndicators = {};

    self.restoresettings = function() {
        let data = localStorage.getItem(self.localstoragesettings);
        if (!data) return;
        try {
            let settings = JSON.parse(data);
            if (typeof settings === 'object' && settings !== null) {
                Object.keys(self.settings).forEach(key => {
                    if (key in settings) self.settings[key] = settings[key];
                });
            }
        } catch(e) {}
    };

    self.storesettings = function() {
        try { localStorage.setItem(self.localstoragesettings,JSON.stringify(self.settings)); } catch(e) {}
    };

    function isObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    self.restorefavorites = function() {
        let data = localStorage.getItem(self.storagename);
        if (!data) return;
        try {
            let favoriteslist = JSON.parse(data);
            if (!Array.isArray(favoriteslist)) return;
            self.favoriteslist = [];
            self.favorites = {};
            favoriteslist.forEach(favorite => {
                if (typeof favorite === 'string' && favorite.match(/^[0-9a-f]{32}\.[0-9a-f]{2}$/)) {
                    let guid = favorite; favorite = {}; favorite[guid] = guid;
                }
                if (isObject(favorite)) {
                    let guid = Object.keys(favorite)[0];
                    self.favorites[guid] = Object.assign({}, self.favorite);
                    self.favorites[guid].title = favorite[guid];
                    self.favoriteslist.push(guid);
                } else if (typeof favorite === 'string') {
                    self.favoriteslist.push(favorite);
                }
            });
        } catch(e) {}
    };

    self.storefavorites = function() {
        let data = [];
        self.favoriteslist.forEach(favorite => {
            if (favorite.match(/^[0-9a-f]{32}\.[0-9a-f]{2}$/)) {
                let guid = favorite;
                let obj = {}; obj[guid] = self.favorites[guid].title;
                data.push(obj);
            } else { data.push(favorite); }
        });
        try { localStorage[self.storagename] = JSON.stringify(data); } catch(e) {}
    };

    // --- FONCTIONS IMPORT / EXPORT (Optimisées) ---
    self.exportData = function() {
        let data = [];
        self.favoriteslist.forEach(favorite => {
            if (favorite.match(/^[0-9a-f]{32}\.[0-9a-f]{2}$/)) {
                let guid = favorite;
                let obj = {}; obj[guid] = self.favorites[guid].title;
                data.push(obj);
            } else { data.push(favorite); }
        });

        let exportObj = {
            version: self.version,
            favorites: data
        };

        let json = JSON.stringify(exportObj);
        let html = `<div style="padding:10px;">
            <p>Copiez ce code pour sauvegarder ou transférer vos favoris :</p>
            <textarea id="${self.id}exportArea" style="width:100%; height:150px; background:#111; color:#eee; border:1px solid #444; font-family:monospace; font-size:10px;">${json}</textarea>
            <p style="font-size:11px; color:#888; margin-top:5px;">Format optimisé : GUID et séparateurs uniquement.</p>
        </div>`;

        window.dialog({
            html: html,
            id: `${self.id}exportDialog`,
            title: 'Exportation des favoris',
            width: 400
        });
        document.getElementById(`${self.id}exportArea`).select();
    };

    self.importData = function() {
        let html = `<div style="padding:10px;">
            <p>Collez le code JSON d'exportation ici :</p>
            <textarea id="${self.id}importArea" style="width:100%; height:150px; background:#111; color:#eee; border:1px solid #444; font-family:monospace; font-size:10px;" placeholder='{"favorites":...}'></textarea>
        </div>`;

        window.dialog({
            html: html,
            id: `${self.id}importDialog`,
            title: 'Importation des favoris',
            width: 400,
            buttons: {
                'IMPORTER': function() {
                    let val = document.getElementById(`${self.id}importArea`).value;
                    if (!val) return;
                    try {
                        let imported = JSON.parse(val);
                        // Compatibilité ascendante (favorites ou favoriteslist)
                        let listToImport = imported.favorites || imported.favoriteslist;
                        if (!listToImport || !Array.isArray(listToImport)) throw "Format invalide";

                        if (confirm(`Importer ${listToImport.length} éléments ? Cela écrasera votre liste actuelle.`)) {
                            self.favoriteslist = [];
                            self.favorites = {};
                            listToImport.forEach(item => {
                                if (isObject(item)) {
                                    // Format objet : { "guid": "titre" }
                                    let guid = Object.keys(item)[0];
                                    self.favorites[guid] = Object.assign({}, self.favorite);
                                    self.favorites[guid].title = item[guid];
                                    self.favoriteslist.push(guid);
                                } else if (typeof item === 'string') {
                                    // Format string : séparateur ou GUID pur (legacy)
                                    if (item.match(/^[0-9a-f]{32}\.[0-9a-f]{2}$/)) {
                                        self.favorites[item] = Object.assign({}, self.favorite);
                                        self.favorites[item].title = item;
                                        self.favoriteslist.push(item);
                                    } else {
                                        self.favoriteslist.push(item);
                                    }
                                }
                            });
                            self.storefavorites();
                            self.autoRefreshList();
                            $(this).dialog('close');
                            alert("Importation réussie !");
                        }
                    } catch(e) {
                        alert("Erreur lors de l'importation : " + e);
                    }
                },
                'ANNULER': function() { $(this).dialog('close'); }
            }
        });
    };

    self.requesttimeout = function() {
        if (!self.requestrunning) return;
        console.warn("[Favorite Portals] Timeout sur " + self.requestguid + ". Passage au suivant.");
        if (self.requestguid) delete self.requestlist[self.requestguid];
        self.requestguid = null;
        self.updateselector();
        self.requestnext();
    };

    self.requestnext = function() {
        if (Object.keys(self.requestlist).length === 0) {
            self.requestrunning = false;
            self.requestguid = null;
            self.updateselector();
            return;
        }
        let nextguid = Object.keys(self.requestlist)[0];
        self.requestguid = nextguid;
        window.setTimeout(function() {
            if (!self.requestrunning || !self.requestguid) return;
            window.clearTimeout(self.requesttimerid);
            self.requesttimerid = window.setTimeout(self.requesttimeout, 15000);
            window.portalDetail.request(self.requestguid);
        }, 1000);
    };

    self.requestall = function() {
        if (self.requestrunning) return;
        self.requestrunning = true;
        Object.keys(self.favorites).forEach(guid => { self.requestlist[guid] = true; });
        self.requestnext();
        self.autoRefreshList();
    };

    self.focusportal = function(guid) {
        if (!isObject(window.portals) || Object.keys(window.portals).length === 0) return;
        if (guid === window.selectedPortal && guid in self.favorites) {
            window.map.setView([self.favorites[guid].lat,self.favorites[guid].lng]);
        }
        if (guid in window.portals) {
            window.renderPortalDetails(guid);
        } else {
            self.requestguid = guid;
            window.portalDetail.request(guid);
        }
    };

    self.closedialog = function() {
        if (self.dialogobject) { self.dialogobject.dialog('close'); self.dialogobject = null; }
        let editDialog = document.querySelector(`.ui-dialog-content[id="plugin-${self.id}-ordermenu"]`);
        if (editDialog) { $(editDialog).dialog('close'); }
        let m = document.getElementById(`${self.id}menu`); if(m) m.remove();
        if (window.useAndroidPanes()) window.show('map');
    };

    self.getdatetimestring = function(date1) {
        if (!(date1 instanceof Date)) { if (date1) { date1 = new Date(date1); } else { date1 = new Date(); } }
        return [date1.getFullYear(),date1.getMonth()+1,date1.getDate()].join('/') + ' ' + [date1.getHours(),('0' + date1.getMinutes()).slice(-2),('0' + date1.getSeconds()).slice(-2)].join(':');
    };

    self.resonatorshtml = function(resonators,portalowner) {
        let highlightowner = (window.PLAYER && window.PLAYER.nickname) ? window.PLAYER.nickname : '';
        let resolist = [];
        let resCopy = [];
        if (Array.isArray(resonators)) {
            resCopy = resonators.slice().sort(function(a,b) {
                let lA = a ? (a.level || 0) : 0;
                let lB = b ? (b.level || 0) : 0;
                let oA = (a && a.owner) ? a.owner : '';
                let oB = (b && b.owner) ? b.owner : '';
                return lB - lA || oA.localeCompare(oB);
            });
        }
        for (let cnt = 0; cnt < 8; cnt++) {
            let lvl = '-';
            if (cnt < resCopy.length && isObject(resCopy[cnt])) {
                let resonatorowner = resCopy[cnt].owner || '';
                lvl = resCopy[cnt].level || '-';
                if (resonatorowner === highlightowner && highlightowner !== '') lvl = `<span style="color:${self.ownercolor}">${lvl}</span>`;
                if (resonatorowner !== portalowner) lvl = `<u>${lvl}</u>`;
                lvl = `<span title="${resonatorowner}">${lvl}</span>`;
            }
            resolist.push(lvl);
        }
        return resolist.join('');
    };

    self.modshtml = function(mods,portalowner) {
        let highlightowner = (window.PLAYER && window.PLAYER.nickname) ? window.PLAYER.nickname : '';
        let modslist = [];
        if (Array.isArray(mods)) {
            for (let cnt = 0; cnt < mods.length; cnt++) {
                let mod;
                if (!isObject(mods[cnt])) { mod = ''; } else {
                    mod = self.shortnames[mods[cnt].name] || ' ';
                    if (mod === 'H' || mod === 'S' || mod === 'M') mod = (self.shortrarities[mods[cnt].rarity] || ' ') + mod;
                    let modowner = mods[cnt].owner || '';
                    if (modowner === highlightowner && highlightowner !== '') mod = `<span style="color:${self.ownercolor}">${mod}</span>`;
                    if (modowner !== portalowner) mod = `<u>${mod}</u>`;
                    mod = `<span title="${modowner}">${mod}</span>`;
                }
                modslist.push(mod);
            }
        }
        return modslist.join(' ');
    };

    self.favoriteshtml = function() {
        let highlightowner = (window.PLAYER && window.PLAYER.nickname) ? window.PLAYER.nickname : '';
        let playerTeam = '';
        if (window.PLAYER && window.PLAYER.team === 'RESISTANCE') playerTeam = 'R';
        if (window.PLAYER && window.PLAYER.team === 'ENLIGHTENED') playerTeam = 'E';
        let threshold = self.settings.healthThreshold || 30;

        let table = document.createElement('table');
        table.cellPadding = 0; table.cellSpacing = 0;
        let headerrow = table.appendChild(document.createElement('tr'));
        ['T','Title','Health','Lvl','Resonators','Mods','Owner','Checked'].forEach(h => {
            let cell = headerrow.appendChild(document.createElement('th')); cell.innerText = h;
        });

        self.favoriteslist.forEach(favorite => {
            let guid = favorite;
            let row = table.appendChild(document.createElement('tr'));
            if (guid in self.favorites) {
                let fav = self.favorites[guid];
                row.className = `${self.id}team${fav.team}`;
                let healthHtml = '-';
                if (fav.team !== 'N' && fav.team !== 'M' && fav.health !== '?') {
                    let healthVal = parseInt(fav.health);
                    let color = '';
                    let warning = '';
                    if (healthVal >= 80) color = '#00ff00';
                    else if (healthVal >= threshold) color = '#ffaa00';
                    else {
                        color = '#ff3333';
                        if (fav.team === playerTeam) warning = ' <span class="' + self.id + 'Blink" style="color:red; font-size:10px; font-weight:bold; background:rgba(0,0,0,0.5); padding:2px; border-radius:3px;">⚠️</span>';
                    }
                    healthHtml = `<span style="color:${color}; font-weight:bold;">${healthVal}%</span>${warning}`;
                } else if (fav.health !== '?') healthHtml = `${fav.health}%`;

                let cells = [fav.team, fav.title ? fav.title : guid, healthHtml, `L${fav.level}`, self.resonatorshtml(fav.resonators, fav.owner), self.modshtml(fav.mods, fav.owner), fav.owner || '', self.requestlist[guid] ? '...' : (fav.timestamp == 0 ? 'never' : self.getdatetimestring(fav.timestamp))];
                cells.forEach((content, i) => {
                    let cell = row.appendChild(document.createElement('td'));
                    cell.noWrap = true;
                    if (i === 1) {
                         let link = cell.appendChild(document.createElement('a'));
                         link.innerText = content;
                         link.onclick = (e) => { e.preventDefault(); self.focusportal(guid); };
                    } else if (i === 3) { cell.innerHTML = content; cell.className = `${self.id}Lvl${fav.level}`;
                    } else if (i === 4 || i === 5) cell.innerHTML = content;
                    else if (i === 6 && content === highlightowner && highlightowner !== '') { cell.innerText = content; cell.className = `${self.id}owner`;
                    } else cell.innerHTML = content;
                });
            } else {
                row.className = `${self.id}SeparatorRow`;
                row.appendChild(document.createElement('td'));
                let cell = row.appendChild(document.createElement('td'));
                cell.className = `${self.id}label`;
                cell.innerText = favorite;
                cell.style.textAlign = 'center';
                for (let i = 0; i < 6; i++) { row.appendChild(document.createElement('td')); }
            }
        });
        return table;
    };

    self.renameSeparator = function(oldTitle) {
        let newTitle = prompt('Entrez le nouveau nom pour ce séparateur :', oldTitle);
        if (!newTitle || newTitle === oldTitle) return;

        let index = self.favoriteslist.indexOf(oldTitle);
        if (index !== -1) {
            self.favoriteslist[index] = newTitle;
            self.storefavorites();
            self.autoRefreshList();
            if (document.getElementById(`${self.id}orderlist`)) self.ordermenu();
        }
    };

    self.portalHighlighter = function(data) {
        var guid = data.portal.options.guid;
        if (guid in self.favorites) {
            data.portal.setStyle({
                fillColor: '#ff3333',
                fillOpacity: 1.0,
                weight: 4,
                color: '#ffffff',
                dashArray: null
            });
        }
    };

    self.updateMapAlerts = function() {
        if (!self.alertLayerGroup) return;
        self.alertLayerGroup.clearLayers();
        if (!window.map.hasLayer(self.alertLayerGroup)) {
            Object.values(self.edgeIndicators).forEach(el => el.remove());
            self.edgeIndicators = {};
            return;
        }
        let playerTeam = '';
        if (window.PLAYER && window.PLAYER.team === 'RESISTANCE') playerTeam = 'R';
        if (window.PLAYER && window.PLAYER.team === 'ENLIGHTENED') playerTeam = 'E';
        if (!playerTeam) return;
        let threshold = self.settings.healthThreshold || 30;
        let alertIcon = L.divIcon({ className: '', html: `<div class="${self.id}TargetPulse"></div><div class="${self.id}TargetIcon">⚠️</div>`, iconSize: [0, 0] });
        let bounds = window.map.getBounds();
        let neededIndicators = {};
        for (let guid in self.favorites) {
            let fav = self.favorites[guid];
            if (fav.team === playerTeam && fav.health !== '?' && parseInt(fav.health) < threshold) {
                if (fav.lat && fav.lng && fav.lat !== 0 && fav.lng !== 0) {
                    let latlng = L.latLng(fav.lat, fav.lng);
                    if (bounds.contains(latlng)) {
                        let marker = L.marker(latlng, { icon: alertIcon, interactive: true, keyboard: false });
                        
                        // Ajout du clic pour ouvrir Ingress Prime via Deeplink
                        marker.on('click', function(e) {
                            if (e.originalEvent) {
                                e.originalEvent.stopPropagation();
                                e.originalEvent.preventDefault();
                            }
                            // Construction du deeplink officiel Ingress Prime
                            let primeDeeplink = `https://link.ingress.com/?link=https://intel.ingress.com/portal/${guid}&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress&ofl=https://intel.ingress.com/intel?pll=${fav.lat},${fav.lng}`;
                            
                            // Ouverture du lien (compatible IITC Mobile et navigateur)
                            window.open(primeDeeplink, '_system') || window.open(primeDeeplink, '_blank');
                        });
                        
                        self.alertLayerGroup.addLayer(marker);
                    } else {
                        neededIndicators[guid] = true;
                        self.updateEdgeIndicator(guid, latlng);
                    }
                }
            }
        }
        for (let guid in self.edgeIndicators) {
            if (!neededIndicators[guid]) { self.edgeIndicators[guid].remove(); delete self.edgeIndicators[guid]; }
        }
    };

    self.updateEdgeIndicator = function(guid, targetLatLng) {
        let centerPt = window.map.getSize().divideBy(2);
        let targetPt = window.map.latLngToContainerPoint(targetLatLng);
        let dx = targetPt.x - centerPt.x, dy = targetPt.y - centerPt.y;
        let angle = Math.atan2(dy, dx);
        let padding = 25;
        let w = centerPt.x - padding, h = centerPt.y - padding;
        let cos = Math.cos(angle), sin = Math.sin(angle);
        let x = 0, y = 0;
        if (Math.abs(w * sin) <= Math.abs(h * cos)) { x = Math.sign(cos) * w; y = x * Math.tan(angle); }
        else { y = Math.sign(sin) * h; x = y / Math.tan(angle); }
        let finalX = centerPt.x + x, finalY = centerPt.y + y;
        let rotationDeg = angle * (180 / Math.PI);
        let indicator = self.edgeIndicators[guid];
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = `${self.id}EdgeRadar`;
            indicator.innerHTML = '➤';
            indicator.onclick = function() {
                window.map.setView(targetLatLng);
                if (window.useAndroidPanes && window.useAndroidPanes()) window.show('map');
            };
            document.getElementById('map').appendChild(indicator);
            self.edgeIndicators[guid] = indicator;
        }
        indicator.style.left = `${finalX}px`;
        indicator.style.top = `${finalY}px`;
        indicator.style.setProperty('--radar-angle', `${rotationDeg}deg`);
    };

    self.removefavorite = function(btn) {
        let tr = btn.closest('tr');
        let index = Array.from(tr.parentNode.children).indexOf(tr);
        let guid = self.favoriteslist[index];
        if (guid in self.favorites) delete(self.favorites[guid]);
        self.favoriteslist.splice(index, 1);
        self.storefavorites();
        self.updateselector();
        tr.remove();
        self.autoRefreshList();
        if (window.resetHighlightedPortals) window.resetHighlightedPortals();
    };

    self.addtitle = function() {
        let newtitle = prompt('Entrez un nom pour le séparateur :');
        if (!newtitle) return;
        self.favoriteslist.push(newtitle);
        self.storefavorites();
        self.updateselector();
        self.ordermenu();
    };

    self.clearlist = function() {
        if (confirm('Voulez-vous vraiment effacer toute la liste de favoris ? Cette action est irréversible.')) {
            self.favoriteslist = [];
            self.favorites = {};
            self.storefavorites();
            self.updateselector();
            self.autoRefreshList();
            self.ordermenu();
            if (window.resetHighlightedPortals) window.resetHighlightedPortals();
        }
    };

    self.dragstart = function(e) {
        if (!e.target.classList.contains('drag-handle')) return false;
        let tr = e.target.closest('tr');
        self.draggeditem = Array.from(tr.parentNode.children).indexOf(tr);
        self.draggedElement = tr;
        setTimeout(() => { if (self.draggedElement) self.draggedElement.style.opacity = '0.4'; }, 0);
    };

    self.dragover = function(e) {
        e.preventDefault();
        if (!self.draggedElement) return false;
        let targetTr = e.target.closest('tr');
        if (targetTr && targetTr !== self.draggedElement && targetTr.parentNode === self.draggedElement.parentNode) {
            let rect = targetTr.getBoundingClientRect();
            let next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            let sibling = next ? targetTr.nextSibling : targetTr;
            if (self.draggedElement.nextSibling !== sibling) targetTr.parentNode.insertBefore(self.draggedElement, sibling);
        }
        return false;
    };

    self.dragend = function(e) {
        if (!self.draggedElement) return;
        self.draggedElement.style.opacity = '1';
        let newIndex = Array.from(self.draggedElement.parentNode.children).indexOf(self.draggedElement);
        if (newIndex >= 0 && self.draggeditem !== newIndex) {
            let removed = self.favoriteslist.splice(self.draggeditem, 1);
            self.favoriteslist.splice(newIndex, 0, removed[0]);
            self.storefavorites();
            self.autoRefreshList();
        }
        self.draggedElement = null;
    };

    self.touchstartHandle = function(e) {
        self.isDraggingHandle = true;
        let tr = e.currentTarget.closest('tr');
        self.draggeditem = Array.from(tr.parentNode.children).indexOf(tr);
        self.draggedElement = tr;
        self.draggedElement.style.opacity = '0.4';
        self.draggedElement.style.backgroundColor = 'rgba(255, 206, 0, 0.2)';
    };

    self.touchmoveRow = function(e) {
        if (!self.isDraggingHandle || !self.draggedElement) return;
        if (e.cancelable) e.preventDefault();
        let touch = e.changedTouches[0] || e.touches[0];
        if (!touch) return;
        let clientY = touch.clientY, parent = self.draggedElement.parentNode, rows = Array.from(parent.children);
        let targetTr = null, minDiff = Infinity;
        for (let i = 0; i < rows.length; i++) {
            let tr = rows[i];
            if (tr === self.draggedElement) continue;
            let rect = tr.getBoundingClientRect(), center = rect.top + (rect.height / 2), diff = Math.abs(clientY - center);
            if (diff < minDiff && diff < rect.height) { minDiff = diff; targetTr = tr; }
        }
        if (targetTr) {
            let rect = targetTr.getBoundingClientRect();
            let next = (clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            let sibling = next ? targetTr.nextSibling : targetTr;
            if (self.draggedElement.nextSibling !== sibling) parent.insertBefore(self.draggedElement, sibling);
        }
    };

    self.touchendRow = function(e) {
        if (!self.isDraggingHandle || !self.draggedElement) return;
        self.draggedElement.style.opacity = '1';
        self.draggedElement.style.backgroundColor = '';
        self.isDraggingHandle = false;
        let newIndex = Array.from(self.draggedElement.parentNode.children).indexOf(self.draggedElement);
        if (newIndex >= 0 && self.draggeditem !== newIndex) {
            let removed = self.favoriteslist.splice(self.draggeditem, 1);
            self.favoriteslist.splice(newIndex, 0, removed[0]);
            self.storefavorites();
            self.autoRefreshList();
        }
        self.draggedElement = null;
    };

    self.ordermenu = function() {
        let html = '<div class="' + self.id + 'menubuttons" style="margin-bottom: 15px; text-align: center;">' +
            '<a onclick="window.plugin.favoriteportaldetails.addtitle(); return false;" style="color:#ffce00; border:1px solid #ffce00; padding:5px 10px; background:rgba(8,48,78,.9); cursor:pointer; margin-right: 5px;">➕ Ajouter un séparateur</a>' +
            '<a onclick="window.plugin.favoriteportaldetails.clearlist(); return false;" style="color:#ff3333; border:1px solid #ff3333; padding:5px 10px; background:rgba(8,48,78,.9); cursor:pointer;">🗑️ Tout effacer</a>' +
            '</div><table id="' + self.id + 'orderlist" style="width:100%; border-collapse: collapse; font-size: 14px; touch-action: pan-y;">';
        self.favoriteslist.forEach(function(favorite) {
            let title = favorite, guid = favorite, islabel = true;
            if (guid in self.favorites) { title = self.favorites[guid].title || guid; islabel = false; }
            let labelStyle = islabel ? 'color:#ff3333; font-weight:bold;' : 'color:#ccc;';

            let actionButtons = '';
            if (islabel) {
                actionButtons += `<a style="cursor:pointer; margin: 0 8px; color:#ffce00; font-size:16px;" title="Renommer" onclick="window.plugin.favoriteportaldetails.renameSeparator('${favorite.replace(/'/g, "\\'")}'); return false;">✏️</a>`;
            }
            actionButtons += `<a style="cursor:pointer; margin: 0 8px; color:#ff3333; font-weight:bold; font-size:16px;" title="Supprimer" onclick="window.plugin.favoriteportaldetails.removefavorite(this); return false;">✖</a>`;

            html += '<tr ondragover="window.plugin.favoriteportaldetails.dragover(event);" ondrop="return false;" ontouchmove="window.plugin.favoriteportaldetails.touchmoveRow(event);" ontouchend="window.plugin.favoriteportaldetails.touchendRow(event);" style="border-bottom: 1px solid #333; user-select: none;">' +
                    '<td draggable="true" class="drag-handle" ondragstart="window.plugin.favoriteportaldetails.dragstart(event);" ondragend="window.plugin.favoriteportaldetails.dragend(event);" ontouchstart="window.plugin.favoriteportaldetails.touchstartHandle(event);" style="padding: 10px 4px; color:#888; width: 30px; text-align:center; cursor: grab; font-size: 18px; touch-action: none;">☰</td>' +
                    '<td style="padding: 10px 4px; ' + labelStyle + '">' + title + '</td><td style="padding: 10px 4px; text-align: right; white-space: nowrap;">' +
                    actionButtons + '</td></tr>';
        });
        html += '</table>';
        let editDialog = document.querySelector(`.ui-dialog-content[id="plugin-${self.id}-ordermenu"]`);
        if (editDialog) $(editDialog).html(html);
        else window.dialog({ html: html, id: `plugin-${self.id}-ordermenu`, title: 'Édition de la liste', width: window.isSmartphone && window.isSmartphone() ? 'auto' : 400 });
    };

    self.menu = function() {
        let currentThreshold = self.settings.healthThreshold || 30;
        let $container = $('<div>').attr('id', `${self.id}menu`);
        $container.html(`<div class="${self.id}menubuttons">
            <a onclick="window.plugin.favoriteportaldetails.requestall(); return false;">Check all</a>
            <a onclick="window.plugin.favoriteportaldetails.ordermenu(); return false;">Edit list</a>
            <a onclick="window.plugin.favoriteportaldetails.importData(); return false;">Import</a>
            <a onclick="window.plugin.favoriteportaldetails.exportData(); return false;">Export</a>
            <a onclick="window.plugin.favoriteportaldetails.closedialog(); return false;" style="float:right;color:red;border:1px solid red;padding:0 5px;">X</a>
            <div style="margin-top: 10px; font-size: 13px; color: #ccc;">
                <label style="margin-right:15px;"><input type="checkbox" name="${self.id}autocheck"> Check all on IITC start</label>
                <label>Seuil d'alerte (Health) : <input type="number" name="${self.id}threshold" min="1" max="100" value="${currentThreshold}" style="width:45px; background:#222; color:#fff; border:1px solid #444; padding:2px; text-align:center;"> %</label>
            </div>
        </div><div id="${self.id}list"></div>`);
        $container.find(`#${self.id}list`).append(self.favoriteshtml());
        let autocheck = $container.find(`input[name=${self.id}autocheck]`)[0];
        if (autocheck) { autocheck.checked = self.settings.refreshonstart; autocheck.addEventListener('click',function() { self.settings.refreshonstart = this.checked; self.storesettings(); },false); }
        let thresholdInput = $container.find(`input[name=${self.id}threshold]`)[0];
        if (thresholdInput) { thresholdInput.addEventListener('change', function() { let val = parseInt(this.value); if (!isNaN(val) && val > 0 && val <= 100) { self.settings.healthThreshold = val; self.storesettings(); self.autoRefreshList(); } else { this.value = self.settings.healthThreshold; } }, false); }
        if (window.useAndroidPanes()) {
            let existing = document.getElementById(`${self.id}menu`);
            if (existing) $(existing).empty().append($container.contents());
            else $('<div>').attr('id', `${self.id}menu`).addClass('mobile').append($container.contents()).appendTo(document.body);
        } else window.dialog({ html: $container, id: `plugin-${self.id}-dialog`, title: self.title, width: 700 });
    };

    self.toggleselection = function(guid) {
        if (!guid) guid = window.selectedPortal;
        if (!guid) return;
        let portaldata = window.portals[guid] ? window.portals[guid].options.data : {};
        if (!self.favorites[guid]) {
            self.favorites[guid] = Object.assign({}, self.favorite, { title: portaldata.title || guid, team: portaldata.team || 'N', level: (portaldata.team === 'N'?0:portaldata.level)||0 });
            self.favoriteslist.push(guid);
            self.requestlist[guid] = true; self.requestnext();
        } else {
            delete(self.favorites[guid]);
            self.favoriteslist = self.favoriteslist.filter(g => g !== guid);
        }
        self.storefavorites();
        self.updateselector();
        if (window.resetHighlightedPortals) window.resetHighlightedPortals();
    };

    self.updateselector = function() {
        self.onPortalSelected();
        self.autoRefreshList();
    };

    // --- NOUVEAU : Gestion dans la barre d'outils Leaflet ---
    self.onPortalSelected = function() {
        let guid = window.selectedPortal;
        if (!self.toolbarBtn) return;

        if (!guid) {
            self.toolbarBtn.innerHTML = '♡';
            self.toolbarBtn.style.color = '';
            self.toolbarBtn.style.textShadow = 'none';
            self.toolbarBtn.style.cursor = 'not-allowed';
            self.toolbarBtn.title = 'Sélectionnez un portail';
            return;
        }

        let isFav = (guid in self.favorites);
        self.toolbarBtn.innerHTML = isFav ? '♥' : '♡';
        self.toolbarBtn.style.color = isFav ? '#ff3333' : '';
        self.toolbarBtn.style.textShadow = isFav ? '0 0 5px #ff3333' : 'none';
        self.toolbarBtn.style.cursor = 'pointer';
        self.toolbarBtn.title = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
    };

    // --- NOUVEAU : Création de la barre d'outils Leaflet à gauche ---
    self.setupToolbar = function() {
        let FavControl = L.Control.extend({
            options: { position: 'topleft' }, // Aligné avec les autres contrôles (GPS, etc.)
            onAdd: function(map) {
                let container = L.DomUtil.create('div', 'leaflet-control leaflet-bar fav-control-container');
                let btn = L.DomUtil.create('a', 'fav-toolbar-btn', container);
                btn.innerHTML = '♡';
                btn.title = 'Sélectionnez un portail';
                btn.href = '#';

                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.on(btn, 'click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    let guid = window.selectedPortal;
                    if (guid) {
                        window.plugin.favoriteportaldetails.toggleselection(guid);
                    }
                });

                self.toolbarBtn = btn;
                return container;
            }
        });
        window.map.addControl(new FavControl());
    };

    self.onPortalDetailLoaded = function(data) {
        if (!data.details || !data.guid) return;
        let guid = data.guid, wasRequested = false;
        if (guid === self.requestguid) { window.clearTimeout(self.requesttimerid); wasRequested = true; }
        if (guid in self.favorites) {
            let d = data.details;
            Object.assign(self.favorites[guid], { title: d.title, team: d.team, level: (d.team === 'N'?0:d.level), owner: d.owner, health: d.health, timestamp: new Date().getTime(), lat: d.latE6/1E6, lng: d.lngE6/1E6, resonators: d.resonators.map(r => r?{owner:r.owner,level:r.level}:{owner:'',level:''}), mods: d.mods.map(m => m?{owner:m.owner,name:m.name,rarity:m.rarity}:null) });
            if (self.requestlist[guid]) delete self.requestlist[guid];
            self.storefavorites(); self.autoRefreshList();
        }
        if (wasRequested) { self.requestguid = null; self.requestnext(); }
    };

    self.autoRefreshList = function() {
        if (document.getElementById(`${self.id}menu`)) {
            let list = document.querySelector(`div#${self.id}list`);
            if(list) { list.innerHTML=''; list.append(self.favoriteshtml()); }
        }
        if (typeof self.updateMapAlerts === 'function') self.updateMapAlerts();
    };

    self.setup = function() {
        self.restoresettings(); self.restorefavorites(); self.storefavorites();
        self.alertLayerGroup = new L.LayerGroup();
        if (window.addLayerGroup) window.addLayerGroup('Favorite Portals Alerts', self.alertLayerGroup, true);

        if (window.addPortalHighlighter) window.addPortalHighlighter('Favorite Portals', self.portalHighlighter);

        let stylesheet = document.head.appendChild(document.createElement('style'));
        stylesheet.innerHTML = `
            #${self.id}menu.mobile { background:#0e161a; position:fixed; top: env(safe-area-inset-top, 0px); left: env(safe-area-inset-left, 0px); width: calc(100% - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)); height: calc(100% - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); z-index:9000; overflow:auto; padding:5px; box-sizing: border-box; }
            .${self.id}menubuttons a { color:#ffce00; border:1px solid #ffce00; padding:5px 10px; display:inline-block; margin:5px; background:rgba(8,48,78,.9); cursor:pointer; }
            #${self.id}list { overflow-x:auto; margin-top:10px; }
            #${self.id}list table { min-width:600px; width:100%; border-collapse:collapse; }
            #${self.id}list td, #${self.id}list th { padding:8px; border-bottom:1px solid #333; text-align:left; color:#ccc; }
            tr.${self.id}SeparatorRow { background: rgba(255, 0, 0, 0.15) !important; }
            #${self.id}list td.${self.id}label { color: #ff3333 !important; font-weight: bold; cursor: default; }
            @keyframes ${self.id}PulseFade { 0% { opacity: 1; transform: translate(-50%, -50%) rotate(var(--radar-angle, 0deg)) scale(1); } 50% { opacity: 0.4; transform: translate(-50%, -50%) rotate(var(--radar-angle, 0deg)) scale(1.1); } 100% { opacity: 1; transform: translate(-50%, -50%) rotate(var(--radar-angle, 0deg)) scale(1); } }
            @keyframes ${self.id}SimpleBlink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            @keyframes ${self.id}TargetPulsate { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
            @keyframes ${self.id}Bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            .${self.id}Blink { animation: ${self.id}SimpleBlink 1.5s infinite; }
            .${self.id}TargetPulse { width: 40px; height: 40px; border: 3px solid red; border-radius: 50%; position: absolute; top: -20px; left: -20px; box-shadow: 0 0 10px red, inset 0 0 10px red; animation: ${self.id}TargetPulsate 1.5s ease-out infinite; pointer-events: none; }
            .${self.id}TargetIcon { font-size: 24px; line-height: 24px; position: absolute; top: -30px; left: -12px; text-shadow: 0 0 5px black, 0 0 5px black; animation: ${self.id}Bounce 1.5s infinite; pointer-events: auto; cursor: pointer; }
            .${self.id}EdgeRadar { position: absolute; font-size: 30px; color: red; text-shadow: 0px 0px 5px #000, 0px 0px 10px rgba(255,0,0,0.8); z-index: 5000; cursor: pointer; animation: ${self.id}PulseFade 1.5s infinite; pointer-events: auto; }
            tr.${self.id}teamE { background-color: rgba(3, 220, 3, 0.2) !important; }
            tr.${self.id}teamR { background-color: rgba(0, 136, 255, 0.2) !important; }
            tr.${self.id}teamM { background-color: rgba(255, 0, 0, 0.2) !important; }
            tr.${self.id}teamN { background-color: rgba(255, 206, 0, 0.2) !important; }
            tr.${self.id}teamE td, tr.${self.id}teamR td, tr.${self.id}teamM td, tr.${self.id}teamN td, tr.${self.id}teamE td a, tr.${self.id}teamR td a, tr.${self.id}teamM td a, tr.${self.id}teamN td a { color: #f0f0f0 !important; }

            /* Styles du nouveau bouton Toolbar à gauche (Intégration native Leaflet) */
            .fav-toolbar-btn { display: block; text-align: center; font-size: 18px !important; line-height: 26px !important; font-weight: bold; text-decoration: none !important; transition: all 0.2s; }
        `;

        self.setupToolbar(); // Initialisation de la toolbar

        window.addHook('portalSelected', self.onPortalSelected);
        window.addHook('portalDetailsUpdated', self.onPortalSelected);
        window.addHook('portalDetailLoaded', self.onPortalDetailLoaded);
        window.addHook('mapDataRefreshEnd', self.autoRefreshList);
        window.map.on('move', self.updateMapAlerts);
        window.map.on('zoomend', self.updateMapAlerts);
        window.map.on('overlayadd', function(e) { if(e.name === 'Favorite Portals Alerts') self.updateMapAlerts(); });
        window.map.on('overlayremove', function(e) { if(e.name === 'Favorite Portals Alerts') { Object.values(self.edgeIndicators).forEach(el => el.remove()); self.edgeIndicators = {}; } });

        if (window.useAndroidPanes()) {
            android.addPane(self.panename, self.title, 'ic_action_view_as_list');
            window.addHook('paneChanged', function(pane) { if (pane === self.panename) self.menu(); else if (document.getElementById(`${self.id}menu`)) document.getElementById(`${self.id}menu`).remove(); });
        }
        if (typeof IITC !== 'undefined' && typeof IITC.toolbox !== 'undefined') {
            IITC.toolbox.addButton({ id: self.id, label: '♥ ' + self.title, action: () => { if(window.useAndroidPanes()) window.show(self.panename); else self.menu(); } });
        } else {
            let t = document.querySelector('#toolbox');
            if(t) { let a = t.appendChild(document.createElement('a')); a.innerText = '♥ ' + self.title; a.onclick = () => { if(window.useAndroidPanes()) window.show(self.panename); else self.menu(); }; }
        }
        self.updateMapAlerts();
        if (self.settings.refreshonstart) setTimeout(self.requestall, 3000);
    };

    var setup = function() { (window.iitcLoaded?self.setup():window.addHook('iitcLoaded',self.setup)); };
    setup.info = plugin_info;
    if(!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
}
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

