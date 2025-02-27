// ==UserScript==
// @id         iitc-plugin-export-links-beta
// @name       IITC plugin: Export Portal Links beta
// @category   Info
// @version    0.2.2
// @namespace  https://github.com/jeanflo/iitc-plugin
// @updateURL  https://github.com/jeanflo/iitc-plugin/raw/main/export-links-beta.meta.js
// @downloadURL https://github.com/jeanflo/iitc-plugin/raw/main/export-links-beta.user.js
// @description Export links, mods and resonators from a selected portal (including mod rarity).
// @include    https://*.ingress.com/*
// @include    http://*.ingress.com/*
// @match    https://*.ingress.com/*
// @match    http://*.ingress.com/*
// @grant      none
// ==/UserScript==

function wrapper() {
    if (typeof window.plugin !== 'function') window.plugin = function() {};

    window.plugin.exportPortalLinks = function() {};

    // Ajoute le bouton "Export Links" dans les détails du portail
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

    window.plugin.exportPortalLinks.showExportDialog = function(portalGuid) {
        const portal = window.portals[portalGuid];
        if (!portal) return;

        const portalData = portal.options.data;
        const portalName = portalData.title || "Unknown Portal";

        // Récupérer les liens
        const links = Object.values(window.links || {}).filter(link =>
            link.options.data.oGuid === portalGuid ||
            link.options.data.dGuid === portalGuid
        );

        // Construire le contenu
        let content = `<div style="max-height: 60vh; overflow-y: auto;">
            <h3>${portalName}</h3>
            <h4>Mods</h4>
            <ul>${this.renderMods(portalData.mods)}</ul>
            <h4>Resonators</h4>
            <ul>${this.renderResonators(portalData.resonators)}</ul>
            <h4>Links</h4>
            <ul>${this.renderLinks(links, portalGuid)}</ul>
        </div>
        <div class="dialogbuttons">
            <button onclick="window.plugin.exportPortalLinks.copyToClipboard()">Copy</button>
            <button onclick="window.plugin.exportPortalLinks.downloadFile('txt')">TXT</button>
            <button onclick="window.plugin.exportPortalLinks.downloadFile('csv')">CSV</button>
        </div>`;

        // Utiliser le système de dialogue de IITC
        dialog({
            title: 'Export Portal Data',
            html: content,
            width: 450,
            dialogClass: 'ui-dialog-export-links'
        });
    };

    // Méthodes de rendu
    window.plugin.exportPortalLinks.renderMods = function(mods) {
        if (!mods || !mods.length) return '<li>No mods</li>';
        return mods.map(mod => `
            <li>
                ${mod.name} (${mod.rarity})<br>
                <small>Owner: ${mod.owner}</small>
            </li>
        `).join('');
    };

    window.plugin.exportPortalLinks.renderResonators = function(resonators) {
        if (!resonators || !resonators.length) return '<li>No resonators</li>';
        return resonators.map(res => `
            <li>
                L${res.level} Resonator<br>
                <small>Owner: ${res.owner}</small>
            </li>
        `).join('');
    };

    window.plugin.exportPortalLinks.renderLinks = function(links, sourceGuid) {
        if (!links.length) return '<li>No links</li>';
        return links.map(link => {
            const targetGuid = link.options.data.oGuid === sourceGuid
                ? link.options.data.dGuid
                : link.options.data.oGuid;
            const portal = window.portals[targetGuid];
            return `
                <li>
                    ${portal?.options.data.title || 'Unknown Portal'}<br>
                    <small>${targetGuid}</small>
                </li>
            `;
        }).join('');
    };

    // ... (Les fonctions copyToClipboard et downloadFile restent inchangées)

    let setup = function() {
        window.addHook('portalDetailsUpdated', window.plugin.exportPortalLinks.addExportButton);
    };

    // ... (Le reste du code d'initialisation reste inchangé)
}

var script = document.createElement('script');
script.appendChild(document.createTextNode('(' + wrapper + ')();'));
(document.body || document.head || document.documentElement).appendChild(script);
