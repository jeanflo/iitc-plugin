// ==UserScript==
// @id         iitc-plugin-export-links
// @name       IITC plugin: Export Portal Links
// @category   Info
// @version    0.1.0
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

    function setup() {
        window.addHook('portalDetailsUpdated', window.plugin.exportLinks.addToSidebar);
    }

    window.plugin.exportLinks.addToSidebar = function() {
        $('.linkdetails').append('<aside><a id="export-links" onclick="window.plugin.exportLinks.exportLinks();return false;">Export Links</a></aside>');
    };

    window.plugin.exportLinks.exportLinks = function() {
        const selectedPortal = window.selectedPortal;
        if (!selectedPortal) {
            alert('Please select a portal first.');
            return;
        }

        const portalGuid = selectedPortal;
        const links = window.portals[portalGuid].links;

        if (links.length === 0) {
            alert('No links found for the selected portal.');
            return;
        }

        const linksList = links.map(link => {
            const fromPortal = window.portals[link.fromPortalGuid];
            const toPortal = window.portals[link.toPortalGuid];
            return `${fromPortal.title} -> ${toPortal.title}`;
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + linksList.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'portal_links.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
