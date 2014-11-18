/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
 /* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';
var TCL_Alarm = {
  _callback_list: [],

  init: function alarm_init() {
    var self = this;
    dump('tcl_alarm init');
    navigator.mozSetMessageHandler('alarm', function gotAlarm(message) {
        debug('tcl_alarm message data:' + message.data);
        if (self._callback_list) {
          for (var i = 0; i < self._callback_list.length; i++) {
            if (self._callback_list[i]) {
              self._callback_list[i](message);
            }
          }
        }
      });
    },

  add: function alarm_add(callback) {
    var i;
    for (i = 0; i < this._callback_list.length; i++) {
      if (this._callback_list[i] == callback) {
        return;
      }
    }
    this._callback_list[i] = callback;
    debug('tcl_alarm add');
  },

  remove: function alarm_remove(callback) {
    for (var i = 0; i < this._callback_list.length; i++) {
      if (this._callback_list[i] == callback) {
        this._callback_list[i] = null;
      }
    }
    debug('tcl_alarm remove');
  }
};

TCL_Alarm.init();
