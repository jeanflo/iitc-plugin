// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    2.1.0
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.user.js
// @description 2.1.0 Compatible Android! Affiche les mods, résonateurs (niveau & propriétaire), et les portails reliés (nom + GUID) du portail sélectionné. Bouton Telegram placé à côté de la date et heure. Export CSV/TXT/Excel désactivés sur mobile.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
if(typeof window.plugin != 'function') window.plugin = function() {};

window.plugin.portalDetailsFull = function() {};

window.plugin.portalDetailsFull.currentData = null;

window.plugin.portalDetailsFull.isMobile = function() {
    if (window.useAndroidPanes) {
        return window.useAndroidPanes();
    }
    return false;
};

window.plugin.portalDetailsFull.exportTelegram = function() {
    var data = window.plugin.portalDetailsFull.currentData;
    if (!data) return;
    
    var txt = '';
    var i;
    
    txt = txt + '[Portal] **' + data.name + '**\n';
    txt = txt + '[GUID] ' + data.guid + '\n\n';
    
    txt = txt + '**Mods:**\n';
    if (data.mods.length > 0) {
        for (i = 0; i < data.mods.length; i++) {
            txt = txt + '  - **' + data.mods[i].name + '** (' + data.mods[i].owner + ', ' + data.mods[i].rarity + ')\n';
        }
    } else {
        txt = txt + '  - None\n';
    }
    
    txt = txt + '\n**Resonators:**\n';
    if (data.resonators.length > 0) {
        for (i = 0; i < data.resonators.length; i++) {
            txt = txt + '  - **L' + data.resonators[i].level + '** (' + data.resonators[i].owner + ')\n';
        }
    } else {
        txt = txt + '  - None\n';
    }
    
    txt = txt + '\n**Linked portals:**\n';
    if (data.links.length > 0) {
        for (i = 0; i < data.links.length; i++) {
            txt = txt + '  - ' + data.links[i].name + '\n';
            txt = txt + 'https://link.ingress.com/portal/' + data.links[i].guid + '\n\n';
        }
    } else {
        txt = txt + '  - None\n';
    }
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function() {
            alert('Data copied!');
        }).catch(function() {
            alert('Error copying');
        });
    } else {
        alert('Clipboard not available');
    }
};

window.plugin.portalDetailsFull.showDialog = function() {
    if (!window.selectedPortal) return;
    
    var portal = window.portals[window.selectedPortal];
    if (!portal) return;
    if (!portal.options) return;
    if (!portal.options.data) return;
    
    var data = portal.options.data;
    var guid = window.selectedPortal;
    var name = data.title;
    if (!name) name = 'Unknown Portal';
    
    var mods = data.mods;
    if (!mods) mods = [];
    
    var resonators = data.resonators;
    if (!resonators) resonators = [];
    
    var processedMods = [];
    var processedRes = [];
    var linkedPortals = [];
    
    var i;
    for (i = 0; i < mods.length; i++) {
        if (mods[i]) {
            var modObj = {};
            modObj.name = mods[i].name;
            if (!modObj.name) modObj.name = 'Unknown Mod';
            modObj.owner = mods[i].owner;
            if (!modObj.owner) modObj.owner = 'Unknown';
            modObj.rarity = mods[i].rarity;
            if (!modObj.rarity) modObj.rarity = 'Unknown';
            processedMods.push(modObj);
        }
    }
    
    for (i = 0; i < resonators.length; i++) {
        if (resonators[i]) {
            var resObj = {};
            resObj.level = resonators[i].level;
            if (!resObj.level) resObj.level = '?';
            resObj.owner = resonators[i].owner;
            if (!resObj.owner) resObj.owner = 'Unknown';
            processedRes.push(resObj);
        }
    }
    
    var allLinks = window.links;
    for (var linkId in allLinks) {
        var link = allLinks[linkId];
        var linkData = link.options.data;
        
        var isOrigin = (linkData.oGuid == guid);
        var isDest = (linkData.dGuid == guid);
        
        if (isOrigin || isDest) {
            var targetGuid = isOrigin ? linkData.dGuid : linkData.oGuid;
            var targetPortal = window.portals[targetGuid];
            
            if (targetPortal && targetPortal.options && targetPortal.options.data) {
                var linkObj = {};
                linkObj.name = targetPortal.options.data.title;
                if (!linkObj.name) linkObj.name = 'Unknown';
                linkObj.guid = targetGuid;
                linkedPortals.push(linkObj);
            }
        }
    }
    
    var saveData = {};
    saveData.name = name;
    saveData.guid = guid;
    saveData.mods = processedMods;
    saveData.resonators = processedRes;
    saveData.links = linkedPortals;
    window.plugin.portalDetailsFull.currentData = saveData;
    
    var now = new Date().toLocaleString();
    var html = '<div>';
    
    html = html + '<div style="margin-bottom:10px;">';
    html = html + '<span style="font-size:11px;color:#666;">' + now + '</span> ';
    html = html + '<button onclick="window.plugin.portalDetailsFull.exportTelegram();return false;" style="padding:6px 12px;background:#3874ff;color:white;border:none;border-radius:3px;cursor:pointer;float:right;">Telegram</button>';
    html = html + '</div>';
    
    html = html + '<h3 style="color:#ffce00;">' + name + '</h3>';
    html = html + '<p style="font-size:11px;color:#888;">GUID: ' + guid + '</p>';
    
    html = html + '<h4 style="border-bottom:1px solid #333;">Mods</h4>';
    if (processedMods.length > 0) {
        html = html + '<ul>';
        for (i = 0; i < processedMods.length; i++) {
            html = html + '<li><b>' + processedMods[i].name + '</b> (' + processedMods[i].owner + ', ' + processedMods[i].rarity + ')</li>';
        }
        html = html + '</ul>';
    } else {
        html = html + '<p style="color:#888;">None</p>';
    }
    
    html = html + '<h4 style="border-bottom:1px solid #333;">Resonators</h4>';
    if (processedRes.length > 0) {
        html = html + '<ul>';
        for (i = 0; i < processedRes.length; i++) {
            html = html + '<li><b>Level ' + processedRes[i].level + '</b> (' + processedRes[i].owner + ')</li>';
        }
        html = html + '</ul>';
    } else {
        html = html + '<p style="color:#888;">None</p>';
    }
    
    html = html + '<h4 style="border-bottom:1px solid #333;">Linked Portals</h4>';
    if (linkedPortals.length > 0) {
        html = html + '<ul>';
        for (i = 0; i < linkedPortals.length; i++) {
            html = html + '<li><b>' + linkedPortals[i].name + '</b><br><span style="font-size:10px;color:#888;">' + linkedPortals[i].guid + '</span></li>';
        }
        html = html + '</ul>';
    } else {
        html = html + '<p style="color:#888;">None</p>';
    }
    
    html = html + '</div>';
    
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

setup.info = plugin_info;
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
if(window.iitcLoaded && typeof setup == 'function') setup();
}

var script = document.createElement('script');
var info = {};
if (typeof GM_info != 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description
    };
}
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
