/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle Wi-Fi settings
navigator.mozL10n.ready(function wifiSettings() {
    var _ = navigator.mozL10n.get;

    var settings = window.navigator.mozSettings;
    if (!settings)
        return;

    var gWifiManager = getWifiManager();
    var gWifi = document.querySelector('#root');

    var gCurrentNetwork = gWifiManager.connection.network;

    // auto-scan networks when the Wi-Fi panel gets visible
    var gScanPending = false;
    var gWifiSectionVisible = false;

    function updateVisibilityStatus() {
        var computedStyle = window.getComputedStyle(gWifi);
        gWifiSectionVisible = (!document.mozHidden &&
            computedStyle.visibility != 'hidden');
        if (gWifiSectionVisible && gScanPending) {
            gNetworkList.scan();
            gScanPending = false;
        }
    }

    document.addEventListener('mozvisibilitychange', updateVisibilityStatus);
    gWifi.addEventListener('transitionend', function(evt) {
        if (evt.target == gWifi) {
            updateVisibilityStatus();
        }
    });

    // create a network list item
    function newListItem(network,averageSignalStrength) {
        /**
         * A Wi-Fi list item has the following HTML structure:
         *   <li>
         *     <small> Network Security </small>
         *     <a [class="wifi-secure"]> Network SSID </a>
         *   </li>
         */

        // ssid
        var ssid = document.createElement('a');
        ssid.textContent = network.ssid;

        var div = document.createElement('div');
        if(!averageSignalStrength)
            div.textContent = "strength:"+network.signalStrength+"dbm";
        else
            div.textContent = "strength:"+averageSignalStrength+"dbm";

        // supported authentication methods
        var small = document.createElement('small');
        var keys = network.capabilities;
        if (keys && keys.length) {
            small.textContent = _('securedBy', { capabilities: keys.join(', ') });
            small.textContent = keys.join(', ');
            ssid.className = 'wifi-secure wifi-secure-important';
        } else {
            small.textContent = _('securityOpen');
            small.dataset.l10nId = 'securityOpen';
        }

        // create list item
        var li = document.createElement('li');
        li.appendChild(div);
        li.appendChild(small);
        li.appendChild(ssid);

        return li;
    }

    // create an explanatory list item
    function newExplanationItem(message) {
        var li = document.createElement('li');
        li.className = 'explanation';
        li.textContent = _(message);
        return li;
    }

    // available network list
    var gNetworkList = (function networkList(list) {
        var scanning = false;
        var autoscan = true;
        var scanRate = 1000; // 5s after last scan results
        var index = [];      // index of all scanned networks
        var test = [];      // test of all scanned networks

        var countAverage = false;
        var scanId = null;
        // get the "Searching..." and "Search Again" items, respectively
        var infoItem = list.querySelector('li[data-state="on"]');
        var countAverageButton = document.getElementById('countAverage');
        countAverageButton.onclick = function() {
            countAverage = !countAverage;
            if(countAverage){
                countAverageButton.textContent="stop";
                if(!autoscan)
                {
                    autoscan = !autoscan;
                    scan();
                }
            }
            else{
                countAverageButton.textContent="start";
                autoscan = !autoscan;
                window.clearTimeout(scanId);
            }
        };
        // clear the network list
        function clear(addScanningItem) {
            index = [];
            // remove all items except the text expl. and the "search again" button
            var wifiItems = list.querySelectorAll('li:not([data-state])');
            var len = wifiItems.length;
            for (var i = len - 1; i >= 0; i--) {
                list.removeChild(wifiItems[i]);
            }

            list.dataset.state = addScanningItem ? 'on' : 'off';
        }

        // scan wifi networks and display them in the list
        function scan() {
            if (scanning)
                return;

            // stop auto-scanning if wifi disabled or the app is hidden
            if (!gWifiManager.enabled || document.mozHidden) {
                scanning = false;
                return;
            }
            scanning = true;
            var req = gWifiManager.getNetworks();

            req.onsuccess = function onScanSuccess() {
                var allNetworks = req.result;
                var networks = {};
                for (var i = 0; i < allNetworks.length; ++i) {
                    var network = allNetworks[i];
                    // use ssid + capabilities as a composited key
                    var key = network.ssid + '+' + network.capabilities.join('+');
                    // keep connected network first, or select the highest strength
                    if (!networks[key] || network.connected) {
                        networks[key] = network;
                    } else {
                        if (!networks[key].connected &&
                            network.relSignalStrength > networks[key].relSignalStrength)
                            networks[key] = network;
                    }
                }

                var networkKeys = Object.getOwnPropertyNames(networks);
                clear(false);

                // display network list
                if (networkKeys.length) {
                    // sort networks by signal strength
                    networkKeys.sort(function(a, b) {
                        return networks[b].relSignalStrength -
                            networks[a].relSignalStrength;
                    });

                    // add detected networks
                    for (var i = 0; i < networkKeys.length; i++) {
                        var network = networks[networkKeys[i]];
                        if(countAverage){
                            if(test[networkKeys[i]])
                            {
                                test[networkKeys[i]].signalStrength = parseInt(test[networkKeys[i]].signalStrength) + parseInt(network.signalStrength) ;
                                test[networkKeys[i]].count += 1;
                            }
                            else{
                                var tempnetwork={};
                                tempnetwork.ssid=network.ssid;
                                tempnetwork.capabilities=network.capabilities;
                                tempnetwork.bssid=network.bssid;
                                tempnetwork.signalStrength=network.signalStrength;
                                tempnetwork.relSignalStrength=network.relSignalStrength;
                                tempnetwork.count=1;
                                test[networkKeys[i]] = tempnetwork; // add composited key to test

                                //console.log("yangliang::"+networkKeys[i]);
                                //console.log("yangliang::"+test[networkKeys[i]].toString());
                                //console.log("yangliang::"+test[networkKeys[i]].ssid);
                                //console.log("yangliang::"+test[networkKeys[i]].capabilities);
                                //console.log("yangliang::"+test[networkKeys[i]].bssid);
                                //console.log("yangliang::"+test[networkKeys[i]].signalStrength);

                            }
                            console.log("yangliang::"+test[networkKeys[i]].signalStrength);
                            console.log("yangliang::"+test[networkKeys[i]].count);
                            console.log("yangliang::"+Math.round(test[networkKeys[i]].signalStrength/test[networkKeys[i]].count));
                        }
                        if(!countAverage&&!autoscan)
                            var listItem = newListItem(network, Math.round(test[networkKeys[i]].signalStrength/test[networkKeys[i]].count));
                        else
                            var listItem = newListItem(network, null);
                        // signal is between 0 and 100, level should be between 0 and 4
                        var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
                        //listItem.className = 'wifi-signal' + level;

                        // put connected network on top of list
                        if (isConnected(network)) {
                            listItem.classList.add('active');
                            listItem.querySelector('small').textContent =
                                _('shortStatus-connected');
                            list.insertBefore(listItem, infoItem.nextSibling);
                        } else {
                            list.insertBefore(listItem, infoItem);
                        }
                        index[networkKeys[i]] = listItem; // add composited key to index

                    }

                } else {
                    // display a "no networks found" message if necessary
                    list.insertBefore(newExplanationItem('noNetworksFound'), infoItem);
                }

                // display the "Search Again" button
                list.dataset.state = 'ready';
                // auto-rescan if requested
                if (autoscan) {
                    scanId = window.setTimeout(scan, scanRate);
                }
                scanning = false;
            };

            req.onerror = function onScanError(error) {
                // always try again.
                scanning = false;
                window.setTimeout(scan, scanRate);
            };
        }

        // display a message on the network item matching the ssid
        function display(network, message) {
            var key = network.ssid + '+' + network.capabilities.join('+');
            var listItem = index[key];
            var active = list.querySelector('.active');
            if (active && active != listItem) {
                active.classList.remove('active');
                active.querySelector('small').textContent =
                    _('shortStatus-disconnected');
            }
            if (listItem) {
                listItem.classList.add('active');
                listItem.querySelector('small').textContent = message;
            }
        }

        // API
        return {
            get autoscan() { return autoscan; },
            set autoscan(value) { autoscan = value; },
            display: display,
            clear: clear,
            scan: scan,
            get scanning() { return scanning; }
        };
    }) (document.getElementById('wifi-availableNetworks-test'));

     function isConnected(network) {
        /**
         * XXX the API should expose a 'connected' property on 'network',
         * and 'gWifiManager.connection.network' should be comparable to 'network'.
         * Until this is properly implemented, we just compare SSIDs to tell wether
         * the network is already connected or not.
         */
        var currentNetwork = gWifiManager.connection.network;
        if (!currentNetwork)
            return false;
        var key = network.ssid + '+' + network.capabilities.join('+');
        var curkey = currentNetwork.ssid + '+' +
            currentNetwork.capabilities.join('+');
        return (key == curkey);
    }

    // update network state, called only when wifi enabled.
    function updateNetworkState() {
        var networkStatus = gWifiManager.connection.status;

        // networkStatus has one of the following values:
        // connecting, associated, connected, connectingfailed, disconnected.

        if (networkStatus === 'connectingfailed' && gCurrentNetwork) {
            settings.createLock().set({'wifi.connect_via_settings': false});
            // connection has failed, probably an authentication issue...
            delete(gCurrentNetwork.password);
            gWifiManager.forget(gCurrentNetwork); // force a new authentication dialog
            gNetworkList.display(gCurrentNetwork,
                _('shortStatus-connectingfailed'));
            gCurrentNetwork = null;
        }

    }

    function setMozSettingsEnabled(value) {
        if (value) {
            /**
             * gWifiManager may not be ready (enabled) at this moment.
             * To be responsive, show 'initializing' status and 'search...' first.
             * A 'scan' would be called when gWifiManager is enabled.
             */
            gNetworkList.clear(true);

        } else {
            gNetworkList.clear(false);
            gNetworkList.autoscan = true;
        }
    }

    var lastMozSettingValue = true;
    setMozSettingsEnabled(lastMozSettingValue);
    if (lastMozSettingValue) {
        /**
         * At this moment, gWifiManager has probably been enabled.
         * This means it won't invoke any status changed callback function;
         * therefore, we have to get network list here.
         */
        updateNetworkState();
        gNetworkList.scan();
    }

});

