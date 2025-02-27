// ==UserScript==
// @id         iitc-plugin-export-links-beta
// @name       IITC plugin: Export Portal Links beta
// @category   Info
// @version    0.1.8
// @namespace  https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-export-links-beta
// @updateURL  https://github.com/jeanflo/iitc-plugin/blob/main/export-links-beta.meta.js
// @downloadURL https://github.com/jeanflo/iitc-plugin/blob/main/export-links-beta.user.js
// @description Export the list of links from a selected portal, including linked portals, mods, and resonators.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function setup() {
    window.plugin.exportPortalLinks = {};

    function addExportButton() {
        if (!window.selectedPortal) return;
        
        const details = document.getElementById('portaldetails');
        if (!details || details.querySelector("#export-links")) return;

        const button = document.createElement("button");
        button.textContent = "Export Links";
        button.id = "export-links";
        button.addEventListener("click", exportPortalData);
        details.appendChild(button);
    }

    function getPortalData() {
        if (!window.selectedPortal || !window.portals[window.selectedPortal]) return null;

        const portal = window.portals[window.selectedPortal];
        const portalData = portal.options.data;
        const portalName = portalData.title || "Unknown Portal";
        const portalGuid = window.selectedPortal;
        const linksData = [];

        for (const link of Object.values(window.links)) {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                const linkedGuid = link.options.data.oGuid === portalGuid ? link.options.data.dGuid : link.options.data.oGuid;
                const linkedPortal = window.portals[linkedGuid];
                const linkedName = linkedPortal ? linkedPortal.options.data.title || "Unknown" : "Unknown";
                linksData.push({ name: linkedName, guid: linkedGuid });
            }
        }

        const mods = portalData.mods.map(mod => ({
            name: mod?.name || "Unknown Mod",
            owner: mod?.owner || "Unknown",
            rarity: mod?.rarity || "Unknown"
        }));

        const resonators = portalData.resonators.map(res => ({
            level: res?.level || "?",
            owner: res?.owner || "Unknown"
        }));

        return { portalName, portalGuid, linksData, mods, resonators };
    }

    function exportPortalData() {
        const data = getPortalData();
        if (!data) return alert("No portal selected or data unavailable.");

        const { portalName, portalGuid, linksData, mods, resonators } = data;

        let textContent = `**${portalName}** (${portalGuid})\n\n`;
        textContent += `Mods:\n`;
        mods.length ? mods.forEach(mod => {
            textContent += `**${mod.name}** (Owner: ${mod.owner}, Rarity: ${mod.rarity})\n`;
        }) : textContent += "None\n";

        textContent += `\nResonators:\n`;
        resonators.length ? resonators.forEach(res => {
            textContent += `**Level ${res.level}** (Owner: ${res.owner})\n`;
        }) : textContent += "None\n";

        textContent += `\nLinked Portals:\n`;
        linksData.length ? linksData.forEach(link => {
            textContent += `**${link.name}** (${link.guid})\n`;
        }) : textContent += "None\n";

        copyToClipboard(textContent);
        saveFile(textContent, portalName, "txt");
        saveFile(generateCSV(data), portalName, "csv");
    }

    function copyToClipboard(content) {
        navigator.clipboard.writeText(content).then(() => {
            const message = document.createElement("div");
            message.textContent = "Copied to clipboard!";
            message.style.position = "fixed";
            message.style.bottom = "20px";
            message.style.left = "50%";
            message.style.transform = "translateX(-50%)";
            message.style.backgroundColor = "#333";
            message.style.color = "#fff";
            message.style.padding = "10px";
            message.style.borderRadius = "5px";
            document.body.appendChild(message);

            setTimeout(() => document.body.removeChild(message), 2000);
        });
    }

    function generateCSV({ portalName, portalGuid, linksData, mods, resonators }) {
        let csvContent = "\uFEFF"; // BOM UTF-8 pour compatibilitÃ© Excel
        const separator = ";"; // SÃ©parateur Excel FR

        csvContent += `"CatÃ©gorie"${separator}"Nom"${separator}"GUID"${separator}"Infos supplÃ©mentaires"\n`;

        csvContent += `"Portail sÃ©lectionnÃ©"${separator}"${portalName}"${separator}"${portalGuid}"${separator}""\n`;

        csvContent += `"Mods"${separator}""${separator}""${separator}""\n`;
        csvContent += `""${separator}"Nom du Mod"${separator}"PropriÃ©taire"${separator}"RaretÃ©"\n`;
        mods.length ? mods.forEach(mod => {
            csvContent += `""${separator}"${mod.name}"${separator}"${mod.owner}"${separator}"${mod.rarity}"\n`;
        }) : csvContent += `""${separator}"Aucun"${separator}""${separator}""\n`;

        csvContent += `"RÃ©sonateurs"${separator}""${separator}""${separator}""\n`;
        csvContent += `""${separator}"Niveau"${separator}"PropriÃ©taire"${separator}""\n`;
        resonators.length ? resonators.forEach(res => {
            csvContent += `""${separator}"Niveau ${res.level}"${separator}"${res.owner}"${separator}""\n`;
        }) : csvContent += `""${separator}"Aucun"${separator}""${separator}""\n`;

        csvContent += `"Portails liÃ©s"${separator}""${separator}""${separator}""\n`;
        csvContent += `""${separator}"Nom du portail"${separator}"GUID"${separator}""\n`;
        linksData.length ? linksData.forEach(link => {
            csvContent += `""${separator}"${link.name}"${separator}"${link.guid}"${separator}""\n`;
        }) : csvContent += `""${separator}"Aucun"${separator}""${separator}""\n`;

        return csvContent;
    }

    function saveFile(content, portalName, format) {
        const now = new Date();
        const filename = `${portalName} - ${now.toLocaleDateString().replace(/\//g, "-")} - ${now.toLocaleTimeString().replace(/:/g, "-")}.${format}`;
        const blob = new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;" });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    window.addHook("portalSelected", addExportButton);
}

setup.info = { script: { version: "0.1.8" } };
if (window.iitcLoaded) setup();
else window.addHook("iitcLoaded", setup);
