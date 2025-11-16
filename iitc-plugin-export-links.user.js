// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    2.2.0
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.user.js
// @description 2.2.0 Compatible Android! Affiche les mods, résonateurs (niveau & propriétaire), et les portails reliés (nom + GUID) du portail sélectionné. Bouton Telegram placé à côté de la date et heure. Export CSV/TXT/Excel désactivés sur mobile.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// use own namespace for plugin
window.plugin.portalDetailsFull = function() {};
var self = window.plugin.portalDetailsFull;
self.id = 'portalDetailsFull';
self.title = 'Full Portal Details';
self.version = '2.2.0';
self.currentData = null;

self.isMobile = function() {
    return window.useAndroidPanes && window.useAndroidPanes();
};

self.exportTelegram = function() {
    if (!self.currentData) return;
    
    var d = self.currentData;
    var txt = '';
    var i;
    
    txt = txt + '[Portal] **' + d.name + '**\n';
    txt = txt + '[GUID] ' + d.guid + '\n\n';
    
    txt = txt + '**Mods:**\n';
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
            txt = txt + '  - ' + d.links[i].name + '\n';
            txt = txt + 'https://link.ingress.com/portal/' + d.links[i].guid + '\n\n';
        }
    } else {
        txt = txt + '  - None\n';
    }
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function() {
            alert('Data copied to clipboard!');
        }).catch(function() {
            alert('Error copying to clipboard');
        });
    } else {
        alert('Clipboard not available');
    }
};

self.showDialog = function() {
    if (!window.selectedPortal) return;
    
    var portal = window.portals[window.selectedPortal];
    if (!portal || !portal.options || !portal.options.data) {
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
            var modObj = {};
            modObj.name = mods[i].name || 'Unknown Mod';
            modObj.owner = mods[i].owner || 'Unknown';
            modObj.rarity = mods[i].rarity || 'Unknown';
            processedMods.push(modObj);
        }
    }
    
    for (i = 0; i < resonators.length; i++) {
        if (resonators[i]) {
            var resObj = {};
            resObj.level = resonators[i].level || '?';
            resObj.owner = resonators[i].owner || 'Unknown';
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
                linkObj.name = targetPortal.options.data.title || 'Unknown';
                linkObj.guid = targetGuid;
                linkedPortals.push(linkObj);
            }
        }
    }
    
    self.currentData = {};
    self.currentData.name = name;
    self.currentData.guid = guid;
    self.currentData.mods = processedMods;
    self.currentData.resonators = processedRes;
    self.currentData.links = linkedPortals;
    
    var now = new Date().toLocaleString();
    var container = document.createElement('div');
    container.id = self.id + 'menu';
    container.className = self.id + 'menu';
    
    var headerDiv = container.appendChild(document.createElement('div'));
    headerDiv.innerHTML = '<span style="font-size:11px;color:#666;">' + now + '</span> ';
    
    var telegramBtn = headerDiv.appendChild(document.createElement('button'));
    telegramBtn.innerText = 'Telegram Export';
    telegramBtn.style.padding = '6px 12px';
    telegramBtn.style.background = '#3874ff';
    telegramBtn.style.color = 'white';
    telegramBtn.style.border = 'none';
    telegramBtn.style.borderRadius = '3px';
    telegramBtn.style.cursor = 'pointer';
    telegramBtn.style.cssFloat = 'right';
    telegramBtn.addEventListener('click', function(e) {
        e.preventDefault();
        self.exportTelegram();
    }, false);
    
    var titleH3 = container.appendChild(document.createElement('h3'));
    titleH3.style.color = '#ffce00';
    titleH3.innerText = name;
    
    var guidP = container.appendChild(document.createElement('p'));
    guidP.style.fontSize = '11px';
    guidP.style.color = '#888';
    guidP.innerText = 'GUID: ' + guid;
    
    var modsH4 = container.appendChild(document.createElement('h4'));
    modsH4.style.borderBottom = '1px solid #333';
    modsH4.innerText = 'Mods';
    
    if (processedMods.length > 0) {
        var modsUl = container.appendChild(document.createElement('ul'));
        for (i = 0; i < processedMods.length; i++) {
            var modLi = modsUl.appendChild(document.createElement('li'));
            modLi.innerHTML = '<b>' + processedMods[i].name + '</b> (' + processedMods[i].owner + ', ' + processedMods[i].rarity + ')';
        }
    } else {
        var noModsP = container.appendChild(document.createElement('p'));
        noModsP.style.color = '#888';
        noModsP.innerText = 'None';
    }
    
    var resH4 = container.appendChild(document.createElement('h4'));
    resH4.style.borderBottom = '1px solid #333';
    resH4.innerText = 'Resonators';
    
    if (processedRes.length > 0) {
        var resUl = container.appendChild(document.createElement('ul'));
        for (i = 0; i < processedRes.length; i++) {
            var resLi = resUl.appendChild(document.createElement('li'));
            resLi.innerHTML = '<b>Level ' + processedRes[i].level + '</b> (' + processedRes[i].owner + ')';
        }
    } else {
        var noResP = container.appendChild(document.createElement('p'));
        noResP.style.color = '#888';
        noResP.innerText = 'None';
    }
    
    var linksH4 = container.appendChild(document.createElement('h4'));
    linksH4.style.borderBottom = '1px solid #333';
    linksH4.innerText = 'Linked Portals';
    
    if (linkedPortals.length > 0) {
        var linksUl = container.appendChild(document.createElement('ul'));
        for (i = 0; i < linkedPortals.length; i++) {
            var linkLi = linksUl.appendChild(document.createElement('li'));
            linkLi.innerHTML = '<b>' + linkedPortals[i].name + '</b><br><span style="font-size:10px;color:#888;">' + linkedPortals[i].guid + '</span>';
        }
    } else {
        var noLinksP = container.appendChild(document.createElement('p'));
        noLinksP.style.color = '#888';
        noLinksP.innerText = 'None';
    }
    
    if (self.isMobile()) {
        var existingMenu = document.getElementById(self.id + 'menu');
        if (existingMenu) existingMenu.remove();
        var mobileDiv = document.createElement('div');
        mobileDiv.id = self.id + 'menu';
        mobileDiv.className = 'mobile';
        mobileDiv.appendChild(container);
        document.body.appendChild(mobileDiv);
    } else {
        window.dialog({
            html: container,
            id: 'plugin-' + self.id + '-dialog',
            title: self.title,
            width: 450
        });
    }
};

