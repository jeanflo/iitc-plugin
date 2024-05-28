// ==UserScript==
// @id          ingress-plugin-011842-portalfinder
// @name        PortalFinder: Crowd Sourced Portal Finder for PortalMapBot
// @version     1.0.14
// @namespace   https://011842.xyz
// @updateURL   https://github.com/jeanflo/iitc-plugin/blob/main/Ingressportalbot.user.js
// @downloadURL https://github.com/jeanflo/iitc-plugin/blob/main/Ingressportalbot.user.js
// @description PortalMapBots Crowd Sourced Portal Finder for Intel, Mission Author and OPR. Also adds a handy Copy Telegram Link button
// @match       *://*.ingress.com/intel*
// @match       *://*.ingress.com/mission/*
// @match       *://mission-author-dot-betaspike.appspot.com/*
// @match       *://intel.ingress.com/*
// @match       *://opr.ingress.com/*
// @grant       none
// @run-at      document-start
// ==/UserScript==

/*jshint esversion: 6, loopfunc: true*/
(function (version) {
    'use strict';

    var seenGuids = new Set();
    var seenShortGuids = new Set();
    var portals = [];
    var inFlight = false;
    var timerStarted = false;

    var sendData = function (data) {
        fetch('https://011842.xyz/push?v=' + version, {
            method: 'POST',
            mode: 'cors',
            body: data,
            headers: new Headers({'Content-Type': 'application/json'})
        }).then(function (response) {
            if (!response.ok) {
                if (response.status >= 400 && response.status <= 499) {
                    console.error("portalfinder: 4xx error, not retrying", response);
                } else {
                    console.warn("portalfinder: server error, retrying in 10 seconds", error);
                    window.setTimeout(function () {
                        sendData(data);
                    }, 10000);
                }
            } else {
                inFlight = false;
                checkSend();
            }
        }).catch(function (error) {
            console.warn("portalfinder: network error, retrying in 10 seconds", error);
            window.setTimeout(function () {
                sendData(data);
            }, 10000);
        });
    };

    var checkSend = function () {
        if (timerStarted || inFlight) {
            return;
        }

        if (Object.keys(portals).length !== 0) {
            timerStarted = true;
            window.setTimeout(function () {
                timerStarted = false;
                inFlight = true;
                sendData(JSON.stringify(portals));
                portals = [];
            }, 3000);
        }
    };

    var cleanSeenSet = function () {
        // If we've seen this many portals, free up a bit of memory
        if (seenGuids.size > 5000) {
            seenGuids.clear();
        }
        if (seenShortGuids.size > 5000) {
            seenShortGuids.clear();
        }
    };

    var safeTrim = function (str) {
        if (typeof str === 'string') {
            return str.trim();
        } else {
            return str;
        }
    };

    var MAPortal = function (maPortal) {
        return [
            maPortal.guid,
            Math.round(maPortal.location.latitude * 1E6),
            Math.round(maPortal.location.longitude * 1E6),
            maPortal.title,
            safeTrim(maPortal.imageUrl)
        ];
    };

    var OPRPortal = function (oprPortal) {
        return [
            oprPortal.guid,
            Math.round(oprPortal.lat * 1E6),
            Math.round(oprPortal.lng * 1E6),
            oprPortal.title,
            safeTrim(oprPortal.imageUrl)
        ];
    };

    var IPortal = function (guid, ent) {
        return [
            guid,
            ent[2], // latE6
            ent[3], // lngE6
            ent[8], // title
            safeTrim(ent[7]) // image
        ];
    };

    var IPortalShort = function (guid, latE6, lngE6) {
        return [
            guid,
            latE6,
            lngE6
        ];
    };

    var addShortPortal = function (guid, latE6, lngE6) {
        if (!seenGuids.has(guid) && !seenShortGuids.has(guid)) {
            cleanSeenSet();
            seenShortGuids.add(guid);
            portals.push(new IPortalShort(guid, latE6, lngE6));
        }
    };

    var ingressMethodRegex = /^(?:(?:https?:)?\/\/(?:www\.|intel\.)?ingress\.com)?\/r\/(getPortalDetails|getEntities)$/i;
    var missionAuthorMethodRegex = /^(?:(?:https?:)?\/\/mission-author-dot-betaspike\.appspot\.com)?\/api\/author\/(getClusters|getClusterDetails|searchPOIs)$/i;
    var oprMethodRegex = /^(?:(?:https?:)?\/\/opr\.ingress.com)?\/api\/v1\/vault\/review$/i;
    (function (open) {
        XMLHttpRequest.prototype.open = function () {
            if (window.disable_portalfinder) {
                // Testing override
                open.apply(this, arguments);
                return;
            }

            var apiFunc, match;
            if ((match = arguments[1].match(ingressMethodRegex)) !== null) {
                apiFunc = match[1];
                var getPortalDetailsGuid;
                if (apiFunc === 'getPortalDetails') {
                    var origSend = this.send;
                    this.send = function () {
                        getPortalDetailsGuid = JSON.parse(arguments[0]).guid;
                        origSend.apply(this, arguments);
                    };
                }
                this.addEventListener("readystatechange", function () {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            if ((this.responseText === '{}') || (this.responseText.startsWith('<!DOCTYPE html>'))) {
                                return;
                            }

                            var data;
                            switch (apiFunc) {
                                case 'getPortalDetails':
                                    var guid = getPortalDetailsGuid;
                                    if (!seenGuids.has(guid)) {
                                        cleanSeenSet();
                                        seenGuids.add(guid);
                                        data = JSON.parse(this.responseText);
                                        if (data.result === undefined) {
                                            return;
                                        }
                                        portals.push(new IPortal(guid, data.result));
                                    }
                                    break;
                                case 'getEntities':
                                    data = JSON.parse(this.responseText);
                                    if ((data.result === undefined) || (data.result.map === undefined)) {
                                        return;
                                    }

                                    for (var tile in data.result.map) {
                                        if (data.result.map.hasOwnProperty(tile)) {
                                            if (data.result.map[tile].gameEntities === undefined) {
                                                continue;
                                            }

                                            data.result.map[tile].gameEntities.forEach(function (ent) {
                                                switch (ent[2][0]) { // Entity type
                                                    case 'p': // Portal
                                                        var guid = ent[0];
                                                        if (!seenGuids.has(guid)) {
                                                            cleanSeenSet();
                                                            seenGuids.add(guid);
                                                            portals.push(new IPortal(guid, ent[2]));
                                                        }
                                                        break;
                                                    case 'e': // Link
                                                        addShortPortal(ent[2][2], ent[2][3], ent[2][4]);
                                                        addShortPortal(ent[2][5], ent[2][6], ent[2][7]);
                                                        break;
                                                    case 'r': // Field
                                                        addShortPortal(ent[2][2][0][0], ent[2][2][0][1], ent[2][2][0][2]);
                                                        addShortPortal(ent[2][2][1][0], ent[2][2][1][1], ent[2][2][1][2]);
                                                        addShortPortal(ent[2][2][2][0], ent[2][2][2][1], ent[2][2][2][2]);
                                                        break;
                                                }
                                            });
                                        }
                                    }
                                    break;
                                default:
                                    return;
                            }
                            checkSend();
                        } catch (e) {
                            console.error("portalfinder: Caught error in Intel XHR hook", apiFunc, e, this.responseText);
                        }
                    }
                }, false);
            } else if ((match = arguments[1].match(missionAuthorMethodRegex)) !== null) {
                apiFunc = match[1];
                this.addEventListener("readystatechange", function () {
                    var data;
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            if ((this.responseText === '{}') || (this.responseText.startsWith('<!DOCTYPE html>'))) {
                                return;
                            }

                            // noinspection FallThroughInSwitchStatementJS
                            switch (apiFunc) {
                                case 'getClusters':
                                    data = JSON.parse(this.responseText);
                                    if (data && data.clusters) {
                                        data.clusters.forEach(function (cluster) {
                                            if (cluster.the_only_poi && cluster.the_only_poi.type === 'PORTAL') {
                                                var guid = cluster.the_only_poi.guid;
                                                if (!seenGuids.has(guid)) {
                                                    cleanSeenSet();
                                                    seenGuids.add(guid);
                                                    portals.push(new MAPortal(cluster.the_only_poi));
                                                }
                                            }
                                        });
                                    }
                                    break;
                                case 'getClusterDetails':
                                /* falls through */
                                case 'searchPOIs':
                                    data = JSON.parse(this.responseText);
                                    if (data && data.pois) {
                                        data.pois.forEach(function (poi) {
                                            if (poi.type === 'PORTAL') {
                                                var guid = poi.guid;
                                                if (!seenGuids.has(guid)) {
                                                    cleanSeenSet();
                                                    seenGuids.add(guid);
                                                    portals.push(new MAPortal(poi));
                                                }
                                            }
                                        });
                                    }
                                    break;
                            }
                            checkSend();
                        } catch (e) {
                            console.error("portalfinder: Caught error in Mission Author XHR hook", apiFunc, e, this.responseText);
                        }
                    }
                }, false);
            } else if (arguments[1].match(oprMethodRegex) && arguments[0] === 'GET') {
                this.addEventListener('readystatechange', function () {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            if ((this.responseText === '{}') || (this.responseText.startsWith('<!DOCTYPE html>'))) {
                                return;
                            }

                            var data = JSON.parse(this.responseText);
                            if (data.result === null) {
                                // No portals to review
                                console.debug('portalfinder: No portals to review');
                                return;
                            }

                            if ((data.result.nearbyPortals === undefined) || (data.result.nearbyPortals === null)) {
                                return;
                            }

                            data.result.nearbyPortals.forEach(function (portal) {
                                portals.push(new OPRPortal(portal));
                            });

                            // No point waiting before sending, we aren't going to get any more data
                            if (Object.keys(portals).length !== 0) {
                                sendData(JSON.stringify(portals));
                                portals = [];
                            }
                        } catch (e) {
                            console.error("portalfinder: Caught error in OPR XHR hook", e, this.responseText);
                        }
                    }
                }, false);
            }

            open.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open);

    // TG Links
    var tgLinks = (function () {
        var normalText = 'TG Link';
        var clickedText = 'TG Copied';
        var delay = 1000;

        var copyLink = function (guid) {
            var textArea = document.createElement('textarea');
            textArea.value = '@Ingressportalbot ' + guid;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                $('#portalfinder-tg-links').html(clickedText);
                setTimeout(function () {
                    $('#portalfinder-tg-links').html(normalText);
                }, delay);
            } catch (err) {
                console.log('TGLinks was unable to copy');
            }
            document.body.removeChild(textArea);
        };
        var addTgLink = function (data) {
            $('.linkdetails').append(
                $('<aside>').append(
                    $('<div>').append(
                        $('<a>').attr({
                            id: 'portalfinder-tg-links',
                            title: 'Copy a Telegram link to the clipboard'
                        }).text(normalText).click(function () {
                            copyLink(window.selectedPortal);
                        })
                    )
                )
            );
        };

        var setup = function () {
            addHook('portalDetailsUpdated', addTgLink);
        };
        setup.info = {script: {name: 'PortalMapBot Crowd Sourced Portal Finder', version: version}};
        if (!window.bootPlugins) window.bootPlugins = [];
        window.bootPlugins.push(setup);
        // if IITC has already booted, immediately run the 'setup' function
        if (window.iitcLoaded && typeof setup === 'function') setup();
    });

    if (/^https?:\/\/(www\.|intel\.)?ingress\.com\//i.test(window.location.href)) {
        // We're in Intel, setup TG Links IITC Plugin
        tgLinks();
    }
})(GM_info.script.version);
