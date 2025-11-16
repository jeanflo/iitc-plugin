// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    1.7.2
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.user.js
// @description 1.7.2 Fix Android - Compatible ES5. Affiche les mods, résonateurs et portails reliés. Export Telegram intégré.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
    var PLUGIN_VERSION = "1.7.2";
    var PLUGIN_NAME = "Full Portal Details";

    console.log("[Full Portal Details] Initialisation v" + PLUGIN_VERSION);

    if (typeof window.plugin !== 'function') window.plugin = function() {};
    window.plugin.portalDetailsFull = function() {};

    // Charger ExcelJS
    if (!window.ExcelJS) {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
        document.head.appendChild(script);
    }

    var failedPortals = new Set();
    var retryTimers = {};
    var currentPortalData = null;

    var isMobileDevice = function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.useAndroidPanes !== undefined ||
               (typeof window.isSmartphone === 'function' && window.isSmartphone());
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

    window.plugin.portalDetailsFull.exportToCSV = function() {
        if (!currentPortalData) return;

        var BOM = '\uFEFF';
        var now = new Date().toLocaleString();
        var portalName = currentPortalData.portalName;
        var portalGuid = currentPortalData.portalGuid;

        function toBold(text) {
            var boldMap = {
                '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵',
                'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
                'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
                'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
                'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
                'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
                'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
                'é': '𝗲́', 'è': '𝗲̀', 'ê': '𝗲̂', 'à': '𝗮̀', 'ù': '𝘂̀', 'ç': '𝗰̧'
            };
            return text.split('').map(function(char) {
                return boldMap[char] || char;
            }).join('');
        }

        var csvContent = '';
        csvContent += '"𝗗𝗮𝘁𝗲";"' + toBold(now) + '"\n';
        csvContent += '"𝗣𝗼𝗿𝘁𝗮𝗶𝗹";"' + portalName + '"\n';
        csvContent += '"𝗚𝗨𝗜𝗗";"' + portalGuid + '"\n\n';

        csvContent += '"𝗠𝗢𝗗𝗦"\n';
        csvContent += '"𝗡𝗼𝗺";"𝗣𝗿𝗼𝗽𝗿𝗶𝗲́𝘁𝗮𝗶𝗿𝗲";"𝗥𝗮𝗿𝗲𝘁é"\n';
        var filteredMods = currentPortalData.mods.filter(function(mod) { return mod !== null; });
        if (filteredMods.length) {
            filteredMods.forEach(function(mod) {
                csvContent += '"' + (mod.name || 'Inconnu') + '";"' + (mod.owner || 'Inconnu') + '";"' + (mod.rarity || 'Inconnue') + '"\n';
            });
        } else {
            csvContent += '"Aucun";"";"";\n';
        }
        csvContent += '\n';

        csvContent += '"𝗥𝗘́𝗦𝗢𝗡𝗔𝗧𝗘𝗨𝗥𝗦"\n';
        csvContent += '"𝗡𝗶𝘃𝗲𝗮𝘂";"𝗣𝗿𝗼𝗽𝗿𝗶𝗲́𝘁𝗮𝗶𝗿𝗲"\n';
        var filteredRes = currentPortalData.resonators.filter(function(res) { return res !== null; });
        if (filteredRes.length) {
            filteredRes.forEach(function(res) {
                csvContent += '"Niveau ' + (res.level || '?') + '";"' + (res.owner || 'Inconnu') + '"\n';
            });
        } else {
            csvContent += '"Aucun";"";\n';
        }
        csvContent += '\n';

        csvContent += '"𝗣𝗢𝗥𝗧𝗔𝗜𝗟𝗦 𝗥𝗘𝗟𝗜𝗘́𝗦"\n';
        csvContent += '"𝗡𝗼𝗺 𝗱𝘂 𝗽𝗼𝗿𝘁𝗮𝗶𝗹";"𝗚𝗨𝗜𝗗"\n';
        if (currentPortalData.linkedPortals.length) {
            currentPortalData.linkedPortals.forEach(function(link) {
                csvContent += '"' + link.name + '";"' + link.guid + '"\n';
            });
        } else {
            csvContent += '"Aucun";"";\n';
        }

        var blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = portalName.replace(/[^a-z0-9]/gi, '_') + '_details.csv';
        link.click();
    };

    window.plugin.portalDetailsFull.exportToTXT = function() {
        if (!currentPortalData) return;

        var now = new Date().toLocaleString();
        var txtContent = now + '\n\n';
        txtContent += '📍 ' + currentPortalData.portalName + '\n';
        txtContent += 'GUID: ' + currentPortalData.portalGuid + '\n\n';

        txtContent += '🔧 Mods:\n';
        var filteredMods = currentPortalData.mods.filter(function(mod) { return mod !== null; });
        if (filteredMods.length) {
            filteredMods.forEach(function(mod) {
                txtContent += '  • ' + (mod.name || 'Inconnu') + ' (Propriétaire: ' + (mod.owner || 'Inconnu') + ', Rareté: ' + (mod.rarity || 'Inconnue') + ')\n';
            });
        } else {
            txtContent += '  • Aucun\n';
        }

        txtContent += '\n⚡ Résonateurs:\n';
        var filteredRes = currentPortalData.resonators.filter(function(res) { return res !== null; });
        if (filteredRes.length) {
            filteredRes.forEach(function(res) {
                txtContent += '  • Niveau ' + (res.level || '?') + ' (Propriétaire: ' + (res.owner || 'Inconnu') + ')\n';
            });
        } else {
            txtContent += '  • Aucun\n';
        }

        txtContent += '\n🔗 Portails reliés:\n';
        if (currentPortalData.linkedPortals.length) {
            currentPortalData.linkedPortals.forEach(function(link) {
                txtContent += '  • ' + link.name + ' (' + link.guid + ')\n';
            });
        } else {
            txtContent += '  • Aucun\n';
        }

        var blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = currentPortalData.portalName.replace(/[^a-z0-9]/gi, '_') + '_details.txt';
        link.click();
    };

    window.plugin.portalDetailsFull.exportToTelegram = function() {
        if (!currentPortalData) return;

        var now = new Date().toLocaleString();
        var telegramContent = '📅 ' + now + '\n\n';
        telegramContent += '📍 **' + currentPortalData.portalName + '**\n';
        telegramContent += '🆔 `' + currentPortalData.portalGuid + '`\n\n';

        telegramContent += '🔧 **Mods:**\n';
        var filteredMods = currentPortalData.mods.filter(function(mod) { return mod !== null; });
        if (filteredMods.length) {
            filteredMods.forEach(function(mod) {
                telegramContent += '  • **' + (mod.name || 'Inconnu') + '** (' + (mod.owner || 'Inconnu') + ', ' + (mod.rarity || 'Inconnue') + ')\n';
            });
        } else {
            telegramContent += '  • Aucun\n';
        }

        telegramContent += '\n⚡ **Résonateurs:**\n';
        var filteredRes = currentPortalData.resonators.filter(function(res) { return res !== null; });
        if (filteredRes.length) {
            filteredRes.forEach(function(res) {
                telegramContent += '  • **Niveau ' + (res.level || '?') + '** (' + (res.owner || 'Inconnu') + ')\n';
            });
        } else {
            telegramContent += '  • Aucun\n';
        }

        function escapeMarkdown(text) {
            return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
        }

        telegramContent += '\n🔗 **Portails reliés:**\n';
        if (currentPortalData.linkedPortals.length) {
            currentPortalData.linkedPortals.forEach(function(link) {
                var escapedName = escapeMarkdown(link.name);
                var url = 'https://link.ingress.com/portal/' + link.guid;
                telegramContent += '  • ' + escapedName + '\n' + url + '\n\n';
            });
        } else {
            telegramContent += '  • Aucun\n';
        }

        navigator.clipboard.writeText(telegramContent).then(function() {
            alert("✅ Données copiées au format Telegram !\nCollez directement dans votre groupe Telegram.");
        }).catch(function(err) {
            console.error("[Full Portal Details] Erreur lors de la copie : ", err);
            alert("❌ Impossible de copier dans le presse-papiers.");
        });
    };

    window.plugin.portalDetailsFull.exportToExcel = function() {
        if (!currentPortalData) return;

        if (typeof ExcelJS === 'undefined') {
            alert("⏳ Chargement de la bibliothèque Excel en cours...\nRéessayez dans 2 secondes.");
            return;
        }

        var now = new Date().toLocaleString();
        var portalName = currentPortalData.portalName;
        var portalGuid = currentPortalData.portalGuid;

        var workbook = new ExcelJS.Workbook();
        var worksheet = workbook.addWorksheet('Détails Portail');

        var headerStyle = {
            font: { bold: true, size: 12 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }
        };

        var titleStyle = {
            font: { bold: true, size: 14 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
        };

        var labelStyle = {
            font: { bold: true, size: 11 },
            alignment: { horizontal: 'center', vertical: 'middle' }
        };

        var row = worksheet.addRow(['Date', now]);
        row.getCell(1).style = labelStyle;
        row.getCell(2).style = { alignment: { horizontal: 'center' }, font: { bold: true } };

        row = worksheet.addRow(['Portail', portalName]);
        row.getCell(1).style = labelStyle;
        row.getCell(2).style = { alignment: { horizontal: 'center' } };

        row = worksheet.addRow(['GUID', portalGuid]);
        row.getCell(1).style = labelStyle;
        row.getCell(2).style = { alignment: { horizontal: 'center' } };

        worksheet.addRow([]);

        row = worksheet.addRow(['MODS']);
        worksheet.mergeCells('A' + row.number + ':C' + row.number);
        row.getCell(1).style = titleStyle;

        row = worksheet.addRow(['Nom', 'Propriétaire', 'Rareté']);
        row.eachCell(function(cell) { cell.style = headerStyle; });

        var filteredMods = currentPortalData.mods.filter(function(mod) { return mod !== null; });
        if (filteredMods.length) {
            filteredMods.forEach(function(mod) {
                worksheet.addRow([mod.name || 'Inconnu', mod.owner || 'Inconnu', mod.rarity || 'Inconnue']);
            });
        } else {
            worksheet.addRow(['Aucun', '', '']);
        }

        worksheet.addRow([]);

        row = worksheet.addRow(['RÉSONATEURS']);
        worksheet.mergeCells('A' + row.number + ':B' + row.number);
        row.getCell(1).style = titleStyle;

        row = worksheet.addRow(['Niveau', 'Propriétaire']);
        row.eachCell(function(cell) { cell.style = headerStyle; });

        var filteredRes = currentPortalData.resonators.filter(function(res) { return res !== null; });
        if (filteredRes.length) {
            filteredRes.forEach(function(res) {
                worksheet.addRow(['Niveau ' + (res.level || '?'), res.owner || 'Inconnu']);
            });
        } else {
            worksheet.addRow(['Aucun', '']);
        }

        worksheet.addRow([]);

        row = worksheet.addRow(['PORTAILS RELIÉS']);
        worksheet.mergeCells('A' + row.number + ':B' + row.number);
        row.getCell(1).style = titleStyle;

        row = worksheet.addRow(['Nom du portail', 'GUID']);
        row.eachCell(function(cell) { cell.style = headerStyle; });

        if (currentPortalData.linkedPortals.length) {
            currentPortalData.linkedPortals.forEach(function(link) {
                worksheet.addRow([link.name, link.guid]);
            });
        } else {
            worksheet.addRow(['Aucun', '']);
        }

        worksheet.columns = [
            { width: 45 },
            { width: 45 },
            { width: 20 }
        ];

        workbook.xlsx.writeBuffer().then(function(buffer) {
            var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = portalName.replace(/[^a-z0-9]/gi, '_') + '_details.xlsx';
            link.click();
        }).catch(function(err) {
            console.error('[Full Portal Details] Erreur export Excel:', err);
            alert('❌ Erreur lors de l\'export Excel');
        });
    };

    window.plugin.portalDetailsFull.loadLinkedPortal = function(linkedPortalGuid, portalGuid) {
        var liId = 'linked-portal-' + linkedPortalGuid.replace(/\./g, '-');
        var li = document.getElementById(liId);
        if (!li) return;

        window.portalDetail.request(linkedPortalGuid).done(function(data) {
            if (li && data && data.title) {
                li.innerHTML = '<b><a href="#" class="portal-link" data-guid="' + linkedPortalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + data.title + '</a></b> (GUID: ' + linkedPortalGuid + ')';
                failedPortals.delete(linkedPortalGuid);

                if (currentPortalData) {
                    var linkIndex = currentPortalData.linkedPortals.findIndex(function(l) { return l.guid === linkedPortalGuid; });
                    if (linkIndex !== -1) {
                        currentPortalData.linkedPortals[linkIndex].name = data.title;
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
                li.innerHTML = '<span style="color:red;">Échec du chargement</span> (GUID: ' + linkedPortalGuid + ')';
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
            console.log("[Full Portal Details] Aucun portail sélectionné");
            return;
        }

        var portal = window.portals[window.selectedPortal];

        if (!portal || !portal.options.data) {
            console.log("[Full Portal Details] Chargement des détails du portail...");

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

        var details = portal.options.data;
        var portalName = details.title || "Portail inconnu";
        var portalGuid = window.selectedPortal;
        var now = new Date();
        var mods = details.mods || [];
        var resonators = details.resonators || [];

        failedPortals.clear();
        Object.keys(retryTimers).forEach(function(key) { clearTimeout(retryTimers[key]); });
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
        content += '<button id="telegram-copy-btn" style="padding:4px 8px; font-size:14px; cursor:pointer; margin-left:10px;">✈️ Export To Telegram</button>';
        content += '</div>';

        content += '<h3><b><a href="#" class="portal-link main-portal-link" data-guid="' + portalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + portalName + '</a></b></h3>';
        content += '<p><b>GUID:</b> ' + portalGuid + '</p>';

        content += '<h4><b>Mods</b></h4><ul>';
        var filteredMods = mods.filter(function(mod) { return mod !== null; });
        content += filteredMods.length
            ? filteredMods.map(function(mod) { return '<li><b>' + (mod.name || "Mod inconnu") + '</b> (Propriétaire: ' + (mod.owner || "Inconnu") + ', Rareté: ' + (mod.rarity || "Inconnue") + ')</li>'; }).join('')
            : "<li>Aucun</li>";
        content += '</ul>';

        content += '<h4><b>Résonateurs</b></h4><ul>';
        var filteredRes = resonators.filter(function(res) { return res !== null; });
        content += filteredRes.length
            ? filteredRes.map(function(res) { return '<li><b>Niveau ' + (res.level || "?") + '</b> (Propriétaire: ' + (res.owner || "Inconnu") + ')</li>'; }).join('')
            : "<li>Aucun</li>";
        content += '</ul>';

        content += '<h4><b>Portails reliés</b></h4><ul id="linked-portals-list">';

        var linksFound = false;
        var linkedPortalGuids = [];
        Object.values(window.links).forEach(function(link) {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                linksFound = true;
                var linkedPortalGuid = (link.options.data.oGuid === portalGuid) ? link.options.data.dGuid : link.options.data.oGuid;
                linkedPortalGuids.push(linkedPortalGuid);
                var liId = 'linked-portal-' + linkedPortalGuid.replace(/\./g, '-');

                var linkedPortal = window.portals[linkedPortalGuid];
                if (linkedPortal && linkedPortal.options.data && linkedPortal.options.data.title) {
                    currentPortalData.linkedPortals.push({ name: linkedPortal.options.data.title, guid: linkedPortalGuid });
                    content += '<li id="' + liId + '"><b><a href="#" class="portal-link" data-guid="' + linkedPortalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + linkedPortal.options.data.title + '</a></b> (GUID: ' + linkedPortalGuid + ')</li>';
                } else {
                    currentPortalData.linkedPortals.push({ name: "Chargement...", guid: linkedPortalGuid });
                    content += '<li id="' + liId + '"><span style="color:red;">Chargement...</span> (GUID: ' + linkedPortalGuid + ')</li>';
                }
            }
        });

        if (!linksFound) {
            content += "<li>Aucun</li>";
        }

        content += '</ul></div>';

        var isMobile = isMobileDevice();

        var buttons = [
            {
                text: '📊 CSV',
                click: function() { window.plugin.portalDetailsFull.exportToCSV(); },
                class: 'export-button-left'
            },
            {
                text: '📄 TXT',
                click: function() { window.plugin.portalDetailsFull.exportToTXT(); },
                class: 'export-button-left'
            },
            {
                text: '📗 Excel',
                click: function() { window.plugin.portalDetailsFull.exportToExcel(); },
                class: 'export-button-left'
            },
            {
                text: 'OK',
                click: function() { $(this).dialog('close'); },
                class: 'ok-button-right'
            }
        ];

        if (isMobile) {
            buttons = buttons.filter(function(b) {
                return b.text !== '📊 CSV' && b.text !== '📄 TXT' && b.text !== '📗 Excel';
            });
        }

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

            document.querySelectorAll('.portal-link').forEach(function(link) {
                link.onclick = function(e) {
                    e.preventDefault();
                    var guid = this.getAttribute('data-guid');
                    window.plugin.portalDetailsFull.selectPortal(guid);
                };
            });
        }, 100);

        linkedPortalGuids.forEach(function(linkedPortalGuid) {
            var linkedPortal = window.portals[linkedPortalGuid];
            if (!linkedPortal || !linkedPortal.options.data || !linkedPortal.options.data.title) {
                window.plugin.portalDetailsFull.loadLinkedPortal(linkedPortalGuid, portalGuid);
            }
        });
    };

    // AJOUT DU BOUTON - Compatible Android
    window.plugin.portalDetailsFull.addButtonToPortalDetails = function() {
        if (!window.selectedPortal) return;

        console.log("[Full Portal Details] Tentative d'ajout du bouton");

        // Supprimer l'ancien bouton s'il existe
        $('#portal-details-full-btn').remove();

        // Essayer plusieurs emplacements possibles
        var portalDetails = $('#portaldetails');

        if (portalDetails.length === 0) {
            console.warn("[Full Portal Details] #portaldetails introuvable");
            return;
        }

        console.log("[Full Portal Details] #portaldetails trouvé");

        // Créer le bouton avec jQuery
        var button = $('<a>')
            .attr({
                'id': 'portal-details-full-btn',
                'href': '#',
                'class': 'plugin-button'
            })
            .text('Full Portal Details')
            .css({
                'display': 'block',
                'padding': '8px 12px',
                'margin': '10px 5px',
                'background': '#3874ff',
                'color': 'white',
                'text-decoration': 'none',
                'border-radius': '4px',
                'text-align': 'center',
                'cursor': 'pointer',
                'font-weight': 'bold'
            })
            .on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("[Full Portal Details] Bouton cliqué");
                window.plugin.portalDetailsFull.showDetailsDialog();
                return false;
            });

        // Tenter plusieurs méthodes d'insertion
        var inserted = false;

        // Méthode 1: Chercher .linkdetails dans portaldetails
        var linkDetails = portalDetails.find('.linkdetails');
        if (linkDetails.length) {
            console.log("[Full Portal Details] Ajout via .linkdetails");
            linkDetails.append(button);
            inserted = true;
        }

        // Méthode 2: Ajouter directement à portaldetails
        if (!inserted) {
            console.log("[Full Portal Details] Ajout direct à #portaldetails");
            portalDetails.append(button);
            inserted = true;
        }

        if (inserted) {
            console.log("[Full Portal Details] Bouton ajouté avec succès");
        }
    };

    // Hook sur portalDetailsUpdated - méthode standard IITC
    window.addHook('portalDetailsUpdated', function() {
        console.log("[Full Portal Details] Hook portalDetailsUpdated déclenché");
        setTimeout(function() {
            window.plugin.portalDetailsFull.addButtonToPortalDetails();
        }, 100);
    });

    // Setup pour IITC
    var setup = function() {
        console.log("[Full Portal Details] Setup appelé");

        // Attendre que le DOM soit prêt
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

    console.log("[Full Portal Details] Plugin initialisé v" + PLUGIN_VERSION);
}

// Initialisation
if (window.iitcLoaded) {
    wrapper();
} else {
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(wrapper);
}
