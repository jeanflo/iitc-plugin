// ==UserScript==
// @id         iitc-plugin-export-links
// @name       IITC plugin: Export Portal Links
// @category   Info
// @version    1
// @namespace  https://github.com/jeanflo/iitc-plugin/blob/main/iitc-plugin-export-links
// @updateURL  https://github.com/jeanflo/iitc-plugin/blob/main/export-links.meta.js
// @downloadURL https://github.com/jeanflo/iitc-plugin/blob/main/export-links.user.js
// @description Export the list of links from a selected portal.
// @include        https://intel.ingress.com/
// @include        http://*.ingress.com/*
// @match          https://intel.ingress.com/
// @match          http://*.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
    if (typeof window.plugin !== 'function') window.plugin = function() {};

    window.plugin.exportLinks = function() {};

    plugin_info.buildName = 'exportLinks';
    plugin_info.dateTimeVersion = '20231001000000';
    plugin_info.pluginId = 'exportLinks';

    var self = window.plugin.exportLinks;
    self.id = 'exportLinks';
    self.title = 'Export Portal Links';
    self.version = '0.1.0';
    self.author = 'Your Name';
    self.dialogobject = null;

    function setup() {
        console.log('Setting up Export Links plugin');
        window.addHook('portalDetailsUpdated', self.addToSidebar);
    }

    self.addToSidebar = function() {
        // Add the button to the portal details sidebar
        $('.linkdetails').append('<aside><a id="export-links" href="#">Export Links</a></aside>');

        // Add click event to the button
        $('#export-links').on('click', function(event) {
            event.preventDefault();
            self.forceLoadLinkedPortals();
            self.menu();
        });
    };

    self.forceLoadLinkedPortals = function() {
        const selectedPortalGuid = window.selectedPortal;
        if (!selectedPortalGuid) {
            console.log('No portal selected');
            alert('Please select a portal first.');
            return;
        }

        console.log('Forcing load of linked portals for:', selectedPortalGuid);

        const portalLinks = getPortalLinks(selectedPortalGuid);
        if (!portalLinks || (portalLinks.in.length + portalLinks.out.length) === 0) {
            console.log('No links found for the selected portal');
            return;
        }

        const linkedGuids = [...portalLinks.in, ...portalLinks.out];
        linkedGuids.forEach(guid => {
            if (!window.portals[guid]) {
                window.portalDetail.request(guid);
            }
        });
    };

    self.menu = function() {
        var html = '<div class="' + self.id + 'menu">' +
            '<div class="' + self.id + 'menubuttons">' +
            '<button id="copyPortals">Copy to Clipboard</button>' +
            '<button id="downloadPortals">Download as TXT</button>' +
            '<button id="closeModal">Close</button>' +
            '</div>' +
            '<h2>Selected Portal</h2>' +
            '<textarea id="selectedPortalText" rows="5" style="width:100%;box-sizing:border-box;"></textarea>' +
            '<h2>Linked Portals</h2>' +
            '<textarea id="linkedPortalsText" rows="10" style="width:100%;box-sizing:border-box;"></textarea>' +
            '</div>';

        if (window.useAndroidPanes()) {
            self.closedialog(); // close, if any
            $('#' + self.id + 'menu').remove();
            $('<div id="' + self.id + 'menu" class="mobile">').append(html).appendTo(document.body);
        } else {
            self.dialogobject = window.dialog({
                html: $('<div id="' + self.id + 'menu">').append(html),
                id: 'plugin-' + self.id + '-dialog',
                title: self.title,
                width: 500
            });
        }

        self.exportLinks();
    };

    self.exportLinks = function() {
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

        // Get selected portal details
        const selectedPortal = window.portals[selectedPortalGuid].options.data;
        const selectedResonators = selectedPortal.resonators || [];
        const selectedMods = selectedPortal.mods || [];

        const selectedResonatorInfo = selectedResonators.map(res => `${res.owner}: L${res.level}`).join(', ');
        const selectedModInfo = selectedMods.map(mod => `${mod.owner}: ${mod.name}`).join(', ');

        const selectedPortalContent = `Title: ${selectedPortal.title}\nGUID: ${selectedPortalGuid}\nResonators: ${selectedResonatorInfo}\nMods: ${selectedModInfo}`;
        $('#selectedPortalText').val(selectedPortalContent);

        function processLink(linkGuid, direction) {
            const link = window.links[linkGuid].options.data;
            const guid = link[direction + 'Guid'];
            const portal = portals[guid] ? portals[guid].options.data : portalDetail.get(guid);

            if (portal) {
                const resonators = portal.resonators || [];
                const mods = portal.mods || [];

                if (resonators.length === 0) {
                    console.warn(`No resonators found for portal: ${portal.title} (GUID: ${guid})`);
                }

                if (mods.length === 0) {
                    console.warn(`No mods found for portal: ${portal.title} (GUID: ${guid})`);
                }

                const resonatorInfo = resonators.map(res => `${res.owner}: L${res.level}`).join(', ');
                const modInfo = mods.map(mod => `${mod.owner}: ${mod.name}`).join(', ');

                linkedPortals.push(`${portal.title} (GUID: ${guid})\nResonators: ${resonatorInfo}\nMods: ${modInfo}`);
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

        const portalListContent = linkedPortals.join('\n\n');
        $('#linkedPortalsText').val(portalListContent);

        $('#copyPortals').on('click', function() {
            const textArea = document.getElementById('linkedPortalsText');
            textArea.select();
            document.execCommand('copy');
            alert('Copied to clipboard!');
        });

        $('#downloadPortals').on('click', function() {
            const blob = new Blob([selectedPortalContent + '\n\n' + portalListContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedPortal.title.replace(/[^a-z0-9]+/i, '_')}_links.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });

        $('#closeModal').on('click', function() {
            self.closedialog();
        });
    };

    self.closedialog = function() {
        if (self.dialogobject) {
            self.dialogobject.dialog('close');
            self.dialogobject = null;
        }
        $('#' + self.id + 'menu').remove();
    };

    // Wait for the DOM to be fully loaded before setting up the plugin
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM fully loaded and parsed');
        setup();
    });

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
