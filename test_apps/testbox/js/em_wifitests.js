'use strict';
$('wifiavailablenetworks').addEventListener('click', function() {
	emwifitest.init();
});
var _;
var _self;
var settings;
var gWifiManager;
var gWifi;
var gCurrentNetwork;
// auto-scan networks when the Wi-Fi panel gets visible
var gScanPending = false;
var gWifiSectionVisible = false;
var countAverageButton;
var _initialized = false;
var emwifitest = {
	init: function init() {
		_self = this;
		_ = navigator.mozL10n.get;
		settings = window.navigator.mozSettings;

		if (!settings)
			return;

		gWifiManager = getWifiManager();
		gWifi = document.querySelector('#wifi-available-networks');
		countAverageButton = $('countAverage');
		gCurrentNetwork = gWifiManager.connection.network;

		_self.addedListeners();
		_self.updateNetworkState();
		gNetworkList.scan();
	},
	addedListeners: function addedListeners() {
		if(_initialized)
			return;
		document.addEventListener('mozvisibilitychange', _self.updateVisibilityStatus);
		gWifi.addEventListener('transitionend', function(evt) {
			if (evt.target == gWifi) {
				_self.updateVisibilityStatus();
			}
		});
		countAverageButton.addEventListener('click', function() {

			if ((!gNetworkList.countAverage) || (!gNetworkList.autoscan)){
			  gNetworkList.autoscan = true;
			  gNetworkList.scan();
			  countAverageButton.textContent = 'stop';
			}
			else {
				gNetworkList.autoscan = false;
				window.clearTimeout(gNetworkList.scanId);
				countAverageButton.textContent = 'start';
			}
			gNetworkList.countAverage = !gNetworkList.countAverage;
		});
		_initialized = true;
	},
	updateVisibilityStatus: function updateVisibilityStatus() {
		var computedStyle = window.getComputedStyle(gWifi);
		gWifiSectionVisible = (!document.mozHidden &&
			computedStyle.visibility != 'hidden');
		if (gWifiSectionVisible && !gScanPending) {
			//gNetworkList.scan();

			gScanPending = true;
			dump('here ?');
		}
	},
	// create a network list item
	newListItem: function newListItem(network, averageSignalStrength) {
		/**
		 * A Wi-Fi list item has the following HTML structure:
		 *   <li>
		 *     <small> Network Security </small>
		 *     <a [class="wifi-secure"]> Network SSID </a>
		 *   </li>
		 */
		var ssid = document.createElement('a');
		ssid.textContent = network.ssid;

		var div = document.createElement('div');
		div.className = 'wifiAvailableNetWorks';
		if (!averageSignalStrength)
			div.textContent = 'strength:' + network.signalStrength + 'dbm';
		else
			div.textContent = 'strength:' + averageSignalStrength + 'dbm';

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
	},

// create an explanatory list item
	newExplanationItem: function newExplanationItem(message) {
		var li = document.createElement('li');
		li.className = 'explanation';
		li.textContent = _(message);
		return li;
	},

	isConnected: function isConnected(network) {
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
	},

// update network state, called only when wifi enabled.
	updateNetworkState: function updateNetworkState() {
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
	},

	setMozSettingsEnabled: function setMozSettingsEnabled(value) {
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
};
var gNetworkList = {
	scanning: false,
	autoscan: true,
	scanRate: 1000, // 5s after last scan results
	index: [],     // index of all scanned networks
	test: [],      // test of all scanned networks
	scanId: null,
	list: null,
	infoItem: null,
	countAverage: true,
	init: function init() {
//		gNetworkList.scanning = false,
//		gNetworkList.autoscan = true,
//		gNetworkList.scanId = null,
//		gNetworkList.countAverage = true,

		gNetworkList.list = $('wifi-availableNetworks-test');
		gNetworkList.infoItem = gNetworkList.list.querySelector('li[data-state="on"]');
	},
	scan: function scan() {
		gNetworkList.init();
		if (gNetworkList.scanning)
			return;

		// stop auto-scanning if wifi disabled or the app is hidden
		if (!gWifiManager.enabled || document.mozHidden) {
			gNetworkList.scanning = false;
			return;
		}
		gNetworkList.scanning = true;
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
			gNetworkList.clear(false);

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
					if (gNetworkList.countAverage) {
						if (gNetworkList.test[networkKeys[i]])
						{
							gNetworkList.test[networkKeys[i]].signalStrength =
								parseInt(gNetworkList.test[networkKeys[i]].signalStrength)
									+ parseInt(network.signalStrength);
							gNetworkList.test[networkKeys[i]].count += 1;
						}
						else {
							var tempnetwork = {};
							tempnetwork.ssid = network.ssid;
							tempnetwork.capabilities = network.capabilities;
							tempnetwork.bssid = network.bssid;
							tempnetwork.signalStrength = network.signalStrength;
							tempnetwork.relSignalStrength = network.relSignalStrength;
							tempnetwork.count = 1;
							gNetworkList.test[networkKeys[i]] = tempnetwork;
							// add composited key to test
						}
					}
					if (!countAverage && !autoscan) {
						var listItem = _self.newListItem(network,
							Math.round(gNetworkList.test[networkKeys[i]].signalStrength
								/ gNetworkList.test[networkKeys[i]].count));
					}else {
						var listItem = _self.newListItem(network, null);
					}

					var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);

					if (_self.isConnected(network)) {
						listItem.classList.add('active');
						listItem.querySelector('small').textContent =
							_('shortStatus-connected');
						gNetworkList.list.insertBefore(listItem, gNetworkList.infoItem.nextSibling);
					} else {
						gNetworkList.list.insertBefore(listItem, gNetworkList.infoItem);
					}
					gNetworkList.index[networkKeys[i]] = listItem; // add composited key to index
				}

			} else {
				// display a "no networks found" message if necessary
				gNetworkList.list.insertBefore(emwifitest.newExplanationItem('noNetworksFound'),
					gNetworkList.infoItem);
			}
			// display the "Search Again" button
			gNetworkList.list.dataset.state = 'ready';
			// auto-rescan if requested
			if (gNetworkList.autoscan) {
				gNetworkList.scanId = window.setTimeout(function() {
						gNetworkList.scan();
					},
					gNetworkList.scanRate);
			}
			gNetworkList.scanning = false;
		};

		req.onerror = function onScanError(error) {
			// always try again.
			gNetworkList.scanning = false;
			window.setTimeout(function() {
					gNetworkList.scan();
				},
				gNetworkList.scanRate);
		};
	},
	clear: function clear(addScanningItem) {
		this.index = [];
		// remove all items except the text expl. and the "search again" button
		var wifiItems = this.list.querySelectorAll('li:not([data-state])');
		var len = wifiItems.length;
		for (var i = len - 1; i >= 0; i--) {
			this.list.removeChild(wifiItems[i]);
		}

		this.list.dataset.state = addScanningItem ? 'on' : 'off';
	},
	display: function display(network, message) {
		var key = network.ssid + '+' + network.capabilities.join('+');
		var listItem = this.index[key];
		var active = this.list.querySelector('.active');
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
};
