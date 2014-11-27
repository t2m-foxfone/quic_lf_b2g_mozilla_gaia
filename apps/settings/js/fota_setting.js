/*
* Add this file for fotaSetting.html
*Initialize all the checkboxes and select tag.
* Fixed bug #611045
*/


'use strict';


var FotaSetting = {

  init: function fota_setting_init() {
    debug('fota setting init enter');
    var self = this;
    var dialog = document.getElementById('fotaSetting');

    Fota.getSettingsValue('fota.wifi-only.enabled', function(value) {
      self.fotaSettingChecked('#wifi-only', value, dialog);
    },null);

    Fota.getSettingsValue('fota.daily-auto-check.enabled', function(value) {
      self.fotaSettingChecked('#daily-auto-check', value, dialog);
    },null);

    Fota.getSettingsValue('fota.auto-check-interval.current', function(check) {
      if (!check) {
        var apSelectionCheck = dialog.querySelector('#auto-check-intervals');
        self.fotaSetDesc('fota.auto-check-interval.current', apSelectionCheck);
      }
    },null);

    Fota.getSettingsValue('fota.reminder-interval.current', function(remind) {
      if (!remind) {
        var apSelectionRemind = dialog.querySelector('#reminder-intervals');
        self.fotaSetDesc('fota.reminder-interval.current', apSelectionRemind);
      }
    },null);

    debug('fota setting init leaver');
  },

  fotaSetDesc: function setDesc(key, section) {

    var selects = section.querySelector('select');
    var settings = window.navigator.mozSettings.createLock();

    for (var i = 0, count = selects.length; i < count; i++) {
      var select = selects[i];
      if (select.selected) {
        this.FotaSettingsDesc(key, select.value);
        settings.set({key: false});
        break;
      }
    }
  },

  fotaSettingChecked: function setChecked(key, value, section) {
    var apSelectionCheck = section.querySelector(key);
    var input = apSelectionCheck.querySelector('input');
    if (value)
      input.checked = true;
    else
      input.checked = false;
  }
};

navigator.mozL10n.once(FotaSetting.init.bind(FotaSetting));
