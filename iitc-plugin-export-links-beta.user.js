// ==UserScript==
// @id         iitc-plugin-export-links-beta
// @name       IITC plugin: Export Portal Links beta
// @category   Info
// @version    0.2.2
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

    window.plugin.exportPortalLinks.copyToClipboard = function() {
        const { portalName, portalGuid, mods, resonators, linksData } = window.plugin.exportPortalLinks.currentData;
        let text = `**Selected Portal:**\n**${portalName}** (${portalGuid})\n\nMods:\n`;
        text += mods.length ? mods.map(mod => `**${mod.name || "Unknown Mod"}** (Owner: ${mod.owner || "Unknown"}; Rarity: ${mod.rarity || "Unknown"})`).join("\n") : "None";
        text += `\n\nResonators:\n`;
        text += resonators.length ? resonators.map(res => `**Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})`).join("\n") : "None";
        text += `\n\nLinked Portals:\n`;
        text += linksData.length ? linksData.map(link => `**${link.name}** (${link.guid})`).join("\n") : "None";

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