self.addButton = function() {
    if (!window.selectedPortal) return;
    
    var existingBtn = document.getElementById('portal-details-btn');
    if (existingBtn) {
        existingBtn.parentNode.removeChild(existingBtn);
    }
    
    var container = document.getElementById('portaldetails');
    if (!container) return;
    
    var btn = document.createElement('a');
    btn.id = 'portal-details-btn';
    btn.href = '#';
    btn.innerText = 'Full Portal Details';
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
        self.showDialog();
    }, false);
    
    var linkDetails = container.querySelector('.linkdetails');
    if (linkDetails) {
        linkDetails.appendChild(btn);
    } else {
        container.appendChild(btn);
    }
};

self.setup = function() {
    if ('pluginloaded' in self) {
        console.log('IITC plugin already loaded: ' + self.title + ' version ' + self.version);
        return;
    } else {
        self.pluginloaded = true;
    }
    
    var stylesheet = document.head.appendChild(document.createElement('style'));
    stylesheet.innerHTML = '\
#' + self.id + 'menu.mobile {\
    background: transparent;\
    border: 0 none !important;\
    height: 100% !important;\
    width: 100% !important;\
    left: 0 !important;\
    top: 0 !important;\
    position: absolute;\
    overflow: auto;\
}\
';
    
    var sidebar = document.querySelector('#sidebar');
    if (sidebar) {
        var sidebarobserver = new MutationObserver(function(mutations) {
            self.addButton();
        });
        var observerconfig = {
            childList: true,
            subtree: true
        };
        sidebarobserver.observe(sidebar, observerconfig);
    }
    
    window.addHook('portalDetailsUpdated', function() {
        window.setTimeout(function() {
            self.addButton();
        }, 100);
    });
    
    console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
};

var setup = function() {
    (window.iitcLoaded ? self.setup() : window.addHook('iitcLoaded', self.setup));
};

setup.info = plugin_info;
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
if(window.iitcLoaded && typeof setup === 'function') setup();
}

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
