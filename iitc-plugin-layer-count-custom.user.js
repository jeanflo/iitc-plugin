// ==UserScript==
// @author         Z0mz0m
// @name           IITC plugin: Layer count & Persistent Global Highlighter
// @category       Info
// @version        1.1.0
// @updateURL      https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-pluin-layer-count-custom.meta.js
// @downloadURL    https://raw.githubusercontent.com/jeanflo/iitc-plugin/refs/heads/main/iitc-pluin-layer-count-custom.user.js
// @description    Surligne les fields de façon persistante au clic et sur l'écran
// @id             iitc-plugin-layer-count-custom
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
  if(typeof window.plugin !== 'function') window.plugin = function() {};

  var layerCount = {};
  window.plugin.layerCount = layerCount;
  var tooltip;
  var currentHitFields = []; // Stocke les fields allumés par le clic

  // --- FONCTION DE RESET (RETOUR AUX COULEURS D'ORIGINE) ---
  function resetStyles(fieldsArray) {
    if (!fieldsArray) return;
    fieldsArray.forEach(function(f) {
      if (f && f.setStyle) {
        var team = f.options.team;
        var factionColor = (team === window.TEAM_ENL) ? window.COLORS[window.TEAM_ENL] : window.COLORS[window.TEAM_RES];
        
        f.options.color = factionColor;
        f.options.weight = 2;
        f.options.fillOpacity = 0.2;

        f.setStyle({ 
          color: factionColor,
          weight: 2, 
          opacity: 0.5, 
          fillColor: factionColor,
          fillOpacity: 0.2,
          dashArray: null 
        });

        if (f.redraw) f.redraw();
      }
    });
  }

  // --- ILLUMINATION JAUNE ---
  function highlightField(field) {
    field.options.color = '#FFFF00'; 
    field.setStyle({ 
      color: '#FFFF00',
      weight: 12, 
      opacity: 1, 
      fillColor: '#FFFF00',
      fillOpacity: 0.4
    });
    if (field.bringToFront) field.bringToFront();
  }

  // --- CALCUL AU CLIC (AVEC ILLUMINATION PERSISTANTE) ---
  function calculateAtPoint(ev) {
    // On éteint les anciens fields avant d'allumer les nouveaux
    resetStyles(currentHitFields);
    currentHitFields = [];

    var point = ev.layerPoint;
    var res = 0, enl = 0;

    for (var guid in window.fields) {
      var field = window.fields[guid];
      var rings = field._rings ? field._rings[0] : [];
      if (!rings.length && field._latlngs) {
        for (var i = 0; i < field._latlngs.length; i++) {
          rings.push(window.map.latLngToLayerPoint(field._latlngs[i]));
        }
      }
      if (window.pnpoly(rings, point)) {
        currentHitFields.push(field);
        highlightField(field);
        
        if (field.options.team === window.TEAM_ENL) enl++;
        else if (field.options.team === window.TEAM_RES) res++;
      }
    }
    
    tooltip.innerHTML = "🔵 Res: " + res + " | 🟢 Enl: " + enl + " <span style='color:#ffce00; cursor:pointer; margin-left:5px; border:1px solid #ffce00; padding:0 3px;'>X</span>";
    
    // Ajout d'un clic sur le "X" de la bulle pour éteindre le jaune
    tooltip.querySelector('span').onclick = function(e) {
        e.stopPropagation();
        resetStyles(currentHitFields);
        currentHitFields = [];
        tooltip.innerHTML = "Cliquez sur la carte";
    };
  }

  // --- SCAN ÉCRAN (AVEC ILLUMINATION PERSISTANTE) ---
  layerCount.countAndHighlightVisible = function() {
    var bounds = window.map.getBounds();
    var res = 0, enl = 0;
    var visibleFields = [];

    for (var guid in window.fields) {
      var field = window.fields[guid];
      var isVisible = false;
      var locs = field.getLatLngs();
      for (var i = 0; i < locs.length; i++) {
        if (bounds.contains(locs[i])) { isVisible = true; break; }
      }

      if (isVisible) {
        visibleFields.push(field);
        highlightField(field);
        if (field.options.team === window.TEAM_ENL) enl++;
        else if (field.options.team === window.TEAM_RES) res++;
      }
    }

    var html = '<div style="padding: 15px; text-align: center; background: #222; color: #fff;">' +
               '<b style="color:#00bcff; font-size:1.1em;">🔵 Résistance :</b> ' + res + '<br>' +
               '<b style="color:#03fe03; font-size:1.1em;">🟢 Éclairés :</b> ' + enl + '<hr>' +
               '<b style="font-size:1.3em;">Total : ' + (res + enl) + '</b></div>';

    window.dialog({ 
        title: 'Analyse Zone', 
        html: html, 
        width: '250px',
        closeCallback: function() { resetStyles(visibleFields); }
    });
  };

  // --- INTERFACE ---
  function setup() {
    $('<style>').prop('type', 'text/css').html('\
      .leaflet-control-layer-count a { background-image: url("https://iitc.app/extras/plugin-icons/layer-count.svg"); background-size: 22px; background-repeat: no-repeat; background-position: center; }\
      .leaflet-control-layer-visible a { background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGV5ZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjxwYXRoIGQ9Ik0xIDExczQtNyAxMS03IDExIDcgMTEgNy00IDctMTEgNy0xMS03LTExLTd6Ii8+PC9zdmc+"); background-size: 20px; background-repeat: no-repeat; background-position: center; }\
      .active-btn { background-color: #ffce00 !important; }\
      .lcount-tooltip { background: rgba(0,0,0,0.9); color: #fff; padding: 5px 10px; position: absolute; left: 45px; top: 5px; border-radius: 4px; display: none; white-space: nowrap; border: 1px solid #ffce00; z-index: 9999; }\
    ').appendTo('head');

    var LCount = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function (map) {
        var container = document.createElement('div'); container.className = 'leaflet-control-layer-count leaflet-bar';
        var a = document.createElement('a'); a.title = 'Compter couches (clic)';
        tooltip = document.createElement('div'); tooltip.className = 'lcount-tooltip';
        tooltip.textContent = 'Cliquez sur la carte';
        a.appendChild(tooltip);
        a.addEventListener('click', function(e) {
          e.preventDefault();
          if (this.classList.toggle('active-btn')) { 
              map.on('click', calculateAtPoint); 
              tooltip.style.display = 'block'; 
          } else { 
              map.off('click', calculateAtPoint); 
              tooltip.style.display = 'none'; 
              resetStyles(currentHitFields);
              currentHitFields = [];
          }
        });
        container.appendChild(a); return container;
      }
    });

    var LVisible = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function (map) {
        var container = document.createElement('div'); container.className = 'leaflet-control-layer-visible leaflet-bar';
        var a = document.createElement('a'); a.title = 'Scanner zone visible';
        a.addEventListener('click', function(e) { e.preventDefault(); layerCount.countAndHighlightVisible(); });
        container.appendChild(a); return container;
      }
    });

    window.map.addControl(new LCount());
    window.map.addControl(new LVisible());
  }

  setup.info = plugin_info;
  if(!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  if(window.iitcLoaded) setup();
}

var script = document.createElement('script');
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify({})+');'));
(document.body || document.head || document.documentElement).appendChild(script);
