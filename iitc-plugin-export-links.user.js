// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    1.7.5
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.user.js
// @description 1.7.5 Ultra compatible Android ES5. Affiche les details complets du portail.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
    var PLUGIN_VERSION = "1.7.5";
    var PLUGIN_NAME = "Full Portal Details";

    console.log("[Full Portal Details] Initialisation v" + PLUGIN_VERSION);

    if (typeof window.plugin !== 'function') {
        window.plugin = function() {};
    }
    window.plugin.portalDetailsFull = function() {};

    if (!window.ExcelJS) {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
        document.head.appendChild(script);
    }

    var failedPortals = {};
    var retryTimers = {};
    var currentPortalData = null;

    var isMobileDevice = function() {
        var ua = navigator.userAgent;
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            return true;
        }
        if (window.useAndroidPanes !== undefined) {
            return true;
        }
        if (typeof window.isSmartphone === 'function' && window.isSmartphone()) {
            return true;
        }
        return false;
    };

    console.log("[Full Portal Details] Mobile:", isMobileDevice());

    window.plugin.portalDetailsFull.selectPortal = function(guid) {
        var portal = window.portals[guid];
        if (portal) {
            var latLng = portal.getLatLng();
            window.map.setView(latLng);
            window.renderPortalDetails(guid);
        } else {
            window.portalDetail.request(guid).done(function(data) {
                if (data.latE6 && data.lngE6) {
                    var lat = data.latE6 / 1e6;
                    var lng = data.lngE6 / 1e6;
                    window.zoomToAndShowPortal(guid, [lat, lng]);
                }
            });
        }
    };

    window.plugin.portalDetailsFull.exportToTelegram = function() {
        if (!currentPortalData) {
            return;
        }

        var now = new Date().toLocaleString();
        var telegramContent = '[Date] ' + now + '\n\n';
        telegramContent += '[Portail] **' + currentPortalData.portalName + '**\n';
        telegramContent += '[GUID] `' + currentPortalData.portalGuid + '`\n\n';

        telegramContent += '**Mods:**\n';
        var mods = currentPortalData.mods;
        var hasMods = false;
        var i;
        for (i = 0; i < mods.length; i++) {
            if (mods[i] !== null) {
                hasMods = true;
                var modName = mods[i].name || 'Inconnu';
                var modOwner = mods[i].owner || 'Inconnu';
                var modRarity = mods[i].rarity || 'Inconnue';
                telegramContent += '  - **' + modName + '** (' + modOwner + ', ' + modRarity + ')\n';
            }
        }
        if (!hasMods) {
            telegramContent += '  - Aucun\n';
        }

        telegramContent += '\n**Resonateurs:**\n';
        var resonators = currentPortalData.resonators;
        var hasResonators = false;
        for (i = 0; i < resonators.length; i++) {
            if (resonators[i] !== null) {
                hasResonators = true;
                var resLevel = resonators[i].level || '?';
                var resOwner = resonators[i].owner || 'Inconnu';
                telegramContent += '  - **Niveau ' + resLevel + '** (' + resOwner + ')\n';
            }
        }
        if (!hasResonators) {
            telegramContent += '  - Aucun\n';
        }

        function escapeMarkdown(text) {
            return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
        }

        telegramContent += '\n**Portails relies:**\n';
        var linkedPortals = currentPortalData.linkedPortals;
        if (linkedPortals.length > 0) {
            for (i = 0; i < linkedPortals.length; i++) {
                var link = linkedPortals[i];
                var escapedName = escapeMarkdown(link.name);
                var url = 'https://link.ingress.com/portal/' + link.guid;
                telegramContent += '  - ' + escapedName + '\n' + url + '\n\n';
            }
        } else {
            telegramContent += '  - Aucun\n';
        }

        navigator.clipboard.writeText(telegramContent).then(function() {
            alert("OK - Donnees copiees au format Telegram !");
        }).catch(function(err) {
            console.error("[Full Portal Details] Erreur copie:", err);
            alert("ERREUR - Impossible de copier dans le presse-papiers.");
        });
    };

    window.plugin.portalDetailsFull.loadLinkedPortal = function(linkedPortalGuid, portalGuid) {
        var liId = 'linked-portal-' + linkedPortalGuid.replace(/\./g, '-');
        var li = document.getElementById(liId);
        if (!li) {
            return;
        }

        window.portalDetail.request(linkedPortalGuid).done(function(data) {
            if (li && data && data.title) {
                li.innerHTML = '<b><a href="#" class="portal-link" data-guid="' + linkedPortalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + data.title + '</a></b> (GUID: ' + linkedPortalGuid + ')';
                delete failedPortals[linkedPortalGuid];

                if (currentPortalData) {
                    var linkedList = currentPortalData.linkedPortals;
                    var j;
                    for (j = 0; j < linkedList.length; j++) {
                        if (linkedList[j].guid === linkedPortalGuid) {
                            linkedList[j].name = data.title;
                            break;
                        }
                    }
                }

                var link = li.querySelector('.portal-link');
                if (link) {
                    link.onclick = function(e) {
                        e.preventDefault();
                        window.plugin.portalDetailsFull.selectPortal(linkedPortalGuid);
                    };
                }
            }
        }).fail(function() {
            if (li) {
                li.innerHTML = '<span style="color:red;">Echec du chargement</span> (GUID: ' + linkedPortalGuid + ')';
                failedPortals[linkedPortalGuid] = true;

                if (retryTimers[linkedPortalGuid]) {
                    clearTimeout(retryTimers[linkedPortalGuid]);
                }
                retryTimers[linkedPortalGuid] = setTimeout(function() {
                    window.plugin.portalDetailsFull.loadLinkedPortal(linkedPortalGuid, portalGuid);
                }, 2000);
            }
        });
    };

    window.plugin.portalDetailsFull.showDetailsDialog = function(retryCount) {
        if (!retryCount) {
            retryCount = 0;
        }

        if (!window.selectedPortal) {
            console.log("[Full Portal Details] Aucun portail selectionne");
            return;
        }

        var portal = window.portals[window.selectedPortal];

        if (!portal || !portal.options.data) {
            console.log("[Full Portal Details] Chargement des details du portail...");

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
                        alert("Impossible de charger les details de ce portail.");
                    }
                });
            } else {
                alert("Impossible de charger les details de ce portail.");
            }
            return;
        }

        var details = portal.options.data;
        var portalName = details.title || "Portail inconnu";
        var portalGuid = window.selectedPortal;
        var now = new Date();
        var mods = details.mods || [];
        var resonators = details.resonators || [];

        failedPortals = {};
        var key;
        for (key in retryTimers) {
            clearTimeout(retryTimers[key]);
        }
        retryTimers = {};

        currentPortalData = {
            portalName: portalName,
            portalGuid: portalGuid,
            mods: mods,
            resonators: resonators,
            linkedPortals: []
        };

        var content = '<div id="portal-details-full-content" style="position:relative;">';
        content += '<div style="display:flex; justify-content:space-between; align-items:center;">';
        content += '<h3 style="margin:0;"><u><b>' + now.toLocaleString() + '</b></u></h3>';
        content += '<button id="telegram-copy-btn" style="padding:4px 8px; font-size:14px; cursor:pointer; margin-left:10px;">Export Telegram</button>';
        content += '</div>';

        content += '<h3><b><a href="#" class="portal-link main-portal-link" data-guid="' + portalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + portalName + '</a></b></h3>';
        content += '<p><b>GUID:</b> ' + portalGuid + '</p>';

        content += '<h4><b>Mods</b></h4><ul>';
        var hasMods = false;
        var i;
        for (i = 0; i < mods.length; i++) {
            if (mods[i] !== null) {
                hasMods = true;
                var modName = mods[i].name || "Mod inconnu";
                var modOwner = mods[i].owner || "Inconnu";
                var modRarity = mods[i].rarity || "Inconnue";
                content += '<li><b>' + modName + '</b> (Proprietaire: ' + modOwner + ', Rarete: ' + modRarity + ')</li>';
            }
        }
        if (!hasMods) {
            content += "<li>Aucun</li>";
        }
        content += '</ul>';

        content += '<h4><b>Resonateurs</b></h4><ul>';
        var hasResonators = false;
        for (i = 0; i < resonators.length; i++) {
            if (resonators[i] !== null) {
                hasResonators = true;
                var resLevel = resonators[i].level || "?";
                var resOwner = resonators[i].owner || "Inconnu";
                content += '<li><b>Niveau ' + resLevel + '</b> (Proprietaire: ' + resOwner + ')</li>';
            }
        }
        if (!hasResonators) {
            content += "<li>Aucun</li>";
        }
        content += '</ul>';

        content += '<h4><b>Portails relies</b></h4><ul id="linked-portals-list">';

        var linksFound = false;
        var linkedPortalGuids = [];
        var allLinks = window.links;
        for (var linkId in allLinks) {
            var link = allLinks[linkId];
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                linksFound = true;
                var linkedPortalGuid = (link.options.data.oGuid === portalGuid) ? link.options.data.dGuid : link.options.data.oGuid;
                linkedPortalGuids.push(linkedPortalGuid);
                var liId = 'linked-portal-' + linkedPortalGuid.replace(/\./g, '-');

                var linkedPortal = window.portals[linkedPortalGuid];
                if (linkedPortal && linkedPortal.options.data && linkedPortal.options.data.title) {
                    currentPortalData.linkedPortals.push({
                        name: linkedPortal.options.data.title,
                        guid: linkedPortalGuid
                    });
                    content += '<li id="' + liId + '"><b><a href="#" class="portal-link" data-guid="' + linkedPortalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + linkedPortal.options.data.title + '</a></b> (GUID: ' + linkedPortalGuid + ')</li>';
                } else {
                    currentPortalData.linkedPortals.push({
                        name: "Chargement...",
                        guid: linkedPortalGuid
                    });
                    content += '<li id="' + liId + '"><span style="color:red;">Chargement...</span> (GUID: ' + linkedPortalGuid + ')</li>';
                }
            }
        }

        if (!linksFound) {
            content += "<li>Aucun</li>";
        }

        content += '</ul></div>';

        var isMobile = isMobileDevice();

        var buttons = [];
        
        if (!isMobile) {
            buttons.push({
                text: 'CSV',
                click: function() {
                    alert("Export CSV disponible sur desktop uniquement");
                },
                class: 'export-button-left'
            });
        }
        
        buttons.push({
            text: 'OK',
            click: function() {
                $(this).dialog('close');
            },
            class: 'ok-button-right'
        });

        window.dialog({
            title: 'Full Portal Details - v' + PLUGIN_VERSION,
            html: content,
            width: isMobile ? 'auto' : 400,
            id: 'portal-details-full-dialog',
            buttons: buttons
        });

        setTimeout(function() {
            var telegramBtn = document.getElementById('telegram-copy-btn');
            if (telegramBtn) {
                telegramBtn.onclick = function() {
                    window.plugin.portalDetailsFull.exportToTelegram();
                };
            }

            var dialogButtons = $('.ui-dialog-buttonpane');
            if (dialogButtons.length) {
                dialogButtons.find('button.export-button-left').css({
                    'float': 'left',
                    'margin-right': '5px'
                });
                dialogButtons.find('button.ok-button-right').css({
                    'float': 'right'
                });
            }

            var allPortalLinks = document.querySelectorAll('.portal-link');
            for (var idx = 0; idx < allPortalLinks.length; idx++) {
                allPortalLinks[idx].onclick = function(e) {
                    e.preventDefault();
                    var guid = this.getAttribute('data-guid');
                    window.plugin.portalDetailsFull.selectPortal(guid);
                };
            }
        }, 100);

        for (i = 0; i < linkedPortalGuids.length; i++) {
            var lpGuid = linkedPortalGuids[i];
            var linkedPortal2 = window.portals[lpGuid];
            if (!linkedPortal2 || !linkedPortal2.options.data || !linkedPortal2.options.data.title) {
                window.plugin.portalDetailsFull.loadLinkedPortal(lpGuid, portalGuid);
            }
        }
    };

    window.plugin.portalDetailsFull.addButtonToPortalDetails = function() {
        if (!window.selectedPortal) {
            return;
        }

        console.log("[Full Portal Details] Tentative ajout bouton");

        $('#portal-details-full-btn').remove();

        var portalDetails = $('#portaldetails');
        
        if (portalDetails.length === 0) {
            console.warn("[Full Portal Details] portaldetails introuvable");
            return;
        }

        console.log("[Full Portal Details] portaldetails trouve");

        var button = $('<a></a>');
        button.attr('id', 'portal-details-full-btn');
        button.attr('href', '#');
        button.attr('class', 'plugin-button');
        button.text('Full Portal Details');
        button.css('display', 'block');
        button.css('padding', '8px 12px');
        button.css('margin', '10px 5px');
        button.css('background', '#3874ff');
        button.css('color', 'white');
        button.css('text-decoration', 'none');
        button.css('border-radius', '4px');
        button.css('text-align', 'center');
        button.css('cursor', 'pointer');
        button.css('font-weight', 'bold');
        
        button.on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("[Full Portal Details] Bouton clique");
            window.plugin.portalDetailsFull.showDetailsDialog();
            return false;
        });

        var inserted = false;

        var linkDetails = portalDetails.find('.linkdetails');
        if (linkDetails.length) {
            console.log("[Full Portal Details] Ajout via linkdetails");
            linkDetails.append(button);
            inserted = true;
        }

        if (!inserted) {
            console.log("[Full Portal Details] Ajout direct a portaldetails");
            portalDetails.append(button);
            inserted = true;
        }

        if (inserted) {
            console.log("[Full Portal Details] Bouton ajoute");
        }
    };

    window.addHook('portalDetailsUpdated', function() {
        console.log("[Full Portal Details] Hook declenche");
        setTimeout(function() {
            window.plugin.portalDetailsFull.addButtonToPortalDetails();
        }, 100);
    });

    var setup = function() {
        console.log("[Full Portal Details] Setup");
        
        setTimeout(function() {
            window.plugin.portalDetailsFull.addButtonToPortalDetails();
        }, 2000);
    };

    if (window.iitcLoaded) {
        setup();
    } else if (window.bootPlugins) {
        window.bootPlugins.push(setup);
    } else {
        window.bootPlugins = [setup];
    }

    console.log("[Full Portal Details] Plugin initialise v" + PLUGIN_VERSION);
}

if (window.iitcLoaded) {
    wrapper();
} else {
    if (!window.bootPlugins) {
        window.bootPlugins = [];
    }
    window.bootPlugins.push(wrapper);
}
