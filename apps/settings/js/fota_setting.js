/*
* Add this file for fotaSetting.html
*Initialize all the checkboxes and select tag.
* Fixed bug #611045
*/


'use strict';


var FotaSetting = {

    _settingCache: null,

    init: function fota_setting_init() {
            debug('fota setting init enter');
            this._settingCache = Settings.settingsCache;
            if (!this._settingCache) {
                debug('init:: Settings settingCache is not exist!');
                return;
            }
            var dialog = document.getElementById('fotaSetting');

            var wifi_only = this._settingCache['fota.wifi-only.enabled'];
            this.fotaSettingChecked('#wifi-only', wifi_only, dialog);

            var auto_chck = this._settingCache['fota.daily-auto-check.enabled'];
            this.fotaSettingChecked('#daily-auto-check', auto_chck, dialog);

            var check = this._settingCache['fota.auto-check-interval.current'];
            if (check)
            {
                Settings.setFotaSettingsDesc('fota.auto-check-interval.current',
                                              check);
            }
            else
            {
                var apSelectionCheck = dialog.querySelector(
                                      '#auto-check-intervals');
                this.fotaSettingDesc('fota.auto-check-interval.current',
                                      apSelectionCheck);
            }

            var remind = this._settingCache['fota.reminder-interval.current'];
            if (remind)
            {
                Settings.setFotaSettingsDesc('fota.reminder-interval.current',
                                              remind);
            }
            else
            {
               var apSelectionRemind = dialog.querySelector(
                                        '#reminder-intervals');
                this.fotaSettingDesc('fota.reminder-interval.current',
                                      apSelectionRemind);
            }

            debug('fota setting init leaver');
        },

    fotaSettingDesc: function setDesc(key, section) {
        var selects = section.querySelector('select');
        for (var i = 0, count = selects.length; i < count; i++) {
            var select = selects[i];
            if (select.selected) {
                Settings.setFotaSettingsDesc(key, select.value);
                this._settingCache[key] = select.value;
                break;
            }
        }
    },

    fotaSettingChecked: function setChecked(key, value, section)
    {
        var apSelectionCheck = section.querySelector(key);
        var input = apSelectionCheck.querySelector('input');
        if (value)
            input.checked = true;
        else
            input.checked = false;
    }
};

navigator.mozL10n.ready(FotaSetting.init.bind(FotaSetting));
