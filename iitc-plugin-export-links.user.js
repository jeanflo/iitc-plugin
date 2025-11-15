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
        content += `<h3><u><b>${now.toLocaleString()}</b></u></h3>`;
        content += `<h3><b><a href="#" class="portal-link main-portal-link" data-guid="${portalGuid}" style="color:#ffce00;text-decoration:none;cursor:pointer;">${portalName}</a></b></h3>`;
        content += `<p><b>GUID:</b> ${portalGuid}</p>`;

        content += `<h4><b>Mods</b></h4><ul>`;
        let filteredMods = mods.filter(mod => mod !== null);
        content += filteredMods.length
            ? filteredMods.map(mod => `<li><b>${mod.name || "Mod inconnu"}</b> (Propriétaire: ${mod.owner || "Inconnu"}, Rareté: ${mod.rarity || "Inconnue"})</li>`).join('')
            : "<li>Aucun</li>";
        content += `</ul>`;

        content += `<h4><b>Résonateurs</b></h4><ul>`;
        let filteredRes = resonators.filter(res => res !== null);
        content += filteredRes.length
            ? filteredRes.map(res => `<li><b>Niveau ${res.level || "?"}</b> (Propriétaire: ${res.owner || "Inconnu"})</li>`).join('')
            : "<li>Aucun</li>";
        content += `</ul>`;

        content += `<h4><b>Portails reliés</b></h4><ul id="linked-portals-list">`;

        let linksFound = false;
        let linkedPortalGuids = [];
        Object.values(window.links).forEach(link => {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                linksFound = true;
                let linkedPortalGuid = (link.options.data.oGuid === portalGuid) ? link.options.data.dGuid : link.options.data.oGuid;
                linkedPortalGuids.push(linkedPortalGuid);
                let liId = `linked-portal-${linkedPortalGuid.replace(/\./g, '-')}`;

                let linkedPortal = window.portals[linkedPortalGuid];
                if (linkedPortal && linkedPortal.options.data && linkedPortal.options.data.title) {
                    currentPortalData.linkedPortals.push({ name: linkedPortal.options.data.title, guid: linkedPortalGuid });
                    content += `<li id="${liId}"><b><a href="#" class="portal-link" data-guid="${linkedPortalGuid}" style="color:#ffce00;text-decoration:none;cursor:pointer;">${linkedPortal.options.data.title}</a></b> (GUID: ${linkedPortalGuid})</li>`;
                } else {
                    currentPortalData.linkedPortals.push({ name: "Chargement...", guid: linkedPortalGuid });
                    content += `<li id="${liId}"><span style="color:orange;">Chargement...</span> (GUID: ${linkedPortalGuid})</li>`;
                }
            }
        });

        if (!linksFound) {
            content += "<li>Aucun</li>";
        }

        content += `</ul>`;
        content += `<div style="text-align:right;font-size:10px;color:#888;margin-top:8px;">Version du plugin : <b>${PLUGIN_VERSION}</b></div>`;
        content += `</div>`;

        let dialogOptions = {
            title: `Détails du portail`,
            html: content,
            width: 400,
            id: 'portal-details-full-dialog',
            buttons: [
                {
                    text: '✈️ Telegram',
                    click: function() {
                        window.plugin.portalDetailsFull.exportToTelegram();
                    },
                    class: 'export-button-left'
                },
                {
                    text: 'OK',
                    click: function() {
                        $(this).dialog('close');
                    },
                    class: 'ok-button-right'
                }
            ]
        };

        window.dialog(dialogOptions);

        setTimeout(function() {
            let dialogButtons = $('.ui-dialog-buttonpane');
            if (dialogButtons.length) {
                dialogButtons.find('button.export-button-left').css({
                    'float': 'left',
                    'margin-right': '5px'
                });
                dialogButtons.find('button.ok-button-right').css({
                    'float': 'right'
                });
            }

            document.querySelectorAll('.portal-link').forEach(function(link) {
                link.onclick = function(e) {
                    e.preventDefault();
                    let guid = this.getAttribute('data-guid');
                    window.plugin.portalDetailsFull.selectPortal(guid);
                };
            });
        }, 100);

        linkedPortalGuids.forEach(function(linkedPortalGuid) {
            let linkedPortal = window.portals[linkedPortalGuid];
            if (!linkedPortal || !linkedPortal.options.data || !linkedPortal.options.data.title) {
                window.plugin.portalDetailsFull.loadLinkedPortal(linkedPortalGuid, portalGuid);
            }
        });
    };

    window.plugin.portalDetailsFull.addToSidebar = function() {
        if (!window.selectedPortal) return;
        const portal = window.portals[window.selectedPortal];
        if (!portal) return;

        let aside = document.getElementById("portal-details-full-aside");
        if (!aside) {
            aside = document.createElement("aside");
            aside.id = "portal-details-full-aside";
            document.querySelector(".linkdetails")?.appendChild(aside);
        }

        if (document.getElementById("portal-details-full-btn")) return;

        const button = document.createElement("a");
        button.id = "portal-details-full-btn";
        button.textContent = "Détails Avancés";
        button.href = "#";
        button.className = "plugin-button";

        button.onclick = function(event) {
            event.preventDefault();
            window.plugin.portalDetailsFull.showDetailsDialog();
        };
        aside.appendChild(button);
    };

    window.addHook('portalDetailsUpdated', window.plugin.portalDetailsFull.addToSidebar);
    window.plugin.portalDetailsFull.addToSidebar();
}
wrapper();
