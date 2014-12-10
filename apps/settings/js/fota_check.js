'use strict';

function $(id) { return document.getElementById(id); }
var _ = navigator.mozL10n.get;
var menu_check_update = $('fota-menu-check-update');
var check_update_desc = $('check-update-desc');

var button_download_action = $('button-download-action');
var button_delete_action = $('button-delete-action');
var update_infomation_subline = $('update-infomation-subline');
var system_update_info = $('system-update-info');
var system_update_version_desc = $('system-update-version-desc');
var system_update_file_size_desc = $('file-size-desc');
var system_update_process_bar = $('download-progress-bar');
var system_update_download_percentage = $('download-percentage');
var system_update_info_head = $('system-update-info-header');
var action_button = $('action-button');

var Fota = {

  _isWifiOnly: false,

  _versionInfo: {version_number: 0, size: 0,
    startDownload: 0, percentage: 0, background: false, sdescription: ''},

  STORAGE_INIT: 0,

  STORAGE_AVAILABLE: 1,

  STORAGE_NOCARD: 2,

  STORAGE_UNMOUNTED: 3,

  STORAGE_CAPACITY: 4,

  _storage: null,

  _storageState: null,

  _isWifiConnected: false,

  _isDataConnected: false,

  _isPopupShow: false,

  _descInfo: {states: '', ext: false},

  _cpuWakelock: null,
  /*use apps communication*/
  _ports: null,
  /*receive command "GetAction" and call callback*/
  _callback: null,
  /*long press time out handle*/
  _longPressTimeout: null,
  /*the action status,eg."Pause","Download","GetNewPackage"*/
  _status: null,
  /*current storage devices name*/
  _storageName: null,
  _dataManager: null,

  init: function fota_init() {

    var self = this;
    var inited = false;

    /**
    *make sure fota.status.action is null when the callback function of
    *"SettingsListener.observe('fota.status.action'" is invoked
    * */
    var settings = window.navigator.mozSettings.createLock();
    settings.set({'fota.status.action': null });
    //Get the version info.include 'version_name,size,description,
    //percentage,download'.

    self.getSettingsValue('fota.version.info', function(value) {
      if (value && value.version_number && value.size) {
        self.updateInfoPanelEx(value);
        self.saveVersionInfo(value, false);
      }
    },function() {
      debug('settings init get fota.version.info error!!!');
    });

    /*Added by tcl_baijian notify system that settings is already enter begin*/
    this.sendFotaCommand('common', 'enter');
    /*Added by tcl_baijian notify system that settings is already enter end*/
    var wifiManager = window.navigator.mozWifiManager;
    if (wifiManager)
    {
      if (wifiManager.connection && wifiManager.connection.status &&
            wifiManager.connection.status === 'connected') {
        this._isWifiConnected = true;
      }
      wifiManager.onstatuschange = this.handleWifiStatusChange.bind(this);
    }
    else
    {
      debug('wifiManager is null');
    }

    self._dataManager = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections &&
      window.navigator.mozMobileConnections[0];
    if (self._dataManager) {
      if (self._dataManager.data.connected == true) {
        self._isDataConnected = true;
        self.showDataLinkTip();
      }
      self._dataManager.addEventListener('datachange',
        this.handleDataChange.bind(this));
    }
    //Because when we disable the wifi only mode,we need
    //to show a popup screen.so here we add an observe.
    SettingsListener.observe('fota.wifi-only.enabled', true, function(value) {
     /*FIX PR718625,ensure the value set to self._isWifiOnly*/
      self._isWifiOnly = value;
      if (self._isWifiConnected) {
        return;
      }

      /*when wifiConnection and MoblileConnection are both false,just return*/
      if (self._dataManager || !self._dataManager.data.connected) {
        return;
      }

      if (self._isWifiOnly === true) {
        self.getSettingsValue('fota.wifionly.first', function(first) {
          if (first) {
            var settings = window.navigator.mozSettings.createLock();
            settings.set({'fota.wifionly.first' : false});
            showAttention({title: _('popup_dialog_title_attention'),
              msg: _('popup_text_warn_wifi_download'), acceptCb: null});
          }
        },null);
      }

    });

    //Init the storage state.
    this._storageState = this.STORAGE_INIT;
    //init the wifi manager.

    //init the storage.
    //this._storage = window.navigator.getDeviceStorage('pictures');
    this.handleStorage();

    window.setTimeout(this.delayedInit.bind(this), 1000);
  },

  getSettingsValue: function fota_settingValue(key, okCallback, errCallback) {
    var settings = window.navigator.mozSettings.createLock();
    var req = settings.get(key);
    req.onsuccess = function(result) {
      var value = req.result[key];
      okCallback(value);
    };
    req.onerror = errCallback;
  },

  handleDataChange: function fota_dataChange() {
    var self = this;

    debug('Handle Mobile data change');

    if (self._isWifiOnly === true || !self._dataManager ||
      self._dataManager.data.state !== 'registered') {
      self._isDataConnected = self._dataManager.data.connected;
      return;
    }

    debug('Handle Mobile data connected:' + self._dataManager.data.connected);
    /*wifi is First Priority*/
    if (self._isWifiConnected === true) {
      self._isDataConnected = self._dataManager.data.connected;
      return;
    }

    if (self._isDataConnected === self._dataManager.data.connected) {
      /*data contected not change,just go back*/
      return;
    } else {
      self._isDataConnected = self._dataManager.data.connected;
    }
    debug('Handle Mobile data changed, go on ...');
    if (self._isDataConnected === true) {
     self.showDataLinkTip();
    }
  },

  showDataLinkTip: function fota_dataTip() {
    debug('show data link tips');
    var self = this;
    this.getSettingsValue('fota.mobile-data-notification.disabled',
      function(isNotifed) {
        if (isNotifed === true) {
          return;
        }

        var params = {};
        if (self._dataManager.data.roaming) {
          params.msg = _('msg_roaming');
        }else {
          params.msg = _('msg_mobiledata_warning');
        }

        params.title = _('popup_dialog_title');
        showAttention(params);

        var settings = window.navigator.mozSettings;
        settings.createLock().set(
          {'fota.mobile-data-notification.disabled': true});

      },null);
  },

  handleStorage: function fota_storage() {
     var storages;
     var totalsize;
     var self;

     self = this;
     totalsize = 0;
     storages = null;

     storages = window.navigator.getDeviceStorages('sdcard');
     if (storages == null) {
         debug('There are no storages');
         return;
     }
     if (storages.length >= 1) {
         self._storage = storages[0];/*default storage is internal sdcard*/
         /*storages[1].freeSpace().onsuccess = (function(e) {
           debug('handleStorage:: Now the freeSpace: ' + e.target.result);
           totalsize =  e.target.result;
           if(totalsize > 0)
           {
               self._storage = storages[1];
               self._storageName = 'ext_sdcard';
           }
           else{
               self._storage = storages[0];
               self._storageName = 'int_sdcard';

               storages[1].usedSpace().onsuccess = (function(e) {
                   debug('handleStorage:: Now the usedSpace: ' +
                           e.target.result);

                   totalsize += e.target.result;

                   if(totalsize > 0){
                       self._storage = storages[1];
                   }
                   else{
                       self._storage = storages[0];
                   }

               }).bind(self);

           }

        }).bind(self);*/
     }
     /*else if(storages.length === 1){
         self._storage = storages[0];
     }*/
  },

  saveVersionInfo: function fota_saveInfo(result, store) {

    this._versionInfo.version_number = result.version_number;
    this._versionInfo.size = result.size;
    this._versionInfo.startDownload = result.startDownload;
    this._versionInfo.percentage = result.percentage;
    this._versionInfo.description = result.description;
    this._versionInfo.background = false;

    if (store != undefined && store === false) {
      return;
    }

    var settings = window.navigator.mozSettings;
    settings.createLock().set({'fota.version.info': result});
  },

  formatFileSize: function fota_formatSize(size) {
    var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
    var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);
    return sizeInfo.size + sizeInfo.unit;
  },

  getStoredVersionInfo: function fota_getVersion(success, failed) {
    var settings = window.navigator.mozSettings;
    if (!settings) {
      debug('getStoredVersionInfo:: Settings is not exist');
      return;
    }
    var req = settings.createLock().get('fota.version.info');
    req.onsuccess = function() {
      debug('getStoredVersionInfo:: getStoredVersionInfo success.');
      var result = req.result['fota.version.info'];
      if (!result) {
        debug('getStoredVersionInfo::failed');
        if (failed && typeof failed === 'function') {
          failed();
        }
      } else {
        if (success && typeof success === 'function') {
          success(result);
        }
      }
    };
    req.onerror = function() {
      if (failed && typeof failed === 'function') {
        failed();
      }
    };
  },

  updateInfoPanelEx: function fota_updateInfoPanel(result) {

    system_update_info_head.hidden = false;
    action_button.hidden = false;
    system_update_process_bar.value = 0;
    system_update_download_percentage.textContent = '0%';
    button_download_action.innerHTML = _('download');
    button_download_action.onclick = this.checkBeforeDownload.bind(this);
    system_update_version_desc.textContent = result.version_number;
    system_update_file_size_desc.textContent = _('size') +
      ': ' + this.formatFileSize(result.size);
    debug('updateInfoPanelEx:: starDownload: ' + result.startDownload +
        ' ' + result.percentage);
    if (result.percentage) {
      if (result.percentage === 100) {
        button_download_action.innerHTML = _('install');//'install';
        button_download_action.onclick = this.preInstall.bind(this);
        button_delete_action.disabled = false;
        //update_infomation_subline.textContent = _('msg_delete_package_new');
        //update_infomation_subline.hidden = false;
        this._status = 'check';/*update the action status*/
      }
      system_update_process_bar.value = result.percentage;
      system_update_download_percentage.textContent = result.percentage + '%';
    }

    if (result.startDownload === true) {
      system_update_info.className = 'download';
    }else {
      system_update_info.className = 'check';
    }
  },

  getMobileDataStatus: function fota_getMobileDataStatus(callback) {

    /*some time the mobileManager is null*/
    if (!this._dataManager || !this._dataManager.data.connected) {
      debug('getMobileDataStatus:: The status: disconnected');
      return 'disconnected';
    } else {
      debug('getMobileDataStatus:: The status: connected');
      return 'connected';
    }

  },

  wifiDisconnectedCb: function fota_wifiDisconnectedCb(actionStatus) {
    /*Modified  by tcl_baijian bug#625710:when wifi is closed,
     *we need pause the process of download.2014-03-20
    */
    if (actionStatus === 'Download' || actionStatus === 'Pause') {
      if (this._isWifiOnly) {
        this._status = actionStatus;/*update the action status*/
        this.pauseDisplay();
      } else {
        if (!this._dataManager || !this._dataManager.data.connected) {
           this._status = actionStatus;/*update the action status*/
           this.pauseDisplay();
        }
       }
      }
  },

  handleWifiStatusChange: function fota_handleWifiStatusChange(event) {
    debug('handleWifiStatusChange:: event.status: ' + event.status +
        ' event.network: ' + event.network);
    if (event && (event.status === 'connected')) {
      this._isWifiConnected = true;
    } else if (event.status === 'disconnected') {
      /*Modified by tcl_baijan other status do nothing*/
      //May be the wifi  is disconnected,we need to show popup in some cases.
      if (this._isWifiConnected === true) {

        this._isWifiConnected = false;
        if (this._isPopupShow) {
          return;
        }

        var self = this;
        self.getSettingsValue('ril.data.enabled', function(enable) {
          if (enable === true) {
            /*wait for 3s for data links contected*/
            window.setTimeout(function() {
              var result = self.getMobileDataStatus();
              if (result === 'disconnected') {
                showAttention({title: _('popup_dialog_title_attention'),
                  msg: _('popup_text_ConnectionFailed'), acceptCb: null});
              }
            }, 3000);
          } else {
            var result = self.getMobileDataStatus();
            if (result === 'disconnected') {
              showAttention({title: _('popup_dialog_title_attention'),
                msg: _('popup_text_ConnectionFailed'), acceptCb: null});
            }
          }
        },null);
      }
      this._isWifiConnected = false;
    }
  },

  touchCallback: function touchListener_callback(actionStatus) {
    var self = this;

    if (self._versionInfo.startDownload && self._versionInfo.percentage &&
      self._versionInfo.percentage === 100 && actionStatus != 'Download') {
        self._longPressTimeout = window.setTimeout(function() {
          var params = {};
          params.msg = _('msg_confirm_delete_update');
          params.accept_str = _('ok');
          params.acceptCb = function() {
            if (self._status === 'download') {
              return;
            }
            self.disableCheckUpdateMenu();
            self.sendFotaCommand('common', 'delete');
          };
          params.cancelCb = null;
          params.title = _('delete');
          showConfirm(params);
        }, 500);
    }
  },

  delayedInit: function fota_delayedInit() {
    var self = this;

    this.updateCheckUpdateMenu('updateMenu:init', false);

    this._storage.addEventListener('change',
        this.deviceStorageChangeHandler.bind(this));

    this.sendFotaCommand('common', 'GetAction');
    this._callback = function(action) {
        var self;
        self = this;
        if (action == 'Download') {
            var info = _('btn_pause');
            button_download_action.disabled = false;
            self.disableCheckUpdateMenu();
            button_download_action.innerHTML = info;
            button_download_action.onclick = this.pause.bind(this);
        }
    };

    this.initStorageCheck();

    menu_check_update.addEventListener('click',
        this.checkBeforeGetPackage.bind(this));
        button_delete_action.addEventListener('click',
          this.touchCallback.bind(this));
    var isFirst = true;
    SettingsListener.observe('language.current', '', function(event) {
      if (!isFirst) {
        self.handleLanguageChange();
      }
      isFirst = false;
    });
    /*move to the function::init*/
    SettingsListener.observe('fota.status.action', null, function(result) {
      debug('fota.status.action::value=' + result);
      if (!result) {
         return;
      } else {
        if (result.name === 'download') {
          debug('fota.status.action:: download.');
          if (self._status != null) {
            self.downloadDisplay();
          }
        }
        var settings = window.navigator.mozSettings.createLock();
        settings.set({'fota.status.action': null });
      }
    });

    SettingsListener.observe('fota.version.info', null, function(value) {
      if (!value) {
        return;
      } else {
        self.getStoredVersionInfo(function(result) {
          if (!result || !result.version_number || !result.size) {
            return;
          }
          debug('version_number: ' + result.version_number + ' size: ' +
            result.size + ' background: ' + result.background);
          if (result.background === true) {
            self.updateInfoPanelEx(result);
            self.saveVersionInfo(result, false);
          }
          //self.updateInfoPanelEx(result);
        },null);
      }
    });
    document.addEventListener('mozvisibilitychange',
        this.handleActivityEvent.bind(this));
  },

  handleLanguageChangeCb: function fota_handleLanguageChangeCb(actionStatus) {
    if (actionStatus === 'Download') {
      /*Fixed Pr:774235,wrong string resource id:pause*/
      if (this._status == 'check')
        button_download_action.innerHTML = _('install');
      else
        button_download_action.innerHTML = _('btn_pause');
    }else {
      if (this._versionInfo.startDownload &&
        this._versionInfo.percentage === 100) {
        button_download_action.innerHTML = _('install');
        button_delete_action.disabled = false;
        //update_infomation_subline.textContent =
        //                   _('msg_delete_package_new');
      } else {
        button_download_action.innerHTML = _('download');
      }
      system_update_file_size_desc.textContent = _('size') +
        ': ' + this.formatFileSize(this._versionInfo.size);
    }
    if (this._descInfo.states === 'updateMenu:getNewPackage' &&
      this._descInfo.ext === true) {
      check_update_desc.textContent = _('notify_new_version');
    }

    this.getSettingsValue('fota.auto-check-interval.current', function(value) {
      FotaSetting.FotaSettingsDesc('fota.auto-check-interval.current', value);
    },null);

    this.getSettingsValue('fota.reminder-interval.current', function(value) {
      FotaSetting.FotaSettingsDesc('fota.reminder-interval.current', value);
    },null);
  },

  handleLanguageChange: function fota_handleLanguageChange() {
    this.sendFotaCommand('common', 'GetAction');
    this._callback = this.handleLanguageChangeCb.bind(this);
  },

  onCommonCb: function fota_commonCb(actionType, isSuccess, errorType) {
    var errorStr = null;
    debug('onCommonCb:: ' + 'actionType: ' + actionType + 'isSuccess: ' +
      isSuccess + 'errorType: ' + errorType + '\n');

    //Activate check menu
    this.enableCheckUpdateMenu();
    /*when error occured,clear the status*/
    if (!isSuccess) this._status = null;
    switch (actionType) {
      case 'GetNewPackage':
        this.handleGetNewPackageFailed(errorType);
        break;
      case 'Download':
        if (!isSuccess) {
          this.handleDownloadFailed(errorType);
        } else {
          this.handleDownloadSuccess();
        }
        break;
      case 'Pause':
        if (isSuccess) {
          this.handleStopDownloadSuccess();
        }else {
          this.handleStopDownloadFailed(errorType);
        }
        break;
      case 'Delete':
        if (isSuccess) {
          this.handleDeletePackageSuccess();
        }
        break;
      case 'CheckFirmwarm':
        //tcl_lwj
        //acquire for cpu for bug 532900 528114
        //no matter fails or succeed we have to unlock CPU
        if (this._cpuWakelock != null) {
          this._cpuWakelock.unlock();
          this._cpuWakelock = null;
        }
        if (!isSuccess) {
          this.handleFirewarmCheckFailed(errorType);
        }else {
          this.handleFirewarmCheckSuccess();
        }
        break;
      case 'Install':
        if (!isSuccess) {
          this.handleInstallException(errorType);
        }
        break;
       /*received from system*/
      case 'GetAction':
        if (this._callback != null) {
          this._callback(isSuccess);
        }
        break;
    }
  },

  handleInstallException: function fota_handleException(errorType) {
    CustomProgress.hide();
    //When the diff package is not exist,we need to remove the process bar.
    if (errorType === 'DiffPackageUnavailableError' ||
      errorType === 'DiffPackageNotExistError') {
      this.handleDeletePackageSuccess();
    }
  },

  exceptionPauseCb: function fota_exceptionPaus(actionStatus) {
    debug('exceptionPauseCb:exceptionPauseCb' + actionStatus);
    if (actionStatus === 'Download') {
       this.pause();
    }
  },

  deviceStorageChangeHandler: function fota_deviceStorageChangeHandler(e) {
    switch (e.reason) {
      case 'available':
      //case 'unavailable':
      case 'shared':
        this.updateStorageState(e.reason);
        break;
    }

    if ('shared' == e.reason) {
      debug('deviceStorageChangeHandler:Pause ' +
          'the download process when sdcard shared');
      this.sendFotaCommand('common', 'GetAction');
      this._callback = this.exceptionPauseCb.bind(this);
    }
  },

  updateStorageState: function fota_updateStorageState(state) {
    switch (state) {
      case 'available':
        this._storageState = this.STORAGE_AVAILABLE;
        //this.checkStorageSpace(this._versionInfo.size + 100000);
        break;
      case 'unavailable':
        this._storageState = this.STORAGE_NOCARD;
        break;
      case 'shared':
        this._storageState = this.STORAGE_UNMOUNTED;
        break;
    }
    debug('updateStorageState:: state: ' + state + ' this._storageState: ' +
        this._storageState);
  },

  initStorageCheck: function fota_initStorageCheck() {
    debug('initStorageCheck::  entry.');
    var self = this;
    if (this._storageState === this.STORAGE_INIT) {
      this._storage.available().onsuccess = (function(e) {
        self.updateStorageState(e.target.result);
      }.bind(this));
      return;
    }
  },
