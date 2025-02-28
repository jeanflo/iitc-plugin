// ==UserScript==
// @id         iitc-plugin-export-links
// @name       IITC plugin: Export Portal Links
// @category   Info
// @version    0.2.9
// @namespace  https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-export-links
// @updateURL  https://github.com/jeanflo/iitc-plugin/blob/main/export-links.meta.js
// @downloadURL https://github.com/jeanflo/iitc-plugin/blob/main/export-links.user.js
// @description Export links, mods, and resonators from a selected portal (including mod rarity).
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper() {
    if (typeof window.plugin !== 'function') window.plugin = function() {};
    window.plugin.exportPortalLinks = function() {};

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
    window.plugin.exportPortalLinks.downloadFile = function(format, content) {
        const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `export.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Fonction pour afficher la boîte de dialogue avec les informations du portail
    window.plugin.exportPortalLinks.showExportDialog = function(portalName, portalGuid) {
        let linksData = [];
        let links = window.links;

        Object.values(links).forEach(link => {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                let linkedPortalGuid = (link.options.data.oGuid === portalGuid) ? link.options.data.dGuid : link.options.data.oGuid;
                let linkedPortalName = window.portals[linkedPortalGuid]?.options.data.title || "Unknown Portal";
                linksData.push({ name: linkedPortalName, guid: linkedPortalGuid });
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

            let content = document.createElement("div");
            content.innerHTML = `
                <h3><b>${portalName}</b> (${portalGuid})</h3>
                <h4>Mods</h4><ul>${mods.length ? mods.map(mod => `<li><b>${mod.name || "Unknown Mod"}</b> (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})</li>`).join('') : "<li>None</li>"}</ul>
                <h4>Resonators</h4><ul>${resonators.length ? resonators.map(res => `<li><b>Level ${res.level || "?"}</b> (Owner: ${res.owner || "Unknown"})</li>`).join('') : "<li>None</li>"}</ul>
                <h4>Linked Portals</h4><ul>${linksData.length ? linksData.map(link => `<li><b>${link.name}</b> (${link.guid})</li>`).join('') : "<li>None</li>"}</ul>
            `;

            let copyBtn = document.createElement("button");
            copyBtn.textContent = "📋 Copier";
            copyBtn.addEventListener("click", () => window.plugin.exportPortalLinks.copyToClipboard());

            let downloadTxtBtn = document.createElement("button");
            downloadTxtBtn.textContent = "📜 Télécharger TXT";
            downloadTxtBtn.addEventListener("click", () => window.plugin.exportPortalLinks.downloadFile('txt'));

            let downloadCsvBtn = document.createElement("button");
            downloadCsvBtn.textContent = "📄 Télécharger CSV";
            downloadCsvBtn.addEventListener("click", () => window.plugin.exportPortalLinks.downloadFile('csv'));

            content.appendChild(copyBtn);
            content.appendChild(downloadTxtBtn);
            content.appendChild(downloadCsvBtn);

            window.dialog({
                title: "Export Portal Links",
                html: content,
                width: 400
            });

            window.plugin.exportPortalLinks.currentData = { portalName, portalGuid, mods, resonators, linksData };
        }, 500);
    };

    // Fonction pour ajouter le bouton dans un aside distinct
    window.plugin.exportPortalLinks.addToSidebar = function() {
        if (!window.selectedPortal) return;
        const portal = window.portals[window.selectedPortal];
        if (!portal) return;

        let aside = document.getElementById("export-links-aside");
        if (!aside) {
            aside = document.createElement("aside");
            aside.id = "export-links-aside";
            document.querySelector(".linkdetails")?.appendChild(aside);
        }

        if (document.getElementById("export-links-btn")) return;

        const button = document.createElement("a");
        button.id = "export-links-btn";
        button.textContent = "Export Links";
        button.href = "#";
        button.className = "plugin-button";

        button.onclick = function(event) {
            event.preventDefault();
            const details = portal.options.data;
            const portalName = details.title || "Unknown Portal";
            const portalGuid = window.selectedPortal;
            window.plugin.exportPortalLinks.showExportDialog(portalName, portalGuid);
        };

        aside.appendChild(button);
    };

    window.addHook('portalDetailsUpdated', window.plugin.exportPortalLinks.addToSidebar);
}

var script = document.createElement("script");
script.appendChild(document.createTextNode("(" + wrapper + ")();"));
(document.body || document.head || document.documentElement).appendChild(script);
