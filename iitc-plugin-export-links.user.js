// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    1.8.0
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.user.js
// @description 1.8.0 English version - Android compatible. Shows full portal details with mods, resonators and linked portals.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
    var PLUGIN_VERSION = '1.8.0';
    var currentPortalData = null;

    console.log('[Full Portal Details] Init v' + PLUGIN_VERSION);

    if (typeof window.plugin !== 'function') {
        window.plugin = function() {};
    }
    window.plugin.portalDetailsFull = function() {};

    function isMobileDevice() {
        var ua = navigator.userAgent;
        if (/Android|iPhone|iPad|iPod/i.test(ua)) {
            return true;
        }
        return false;
    }

    window.plugin.portalDetailsFull.exportToTelegram = function() {
        if (!currentPortalData) {
            return;
        }

        var now = new Date().toLocaleString();
        var text = '[Date] ' + now + '\n\n';
        text += '[Portal] **' + currentPortalData.portalName + '**\n';
        text += '[GUID] ' + currentPortalData.portalGuid + '\n\n';

        text += '**Mods:**\n';
        var mods = currentPortalData.mods;
        var i;
        var hasMods = false;
        for (i = 0; i < mods.length; i++) {
            if (mods[i]) {
                hasMods = true;
                var modName = mods[i].name || 'Unknown';
                var modOwner = mods[i].owner || 'Unknown';
                var modRarity = mods[i].rarity || 'Unknown';
                text += '  - **' + modName + '** (' + modOwner + ', ' + modRarity + ')\n';
            }
        }
        if (!hasMods) {
            text += '  - None\n';
        }

        text += '\n**Resonators:**\n';
        var resonators = currentPortalData.resonators;
        var hasRes = false;
        for (i = 0; i < resonators.length; i++) {
            if (resonators[i]) {
                hasRes = true;
                var resLevel = resonators[i].level || '?';
                var resOwner = resonators[i].owner || 'Unknown';
                text += '  - **Level ' + resLevel + '** (' + resOwner + ')\n';
            }
        }
        if (!hasRes) {
            text += '  - None\n';
        }

        text += '\n**Linked portals:**\n';
        var links = currentPortalData.linkedPortals;
        if (links.length > 0) {
            for (i = 0; i < links.length; i++) {
                text += '  - ' + links[i].name + '\n';
                text += 'https://link.ingress.com/portal/' + links[i].guid + '\n\n';
            }
        } else {
            text += '  - None\n';
        }

        navigator.clipboard.writeText(text).then(function() {
            alert('OK - Data copied to clipboard!\nPaste it directly into your Telegram group.');
        }).catch(function(err) {
            console.error('[Full Portal Details] Copy error:', err);
            alert('ERROR - Unable to copy to clipboard.');
        });
    };

    window.plugin.portalDetailsFull.showDetailsDialog = function() {
        if (!window.selectedPortal) {
            console.log('[Full Portal Details] No portal selected');
            return;
        }

        var portal = window.portals[window.selectedPortal];
        if (!portal || !portal.options.data) {
            alert('Unable to load this portal details');
            return;
        }

        var details = portal.options.data;
        var portalName = details.title || 'Unknown portal';
        var portalGuid = window.selectedPortal;
        var now = new Date();
        var mods = details.mods || [];
        var resonators = details.resonators || [];

        currentPortalData = {};
        currentPortalData.portalName = portalName;
        currentPortalData.portalGuid = portalGuid;
        currentPortalData.mods = mods;
        currentPortalData.resonators = resonators;
        currentPortalData.linkedPortals = [];

        var content = '<div>';
        content += '<div style="display:flex; justify-content:space-between; align-items:center;">';
        content += '<h3 style="margin:0;"><b>' + now.toLocaleString() + '</b></h3>';
        content += '<button id="telegram-copy-btn" style="padding:6px 10px; font-size:13px; cursor:pointer;">Export to Telegram</button>';
        content += '</div>';

        content += '<h3><b>' + portalName + '</b></h3>';
        content += '<p><b>GUID:</b> ' + portalGuid + '</p>';

        content += '<h4><b>Mods</b></h4><ul>';
        var i;
        var hasMods = false;
        for (i = 0; i < mods.length; i++) {
            if (mods[i]) {
                hasMods = true;
                var modName = mods[i].name || 'Unknown';
                var modOwner = mods[i].owner || 'Unknown';
                var modRarity = mods[i].rarity || 'Unknown';
                content += '<li><b>' + modName + '</b> (Owner: ' + modOwner + ', Rarity: ' + modRarity + ')</li>';
            }
        }
        if (!hasMods) {
            content += '<li>None</li>';
        }
        content += '</ul>';

        content += '<h4><b>Resonators</b></h4><ul>';
        var hasRes = false;
        for (i = 0; i < resonators.length; i++) {
            if (resonators[i]) {
                hasRes = true;
                var resLevel = resonators[i].level || '?';
                var resOwner = resonators[i].owner || 'Unknown';
                content += '<li><b>Level ' + resLevel + '</b> (Owner: ' + resOwner + ')</li>';
            }
        }
        if (!hasRes) {
            content += '<li>None</li>';
        }
        content += '</ul>';

        content += '<h4><b>Linked portals</b></h4><ul>';
        var allLinks = window.links;
        var linksFound = false;
        for (var linkId in allLinks) {
            var link = allLinks[linkId];
            var linkData = link.options.data;
            if (linkData.oGuid === portalGuid || linkData.dGuid === portalGuid) {
                linksFound = true;
                var linkedGuid = (linkData.oGuid === portalGuid) ? linkData.dGuid : linkData.oGuid;
                var linkedPortal = window.portals[linkedGuid];
                if (linkedPortal && linkedPortal.options.data) {
                    var linkedName = linkedPortal.options.data.title || 'Unknown';
                    currentPortalData.linkedPortals.push({
                        name: linkedName,
                        guid: linkedGuid
                    });
                    content += '<li><b>' + linkedName + '</b> (GUID: ' + linkedGuid + ')</li>';
                }
            }
        }
        if (!linksFound) {
            content += '<li>None</li>';
        }
        content += '</ul>';

        content += '</div>';

        var buttons = [];
        buttons.push({
            text: 'OK',
            click: function() {
                $(this).dialog('close');
            }
        });

        window.dialog({
            title: 'Full Portal Details - v' + PLUGIN_VERSION,
            html: content,
            width: isMobileDevice() ? 'auto' : 400,
            buttons: buttons
        });

        setTimeout(function() {
            var btn = document.getElementById('telegram-copy-btn');
            if (btn) {
                btn.onclick = function() {
                    window.plugin.portalDetailsFull.exportToTelegram();
                };
            }
        }, 100);
    };

    window.plugin.portalDetailsFull.addButton = function() {
        if (!window.selectedPortal) {
            return;
        }

        console.log('[Full Portal Details] Adding button');

        $('#portal-details-full-btn').remove();

        var container = $('#portaldetails');
        if (container.length === 0) {
            console.warn('[Full Portal Details] Container not found');
            return;
        }

        console.log('[Full Portal Details] Container found');

        var btn = $('<a></a>');
        btn.attr('id', 'portal-details-full-btn');
        btn.attr('href', '#');
        btn.text('Full Portal Details');
        btn.css('display', 'block');
        btn.css('padding', '8px 12px');
        btn.css('margin', '10px 5px');
        btn.css('background', '#3874ff');
        btn.css('color', 'white');
        btn.css('text-decoration', 'none');
        btn.css('border-radius', '4px');
        btn.css('text-align', 'center');
        btn.css('cursor', 'pointer');
        btn.css('font-weight', 'bold');
        
        btn.on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Full Portal Details] Button clicked');
            window.plugin.portalDetailsFull.showDetailsDialog();
            return false;
        });

        var linkDetails = container.find('.linkdetails');
        if (linkDetails.length > 0) {
            console.log('[Full Portal Details] Adding via .linkdetails');
            linkDetails.append(btn);
        } else {
            console.log('[Full Portal Details] Adding directly to container');
            container.append(btn);
        }

        console.log('[Full Portal Details] Button added successfully');
    };

    window.addHook('portalDetailsUpdated', function() {
        console.log('[Full Portal Details] Hook triggered');
        setTimeout(function() {
            window.plugin.portalDetailsFull.addButton();
        }, 100);
    });

    var setup = function() {
        console.log('[Full Portal Details] Setup called');
        setTimeout(function() {
            window.plugin.portalDetailsFull.addButton();
        }, 2000);
    };

    if (window.iitcLoaded) {
        setup();
    } else if (window.bootPlugins) {
        window.bootPlugins.push(setup);
    } else {
        window.bootPlugins = [setup];
    }

    console.log('[Full Portal Details] Plugin initialized v' + PLUGIN_VERSION);
}

if (window.iitcLoaded) {
    wrapper();
} else {
    if (!window.bootPlugins) {
        window.bootPlugins = [];
    }
    window.bootPlugins.push(wrapper);
}
