// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    2.0.0
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.user.js
// @description 2.0.0 Compatible Android! Affiche les mods, résonateurs (niveau & propriétaire), et les portails reliés (nom + GUID) du portail sélectionné. Bouton Telegram placé à côté de la date et heure. Export CSV/TXT/Excel désactivés sur mobile.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// PLUGIN START
window.plugin.portalDetailsFull = function() {};

window.plugin.portalDetailsFull.currentData = null;

window.plugin.portalDetailsFull.isMobile = function() {
    return window.useAndroidPanes() || /Mobile|Android/i.test(navigator.userAgent);
};

window.plugin.portalDetailsFull.exportTelegram = function() {
    var data = window.plugin.portalDetailsFull.currentData;
    if (!data) return;

    var txt = '';
    var i;

    txt += '[Portal] **' + data.name + '**\n';
    txt += '[GUID] ' + data.guid + '\n\n';

    txt += '**Mods:**\n';
    if (data.mods.length > 0) {
        for (i = 0; i < data.mods.length; i++) {
            txt += '  - **' + data.mods[i].name + '** (' + data.mods[i].owner + ', ' + data.mods[i].rarity + ')\n';
        }
    } else {
        txt += '  - None\n';
    }

    txt += '\n**Resonators:**\n';
    if (data.resonators.length > 0) {
        for (i = 0; i < data.resonators.length; i++) {
            txt += '  - **L' + data.resonators[i].level + '** (' + data.resonators[i].owner + ')\n';
        }
    } else {
        txt += '  - None\n';
    }

    txt += '\n**Linked portals:**\n';
    if (data.links.length > 0) {
        for (i = 0; i < data.links.length; i++) {
            txt += '  - ' + data.links[i].name + '\n';
            txt += 'https://link.ingress.com/portal/' + data.links[i].guid + '\n\n';
        }
    } else {
        txt += '  - None\n';
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function() {
            alert('Data copied to clipboard!');
        }).catch(function() {
            alert('Error: Unable to copy');
        });
    } else {
        alert('Clipboard not available');
    }
};

window.plugin.portalDetailsFull.showDialog = function() {
    if (!window.selectedPortal) return;

    var portal = window.portals[window.selectedPortal];
    if (!portal || !portal.options.data) {
        alert('Unable to load portal details');
        return;
    }

    var data = portal.options.data;
    var guid = window.selectedPortal;
    var name = data.title || 'Unknown Portal';
    var mods = data.mods || [];
    var resonators = data.resonators || [];

    var processedMods = [];
    var processedRes = [];
    var linkedPortals = [];

    var i;
    for (i = 0; i < mods.length; i++) {
        if (mods[i]) {
            processedMods.push({
                name: mods[i].name || 'Unknown Mod',
                owner: mods[i].owner || 'Unknown',
                rarity: mods[i].rarity || 'Unknown'
            });
        }
    }

    for (i = 0; i < resonators.length; i++) {
        if (resonators[i]) {
            processedRes.push({
                level: resonators[i].level || '?',
                owner: resonators[i].owner || 'Unknown'
            });
        }
    }

    for (var linkId in window.links) {
        var link = window.links[linkId];
        var linkData = link.options.data;

        if (linkData.oGuid === guid || linkData.dGuid === guid) {
            var targetGuid = (linkData.oGuid === guid) ? linkData.dGuid : linkData.oGuid;
            var targetPortal = window.portals[targetGuid];

            if (targetPortal && targetPortal.options.data) {
                linkedPortals.push({
                    name: targetPortal.options.data.title || 'Unknown',
                    guid: targetGuid
                });
            }
        }
    }

    window.plugin.portalDetailsFull.currentData = {
        name: name,
        guid: guid,
        mods: processedMods,
        resonators: processedRes,
        links: linkedPortals
    };

    var now = new Date().toLocaleString();
    var html = '<div>';

    html += '<div style="margin-bottom:10px;">';
    html += '<span style="font-size:11px;color:#666;">' + now + '</span> ';
    html += '<button onclick="window.plugin.portalDetailsFull.exportTelegram();return false;" style="padding:6px 12px;background:#3874ff;color:white;border:none;border-radius:3px;cursor:pointer;float:right;">Telegram Export</button>';
    html += '</div>';

    html += '<h3 style="color:#ffce00;">' + name + '</h3>';
    html += '<p style="font-size:11px;color:#888;">GUID: ' + guid + '</p>';

    html += '<h4 style="border-bottom:1px solid #333;padding-bottom:3px;">Mods</h4>';
    if (processedMods.length > 0) {
        html += '<ul>';
        for (i = 0; i < processedMods.length; i++) {
            html += '<li><b>' + processedMods[i].name + '</b> (Owner: ' + processedMods[i].owner + ', Rarity: ' + processedMods[i].rarity + ')</li>';
        }
        html += '</ul>';
    } else {
        html += '<p style="color:#888;font-style:italic;">None</p>';
    }

    html += '<h4 style="border-bottom:1px solid #333;padding-bottom:3px;">Resonators</h4>';
    if (processedRes.length > 0) {
        html += '<ul>';
        for (i = 0; i < processedRes.length; i++) {
            html += '<li><b>Level ' + processedRes[i].level + '</b> (Owner: ' + processedRes[i].owner + ')</li>';
        }
        html += '</ul>';
    } else {
        html += '<p style="color:#888;font-style:italic;">None</p>';
    }

    html += '<h4 style="border-bottom:1px solid #333;padding-bottom:3px;">Linked Portals</h4>';
    if (linkedPortals.length > 0) {
        html += '<ul>';
        for (i = 0; i < linkedPortals.length; i++) {
            html += '<li><b>' + linkedPortals[i].name + '</b><br><span style="font-size:10px;color:#888;">' + linkedPortals[i].guid + '</span></li>';
        }
        html += '</ul>';
    } else {
        html += '<p style="color:#888;font-style:italic;">None</p>';
    }

    html += '</div>';

    dialog({
        title: 'Full Portal Details',
        html: html,
        width: window.plugin.portalDetailsFull.isMobile() ? 'auto' : 450
    });
};

window.plugin.portalDetailsFull.addButton = function() {
    if (!window.selectedPortal) return;

    var container = document.getElementById('portaldetails');
    if (!container) return;

    var existingBtn = document.getElementById('portal-details-btn');
    if (existingBtn) {
        existingBtn.parentNode.removeChild(existingBtn);
    }

    var btn = document.createElement('a');
    btn.id = 'portal-details-btn';
    btn.href = '#';
    btn.textContent = 'Full Portal Details';
    btn.style.display = 'block';
    btn.style.padding = '8px 12px';
    btn.style.margin = '10px 5px';
    btn.style.background = '#3874ff';
    btn.style.color = 'white';
    btn.style.textDecoration = 'none';
    btn.style.borderRadius = '4px';
    btn.style.textAlign = 'center';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';

    btn.addEventListener('click', function(e) {
        e.preventDefault();
        window.plugin.portalDetailsFull.showDialog();
        return false;
    });

    var linkDetails = container.querySelector('.linkdetails');
    if (linkDetails) {
        linkDetails.appendChild(btn);
    } else {
        container.appendChild(btn);
    }
};

var setup = function() {
    window.addHook('portalDetailsUpdated', function() {
        setTimeout(function() {
            window.plugin.portalDetailsFull.addButton();
        }, 100);
    });
};

// PLUGIN END

setup.info = plugin_info;
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
if(window.iitcLoaded && typeof setup === 'function') setup();
}

// WRAPPER END
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description
    };
}
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