/*
  checkStorageSpace: function fota_checkStorageSpace(size) {
    var self = this;
    if (this._storageState != this.STORAGE_AVAILABLE) {
      return;
    }
    this._storage.freeSpace().onsuccess = (function(e) {
      debug('checkStorageSpace:: Now the freeSpace: ' + e.target.result +
          ' need size:' + size);
      if (e.target.result < size) {
        self._storageState = this.STORAGE_CAPACITY;
      }else {
        self._storageState = this.STORAGE_AVAILABLE;
      }
    }).bind(this);
  },
*/
  showStorageStatus: function fota_showStorageStatus(status) {

    switch (status) {
      case this.STORAGE_NOCARD:
        this.showStorageAttention('nocard');
        break;
      case this.STORAGE_UNMOUNTED:
        this.showStorageAttention('pluggedin');
        break;
      case this.STORAGE_CAPACITY:
        this.showStorageAttention('nospace');
        break;
    }

  },

  showStorageAttention: function fota_showStorageAttention(id) {
    var title = _('popup_dialog_title_attention');

    var msg = null;
    switch (id) {
      case 'nocard':
        msg = _('msg_sdcard_not_exist');
        break;
      case 'pluggedin':
        msg = _('msg_download_failed_sdcard_rm');
        break;
      case 'nospace':
        msg = _('msg_sdcard_no_space');
        break;
    }
    showAttention({title: title, msg: msg, acceptCb: null});

    this.sendFotaCommand('common', 'GetAction');
    this._callback = this.exceptionPauseCb.bind(this);

  },
  onDownloadProgressCb: function fota_onDownloadProgressCb(completionRate) {
    var notification = '';

    debug('onDownloadProgressCb:: Completion rate:  ' + completionRate);

    if (completionRate <= 99) {
      system_update_download_percentage.textContent = completionRate + '%';
      system_update_process_bar.value = completionRate;
      button_download_action.disabled = false;
      /*when auto download,the button status not change*/
      var pause_info = _('btn_pause');
      if (button_download_action.innerHTML != pause_info &&
            this._status != 'pause') {
          button_download_action.innerHTML = pause_info;
          button_download_action.onclick = this.pause.bind(this);
          button_delete_action.disabled = true;
          update_infomation_subline.hidden = true;
      }
    }else {
      system_update_download_percentage.textContent = '99%';
      system_update_process_bar.value = 99;
      //button_delete_action.disabled = false;
      update_infomation_subline.hidden = false;
      update_infomation_subline.textContent = _('msg_checking_ongoing');
      button_download_action.innerHTML = _('install');
      button_download_action.disabled = true;
      this._status = 'check';/*update the action status*/
    }

    this._versionInfo.startDownload = true;
    this._versionInfo.percentage = completionRate;
    this.saveVersionInfo(this._versionInfo);
  },

  onGetNewPackageCb: function fota_getPackage(versionName, size, description) {
    this.updateCheckUpdateMenu('updateMenu:getNewPackage', true);
    this.handleGetNewPackageSuccess({version_number: versionName, size: size,
      startDownload: false, percentage: 0, description: description });
  },
  /*When press pause,then press download*/
  startDownloadAgain: function fota_DownloadAgain() {
    /*fixed Bug:656132 check network again when the last action is pause*/
    if (this.checkNetworkAvailable() == false) {
        return;
    }
    this.startDownload();
  },

  handleStopDownloadSuccess: function fota_handleStopDownloadSuccess() {
    /*Added by tcl_baijian change state*/
    var dld = _('download');
    if (dld != button_download_action.innerHTML) {
        button_download_action.innerHTML = dld;
        this.disableCheckUpdateMenu();
    }
    button_download_action.disabled = false;
    button_download_action.onclick = this.startDownloadAgain.bind(this);
  },

  handleDownloadFailed: function fota_handleDownloadFailed(error) {

    button_download_action.innerHTML = _('download');
    button_download_action.onclick = this.startDownloadAgain.bind(this);
    button_download_action.disabled = false;
  },

  handleDownloadSuccess: function fota_handleDownloadSucess() {

    button_download_action.innerHTML = _('btn_pause');
    button_download_action.onclick = this.pause.bind(this);
    button_delete_action.disabled = true;
    update_infomation_subline.hidden = true;

  },

  handleStopDownloadFailed: function fotaStopDownload(error) {

    button_download_action.disabled = false;
    button_download_action.innerHTML = _('btn_pause');
  },

  handleFirewarmCheckSuccess: function fota_handleFirewarmCheckSuccess() {
    /*make sure the button is install for Pr:774235*/
    button_download_action.innerHTML = _('install');
    button_download_action.disabled = false;
    button_delete_action.disabled = false;
    update_infomation_subline.hidden = true;
    system_update_process_bar.value = 100;
    system_update_download_percentage.textContent = '100%';
    button_download_action.onclick = this.preInstall.bind(this);
    //update_infomation_subline.textContent = _('msg_delete_package_new');
  },

  handleFirewarmCheckFailed: function fotaFireWarmCheckSFailed(error) {
    button_download_action.disabled = false;
    button_delete_action.disabled = false;
    update_infomation_subline.hidden = true;
    button_download_action.innerHTML = _('download');
    button_download_action.onclick = this.checkBeforeDownload.bind(this);
  },

  preInstall: function fotaPreInstall() {
   this.preCheckInternalSD();
  },

  preCheckInternalSD: function fotaPreCheckInternalSD() {
    debug('preCheckInternalSD' + this._storageState);
    if (this._storageState == this.STORAGE_AVAILABLE) {
      this.preCheckInstall();
    }else {
      debug('There are no storages');
      //dialog;
      this.showSharedInternalSD();
    }
  },

  showSharedInternalSD: function fotaShowSharedSDDialog() {
    var params = {};
    params.title = _('popup_dialog_title_attention');
    params.msg = _('msg_download_failed_sdcard_rm');
    params.acceptCb = null;
    showAttention(params);
  },

  preCheckInstall: function fotaPreCheckInstall() {
    var self = this;

    //Check user data space
    var deviceStorage = navigator.getDeviceStorage('apps');
    if (deviceStorage) {
      deviceStorage.freeSpace().onsuccess = (function(e) {
        debug('preInstall freeSpace: ' + e.target.result);
        if (e.target.result < 5 * 1024 * 1024) {
          self.install(false);
        }
        else {
          self.install(true);
        }
      }).bind(this);

      deviceStorage.freeSpace().onerror = (function() {
        self.install(true);
      }).bind(this);
    }
    else {
      install(true);
    }
  },

  install: function fotaInstall(appsSpaceAvailable) {
    var params = {};
    var self = this;

    //Check user data space
    if (appsSpaceAvailable === false) {
      params.title = _('popup_dialog_title_attention');
      params.msg = _('app-not-enough-space') + _('app-free-space', {
        value: 5,
        unit: _('byteUnit-MB')
      });
      params.acceptCb = null;
      showAttention(params);
      return;
    }

    //Check battery
    var isBatteryAvailable = isBatteryLevelAvailable();
    if (false === isBatteryAvailable) {
      params.title = _('popup_dialog_title_attention');
      params.msg = _('popup_text_battery_low');
      params.acceptCb = null;
      showAttention(params);
      return;
    }

    params.msg = _('popup_text_confirm_upgrade');
    params.accept_str = _('btn_continue');
    params.acceptCb = function() {
      self.disableCheckUpdateMenu();
      CustomProgress.show(_('check_before_upgrade'));
      /*Modified by tcl_baijian 2014-03-04  send command to system begin*/
      //navigator.mozJrdFota.install(self.onCommonCb.bind(self));
      self.sendFotaCommand('common', 'install');
      /*Modified by tcl_baijian 2014-03-04  send command to system end*/
    };
    params.cancelCb = null;
    params.title = _('popup_dialog_title');//'Note';//_('note');
    showConfirm(params);
  },

  handleDeletePackageSuccess: function fota_handleDeletePackageSuccess() {
    debug('handleDeletePackageSuccess: entry.');
    if (this._versionInfo != undefined) {
      if (this._versionInfo.version_number &&
        this._versionInfo.size) {
        this._versionInfo.startDownload = false;
        this._versionInfo.percentage = 0;
        this.updateInfoPanelEx(this._versionInfo);
      }
      this.saveVersionInfo(this._versionInfo);
    }
    button_delete_action.disabled = true;
    update_infomation_subline.hidden = true;
  },

  handleGetNewPackageSuccess: function fota_handleGetNewPackageSuccess(result)
  {
    var settings = window.navigator.mozSettings;
    if (this._versionInfo &&
      this._versionInfo.size &&
      this._versionInfo.version_number) {
        if (this._versionInfo.size != result.size ||
          this._versionInfo.version_number != result.version_number) {
          this.saveVersionInfo(result);
          this.updateInfoPanelEx(result);
          button_delete_action.disabled = true;
          update_infomation_subline.hidden = true;
        }
    } else {
      this.saveVersionInfo(result);
      this.updateInfoPanelEx(result);
    }
  },

  sendDownloadRequst: function fotaSendDownloadRequst() {

    debug('sendDownloadRequst:: download: ' + this._versionInfo.startDownload +
      ' percentage: ' + this._versionInfo.percentage + ' version_number:' +
        this._versionInfo.version_number);

    this._versionInfo.startDownload = true;

    system_update_info.className = 'download';
    system_update_download_percentage.textContent =
        this._versionInfo.percentage + '%';
    system_update_process_bar.value = this._versionInfo.percentage;
    system_update_version_desc.textContent = this._versionInfo.version_number;

    this.saveVersionInfo(this._versionInfo);
    this.startDownload();
  },
  /*Modified by tcl_baijian update display*/
  pauseDisplay: function fota_pause_display() {
      button_download_action.innerHTML = _('download');
      button_download_action.disabled = true;
      this.disableCheckUpdateMenu();

      //tcl_lwj
      //acquire for cpu for bug 532900 528114
      //unlock the wakelock when user pauses it.
      if (this._cpuWakelock != null) {
          this._cpuWakelock.unlock();
          this._cpuWakelock = null;
      }
  },
  /*Modified by tcl_baijian only send pause command*/
  pause: function fota_pause() {
    debug('pause:: entry.');
    this.pauseDisplay();
    this.sendFotaCommand('common', 'pause');
  },

  startDownload: function fota_startDownload() {
    debug('startDownload:: entry.');
    var self = this;
    if (this._storageState != this.STORAGE_AVAILABLE) {
      this.showStorageStatus(this._storageState);
      return;
    }
    var size = this._versionInfo.size *
        (1 - this._versionInfo.percentage / 100) +
        this._versionInfo.size * 2;
    if (this._storageState == this.STORAGE_AVAILABLE) {
      this._storage.freeSpace().onsuccess = (function(e) {
        debug('checkStorageSpace:: Now the freeSpace: ' + e.target.result +
          ' need size:' + size);
        if (e.target.result < size) {
          self.showStorageStatus(this.STORAGE_CAPACITY);
        }else {
          self.startDownload1();
        }
      }).bind(this);
    }
  },

  downloadDisplay: function fota_downloadDisplay() {
    //Disable check of update menu
    this.disableCheckUpdateMenu();

    button_download_action.innerHTML = _('btn_pause');
    button_download_action.disabled = true;
    button_download_action.onclick = this.pause.bind(this);
    button_delete_action.disabled = true;
    update_infomation_subline.hidden = true;
  },

  startDownload1: function fota_startDownload1() {
    //tcl_lwj
    //acquire for cpu for bug 532900 528114
    //DO REMEMBER TO UNLOCK WHEN DOWNLOADING FINISHED OR
    //SETTINGS CLOSED
    //this._cpuWakelock = navigator.requestWakeLock('cpu');
    //tcl_lwj end

    //Add download notification
    var settings = window.navigator.mozSettings;
    var notification = '=DwnRes=' + this._versionInfo.percentage;
    settings.createLock().set({'fota.notification.value': notification});

    this.downloadDisplay();

    this.sendFotaCommand('download', 'download');
  },

  checkBeforeGetPackageCb: function fota_checkBeforeGetPackageCb(actionStatus)
  {

      if (actionStatus != 'NoAction') {
          debug('checkBeforeGetPackage:: [Error] Another action:' +
              actionStatus + ' is running');
          return;
      }

      var result = this.checkNetworkAvailable();
      if (result === false) {
          return;
      }
      this.getNewpackage();
  },

  checkBeforeGetPackage: function fota_checkBeforeGetPackage() {
    debug('checkBeforeGetPackage:: entry.');
    this.sendFotaCommand('common', 'GetAction');
    this._callback = this.checkBeforeGetPackageCb;
  },

  getNewpackage: function fota_getNewPackage() {
    this.updateCheckUpdateMenu('updateMenu:searching', false);
    var notification = '=GnpRes=' + _('searching_info');
    var settings = window.navigator.mozSettings;
    settings.createLock().set({'fota.notification.value': notification});
    this.sendFotaCommand('getNewPackage', 'getNewPackage');
  },

  checkNetworkAvailable: function fota_checkNetworkAvailable(callback) {
    if (this._isWifiConnected) {
      return true;
    }
    if (this._isWifiOnly === true) {
      debug('checkNetworkAvailable:: Wifi only mode but wifi is off now.');
      showAttention({title: _('popup_dialog_title_attention'),
          msg: _('popup_text_warn_wifi_download'), acceptCb: null});
      return false;
    }else {
      var result = this.getMobileDataStatus(callback);
      if (result === 'connected') {
        return true;
      }else if (result === 'disconnected') {
        showAttention({title: _('popup_dialog_title_attention'),
            msg: _('popup_text_ConnectionFailed'), acceptCb: null});
        return false;
      }
      return false;
    }
  },


  checkRootFlag: function fotaCheckRootFlag(callback) {
    var self = this;
    var jrd = navigator.jrdExtension;
    var rootInfo = jrd.readNvitemRoot(1);
    rootInfo.onsuccess = function(e) {
      dump('Root Info = ' + rootInfo.result + '\n');
      if (rootInfo.result == '48') {
          if (callback && typeof callback === 'function') {
              callback();
          }
      } else {
        showAttention({title: _('popup_dialog_title'),
          msg: _('root_check_warning'),
          null: null});
      }
    };
    rootInfo.onerror = function(e) {
      dump('Get root info error');
    };
  },

  checkBeforeDownload: function fotaCheckBeforeDownload() {
    debug('checkBeforeDownload');
    this.checkNetworkandStorageDownload();
  },

  checkNetworkandStorageDownload: function fotaCheckNetandStorage() {
      if (this.checkNetworkAvailable()) {
        this.sendDownloadRequst();
      }
  },


  handleActivityEvent: function fota_handleActivityEvent() {
    debug('handleActivityEvent:: HandleActivityEvent entry.');

    if (document.hidden) {

      this._isPopupShow = false;

      debug('handleActivityEvent:: HandleActivityEvent document.hidden now.');
    }else if (!document.mozHidden) {
      this._isPopupShow = true;
      debug('handleActivityEvent:: handleActivityEvent entry ' +
          'and now isWifiConnected: ' + this._isWifiConnected);
    }
  },
