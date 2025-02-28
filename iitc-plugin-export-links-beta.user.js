// ==UserScript==
// @id         iitc-plugin-export-links-beta
// @name       IITC plugin: Export Portal Links beta
// @category   Info
// @version    0.2.4
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

    // Fonction pour afficher la popup avec les informations du portail
    window.plugin.exportPortalLinks.showPopup = function() {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        
        let content = `<b>Selected Portal:</b><br><b>${portalName}</b> (${portalGuid})<br><br>`;
        content += `<b>Mods:</b><br>`;
        content += mods.length ? mods.map(mod => `<b>${mod.name || "Unknown Mod"}</b> (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})`).join("<br>") : "None";
        content += `<br><br><b>Resonators:</b><br>`;
        content += resonators.length ? resonators.map(res => `<b>Level ${res.level || "?"}</b> (Owner: ${res.owner || "Unknown"})`).join("<br>") : "None";
        content += `<br><br><b>Linked Portals:</b><br>`;
        content += linksData.length ? linksData.map(link => `<b>${link.name}</b> (${link.guid})`).join("<br>") : "None";

        const buttons = `<br><br>
            <button onclick="window.plugin.exportPortalLinks.copyToClipboard()">📋 Copier</button>
            <button onclick="window.plugin.exportPortalLinks.downloadFile('csv')">📄 Télécharger CSV</button>
            <button onclick="window.plugin.exportPortalLinks.downloadFile('txt')">📜 Télécharger TXT</button>
        `;

        dialog({
            title: "Export Portal Links",
            html: content + buttons,
            width: 400
        });
    };

    // Fonction pour copier les données dans le presse-papier
    window.plugin.exportPortalLinks.copyToClipboard = function() {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        let text = `**Selected Portal:**\n**${portalName}** (${portalGuid})\n\nMods:\n`;
        text += mods.length ? mods.map(mod => `**${mod.name || "Unknown Mod"}** (Owner: ${mod.owner || "Unknown"}; Rarity: ${mod.rarity || "Unknown"})`).join("\n") : "None";
        text += `\n\nResonators:\n`;
        text += resonators.length ? resonators.map(res => `**Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})`).join("\n") : "None";
        text += `\n\nLinked Portals:\n`;
        text += linksData.length ? linksData.map(link => `**${link.name}** (${link.guid})`).join("\n") : "None";

        navigator.clipboard.writeText(text).then(() => alert("Données copiées dans le presse-papier !"));
    };

    // Fonction pour télécharger les données en CSV ou TXT
    window.plugin.exportPortalLinks.downloadFile = function(format) {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        const now = new Date();
        const filename = `${portalName} - ${now.toISOString().replace(/[:.]/g, "-")}.${format}`;
        let content = "";

        if (format === "csv") {
            const bom = "\uFEFF"; // UTF-8 BOM pour compatibilité Excel
            content = bom + `"Selected Portal";"Portal GUID"\n"${portalName}";"${portalGuid}"\n\n`;
            content += `"Mods"\n"Mod Name";"Owner";"Rarity"\n`;
            content += mods.length ? mods.map(mod => `"${mod.name || "Unknown Mod"}";"${mod.owner || "Unknown"}";"${mod.rarity || "Unknown"}"`).join("\n") : `None;;\n`;
            content += `\n\n"Resonators"\n"Level";"Owner"\n`;
            content += resonators.length ? resonators.map(res => `"Level ${res.level || "?"}";"${res.owner || "Unknown"}"`).join("\n") : `None;\n`;
            content += `\n\n"Linked Portals"\n"Portal Name";"Portal GUID"\n`;
            content += linksData.length ? linksData.map(link => `"${link.name}";"${link.guid}"`).join("\n") : `None;\n`;
        } else {
            content = `Selected Portal:\n**${portalName}** (${portalGuid})\n\nMods:\n`;
            content += mods.length ? mods.map(mod => `**${mod.name || "Unknown Mod"}** (Owner: ${mod.owner || "Unknown"}; Rarity: ${mod.rarity || "Unknown"})`).join("\n") : "None";
            content += `\n\nResonators:\n`;
            content += resonators.length ? resonators.map(res => `**Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})`).join("\n") : "None";
            content += `\n\nLinked Portals:\n`;
            content += linksData.length ? linksData.map(link => `**${link.name}** (${link.guid})`).join("\n") : "None";
        }

        const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Ajouter le bouton Export Links
    window.plugin.exportPortalLinks.addExportButton = function() {
        const div = document.createElement("div");
        div.style.marginTop = "10px";

        const button = document.createElement("button");
        button.textContent = "Export Links";
        button.style.width = "100%";
        button.style.padding = "5px";
        button.style.border = "1px solid #ccc";
        button.style.background = "#2e3e5c";
        button.style.color = "white";
        button.style.cursor = "pointer";
        
        button.onclick = window.plugin.exportPortalLinks.showPopup;
        div.appendChild(button);

        const details = document.getElementById("portaldetails");
        if (details) details.appendChild(div);
    };

    let setup = function() {
        window.addHook('portalDetailsUpdated', window.plugin.exportPortalLinks.addExportButton);
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