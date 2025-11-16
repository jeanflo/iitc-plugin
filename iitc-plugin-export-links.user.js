// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    1.9.0
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-export-links.user.js
// @description 1.9.0 Compatible Android! Affiche les mods, résonateurs (niveau & propriétaire), et les portails reliés (nom + GUID) du portail sélectionné. Bouton Telegram placé à côté de la date et heure. Export CSV/TXT/Excel désactivés sur mobile.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper() {
    var VERSION = '1.9.0';

    if (typeof window.plugin !== 'function') {
        window.plugin = function() {};
    }

    window.plugin.portalDetailsFull = {
        currentData: null,

        isMobile: function() {
            return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        },

        exportTelegram: function() {
            var self = window.plugin.portalDetailsFull;
            if (!self.currentData) return;

            var d = self.currentData;
            var txt = '';
            var i = 0;

            txt += '[Portal] **' + d.name + '**\n';
            txt += '[GUID] ' + d.guid + '\n\n';

            txt += '**Mods:**\n';
            if (d.mods.length > 0) {
                for (i = 0; i < d.mods.length; i++) {
                    txt += '  - **' + d.mods[i].name + '** (' + d.mods[i].owner + ', ' + d.mods[i].rarity + ')\n';
                }
            } else {
                txt += '  - None\n';
            }

            txt += '\n**Resonators:**\n';
            if (d.resonators.length > 0) {
                for (i = 0; i < d.resonators.length; i++) {
                    txt += '  - **L' + d.resonators[i].level + '** (' + d.resonators[i].owner + ')\n';
                }
            } else {
                txt += '  - None\n';
            }

            txt += '\n**Linked portals:**\n';
            if (d.links.length > 0) {
                for (i = 0; i < d.links.length; i++) {
                    txt += '  - ' + d.links[i].name + '\n';
                    txt += 'https://link.ingress.com/portal/' + d.links[i].guid + '\n\n';
                }
            } else {
                txt += '  - None\n';
            }

            navigator.clipboard.writeText(txt).then(function() {
                alert('Data copied to clipboard!\nPaste it in your Telegram group.');
            }).catch(function() {
                alert('Error: Unable to copy to clipboard');
            });
        },

        showDialog: function() {
            var self = window.plugin.portalDetailsFull;

            if (!window.selectedPortal) {
                console.log('[Portal Details] No portal selected');
                return;
            }

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

            var i = 0;
            for (i = 0; i < mods.length; i++) {
                if (mods[i] !== null) {
                    processedMods.push({
                        name: mods[i].name || 'Unknown Mod',
                        owner: mods[i].owner || 'Unknown',
                        rarity: mods[i].rarity || 'Unknown'
                    });
                }
            }

            for (i = 0; i < resonators.length; i++) {
                if (resonators[i] !== null) {
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

            self.currentData = {
                name: name,
                guid: guid,
                mods: processedMods,
                resonators: processedRes,
                links: linkedPortals
            };

            var now = new Date().toLocaleString();
            var html = '<div style="font-family:sans-serif;">';

            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
            html += '<span style="font-size:11px;color:#666;">' + now + '</span>';
            html += '<button id="telegram-btn" style="padding:6px 12px;background:#3874ff;color:white;border:none;border-radius:3px;cursor:pointer;">Telegram Export</button>';
            html += '</div>';

            html += '<h3 style="margin:10px 0;color:#ffce00;">' + name + '</h3>';
            html += '<p style="font-size:11px;color:#888;margin:5px 0;">GUID: ' + guid + '</p>';

            html += '<h4 style="margin:15px 0 5px 0;border-bottom:1px solid #333;padding-bottom:3px;">Mods</h4>';
            if (processedMods.length > 0) {
                html += '<ul style="margin:5px 0;padding-left:20px;">';
                for (i = 0; i < processedMods.length; i++) {
                    html += '<li><strong>' + processedMods[i].name + '</strong> (Owner: ' + processedMods[i].owner + ', Rarity: ' + processedMods[i].rarity + ')</li>';
                }
                html += '</ul>';
            } else {
                html += '<p style="color:#888;font-style:italic;margin:5px 0;">None</p>';
            }

            html += '<h4 style="margin:15px 0 5px 0;border-bottom:1px solid #333;padding-bottom:3px;">Resonators</h4>';
            if (processedRes.length > 0) {
                html += '<ul style="margin:5px 0;padding-left:20px;">';
                for (i = 0; i < processedRes.length; i++) {
                    html += '<li><strong>Level ' + processedRes[i].level + '</strong> (Owner: ' + processedRes[i].owner + ')</li>';
                }
                html += '</ul>';
            } else {
                html += '<p style="color:#888;font-style:italic;margin:5px 0;">None</p>';
            }

            html += '<h4 style="margin:15px 0 5px 0;border-bottom:1px solid #333;padding-bottom:3px;">Linked Portals</h4>';
            if (linkedPortals.length > 0) {
                html += '<ul style="margin:5px 0;padding-left:20px;">';
                for (i = 0; i < linkedPortals.length; i++) {
                    html += '<li><strong>' + linkedPortals[i].name + '</strong><br><span style="font-size:10px;color:#888;">' + linkedPortals[i].guid + '</span></li>';
                }
                html += '</ul>';
            } else {
                html += '<p style="color:#888;font-style:italic;margin:5px 0;">None</p>';
            }

            html += '</div>';

            window.dialog({
                title: 'Full Portal Details v' + VERSION,
                html: html,
                width: self.isMobile() ? 'auto' : 450,
                buttons: [{
                    text: 'Close',
                    click: function() {
                        $(this).dialog('close');
                    }
                }]
            });

            setTimeout(function() {
                var btn = document.getElementById('telegram-btn');
                if (btn) {
                    btn.onclick = function() {
                        window.plugin.portalDetailsFull.exportTelegram();
                    };
                }
            }, 50);
        },

        addButton: function() {
            var self = window.plugin.portalDetailsFull;

            if (!window.selectedPortal) return;

            $('#portal-details-btn').remove();

            var container = $('#portaldetails');
            if (container.length === 0) return;

            var btn = $('<a></a>');
            btn.attr('id', 'portal-details-btn');
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
                self.showDialog();
                return false;
            });

            var linkDetails = container.find('.linkdetails');
            if (linkDetails.length > 0) {
                linkDetails.append(btn);
            } else {
                container.append(btn);
            }
        }
    };

    window.addHook('portalDetailsUpdated', function() {
        setTimeout(function() {
            window.plugin.portalDetailsFull.addButton();
        }, 100);
    });

    var setup = function() {
        setTimeout(function() {
            window.plugin.portalDetailsFull.addButton();
        }, 2000);
    };

    if (window.iitcLoaded) {
        setup();
    } else {
        if (!window.bootPlugins) window.bootPlugins = [];
        window.bootPlugins.push(setup);
    }

    console.log('[Full Portal Details] Plugin loaded v' + VERSION);
}

if (window.iitcLoaded) {
    wrapper();
} else {
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(wrapper);
}