/* Deleted by baijian Those function is nothing to so in setting
  handleInstallSuccess: function fota_handleInstallSuccess() {
    var notification = '';
    SettingsListener.getSettingsLock().set({'fota.version.info': null});

    notification = '=InsRes=' + _('notify_upgrade_successed');

    SettingsListener.getSettingsLock().set(
        {'fota.notification.value': notification});
  },

  handleInstallFailed: function fota_handleInstallFailed() {
    var notification = '';

    notification = '=InsRes=' + 'Firmware upgrade failed.';

    SettingsListener.getSettingsLock().set(
        {'fota.notification.value': notification});
  },
*/
  disableCheckUpdateMenu: function fot_diableCheckMenu() {
    menu_check_update.className = 'menu-item-disabled';
    check_update_desc.className = 'menu-item-disabled';
  },

  enableCheckUpdateMenu: function fot_enableCheckMenu() {
    menu_check_update.className = '';
    check_update_desc.className = '';
  },

  updateCheckUpdateMenu: function fot_updateMenu(result, success) {
    var updateDesc = null;
    var value = false;
    switch (result) {
      case 'updateMenu:init':
        value = true;
        break;
      case 'updateMenu:getNewPackage':
        if (success) {
          updateDesc = _('notify_new_version');
        }else {
          value = true;
        }
        button_download_action.disabled = false;
        this.enableCheckUpdateMenu();
        break;

      case 'updateMenu:searching':
        updateDesc = _('searching_info');
        button_download_action.disabled = true;
        this.disableCheckUpdateMenu();
        break;
    }
    if (value) {

      this.getSettingsValue('deviceinfo.os', function(os_version) {
        var svn = navigator.jrdExtension.readRoValue('ro.def.software.svn');
        updateDesc = _('brandShortName') + ' ' + os_version + '-' + svn;
        check_update_desc.textContent = updateDesc;
      },null);
    } else {
      check_update_desc.textContent = updateDesc;
    }
    this._descInfo.states = result;
    this._descInfo.ext = success;
  },

  //Handle checkFailed.
  handleGetNewPackageFailed: function fota_handleGetNewPackageFailed(result) {
    this.updateCheckUpdateMenu('updateMenu:getNewPackage', false);
  },
