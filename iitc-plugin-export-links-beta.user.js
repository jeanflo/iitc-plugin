// ==UserScript==
// @id         iitc-plugin-export-links-beta
// @name       IITC plugin: Export Portal Links beta
// @category   Info
// @version    0.2.1
// @namespace  https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-export-links-beta
// @updateURL  https://github.com/jeanflo/iitc-plugin/blob/main/export-links-beta.meta.js
// @downloadURL https://github.com/jeanflo/iitc-plugin/blob/main/export-links-beta.user.js
// @description Export links, mods and resonators from a selected portal (including mod rarity).
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper() {
    if (typeof window.plugin !== 'function') window.plugin = function() {};
    window.plugin.exportPortalLinks = function() {};

    // Ajoute le bouton "Export Links" dans les détails du portail
    window.plugin.exportPortalLinks.addExportButton = function() {
        if (!window.portalDetail || !window.selectedPortal) return;
        const portal = window.portals[window.selectedPortal];
        if (!portal) return;
        const details = portal.options.data;
        const portalName = details.title || "Unknown Portal";
        const portalGuid = window.selectedPortal;
        const container = document.createElement("div");
        container.className = "export-links-container";
        const button = document.createElement("button");
        button.textContent = "Export Links";
        button.style.display = "block";
        button.style.margin = "5px auto";
        button.onclick = function() {
            window.plugin.exportPortalLinks.showExportDialog(portalName, portalGuid);
        };
        container.appendChild(button);
        document.querySelector(".linkdetails")?.appendChild(container);
    };

    // Affiche la boîte de dialogue d'export et force le chargement des portails liés
    window.plugin.exportPortalLinks.showExportDialog = function(portalName, portalGuid) {
    let linksData = [];
    let links = window.links;
    Object.values(links).forEach(link => {
        if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
            let linkedPortalGuid = (link.options.data.oGuid === portalGuid) ? link.options.data.dGuid : link.options.data.oGuid;
            let linkedPortalName = window.portals[linkedPortalGuid]?.options.data.title || "Unknown Portal";
            linksData.push({ name: linkedPortalName, guid: linkedPortalGuid });
            // Charger les détails sans changer le portail sélectionné
            if (!window.portals[linkedPortalGuid]?.options.data.mods) {
                window.requestPortalDetails(linkedPortalGuid);
            }
        }
    });

    // ... (reste du code inchangé)
};
        let selectedPortalData = window.portals[portalGuid] ? window.portals[portalGuid].options.data : null;
        let mods = (selectedPortalData && selectedPortalData.mods) ? selectedPortalData.mods : [];
        let resonators = (selectedPortalData && selectedPortalData.resonators) ? selectedPortalData.resonators : [];

        let content = `<h3><b>${portalName}</b> (${portalGuid})</h3><br>`;
        content += `<h4>Mods</h4><ul>`;
        if (mods.length === 0) {
            content += `<li>None</li>`;
        } else {
            mods.forEach(mod => {
                content += `<li><b>${mod.name || "Unknown Mod"}</b> (Owner: ${mod.owner || "Unknown"}; Rarity: ${mod.rarity || "Unknown"})</li>`;
            });
        }
        content += `</ul>`;
        content += `<h4>Resonators</h4><ul>`;
        if (resonators.length === 0) {
            content += `<li>None</li>`;
        } else {
            resonators.forEach(res => {
                content += `<li><b>Level ${res.level || "?"}</b> (Owner: ${res.owner || "Unknown"})</li>`;
            });
        }
        content += `</ul>`;
        content += `<h4>Linked Portals</h4><ul>`;
        if (linksData.length === 0) {
            content += `<li>None</li>`;
        } else {
            linksData.forEach(link => {
                content += `<li><b>${link.name}</b> (${link.guid})</li>`;
            });
        }
        content += `</ul>`;
        content += `<button onclick="window.plugin.exportPortalLinks.copyToClipboard()">Copy</button>`;
        content += `<button onclick="window.plugin.exportPortalLinks.downloadFile('txt')">Download TXT</button>`;
        content += `<button onclick="window.plugin.exportPortalLinks.downloadFile('csv')">Download CSV</button>`;
        window.dialog({
            title: "Export Portal Links",
            html: content,
            width: 400
        });
        window.plugin.exportPortalLinks.currentData = { portalName, portalGuid, mods, resonators, linksData };
    };

    // Copie les informations dans le presse-papier avec un message temporaire
    window.plugin.exportPortalLinks.copyToClipboard = function() {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        let text = `**Selected Portal:**\n**${portalName}** (${portalGuid})\n\n`;
        text += `Mods:\n`;
        if (mods.length === 0) {
            text += "None\n";
        } else {
            mods.forEach(mod => {
                text += `**${mod.name || "Unknown Mod"}** (Owner: ${mod.owner || "Unknown"}; Rarity: ${mod.rarity || "Unknown"})\n`;
            });
        }
        text += `\nResonators:\n`;
        if (resonators.length === 0) {
            text += "None\n";
        } else {
            resonators.forEach(res => {
                text += `**Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})\n`;
            });
        }
        text += `\nLinked Portals:\n`;
        if (linksData.length === 0) {
            text += "None\n";
        } else {
            linksData.forEach(link => {
                text += `**${link.name}** (${link.guid})\n`;
            });
        }
        navigator.clipboard.writeText(text).then(() => {
            const message = document.createElement("div");
            message.textContent = "Copied to clipboard!";
            message.style.position = "fixed";
            message.style.bottom = "10px";
            message.style.left = "50%";
            message.style.transform = "translateX(-50%)";
            message.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
            message.style.color = "white";
            message.style.padding = "10px";
            message.style.borderRadius = "5px";
            message.style.zIndex = "1000";
            document.body.appendChild(message);
            setTimeout(() => document.body.removeChild(message), 2000);
        });
    };

    // Télécharge les données au format TXT ou CSV avec compatibilité Excel et UTF-8
    window.plugin.exportPortalLinks.downloadFile = function(format) {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        const now = new Date();
        const filename = `${portalName} - ${now.toLocaleDateString().replace(/\//g, "-")} - ${now.toLocaleTimeString().replace(/:/g, "-")}.${format}`;
        let content;
        if (format === "csv") {
            // Construction du CSV avec BOM, sections distinctes et colonnes séparées pour Excel
            const bom = "\uFEFF"; // Byte Order Mark pour Excel
            // Utilisation du séparateur virgule ou ';' selon les préférences
            content = bom;
            content += `"Selected Portal","Portal GUID"\n`;
            content += `"${portalName}","${portalGuid}"\n\n`;
            content += `"Mods"\n"Mod Name","Owner","Rarity"\n`;
            if (mods.length === 0) {
                content += `None,,\n\n`;
            } else {
                mods.forEach(mod => {
                    content += `"${mod.name || "Unknown Mod"}","${mod.owner || "Unknown"}","${mod.rarity || "Unknown"}"\n`;
                });
                content += `\n`;
            }
            content += `"Resonators"\n"Level","Owner"\n`;
            if (resonators.length === 0) {
                content += `None,\n\n`;
            } else {
                resonators.forEach(res => {
                    content += `"Level ${res.level || "?"}","${res.owner || "Unknown"}"\n`;
                });
                content += `\n`;
            }
            content += `"Linked Portals"\n"Portal Name","Portal GUID"\n`;
            if (linksData.length === 0) {
                content += `None,\n`;
            } else {
                linksData.forEach(link => {
                    content += `"${link.name}","${link.guid}"\n`;
                });
            }
        } else {
            // Construction du TXT
            content = `Selected Portal:\n**${portalName}** (${portalGuid})\n\n`;
            content += `Mods:\n`;
            if (mods.length === 0) {
                content += "None\n";
            } else {
                mods.forEach(mod => {
                    content += `**${mod.name || "Unknown Mod"}** (Owner: ${mod.owner || "Unknown"}; Rarity: ${mod.rarity || "Unknown"})\n`;
                });
            }
            content += `\nResonators:\n`;
            if (resonators.length === 0) {
                content += "None\n";
            } else {
                resonators.forEach(res => {
                    content += `**Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})\n`;
                });
            }
            content += `\nLinked Portals:\n`;
            if (linksData.length === 0) {
                content += "None\n";
            } else {
                linksData.forEach(link => {
                    content += `**${link.name}** (${link.guid})\n`;
                });
            }
        }
        const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;" });
        if (typeof android !== "undefined" && android && android.saveFile) {
            android.saveFile(filename, blob);
        } else {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    let setup = function() {
        window.addHook('portalDetailsUpdated', window.plugin.exportPortalLinks.addExportButton);
    };

    setup.info = {
        script: {
            version: "0.2.0",
            name: "Export Portal Links",
            description: "Export links, mods (with rarity) and resonators from a selected portal."
        }
    };

    if (window.iitcLoaded) {
        setup();
    } else {
        window.bootPlugins = window.bootPlugins || [];
        window.bootPlugins.push(setup);
    }
}
var script = document.createElement("script");
script.appendChild(document.createTextNode("(" + wrapper + ")();"));
(document.body || document.head || document.documentElement).appendChild(script);
