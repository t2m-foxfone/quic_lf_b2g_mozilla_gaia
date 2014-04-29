/**
/**
 * Created by tclxa on 4/11/14.
 */
'use strict';

$('wifiCheckings').addEventListener('click', function() {
	wifiCheck.init();
});

var _settings;
var _self;

var wifiCheck = {
	init: function init() {
		_self = this;
		_settings = window.navigator.mozSettings;
		_self.wifiaddlisteners();
	},
	wifiaddlisteners: function wWifiaddlisteners() {
		$('wificheckinggoback').addEventListener('click', function() {
			_self.submits();
		});
		$('wificheckingok').addEventListener('click', function() {
			_self.submits();
		});
		window.addEventListener('change', _self.handleEvent);
	},

	submits: function wSubmits() {
			var config = {};
		  var gWifiManager = navigator.mozWifiManager;
		  var conNetwork = gWifiManager.connection.network;

			config.enabled = $('staticMode-input').checked;
			config.ipaddr = $('ip-input').value;
			config.proxy = $('proxy-input').value;
			config.maskLength = $('maskLength-input').value;
			config.gateway = $('gateway-input').value;
			config.dns1 = $('dns1-input').value;
			config.dns2 = $('dns2-input').value;

		  dump('testbox-em_WifiChecking : enabled  ' + $('staticMode-input').checked + '  ip ' + $('ip-input').value + '\n');
      dump('testbox-em_WifiChecking : config ' + JSON.stringify(config) + '\n');
      dump('testbox-em_WifiChecking : ssid  ' + conNetwork.ssid + '\n');

		  //var request = gWifiManager.setStaticIpMode(conNetwork, config);
		  var request = gWifiManager.setStaticIpMode(conNetwork, config);

		  request.onsuccess = function onSuccess() {
			  alert('Ip Set Success!');

			};
		  request.onerror = function onError(e)  {
			  alert('Ip Set Falure!');
			  dump('testbox-em_WifiChecking : request onerror = ' + e.error);
		  };
		},

	writeSetting: function wWriteSetting(key, value) {
		if (!_settings)
			return;

		SettingsListener.getSettingsLock().set({ key: value });
	},

	wifiSleepSet: function wWifiSleepSet(value) {
		//wifi no sleep
		if (false == value) {
			_self.writeSetting('wifi.screen_off_timeout', 600000);
		}
	},

	handleEvent: function wHandleEvent(evt) {
		var input = evt.target;
		var type = input.type;
		var id = input.id;
		var key = input.name;

		switch (id) {
			case 'wifiSleep-input':
				_self.wifiSleepSet(input.checked);
				break;
			default:
				break;
		}

		if (!key || !_settings || evt.type != 'change')
			return;
		dump('testbox-em_WifiChecking : key ' + key);
		var cset = {};
		cset[key] = input.checked;
		settings.createLock().set(cset);
	}
};
