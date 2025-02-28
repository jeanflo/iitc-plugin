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

    window.plugin.exportPortalLinks.showExportDialog = function(portalName, portalGuid) {
        let linksData = [];
        let links = window.links;
        
        Object.values(links).forEach(link => {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                let linkedPortalGuid = (link.options.data.oGuid === portalGuid) ? link.options.data.dGuid : link.options.data.oGuid;
                let linkedPortalName = window.portals[linkedPortalGuid]?.options.data.title || "Unknown Portal";
                linksData.push({ name: linkedPortalName, guid: linkedPortalGuid });

                // Empêche de changer le portail sélectionné en rechargeant les détails
                if (!window.portals[linkedPortalGuid] || !window.portals[linkedPortalGuid].options.data.mods) {
                    if (typeof window.requestPortalDetails === "function" && linkedPortalGuid !== portalGuid) {
                        window.requestPortalDetails(linkedPortalGuid);
                    }
                }
            }
        });

        setTimeout(() => {
            let selectedPortalData = window.portals[portalGuid] ? window.portals[portalGuid].options.data : null;
            let mods = (selectedPortalData && selectedPortalData.mods) ? selectedPortalData.mods : [];
            let resonators = (selectedPortalData && selectedPortalData.resonators) ? selectedPortalData.resonators : [];

            if (!selectedPortalData || (!mods.length && !resonators.length)) {
                alert("Les détails du portail ne sont pas encore chargés. Réessayez dans quelques secondes.");
                return;
            }

            let content = `<h3><b>${portalName}</b> (${portalGuid})</h3><br>`;
            content += `<h4>Mods</h4><ul>`;
            content += mods.length === 0 ? `<li>None</li>` : mods.map(mod => `<li><b>${mod.name || "Unknown Mod"}</b> (Owner: ${mod.owner || "Unknown"}; Rarity: ${mod.rarity || "Unknown"})</li>`).join('');
            content += `</ul><h4>Resonators</h4><ul>`;
            content += resonators.length === 0 ? `<li>None</li>` : resonators.map(res => `<li><b>Level ${res.level || "?"}</b> (Owner: ${res.owner || "Unknown"})</li>`).join('');
            content += `</ul><h4>Linked Portals</h4><ul>`;
            content += linksData.length === 0 ? `<li>None</li>` : linksData.map(link => `<li><b>${link.name}</b> (${link.guid})</li>`).join('');
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
        }, 500);
    };

    let setup = function() {
        window.addHook('portalDetailsUpdated', window.plugin.exportPortalLinks.addExportButton);
    };

    setup.info = {
        script: {
            version: "0.2.1",
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