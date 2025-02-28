// ==UserScript==
// @id         iitc-plugin-export-links-beta
// @name       IITC plugin: Export Portal Links beta
// @category   Info
// @version    0.2.5
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

    window.plugin.exportPortalLinks.showExportDialog = function(portalName, portalGuid) {
        let linksData = [];
        let links = window.links;

        Object.values(links).forEach(link => {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                let linkedPortalGuid = (link.options.data.oGuid === portalGuid) ? link.options.data.dGuid : link.options.data.oGuid;
                let linkedPortalName = window.portals[linkedPortalGuid]?.options.data.title || "Unknown Portal";
                linksData.push({ name: linkedPortalName, guid: linkedPortalGuid });

                if (!window.portals[linkedPortalGuid] || !window.portals[linkedPortalGuid].options.data.mods) {
                    if (typeof window.requestPortalDetails === "function" && linkedPortalGuid !== portalGuid) {
                        window.requestPortalDetails(linkedPortalGuid);
                    }
                }
            }
        });

        setTimeout(() => {
            let selectedPortalData = window.portals[portalGuid] ? window.portals[portalGuid].options.data : null;
            let mods = selectedPortalData?.mods || [];
            let resonators = selectedPortalData?.resonators || [];

            if (!selectedPortalData || (!mods.length && !resonators.length)) {
                alert("Les détails du portail ne sont pas encore chargés. Réessayez dans quelques secondes.");
                return;
            }

            let content = `<h3><b>${portalName}</b> (${portalGuid})</h3><br>`;
            content += `<h4>Mods</h4><ul>`;
            content += mods.length ? mods.map(mod => `<li><b>${mod.name || "Unknown Mod"}</b> (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})</li>`).join('') : `<li>None</li>`;
            content += `</ul><h4>Resonators</h4><ul>`;
            content += resonators.length ? resonators.map(res => `<li><b>Level ${res.level || "?"}</b> (Owner: ${res.owner || "Unknown"})</li>`).join('') : `<li>None</li>`;
            content += `</ul><h4>Linked Portals</h4><ul>`;
            content += linksData.length ? linksData.map(link => `<li><b>${link.name}</b> (${link.guid})</li>`).join('') : `<li>None</li>`;
            content += `</ul>`;

            content += `<button id="copy-btn">📋 Copier</button>`;
            content += `<button id="download-txt-btn">📜 Télécharger TXT</button>`;
            content += `<button id="download-csv-btn">📄 Télécharger CSV</button>`;

            window.dialog({
                title: "Export Portal Links",
                html: content,
                width: 400
            });

            // Attacher les événements après l'injection du HTML
            document.getElementById("copy-btn").addEventListener("click", window.plugin.exportPortalLinks.copyToClipboard);
            document.getElementById("download-txt-btn").addEventListener("click", () => window.plugin.exportPortalLinks.downloadFile('txt'));
            document.getElementById("download-csv-btn").addEventListener("click", () => window.plugin.exportPortalLinks.downloadFile('csv'));

            window.plugin.exportPortalLinks.currentData = { portalName, portalGuid, mods, resonators, linksData };
        }, 500);
    };

    // Fonction pour copier dans le presse-papier
    window.plugin.exportPortalLinks.copyToClipboard = function() {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        let text = `**Selected Portal:**\n**${portalName}** (${portalGuid})\n\nMods:\n`;
        text += mods.length ? mods.map(mod => `**${mod.name || "Unknown Mod"}** (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})`).join("\n") : "None";
        text += `\n\nResonators:\n`;
        text += resonators.length ? resonators.map(res => `**Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})`).join("\n") : "None";
        text += `\n\nLinked Portals:\n`;
        text += linksData.length ? linksData.map(link => `**${link.name}** (${link.guid})`).join("\n") : "None";

        navigator.clipboard.writeText(text).then(() => alert("Données copiées dans le presse-papier !"));
    };

    // Fonction pour télécharger un fichier TXT ou CSV
    window.plugin.exportPortalLinks.downloadFile = function(format) {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        const filename = `${portalName.replace(/\s+/g, '_')}.${format}`;
        let content = "";

        if (format === "csv") {
            const bom = "\uFEFF";
            content = bom + `"Selected Portal";"Portal GUID"\n"${portalName}";"${portalGuid}"\n\n`;
            content += `"Mods"\n"Mod Name";"Owner";"Rarity"\n`;
            content += mods.length ? mods.map(mod => `"${mod.name}";"${mod.owner}";"${mod.rarity}"`).join("\n") : `None;;\n`;
        } else {
            content = `Selected Portal:\n**${portalName}** (${portalGuid})\n\nMods:\n`;
            content += mods.length ? mods.map(mod => `**${mod.name}** (Owner: ${mod.owner}, Rarity: ${mod.rarity})`).join("\n") : "None";
        }

        const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    window.addHook('portalDetailsUpdated', window.plugin.exportPortalLinks.addExportButton);
}

var script = document.createElement("script");
script.appendChild(document.createTextNode("(" + wrapper + ")();"));
(document.body || document.head || document.documentElement).appendChild(script);