/*
* Add this file for fotaSetting.html
*Initialize all the checkboxes and select tag.
* Fixed bug #611045
*/


'use strict';


var FotaSetting = {
  ele_reminder: null,
  ele_check: null,

  init: function fota_setting_init() {
    debug('fota setting init enter');
    var self = this;

    var dialog = document.getElementById('fotaSetting');
    var select_check = document.getElementById('auto-check-intervals-select');
    var select_reminder = document.getElementById('reminder-intervals-select');

    self.ele_reminder = document.getElementById('reminder-intervals-desc');
    self.ele_check = document.getElementById('auto-check-intervals-desc');

    select_check.onchange = function(){
      self.FotaSettingsDesc('fota.auto-check-interval.current', this.value);
    };

    select_reminder.onchange = function(){
      self.FotaSettingsDesc('fota.reminder-interval.current', this.value);
    };

    Fota.getSettingsValue('fota.wifi-only.enabled',function(value){
      self.fotaSettingChecked('#wifi-only',value,dialog);
    },null);

    Fota.getSettingsValue('fota.daily-auto-check.enabled',function(value){
      self.fotaSettingChecked('#daily-auto-check',value,dialog);
    },null);

    Fota.getSettingsValue('fota.auto-check-interval.current',function(check){
      if (check)
      {
        self.FotaSettingsDesc('fota.auto-check-interval.current',check);
      } else {
        var apSelectionCheck = dialog.querySelector('#auto-check-intervals');
        self.fotaSetDesc('fota.auto-check-interval.current',apSelectionCheck);
      }
    },null);

    Fota.getSettingsValue('fota.reminder-interval.current',function(remind){
      if (remind)
      {
        self.FotaSettingsDesc('fota.reminder-interval.current',remind);
      } else {
        var apSelectionRemind = dialog.querySelector('#reminder-intervals');
        self.fotaSetDesc('fota.reminder-interval.current',apSelectionRemind);
      }
    },null)

    debug('fota setting init leaver');
  },

  fotaSetDesc: function setDesc(key, section) {

    var selects = section.querySelector('select');
    var settings = window.navigator.mozSettings.createLock();

    for (var i = 0, count = selects.length; i < count; i++) {
      var select = selects[i];
      if (select.selected) {
        this.FotaSettingsDesc(key, select.value);
        settings.set({key : false});
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
  },

  FotaSettingsDesc : function setFotaSettingsDesc(key, value) {
    var _ = navigator.mozL10n.get;
    if (key === 'fota.auto-check-interval.current') {

      switch (Number(value)) {
        case 0:
          desc = _('auto_check_entries_manual');
          break;
        case 168:
          desc = _('auto_check_entries_week');
          break;
        case 336:
          desc = _('auto_check_entries_two_weeks');
          break;
        case 720:
          desc = _('auto_check_entries_month');
          break;
      }
      this.ele_check.textContent = desc;
    } else if (key === 'fota.reminder-interval.current') {

      var desc;
      switch (Number(value)) {
        case 0:
          desc = _('reminde_entries_5');
          break;
        case 1:
          desc = _('reminde_entries_1');
          break;

        case 3:
          desc = _('reminde_entries_2');
          break;
        case 6:
          desc = _('reminde_entries_3');
          break;
        case 24:
          desc = _('reminde_entries_4');
          break;
      }
      this.ele_reminder.textContent = desc;
    }
  }
};

navigator.mozL10n.once(FotaSetting.init.bind(FotaSetting));
