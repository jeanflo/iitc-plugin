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

    // Fonction pour copier dans le presse-papiers
    window.plugin.exportPortalLinks.copyToClipboard = function() {
        const portal = window.portals[window.selectedPortal];
        if (!portal || !portal.options.data) {
            alert("Les détails du portail ne sont pas encore chargés.");
            return;
        }
        const details = portal.options.data;
        const now = new Date().toLocaleString(); // Récupérer la date et l'heure actuelle

        let content = `📅 **Date:** ${now}\n\n`; // Ajout de la date et l'heure au début
        content += `**${details.title}** (GUID: \` ${window.selectedPortal} \`)\n\n`; // Nom du portail en gras avec GUID en chasse fixe

        // Vérification si 'mods' est défini et si ce n'est pas un tableau vide
        if (details.mods && Array.isArray(details.mods) && details.mods.length > 0) {
            content += "**Mods:**\n";
            details.mods.forEach(mod => {
                content += `- **${mod.name || "Unknown"}** (Owner: ${mod.owner || "Unknown"}, Rarity: ${mod.rarity || "Unknown"})\n`;
            });
        } else {
            content += "Mods: None\n";
        }

        // Vérification si 'resonators' est défini et si ce n'est pas un tableau vide
        if (details.resonators && Array.isArray(details.resonators) && details.resonators.length > 0) {
            content += "**Resonators:**\n";
            details.resonators.forEach(res => {
                content += `- **Level ${res.level || "?"}** (Owner: ${res.owner || "Unknown"})\n`;
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
                    content += `- **${linkedPortal.title || "Unknown Portal"}** (GUID: \` ${linkedPortalGuid} \`)\n`;
                    linkedPortalsFound = true;
                }
            }
        });
        if (!linkedPortalsFound) content += "Linked Portals: None\n";

        // Copier le texte dans le presse-papiers
        navigator.clipboard.writeText(content).then(() => {
            // Affichage d'un message temporaire
            const tempDiv = document.createElement('div');
            tempDiv.textContent = "Texte copié dans le presse-papiers !";
            tempDiv.style.position = 'fixed';
            tempDiv.style.top = '50%';
            tempDiv.style.left = '50%';
            tempDiv.style.transform = 'translate(-50%, -50%)';
            tempDiv.style.padding = '10px';
            tempDiv.style.background = 'rgba(0,0,0,0.7)';
            tempDiv.style.color = 'white';
            tempDiv.style.borderRadius = '5px';
            tempDiv.style.zIndex = '9999';

            document.body.appendChild(tempDiv);

            // Supprimer le message après 2 secondes
            setTimeout(() => {
                document.body.removeChild(tempDiv);
            }, 2000);
        }).catch(err => {
            console.error("Erreur lors de la copie : ", err);
            alert("Impossible de copier dans le presse-papiers.");
        });
    };

    window.plugin.exportPortalLinks.addToSidebar();
}
wrapper();
