/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// display connectivity status on the main panel
var Connectivity = (function(window, document, undefined) {
  var _initialized = false;
  var _ = navigator.mozL10n.get;

  // in util.js, we fake these device interfaces if they are not exist.
  var wifiManager = getWifiManager();


  // XXX if wifiManager implements addEventListener function
  // we can remove these listener lists.
  var wifiEnabledListeners = [updateWifi];
  var wifiDisabledListeners = [updateWifi];
  var wifiStatusChangeListeners = [updateWifi];
  var settings = Settings.mozSettings;

  //
  // Set wifi.enabled so that it mirrors the state of the hardware.
  // wifi.enabled is not an ordinary user setting because the system
  // turns it on and off when wifi goes up and down.
  //
  settings.createLock().set({'wifi.enabled': wifiManager.enabled});

  //
  // Now register callbacks to track the state of the wifi hardware
  //
  wifiManager.onenabled = function() {
    dispatchEvent(new CustomEvent('wifi-enabled'));
    wifiEnabled();
  };
  wifiManager.ondisabled = function() {
    dispatchEvent(new CustomEvent('wifi-disabled'));
    wifiDisabled();
  };
  wifiManager.onstatuschange = wifiStatusChange;


  // called when localization is done
  function init() {
    if (_initialized) {
      return;
    }
    _initialized = true;

    kCardState = {
      'pinRequired' : _('simCardLockedMsg'),
      'pukRequired' : _('simCardLockedMsg'),
      'networkLocked' : _('simLockedPhone'),
      'unknown' : _('unknownSimCardState'),
      'absent' : _('noSimCard'),
      'null' : _('simCardNotReady')
    };
    updateCallSettings();

    updateWifi();

    window.addEventListener('localized', function() {
      updateWifi();
    });
  }

  /**
   * Wifi Manager
   */

  function updateWifi() {
    if (!_initialized) {
      init();
      return; // init will call updateWifi()
    }
    // record the MAC address here because the "Device Information" panel
    // has to display it as well
    if (settings) {
      settings.createLock().set({ 'deviceinfo.mac': wifiManager.macAddress });
    }
  }

  function wifiEnabled() {
    // Keep the setting in sync with the hardware state.
    // We need to do this because b2g/dom/wifi/WifiWorker.js can turn
    // the hardware on and off
    settings.createLock().set({'wifi.enabled': true});
    wifiEnabledListeners.forEach(function(listener) { listener(); });
  }

  function wifiDisabled() {
    // Keep the setting in sync with the hardware state.
    settings.createLock().set({'wifi.enabled': false});
    wifiDisabledListeners.forEach(function(listener) { listener(); });
  }

  function wifiStatusChange(event) {
    wifiStatusChangeListeners.forEach(function(listener) { listener(event); });
  }

  /**
   * Mobile Connection Manager
   */

  var kCardState; // see init()
  var kDataType = {
    'lte' : '4G LTE',
    'ehrpd': 'CDMA',
    'hspa+': '3.5G HSPA+',
    'hsdpa': '3.5G HSDPA',
    'hsupa': '3.5G HSDPA',
    'hspa' : '3.5G HSDPA',
    'evdo0': '3G CDMA',
    'evdoa': '3G CDMA',
    'evdob': '3G CDMA',
    '1xrtt': '3G CDMA',
    'umts' : '3G UMTS',
    'edge' : '2G EDGE',
    'is95a': '2G CDMA',
    'is95b': '2G CDMA',
    'gprs' : '2G GPRS'
  };

  /**
   * Call Settings
   */

  function updateCallSettings() {
    if (!_initialized) {
      init();
      return; // init will call updateCallSettings()
    }

  }

  /**
   * Public API, in case a "Connectivity" sub-panel needs it
   */

  return {
    init: init,
    updateWifi: updateWifi,
    set wifiEnabled(listener) { wifiEnabledListeners.push(listener) },
    set wifiDisabled(listener) { wifiDisabledListeners.push(listener); },
    set wifiStatusChange(listener) { wifiStatusChangeListeners.push(listener); }
  };
})(this, document);


// starting when we get a chance
navigator.mozL10n.ready(function loadWhenIdle() {
  var idleObserver = {
    time: 3,
    onidle: function() {
      Connectivity.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
