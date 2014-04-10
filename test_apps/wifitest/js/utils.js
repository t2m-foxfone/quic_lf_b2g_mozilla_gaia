/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Constants
 */
var DEBUG = false;

/**
 * Debug method
 */
function debug(msg, optObject) {
  if (DEBUG) {
    var output = '[DEBUG # Settings] ' + msg;
    if (optObject) {
      output += JSON.stringify(optObject);
    }
    console.log(output);
  }
}

/**
 * Move settings to foreground
 */
function reopenSettings() {
  navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
    var app = evt.target.result;
    app.launch('settings');
  };
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

/**
 * These so-called "dialog boxes" are just standard Settings panels (<section
 * role="region" />) with reset/submit buttons: these buttons both return to the
 * previous panel when clicked, and each button has its own (optional) callback.
 */

function openDialog(dialogID, onSubmit, onReset) {
  if ('#' + dialogID == document.location.hash)
    return;

  var origin = document.location.hash;
  var dialog = document.getElementById(dialogID);

  var submit = dialog.querySelector('[type=submit]');
  if (submit) {
    submit.onclick = function onsubmit() {
      if (onSubmit)
        (onSubmit.bind(dialog))();
      document.location.hash = origin; // hide dialog box
    };
  }

  var reset = dialog.querySelector('[type=reset]');
  if (reset) {
    reset.onclick = function onreset() {
      if (onReset)
        (onReset.bind(dialog))();
      document.location.hash = origin; // hide dialog box
    };
  }

  document.location.hash = dialogID; // show dialog box
}

/**
 * Connectivity accessors
 */

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
