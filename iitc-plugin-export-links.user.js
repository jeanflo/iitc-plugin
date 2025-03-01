// ==UserScript==
// @id         iitc-plugin-export-links
// @name       IITC plugin: Export Portal Links
// @category   Info
// @version    0.4.1
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
                let linkedPortalName = window.portals[linkedPortalGuid]?.options.data?.title || "Unknown Portal";
                linksData.push({ name: linkedPortalName, guid: linkedPortalGuid });
            }
        });

        let content = `<h3><u><b>${now.toLocaleString()}</b></u></h3>`; // Date et heure en gras et souligné
        content += `<h3><b>${portalName}</b></h3>`; // Nom du portail en gras
        content += `<p><b>GUID:</b> ${portalGuid}</p>`;
        content += `<h4><b>Mods</b></h4><ul>`;
        content += mods.length ? mods.map(mod => `<li><b>${mod.name || "Unknown Mod"}</b> (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})</li>`).join('') : "<li>None</li>";
        content += `</ul><h4><b>Resonators</b></h4><ul>`;
        content += resonators.length ? resonators.map(res => `<li><b>Level ${res.level || "?"}</b> (Owner: ${res.owner || "Unknown"})</li>`).join('') : "<li>None</li>";
        content += `</ul><h4><b>Linked Portals</b></h4><ul>`;
        content += linksData.length ? linksData.map(link => `<li><b>${link.name}</b> (${link.guid})</li>`).join('') : "<li>None</li>";
        content += `</ul>`;

        content += `<button onclick="window.plugin.exportPortalLinks.copyToClipboard()">📋 Copier</button>`;
        content += `<button onclick="window.plugin.exportPortalLinks.downloadFile('txt')">📜 Télécharger TXT</button>`;
        content += `<button onclick="window.plugin.exportPortalLinks.downloadFile('csv')">📄 Télécharger CSV</button>`;

        window.dialog({
            title: "Export Portal Links",
            html: content,
            width: 400
        });
    };

    // Fonction pour copier dans le presse-papiers
    window.plugin.exportPortalLinks.copyToClipboard = function() {
        const portal = window.portals[window.selectedPortal];
        if (!portal || !portal.options.data) {
            alert("Les détails du portail ne sont pas encore chargés.");
            return;
        }
        const details = portal.options.data;
        let content = `**${details.title} (GUID: ${window.selectedPortal})**\n`; // Nom du portail en gras

        // Vérification si 'mods' est défini et si ce n'est pas un tableau vide
        if (details.mods && Array.isArray(details.mods) && details.mods.length > 0) {
            content += "**Mods:**\n";
            details.mods.forEach(mod => {
                content += `- **${mod.name || "Unknown"}** (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})\n`; // Mods en gras
            });
        } else {
            content += "Mods: None\n";
        }

        // Vérification si 'resonators' est défini et si ce n'est pas un tableau vide
        if (details.resonators && Array.isArray(details.resonators) && details.resonators.length > 0) {
            content += "**Resonators:**\n";
            details.resonators.forEach(res => {
                content += `- **Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})\n`; // Résonateurs en gras
            });
        } else {
            content += "Resonators: None\n";
        }

        // Vérification si des liens existent
        content += "**Linked Portals:**\n";
        let linkedPortalsFound = false;
        Object.values(window.links).forEach(link => {
            if (link.options.data.oGuid === window.selectedPortal || link.options.data.dGuid === window.selectedPortal) {
                const linkedPortalGuid = (link.options.data.oGuid === window.selectedPortal) ? link.options.data.dGuid : link.options.data.oGuid;
                const linkedPortal = window.portals[linkedPortalGuid]?.options.data;
                if (linkedPortal) {
                    content += `- **${linkedPortal.title || "Unknown Portal"}** (GUID: ${linkedPortalGuid})\n`; // Portails liés en gras
                    linkedPortalsFound = true;
                }
            }
        });
        if (!linkedPortalsFound) content += "Linked Portals: None\n";

        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert("Contenu copié dans le presse-papiers !");
    };

    // Fonction pour ajouter le bouton Export Links dans l'interface
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
            window.plugin.exportPortalLinks.showExportDialog();
        };

        aside.appendChild(button);
    };

    window.addHook('portalDetailsUpdated', window.plugin.exportPortalLinks.addToSidebar);

    // Fonction pour télécharger le fichier CSV avec une ligne par mod et résonateur
    window.plugin.exportPortalLinks.downloadFile = function(type) {
        const portal = window.portals[window.selectedPortal];
        if (!portal || !portal.options.data) {
            alert("Les détails du portail ne sont pas encore chargés.");
            return;
        }
        const details = portal.options.data;
        const now = new Date();

        if (type === 'csv') {
            // Création du fichier CSV avec encodage UTF-8 et BOM
            let content = `"Portal Name";"GUID";"Date";"Type";"Name";"Owner";"Rarity/Level";"Linked Portal Name";"Linked Portal GUID"\n`; // Entête du CSV

            // Ajouter la ligne pour chaque mod
            if (details.mods && Array.isArray(details.mods) && details.mods.length > 0) {
                details.mods.forEach(mod => {
                    content += `"${details.title || "Unknown Portal"}";${window.selectedPortal};"${now.toLocaleString()}";"Mod";"${mod.name || "Unknown"}";"${mod.owner || "Unknown"}";"${mod.rarity || "Unknown"}";\n`;
                });
            }

            // Ajouter la ligne pour chaque résonateur
            if (details.resonators && Array.isArray(details.resonators) && details.resonators.length > 0) {
                details.resonators.forEach(res => {
                    content += `"${details.title || "Unknown Portal"}";${window.selectedPortal};"${now.toLocaleString()}";"Resonator";"Level ${res.level || "?"}";"${res.owner || "Unknown"}";"";\n`;
                });
            }

            // Ajouter la ligne pour chaque portail lié
            Object.values(window.links).forEach(link => {
                if (link.options.data.oGuid === window.selectedPortal || link.options.data.dGuid === window.selectedPortal) {
                    const linkedPortalGuid = (link.options.data.oGuid === window.selectedPortal) ? link.options.data.dGuid : link.options.data.oGuid;
                    const linkedPortal = window.portals[linkedPortalGuid]?.options.data;
                    if (linkedPortal) {
                        content += `"${linkedPortal.title || "Unknown Portal"}";${linkedPortalGuid};"${now.toLocaleString()}";"Linked Portal";"${linkedPortal.title || "Unknown Portal"}";"";"";\n`;
                    }
                }
            });

            // Ajout du BOM pour l'encodage UTF-8
            const BOM = '\uFEFF';
            const fullContent = BOM + content;

            // Créer et télécharger un fichier CSV avec encodage UTF-8
            const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${details.title || "Unknown Portal"}_details.csv`;
            link.click();
        }

        if (type === 'txt') {
            // Création du fichier TXT
            let content = `**${details.title || "Unknown Portal"} (GUID: ${window.selectedPortal})**\n`;
            content += `**Date:** ${now.toLocaleString()}\n\n`;

            if (details.mods && Array.isArray(details.mods) && details.mods.length > 0) {
                content += "**Mods:**\n";
                details.mods.forEach(mod => {
                    content += `- **${mod.name || "Unknown"}** (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})\n`;
                });
            } else {
                content += "Mods: None\n";
            }

            if (details.resonators && Array.isArray(details.resonators) && details.resonators.length > 0) {
                content += "**Resonators:**\n";
                details.resonators.forEach(res => {
                    content += `- **Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})\n`;
                });
            } else {
                content += "Resonators: None\n";
            }

            content += "**Linked Portals:**\n";
            Object.values(window.links).forEach(link => {
                if (link.options.data.oGuid === window.selectedPortal || link.options.data.dGuid === window.selectedPortal) {
                    const linkedPortalGuid = (link.options.data.oGuid === window.selectedPortal) ? link.options.data.dGuid : link.options.data.oGuid;
                    const linkedPortal = window.portals[linkedPortalGuid]?.options.data;
                    if (linkedPortal) {
                        content += `- **${linkedPortal.title || "Unknown Portal"}** (GUID: ${linkedPortalGuid})\n`;
                    }
                }
            });

            // Créer et télécharger un fichier TXT
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${details.title || "Unknown Portal"}_details.txt`;
            link.click();
        }
    };

    // Ajouter le bouton export
    window.plugin.exportPortalLinks.addToSidebar();
}
wrapper();
