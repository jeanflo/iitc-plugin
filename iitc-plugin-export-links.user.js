// ==UserScript==
// @id         iitc-plugin-export-links
// @name       IITC plugin: Export Portal Links
// @category   Info
// @version    0.5.5
// @namespace  https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-export-links
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/main/iitc-plugin-export-links.user.js
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

    // Fonction pour afficher la boîte de dialogue avec les informations du portail
    window.plugin.exportPortalLinks.showExportDialog = function() {
        if (!window.selectedPortal) return;
        const portal = window.portals[window.selectedPortal];
        if (!portal || !portal.options.data) {
            alert("Les détails du portail ne sont pas encore chargés. Réessayez dans quelques secondes.");
            return;
        }
        const details = portal.options.data;
        const portalName = details.title || "Unknown Portal";
        const portalGuid = window.selectedPortal;
        const now = new Date();
        let mods = details.mods || [];
        let resonators = details.resonators || [];
        let linksData = [];

        Object.values(window.links).forEach(link => {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                let linkedPortalGuid = (link.options.data.oGuid === portalGuid) ? link.options.data.dGuid : link.options.data.oGuid;
                let linkedPortal = window.portals[linkedPortalGuid];
                let linkedPortalName = (linkedPortal && linkedPortal.options.data) ? linkedPortal.options.data.title : "Unknown Portal";
                linksData.push({ name: linkedPortalName, guid: linkedPortalGuid });
            }
        });

        let content = `<h3><u><b>${now.toLocaleString()}</b></u></h3>`;
        content += `<h3><b>${portalName}</b></h3>`;
        content += `<p><b>GUID:</b> <code>${portalGuid}</code></p>`;
        content += `<h4><b>Mods</b></h4><ul>`;
        content += mods.length ? mods.map(mod => `<li><b>${mod.name || "Unknown Mod"}</b> (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})</li>`).join('') : "<li>None</li>";
        content += `</ul><h4><b>Resonators</b></h4><ul>`;
        content += resonators.length ? resonators.map(res => `<li><b>Level ${res.level || "?"}</b> (Owner: ${res.owner || "Unknown"})</li>`).join('') : "<li>None</li>";
        content += `</ul><h4><b>Linked Portals</b></h4><ul>`;
        content += linksData.length ? linksData.map(link => `<li><b>${link.name}</b> (GUID: <code>${link.guid}</code>)</li>`).join('') : "<li>None</li>";
        content += `</ul>`;

        content += `<button onclick="window.plugin.exportPortalLinks.copyToClipboard()">📋 Copier</button>`;
        content += `<button onclick="window.plugin.exportPortalLinks.downloadFile('txt')">📜 Télécharger TXT</button>`;
        content += `<button onclick="window.plugin.exportPortalLinks.downloadFile('csv')">📄 Télécharger CSV</button>`;

        const version = GM_info.script.version;
        window.dialog({
            title: `Export Portal Links v${version}`,
            html: content,
            width: 400
        });
    };

    // Modifier le GUID en chasse fixe dans la copie
    window.plugin.exportPortalLinks.copyToClipboard = function() {
        const portal = window.portals[window.selectedPortal];
        if (!portal || !portal.options.data) {
            alert("Les détails du portail ne sont pas encore chargés.");
            return;
        }
        const details = portal.options.data;
        const now = new Date().toLocaleString();

        let content = `📅 **Date:** ${now}\n\n`;
        content += `**${details.title}** (GUID: \` ${window.selectedPortal} \`)\n\n`;

        Object.values(window.links).forEach(link => {
            if (link.options.data.oGuid === window.selectedPortal || link.options.data.dGuid === window.selectedPortal) {
                const linkedPortalGuid = (link.options.data.oGuid === window.selectedPortal) ? link.options.data.dGuid : link.options.data.oGuid;
                const linkedPortal = window.portals[linkedPortalGuid]?.options.data;
                if (linkedPortal) {
                    content += `- **${linkedPortal.title || "Unknown Portal"}** (GUID: \` ${linkedPortalGuid} \`)\n`;
                }
            }
        });

        navigator.clipboard.writeText(content).then(() => {
            alert("Texte copié dans le presse-papiers !");
        }).catch(err => {
            console.error("Erreur lors de la copie : ", err);
            alert("Impossible de copier dans le presse-papiers.");
        });
    };

    window.plugin.exportPortalLinks.addToSidebar();
}
wrapper();
