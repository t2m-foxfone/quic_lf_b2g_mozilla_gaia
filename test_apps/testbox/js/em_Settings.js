/**
 * Created by tclxa on 3/31/14.
 */
'use strict';

$('menuItem-setting').addEventListener('click', function() {
	emSettings.init();
});
var _mobileConnections;
var _mobileConnection;
var _settings;
var _self;

var NETWORK_GSM_MAP = {
	'wcdma/gsm': 'operator-networkType-preferWCDMA',
	'gsm': 'operator-networkType-GSM',
	'wcdma': 'operator-networkType-WCDMA',
	'wcdma/gsm-auto': 'operator-networkType-auto-gsmcdma'
};

var NETWORK_CDMA_MAP = {
	'cdma/evdo': 'operator-networkType-auto-evdocdma',
	'cdma': 'operator-networkType-CDMA',
	'evdo': 'operator-networkType-EVDO'
};

var NETWORK_DUALSTACK_MAP = {
	'wcdma/gsm': 'operator-networkType-preferWCDMA',
	'gsm': 'operator-networkType-GSM',
	'wcdma': 'operator-networkType-WCDMA',
	'wcdma/gsm-auto': 'operator-networkType-auto-gsmcdma',
	'cdma/evdo':'operator-networkType-auto-evdocdma',
	'cdma':'operator-networkType-CDMA',
	'evdo': 'operator-networkType-EVDO',
	'wcdma/gsm/cdma/evdo': 'operator-networkType-auto-globe'
};

var emSettings = {

  init: function init() {
	  _self = this;
	  _self.addListeners();

	  _mobileConnections = window.navigator.mozMobileConnections;
	  _settings = window.navigator.mozSettings;

	  _mobileConnection = _mobileConnections[
		  DsdsSettings.getIccCardIndexForCellAndDataSettings()
		  ];
	  _self.UpdateCallwaitingStates();
	  _self.UndateAutoswerStates();
  },

	addListeners: function addListeners() {
		window.addEventListener('change', _self.handleEvent);

		$('network-select').addEventListener('change', _self.selectNetwork.bind(_self), false);
		$('menuItem-networkSelect').onclick = function() {
			getSupportedNetworkInfo(_mobileConnection, function(result) {
				if (result.networkTypes) {
					_self.updateNetworkTypeSelector(result.networkTypes,
						result.gsm,
						result.cdma);
				}
			});
		};
	},

	UpdateCallwaitingStates: function UpdateCallwaitingStates() {
		var getCWEnabled = _mobileConnection.getCallWaitingOption();
		getCWEnabled.onsuccess = function cs_getCWEnabledSuccess() {
			var enabled = getCWEnabled.result;
			//input.checked = enabled;
			if (enabled) {
				$('callWaiting-input').checked = true;
			}
			else {
				$('callWaiting-input').checked = false;
			}
			if (callback) {
				callback(null);
			}
		};
	},
	UndateAutoswerStates: function UndateAutoswerStates() {
		var jrd = navigator.jrdExtension;
		if (jrd) {
			var value = jrd.readRoValue('persist.sys.tel.autoanswer.ms');
			if ('0' == value || '' == value) {
				$('autoAnswer-input').checked = false;
			}
			else {
				$('autoAnswer-input').checked = true;
			}
		}
	},
	updateNetworkTypeSelector: function updateNetworkTypeSelector(networkTypes, gsm, cdma) {
    dump('testbox-em_Settings : gsm = ' + gsm + '  cdma = ' + cdma + '\n');
    var request = _mobileConnection.getPreferredNetworkType();
    request.onsuccess = function onSuccessHandler() {
      var networkType = request.result;
      dump('testbox-em_Settings :  networkType ' + networkType + '\n');
      if (networkType) {
        var selector = $('network-select');
        // Clean up all option before updating again.
        while (selector.hasChildNodes()) {
          selector.removeChild(selector.lastChild);
        }
        networkTypes.forEach(function(type) {
          dump('testbox-em_Settings : networkTypes ' + type);
          var option = document.createElement('option');
          option.value = type;
          option.selected = (networkType === type);
          // show user friendly network mode names
          if (gsm && cdma) {
            if (type in NETWORK_DUALSTACK_MAP) {
              localize(option, NETWORK_DUALSTACK_MAP[type]);
            }
          } else if (gsm) {
            if (type in NETWORK_GSM_MAP) {
              localize(option, NETWORK_GSM_MAP[type]);
            }
          } else if (cdma) {
            if (type in NETWORK_CDMA_MAP) {
              localize(option, NETWORK_CDMA_MAP[type]);
            }
          } else { //failback only
            debug('testbox-em_Settings : ------type ' + type + '\n');
	          option.textContent = type;
          }
          selector.appendChild(option);
        });
      } else {
       console.warn('carrier: could not retrieve network type');
      }
    };
    request.onerror = function onErrorHandler() {
      console.warn('carrier: could not retrieve network type');
    };
  },

	selectNetwork: function selectNetwork(evt) {

    var type = evt.value;
    var networkIndex = $('network-select').selectedIndex;
    var networkType = $('network-select').options[networkIndex].value;

    _mobileConnection = _mobileConnections[
      DsdsSettings.getIccCardIndexForCellAndDataSettings()
      ];

    var request = _mobileConnection.setPreferredNetworkType(networkType);
      request.onsuccess = function() {

        getSupportedNetworkInfo(_mobileConnection, function(result) {

          for (var s in result) {
            dump('testbox-em_Settings : s = ' + s);
          }
        });
      };
    request.onerror = function onErrorHandler() {
      debug('preferredNetworkTypeAlertErrorMessage');
    };
  },

	handleEvent: function handleEvent(evt) {
    var input = evt.target;
    var type = input.type;
    var id = input.id;
    var key = input.name;
    var value;

    switch (id) {
      case 'callForwarding-input':
        value = input.checked;
        break;

      case 'autoAnswer-input':
        value = input.checked;
         if (value) {
         var autoCommand = 'setprop persist.sys.tel.autoanswer.ms 3000';
         } else {
         var autoCommand = 'setprop persist.sys.tel.autoanswer.ms 0';
         }
        if (navigator.jrdExtension) {
          var jrd = navigator.jrdExtension;
          var initRequest = jrd.startUniversalCommand(autoCommand, true);
	        initRequest.onsuccess = function() {
		        if (value)
		          alert('Auto Answer Opened!\nTime is: 3S');
		        else
			        alert('Auto Answer Closed!\nWaiting for your Answer!');
	        };
        }
        break;

      default:
        break;
    }

    if (!key || !_settings || evt.type != 'change')
      return;
    debug('testbox-em_Settings : key ' + key);
    var cset = {};
    cset[key] = value;
		_settings.createLock().set(cset);
  }
};



