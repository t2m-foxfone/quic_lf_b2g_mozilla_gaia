'use strict';
function debug(msg) {
	if (DEBUG)
		dump('lx:-*-* engineer-mode-*-* ' + msg + '\n');
}
function $(id) {
	return document.getElementById(id);
}
/**
 * Open a link with a web activity
 */

function openLink(url) {
  if (url.startsWith('tel:')) { // dial a phone number
    new MozActivity({
      name: 'dial',
      data: { type: 'webtelephony/number', number: url.substr(4) }
    });
  } else if (!url.startsWith('#')) { // browse a URL
    new MozActivity({
      name: 'view',
      data: { type: 'url', url: url }
    });
  }
}
var DEBUG = true;
var localize = navigator.mozL10n.localize;

function getSupportedNetworkInfo(mobileConneciton, callback) {

  var types = [
    'wcdma/gsm',
    'gsm',
    'wcdma',
    'wcdma/gsm-auto',
    'cdma/evdo',
    'cdma',
    'evdo',
    'wcdma/gsm/cdma/evdo'
  ];
   console.log('lx:mobileConneciton ' + mobileConneciton + '\n');
  if (!mobileConneciton)
    return;

  var _hwSupportedTypes = mobileConneciton.supportedNetworkTypes;
  debug('lx: _hwSupportedTypes ' + _hwSupportedTypes);
  var _result = {
    gsm: _hwSupportedTypes.indexOf('gsm') !== -1,
    cdma: _hwSupportedTypes.indexOf('cdma') !== -1,
    wcdma: _hwSupportedTypes.indexOf('wcdma') !== -1,
    evdo: _hwSupportedTypes.indexOf('evdo') !== -1,
    networkTypes: null
};

  var _networkTypes = [];
  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    var subtypes = type.split('/');
    var allSubTypesSupported = true;

    for (var j = 0; j < subtypes.length; j++) {
      debug('subtypes ' + subtypes);
      debug('subtypes[j]  ' + subtypes[j] + ' ----index  ' + subtypes[j].split('-')[0]);
      allSubTypesSupported =
        allSubTypesSupported && _result[subtypes[j].split('-')[0]];
      debug('lx: -----> ' + _result[subtypes[j].split('-')[0]] + '\n');
    }
    if (allSubTypesSupported)
      _networkTypes.push(type);
  }
  if (_networkTypes.length !== 0) {
    _result.networkTypes = _networkTypes;
  }
  callback(_result);
}
// create a fake mozWifiManager if required (e.g. desktop browser)
var getWifiManager = function() {
  var navigator = window.navigator;
  if ('mozWifiManager' in navigator)
    return navigator.mozWifiManager;

  /**
   * fake network list, where each network object looks like:
   * {
   *   ssid              : SSID string (human-readable name)
   *   bssid             : network identifier string
   *   capabilities      : array of strings (supported authentication methods)
   *   relSignalStrength : 0-100 signal level (integer)
   *   connected         : boolean state
   * }
   */

  var fakeNetworks = {
    'Mozilla-G': {
      ssid: 'Mozilla-G',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA-EAP'],
      relSignalStrength: 67,
      connected: false
    },
    'Livebox 6752': {
      ssid: 'Livebox 6752',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WEP'],
      relSignalStrength: 32,
      connected: false
    },
    'Mozilla Guest': {
      ssid: 'Mozilla Guest',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: [],
      relSignalStrength: 98,
      connected: false
    },
    'Freebox 8953': {
      ssid: 'Freebox 8953',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA2-PSK'],
      relSignalStrength: 89,
      connected: false
    }
  };

  function getFakeNetworks() {
    var request = { result: fakeNetworks };

    setTimeout(function() {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 1000);

    return request;
  }

  return {
    // true if the wifi is enabled
    enabled: false,
    macAddress: 'xx:xx:xx:xx:xx:xx',

    // enables/disables the wifi
    setEnabled: function fakeSetEnabled(bool) {
      var self = this;
      var request = { result: bool };

      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
        if (bool) {
          self.onenabled();
        } else {
          self.ondisabled();
        }
      });

      self.enabled = bool;
      return request;
    },

    // returns a list of visible/known networks
    getNetworks: getFakeNetworks,
    getKnownNetworks: getFakeNetworks,

    // selects a network
    associate: function fakeAssociate(network) {
      var self = this;
      var connection = { result: network };
      var networkEvent = { network: network };

      setTimeout(function fakeConnecting() {
        self.connection.network = network;
        self.connection.status = 'connecting';
        self.onstatuschange(networkEvent);
      }, 0);

      setTimeout(function fakeAssociated() {
        self.connection.network = network;
        self.connection.status = 'associated';
        self.onstatuschange(networkEvent);
      }, 1000);

      setTimeout(function fakeConnected() {
        network.connected = true;
        self.connected = network;
        self.connection.network = network;
        self.connection.status = 'connected';
        self.onstatuschange(networkEvent);
      }, 2000);

      return connection;
    },

    // forgets a network (disconnect)
    forget: function fakeForget(network) {
      var self = this;
      var networkEvent = { network: network };

      setTimeout(function() {
        network.connected = false;
        self.connected = null;
        self.connection.network = null;
        self.connection.status = 'disconnected';
        self.onstatuschange(networkEvent);
      }, 0);
    },

    // event listeners
    onenabled: function(event) {},
    ondisabled: function(event) {},
    onstatuschange: function(event) {},

    // returns a network object for the currently connected network (if any)
    connected: null,

    connection: {
      status: 'disconnected',
      network: null
    }
  };
};
