
var _ = navigator.mozL10n.get;

var systemUpdate = {

  _isWifiOnly: false,

  _dailyCheckEnabled: false,

  //If we check failed,we'll retry some times.
  _retryTimes: 0,

  _lastCheckedDate: 0,

  remindInterval: 0,

  autoCheckInterval: 0,

  TIME_ONE_HOUR: 3600000,

  _firstRun: true,
/*Added by tcl_baijian 2014-03-04 use apps communication begin*/
  _ports: null,
/*Added by tcl_baijian 2014-03-04 use apps communication end*/
  _isSend2Setting: false,/*now should send msg to settings ?*/
  init: function fs_init() {

    var self = this;
    var reboot = true;
    var intervals = 0;
    var percentage = 0;

    // Track the wifi.enabled mozSettings value
    debug('init entry.');

    //  var settings = window.navigator.mozSettings;
    //  settings.createLock().set({'fota.version.info':
    //  {version_number: '100-1', size: 1022345,
    //  startDownload: true, percentage: 10, background: true,
    //  description: 'For test.'}});
    //  To fix the issue that WIFI icon is abnormal when connect
    //  and disconnect to AP.
    window.addEventListener('wifi-statuschange',
                             this.handleWifiStatusChange.bind(this));
   /*Deleted by tcl_baijian 2014-03-19
    wifi-statuschange and wifi-enabled is duplicate
    window.addEventListener('wifi-enabled', function() {
      self.handleWifiStatusChange();
    });
   */
    //To track the wifi-only-enabled.
    SettingsListener.observe('fota.wifi-only.enabled', true, function(value) {
      debug('Handle fota.wifi-only.enabled changed success and now its' +
            'value: ' + value);
      self._isWifiOnly = value;
    });

    //To track the wifi-only-enabled.
    SettingsListener.observe('fota.daily-auto-check.enabled', true,
                             function(value) {
      debug('Handle fota.daily-auto-check.enabled changed success ' +
            'and now its value: ' + value);
      self._dailyCheckEnabled = value;
    });

    SettingsListener.observe('fota.auto-check-interval.current', 0,
                             function(value) {
      var interval = Number(value);
      debug('check interval:' + interval);
      if (interval === 0) {
        self.removeExistAlarm('check', function() {
          debug('Disable the check alarm success.');
        });
        self.autoCheckInterval = 0;
      }else if (self.autoCheckInterval != interval) {
        self.autoCheckInterval = interval;
        self.startAutoCheckAlarm(reboot);
      }
    });

    SettingsListener.observe('fota.reminder-interval.current', 0,
                             function(value) {
      var interval = Number(value);
      debug('remind interval:' + interval);
      if (interval === 0) {
        self.removeExistAlarm('remind', function() {
          debug('Disable the remind alarm success.');
        });
        self.remindInterval = 0;
      } else if (self.remindInterval != interval) {
        self.remindInterval = interval;
        self.startRemindAlarm(reboot);
      }
    });

    //This shoud be the last oberserve because we will set the flags reboot.
    SettingsListener.observe('fota.last-finished.date', 0,
                             function(value) {
      debug('Handle last-finished.date changed success and now its value: ' +
            value);
      //When we handle this obeserve means that there is a new check result
      //is found, we need to reset or start the check and remind alarm.
      if (!reboot && value != 0) {
        self.addAlarm('check');
        self.addAlarm('remind');
      }
      self._lastCheckedDate = value;
      reboot = false;
    });

    //Here when we handle the alarm message,we will create a custom
    //event and dispatch to other modules
    navigator.mozSetMessageHandler('alarm', function(message) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('alarmFired', true, true, { message: message });
      debug('Dispatch an alarm fire event.');
      window.dispatchEvent(evt);
    });

    window.addEventListener('alarmFired', function(event) {
      debug('The alarm is land now and its type: ' + event.type);
      if (event.type === 'alarmFired') {
        self.handleAlarm(event.detail.message);
      }
    });

    navigator.mozJrdFota.checkInstallResult(this.onCommonCb.bind(this));
  },

  //To check whether the given type alarm is exist.
  isAlarmExist: function fota_getExsitAlarm(type, callback) {
    if ((type !== 'check' && type !== 'remind') ||
      (typeof callback !== 'function')) {
      return;
    }
    debug('isAlarmExist: type: ' + type);
    var requst = navigator.mozAlarms.getAll();
    requst.onsuccess = function(e) {
      var result = e.target.result;
      for (var i = 0; i < result.length; i++) {
        if (result[i].id && result[i].data &&
          result[i].data.fotaAlarmType === type) {
            callback(true);
            return;
        }
      }
      callback(false);
    };
    requst.onerror = function(e) {
      callback(false);
    };
  },

  //Remove all the given type alarm.
  removeExistAlarm: function fota_removeExistAlarm(type, callback) {
    if ((type !== 'check' && type !== 'remind') ||
      (typeof callback !== 'function')) {
      return;
    }

    debug('removeExistAlarm type: ' + type);
    var requst = navigator.mozAlarms.getAll();
    requst.onsuccess = function(e) {
      var result = e.target.result;
      debug('removeExistAlarm result:' + JSON.stringify(result));
      for (var i = 0; i < result.length; i++) {
        if (result[i].id && result[i].data &&
          result[i].data.fotaAlarmType === type) {
          navigator.mozAlarms.remove(Number(result[i].id));
        }
      }
      callback();
      return;
    };
    requst.onerror = function(e) {
      callback();
      return;
    };
  },

  startAutoCheckAlarm: function fota_enableAutoCheck(reboot) {
    var self = this;

    if (!reboot) {
      this.addAlarm('check');
      return;
    }

    this.isAlarmExist('check', function(result) {
      if ((reboot && !result)) {
        self.addAlarm('check');
      }
    });
  },

  startRemindAlarm: function fota_startAlarm(reboot) {
    if (reboot) {
      return;
    }
    var self = this;
    var settings = window.navigator.mozSettings;
    var req = settings.createLock().get('fota.version.info');
    req.onsuccess = function fota_getSettingSuccess() {
      var result = req.result['fota.version.info'];
      var exist = false;
      if (result && result.version_number && result.size) {
        exist = true;
      }

       self.isAlarmExist('remind', function(result) {
        //When there is stored check result and the check alarm is not exist,
        //we will add a new alarm,but if there is an alarm and no stored
        //result, we'll remove the exist alarms.
        if (exist) {
          self.addAlarm('remind');
        } else if (!exist && result) {
          self.removeExistAlarm('remind', function() {
            debug('startRemindAlarm:: remove all remind alarm success.');
          });
        }
      });
    };
  },

  handleWifiStatusChange: function fs_handleWifiStatusChange(event) {

    var wifiManager = window.navigator.mozWifiManager;
    if (!wifiManager)
      return;

    if (wifiManager.connection.status === 'connected') {
      if (this._firstRun === true || this._dailyCheckEnabled === true) {
        this.handleWifiConnected();
        this._firstRun = false;
      }
    }
    /*Added by_baijian bug#625710:when wifi is closed,
     *we need pause the process of download.2014-03-20
     */
    else if (wifiManager.connection.status === 'disconnected') {
        debug('handleWifiStatusChange:' + wifiManager.connection.status);
        if (navigator.mozJrdFota.JrdFotaActionStatus === 'Download')
        {
            if (this._isWifiOnly) {
                navigator.mozJrdFota.pause(this.onCommonCb.bind(this));
            } else {
                var mobileManager = window.navigator.mozMobileConnection;
                if (!mobileManager || !mobileManager.data.connected) {
                    navigator.mozJrdFota.pause(this.onCommonCb.bind(this));
                }
            }
        }
    }
  },

  onGetNewPackageCb: function fs_onGetNewPackageCb(versionName,
                                                   size,
                                                   description) {
    debug('onGetNewPackageCb:: versionName:  ' + versionName +
      ' size:' + size + ' description:' + description);
    this.checkSuccessCb(versionName, size, description);
  },
    /*Midified by tcl_baijian 2014-03-11 move some logic handle from settings
     to system begin*/
  onCommonCb: function fs_commonCb(actionType, isSuccess, errorType) {
    var errorStr = null;
    var notification = '';
    debug('onCommonCb::' + 'actionType: ' + actionType + 'isSuccess: ' +
      isSuccess + 'errorType: ' + errorType + '\n');
    switch (actionType) {
     case 'CheckInstallResult':
        //Have success and fail case
      if (isSuccess) {
        systemUpdate.handleInstallSuccess();
      }else {
        systemUpdate.handleInstallFailed();
      }
      break;
     case 'GetNewPackage':
       this.handleGetNewPackageFailed(errorType);
       this.onFotaCommonCb(actionType, isSuccess, errorType);
       break;
     case 'Download':
       if (!isSuccess) {
           this.handleDownloadFailed(errorType);
       }
       this.onFotaCommonCb(actionType, isSuccess, errorType);
       break;
     case 'Pause':
       if (!isSuccess) {
           this.handleStopDownloadFailed(errorType);
       }
       this.onFotaCommonCb(actionType, isSuccess, errorType);
       break;
     case 'Delete':
       if (isSuccess) {
           this.handleDeletePackageSuccess();
       }else {
           this.handleDeletePackageFailed(errorType);
       }
       this.onFotaCommonCb(actionType, isSuccess, errorType);
       break;
     case 'CheckFirmwarm':
       if (!isSuccess) {
           this.handleFirewarmCheckFailed(errorType);
       }else {
           this.handleFirewarmCheckSuccess();
       }
       this.onFotaCommonCb(actionType, isSuccess, errorType);
       break;
     case 'Install':
       if (!isSuccess) {
           this.handleInstallException(errorType);
           this.onFotaCommonCb(actionType, isSuccess, errorType);
       }
       break;
    }
  },
  /*Midified by tcl_baijian 2014-03-11 move some logic handle from settings
  to system end*/
  /*Added by tcl_baijian 2014-03-11 save the completion rate begin*/
  saveCompletionRate: function fs_saveCompletionRate(completionRate,
                                                     starDownload) {
      debug('saveCompletionRate');
      var notification = '';
      var settings = window.navigator.mozSettings.createLock();

      var req = settings.get('fota.version.info');
      req.onsuccess = function fota_getSettingSuccess() {
          var result = req.result['fota.version.info'];
          if (result.percentage != completionRate) {
              settings.set({'fota.version.info': {
                  version_number: result.version_number,
                  size: result.size, startDownload: starDownload,
                  percentage: completionRate,
                  background: false, description: result.description}});
          }
      };
      req.onerror = function fota_getVersionInfo() {
          debug('fota.version.info error');
      };
      if (starDownload == true) {
          notification = '=DwnRes=' + completionRate;
      }
      if (completionRate > 99) {
          notification = '=FwcRes=' + _('msg_checking_ongoing');
      }

      settings.set({'fota.notification.value': notification });
  },
  /*Added by tcl_baijian 2014-03-11 save the completion rate end*/

  checkSuccessCb: function fs_checkSuccessCb(versionName, size, description) {
    debug('checkSuccessCb.');
    var notification = '';
    var settings = window.navigator.mozSettings.createLock();

    var req = settings.get('fota.version.info');
    req.onsuccess = function fota_getSettingSuccess() {
      var result = req.result['fota.version.info'];

      /*Begin Time:2013-11-14 resolute bug#531419 author:baijian*/
      if (result && result.version_number && result.size) {
         if (result.size != size || result.version_number != versionName) {
           settings.set({'fota.version.info': {version_number: versionName,
               size: size, startDownload: false, percentage: 0,
               background: true, description: description}});
           /*added by baijian*/
           debug('fota.version.info is different,so reset it');
        }
        else/*added by baijian,when fota.version.info is not changed*/
        {
           debug('fota.version.info size and version are the same,' +
               'and there are ' + size + ':' + versionName);
        }
      }
      else
      /*
      added by baijian, resolute bug#531419,
      when the fota.version.info is not exist,just add it
      */
      {
          debug('fota.version.info is not exist,so add it');
          settings.set({'fota.version.info': {version_number: versionName,
              size: size, startDownload: false, percentage: 0,
              background: true, description: description}});
      }
    };
      /*add by baijian*,when get fota.version.info error,give us a tip*/
      req.onerror = function fota_getSettingFail() {
          debug('fota.version.info error');
      };
    /*End Time:2013-11-14 resolute bug#531419 author:baijian*/
    notification = '=GnpRes=' + _('notify_reminder_download');
    settings.set({'fota.notification.value': notification});
    settings.set({'fota.last-finished.date': Date.now()});
  },

  handleAlarm: function fs_handleAlarm(message) {

    if (message && message.data && message.data.fotaAlarmType) {
      debug('handleAlarm::  type: ' + message.data.fotaAlarmType);
      if (message.data.fotaAlarmType === 'check') {
        var result = this.getNewPackage();
        if (result === true) {
          this.addAlarm('check');
          this._retryTimes = 0;
        } else {
          //When the alarm is fired but the check is failed ,we will retry
          //to check some times, and now the alarm is one hour.
          this.retry();
        }
      }else if (message.data.fotaAlarmType === 'remind') {
        this.remind();
        this.addAlarm('remind');
      }
    }
    return;
  },

  addAlarm: function fota_addAlarm(key) {
    //If the interval or the key is unavaliable,we will ignore
    //the requst.
    debug('addAlarm key: ' + key + ' ' + this.autoCheckInterval + ' ' +
          this.remindInterval);

    if (key !== 'check' && key !== 'remind') {
      return;
    }

    if ((key === 'check' && !this.autoCheckInterval) ||
      (key === 'remind' && !this.remindInterval)) {
      return;
    }
    var self = this;
    if (key === 'check') {
      var interval = this.autoCheckInterval;
    } else {
      var interval = this.remindInterval;
    }
    //When we want to add an alarm, we need to remove the exist ones first.
    this.removeExistAlarm(key, function() {
      var schedule = Date.now() + Number(interval) * self.TIME_ONE_HOUR;

      var at = new Date(schedule);
      var requst = navigator.mozAlarms.add(at, 'ignoreTimezone', {
        fotaAlarmType: key
      });
      // Setting the new alarm
      requst.onsuccess = function(e) {
        /* For debugging.
        var req = navigator.mozAlarms.getAll();
        req.onsuccess = function(e) {
           debug('Total: ' + e.target.result.length + ' alarms.');
           debug('All alarms: ' + JSON.stringify(e.target.result));
        };
        */
      };

      requst.onerror = function(e) {
        debug('addAlarm failed dues to: ' + e);
      };

    });
  },

  //When the check is failed, we will try our best to do the
  //check action some times during a short period.
  retry: function fota_retry() {
    debug('retry');
    if (!this.autoCheckInterval) {
      debug('retry: Auto check interval is not available : ' +
            this.autoCheckInterval);
      return;
    }
    this._retryTimes++;
    debug('retry: times: ' + this._retryTimes);
    if (this._retryTimes > 3) {
      this._retryTimes = 0;
      //Add a long interval check alarm when we try some times
      //but it is always failed
      this.addAlarm('check');
      return;
    }

    var self = this;
    var schedule = Date.now() + this.TIME_ONE_HOUR;
    var at = new Date(schedule);

    //we remove the exist alarm first.
    this.removeExistAlarm('check', function() {
      var requst = navigator.mozAlarms.add(at, 'ignoreTimezone', {
        fotaAlarmType: 'check'
      });
      // Start a new alarm
      requst.onsuccess = function(e) {
        debug('retry: Add an alarm success and its id is:' + e.target.result);
        //For debugging.
      };
      requst.onerror = function(e) {
        //Try to add a long interval check
        self.addAlarm('check');
        self._retryTimes = 0;
      };
    });
  },


  getNewPackage: function fs_getNewPackage() {
    /*something may be wrong*/
    if (navigator.mozJrdFota.JrdFotaActionStatus != 'NoAction') {
      debug('getNewPackage::Other action is running');
      return false;
    }

    var isMobileConnected = false;
    var isWifiConnected = false;

    if (window.navigator.mozMobileConnection &&
      window.navigator.mozMobileConnection.data &&
      window.navigator.mozMobileConnection.data.connected === true) {
      isMobileConnected = true;
    }
    if (window.navigator.mozWifiManager &&
      window.navigator.mozWifiManager.connection &&
      window.navigator.mozWifiManager.connection.status === 'connected') {
      isWifiConnected = true;
    }
    debug('check:: isWifiOnly: ' + this._isWifiOnly + ' isMobileConnected: ' +
          isMobileConnected + ' isWifiConnected: ' + isWifiConnected);
    if (this._isWifiOnly && !isWifiConnected) {
      return false;
    }
    if (!this._isWifiOnly && !(isMobileConnected || isWifiConnected)) {
      return false;
    }
    /*Modified by tcl_baijian 2014-03-14 fixed bug#621637 background get new
     *package popup the dialog begin*/
    navigator.mozJrdFota.getNewPackage(this.onGetNewPackageCb.bind(this),
                                       this.onGetNewPackageCmnCb.bind(this));
    /*Modified by tcl_baijian 2014-03-14 fixed bug#621637 background get new
     *package popup the dialog end*/
    return true;
  },
  /*Added by tcl_baijian 2014-03-14 fixed bug#621637 background get new package
   *popup the dialog begin*/
  onGetNewPackageCmnCb: function fs_GetNewPackageCmnCb(actionType, isSuccess,
                                                       errorType) {
    debug('onCommonCb::' + 'actionType: ' + actionType + 'isSuccess: ' +
      isSuccess + 'errorType: ' + errorType + '\n');
  },
  /*Added by tcl_baijian 2014-03-14 fixed bug#621637 background get new package
   *popup the dialog end*/

  remind: function fs_remind() {
    // If the check or the download action is in process,we will ignore
    // the remind.
    /*just get status once,not twice*/
    var actionStatus = navigator.mozJrdFota.JrdFotaActionStatus;
    if (actionStatus === 'GetNewPackage' || actionStatus === 'Download') {
      return;
    }

    var hasDownloadResult = false;
    var notification = null;
    var settings = window.navigator.mozSettings.createLock();
    var req = settings.get('fota.version.info');
    req.onsuccess = function fota_getSettingSuccess() {
      debug('remind:: get firmware version sucessed.');
      var result = req.result['fota.version.info'];
      debug('remind: result.startDownload: ' + result.startDownload +
        ' percentage: ' + result.percentage);
      if (result && result.version_number && result.size) {
        if (result.startDownload &&
          result.startDownload === true) {
           if (result.percentage && result.percentage === 100) {
             notification = '=GnpRes=' + _('notify_reminder_upgrade');
           } else {
             // When the download is not fineshed, we will remind the user
             // to download.
             notification = '=GnpRes=' + _('notify_reminder_download');
           }
        }else {
           notification = '=GnpRes=' + _('notify_reminder_download');
        }
        settings.set({'fota.notification.value': notification});
      }
    };
    return true;
  },

  handleInstallSuccess: function fs_handleInstallSuccess() {
    var notification = '';

    //When we handle the upgrade is success, we need to remove the remind
    //alarm.
    this.removeExistAlarm('remind', function() {
      debug('Remove all remind alarm success.');
    });
    SettingsListener.getSettingsLock().set({'fota.version.info': null});

    notification = '=InsRes=' + _('notify_upgrade_successed');
    SettingsListener.getSettingsLock().set({
      'fota.notification.value': notification
    });
  },

  handleInstallFailed: function fs_handleInstallFailed() {
    var notification = '';

    notification = '=InsRes=' + _('msg_upgrade_failed_unknow');

    SettingsListener.getSettingsLock().set({
      'fota.notification.value': notification
    });
  },

  handleWifiConnected: function fs_handleWifiConnected() {

    var now = new Date();

    var lastedCheckDate = new Date(this._lastCheckedDate);
    debug('handleWifiConnected:: lastedCheckDate:' + lastedCheckDate);
    debug('handleWifiConnected:: Now:' + now);
    //To check has today checked already
    if (now.getYear() == lastedCheckDate.getYear() &&
      now.getDate() == lastedCheckDate.getDate() &&
      now.getMonth() == lastedCheckDate.getMonth()) {
      debug('handleWifiConnected:: Check action has took already today.');
      return;
    }else {
      this.getNewPackage();
    }
  },
  /*Added by tcl_baijian 2014-03-04 communicate between system and setting:
  receive fota command from settings begin*/
  receiveFotaCommand: function receiveFromSettings(category, actionType) {
      var self;

      debug('receive from setting category:' + category + ' action:' +
          actionType);
      self = this;

      if (category == 'common') {
          switch (actionType) {
              case 'install':
                  navigator.mozJrdFota.install(self.onCommonCb.bind(self));
                  break;
              case 'delete':
                  navigator.mozJrdFota.delete(self.onCommonCb.bind(self));
                  break;
              case 'pause':
                  navigator.mozJrdFota.pause(self.onCommonCb.bind(self));
                  break;
              case 'exit':
                  self._ports = null;
                  self._isSend2Setting = false;
                  break;
              case 'GetAction':
                  self.sendReplyCommand(category, actionType,
                      navigator.mozJrdFota.JrdFotaActionStatus, null);
                  break;
              case 'enter':
                  self._ports = null;
                  self._isSend2Setting = true;
                  break;
              /*Added by tcl_baijian 2014-03-17 set storage devices begin*/
              case 'ext_sdcard':
                  /*1:external sdcard*/
                  navigator.mozJrdFota.selectSdcard(1, false);
                  break;
              case 'int_sdcard':
                  /*0:internal sdcard*/
                  navigator.mozJrdFota.selectSdcard(0, false);
                  break;
              /*Added by tcl_baijian 2014-03-17 set storage devices begin*/
              default:;
          }
      }
      else if (category == 'download') {
          if (actionType == 'download') {
              navigator.mozJrdFota.download(
                  self.onFotaDownloadProgressCb.bind(self),
                  self.onCommonCb.bind(self));
          }
      }
      else if (category == 'getNewPackage') {/*GetNewPackage*/
          if (actionType == 'getNewPackage') {
              navigator.mozJrdFota.getNewPackage(
                  self.onFotaGetNewPackageCb.bind(self),
                  self.onCommonCb.bind(self));
          }
      }
      else {
          debug('receive from fota command error!!!');
      }
  },
  /*send command to setting*/
  sendReplyCommand: function fota_reply_command(category, value1, value2,
                                                value3) {
      var replyMsg;
      var self;

      self = this;
      /*setting exit ,no need to send msg*/
      if (self._isSend2Setting == false)
         return;

      switch (category) {
          case 'common':
              replyMsg = {
                  category: category,
                  actionType: value1,
                  isSuccess: value2,
                  errorType: value3
              };
              break;
          case 'download':
              replyMsg = {
                  category: category,
                  completeRate: value1
              };
              break;
          case 'getNewPackage':
              replyMsg = {
                  category: category,
                  versionNum: value1,
                  size: value2,
                  description: value3
              };
              break;
          default :;
      }

      if (self._ports != null)
      {
          self._ports.forEach(function(port) {
              port.postMessage(replyMsg);
          });
          return;
      }

      navigator.mozApps.getSelf().onsuccess = function(e) {
          var app = e.target.result;
          app.connect('fota-sys-comms').then(function onConnAccepted(ports) {
              self._ports = ports;
              self._ports.forEach(function(port) {
                  port.postMessage(replyMsg);
              });
          }, function onConnRejected(reason) {
              console.log('system is rejected fota reply message');
              console.log(reason);
          });
      };
  },
  /*common callback funcation*/
  onFotaCommonCb: function fota_commonCb(actionType, isSuccess, errorType) {
      debug('Received from gecko message:common');
      this.sendReplyCommand('common', actionType, isSuccess, errorType);
  },
  /*download callback funcation*/
  onFotaDownloadProgressCb: function fota_onDownloadProgressCb(completionRate)
  {
      debug('Received from gecko message:Download');
      this.saveCompletionRate(completionRate, true);
      this.sendReplyCommand('download', completionRate, null, null);
  },
  /*GetNewPackage callback funcation*/
  onFotaGetNewPackageCb: function fota_getPackage(versionNun, size,
                                                  description) {
      debug('Received from gecko message:getNewPackage');
      /*save the version info*/

      if (!versionNun || !size) {
         this.handleGetNewPackageFailed('DataError');
         this.sendReplyCommand('getNewPackage', versionNun, size, description);
         return;
      }

      this.checkSuccessCb(versionNun, size, description);
      var msg = _('default_update_info2');
      showDialog(_('popup_release_note_title'), msg, null);
      this.sendReplyCommand('getNewPackage', versionNun, size, description);
  },
  /*Added by tcl_baijian 2014-03-04 communicate between system and setting:
    receive fota command from settings begin*/
  handleGetNewPackageFailed: function fota_handleGetNewPackageFailed(result) {
     //Show popup
     var info = this.getErrorMessage(result);
     showDialog(_('popup_dialog_title_attention'), info, null);

     //Show notification.
     var settings = window.navigator.mozSettings;
     var notification = '=GnpRes=' + info;
     settings.createLock().set({'fota.notification.value': notification});
  },
  handleDownloadFailed: function fota_handleDownloadFailed(error) {
     var msg = this.getErrorMessage(error);
     debug('handleDownloadFailed:: The error msg:' + msg);
     var info = _('download_finished_failed') + ' ' + msg;
     showDialog(_('popup_dialog_title_attention'), info, null);

     var notification = '=FwcRes=' + info;
     SettingsListener.getSettingsLock().set(
     {'fota.notification.value': notification});
  },
  handleStopDownloadFailed: function fotaStopDownload(error) {
      var msg = this.getErrorMessage(error);
      debug('handleStopDownloadFailed:: msg:' + msg);
      showDialog(_('popup_dialog_title_attention'), msg, null);
  },
  handleDeletePackageSuccess: function fota_handleDeletePackageSuccess() {
     debug('handleDeletePackageSuccess: entry.');
     this.saveCompletionRate(0, false);
  },
  handleDeletePackageFailed: function fota_handleDeletePackageFailed(errorType)
  {
     var settings = window.navigator.mozSettings;
     var msg = _('fota_delete_package_error');
     var notification = '=FwcRes=' + msg;

     showDialog(_('popup_dialog_title_attention'), msg, null);

     settings.createLock().set({'fota.notification.value': notification});
  },
  handleFirewarmCheckFailed: function fotaFireWarmCheckSFailed(error) {
     var notification = '';
     var msg = this.getErrorMessage(error);
     var settings = window.navigator.mozSettings;

     debug('handleFirewarmCheckFailed:: The error msg:' + msg);

     notification = '=FwcRes=' + _('download_finished_failed') + ' ' + msg;
     showDialog(_('popup_dialog_title_attention'), msg, null);
     settings.createLock().set({'fota.notification.value': notification});
  },
  handleFirewarmCheckSuccess: function fota_handleFirewarmCheckSuccess() {
     var notification = '';
     var settings = window.navigator.mozSettings;

     notification = '=FwcRes=' + _('notify_reminder_upgrade');
     settings.createLock().set({'fota.notification.value': notification });
  },
  handleInstallException: function fota_handleException(errorType) {

     var message = this.getErrorMessage(errorType);

      showDialog(_('popup_dialog_title_attention'), message, null);
  },
  getErrorMessage: function fota_getErrorMessage(errorType) {
     var errorStr;
     switch (errorType) {
         case 'NetworkError':
             errorStr = _('msg_download_failed_net_error');
             break;
         case 'DataError':
             errorStr = _('msg_download_failed_chksum_err');
             break;
         case 'DeletePackageError':
             errorStr = _('fota_delete_package_error');
             break;
         case 'StopDownloadError':
             errorStr = _('fota_stop_download_error');
             break;
         case 'InstallError':
             errorStr = _('msg_upgrade_failed_unknow');
             break;
         case 'DefaultError':
             errorStr = _('msg_download_failed_unknow');
             break;
         case 'DiffPackageNotExistError':
             errorStr = _('popup_text_file_not_found_err');
             break;
         case 'DiffPackageUnavailableError':
             errorStr = _('msg_upgrade_failed_file_invalid');
             break;
         case 'NotFoundUpdatePackageError':
             errorStr = _('no_new_version');
             break;
         default:
             break;
        }
     return errorStr;
  }
};

if (navigator.mozL10n.readyState == 'complete' ||
    navigator.mozL10n.readyState == 'interactive') {
  systemUpdate.init();
} else {
  window.addEventListener('localized', systemUpdate.init.bind(systemUpdate));
}
/*Added by tcl_baijian 2014-03-04 received from setting begin*/
window.addEventListener('iac-fota-set-comms', function(evt) {
  if (evt != null) {
      var msg = evt.detail;
      systemUpdate.receiveFotaCommand(msg.category, msg.actionType);
  }
});
/*Added by tcl_baijian 2014-03-04 received from setting end*/
