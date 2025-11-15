// ==UserScript==
// @id         iitc-plugin-portal-details-full
// @name       IITC plugin: Portal Details Full (simplifié)
// @category   Info
// @version    1.6.2
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin-portal-details-full.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin-portal-details-full.user.js
// @description Affiche les mods, résonateurs (niveau & propriétaire), et les portails reliés (nom + GUID) du portail sélectionné. Export Telegram amélioré.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper() {
    const PLUGIN_VERSION = "1.6.2";
    if (typeof window.plugin !== 'function') window.plugin = function() {};
    window.plugin.portalDetailsFull = function() {};

    let failedPortals = new Set();
    let retryTimers = {};
    let currentPortalData = null;

    window.plugin.portalDetailsFull.selectPortal = function(guid) {
        let portal = window.portals[guid];
        if (portal) {
            let latLng = portal.getLatLng();
            window.map.setView(latLng);
            window.renderPortalDetails(guid);
        } else {
            window.portalDetail.request(guid).done(function(data) {
                if (data.latE6 && data.lngE6) {
                    let lat = data.latE6 / 1e6;
                    let lng = data.lngE6 / 1e6;
                    window.zoomToAndShowPortal(guid, [lat, lng]);
                }
            });
        }
    };

    window.plugin.portalDetailsFull.exportToTelegram = function() {
        if (!currentPortalData) return;

        const now = new Date().toLocaleString();
        let telegramContent = `📅 ${now}\n\n`;
        telegramContent += `📍 **${currentPortalData.portalName}**\n`;
        telegramContent += `🆔 \`${currentPortalData.portalGuid}\`\n\n`;

        telegramContent += `🔧 **Mods:**\n`;
        let filteredMods = currentPortalData.mods.filter(mod => mod !== null);
        if (filteredMods.length) {
            filteredMods.forEach(mod => {
                telegramContent += `  • **${mod.name || 'Inconnu'}** (${mod.owner || 'Inconnu'}, ${mod.rarity || 'Inconnue'})\n`;
            });
        } else {
            telegramContent += `  • Aucun\n`;
        }

        telegramContent += `\n⚡ **Résonateurs:**\n`;
        let filteredRes = currentPortalData.resonators.filter(res => res !== null);
        if (filteredRes.length) {
            filteredRes.forEach(res => {
                telegramContent += `  • **Niveau ${res.level || '?'}** (${res.owner || 'Inconnu'})\n`;
            });
        } else {
            telegramContent += `  • Aucun\n`;
        }

        telegramContent += `\n🔗 **Portails reliés:**\n`;
        if (currentPortalData.linkedPortals.length) {
            currentPortalData.linkedPortals.forEach(link => {
                telegramContent += `  • **${link.name}**\n    \`${link.guid}\`\n`;
            });
        } else {
            telegramContent += `  • Aucun\n`;
        }

        navigator.clipboard.writeText(telegramContent).then(() => {
            alert("✅ Données copiées au format Telegram !\nCollez directement dans votre groupe Telegram.");
        }).catch(err => {
            console.error("Erreur lors de la copie dans le presse-papiers : ", err);
            alert("❌ Impossible de copier dans le presse-papiers.\nVeuillez copier manuellement le texte suivant :\n\n" + telegramContent);
        });
    };

    window.plugin.portalDetailsFull.loadLinkedPortal = function(linkedPortalGuid, portalGuid) {
        let liId = `linked-portal-${linkedPortalGuid.replace(/\./g, '-')}`;
        let li = document.getElementById(liId);
        if (!li) return;

        window.portalDetail.request(linkedPortalGuid).done(function(data) {
            if (li && data && data.title) {
                li.innerHTML = `<b><a href="#" class="portal-link" data-guid="${linkedPortalGuid}" style="color:#ffce00;text-decoration:none;cursor:pointer;">${data.title}</a></b> (GUID: ${linkedPortalGuid})`;
                failedPortals.delete(linkedPortalGuid);

                if (currentPortalData) {
                    let linkIndex = currentPortalData.linkedPortals.findIndex(l => l.guid === linkedPortalGuid);
                    if (linkIndex !== -1) {
                        currentPortalData.linkedPortals[linkIndex].name = data.title;
                    }
                }

                let link = li.querySelector('.portal-link');
                if (link) {
                    link.onclick = function(e) {
                        e.preventDefault();
                        window.plugin.portalDetailsFull.selectPortal(linkedPortalGuid);
                    };
                }
            }
        }).fail(function() {
            if (li) {
                li.innerHTML = `<span style="color:red;">Échec du chargement</span> (GUID: ${linkedPortalGuid})`;
                failedPortals.add(linkedPortalGuid);

                if (retryTimers[linkedPortalGuid]) clearTimeout(retryTimers[linkedPortalGuid]);
                retryTimers[linkedPortalGuid] = setTimeout(function() {
                    window.plugin.portalDetailsFull.loadLinkedPortal(linkedPortalGuid, portalGuid);
                }, 2000);
            }
        });
    };

    window.plugin.portalDetailsFull.showDetailsDialog = function(retryCount) {
        if (!retryCount) retryCount = 0;

        if (!window.selectedPortal) {
            console.log("Aucun portail sélectionné");
            return;
        }

        const portal = window.portals[window.selectedPortal];

        if (!portal || !portal.options.data) {
            console.log("Chargement des détails du portail...");

            if (retryCount < 3) {
                window.portalDetail.request(window.selectedPortal).done(function() {
                    setTimeout(function() {
                        window.plugin.portalDetailsFull.showDetailsDialog(retryCount + 1);
                    }, 300);
                }).fail(function() {
                    if (retryCount < 2) {
                        setTimeout(function() {
                            window.plugin.portalDetailsFull.showDetailsDialog(retryCount + 1);
                        }, 500);
                    } else {
                        alert("Impossible de charger les détails de ce portail. Veuillez réessayer.");
                    }
                });
            } else {
                alert("Impossible de charger les détails de ce portail après plusieurs tentatives.");
            }
            return;
        }

        const details = portal.options.data;
        const portalName = details.title || "Portail inconnu";
        const portalGuid = window.selectedPortal;
        const now = new Date();
        let mods = details.mods || [];
        let resonators = details.resonators || [];

        failedPortals.clear();
        Object.keys(retryTimers).forEach(key => clearTimeout(retryTimers[key]));
        retryTimers = {};

        currentPortalData = {
            portalName: portalName,
            portalGuid: portalGuid,
            mods: mods,
            resonators: resonators,
            linkedPortals: []
        };

        let content = `<div id="portal-details-full-content">`;
        content += `<h3><u><b>${now.toLocaleString()}</
