// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    2.4.0
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.user.js
// @description 2.4.0 Compatible Android! Affiche les mods, résonateurs (niveau & propriétaire), et les portails reliés (nom + GUID) du portail sélectionné. Bouton Telegram placé à côté de la date et heure. Export CSV/TXT/Excel désactivés sur mobile.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
if(typeof window.plugin !== 'function') window.plugin = function() {};

window.plugin.portalDetailsFull = function() {};
var self = window.plugin.portalDetailsFull;
self.id = 'portalDetailsFull';
self.title = 'Full Portal Details';
self.version = '2.4.0';
self.currentData = null;

self.exportTelegram = function() {
    if (!self.currentData) return;
    
    var d = self.currentData;
    var txt = '[Portal] **' + d.name + '**\n[GUID] ' + d.guid + '\n\n**Mods:**\n';
    
    var i;
    if (d.mods.length > 0) {
        for (i = 0; i < d.mods.length; i++) {
            txt = txt + '  - **' + d.mods[i].name + '** (' + d.mods[i].owner + ', ' + d.mods[i].rarity + ')\n';
        }
    } else {
        txt = txt + '  - None\n';
    }
    
    txt = txt + '\n**Resonators:**\n';
    if (d.resonators.length > 0) {
        for (i = 0; i < d.resonators.length; i++) {
            txt = txt + '  - **L' + d.resonators[i].level + '** (' + d.resonators[i].owner + ')\n';
        }
    } else {
        txt = txt + '  - None\n';
    }
    
    txt = txt + '\n**Linked portals:**\n';
    if (d.links.length > 0) {
        for (i = 0; i < d.links.length; i++) {
            txt = txt + '  - ' + d.links[i].name + '\nhttps://link.ingress.com/portal/' + d.links[i].guid + '\n\n';
        }
    } else {
        txt = txt + '  - None\n';
    }
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function() {
            alert('Data copied!');
        }).catch(function() {
            alert('Copy error');
        });
    }
};

self.showDialog = function() {
    if (!window.selectedPortal) return;
    
    var portal = window.portals[window.selectedPortal];
    if (!portal || !portal.options || !portal.options.data) return;
    
    var data = portal.options.data;
    var guid = window.selectedPortal;
    var name = data.title || 'Unknown';
    var mods = data.mods || [];
    var resonators = data.resonators || [];
    
    var processedMods = [];
    var processedRes = [];
    var linkedPortals = [];
    
    var i;
    for (i = 0; i < mods.length; i++) {
        if (mods[i]) {
            processedMods.push({
                name: mods[i].name || 'Unknown',
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
        
        if (linkData.oGuid == guid || linkData.dGuid == guid) {
            var targetGuid = (linkData.oGuid == guid) ? linkData.dGuid : linkData.oGuid;
            var targetPortal = window.portals[targetGuid];
            
            if (targetPortal && targetPortal.options && targetPortal.options.data) {
                linkedPortals.push({
                    name: targetPortal.options.data.title || 'Unknown',
                    guid: targetGuid
                });
            }
        }
    }
    
    self.currentData = {
        name: name,
        guid: guid,
        mods: processedMods,
        resonators: processedRes,
        links: linkedPortals
    };
    
    var html = '<div style="padding:10px;">';
    html = html + '<button onclick="window.plugin.portalDetailsFull.exportTelegram();return false;" style="padding:6px 12px;background:#3874ff;color:white;border:none;border-radius:3px;cursor:pointer;float:right;">Telegram</button>';
    html = html + '<h3 style="color:#ffce00;margin-top:0;">' + name + '</h3>';
    html = html + '<p style="font-size:11px;color:#888;">GUID: ' + guid + '</p>';
    
    html = html + '<h4 style="border-bottom:1px solid #333;padding-bottom:3px;">Mods</h4>';
    if (processedMods.length > 0) {
        html = html + '<ul style="margin:5px 0;padding-left:20px;">';
        for (i = 0; i < processedMods.length; i++) {
            html = html + '<li><b>' + processedMods[i].name + '</b> (' + processedMods[i].owner + ', ' + processedMods[i].rarity + ')</li>';
        }
        html = html + '</ul>';
    } else {
        html = html + '<p style="color:#888;font-style:italic;">None</p>';
    }
    
    html = html + '<h4 style="border-bottom:1px solid #333;padding-bottom:3px;">Resonators</h4>';
    if (processedRes.length > 0) {
        html = html + '<ul style="margin:5px 0;padding-left:20px;">';
        for (i = 0; i < processedRes.length; i++) {
            html = html + '<li><b>Level ' + processedRes[i].level + '</b> (' + processedRes[i].owner + ')</li>';
        }
        html = html + '</ul>';
    } else {
        html = html + '<p style="color:#888;font-style:italic;">None</p>';
    }
    
    html = html + '<h4 style="border-bottom:1px solid #333;padding-bottom:3px;">Linked Portals</h4>';
    if (linkedPortals.length > 0) {
        html = html + '<ul style="margin:5px 0;padding-left:20px;">';
        for (i = 0; i < linkedPortals.length; i++) {
            html = html + '<li><b>' + linkedPortals[i].name + '</b><br><span style="font-size:10px;color:#888;">' + linkedPortals[i].guid + '</span></li>';
        }
        html = html + '</ul>';
    } else {
        html = html + '<p style="color:#888;font-style:italic;">None</p>';
    }
    
    html = html + '</div>';
    
    window.dialog({
        html: html,
        title: self.title,
        width: 450
    });
};

self.addButton = function() {
    if (!window.selectedPortal) return;
    
    var container = document.getElementById('portaldetails');
    if (!container) return;
    
    var existingBtn = document.getElementById('portal-details-btn');
    if (existingBtn) existingBtn.parentNode.removeChild(existingBtn);
    
    var aside = document.createElement('aside');
    var btn = document.createElement('a');
    btn.id = 'portal-details-btn';
    btn.textContent = 'Full Portal Details';
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        self.showDialog();
        return false;
    }, false);
    
    aside.appendChild(btn);
    
    var linkDetails = container.querySelector('.linkdetails');
    if (linkDetails) {
        linkDetails.appendChild(aside);
    } else {
        container.appendChild(aside);
    }
};

self.setupCallback = function() {
    window.addHook('portalDetailsUpdated', function(data) {
        self.addButton();
    });
};

self.setup = function() {
    if (self.setupDone) return;
    self.setupDone = true;
    
    self.setupCallback();
};

var setup = self.setup;

setup.info = plugin_info;
if (!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
if (window.iitcLoaded && typeof setup === 'function') setup();
}

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
