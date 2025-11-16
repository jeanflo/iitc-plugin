// ==UserScript==
// @id         iitc-plugin-full-portal-details
// @name       IITC plugin: Full Portal Details
// @category   Info
// @version    3.0.1
// @namespace  https://github.com/jeanflo/iitc-plugin-portal-details-full
// @updateURL  https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-full-portal-details.meta.js
// @downloadURL https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-plugin-full-portal-details.user.js
// @description 3.0.1 Compatible Android! Affiche les mods, résonateurs et liens du portail sélectionné. Exports CSV/TXT/Excel/Telegram.
// @match       https://intel.ingress.com/*
// @match       http://intel.ingress.com/*
// @grant       none
// ==/UserScript==

var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };
} else {
  info.script = { version: "3.0.0", name: "IITC plugin: Full Portal Details", description: "Full Portal Details" };
}

function wrapper(plugin_info) {
  // plugin wrapper - keep everything inside to run in page context
  if (typeof window.plugin !== 'function') window.plugin = function() {};
  window.plugin.portalDetailsFull = window.plugin.portalDetailsFull || function() {};
  var self = window.plugin.portalDetailsFull;

  self.id = 'portalDetailsFull';
  self.title = 'Full Portal Details';
  self.version = plugin_info && plugin_info.script && plugin_info.script.version ? plugin_info.script.version : '3.0.0';

  // state
  var failedPortals = new Set();
  var retryTimers = {};
  var currentPortalData = null;

  // helper: is mobile (simple)
  self.isMobile = function() {
    try {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.useAndroidPanes && window.useAndroidPanes());
    } catch (e) {
      return false;
    }
  };

  // select + focus portal
  self.selectPortal = function(guid) {
    if (!guid) return;
    var portal = window.portals && window.portals[guid];
    if (portal && typeof portal.getLatLng === 'function') {
      try {
        var latLng = portal.getLatLng();
        if (latLng && window.map && typeof window.map.setView === 'function') {
          window.map.setView(latLng);
        }
        if (typeof window.renderPortalDetails === 'function') window.renderPortalDetails(guid);
      } catch (e) {
        console.warn('selectPortal error:', e);
      }
    } else {
      if (window.portalDetail && typeof window.portalDetail.request === 'function') {
        window.portalDetail.request(guid).done(function(data) {
          if (data && data.latE6 && data.lngE6 && typeof window.zoomToAndShowPortal === 'function') {
            var lat = data.latE6 / 1e6;
            var lng = data.lngE6 / 1e6;
            window.zoomToAndShowPortal(guid, [lat, lng]);
          }
        }).fail(function() {
          console.warn('selectPortal: request failed for', guid);
        });
      }
    }
  };

  // EXPORT CSV (UTF-8 BOM, ; separator for Excel compatibility)
  self.exportToCSV = function() {
    if (!currentPortalData) return;
    try {
      var BOM = '\uFEFF';
      var now = new Date().toLocaleString();
      var pName = currentPortalData.portalName || 'portal';
      var pGuid = currentPortalData.portalGuid || '';
      var csv = '';
      csv += '"Date";"' + now.replace(/"/g, '""') + '"\n';
      csv += '"Portail";"' + pName.replace(/"/g, '""') + '"\n';
      csv += '"GUID";"' + pGuid + '"\n\n';
      csv += '"MODS"\n';
      csv += '"Nom";"Propriétaire";"Rareté"\n';
      var mods = Array.isArray(currentPortalData.mods) ? currentPortalData.mods : [];
      var filteredMods = mods.filter(function(m){ return m !== null && typeof m !== 'undefined'; });
      if (filteredMods.length) {
        filteredMods.forEach(function(mod) {
          csv += '"' + (mod.name || 'Inconnu').replace(/"/g, '""') + '";"' + (mod.owner || '').replace(/"/g, '""') + '";"' + (mod.rarity || '').replace(/"/g, '""') + '"\n';
        });
      } else {
        csv += '"Aucun";"";""\n';
      }
      csv += '\n"RÉSONATEURS"\n';
      csv += '"Niveau";"Propriétaire"\n';
      var res = Array.isArray(currentPortalData.resonators) ? currentPortalData.resonators : [];
      var filteredRes = res.filter(function(r){ return r !== null && typeof r !== 'undefined'; });
      if (filteredRes.length) {
        filteredRes.forEach(function(r) {
          csv += '"Niveau ' + (r.level || '?') + '";"' + (r.owner || '').replace(/"/g, '""') + '"\n';
        });
      } else {
        csv += '"Aucun";""\n';
      }
      csv += '\n"PORTAILS RELIÉS"\n';
      csv += '"Nom du portail";"GUID"\n';
      var links = Array.isArray(currentPortalData.linkedPortals) ? currentPortalData.linkedPortals : [];
      if (links.length) {
        links.forEach(function(l) {
          csv += '"' + (l.name || 'Inconnu').replace(/"/g, '""') + '";"' + (l.guid || '').replace(/"/g, '""') + '"\n';
        });
      } else {
        csv += '"Aucun";""\n';
      }

      var blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      var fileName = (pName ? pName.replace(/[^a-z0-9]/gi, '_') : 'portal') + '_details.csv';
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 5000);
    } catch (e) {
      console.error('exportToCSV error', e);
      alert('Erreur export CSV: ' + (e.message || e));
    }
  };

  // EXPORT TXT
  self.exportToTXT = function() {
    if (!currentPortalData) return;
    try {
      var now = new Date().toLocaleString();
      var out = now + '\n\n';
      out += '📍 ' + (currentPortalData.portalName || 'Portail inconnu') + '\n';
      out += 'GUID: ' + (currentPortalData.portalGuid || '') + '\n\n';
      out += '🔧 Mods:\n';
      var mods = Array.isArray(currentPortalData.mods) ? currentPortalData.mods : [];
      var filteredMods = mods.filter(function(m){ return m !== null && typeof m !== 'undefined'; });
      if (filteredMods.length) {
        filteredMods.forEach(function(mod) {
          out += '  • ' + (mod.name || 'Inconnu') + ' (Propriétaire: ' + (mod.owner || 'Inconnu') + ', Rareté: ' + (mod.rarity || 'Inconnue') + ')\n';
        });
      } else {
        out += '  • Aucun\n';
      }
      out += '\n⚡ Résonateurs:\n';
      var res = Array.isArray(currentPortalData.resonators) ? currentPortalData.resonators : [];
      var filteredRes = res.filter(function(r){ return r !== null && typeof r !== 'undefined'; });
      if (filteredRes.length) {
        filteredRes.forEach(function(r) {
          out += '  • Niveau ' + (r.level || '?') + ' (Propriétaire: ' + (r.owner || 'Inconnu') + ')\n';
        });
      } else {
        out += '  • Aucun\n';
      }
      out += '\n🔗 Portails reliés:\n';
      var links = Array.isArray(currentPortalData.linkedPortals) ? currentPortalData.linkedPortals : [];
      if (links.length) {
        links.forEach(function(l) {
          out += '  • ' + (l.name || 'Inconnu') + ' (' + (l.guid || '') + ')\n';
        });
      } else {
        out += '  • Aucun\n';
      }

      var blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (currentPortalData.portalName ? currentPortalData.portalName.replace(/[^a-z0-9]/gi, '_') : 'portal') + '_details.txt';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 5000);
    } catch (e) {
      console.error('exportToTXT error', e);
      alert('Erreur export TXT: ' + (e.message || e));
    }
  };

  // TELEGRAM (copy formatted text to clipboard)
  self.exportToTelegram = function() {
    if (!currentPortalData) return;
    try {
      var now = new Date().toLocaleString();
      var out = '📅 ' + now + '\n\n';
      out += '📍 **' + (currentPortalData.portalName || 'Portail inconnu') + '**\n';
      out += '🆔 `' + (currentPortalData.portalGuid || '') + '`\n\n';
      out += '🔧 **Mods:**\n';
      var mods = Array.isArray(currentPortalData.mods) ? currentPortalData.mods : [];
      var filteredMods = mods.filter(function(m){ return m !== null && typeof m !== 'undefined'; });
      if (filteredMods.length) {
        filteredMods.forEach(function(mod) {
          out += '  • **' + (mod.name || 'Inconnu') + '** (' + (mod.owner || 'Inconnu') + ', ' + (mod.rarity || 'Inconnue') + ')\n';
        });
      } else {
        out += '  • Aucun\n';
      }
      out += '\n⚡ **Résonateurs:**\n';
      var res = Array.isArray(currentPortalData.resonators) ? currentPortalData.resonators : [];
      var filteredRes = res.filter(function(r){ return r !== null && typeof r !== 'undefined'; });
      if (filteredRes.length) {
        filteredRes.forEach(function(r) {
          out += '  • **Niveau ' + (r.level || '?') + '** (' + (r.owner || 'Inconnu') + ')\n';
        });
      } else {
        out += '  • Aucun\n';
      }
      out += '\n🔗 **Portails reliés:**\n';
      var links = Array.isArray(currentPortalData.linkedPortals) ? currentPortalData.linkedPortals : [];
      if (links.length) {
        links.forEach(function(l) {
          // escape for markdown-lite: simple escaping of backticks and a few chars
          var name = (l.name || '').replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
          out += '  • ' + name + '\nhttps://link.ingress.com/portal/' + l.guid + '\n\n';
        });
      } else {
        out += '  • Aucun\n';
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(out).then(function() {
          alert('✅ Données copiées au format Telegram — collez dans Telegram.');
        }).catch(function(err){
          console.error('clipboard write failed', err);
          alert('Impossible de copier dans le presse-papiers (voir console).');
        });
      } else {
        // fallback: create temporary textarea
        var ta = document.createElement('textarea');
        ta.value = out;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          alert('✅ Données copiées (fallback).');
        } catch (e) {
          alert('Impossible de copier automatiquement, utilisez copier manuellement.');
        }
        setTimeout(function(){ if (ta.parentNode) ta.parentNode.removeChild(ta); }, 1000);
      }
    } catch (e) {
      console.error('exportToTelegram error', e);
      alert('Erreur export Telegram: ' + (e.message || e));
    }
  };

  // EXCEL export via ExcelJS (if present)
  self.exportToExcel = function() {
    if (!currentPortalData) return;
    try {
      if (typeof ExcelJS === 'undefined') {
        alert('⏳ Bibliothèque ExcelJS non chargée. Réessayez dans 2s (le plugin tente de la charger).');
        // try to inject if not present
        if (!document.getElementById('exceljs-loader')) {
          var s = document.createElement('script');
          s.id = 'exceljs-loader';
          s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
          document.head.appendChild(s);
        }
        return;
      }
      var workbook = new ExcelJS.Workbook();
      var worksheet = workbook.addWorksheet('Détails Portail');
      var now = new Date().toLocaleString();
      worksheet.addRow(['Date', now]);
      worksheet.addRow(['Portail', currentPortalData.portalName || '']);
      worksheet.addRow(['GUID', currentPortalData.portalGuid || '']);
      worksheet.addRow([]);
      worksheet.addRow(['MODS']);
      worksheet.mergeCells('A' + worksheet.lastRow.number + ':C' + worksheet.lastRow.number);
      worksheet.addRow(['Nom', 'Propriétaire', 'Rareté']);
      var mods = Array.isArray(currentPortalData.mods) ? currentPortalData.mods : [];
      var filteredMods = mods.filter(function(m){ return m !== null && typeof m !== 'undefined'; });
      if (filteredMods.length) {
        filteredMods.forEach(function(m) {
          worksheet.addRow([m.name || '', m.owner || '', m.rarity || '']);
        });
      } else {
        worksheet.addRow(['Aucun', '', '']);
      }
      worksheet.addRow([]);
      worksheet.addRow(['RÉSONATEURS']);
      worksheet.mergeCells('A' + worksheet.lastRow.number + ':B' + worksheet.lastRow.number);
      worksheet.addRow(['Niveau', 'Propriétaire']);
      var res = Array.isArray(currentPortalData.resonators) ? currentPortalData.resonators : [];
      var filteredRes = res.filter(function(r){ return r !== null && typeof r !== 'undefined'; });
      if (filteredRes.length) {
        filteredRes.forEach(function(r) {
          worksheet.addRow(['Niveau ' + (r.level || '?'), r.owner || '']);
        });
      } else {
        worksheet.addRow(['Aucun','']);
      }
      worksheet.addRow([]);
      worksheet.addRow(['PORTAILS RELIÉS']);
      worksheet.mergeCells('A' + worksheet.lastRow.number + ':B' + worksheet.lastRow.number);
      worksheet.addRow(['Nom du portail', 'GUID']);
      var links = Array.isArray(currentPortalData.linkedPortals) ? currentPortalData.linkedPortals : [];
      if (links.length) {
        links.forEach(function(l) {
          worksheet.addRow([l.name || '', l.guid || '']);
        });
      } else {
        worksheet.addRow(['Aucun','']);
      }
      worksheet.columns = [{ width: 45 }, { width: 45 }, { width: 20 }];

      workbook.xlsx.writeBuffer().then(function(buffer) {
        var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (currentPortalData.portalName ? currentPortalData.portalName.replace(/[^a-z0-9]/gi, '_') : 'portal') + '_details.xlsx';
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){ URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 5000);
      }).catch(function(err){
        console.error('Excel write error', err);
        alert('Erreur export Excel: ' + (err.message || err));
      });

    } catch (e) {
      console.error('exportToExcel error', e);
      alert('Erreur export Excel: ' + (e.message || e));
    }
  };

  // Load linked portal details into LI element (with retry on fail)
  self.loadLinkedPortal = function(linkedPortalGuid, portalGuid) {
    try {
      var liId = 'linked-portal-' + linkedPortalGuid.replace(/\./g, '-');
      var li = document.getElementById(liId);
      if (!li) return;
      if (!window.portalDetail || typeof window.portalDetail.request !== 'function') return;
      window.portalDetail.request(linkedPortalGuid).done(function(data) {
        if (li && data && data.title) {
          li.innerHTML = '<b><a href="#" class="portal-link" data-guid="' + linkedPortalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + data.title + '</a></b> (GUID: ' + linkedPortalGuid + ')';
          failedPortals.delete(linkedPortalGuid);
          if (currentPortalData) {
            var idx = -1;
            for (var i=0;i<currentPortalData.linkedPortals.length;i++) {
              if (currentPortalData.linkedPortals[i].guid === linkedPortalGuid) { idx = i; break; }
            }
            if (idx !== -1) currentPortalData.linkedPortals[idx].name = data.title;
          }
          var link = li.querySelector('.portal-link');
          if (link) {
            link.onclick = function(e) { e.preventDefault(); self.selectPortal(linkedPortalGuid); };
          }
        }
      }).fail(function() {
        if (li) {
          li.innerHTML = '<span style="color:red;">Échec du chargement</span> (GUID: ' + linkedPortalGuid + ')';
          failedPortals.add(linkedPortalGuid);
          if (retryTimers[linkedPortalGuid]) clearTimeout(retryTimers[linkedPortalGuid]);
          retryTimers[linkedPortalGuid] = setTimeout(function(){ self.loadLinkedPortal(linkedPortalGuid, portalGuid); }, 2000);
        }
      });
    } catch (e) {
      console.error('loadLinkedPortal error', e);
    }
  };

  // Show dialog with details; handles retry if details not loaded yet
  self.showDetailsDialog = function(retryCount) {
    if (!retryCount) retryCount = 0;
    if (!window.selectedPortal) { console.log('Aucun portail sélectionné'); return; }

    var portal = window.portals && window.portals[window.selectedPortal];
    if (!portal || !portal.options || !portal.options.data) {
      // try to request and retry
      if (retryCount < 3 && window.portalDetail && typeof window.portalDetail.request === 'function') {
        window.portalDetail.request(window.selectedPortal).done(function() {
          setTimeout(function(){ self.showDetailsDialog(retryCount+1); }, 300);
        }).fail(function() {
          if (retryCount < 2) {
            setTimeout(function(){ self.showDetailsDialog(retryCount+1); }, 500);
          } else {
            alert('Impossible de charger les détails de ce portail. Réessayez.');
          }
        });
      } else {
        alert('Impossible de charger les détails du portail.');
      }
      return;
    }

    var details = portal.options.data;
    var portalName = details.title || 'Portail inconnu';
    var portalGuid = window.selectedPortal;
    var now = new Date();
    var mods = details.mods || [];
    var resonators = details.resonators || [];

    // cleanup retries
    failedPortals.clear();
    for (var k in retryTimers) { if (retryTimers.hasOwnProperty(k)) clearTimeout(retryTimers[k]); }
    retryTimers = {};

    currentPortalData = { portalName: portalName, portalGuid: portalGuid, mods: mods, resonators: resonators, linkedPortals: [] };

    // build html content
    var content = '<div id="portal-details-full-content" style="position:relative;">';
    content += '<div style="display:flex; justify-content:space-between; align-items:center;">';
    content += '<h3 style="margin:0;"><u><b>' + now.toLocaleString() + '</b></u></h3>';
    content += '<button id="telegram-copy-btn" style="padding:4px 8px; font-size:14px; cursor:pointer; margin-left:10px;">✈️ Export To Telegram</button>';
    content += '</div>';
    content += '<h3><b><a href="#" class="portal-link main-portal-link" data-guid="' + portalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + portalName + '</a></b></h3>';
    content += '<p><b>GUID:</b> ' + portalGuid + '</p>';

    // Mods
    var filteredMods = mods.filter(function(m){ return m !== null && typeof m !== 'undefined'; });
    content += '<h4><b>Mods</b></h4><ul>';
    if (filteredMods.length) {
      for (var mi=0; mi<filteredMods.length; mi++) {
        var mm = filteredMods[mi];
        content += '<li><b>' + (mm.name || 'Mod inconnu') + '</b> (Propriétaire: ' + (mm.owner || 'Inconnu') + ', Rareté: ' + (mm.rarity || 'Inconnue') + ')</li>';
      }
    } else {
      content += '<li>Aucun</li>';
    }
    content += '</ul>';

    // Resonators
    var filteredRes = resonators.filter(function(r){ return r !== null && typeof r !== 'undefined'; });
    content += '<h4><b>Résonateurs</b></h4><ul>';
    if (filteredRes.length) {
      for (var ri=0; ri<filteredRes.length; ri++) {
        var rr = filteredRes[ri];
        content += '<li><b>Niveau ' + (rr.level || '?') + '</b> (Propriétaire: ' + (rr.owner || 'Inconnu') + ')</li>';
      }
    } else {
      content += '<li>Aucun</li>';
    }
    content += '</ul>';

    // Linked portals
    content += '<h4><b>Portails reliés</b></h4><ul id="linked-portals-list">';
    var linksFound = false;
    var linkedGuids = [];
    if (window.links) {
      var linkVals = [];
      for (var lk in window.links) { if (window.links.hasOwnProperty(lk)) linkVals.push(window.links[lk]); }
      for (var li=0; li<linkVals.length; li++) {
        var L = linkVals[li];
        if (!L || !L.options || !L.options.data) continue;
        var ld = L.options.data;
        if (ld.oGuid === portalGuid || ld.dGuid === portalGuid) {
          linksFound = true;
          var linkedPortalGuid = (ld.oGuid === portalGuid) ? ld.dGuid : ld.oGuid;
          linkedGuids.push(linkedPortalGuid);
          var liId = 'linked-portal-' + linkedPortalGuid.replace(/\./g, '-');
          var linkedPortal = window.portals && window.portals[linkedPortalGuid];
          if (linkedPortal && linkedPortal.options && linkedPortal.options.data && linkedPortal.options.data.title) {
            currentPortalData.linkedPortals.push({ name: linkedPortal.options.data.title, guid: linkedPortalGuid });
            content += '<li id="' + liId + '"><b><a href="#" class="portal-link" data-guid="' + linkedPortalGuid + '" style="color:#ffce00;text-decoration:none;cursor:pointer;">' + linkedPortal.options.data.title + '</a></b> (GUID: ' + linkedPortalGuid + ')</li>';
          } else {
            currentPortalData.linkedPortals.push({ name: 'Chargement...', guid: linkedPortalGuid });
            content += '<li id="' + liId + '"><span style="color:red;">Chargement...</span> (GUID: ' + linkedPortalGuid + ')</li>';
          }
        }
      }
    }
    if (!linksFound) content += '<li>Aucun</li>';
    content += '</ul>';

    content += '</div>';

    // dialog buttons
    var isMobile = self.isMobile();
    var buttons = [
      { text: '📊 CSV', click: function() { self.exportToCSV(); }, class: 'export-button-left' },
      { text: '📄 TXT', click: function() { self.exportToTXT(); }, class: 'export-button-left' },
      { text: '📗 Excel', click: function() { self.exportToExcel(); }, class: 'export-button-left' },
      { text: 'OK', click: function() { $(this).dialog('close'); }, class: 'ok-button-right' }
    ];
    if (isMobile) {
      // on mobile keep only OK and maybe Telegram on top button
      var filtered = [];
      for (var bi=0; bi<buttons.length; bi++) {
        if (buttons[bi].text === 'OK') filtered.push(buttons[bi]);
      }
      buttons = filtered;
    }

    window.dialog({
      title: 'Full Portal Details - v' + (self.version || ''),
      html: content,
      width: 450,
      id: 'portal-details-full-dialog',
      buttons: buttons
    });

    // post processing: attach events and style
    setTimeout(function(){
      var telegramBtn = document.getElementById('telegram-copy-btn');
      if (telegramBtn) telegramBtn.onclick = function(){ self.exportToTelegram(); };

      // style dialog buttons
      try {
        var dialogButtons = $('.ui-dialog-buttonpane');
        if (dialogButtons.length) {
          dialogButtons.find('button.export-button-left').css({ 'float': 'left', 'margin-right': '5px' });
          dialogButtons.find('button.ok-button-right').css({ 'float': 'right' });
        }
      } catch (e) { /* ignore */ }

      // attach portal link clicks
      var els = document.querySelectorAll && document.querySelectorAll('.portal-link');
      if (els && els.length) {
        for (var iel=0; iel<els.length; iel++) {
          (function(el){
            el.onclick = function(e) { e.preventDefault(); var guid = el.getAttribute('data-guid'); if (guid) self.selectPortal(guid); };
          })(els[iel]);
        }
      }
    }, 100);

    // trigger load for linked portals missing names
    for (var idx=0; idx<linkedGuids.length; idx++) {
      var g = linkedGuids[idx];
      var lp = window.portals && window.portals[g];
      if (!lp || !lp.options || !lp.options.data || !lp.options.data.title) {
        self.loadLinkedPortal(g, portalGuid);
      }
    }
  };

  // Add button to sidebar inside an <aside>
  self.addToSidebar = function() {
    try {
      if (!window.selectedPortal) return;
      if (!document.getElementById) return;
      var container = document.getElementById('portaldetails');
      if (!container) return;
      var existing = document.getElementById('portal-details-full-aside');
      if (!existing) {
        var aside = document.createElement('aside');
        aside.id = 'portal-details-full-aside';
        // find linkdetails
        var linkDetails = container.querySelector && container.querySelector('.linkdetails');
        if (linkDetails) linkDetails.appendChild(aside);
        else container.appendChild(aside);
      }
      if (document.getElementById('portal-details-full-btn')) return;
      var button = document.createElement('a');
      button.id = 'portal-details-full-btn';
      button.href = '#';
      button.textContent = 'Full Portal Details';
      button.className = 'plugin-button';
      button.style.display = 'block';
      button.style.padding = '8px 12px';
      button.style.margin = '10px 5px';
      button.style.background = '#3874ff';
      button.style.color = 'white';
      button.style.textDecoration = 'none';
      button.style.borderRadius = '4px';
      button.style.textAlign = 'center';
      button.style.cursor = 'pointer';
      button.style.fontWeight = 'bold';
      button.onclick = function(e){ e.preventDefault(); e.stopPropagation(); self.showDetailsDialog(); return false; };
      var aside2 = document.getElementById('portal-details-full-aside');
      if (aside2) aside2.appendChild(button);
    } catch (e) {
      console.error('addToSidebar error', e);
    }
  };

  // hook setup
  self.setup = function() {
    if (self.setupDone) return;
    self.setupDone = true;

    // safe CSS for mobile dialog
    try {
      var stylesheet = document.createElement('style');
      stylesheet.innerHTML = '#' + self.id + 'menu.mobile { background: transparent; border: 0 none !important; height: 100% !important; width: 100% !important; left: 0 !important; top: 0 !important; position: absolute; overflow: auto; }';
      document.head.appendChild(stylesheet);
    } catch (e) { /* ignore */ }

    // add hooks
    if (window.addHook && typeof window.addHook === 'function') {
      window.addHook('portalDetailsUpdated', function() {
        setTimeout(function(){ self.addToSidebar(); }, 100);
      });
    }

    // add initial button if portal selected
    try { self.addToSidebar(); } catch (e) { /* ignore */ }

    console.log('IITC plugin loaded: ' + self.title + ' version ' + self.version);
  };

  // plugin bootstrap
  var setup = function() {
    if (window.iitcLoaded) {
      self.setup();
    } else {
      if (window.addHook && typeof window.addHook === 'function') window.addHook('iitcLoaded', self.setup);
      else window.setTimeout(function(){ setup(); }, 500);
    }
  };
  setup.info = plugin_info;

  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);

  if (window.iitcLoaded && typeof setup === 'function') setup();

} // end wrapper

// inject
var script = document.createElement('script');
script.textContent = '(' + wrapper + ')(' + JSON.stringify(info) + ');';
(document.body || document.head || document.documentElement).appendChild(script);
