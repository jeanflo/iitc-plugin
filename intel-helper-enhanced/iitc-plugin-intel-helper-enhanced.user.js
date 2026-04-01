// ==UserScript==
// @id             intelhelper-enhanced
// @name           IITC plugin: Intel Helper Enhanced
// @category       Layer
// @version        4.1.2
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @description    Enhanced Intel Helper with granular layer control, player history tracking and v0.42.0 API compatiblity.
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/intel-helper-enhanced/iitc-plugin-intel-helper-enhanced.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/intel-helper-enhanced/iitc-plugin-intel-helper-enhanced.user.js
// @author         xZwop (enhanced version)
// @include        https://intel.ingress.com/*
// @include        https://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @match          https://intel.ingress.com/*
// @match          https://*.ingress.com/intel*
// @match          https://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
  if (typeof window.plugin !== 'function') window.plugin = function() {};

  window.plugin.intelhelper = function() {};

  const KEY_SETTINGS = 'plugin-intelhelper-settings';

  window.plugin.intelhelper.settings = {
    maxTime: 60 * 60 * 1000,
    refreshTime: 3 * 60 * 1000,
    linkColors: {
      'res_link_created': '#0088FF',
      'enl_link_created': '#03DC03',
      'mac_link_created': '#FF0000',
      'res_link_destroyed': '#0088FF',
      'enl_link_destroyed': '#03DC03',
      'mac_link_destroyed': '#FF0000',
      'ada_virus': '#0088FF',
      'jarvis_virus': '#03DC03'
    },
    layerVisibility: {
      res_captured: true, enl_captured: true, mac_captured: true,
      res_linked: true, enl_linked: true, mac_linked: true,
      res_destroyed_link: true, enl_destroyed_link: true, mac_destroyed_link: true,
      res_created_field: true, enl_created_field: true, mac_created_field: true,
      res_destroyed_field: true, enl_destroyed_field: true, mac_destroyed_field: true,
      res_destroyed_resonator: true, enl_destroyed_resonator: true, mac_destroyed_resonator: true,
      res_deployed_fracker: true, enl_deployed_fracker: true, mac_deployed_fracker: true,
      res_deployed_beacon: true, enl_deployed_beacon: true, mac_deployed_beacon: true
    }
  };

  window.plugin.intelhelper.textColors = {
    'RESISTANCE': '#0088FF', 'ENLIGHTENED': '#03DC03', 'MACHINA': '#FF0000', 'NEUTRAL': '#FF0000'
  };

  window.plugin.intelhelper.eventsIds = {};
  window.plugin.intelhelper.timeOut = true;
  window.plugin.intelhelper.portals = null;
  window.plugin.intelhelper.playerStats = {};

  class Portal {
    constructor(id, name, lat, lng) {
      this.id = id; this.name = name; this.lat = lat; this.lng = lng;
      this.eventById = {}; this.events = []; this.marker = null; this.popup = '';
    }

    addEvent(id, player, team, time, category, idTo, linkOwnerTeam) {
      if (this.eventById[id] || time < window.plugin.intelhelper.getLimit()) return;
      const event = { id, player, team, time, category, idTo, linkOwnerTeam };
      this.eventById[id] = event;
      window.plugin.intelhelper.updatePlayerStats(player, team, category, time);
      let i = 0;
      for (; i < this.events.length; i++) {
        if (this.events[i].time > time) break;
      }
      this.events.splice(i, 0, event);
      this.processEvent(id);
      this.refreshPopup();
    }

    discardOldEvents() {
      const limit = window.plugin.intelhelper.getLimit();
      this.events = this.events.filter(event => {
        if (event.time < limit) { delete this.eventById[event.id]; return false; }
        return true;
      });
      this.processAllEvents();
    }

    refreshPopup() {
      if (this.events.length === 0) return;
      const players = new Set();
      let hasRes = false, hasEnl = false, hasMac = false;

      this.events.forEach(event => {
        if (event.team === 'RESISTANCE') hasRes = true;
        else if (event.team === 'ENLIGHTENED') hasEnl = true;
        else if (event.team === 'MACHINA' || event.team === 'NEUTRAL') hasMac = true;
        players.add(event.player);
      });

      this.popup = `
        <div class="plugin_intelhelper_popup">
          <a style="font-weight:bold;" onclick="window.selectPortalByLatLng(${this.lat}, ${this.lng})">${this.name}</a>
          <table>${this.events.map(event => this.retrieveHtml(event.id)).join('')}</table>
        </div>
      `;

      if (!this.marker) {
        this.marker = L.marker([this.lat, this.lng], {
          icon: this.getMarker(hasRes, hasEnl, hasMac), id: this.id, title: ''
        });
        this.marker.on('click', window.plugin.intelhelper.markerOnClick);
      }

      this.marker.setIcon(this.getMarker(hasRes, hasEnl, hasMac));
      if (!window.plugin.intelhelper.layers.actions.hasLayer(this.marker)) {
        window.plugin.intelhelper.layers.actions.addLayer(this.marker);
      }

      const lastPlayer = Array.from(players).pop();
      const title = `${players.size} agent(s) involved (last: ${lastPlayer})`;
      this.marker.bindTooltip(title);
    }

    getMarker(hasRes, hasEnl, hasMac) {
      const teams = [hasRes, hasEnl, hasMac].filter(Boolean).length;
      if (teams >= 3) return window.plugin.intelhelper.icons.all;
      if (teams === 2) {
        if (hasRes && hasEnl) return window.plugin.intelhelper.icons.enlRes;
        if (hasRes && hasMac) return window.plugin.intelhelper.icons.resMac;
        if (hasEnl && hasMac) return window.plugin.intelhelper.icons.enlMac;
      }
      if (hasRes) return window.plugin.intelhelper.icons.res;
      if (hasEnl) return window.plugin.intelhelper.icons.enl;
      if (hasMac) return window.plugin.intelhelper.icons.mac;
      return window.plugin.intelhelper.icons.enl;
    }

    processAllEvents() {
      this.events.forEach(event => this.processEvent(event.id));
      this.refreshPopup();
    }

    retrieveHtml(id) {
      const event = this.eventById[id];
      if (!event) return '';
      let html = '';
      let portalTo;
      if (event.idTo) portalTo = window.plugin.intelhelper.portals.getPortal(event.idTo);

      const actions = {
        'linked': () => portalTo ? `created link from <a onclick="window.selectPortalByLatLng(${this.lat}, ${this.lng})">${this.name}</a> to <a onclick="window.selectPortalByLatLng(${portalTo.lat}, ${portalTo.lng})">${portalTo.name}</a>` : 'created a link',
        'destroyed_link': () => portalTo ? `destroyed link from <a onclick="window.selectPortalByLatLng(${this.lat}, ${this.lng})">${this.name}</a> to <a onclick="window.selectPortalByLatLng(${portalTo.lat}, ${portalTo.lng})">${portalTo.name}</a>` : 'destroyed a link',
        'destroyed_link_ada': () => portalTo ? `destroyed link (<span class="plugin_intelhelper_ada">ADA</span>) from <a onclick="window.selectPortalByLatLng(${this.lat}, ${this.lng})">${this.name}</a> to <a onclick="window.selectPortalByLatLng(${portalTo.lat}, ${portalTo.lng})">${portalTo.name}</a>` : 'destroyed a link (ADA)',
        'destroyed_link_jarvis': () => portalTo ? `destroyed link (<span class="plugin_intelhelper_jarvis">JARVIS</span>) from <a onclick="window.selectPortalByLatLng(${this.lat}, ${this.lng})">${this.name}</a> to <a onclick="window.selectPortalByLatLng(${portalTo.lat}, ${portalTo.lng})">${portalTo.name}</a>` : 'destroyed a link (JARVIS)',
        'captured': () => 'captured the portal',
        'created_field': () => 'created a field',
        'destroyed_field': () => 'destroyed a field',
        'destroyed_resonator': () => 'destroyed resonator(s)',
        'destroyed_resonator_ada': () => 'destroyed a resonator (<span class="plugin_intelhelper_ada">ADA</span>)',
        'destroyed_resonator_jarvis': () => 'destroyed a resonator (<span class="plugin_intelhelper_jarvis">JARVIS</span>)',
        'deployed_resonator': () => 'deployed a resonator',
        'deployed_fracker': () => 'deployed a fracker (<span class="plugin_intelhelper_fracker">FRACKER</span>)',
        'deployed_beacon': () => 'deployed a beacon (<span class="plugin_intelhelper_beacon">BEACON</span>)',
      };

      if (actions[event.category]) html = actions[event.category]();
      const timeStr = new Date(event.time).toLocaleTimeString();
      const displayTeam = event.team === 'NEUTRAL' ? 'MACHINA' : event.team;
      let playerDisplay = event.player;
      let playerStyle = `cursor:pointer; color:${window.plugin.intelhelper.textColors[displayTeam]}`;

      if (event.player === '__JARVIS__') {
        playerDisplay = '<span class="plugin_intelhelper_jarvis">JARVIS</span>';
        playerStyle = 'cursor:default;';
      } else if (event.player === '__ADA__') {
        playerDisplay = '<span class="plugin_intelhelper_ada">ADA</span>';
        playerStyle = 'cursor:default;';
      } else {
        playerDisplay = `<mark class="nickname" style="${playerStyle}" onclick="window.plugin.intelhelper.showPlayerHistory('${event.player}')">${event.player}</mark>`;
      }

      return `<tr><td><time title="${new Date(event.time).toLocaleString()}" data-timestamp="${event.time}">${timeStr}</time></td><td>${playerDisplay}</td><td>${html}</td></tr>`;
    }

    processEvent(id) {
      const event = this.eventById[id];
      if (!event) return;
      const team = event.team === 'NEUTRAL' ? 'MACHINA' : event.team;
      const layerKey = `${team.toLowerCase().substring(0, 3)}_${event.category}`;
      if (window.plugin.intelhelper.settings.layerVisibility[layerKey] === false) return;

      let portalTo;
      if (event.idTo) portalTo = window.plugin.intelhelper.portals.getPortal(event.idTo);

      const linkCategories = ['linked', 'destroyed_link', 'destroyed_link_ada', 'destroyed_link_jarvis'];
      if (!linkCategories.includes(event.category) || !portalTo) return;

      const options = { opacity: 0.7, weight: 8 };
      let linkColor, layerName;

      if (event.category === 'linked') {
        if (team === 'RESISTANCE') { linkColor = window.plugin.intelhelper.settings.linkColors.res_link_created; layerName = 'createdRes'; }
        else if (team === 'ENLIGHTENED') { linkColor = window.plugin.intelhelper.settings.linkColors.enl_link_created; layerName = 'createdEnl'; }
        else if (team === 'MACHINA') { linkColor = window.plugin.intelhelper.settings.linkColors.mac_link_created; layerName = 'createdMac'; }
      } else {
        const ownerTeam = event.linkOwnerTeam || team;
        options.dashArray = [10, 10];
        if (ownerTeam === 'RESISTANCE') { linkColor = window.plugin.intelhelper.settings.linkColors.res_link_destroyed; layerName = 'destroyedRes'; }
        else if (ownerTeam === 'ENLIGHTENED') { linkColor = window.plugin.intelhelper.settings.linkColors.enl_link_destroyed; layerName = 'destroyedEnl'; }
        else if (ownerTeam === 'MACHINA' || ownerTeam === 'NEUTRAL') { linkColor = window.plugin.intelhelper.settings.linkColors.mac_link_destroyed; layerName = 'destroyedMac'; }
      }

      if (!linkColor || !layerName) return;
      options.color = linkColor;

      const latlng1 = L.latLng(this.lat, this.lng);
      const latlng2 = L.latLng(portalTo.lat, portalTo.lng);
      const poly = L.geodesicPolyline([latlng1, latlng2], options);
      const html = this.retrieveHtml(id);
      const linkPopup = L.popup({ maxWidth: 600 }).setContent(`<div class="plugin_intelhelper_popup"><table>${html}</table></div>`);
      poly.bindPopup(linkPopup);
      poly.addTo(window.plugin.intelhelper.layers[layerName]);
    }
  }

  class Portals {
    constructor() { this.portalsById = {}; }
    addPortal(name, lat, lng) {
      const id = `${lat}_${lng}`;
      if (this.portalsById[id]) return this.portalsById[id];
      const portal = new Portal(id, name, lat, lng);
      this.portalsById[id] = portal;
      return portal;
    }
    addEvent(idEvent, player, team, time, category, name1, lat1, lng1, name2, lat2, lng2, linkOwnerTeam) {
      if (window.plugin.intelhelper.processEvent(idEvent, time)) {
        const portal = this.addPortal(name1, lat1, lng1);
        let portalToId = null;
        if (name2 && lat2 && lng2) portalToId = this.addPortal(name2, lat2, lng2).id;
        portal.addEvent(idEvent, player, team, time, category, portalToId, linkOwnerTeam);
      }
    }
    getPortal(id) { return this.portalsById[id]; }
    discardOldEvents() {
      window.plugin.intelhelper.clearLayers();
      Object.values(this.portalsById).forEach(portal => portal.discardOldEvents());
    }
  }

  window.plugin.intelhelper.updatePlayerStats = function(player, team, category, time) {
    if (player === '__JARVIS__' || player === '__ADA__') return;
    const displayTeam = team === 'NEUTRAL' ? 'MACHINA' : team;
    if (!this.playerStats[player]) {
      this.playerStats[player] = { name: player, team: displayTeam, firstSeen: time, lastSeen: time, actions: {}, totalActions: 0, events: [] };
    }
    const stats = this.playerStats[player];
    stats.lastSeen = Math.max(stats.lastSeen, time);
    stats.firstSeen = Math.min(stats.firstSeen, time);
    if (!stats.actions[category]) stats.actions[category] = 0;
    stats.actions[category]++;
    stats.totalActions++;
    stats.events.push({ category, time });
  };

  window.plugin.intelhelper.showPlayerHistory = function(playerName) {
    const stats = this.playerStats[playerName];
    if (!stats) return alert('No data for this player');
    const actionNames = {
      'linked': 'Links Created', 'destroyed_link': 'Links Destroyed',
      'destroyed_link_ada': 'Links Destroyed (ADA)', 'destroyed_link_jarvis': 'Links Destroyed (JARVIS)',
      'captured': 'Portals Captured', 'created_field': 'Fields Created', 'destroyed_field': 'Fields Destroyed',
      'destroyed_resonator': 'Resonators Destroyed', 'destroyed_resonator_ada': 'Resonators Destroyed (ADA)',
      'destroyed_resonator_jarvis': 'Resonators Destroyed (JARVIS)', 'deployed_resonator': 'Resonators Deployed',
      'deployed_fracker': 'Frackers Deployed', 'deployed_beacon': 'Beacons Deployed'
    };

    const actionsHtml = Object.entries(stats.actions)
      .sort((a, b) => b[1] - a[1])
      .map(([action, count]) => `<tr><td>${actionNames[action] || action}</td><td><strong>${count}</strong></td></tr>`).join('');

    const html = `
      <div style="padding: 10px;">
        <h3 style="color: ${window.plugin.intelhelper.textColors[stats.team]}; margin-top: 0;">${playerName}</h3>
        <p><strong>Team:</strong> <span style="color: ${window.plugin.intelhelper.textColors[stats.team]}">${stats.team}</span></p>
        <p><strong>Total Actions:</strong> ${stats.totalActions}</p>
        <p><strong>First Seen:</strong> ${new Date(stats.firstSeen).toLocaleString()}</p>
        <p><strong>Last Seen:</strong> ${new Date(stats.lastSeen).toLocaleString()}</p>
        <h4>Action Breakdown:</h4>
        <table style="width: 100%; font-size: 12px;">${actionsHtml}</table>
        <div style="text-align: center; margin-top: 15px;">
          <button onclick="window.plugin.intelhelper.filterByPlayer('${playerName}'); return false;">Show Only This Player's Actions</button>
          <button onclick="window.plugin.intelhelper.exportPlayerData('${playerName}'); return false;" style="margin-left: 10px;">Export CSV</button>
        </div>
      </div>
    `;

    dialog({ html: html, id: 'plugin_intelhelper_player', title: 'Player History: ' + playerName, width: 'auto' });
  };

  window.plugin.intelhelper.filterByPlayer = function(playerName) {
    Object.values(this.portals.portalsById).forEach(portal => { if (portal.marker) this.layers.actions.removeLayer(portal.marker); });
    this.clearLayers();
    Object.values(this.portals.portalsById).forEach(portal => {
      const playerEvents = portal.events.filter(e => e.player === playerName);
      if (playerEvents.length > 0) {
        if (portal.marker) this.layers.actions.addLayer(portal.marker);
        playerEvents.forEach(event => {
          if (['linked', 'destroyed_link', 'destroyed_link_ada', 'destroyed_link_jarvis'].includes(event.category)) portal.processEvent(event.id);
        });
      }
    });
    alert(`Filtering to show only ${playerName}'s actions. Click "Refresh Data" to reset.`);
  };

  window.plugin.intelhelper.exportPlayerData = function(playerName) {
    const stats = this.playerStats[playerName];
    if (!stats) return;
    let csv = 'Time,Action\n';
    stats.events.forEach(event => { csv += `"${new Date(event.time).toLocaleString()}","${event.category}"\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${playerName}_history.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  window.plugin.intelhelper.getLimit = function() { return Date.now() - window.plugin.intelhelper.settings.maxTime; };

  window.plugin.intelhelper.processEvent = function(id, time) {
    if (window.plugin.intelhelper.eventsIds[id] || time < window.plugin.intelhelper.getLimit()) return false;
    window.plugin.intelhelper.eventsIds[id] = true;
    return true;
  };

  window.plugin.intelhelper.processNewData = function(data) {
    if (window.plugin.intelhelper.timeOut) {
      window.plugin.intelhelper.timeOut = false;
      window.plugin.intelhelper.portals.discardOldEvents();
      setTimeout(() => { window.plugin.intelhelper.timeOut = true; }, window.plugin.intelhelper.settings.refreshTime);
    }
    const result = data.result || data.raw?.result;
    if (!result) return;

    result.forEach(json => {
      try {
        const plext = json[2]?.plext;
        if (!plext || plext.plextType !== 'SYSTEM_BROADCAST') return;

        const idEvent = json[0];
        const time = json[1];
        const markup = plext.markup;
        if (!markup || markup.length < 3) return;

        let player, action, portal, portalToIndex;
        let allPortals = [];

        markup.forEach((item, index) => { if (item[0] === 'PORTAL') allPortals.push({ index, data: item[1] }); });
        for (let i = 0; i < markup.length; i++) {
          if (markup[i][0] === 'PLAYER') { player = markup[i][1]; break; }
        }

        const textParts = [];
        markup.forEach((item, index) => { if (item[0] === 'TEXT' && item[1]?.plain) textParts.push(item[1].plain); });
        action = textParts.join('').trim();

        if (allPortals.length >= 1) portal = allPortals[0].data;
        if (allPortals.length >= 2) portalToIndex = allPortals[1].index;
        if (!player || !portal || !action) return;

        const actualTeam = player.team === 'NEUTRAL' ? 'MACHINA' : player.team;
        const portalName = portal.name;
        const portalLat = portal.latE6 / 1E6;
        const portalLng = portal.lngE6 / 1E6;

        let category = null;
        let portalTo = null;
        let playerName = player.plain;
        let linkOwnerTeam = null;
        const actionLower = action.toLowerCase();

        if (actionLower.includes('destroyed') && actionLower.includes('link')) {
          category = 'destroyed_link';
          if (allPortals.length >= 2) portalTo = allPortals[1].data;
          linkOwnerTeam = plext.team;
          if (actualTeam !== 'MACHINA') {
            if (plext.team === actualTeam) {
              if (actualTeam === 'RESISTANCE') { category = 'destroyed_link_jarvis'; playerName = '__JARVIS__'; linkOwnerTeam = 'RESISTANCE'; }
              else if (actualTeam === 'ENLIGHTENED') { category = 'destroyed_link_ada'; playerName = '__ADA__'; linkOwnerTeam = 'ENLIGHTENED'; }
            } else if (actualTeam === portal.team || (portalTo && actualTeam === portalTo.team)) {
              if (actualTeam === 'ENLIGHTENED') { category = 'destroyed_link_jarvis'; playerName = '__JARVIS__'; linkOwnerTeam = 'RESISTANCE'; }
              else if (actualTeam === 'RESISTANCE') { category = 'destroyed_link_ada'; playerName = '__ADA__'; linkOwnerTeam = 'ENLIGHTENED'; }
            }
          }
        } else if (actionLower.includes('linked') && !actionLower.includes('destroyed')) {
          category = 'linked';
          if (allPortals.length >= 2) portalTo = allPortals[1].data;
        } else if (actionLower.includes('captured')) { category = 'captured';
        } else if (actionLower.includes('created a control field')) { category = 'created_field';
        } else if (actionLower.includes('destroyed a control field')) { category = 'destroyed_field';
        } else if (actionLower.includes('destroyed a resonator') || actionLower.includes('destroyed an l')) {
          category = 'destroyed_resonator';
          if (actualTeam !== 'MACHINA' && actualTeam === portal.team) {
            if (actualTeam === 'ENLIGHTENED') { category = 'destroyed_resonator_jarvis'; playerName = '__JARVIS__'; }
            else if (actualTeam === 'RESISTANCE') { category = 'destroyed_resonator_ada'; playerName = '__ADA__'; }
          }
        } else if (actionLower.includes('deployed a resonator') || actionLower.includes('deployed an l')) { category = 'deployed_resonator';
        } else if (actionLower.includes('deployed a portal fracker')) { category = 'deployed_fracker';
        } else if (actionLower.includes('deployed a beacon') || actionLower.includes('battle beacon')) { category = 'deployed_beacon'; }

        if (category) {
          const portalToName = portalTo?.name || null;
          const portalToLat = portalTo?.latE6 / 1E6 || null;
          const portalToLng = portalTo?.lngE6 / 1E6 || null;
          window.plugin.intelhelper.portals.addEvent(
            idEvent, playerName, actualTeam, time, category,
            portalName, portalLat, portalLng, portalToName, portalToLat, portalToLng, linkOwnerTeam
          );
        }
      } catch (e) { console.error('[Intel Helper] 💥 Error processing event:', e); }
    });
  };

  window.plugin.intelhelper.markerOnClick = function(e) {
    const marker = e.target;
    if (marker.options.id) {
      const portal = window.plugin.intelhelper.portals.getPortal(marker.options.id);
      if (portal) {
        L.popup({ maxWidth: 600, maxHeight: 300 }).setLatLng(marker.getLatLng()).setContent(portal.popup).openOn(window.map);
      }
    }
  };

  window.plugin.intelhelper.clearLayers = function() { Object.values(window.plugin.intelhelper.layers).forEach(layer => layer.clearLayers()); };

  window.plugin.intelhelper.clearHistory = function() {
    window.plugin.intelhelper.eventsIds = {};
    window.plugin.intelhelper.portals = new Portals();
    window.plugin.intelhelper.playerStats = {};
    window.plugin.intelhelper.clearLayers();
    window.plugin.intelhelper.timeOut = true;
    alert('History cleared!');
  };

  window.plugin.intelhelper.maxTimeChanged = function() {
    const value = parseInt(document.getElementById('intel_helper_max_time').value);
    window.plugin.intelhelper.settings.maxTime = value * 60 * 1000;
    window.plugin.intelhelper.saveSettings();
    window.plugin.intelhelper.clearHistory();
  };

  window.plugin.intelhelper.saveSettings = function() { localStorage.setItem(KEY_SETTINGS, JSON.stringify(window.plugin.intelhelper.settings)); };

  window.plugin.intelhelper.loadSettings = function() {
    const stored = localStorage.getItem(KEY_SETTINGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        window.plugin.intelhelper.settings = Object.assign(window.plugin.intelhelper.settings, parsed);
      } catch (e) { console.error('[Intel Helper] Error loading settings:', e); }
    }
  };

  window.plugin.intelhelper.showPanel = function() {
    const currentMaxTime = window.plugin.intelhelper.settings.maxTime / (60 * 1000);
    const stats = window.plugin.intelhelper.getStats();

    // Support du Safe-Area pour Mobile
    const html = `
      <div style="padding: env(safe-area-inset-top, 10px) env(safe-area-inset-right, 10px) env(safe-area-inset-bottom, 10px) env(safe-area-inset-left, 10px);">
        <div id="intel_helper_tabs" style="margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 5px;">
          <button onclick="window.plugin.intelhelper.showTab('overview')" id="tab_overview" class="intel_tab active">Overview</button>
          <button onclick="window.plugin.intelhelper.showTab('layers')" id="tab_layers" class="intel_tab">Layers</button>
          <button onclick="window.plugin.intelhelper.showTab('players')" id="tab_players" class="intel_tab">Players</button>
          <button onclick="window.plugin.intelhelper.showTab('settings')" id="tab_settings" class="intel_tab">Settings</button>
        </div>

        <div id="tab_content_overview" class="tab_content">
          <h3 style="margin-top: 0;">Statistics</h3>
          <table style="width: 100%;">
            <tr><td>Tracked portals:</td><td><strong>${stats.portals}</strong></td></tr>
            <tr><td>Total events:</td><td><strong>${stats.events}</strong></td></tr>
            <tr><td>RES events:</td><td style="color: #0088FF;"><strong>${stats.resEvents}</strong></td></tr>
            <tr><td>ENL events:</td><td style="color: #03DC03;"><strong>${stats.enlEvents}</strong></td></tr>
            <tr><td>MACHINA events:</td><td style="color: #FF0000;"><strong>${stats.macEvents}</strong></td></tr>
            <tr><td>Tracked players:</td><td><strong>${Object.keys(window.plugin.intelhelper.playerStats).length}</strong></td></tr>
          </table>

          <div style="margin-top: 15px;">
            <button onclick="window.plugin.intelhelper.clearHistory(); return false;" style="width: 100%; margin-bottom: 5px;">🗑️ Clear All History</button>
            <button onclick="window.plugin.intelhelper.refreshData(); return false;" style="width: 100%;">🔄 Refresh Data</button>
          </div>
        </div>

        <div id="tab_content_layers" class="tab_content" style="display:none;">
          <h3 style="margin-top: 0;">Layer Visibility Control</h3>
          ${window.plugin.intelhelper.generateLayerControls()}
        </div>

        <div id="tab_content_players" class="tab_content" style="display:none;">
          <h3 style="margin-top: 0;">Player History</h3>
          <input type="text" id="player_search" placeholder="Search player..." style="width: 100%; padding: 5px; margin-bottom: 10px;" onkeyup="window.plugin.intelhelper.filterPlayers()">
          <div id="player_list" style="max-height: 400px; overflow-y: auto;">
            ${window.plugin.intelhelper.generatePlayerList()}
          </div>
        </div>

        <div id="tab_content_settings" class="tab_content" style="display:none;">
          <h3 style="margin-top: 0;">Settings</h3>
          <h4>Time Filter</h4>
          <label>Show events from the last:</label><br>
          <select id="intel_helper_max_time" style="width: 100%; margin-top: 5px;">
            <option value="5" ${currentMaxTime === 5 ? 'selected' : ''}>5 minutes</option>
            <option value="10" ${currentMaxTime === 10 ? 'selected' : ''}>10 minutes</option>
            <option value="20" ${currentMaxTime === 20 ? 'selected' : ''}>20 minutes</option>
            <option value="60" ${currentMaxTime === 60 ? 'selected' : ''}>1 hour</option>
            <option value="120" ${currentMaxTime === 120 ? 'selected' : ''}>2 hours</option>
            <option value="300" ${currentMaxTime === 300 ? 'selected' : ''}>5 hours</option>
            <option value="1440" ${currentMaxTime === 1440 ? 'selected' : ''}>1 day</option>
          </select>
          <h4 style="margin-top: 15px;">Link Colors</h4>
          <button onclick="window.plugin.intelhelper.openColorPreferences(); return false;" style="width: 100%;">
            🎨 Configure Link Colors
          </button>
        </div>
      </div>
    `;

    dialog({ html: html, id: 'plugin_intelhelper_panel', title: 'Intel Helper Enhanced', width: window.isSmartphone() ? '90%' : 'auto' });

    $('#intel_helper_max_time').on('change', function() {
      window.plugin.intelhelper.maxTimeChanged();
      window.plugin.intelhelper.showPanel();
    });
  };

  window.plugin.intelhelper.generateLayerControls = function() {
    const teams = [ { key: 'res', name: 'RESISTANCE', color: '#0088FF' }, { key: 'enl', name: 'ENLIGHTENED', color: '#03DC03' }, { key: 'mac', name: 'MACHINA', color: '#FF0000' } ];
    const allActions = [
      { key: 'captured', name: 'Captures' }, { key: 'linked', name: 'Links Created' }, { key: 'destroyed_link', name: 'Links Destroyed' },
      { key: 'created_field', name: 'Fields Created' }, { key: 'destroyed_field', name: 'Fields Destroyed' }, { key: 'destroyed_resonator', name: 'Resonators Destroyed' },
      { key: 'deployed_resonator', name: 'Resonators Deployed' }, { key: 'deployed_fracker', name: 'Frackers Deployed' }, { key: 'deployed_beacon', name: 'Beacons Deployed' }
    ];
    const machinaActions = ['captured', 'linked', 'deployed_resonator'];

    let html = '';
    teams.forEach(team => {
      html += `<h4 style="color: ${team.color}; margin-top: 10px;">${team.name}</h4><table style="width: 100%; font-size: 12px;">`;
      const actions = team.key === 'mac' ? allActions.filter(a => machinaActions.includes(a.key)) : allActions;
      actions.forEach(action => {
        const layerKey = `${team.key}_${action.key}`;
        const checked = window.plugin.intelhelper.settings.layerVisibility[layerKey] !== false ? 'checked' : '';
        html += `<tr><td><label><input type="checkbox" id="layer_${layerKey}" ${checked} onchange="window.plugin.intelhelper.toggleLayer('${layerKey}')"> ${action.name}</label></td></tr>`;
      });
      html += '</table>';
    });

    html += `
      <div style="margin-top: 15px;">
        <button onclick="window.plugin.intelhelper.toggleAllLayers(true); return false;" style="width: 48%; margin-right: 2%;">✓ Enable All</button>
        <button onclick="window.plugin.intelhelper.toggleAllLayers(false); return false;" style="width: 48%;">✗ Disable All</button>
      </div>
    `;
    return html;
  };

  window.plugin.intelhelper.generatePlayerList = function() {
    const players = Object.values(window.plugin.intelhelper.playerStats).sort((a, b) => b.totalActions - a.totalActions);
    if (players.length === 0) return '<p style="text-align: center; color: #888;">No players tracked yet</p>';
    return players.map(player => `
      <div class="player_item" style="padding: 8px; border-bottom: 1px solid #333; cursor: pointer;" onclick="window.plugin.intelhelper.showPlayerHistory('${player.name}')">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: ${window.plugin.intelhelper.textColors[player.team]}; font-weight: bold;">${player.name}</span>
          <span style="color: #888;">${player.totalActions} actions</span>
        </div>
        <div style="font-size: 10px; color: #888;">Last seen: ${new Date(player.lastSeen).toLocaleString()}</div>
      </div>
    `).join('');
  };

  window.plugin.intelhelper.filterPlayers = function() {
    const search = document.getElementById('player_search').value.toLowerCase();
    const items = document.querySelectorAll('.player_item');
    items.forEach(item => { item.style.display = item.textContent.toLowerCase().includes(search) ? 'block' : 'none'; });
  };

  window.plugin.intelhelper.showTab = function(tabName) {
    document.querySelectorAll('.tab_content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.intel_tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab_content_' + tabName).style.display = 'block';
    document.getElementById('tab_' + tabName).classList.add('active');
  };

  window.plugin.intelhelper.toggleLayer = function(layerKey) {
    const checkbox = document.getElementById('layer_' + layerKey);
    window.plugin.intelhelper.settings.layerVisibility[layerKey] = checkbox.checked;
    window.plugin.intelhelper.saveSettings();
    window.plugin.intelhelper.portals.discardOldEvents();
  };

  window.plugin.intelhelper.toggleAllLayers = function(enable) {
    Object.keys(window.plugin.intelhelper.settings.layerVisibility).forEach(key => {
      window.plugin.intelhelper.settings.layerVisibility[key] = enable;
      const checkbox = document.getElementById('layer_' + key);
      if (checkbox) checkbox.checked = enable;
    });
    window.plugin.intelhelper.saveSettings();
    window.plugin.intelhelper.portals.discardOldEvents();
    alert(enable ? 'All layers enabled' : 'All layers disabled');
  };

  window.plugin.intelhelper.openColorPreferences = function() {
    const html = `
      <div>
        <h3>Link Colors</h3>
        <table style="width: 100%;">
          <tr><td><strong style="color: #0088FF;">RESISTANCE</strong></td><td></td></tr>
          <tr><td>Created Links</td><td><input id="res_link_created_input" type="color" value="${window.plugin.intelhelper.settings.linkColors.res_link_created}"/></td></tr>
          <tr><td>Destroyed Links</td><td><input id="res_link_destroyed_input" type="color" value="${window.plugin.intelhelper.settings.linkColors.res_link_destroyed}"/></td></tr>
          <tr><td colspan="2"><hr style="border-color: #333;"></td></tr>
          <tr><td><strong style="color: #03DC03;">ENLIGHTENED</strong></td><td></td></tr>
          <tr><td>Created Links</td><td><input id="enl_link_created_input" type="color" value="${window.plugin.intelhelper.settings.linkColors.enl_link_created}"/></td></tr>
          <tr><td>Destroyed Links</td><td><input id="enl_link_destroyed_input" type="color" value="${window.plugin.intelhelper.settings.linkColors.enl_link_destroyed}"/></td></tr>
          <tr><td colspan="2"><hr style="border-color: #333;"></td></tr>
          <tr><td><strong style="color: #FF0000;">MACHINA</strong></td><td></td></tr>
          <tr><td>Created Links</td><td><input id="mac_link_created_input" type="color" value="${window.plugin.intelhelper.settings.linkColors.mac_link_created}"/></td></tr>
          <tr><td>Destroyed Links</td><td><input id="mac_link_destroyed_input" type="color" value="${window.plugin.intelhelper.settings.linkColors.mac_link_destroyed}"/></td></tr>
          <tr><td colspan="2"><hr style="border-color: #333;"></td></tr>
          <tr><td><strong>VIRUS</strong></td><td></td></tr>
          <tr><td><strong style="color: #0088FF;">ADA</strong> (flip to RES)</td><td><input id="ada_virus_input" type="color" value="${window.plugin.intelhelper.settings.linkColors.ada_virus}"/></td></tr>
          <tr><td><strong style="color: #03DC03;">JARVIS</strong> (flip to ENL)</td><td><input id="jarvis_virus_input" type="color" value="${window.plugin.intelhelper.settings.linkColors.jarvis_virus}"/></td></tr>
        </table>
      </div>
      <div style="text-align:center; margin-top:10px">
        <button type="button" onclick="window.plugin.intelhelper.resetColors()">Reset</button>
        <button type="button" onclick="window.plugin.intelhelper.saveColors()">Save</button>
      </div>
    `;
    dialog({ html: html, id: 'plugin_intelhelper_colors', title: 'Intel Helper - Color Preferences', width: 'auto' });
  };

  window.plugin.intelhelper.resetColors = function() {
    window.plugin.intelhelper.settings.linkColors = {
      'res_link_created': '#0088FF', 'enl_link_created': '#03DC03', 'mac_link_created': '#FF0000',
      'res_link_destroyed': '#0088FF', 'enl_link_destroyed': '#03DC03', 'mac_link_destroyed': '#FF0000',
      'ada_virus': '#0088FF', 'jarvis_virus': '#03DC03'
    };
    window.plugin.intelhelper.saveSettings();
    window.plugin.intelhelper.openColorPreferences();
    window.plugin.intelhelper.portals.discardOldEvents();
  };

  window.plugin.intelhelper.saveColors = function() {
    const colorKeys = ['res_link_created', 'enl_link_created', 'mac_link_created', 'res_link_destroyed', 'enl_link_destroyed', 'mac_link_destroyed', 'ada_virus', 'jarvis_virus'];
    colorKeys.forEach(key => {
      const input = document.getElementById(`${key}_input`);
      if (input) window.plugin.intelhelper.settings.linkColors[key] = input.value;
    });
    window.plugin.intelhelper.saveSettings();
    window.plugin.intelhelper.portals.discardOldEvents();
    alert('Colors saved!');
  };

  window.plugin.intelhelper.getStats = function() {
    let totalEvents = 0, resEvents = 0, enlEvents = 0, macEvents = 0;
    const portals = Object.keys(window.plugin.intelhelper.portals.portalsById).length;
    Object.values(window.plugin.intelhelper.portals.portalsById).forEach(portal => {
      totalEvents += portal.events.length;
      portal.events.forEach(event => {
        const team = event.team === 'NEUTRAL' ? 'MACHINA' : event.team;
        if (team === 'RESISTANCE') resEvents++;
        else if (team === 'ENLIGHTENED') enlEvents++;
        else if (team === 'MACHINA') macEvents++;
      });
    });
    return { portals, events: totalEvents, resEvents, enlEvents, macEvents };
  };

  window.plugin.intelhelper.refreshData = function() {
    window.plugin.intelhelper.portals.discardOldEvents();
    alert('Data refreshed!');
    window.plugin.intelhelper.showPanel();
  };

  const setup = function() {
    window.plugin.intelhelper.loadSettings();
    const iconEnl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAAABmJLR0QAAwDcAAOjeVxBAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wURFRwuL7WK2QAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABXklEQVQ4y7WVz0rDQBDGv0nyHIUFX0DBqwaFEO0t2GvowXufJfQFJNdKbkIJVtYeevHuqRDIO/RY10tm3TSbTQQdWMifyS/fZL6dAADCMoQZzbmyrrRo5fI5hWUIGUkNk5FUACAyAVtUi4oBBADIE7TgrEJkQolMKH/vWxfft6rz976G9AFsQBNGDUuJTKCe1vhNTF4mXCoFQ4lmDL3IWpKWbixXnueSfL2+oaZ8ovkzVYuqo5LDWdp7/IbLVYLP7T0OywdnWR7+KJygq/UtPmYFDstHePOVE2QtrZ7WEBDYxhvF176eZnBZJAjLkGQklUA7iWGu9msfpQUFMpK9ckcbNE+0s7W7xwDYAuxqWEaIGtpzJ0ZtjZIWzLWBrbu+Oe507Xh2hNmAzixKC0Ke2Nt/MtjGfWBW1UDJlmNOS26AVmM8/C9bpFcNANztzn9+AsmmW9bYiHcXBujVmfsN4vT0uC/vb4wAAAAASUVORK5CYII=';
    const iconRes = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wURFRwCHW3mOgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABa0lEQVQ4y7WVv0vDQBTHvy/pP1LoHFBw1aAQomOwa+ggpPlP3DvEbuJayVyCytmhi1sGp4J/Rcd4DubFO3N3RtAHB7nw8rnvvV8BAIRVCNXavTSutNR8eU9hFUJEooOJSEgACLICJquXOQMIAHCXAGmJkYhE5yQiIRlQj+dGUJAxMJEqjADA3/loJo0MssIK6AHfbj7VpSV1IAC/gvRgAI1+ctTi4ziIbGqU05T42P08l+ST9Sm1hxHN7qle5j2VbM6rPcdPOFoleN1cYL+4dMbLwx+ZE3S8PsPLtMR+cQVvtnKCjFerx3MEGbCJc8nv3m+ncJUIt4g1c670q0WptYhJ2SBTKrur7iEAVspVrXU/w2yFZylUUkeJNo/8nc/qJK6ltoKs6M+k9rmXtWbSIKxCElEueWRos6jtdmP6vw22YQFmVS2UTD7qtOwSwGqUj/+lRaxqAOB8e/D1E0ge+9caavH2UAE9OH0/APDmw5Sw3mGaAAAAAElFTkSuQmCC';
    const iconMac = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAAEqWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIKICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgdGlmZjpJbWFnZUxlbmd0aD0iMjMiCiAgIHRpZmY6SW1hZ2VXaWR0aD0iMTgiCiAgIHRpZmY6UmVzb2x1dGlvblVuaXQ9IjIiCiAgIHRpZmY6WFJlc29sdXRpb249IjcyLzEiCiAgIHRpZmY6WVJlc29sdXRpb249IjcyLzEiCiAgIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSIxOCIKICAgZXhpZjpQaXhlbFlEaW1lbnNpb249IjIzIgogICBleGlmOkNvbG9yU3BhY2U9IjEiCiAgIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiCiAgIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIKICAgeG1wOk1vZGlmeURhdGU9IjIwMjUtMTEtMjNUMDk6NDM6MTgrMDE6MDAiCiAgIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMTEtMjNUMDk6NDM6MTgrMDE6MDAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJwcm9kdWNlZCIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWZmaW5pdHkgMy4wLjEiCiAgICAgIHN0RXZ0OndoZW49IjIwMjUtMTEtMjNUMDk6NDM6MTgrMDE6MDAiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0iciI/PvioQtAAAAGBaUNDUHNSR0IgSUVDNjE5NjYtMi4xAAAokXWRzytEURTHPwaN/IiiWFCTsBpi1MTGYsRQWIynDDYzz7wZNW+83htJtsp2ihIbvxb8BWyVtVJEStZsiQ3Tc97M1Ewy53bu+dzvved077ngUpKqblX1g55Km6FgwDMfXvC436ijlRq66YioljE9O65Q1r4eqHDiXa9Tq/y5f61uOWapUFEjPKIaZlp4QnhqPW04vCvcoiYiy8Lnwl5TLih87+jRPL86HM/zj8OmEhoFV5OwJ17C0RJWE6YuLC+nS0+uqYX7OC+pj6XmZiV2irdjESJIAA+TjDGKnwGGZfbTi48+WVEmvz+XP8Oq5KoyG2xgskKcBGm8oq5J9ZhETfSYjCQbTv//9tXSBn356vUBqH6x7Y9ucO9ANmPb38e2nT2Byme4ShXzV49g6FP0TFHrOoTGLbi4LmrRPbjchrYnI2JGclKluEvT4P0MGsLQfAu1i/meFfY5fQRlU77qBvYPoEfONy79AoiEZ/VSzANRAAAACXBIWXMAAAsTAAALEwEAmpwYAAAC50lEQVQ4jaWUyW5cRRSGv1NVd3QPvh6SdCNjlAhLSOxhyQ4h8Sa8AQ/BkhUSYskmO4QiAgukWFkhscDBBIkojgyhcWx329339nB/Fu0BeRAWfJsq1fDXOfXXKeNqnMEMQKcDgAGzeXOJS4Odk71fZ032xkP6Eo26xpkjWury4d4L+tfsPSOAHhddDX1QZaZe0tSrtKXtVlcjHzQy066ZfgixNkACf5bCaacJ+qxRsFZV/NnsEgHP26/xo4tYGfzBAcYhEGGs+4QHSU4BUyD7p5A+ba/ygYzV8oDV4x4DjJ9GB2hacr95m826JjLHNz4mqY64NS75MmsSw/AsTQ96kLdVmVM/zjVwXkPQvg8SaGqmiTlVmH4DPY1S9V2kbTPdO/cD3e9uaA+0kzR0GGWqzOmXpa5svkiAOqAnK2uaYdo3p5d5oUch0ZaPTtegLxqFjkCvzFSZad/5s8kL6PdGoRo0NqfNpKmnPgiQA1ivhlRAX2IqUfpwrbN+OqVyHq+ajWpAb6E4d23BR+A8C0ANeHPXCs1MGKLvPG0zyhBjzF8wb5XHlEB0ks/Q+StF3gDyScURjmlImfqExdEhOo3oYQg8cYEMIwfWymM2b9/lPVAXtAxaAn2Xt9mraxY0w3zMVogZpo35KR/D3XdAn5jTIG6oBr1odbSdtlWZ6SDJdZjkKn2kKWhiptIFfe5jDUFhnsQiy7CxDnozzvQspJpiOohzTVzQ2HmNndfz5h31skKl8ypBf4VEQ3N6f/HWqbtndZdloK0o1XGIVYOOQ6r9pKndVke9fEUTH9TH9Mh5jXykb+NUbi6yfukyI5CBvlp9XSPz2s0Kjc1p4IJq0EPn9TLJ9S6ocSGSizgg8qCdtKGdVkdDH2nggqZm+jldUMG5STfibdCemSrnNHReE+e0NBdZvrEI85j1/Z17mmHq5S39WnSUXl02/846aGSmnjn5/ypygp5lLX2Ut68r4psTnX8l/5sbCf0NauRtiQycvcIAAAAASUVORK5CYII=';
    const iconEnlRes = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wURFRkTCqoyjQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABp0lEQVQ4y62VPUvDUBSGn5t09S8UAp0LCq4aFELVLehaHITaqZu/wVUctJu4Kt0EKSpXBxe3Dk6FC/0PjvU6NOc2iTexgwdCPjg8ed+cjwAQj2Pykd1b79EdFXLlXsXjGJ1oB9OJtgDRReRy1z7P3PVk2BeAAuA2he6Ihk60S9KJtgKYHcwAaD40F4DoFIB2T4CpzcMaAOE0RLcWEAFURR7oYAKat+YrQcpABwMV1CWLLYC2ua4FK8CrpvnQxAxM4Vm7d+Ws5V8wGfYJqpSYgWH7cUdlL1Pq+F5Nhv1KZY06ua+dFzbvUj7f9vm6PKy1FvBPUQvaetzl42jE1+UJwfFdLchrbXYwIyLirfNs5dn3zZH3YztQPI6VTrSNKFZOYPkRqaoY3ZEK8iPiU1buaG9IZwPKDIwVBX91uLRANsBKrJGpUmZgFpNP9bg4O8uGdquksI/CaUjW7Tachja6iGy7d2U5t4tzeSdl17+qNm/NyRfA92G5Tf3lLy221TpQVHmghVUr69ZZE0vlVfvfI+JVI7H3vr78CaTPv22tGp33jRzoqTb3B2/D1Of1M8J/AAAAAElFTkSuQmCC';
    const iconResMac = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAAEqWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIKICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgdGlmZjpJbWFnZUxlbmd0aD0iMjMiCiAgIHRpZmY6SW1hZ2VXaWR0aD0iMTgiCiAgIHRpZmY6UmVzb2x1dGlvblVuaXQ9IjIiCiAgIHRpZmY6WFJlc29sdXRpb249IjcyLzEiCiAgIHRpZmY6WVJlc29sdXRpb249IjcyLzEiCiAgIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSIxOCIKICAgZXhpZjpQaXhlbFlEaW1lbnNpb249IjIzIgogICBleGlmOkNvbG9yU3BhY2U9IjEiCiAgIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiCiAgIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIKICAgeG1wOk1vZGlmeURhdGU9IjIwMjUtMTEtMjNUMTA6Mjg6MzQrMDE6MDAiCiAgIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMTEtMjNUMTA6Mjg6MzQrMDE6MDAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJwcm9kdWNlZCIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWZmaW5pdHkgMy4wLjEiCiAgICAgIHN0RXZ0OndoZW49IjIwMjUtMTEtMjNUMTA6Mjg6MzQrMDE6MDAiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0iciI/PuFl3DAAAAGBaUNDUHNSR0IgSUVDNjE5NjYtMi4xAAAokXWRzytEURTHPwaN/IiiWFCTsBpi1MTGYsRQWIynDDYzz7wZNW+83htJtsp2ihIbvxb8BWyVtVJEStZsiQ3Tc97M1Ewy53bu+dzvved077ngUpKqblX1g55Km6FgwDMfXvC436ijlRq66YioljE9O65Q1r4eqHDiXa9Tq/y5f61uOWapUFEjPKIaZlp4QnhqPW04vCvcoiYiy8Lnwl5TLih87+jRPL86HM/zj8OmEhoFV5OwJ17C0RJWE6YuLC+nS0+uqYX7OC+pj6XmZiV2irdjESJIAA+TjDGKnwGGZfbTi48+WVEmvz+XP8Oq5KoyG2xgskKcBGm8oq5J9ZhETfSYjCQbTv//9tXSBn356vUBqH6x7Y9ucO9ANmPb38e2nT2Byme4ShXzV49g6FP0TFHrOoTGLbi4LmrRPbjchrYnI2JGclKluEvT4P0MGsLQfAu1i/meFfY5fQRlU77qBvYPoEfONy79AoiEZ/VSzANRAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB50lEQVQ4jZ2Uy27TQBiFv7FN1EhpLiJSpFSgtgIqNhHwApUrWLBAZFUeIc1DwGu0eYSuSNQdCyyeACkLdmk2iFUvScYk0MQeFsZTO2SSlCN5M5dvzvnnHwvMUoZxse6gAmi7rl7x4fGhnuy2mgv3OvOQjwcuQsF+uUzh5jdnIxkBdo4AqDU0UCVhSZA6fbXPy8J9hpkMYxUnk6mTksAkzIohbdflMFtgYzZjYtv8sm2y06mxUN2dI2qNY10KKzmpBDhhyLaUbPk+Z/6AqR2hav0TAzKSAFT7wOVFtURmlqEyHgPQ8SX1z15qca1xrKPpsf4J3VYzciQUVPyQymTCeT5PR2qISH7dVtPoTEdTQqCUYmrbSyOYZEG68/aurw0tt1zR9Qu4pxTnxSK+4xD6/v+BfmYCvudybA+HWECwu8upE/Du05fU7S8qdqw4hOq4Ls+qVS6yWZ5eXtIrlej1+wjg/ZPoiZhuDBC3xQYeSMnD0YiNIGDv6orXxZzeZHKSigaIuuepjuuClLzZ3MRRil6+BIN/6xW3QOwmCQIQbz1Pv/znW2UeDQZ8WwBZ9Aew5taJv+74+uOCGzs0QeImTW00KYpKotiJKPOad5QmLZu8A0jUvdtHu8zNSkd3dbUOayVvpaN19QcV2L18p7wlHgAAAABJRU5ErkJggg==';
    const iconEnlMac = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAAEqWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIKICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgdGlmZjpJbWFnZUxlbmd0aD0iMjMiCiAgIHRpZmY6SW1hZ2VXaWR0aD0iMTgiCiAgIHRpZmY6UmVzb2x1dGlvblVuaXQ9IjIiCiAgIHRpZmY6WFJlc29sdXRpb249IjcyLzEiCiAgIHRpZmY6WVJlc29sdXRpb249IjcyLzEiCiAgIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSIxOCIKICAgZXhpZjpQaXhlbFlEaW1lbnNpb249IjIzIgogICBleGlmOkNvbG9yU3BhY2U9IjEiCiAgIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiCiAgIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIKICAgeG1wOk1vZGlmeURhdGU9IjIwMjUtMTEtMjNUMTA6MzA6MDgrMDE6MDAiCiAgIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMTEtMjNUMTA6MzA6MDgrMDE6MDAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJwcm9kdWNlZCIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWZmaW5pdHkgMy4wLjEiCiAgICAgIHN0RXZ0OndoZW49IjIwMjUtMTEtMjNUMTA6MzA6MDgrMDE6MDAiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0iciI/Pmx53WsAAAGBaUNDUHNSR0IgSUVDNjE5NjYtMi4xAAAokXWRzytEURTHPwaN/IiiWFCTsBpi1MTGYsRQWIynDDYzz7wZNW+83htJtsp2ihIbvxb8BWyVtVJEStZsiQ3Tc97M1Ewy53bu+dzvved077ngUpKqblX1g55Km6FgwDMfXvC436ijlRq66YioljE9O65Q1r4eqHDiXa9Tq/y5f61uOWapUFEjPKIaZlp4QnhqPW04vCvcoiYiy8Lnwl5TLih87+jRPL86HM/zj8OmEhoFV5OwJ17C0RJWE6YuLC+nS0+uqYX7OC+pj6XmZiV2irdjESJIAA+TjDGKnwGGZfbTi48+WVEmvz+XP8Oq5KoyG2xgskKcBGm8oq5J9ZhETfSYjCQbTv//9tXSBn356vUBqH6x7Y9ucO9ANmPb38e2nT2Byme4ShXzV49g6FP0TFHrOoTGLbi4LmrRPbjchrYnI2JGclKluEvT4P0MGsLQfAu1i/meFfY5fQRlU77qBvYPoEfONy79AoiEZ/VSzANRAAAACXBIWXMAAAsTAAALEwEAmpwYAAACMUlEQVQ4jZ2UPU/bUBSGn2uHiEgUiIgUAXL4EBJtp5Q/gIxg6NRM7Z9o/4DLiPgvTCViqTpgdekGpEvVJXEUV+3AV8CGFEJ8OxhfxxYRoUfy4ON7n/u+55xrweCQA/Ji2KQE2DVNteLDevP+k4Zr1R/cm0lDPq2ZCAmrhQITtzfsXXoAuOU/ABjbC+G75ch+WD9I7myssj4xxUU2y7WMnHmJkyJgaes5rc2fCqZFkF3T5G1ugtG7Ozq6zl9dJ9ftJgslRyDIAdBaaWJsL6pSaIl1AjJBwLznMev77PltunqIMmrTILqgdVS9+vshALm7ZrIykyd7l6V4fQ1A1feo7NsJW8b2grKGzAAaxvcpXMsJFQkJRT+g2OnQGB+n6imI6H9cywmVReUVXXWIsiaFQEpJV9cZKsRNwpoGyclbPj8fMHLpSM5r2H4BI1LSmJzEz2QIfH8YSfcwEYOusj1+jY0xf3GBBvQWF9nJ9Hj35Wvi2NLWS1rlRkqRVFgAWTVNyjMznORyvDg9pZ7PU3ccBPB+ownEwxiFUZvGtRwAERcbMDyP0uUlo70ey2dnvJ4cU5vSkLiZYUQgUbFt9jyPb8fHoWcpaT3LP1ib0uEccwdLuFZDueq/a+KNbaub/2q2wFK7zY8UpnS4QGtTZZUkLbVOROqOfp9wqwfJmhzNRpCkrwdACljZt/ncvoohtWncj/WEimFAwOBf5FNBomLHlzZq8/+AnqxqGNajvEcVDRv/ANuN0WSF/fyMAAAAAElFTkSuQmCC';
    const iconAll = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAXCAYAAAAGAx/kAAAEqWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIKICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgdGlmZjpJbWFnZUxlbmd0aD0iMjMiCiAgIHRpZmY6SW1hZ2VXaWR0aD0iMTgiCiAgIHRpZmY6UmVzb2x1dGlvblVuaXQ9IjIiCiAgIHRpZmY6WFJlc29sdXRpb249IjcyLzEiCiAgIHRpZmY6WVJlc29sdXRpb249IjcyLzEiCiAgIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSIxOCIKICAgZXhpZjpQaXhlbFlEaW1lbnNpb249IjIzIgogICBleGlmOkNvbG9yU3BhY2U9IjEiCiAgIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiCiAgIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIKICAgeG1wOk1vZGlmeURhdGU9IjIwMjUtMTEtMjNUMTA6MzE6MTErMDE6MDAiCiAgIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMTEtMjNUMTA6MzE6MTErMDE6MDAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJwcm9kdWNlZCIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWZmaW5pdHkgMy4wLjEiCiAgICAgIHN0RXZ0OndoZW49IjIwMjUtMTEtMjNUMTA6MzE6MTErMDE6MDAiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0iciI/Pl6CjB8AAAGBaUNDUHNSR0IgSUVDNjE5NjYtMi4xAAAokXWRzytEURTHPwaN/IiiWFCTsBpi1MTGYsRQWIynDDYzz7wZNW+83htJtsp2ihIbvxb8BWyVtVJEStZsiQ3Tc97M1Ewy53bu+dzvved077ngUpKqblX1g55Km6FgwDMfXvC436ijlRq66YioljE9O65Q1r4eqHDiXa9Tq/y5f61uOWapUFEjPKIaZlp4QnhqPW04vCvcoiYiy8Lnwl5TLih87+jRPL86HM/zj8OmEhoFV5OwJ17C0RJWE6YuLC+nS0+uqYX7OC+pj6XmZiV2irdjESJIAA+TjDGKnwGGZfbTi48+WVEmvz+XP8Oq5KoyG2xgskKcBGm8oq5J9ZhETfSYjCQbTv//9tXSBn356vUBqH6x7Y9ucO9ANmPb38e2nT2Byme4ShXzV49g6FP0TFHrOoTGLbi4LmrRPbjchrYnI2JGclKluEvT4P0MGsLQfAu1i/meFfY5fQRlU77qBvYPoEfONy79AoiEZ/VSzANRAAAACXBIWXMAAAsTAAALEwEAmpwYAAACa0lEQVQ4jaWUMUwTURzGf+/uOK3BAgEh1BwBHAAXEWNiSAw5AnFl0s3JRA0RF6fGOBEmV6MkLsaJyRI2BlEHV8umAy2hakMCoXAHpV57z+Ho465QaeKX3HDv/d/3/77v//IE9SHrrItGFyVAyrZVxZOJ9aMtjVxy7dSzRi3Jh3EbIWGso4OWPyWW9hwAcsN5AKy5vuA/mZVhsjCRXJgcY6KlnV3T5EBWnTmRTlXCntlBNp5/V2RalSRl29yNtXC+XKao6xzqOjHPiwYlm8CPAbAxso4116+i0CJ1Agzfp9dxuOy6LLkFPD2gstLdIDzQiiqv8DwEIFPjNiOJNsyySdfBAQCLrsPUx5WILWuuT1lDGoCGtdpOLpkNFAkJXa5PV7FIJh5n0VEkIvzlktlAWTVe4akmypoUAiklnq7TEEQpYk2D6M0b2Nmpc+VqEb2vwfgFNElJprUV1zDwXbcRSUdk4pho36zws7mZ3t1dNKDS38+CUeHe8udI257Zq2xeiQP5kCKpaAHkom0znEiwFYsxtL3N/bFnZDNrIATlw30AColRJBU2Bx9TupjGSneTS2YBxHHYgOU49OztMT75mnxTL+cGJ5SaQvdtkDpCmrRnX3A8zABVIjG1ssJM8xBTnXcA8DWdDu/Xqel0Zta5nnpJLplRrmrnIwFGp98SH7hFwbiE92OZ8uF+oAhoy38iPT8dTjyiKLwhvr56wNbaN0y/FOnR+vtLlSTq6xRFEXU3Z97hC02FvTr/qO6Z2vcoAt2vKM1SlP9Veibkjafv5bWHbyT1n17gZEYncMErgvD/S41SdZaahhQ1ir9xLuILz+V2WAAAAABJRU5ErkJggg==';

    window.plugin.intelhelper.icons = {
      enl: L.icon({ iconUrl: iconEnl, iconSize: [18, 23], iconAnchor: [9, 22] }),
      res: L.icon({ iconUrl: iconRes, iconSize: [18, 23], iconAnchor: [9, 22] }),
      mac: L.icon({ iconUrl: iconMac, iconSize: [18, 23], iconAnchor: [9, 22] }),
      enlRes: L.icon({ iconUrl: iconEnlRes, iconSize: [18, 23], iconAnchor: [9, 22] }),
      resMac: L.icon({ iconUrl: iconResMac, iconSize: [18, 23], iconAnchor: [9, 22] }),
      enlMac: L.icon({ iconUrl: iconEnlMac, iconSize: [18, 23], iconAnchor: [9, 22] }),
      all: L.icon({ iconUrl: iconAll, iconSize: [18, 23], iconAnchor: [9, 22] })
    };

    $('<style>').prop('type', 'text/css').html(`
      .plugin_intelhelper_ada { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAArxJREFUeNrEk0tsTGEUx//ffcy9c+/tdB53XqZv7ZSmHiGtd4JIQ7ohESK2WBELWwsWIkIirIQFEYQFGyFBvIogqkFDVZV4pO1U606n09478839PrdISNhZOMvznfP7zjn/cwjnHP9iAv7RJH+o6g/nVFXBYKBdFcWaYpF2uYz2C4I0zFgJnHA4kxSMugABREkJ/JZKwJkLVTNSeiR5mpSZG72MhSIhLcSldXCpBsbsEnXz3zv3AET9rQJacuFTlERq2vQHNgTB2bILejRWZXU9G+S5bFicsPzEGoDQ92JfYeDDbkgyJIX8QDEPySU5HDdTN4XWhXVlK9dayfoKva4lyoamKyNvLt0+Z30euVqyxjWledkOmdpLefbLfVExouDezwLnRryqoSO3YlOzvGo9FNHwM8rFHFWE1NxEIrisZcnXR8+zrOPKGefVizNiTXqzbI92C1wUIUhMK6+f3ZFpXRNgCeO83fkSsQUmuF/B8K13GO75Ci8M5eFIUIaVFQVamHzfe9xiMhfUkNkUrEzvdULm0fLOy7UNTXIm2taK3iP3MH7tKcbf9mOw28Fgh4WyCpLJFXyAWV2lLm0/GI3Gk5Lm16fNbEgHYpHg/Pj8pnWlz6XVevYx5OS41wbHQ60afem4J90YRnqyMd/6nRfUYHAG7by1RyfIkEisGv5AZIFQ2XgYRvlYmTVwJ1TfuCFcmZpHhkah2g7epZrRZ0RANR3czsF37nCbPfTxhmmGQMxEHWTvwdMQxAhtdVINm2xVu1kxK9EfWrx8e0ZvXOJwHcXeXorrZy+SJ9cPjWVHnzJFQ8oM/wToBjwdQRiDtyymN9IDE9HaRZPb9ifV/AhVr5w8Jj2/e8Klhk+eMMgXHTBR/guAT62xC+4FlCSlTaydk3Zed52SCM8Lsg8eHqUiRb5g/wL892v8JsAAA+sqvDde8pwAAAAASUVORK5CYII="); background-position: 0 0; background-repeat: no-repeat; height: 16px; padding-left: 18px; font-weight: bold; color: #0088ff; }
      .plugin_intelhelper_jarvis { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAvRJREFUeNqkk99vFFUUx7/33rl7584MO7t2u7jQbsGllQhpsyZSFaKRxBAjUZDIEwkPGsOLj/LiP9Dw5ouJPvlIohh5wPCgMZjUmiA0Qa2Sqiy026XtbvfHMNPdmTtznaqgPvck5+Ek93vO99x8DtFaYzthPFk9jK0mrbYPQ/fB1SYgXGguQbQCY0QEm6rc7weLlMSQ0oLnecA/g43/9yOpKAEotZiwJrkQhwzDPkplNBE3aydV2Lv996tU/9DBv2KNOC03qQkB4gqePc9J7mRobIDafRSMibnW6sKU1snSf9dmQ6VyOhXwg9S+kPssd+y8lR/9EIXBM+qlJnAmaQTL6+f0YpiRcuh1yrmrVNRLEtUilIFUDlShYiq4u+czYRWOx7m1flJtL1lnD4+7O6uw2RhaK4utjV/nv/Fmrn1lNqzTlNs7G/WFaRWHPjNT66HCLqc48m7w4k9O+PLczeKrp0q88JxTkdOwiYM9uUMWqQw/tc5/GPGta98qEe0yk8LzQtEvGSd57CiXzrWHa1Fb/Dijr49cnnpj5oxwpUyiCDfvfAHf3sBeYwrNeoe0L954+8QLJw7un5g8bkE2DDzmTniqc78zu3IhzgO5I5VXaCGbH6CD+7XrMJKt/6VoYhXSsX8Ziw8Se6Nyanb264/v/bHwiWHZlu64936mnQDTxWNYWxncIO1ue7z+MD88n4fv5IB1gZbzG4L5xm5Zrt66cvXz71aX77xPKQXLZJy2wcWxeH/01mhx7+5xOT5k3l7zKNvxRFPCDqWAShQyXR/1q99lb83OvdPrrn2Q2uoSmjIxWt4HohhUzrngVevvWc/6c9TUNV4qZuXTk0dh2EnYaPDkI8PoXaq9ZujelQxnj0BijnQQ6wi6r0MryHeYFoRvZkdIL348vrtkJcu/Z3FJs+6nvTd95V82OYVBH3KbZnG49BfXJGNDSBeDByHYFmmEH2AZeQRJnPMG3btB5F1MGUfW1DD5o1NIIdzmNVJsM/4UYABhczyLk4yHJgAAAABJRU5ErkJggg=="); background-position: 0 0; background-repeat: no-repeat; height: 16px; padding-left: 18px; font-weight: bold; color: #03DC03; }
      .plugin_intelhelper_fracker { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABRFBMVEX+///+/vv///3+/v769/Xz6uX88tXty8XyvbT4+4X053/3QlPkLDfLZTooLjoeNEsdP1kvPFUkR2o1RGQ1UnZjVWBNXX86apFKapVfc5J4kKn//v/9knL9hWX7dWLxa136gFn9qXfrdFLDT1WyP0mmNS+gPkGONEKNJy93LUh1Iy5eHzf8oGH7k2b5sGvrg234dW/RVFb7n2/9nH65Rz38sIvrdmLgbW/6g3b5jVb9uX3qnHLVak78w3D+yoXITkb92IS0TVOmVF2mWzzfYl76t3OgRFCLP1PovWzup2T7c1X8xpBHDTb61HjnYFbzZk/8yXvbVEfiZ0zRnJPKcnm+XWHFXk3PZWDom1j1m5HZf1/944vzsqTSjIX+7Jr88oiIRjTvilzggkz8+6D71ZjZs2Tp2XH75cGqaXD40Lj7/JPOlFLHtb1VAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfgAg8QNBhMUzrFAAAAdUlEQVQY02NgQAY+IEIXwbdIBAvEQ3hACX0oS4eBwZWBwQqoAqrSnIFBjoFBMTYbplU3GGRaWpYM3LBkBl8GBlkthOm6YKsCkOzXtWZgMJRFEkiI9lRwRHGii4q2BYqAo7O6OIoAg4UoKp9BkB1NQEKCAQcAAHaAC9+tIFYpAAAAAElFTkSuQmCC"); background-position: 0 0; background-repeat: no-repeat; height: 16px; padding-left: 18px; font-weight: bold; color: #ff6600; }
      .plugin_intelhelper_beacon { font-weight: bold; color: #ffaa00; }
      .plugin_intelhelper_popup a { color: #ffce00; cursor: pointer; text-decoration: underline; }
      .plugin_intelhelper_popup a:hover { color: #ff6600; }
      .plugin_intelhelper_popup table { width: 100%; border-collapse: collapse; }
      .plugin_intelhelper_popup td { padding: 2px 5px; font-size: 11px; }
      .plugin_intelhelper_popup time { color: #aaa; }
      .intel_tab { background: rgba(8, 48, 78, 0.9); color: #ffce00; border: 1px solid #20A8B1; padding: 8px 15px; cursor: pointer; margin-right: 5px; font-size: 12px; }
      .intel_tab:hover { background: rgba(8, 48, 78, 1); border-color: #ffce00; }
      .intel_tab.active { background: #20A8B1; color: white; }
      .plugin_intelhelper_panel button { background: #20A8B1; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 3px; font-size: 13px; }
      .plugin_intelhelper_panel button:hover { background: #1a8a91; }
      .plugin_intelhelper_panel h4 { color: #ffce00; margin: 10px 0 5px 0; border-bottom: 1px solid #20A8B1; padding-bottom: 3px; }
      .plugin_intelhelper_panel table { width: 100%; font-size: 12px; }
      .plugin_intelhelper_panel table td { padding: 3px; }
      .plugin_intelhelper_panel select, .plugin_intelhelper_panel input[type="text"] { padding: 5px; font-size: 13px; background: #1a1a1a; color: white; border: 1px solid #20A8B1; }
    `).appendTo('head');

    window.plugin.intelhelper.layers = {
      actions: new L.LayerGroup(), createdRes: new L.LayerGroup(), destroyedRes: new L.LayerGroup(),
      createdEnl: new L.LayerGroup(), destroyedEnl: new L.LayerGroup(),
      createdMac: new L.LayerGroup(), destroyedMac: new L.LayerGroup()
    };

    if (window.layerChooser && typeof window.layerChooser.addOverlay === 'function') {
      window.layerChooser.addOverlay(window.plugin.intelhelper.layers.actions, '[Intel Helper] Actions', { default: true });
      window.layerChooser.addOverlay(window.plugin.intelhelper.layers.createdRes, '[Intel Helper] Created by RES', { default: true });
      window.layerChooser.addOverlay(window.plugin.intelhelper.layers.createdEnl, '[Intel Helper] Created by ENL', { default: true });
      window.layerChooser.addOverlay(window.plugin.intelhelper.layers.createdMac, '[Intel Helper] Created by MACHINA', { default: true });
      window.layerChooser.addOverlay(window.plugin.intelhelper.layers.destroyedRes, '[Intel Helper] Destroyed by RES', { default: true });
      window.layerChooser.addOverlay(window.plugin.intelhelper.layers.destroyedEnl, '[Intel Helper] Destroyed by ENL', { default: true });
      window.layerChooser.addOverlay(window.plugin.intelhelper.layers.destroyedMac, '[Intel Helper] Destroyed by MACHINA', { default: true });
    }

    window.plugin.intelhelper.portals = new Portals();

    // Utilisation de l'API Toolbox officielle
    if (typeof IITC !== 'undefined' && typeof IITC.toolbox !== 'undefined') {
      IITC.toolbox.addButton({
        id: 'intelhelper',
        label: 'Intel Helper Enhanced',
        title: 'Intel Helper Enhanced - Advanced tracking with player history',
        action: window.plugin.intelhelper.showPanel
      });
    } else {
      const $toolbox = $('#toolbox');
      if ($toolbox.length > 0) {
        $toolbox.append(`
          <a onclick="window.plugin.intelhelper.showPanel(); return false;" title="Intel Helper Enhanced - Advanced tracking with player history">
            Intel Helper Enhanced
          </a>
        `);
      }
    }

    // Fallback pour mobile si toolbox n'existe pas
    const setupMobileButton = () => {
      if (window.isSmartphone && window.isSmartphone()) {
        const $sidebar = $('#sidebar, #updatestatus, .leaflet-control-layers');
        if ($sidebar.length > 0 && $('#plugin_intelhelper_mobile_btn').length === 0) {
          const mobileBtn = $('<a>').attr('id', 'plugin_intelhelper_mobile_btn').text('Intel Helper').css({
            display: 'block', padding: '10px',
            margin: 'env(safe-area-inset-top, 5px) 5px 5px 5px',
            background: 'rgba(8, 48, 78, 0.9)', color: '#ffce00', border: '1px solid #20A8B1',
            textAlign: 'center', fontWeight: 'bold', cursor: 'pointer'
          }).on('click touchstart', function(e) {
            e.preventDefault(); e.stopPropagation();
            window.plugin.intelhelper.showPanel();
            return false;
          });
          $sidebar.first().prepend(mobileBtn);
        }
      }
    };
    setTimeout(setupMobileButton, 1000);
    setTimeout(setupMobileButton, 3000);

    if (window.addHook && typeof window.addHook === 'function') {
      // Utilisation du nouveau hook API Comm si disponible
      if (typeof IITC !== 'undefined' && typeof IITC.comm !== 'undefined') {
        window.addHook('commDataAvailable', function(data) {
          if (!data.channel || data.channel === 'all') {
             window.plugin.intelhelper.processNewData(data);
          }
        });
      } else {
        // Fallback ancienne version IITC
        window.addHook('publicChatDataAvailable', function(data) {
          window.plugin.intelhelper.processNewData(data);
        });
      }
    }
  };

  setup.info = plugin_info;
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  if (window.iitcLoaded && typeof setup === 'function') setup();
}

const scriptHTML = document.createElement('script');
const infoHTML = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  infoHTML.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
}
scriptHTML.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(infoHTML) + ');'));
(document.body || document.head || document.documentElement).appendChild(scriptHTML);
