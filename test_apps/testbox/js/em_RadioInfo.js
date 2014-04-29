/**
 * Created by tclxa on 4/17/14.
 */
'use strict';

$('menuItem-radioInfo').addEventListener('click', function()
{
  radioInfo.init();
});
$('radio_infoModeChange').addEventListener('click', function()
{
  if (isMoreInfo)
    radio_infoMode.innerHTML = '(Less Info Mode)';
  else
    radio_infoMode.innerHTML = '(More Info Mode)';

    isMoreInfo = !isMoreInfo;
    radioInfo.update.signal.call(radioInfo);
});
var isMoreInfo = false;
var radio_infoMode = $('radio_infoMode');
var radio_infoResultPanel = $('radio_infoResultPanel');
var radio_infoStatus = $('radio_infoStatus');
var _self;

var radioInfo = {
  /* Whether or not status bar is actively updating or not */
  active: true,

  /* Some values that sync from mozSettings */
  settingValues: {},

  /* A mapping table between technology names
     we would get from API v.s. the icon we want to show. */
  mobileDataIconTypes: {
    'lte': '4G', // 4G LTE
    'ehrpd': '4G', // 4G CDMA
    'hspa+': 'H+', // 3.5G HSPA+
    'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H', // 3.5G HSDPA
    'evdo0': 'Ev', 'evdoa': 'Ev', 'evdob': 'Ev', // 3G CDMA
    'umts': '3G', // 3G
    'edge': 'E', // EDGE
    'gprs': '2G',
    '1xrtt': '1x', 'is95a': '1x', 'is95b': '1x' // 2G CDMA
  },

	// CDMA types that can support either data call or voice call simultaneously.
	dataExclusiveCDMATypes: {
		'evdo0': true, 'evdoa': true, 'evdob': true, // data call only
		'1xrtt': true, 'is95a': true, 'is95b': true  // data call or voice call
	},

	listeningCallschanged: false,

	/**
	 * this keeps how many current installs/updates we do
	 * it triggers the icon "systemDownloads"
	 */
	systemDownloadsCount: 0,

	decollator: '<br>**************************<br>',
  decollator_double: '<br>=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=<br>',

	init: function sb_init() {
		//this.getAllElements();

		this.listeningCallschanged = false;

		var settings = {
			'ril.radio.disabled': ['signal', 'data'],
			'ril.data.enabled': ['data'],
			'ril.cf.enabled': ['callForwarding']
		};

		_self = this;
		for (var settingKey in settings) {
			(function sb_setSettingsListener(settingKey) {
				SettingsListener.observe(settingKey, false,
					function sb_settingUpdate(value) {
						_self.settingValues[settingKey] = value;
						settings[settingKey].forEach(
							function sb_callUpdate(name) {
								_self.update[name].call(_self);
							}
						);
					}
				);
				_self.settingValues[settingKey] = false;
			})(settingKey);
		}

		this.systemDownloadsCount = 0;
		this.setActive(true);
	},

handleEvent: function sb_handleEvent(evt) {
		switch (evt.type) {

			case 'voicechange':
			case 'cardstatechange':
			case 'callschanged':
			case 'datachange':
				this.update.signal.call(this);
				break;
		}
	},

	setActive: function sb_setActive(active) {
		this.active = active;
		if (active) {

			var conns = window.navigator.mozMobileConnections;
			if (conns) {
				Array.prototype.slice.call(conns).forEach(function(conn) {
					conn.addEventListener('voicechange', _self);
					conn.addEventListener('datachange', _self);
					_self.update.signal.call(_self);
				});
			}

			window.addEventListener('simslot-iccinfochange', this);

			this.refreshCallListener();

		} else {

			var conns = window.navigator.mozMobileConnections;
			if (conns) {
				Array.prototype.slice.call(conns).forEach(function(conn) {
					conn.removeEventListener('voicechange', _self);
					conn.removeEventListener('datachange', _self);
				});
			}
			window.removeEventListener('simslot-iccinfochange', this);

			this.removeCallListener();
		}
	},
	update: {
		signal: function sb_updateSignal() {
			var simSlots = SIMSlotManager.getSlots();
			for (var index = 0; index < simSlots.length; index++) {
				var simslot = simSlots[index];

				_self.refeshwindow(simslot);
			}

			this.refreshCallListener();
		},
		callForwarding: function sb_updateCallForwarding() {

			var cf_temp = !this.settingValues['ril.cf.enabled'];
			dump('radioinfo em_RadioInfo callForwarding = ' + cf_temp);
		}
	},

	refeshwindow: function refeshwindow(simslot) {
		var conn = simslot.conn;
		var isCardinsert = true;//simslot.isAbsent();

		if (isMoreInfo) {
		  if (isCardinsert) {
			  radio_infoResultPanel.innerHTML =
				  'Radio Info List More:'
					+ '<br>begin<br>'
					+ _self.decollator
					+ 'Voice Radio Info List:'
					+ _self.objtostr(conn.voice)
					+ _self.decollator
					+ 'Voice Radio Info List:'
					+ _self.objtostr(conn.data)
					+ _self.decollator
					+ 'Others Radio Info: '
					+ _self.getobjstrItemsStr(conn)
					+ _self.decollator
					+ '<br>end<br>';
		  }
		  else {
			  radio_infoResultPanel.innerHTML = 'No SIM-Card';
		  }
		}else {
			radio_infoResultPanel.innerHTML = '';
		}

		radio_infoStatus.innerHTML = '\nInfo:'
			                           + '<br>voice signalStrength ='
			                           + conn.voice.signalStrength
		                             + '<br>voice relSignalStrength ='
		                             + conn.voice.relSignalStrength
		                             + _self.decollator_double;

	},
	getobjstrItemsStr: function getobjstrItemsStr(o) {

		var r = [], i, j = 0, len;
		if (null == o) {
			return o;
		}
		if (typeof o == 'string') {
			return o;
		}
		if (typeof o == 'object') {
			if (!o.sort) {
				for (i in o) {
					if (typeof o[i] != 'function') {
						if (typeof o[i] != 'object') {
							r[j++] = '<br>-->';
							r[j++] = i;
							r[j++] = ' = ';
							r[j++] = getobjstrItemsStr(o[i]);
						}
					}
				}
			}else {
				r[j++] = '<br>[';
				for (i = 0, len = o.length; i < len; ++i) {
					r[j++] = obj2str(o[i]);
					r[j++] = ',';
				}
				//maybe null
				r[len == 0 ? j : j - 1] = ']';
			}
			return r.join('');
		}
		return o.toString();
	},
	objtostr: function obj2str(o) {
		var r = [], i, j = 0, len;
		if (null == o) {
			return o;
		}
		if (typeof o == 'string') {
			return o;
		}
		if (typeof o == 'object') {
			if (!o.sort) {
				for (i in o) {
					if (typeof o[i] != 'function') {
						if (typeof o[i] != 'object') {
							r[j++] = '<br>-->';
							r[j++] = i;
							r[j++] = ' = ';
						}
						r[j++] = obj2str(o[i]);
					}
				}
			}else {
				r[j++] = '<br>[';
				for (i = 0, len = o.length; i < len; ++i) {
					r[j++] = obj2str(o[i]);
					r[j++] = ',';
				}
				r[len == 0 ? j : j - 1] = ']';
			}
			return r.join('');
		}
		return o.toString();
	},

	hasActiveCall: function sb_hasActiveCall() {
		var telephony = navigator.mozTelephony;
		// will return true as soon as we begin dialing
		return !!(telephony && telephony.active);
	},

	refreshCallListener: function sb_refreshCallListener() {
		// Listen to callschanged only when connected to CDMA networks and emergency
		// calls.
		var conns = window.navigator.mozMobileConnections;
		if (!conns)
			return;

		var emergencyCallsOnly = false;
		var cdmaConnection = false;
		Array.prototype.slice.call(conns).forEach(function(conn) {
			emergencyCallsOnly = emergencyCallsOnly ||
				(conn && conn.voice && conn.voice.emergencyCallsOnly);
			cdmaConnection = cdmaConnection ||
				(conn && conn.data && !!_self.dataExclusiveCDMATypes[conn.data.type]);
		});

		if (emergencyCallsOnly || cdmaConnection) {
			this.addCallListener();
		} else {
			this.removeCallListener();
		}
	},

	addCallListener: function sb_addCallListener() {
		var telephony = navigator.mozTelephony;
		if (telephony && !this.listeningCallschanged) {
			this.listeningCallschanged = true;
			telephony.addEventListener('callschanged', this);
		}
	},

	removeCallListener: function sb_addCallListener() {
		var telephony = navigator.mozTelephony;
		if (telephony) {
			this.listeningCallschanged = false;
			telephony.removeEventListener('callschanged', this);
		}
	}
};
