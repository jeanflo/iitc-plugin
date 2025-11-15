// ==UserScript==
// @id         iitc-plugin-portal-details-full
// @name       IITC plugin: Portal Details Full
// @category   Info
// @version    1.6.2
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin-portal-details-full.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin-portal-details-full.user.js
// @description Affiche les mods, résonateurs (niveau & propriétaire), et les portails reliés (nom + GUID) du portail sélectionné. Export CSV/TXT/Excel et Telegram disponibles. Boutons d’export désactivés sur mobile.
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

    // Charger ExcelJS si pas déjà présent
    if (!window.ExcelJS) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
        document.head.appendChild(script);
    }

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

    window.plugin.portalDetailsFull.exportToCSV = function() {
        if (!currentPortalData) return;

        const BOM = '\uFEFF';
        const now = new Date().toLocaleString();
        const portalName = currentPortalData.portalName;
        const portalGuid = currentPortalData.portalGuid;

        function toBold(text) {
            const boldMap = {
                '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵',
                'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
                'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
                'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
                'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
                'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
                'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
                'é': '𝗲́', 'è': '𝗲̀', 'ê': '𝗲̂', 'à': '𝗮̀', 'ù': '𝘂̀', 'ç': '𝗰̧'
            };
            return text.split('').map(char => boldMap[char] || char).join('');
        }

        let csvContent = '';
        csvContent += `"𝗗𝗮𝘁𝗲";"${toBold(now)}"\n`;
        csvContent += `"𝗣𝗼𝗿𝘁𝗮𝗶𝗹";"${portalName}"\n`;
        csvContent += `"𝗚𝗨𝗜𝗗";"${portalGuid}"\n\n`;

        csvContent += '"𝗠𝗢𝗗𝗦"\n';
        csvContent += '"𝗡𝗼𝗺";"𝗣𝗿𝗼𝗽𝗿𝗶𝗲́𝘁𝗮𝗶𝗿𝗲";"𝗥𝗮𝗿𝗲𝘁é"\n';
        let filteredMods = currentPortalData.mods.filter(mod => mod !== null);
        if (filteredMods.length) {
            filteredMods.forEach(mod => {
                csvContent += `"${mod.name || 'Inconnu'}";"${mod.owner || 'Inconnu'}";"${mod.rarity || 'Inconnue'}"\n`;
            });
        } else {
            csvContent += '"Aucun";"";"";\n';
        }
        csvContent += '\n';

        csvContent += '"𝗥𝗘́𝗦𝗢𝗡𝗔𝗧𝗘𝗨𝗥𝗦"\n';
        csvContent += '"𝗡𝗶𝘃𝗲𝗮𝘂";"𝗣𝗿𝗼𝗽𝗿𝗶𝗲́𝘁𝗮𝗶𝗿𝗲"\n';
        let filteredRes = currentPortalData.resonators.filter(res => res !== null);
        if (filteredRes.length) {
            filteredRes.forEach(res => {
                csvContent += `"Niveau ${res.level || '?'}";"${res.owner || 'Inconnu'}"\n`;
            });
        } else {
            csvContent += '"Aucun";"";\n';
        }
        csvContent += '\n';

        csvContent += '"𝗣𝗢𝗥𝗧𝗔𝗜𝗟𝗦 𝗥𝗘𝗟𝗜𝗘́𝗦"\n';
        csvContent += '"𝗡𝗼𝗺 𝗱𝘂 𝗽𝗼𝗿𝘁𝗮𝗶𝗹";"𝗚𝗨𝗜𝗗"\n';
        if (currentPortalData.linkedPortals.length) {
            currentPortalData.linkedPortals.forEach(link => {
                csvContent += `"${link.name}";"${link.guid}"\n`;
            });
        } else {
            csvContent += '"Aucun";"";\n';
        }

        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${portalName.replace(/[^a-z0-9]/gi, '_')}_details.csv`;
        link.click();
    };

    window.plugin.portalDetailsFull.exportToTXT = function() {
        if (!currentPortalData) return;

        const now = new Date().toLocaleString();
        let txtContent = `${now}\n\n`;
        txtContent += `📍 ${currentPortalData.portalName}\n`;
        txtContent += `GUID: ${currentPortalData.portalGuid}\n\n`;

        txtContent += `🔧 Mods:\n`;
        let filteredMods = currentPortalData.mods.filter(mod => mod !== null);
        if (filteredMods.length) {
            filteredMods.forEach(mod => {
                txtContent += `  • ${mod.name || 'Inconnu'} (Propriétaire: ${mod.owner || 'Inconnu'}, Rareté: ${mod.rarity || 'Inconnue'})\n`;
            });
        } else {
            txtContent += `  • Aucun\n`;
        }

        txtContent += `\n⚡ Résonateurs:\n`;
        let filteredRes = currentPortalData.resonators.filter(res => res !== null);
        if (filteredRes.length) {
            filteredRes.forEach(res => {
                txtContent += `  • Niveau ${res.level || '?'} (Propriétaire: ${res.owner || 'Inconnu'})\n`;
            });
        } else {
            txtContent += `  • Aucun\n`;
        }

        txtContent += `\n🔗 Portails reliés:\n`;
        if (currentPortalData.linkedPortals.length) {
            currentPortalData.linkedPortals.forEach(link => {
                txtContent += `  • ${link.name} (${link.guid})\n`;
            });
        } else {
            txtContent += `  • Aucun\n`;
        }

        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentPortalData.portalName.replace(/[^a-z0-9]/gi, '_')}_details.txt`;
        link.click();
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
            console.error("Erreur lors de la copie : ", err);
            alert("❌ Impossible de copier dans le presse-papiers.");
        });
    };

    window.plugin.portalDetailsFull.exportToExcel = function() {
        if (!currentPortalData) return;

        if (typeof ExcelJS === 'undefined') {
            alert("⏳ Chargement de la bibliothèque Excel en cours...\nRéessayez dans 2 secondes.");
            return;
        }

        const now = new Date().toLocaleString();
        const portalName = currentPortalData.portalName;
        const portalGuid = currentPortalData.portalGuid;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Détails Portail');

        const headerStyle = {
            font: { bold: true, size: 12 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }
        };

        const titleStyle = {
            font: { bold: true, size: 14 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
        };

        const labelStyle = {
            font: { bold: true, size: 11 },
            alignment: { horizontal: 'center', vertical: 'middle' }
        };

        let row = worksheet.addRow(['Date', now]);
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
        worksheet.mergeCells(`A${row.number}:C${row.number}`);
        row.getCell(1).style = titleStyle;

        row = worksheet.addRow(['Nom', 'Propriétaire', 'Rareté']);
        row.eachCell(cell => cell.style = headerStyle);

        let filteredMods = currentPortalData.mods.filter(mod => mod !== null);
        if (filteredMods.length) {
            filteredMods.forEach(mod => {
                worksheet.addRow([mod.name || 'Inconnu', mod.owner || 'Inconnu', mod.rarity || 'Inconnue']);
            });
        } else {
            worksheet.addRow(['Aucun', '', '']);
        }

        worksheet.addRow([]);

        row = worksheet.addRow(['RÉSONATEURS']);
        worksheet.mergeCells(`A${row.number}:B${row.number}`);
        row.getCell(1).style = titleStyle;

        row = worksheet.addRow(['Niveau', 'Propriétaire']);
        row.eachCell(cell => cell.style = headerStyle);

        let filteredRes = currentPortalData.resonators.filter(res => res !== null);
        if (filteredRes.length) {
            filteredRes.forEach(res => {
                worksheet.addRow([`Niveau ${res.level || '?'}`, res.owner || 'Inconnu']);
            });
        } else {
            worksheet.addRow(['Aucun', '']);
        }

        worksheet.addRow([]);

        row = worksheet.addRow(['PORTAILS RELIÉS']);
        worksheet.mergeCells(`A${row.number}:B${row.number}`);
        row.getCell(1).style = titleStyle;

        row = worksheet.addRow(['Nom du portail', 'GUID']);
        row.eachCell(cell => cell.style = headerStyle);

        if (currentPortalData.linkedPortals.length) {
            currentPortalData.linkedPortals.forEach(link => {
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

        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${portalName.replace(/[^a-z0-9]/gi, '_')}_details.xlsx`;
            link.click();
        }).catch(err => {
            console.error('Erreur export Excel:', err);
            alert('❌ Erreur lors de l\'export Excel');
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

        // Détection simple mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Liste des boutons
        let buttons = [
            {
                text: '📊 CSV',
                click: function() {
                    window.plugin.portalDetailsFull.exportToCSV();
                },
                class: 'export-button-left'
            },
            {
                text: '📄 TXT',
                click: function() {
                    window.plugin.portalDetailsFull.exportToTXT();
                },
                class: 'export-button-left'
            },
            {
                text: '📗 Excel',
                click: function() {
                    window.plugin.portalDetailsFull.exportToExcel();
                },
                class: 'export-button-left'
            },
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
        ];

        // Sur mobile, retirer les boutons CSV, TXT, Excel
        if (isMobile) {
            buttons = buttons.filter(b =>
                b.text !== '📊 CSV' && b.text !== '📄 TXT' && b.text !== '📗 Excel'
            );
        }

        let dialogOptions = {
            title: `Détails du portail`,
            html: content,
            width: 400,
            id: 'portal-details-full-dialog',
            buttons: buttons
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
