// ==UserScript==
// @id         iitc-plugin-export-links-beta
// @name       IITC plugin: Export Portal Links beta
// @category   Info
// @version    0.1.6
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

    // Ajout du bouton dans les détails du portail
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

    // Fonction pour récupérer les données du portail sélectionné
    function getPortalData() {
        if (!window.selectedPortal || !window.portals[window.selectedPortal]) return null;

        const portal = window.portals[window.selectedPortal];
        const portalData = portal.options.data;
        const portalName = portalData.title || "Unknown Portal";
        const portalGuid = window.selectedPortal;
        const linksData = [];

        // Chargement des portails liés
        for (const link of Object.values(window.links)) {
            if (link.options.data.oGuid === portalGuid || link.options.data.dGuid === portalGuid) {
                const linkedGuid = link.options.data.oGuid === portalGuid ? link.options.data.dGuid : link.options.data.oGuid;
                const linkedPortal = window.portals[linkedGuid];
                const linkedName = linkedPortal ? linkedPortal.options.data.title || "Unknown" : "Unknown";
                linksData.push({ name: linkedName, guid: linkedGuid });
            }
        }

        // Récupération des mods
        const mods = portalData.mods.map(mod => ({
            name: mod?.name || "Unknown Mod",
            owner: mod?.owner || "Unknown",
            rarity: mod?.rarity || "Unknown"
        }));

        // Récupération des résonateurs
        const resonators = portalData.resonators.map(res => ({
            level: res?.level || "?",
            owner: res?.owner || "Unknown"
        }));

        return { portalName, portalGuid, linksData, mods, resonators };
    }

    // Fonction d'exportation
    function exportPortalData() {
        const data = getPortalData();
        if (!data) return alert("No portal selected or data unavailable.");

        const { portalName, portalGuid, linksData, mods, resonators } = data;

        // Génération du contenu pour le clipboard et les fichiers
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

    // Fonction de copie dans le presse-papier avec message temporaire
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

    // Génération du CSV
    function generateCSV({ portalName, portalGuid, linksData, mods, resonators }) {
        let csvContent = `"Selected Portal","Portal GUID"\n"${portalName}","${portalGuid}"\n\n`;

        csvContent += `"Mods"\n"Mod Name","Owner","Rarity"\n`;
        mods.length ? mods.forEach(mod => {
            csvContent += `"${mod.name}","${mod.owner}","${mod.rarity}"\n`;
        }) : csvContent += `"None",,\n`;

        csvContent += `\n"Resonators"\n"Level","Owner"\n`;
        resonators.length ? resonators.forEach(res => {
            csvContent += `"Level ${res.level}","${res.owner}"\n`;
        }) : csvContent += `"None",\n`;

        csvContent += `\n"Linked Portals"\n"Portal Name","Portal GUID"\n`;
        linksData.length ? linksData.forEach(link => {
            csvContent += `"${link.name}","${link.guid}"\n`;
        }) : csvContent += `"None",\n`;

        return csvContent;
    }

    // Fonction de sauvegarde améliorée
    function saveFile(content, portalName, format) {
        const now = new Date();
        const filename = `${portalName} - ${now.toLocaleDateString().replace(/\//g, "-")} - ${now.toLocaleTimeString().replace(/:/g, "-")}.${format}`;
        const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "text/plain" });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    window.addHook("portalSelected", addExportButton);
}

// Chargement du plugin
setup.info = { script: { version: "0.1.6" } };
if (window.iitcLoaded) setup();
else window.addHook("iitcLoaded", setup);
