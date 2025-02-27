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

    // Version corrigée avec la gestion du chargement des détails
    window.plugin.exportPortalLinks.showExportDialog = function(portalName, portalGuid) {
        let linksData = [];
        let links = window.links;
        
        Object.values(links).forEach(link => {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                let linkedPortalGuid = link.options.data.oGuid === portalGuid 
                    ? link.options.data.dGuid 
                    : link.options.data.oGuid;
                
                let linkedPortalName = window.portals[linkedPortalGuid]?.options.data.title || "Unknown Portal";
                linksData.push({ 
                    name: linkedPortalName, 
                    guid: linkedPortalGuid 
                });

                // Modification clé ici : utilisation de requestPortalDetails au lieu de renderPortalDetails
                if (!window.portals[linkedPortalGuid]?.options.data.mods) {
                    window.requestPortalDetails(linkedPortalGuid);
                }
            }
        });

        const selectedPortalData = window.portals[portalGuid]?.options.data || {};
        const mods = selectedPortalData.mods || [];
        const resonators = selectedPortalData.resonators || [];

        let content = `<h3><b>${portalName}</b> (${portalGuid})</h3><br>`;
        
        // Section Mods
        content += `<h4>Mods</h4><ul>`;
        mods.length === 0 
            ? content += `<li>None</li>`
            : mods.forEach(mod => {
                content += `<li><b>${mod.name || "Unknown Mod"}</b> (Owner: ${mod.owner || "Unknown"}; Rarity: ${mod.rarity || "Unknown"})</li>`;
            });
        content += `</ul>`;

        // Section Resonators
        content += `<h4>Resonators</h4><ul>`;
        resonators.length === 0 
            ? content += `<li>None</li>`
            : resonators.forEach(res => {
                content += `<li><b>Level ${res.level || "?"}</b> (Owner: ${res.owner || "Unknown"})</li>`;
            });
        content += `</ul>`;

        // Section Linked Portals
        content += `<h4>Linked Portals</h4><ul>`;
        linksData.length === 0 
            ? content += `<li>None</li>`
            : linksData.forEach(link => {
                content += `<li><b>${link.name}</b> (${link.guid})</li>`;
            });
        content += `</ul>`;

        content += `
            <div style="display: flex; gap: 5px; margin-top: 10px;">
                <button onclick="window.plugin.exportPortalLinks.copyToClipboard()">Copy</button>
                <button onclick="window.plugin.exportPortalLinks.downloadFile('txt')">TXT</button>
                <button onclick="window.plugin.exportPortalLinks.downloadFile('csv')">CSV</button>
            </div>
        `;

        window.dialog({
            title: "Export Portal Links",
            html: content,
            width: 400
        });

        window.plugin.exportPortalLinks.currentData = { 
            portalName, 
            portalGuid, 
            mods, 
            resonators, 
            linksData 
        };
    };

    window.plugin.exportPortalLinks.copyToClipboard = function() {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        
        let text = `Selected Portal: ${portalName} (${portalGuid})\n\n`;
        text += "Mods:\n";
        mods.forEach(mod => {
            text += `- ${mod.name} (${mod.rarity}) - Owner: ${mod.owner}\n`;
        });
        
        text += "\nResonators:\n";
        resonators.forEach(res => {
            text += `- L${res.level} - Owner: ${res.owner}\n`;
        });
        
        text += "\nLinked Portals:\n";
        linksData.forEach(link => {
            text += `- ${link.name} (${link.guid})\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            /* Feedback visuel inchangé */
        });
    };

    window.plugin.exportPortalLinks.downloadFile = function(format) {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${portalName}_${timestamp}.${format}`;

        let content;
        if (format === "csv") {
            content = [
                ["Category", "Name", "Details", "Owner", "Extra Info"],
                ...mods.map(mod => ["Mod", mod.name, mod.rarity, mod.owner]),
                ...resonators.map(res => ["Resonator", `L${res.level}`, "", res.owner]),
                ...linksData.map(link => ["Linked Portal", link.name, link.guid])
            ].map(row => row.join(",")).join("\n");
        } else {
            content = `PORTAL EXPORT - ${new Date().toLocaleString()}\n\n`;
            content += `=== ${portalName} ===\n`;
            content += "Mods:\n" + mods.map(mod => `- ${mod.name} (${mod.rarity})`).join("\n");
            content += "\n\nResonators:\n" + resonators.map(res => `- L${res.level}`).join("\n");
            content += "\n\nLinks:\n" + linksData.map(link => `- ${link.name}`).join("\n");
        }

        const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    let setup = function() {
        window.addHook('portalDetailsUpdated', window.plugin.exportPortalLinks.addExportButton);
    };

    setup.info = {
        script: {
            version: "0.2.1",
            name: "Export Portal Links",
            description: "Export portal data without changing selection"
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