/*Added by tcl_baijian 2014-03-04 this funcation send command to system begin*/
  sendFotaCommand: function send2sys_fota_command(category, action) {
      var self;
      var comand2Sys;

      debug('send to system category:' + category + ' action:' + action);
      self = this;
      comand2Sys = {
          category: category,
          actionType: action
      };
      self._status = action;/*update the action status*/
      if (self._ports != null)
      {
          self._ports.forEach(function(port) {
              port.postMessage(comand2Sys);
          });
          return;
      }

      navigator.mozApps.getSelf().onsuccess = function(e) {
          var app = e.target.result;
          app.connect('fota-set-comms').then(function onConnAccepted(ports) {
              self._ports = ports;
              self._ports.forEach(function(port) {
                  port.postMessage(comand2Sys);
              });
          }, function onConnRejected(reason) {
              console.log('system is rejected fota command');
              console.log(reason);
          });
      };
  },
/*Added by tcl_baijian 2014-03-04 this funcation send command to system end*/
  uninit: function fota_uninit() {
    debug('uninit');
    var settings = window.navigator.mozSettings;
    var notification = '=cloBar=';
    /*Added by tcl_baijian 2014-03-04 when settings exit
    and notify to system begin*/
    this.sendFotaCommand('common', 'exit');
    /*Added by tcl_baijian 2014-03-04 when settings exit
    and tell to system end*/
    settings.createLock().set({'fota.notification.value': notification});
    //tcl_lwj
    //acquire for cpu for bug 532900 528114
    if (this._cpuWakelock != null) {
      this._cpuWakelock.unlock();
      this._cpuWakelock = null;
    }
  }
};

/*Added by tcl_baijian 2014-03-04 receive from system message begin*/
window.addEventListener('iac-fota-sys-comms', function(evt) {
    if (evt != null)
    {
        var msg = evt.detail;
        debug('category is ' + msg.category);
        switch (msg.category)
        {
            case 'common':
                Fota.onCommonCb(msg.actionType, msg.isSuccess, msg.errorType);
                break;
            case 'download':
                Fota.onDownloadProgressCb(msg.completeRate);
                break;
            case 'getNewPackage':
                Fota.onGetNewPackageCb(msg.versionNum, msg.size,
                    msg.discription);
                break;
            case 'downloadFromSetting':
                debug('receive download from setting');
                //checkBeforeDownload
                Fota.checkBeforeDownload();
                break;
            default :;
        }
    }
});
/*Added by tcl_baijian 2014-03-04 receive from system message end*/
navigator.mozL10n.once(Fota.init.bind(Fota));
window.addEventListener('unload', Fota.uninit.bind(Fota));
