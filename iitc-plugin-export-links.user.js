// ==UserScript==
// @id         iitc-plugin-export-links
// @name       IITC plugin: Export Portal Links
// @category   Info
// @version    0.1.5
// @namespace  https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-export-links
// @updateURL  https://github.com/jeanflo/iitc-plugin/blob/main/export-links.meta.js
// @downloadURL https://github.com/jeanflo/iitc-plugin/blob/main/export-links.user.js
// @description Export the list of links from a selected portal.
// @include        https://*.ingress.com/*
// @include        http://*.ingress.com/*
// @match          https://*.ingress.com/*
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
    if (typeof window.plugin !== 'function') window.plugin = function() {};

    window.plugin.exportLinks = function() {};

    plugin_info.buildName = 'exportLinks';
    plugin_info.dateTimeVersion = '20231001000000';
    plugin_info.pluginId = 'exportLinks';

    function setup() {
        window.addHook('portalDetailsUpdated', window.plugin.exportLinks.addToSidebar);
    }

    window.plugin.exportLinks.addToSidebar = function() {
        $('.linkdetails').append('<aside><a id="export-links" onclick="window.plugin.exportLinks.exportLinks();return false;">Export Links</a></aside>');
    };

    window.plugin.exportLinks.exportLinks = function() {
        console.log('Export Links button clicked');

        const selectedPortalGuid = window.selectedPortal;
        if (!selectedPortalGuid) {
            console.log('No portal selected');
            alert('Please select a portal first.');
            return;
        }

        console.log('Selected Portal GUID:', selectedPortalGuid);

        const portalLinks = getPortalLinks(selectedPortalGuid);
        const linkedPortals = [];

        console.log('Portal Links:', portalLinks);

        if (!portalLinks || (portalLinks.in.length + portalLinks.out.length) === 0) {
            console.log('No links found for the selected portal');
            alert('No linked portals found.');
            return;
        }

        function processLink(linkGuid, direction) {
            const link = window.links[linkGuid].options.data;
            const guid = link[direction + 'Guid'];
            const portal = portals[guid] ? portals[guid].options.data : portalDetail.get(guid);

            if (portal) {
                linkedPortals.push(``${{portal.title} (GUID:}$`{guid})`);
            } else {
                console.log('Portal not found:', guid);
            }
        }

        portalLinks.out.forEach(linkGuid => processLink(linkGuid, 'd'));
        portalLinks.in.forEach(linkGuid => processLink(linkGuid, 'o'));

        if (linkedPortals.length === 0) {
            console.log('No linked portals found');
            alert('No linked portals found.');
            return;
        }

        // Get the selected portal's title
        const selectedPortalTitle = window.portals[selectedPortalGuid].options.data.title;

        // Add the selected portal info to the content
        const portalListContent = `Selected Portal: `${{selectedPortalTitle} (GUID:}$`{selectedPortalGuid})\n\n${linkedPortals.join('\n')}`;

        // Get the current date and time
        const now = new Date();
        const formattedDate = ``${{String(now.getDate()).padStart(2, '0')}-}$`{String(now.getMonth() + 1).padStart(2, '0')}-`${{now.getFullYear()}}$`{String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Check if the user is on a mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // Mobile behavior
            const mobileModalHtml = `
                <div id="linkedPortalsModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:white;padding:20px;box-sizing:border-box;z-index:1000;overflow-y:auto;">
                    <h2 style="font-size:1.5em;margin-top:0;">Linked Portals</h2>
                    <p><strong>Selected Portal:</strong> `${{selectedPortalTitle} (GUID:}$`{selectedPortalGuid})</p>
                    <textarea id="linkedPortalsText" rows="10" style="width:100%;box-sizing:border-box;">${portalListContent}</textarea><br>
                    <button id="copyPortals" style="display:block;width:100%;padding:10px;margin-top:10px;font-size:1em;">Copy to Clipboard</button>
                    <button id="downloadPortals" style="display:block;width:100%;padding:10px;margin-top:10px;font-size:1em;">Download as CSV</button>
                    <button id="closeModal" style="display:block;width:100%;padding:10px;margin-top:10px;font-size:1em;">Close</button>
                </div>
            `;

            $('body').append(mobileModalHtml);
            $('#linkedPortalsModal').show();
        } else {
            // Desktop behavior
            const modalHtml = `
                <div id="linkedPortalsModal" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);background:white;padding:20px;border:1px solid #ccc;z-index:1000;width:50%;max-width:600px;box-sizing:border-box;">
                    <h2 style="font-size:1.5em;margin-top:0;">Linked Portals</h2>
                    <p><strong>Selected Portal:</strong> `${{selectedPortalTitle} (GUID:}$`{selectedPortalGuid})</p>
                    <textarea id="linkedPortalsText" rows="10" style="width:100%;box-sizing:border-box;">${portalListContent}</textarea><br>
                    <button id="copyPortals" style="display:block;width:100%;padding:10px;margin-top:10px;font-size:1em;">Copy to Clipboard</button>
                    <button id="downloadPortals" style="display:block;width:100%;padding:10px;margin-top:10px;font-size:1em;">Download as CSV</button>
                    <button id="closeModal" style="display:block;width:100%;padding:10px;margin-top:10px;font-size:1em;">Close</button>
                </div>
                <div id="modalOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999;display:none;"></div>
            `;

            $('body').append(modalHtml);
            $('#linkedPortalsModal').show();
            $('#modalOverlay').show();
        }

        $('#copyPortals').on('click', function() {
            const textArea = document.getElementById('linkedPortalsText');
            textArea.select();
            document.execCommand('copy');
            alert('Copied to clipboard!');
        });

        $('#downloadPortals').on('click', function() {
            const blob = new Blob([portalListContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = ``${{selectedPortalTitle.replace(/[^a-z0-9]+/i, '_')}_}$`{formattedDate}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });

        $('#closeModal').on('click', function() {
            $('#linkedPortalsModal').remove();
            $('#modalOverlay').remove();
        });
    };

    setup.info = plugin_info;

    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    if (window.iitcLoaded && typeof setup === 'function') setup();
}

var script = document.createElement('script');
var info = {};

if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description
    };
}

var textContent = document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ')');
script.appendChild(textContent);
(document.body || document.head || document.documentElement).appendChild(script);
