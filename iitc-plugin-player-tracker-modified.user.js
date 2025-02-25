// ==UserScript==
// @id         iitc-plugin-export-links
// @name       IITC plugin: Export Portal Links
// @category   Info
// @version    0.1.0
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

function wrapper() {
  // Ensure plugin doesn't re-initialize
  if (window.plugin.exportLinks) return;

  window.plugin.exportLinks = function() {};

  window.plugin.exportLinks.exportLinks = function() {
    const selectedPortal = window.selectedPortal;
    if (!selectedPortal) {
      alert('Please select a portal first.');
      return;
    }

    const portalGuid = selectedPortal.guid;
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

  // Add a button to the portal details sidebar
  $('#portaldetails').append('<a onclick="window.plugin.exportLinks.exportLinks()" style="cursor:pointer">Export Links</a>');
}

// Create a script element to inject the wrapper function
const script = document.createElement('script');
script.appendChild(document.createTextNode('('+ wrapper +')();'));
(document.body || document.head || document.documentElement).appendChild(script);
