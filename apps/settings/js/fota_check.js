'use strict';

function $(id) { return document.getElementById(id); }
var _ = navigator.mozL10n.get;
var menu_check_update = $('fota-menu-check-update');
var check_update_desc = $('check-update-desc');

var button_download_action = $('button-download-action');
var update_infomation_subline = $('update-infomation-subline');
var system_update_info = $('system-update-info');
var system_update_version_desc = $('system-update-version-desc');
var system_update_file_size_desc = $('file-size-desc');
var system_update_process_bar = $('download-progress-bar');
var system_update_download_percentage = $('download-percentage');
var system_update_info_head = $('system-update-info-header');
var Fota = {

  _settingCache: null,

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

  _isPopupShow: false,

  _descInfo: {states: '', ext: false},

  _cpuWakelock: null,
/*Added by tcl_baijian 2014-03-04 use apps communication begin*/
  _ports: null,
/*Added by tcl_baijian 2014-03-04 use apps communication end*/
/*Added by tcl_baijian 2014-03-11 move some function to system begin*/
  /*receive command "GetAction" and call callback*/
  _callback: null,
  /*long press time out handle*/
  _longPressTimeout: null,
  /*the action status,eg."Pause","Download","GetNewPackage"*/
  _status: null,
/*Added by tcl_baijian 2014-03-11 move some function to system end*/
  _storageName: null,/*current storage devices name*/

  init: function fota_init() {

    var self = this;
    var inited = false;

    this._settingCache = Settings.settingsCache;
    if (!this._settingCache) {
      debug('init:: Settings settingCache is not exist!');
      return;
    }
    //Get the version info.include 'version_name,size,description,
    //percentage,download'.

    var value = this._settingCache['fota.version.info'];

    if (value && value.version_number && value.size) {
      this.updateInfoPanelEx(value);
      this.saveVersionInfo(value, false);
    }
    /*Added by tcl_baijian notify system that settings is already enter begin*/
    this.sendFotaCommand('common', 'enter');
    /*Added by tcl_baijian notify system that settings is already enter end*/
    var wifiManager = window.navigator.mozWifiManager;
    if (wifiManager)
    {
        if (wifiManager.connection &&
            wifiManager.connection.status &&
            wifiManager.connection.status === 'connected') {
            this._isWifiConnected = true;
        }
        wifiManager.onstatuschange = this.handleWifiStatusChange.bind(this);
    }
    else
    {
        debug('wifiManager is null');
    }
    //Because when we disable the wifi only mode,we need
    //to show a popup screen.so here we add an observe.
    SettingsListener.observe('fota.wifi-only.enabled', true, function(value) {
      if (self._isWifiConnected) {
        return;
      }
      if (value === true) {
        if (!inited) {
          showAttention({title: _('popup_dialog_title_attention'),
              msg: _('popup_text_warn_wifi_download'), acceptCb: null});
        }else {
          showAttention({title: _('popup_dialog_title'),
              msg: _('popup_text_warn_wifi_check'), acceptCb: null});
        }
      }else {
        if (!inited) {
          var result = self.getMobileDataStatus(null);
          if (result === 'disconnected') {
            showAttention({title: _('popup_dialog_title_attention'),
                msg: _('popup_text_ConnectionFailed'), acceptCb: null});
          }
        }
      }
      inited = true;
      self._isWifiOnly = value;
    });

    //Init the storage state.
    this._storageState = this.STORAGE_INIT;
    //init the wifi manager.

    //init the storage.
    //this._storage = window.navigator.getDeviceStorage('pictures');
    this.handleStorage();

    window.setTimeout(this.delayedInit.bind(this), 1000);
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
        update_infomation_subline.textContent = _('msg_delete_package_new');
        update_infomation_subline.hidden = false;
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

    var mobileManager = window.navigator.mozMobileConnection;
    /*some time the mobileManager is null*/
    if (!mobileManager || !mobileManager.data.connected) {
      debug('getMobileDataStatus:: The status: disconnected');
      return 'disconnected';
    }

    var isNotifed =
        this._settingCache['fota.mobile-data-notification.disabled'];

    if (isNotifed === true) {
      debug('getMobileDataStatus:: The status: connected');
      return 'connected';
    }


    var params = {};
    if (mobileManager.data.roaming) {
      params.msg = _('msg_roaming');
    }else {
      params.msg = _('msg_mobiledata_warning');
    }
    //params.accept_str = 'Continue';
    params.accept_str = _('btn_continue');
    params.acceptCb = function() {
      if (callback && typeof callback === 'function') {
        callback();
      }
    };
    params.cancelCb = null;
    //params.title = 'Note';
    params.title = _('popup_dialog_title');
    showConfirm(params);

    var settings = window.navigator.mozSettings;
    settings.createLock().set(
        {'fota.mobile-data-notification.disabled': true});
    return 'pending_connected';
  },
  /*Added by tcl_baijian 2014-03-11 after get Action ,
  call this function begin*/
  wifiDisconnectedCb: function fota_wifiDisconnectedCb(actionStatus) {
    /*Modified  by tcl_baijian bug#625710:when wifi is closed,
     *we need pause the process of download.2014-03-20
    */
    if (actionStatus === 'Download' || actionStatus === 'Pause') {
      if (this._isWifiOnly) {
        this._status = action;/*update the action status*/
        this.pauseDisplay();
      } else {
        var mobileManager = window.navigator.mozMobileConnection;
        if (!mobileManager || !mobileManager.data.connected) {
           this._status = action;/*update the action status*/
           this.pauseDisplay();
        }
       }
      }
  },
  /*Added by tcl_baijian 2014-03-11 after get Action ,call this function end*/
  handleWifiStatusChange: function fota_handleWifiStatusChange(event) {
    debug('handleWifiStatusChange:: event.status: ' + event.status +
        ' event.network: ' + event.network);
    if (event && (event.status === 'connected')) {
      this._isWifiConnected = true;
    }else if (event.status === 'disconnected') {
      /*Modified by tcl_baijan other status do nothing*/
      //May be the wifi  is disconnected,we need to show popup in some cases.
      if (this._isWifiConnected === true) {
        //we need to stop the download when the wifi is disconnected.
        /*Modified by tcl_baijian 2014-03-11 get action and
        change synchronous to asynchronous begin*/
        this.sendFotaCommand('common', 'GetAction');
        this._callback = this.wifiDisconnectedCb;
        /*Modified by tcl_baijian 2014-03-11 get action and
          change synchronous to asynchronous end*/

        this._isWifiConnected = false;
        if (this._isPopupShow) {
          return;
        }
        if (this._isWifiOnly) {
          /*
          showAttention({title:'Attention',msg:'You have chosen Wi-Fi Only
          mode,please connect to Wi-Fi or disable Wi-Fi Only.',acceptCb:null});
           */
          showAttention({title: _('popup_dialog_title_attention'),
              msg: _('popup_text_warn_wifi_download'), acceptCb: null});
          return;
        }
        var result = this.getMobileDataStatus();
        if (result === 'disconnected') {
          showAttention({title: _('popup_dialog_title_attention'),
              msg: _('popup_text_ConnectionFailed'), acceptCb: null});
        }
      }
      this._isWifiConnected = false;
    }
  },
  /*Added by tcl-baijian 2014-03-11 when received the action and call begin*/
  touchCallback: function touchListener_callback(actionStatus) {
      var self = this;

      if (self._versionInfo.startDownload && self._versionInfo.percentage &&
          self._versionInfo.percentage === 100 && actionStatus != 'Download') {
          self._longPressTimeout = window.setTimeout(function() {
              var params = {};
              params.msg = _('msg_confirm_delete_update');
              params.accept_str = _('ok');
              params.acceptCb = function() {
                  self.disableCheckUpdateMenu();
                  /*Modified by tcl_baijian 2014-03-04
                    send command to system begin*/
                  //navigator.mozJrdFota.delete(self.onCommonCb.bind(self));
                  self.sendFotaCommand('common', 'delete');
                  /*Modified by tcl_baijian 2014-03-04
                   send command to system end*/
              };
              params.cancelCb = null;
              params.title = _('delete');
              showConfirm(params);
          }, 500);
      }
  },
  /*Added by tcl-baijian 2014-03-11 when received the action and call end*/
  delayedInit: function fota_delayedInit() {
    var self = this;

    this.updateCheckUpdateMenu('updateMenu:init', false);

    this._storage.addEventListener('change',
        this.deviceStorageChangeHandler.bind(this));
    /*Added by tcl_baijian 2014-03-11 first enter get action status and
    update the menu begin*/
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
    /*Added by tcl_baijian 2014-03-11 first enter get action status and
    update the menu end*/
    this.initStorageCheck();

    menu_check_update.addEventListener('click',
        this.checkBeforeGetPackage.bind(this));
    /*Added by tcl-baijian 2014-03-11 real time sync the action status begin*/
    system_update_info.addEventListener('touchstart', function() {
      debug('delayedInit:: touchstart');
      self.sendFotaCommand('common', 'GetAction');
      self._callback = self.touchCallback.bind(self);
    });

    system_update_info.addEventListener('touchend', function() {
      debug('delayedInit:: touchend entry.');
      window.clearTimeout(self._longPressTimeout);
    });
    /*Added by tcl-baijian 2014-03-11 real time sync the action status end*/
    //When the language changed,we need to reinit this page.
    var isFirst = true;
    SettingsListener.observe('language.current', '', function(event) {
      if (!isFirst) {
        self.handleLanguageChange();
      }
      isFirst = false;
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
        },null);
      }
    });
    document.addEventListener('mozvisibilitychange',
        this.handleActivityEvent.bind(this));
  },
  /*Modified by tcl_baijian 2014-03-11 when the language change ,
  after get action then call this function begin*/
  handleLanguageChangeCb: function fota_handleLanguageChangeCb(actionStatus) {

      if (actionStatus === 'Download') {
          button_download_action.innerHTML = _('pause');
      }else {
          if (this._versionInfo.startDownload &&
              this._versionInfo.percentage === 100) {
              button_download_action.innerHTML = _('install');
              update_infomation_subline.textContent =
                                  _('msg_delete_package_new');
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

      var ck_interval_desc =
          document.getElementById('auto-check-intervals-desc');
      var value = this._settingCache['fota.auto-check-interval.current'];
      var desc = '';
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

      ck_interval_desc.textContent = desc;
      var rem_interval_desc = document.getElementById(
                                         'reminder-intervals-desc');
      var rem_value = this._settingCache['fota.reminder-interval.current'];
      switch (Number(rem_value)) {
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
      rem_interval_desc.textContent = desc;
  },

  handleLanguageChange: function fota_handleLanguageChange() {
    this.sendFotaCommand('common', 'GetAction');
    this._callback = this.handleLanguageChangeCb.bind(this);
  },
  /*Modified by tcl_baijian 2014-03-11 when the language change ,
  after get action then call this function end*/

  /*Modified by tcl_baijian 2014-03-11 remove unuseful logic handle begin*/
  onCommonCb: function fota_commonCb(actionType, isSuccess, errorType) {
    var errorStr = null;
    debug('onCommonCb:: ' + 'actionType: ' + actionType + 'isSuccess: ' +
      isSuccess + 'errorType: ' + errorType + '\n');

    //Activate check menu
    this.enableCheckUpdateMenu();

    switch (actionType) {
      case 'GetNewPackage':
        this.handleGetNewPackageFailed(errorType);
        break;
      case 'Download':
        if (!isSuccess) {
          this.handleDownloadFailed(errorType);
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
  /*Modified by tcl_baijian 2014-03-11 remove unuseful logic handle end*/
  handleInstallException: function fota_handleException(errorType) {
    CustomProgress.hide();
    //When the diff package is not exist,we need to remove the process bar.
    if (errorType === 'DiffPackageUnavailableError' ||
      errorType === 'DiffPackageNotExistError') {
      this.handleDeletePackageSuccess();
    }
  },
  /*Added by tcl_baijian 2014-03-11 get action status and call begin*/
  exceptionPauseCb: function fota_exceptionPaus(actionStatus) {
    if (actionStatus === 'Donwload') {
       this.pause();
    }
  },
  /*Added by tcl_baijian 2014-03-11 get action status and call end*/
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
        this.checkStorageSpace(this._versionInfo.size + 100000);
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
    /*set storage devices now is unused*/
    //self.sendFotaCommand('common',this._storageName);
    if (this._storageState === this.STORAGE_INIT) {
      this._storage.available().onsuccess = (function(e) {
        self.updateStorageState(e.target.result);
        // Now call the parent method again, so that if the sdcard is
        // available we will actually verify that there is enough space on it
      }.bind(this));
      return;
    }
  },

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

  showStorageStatus: function fota_showStorageStatus() {

    switch (this._storageState) {
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
    }else {
      system_update_download_percentage.textContent = '99%';
      system_update_process_bar.value = 99;
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
    if (!versionName || !size) {
      this.handleGetNewPackageFailed('DataError');
      return;
    }
    this.updateCheckUpdateMenu('updateMenu:getNewPackage', true);
    this.handleGetNewPackageSuccess({version_number: versionName, size: size,
      startDownload: false, percentage: 0, description: description });
  },

  handleStopDownloadSuccess: function fota_handleStopDownloadSuccess() {
    /*Added by tcl_baijian change state*/
    var dld = _('download');
    if (dld != button_download_action.innerHTML) {
        button_download_action.innerHTML = dld;
        this.disableCheckUpdateMenu();
    }
    button_download_action.disabled = false;
    button_download_action.onclick = this.startDownload.bind(this);
  },

  handleDownloadFailed: function fota_handleDownloadFailed(error) {

    button_download_action.innerHTML = _('download');
    button_download_action.onclick = this.startDownload.bind(this);
    button_download_action.disabled = false;
  },

  handleStopDownloadFailed: function fotaStopDownload(error) {

    button_download_action.disabled = false;
    button_download_action.innerHTML = _('btn_pause');
  },

  handleFirewarmCheckSuccess: function fota_handleFirewarmCheckSuccess() {
    button_download_action.disabled = false;
    update_infomation_subline.hidden = false;
    system_update_process_bar.value = 100;
    system_update_download_percentage.textContent = '100%';
    button_download_action.onclick = this.preInstall.bind(this);
    update_infomation_subline.textContent = _('msg_delete_package_new');
  },

  handleFirewarmCheckFailed: function fotaFireWarmCheckSFailed(error) {
    button_download_action.disabled = false;
    button_download_action.innerHTML = _('download');
    button_download_action.onclick = this.checkBeforeDownload.bind(this);
  },

  preInstall: function fotaPreInstall() {
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
    /*Modified by tcl_baijian 2014-03-04  send command to system begin*/
    //navigator.mozJrdFota.pause(this.onCommonCb.bind(this));
    this.sendFotaCommand('common', 'pause');
    /*Modified by tcl_baijian 2014-03-04  send command to system end*/
  },

  startDownload: function fota_startDownload() {
    debug('startDownload:: entry.');
    //tcl_lwj add for bug 503590
    //check sdcard status first
    if ((this._storageState != this.STORAGE_AVAILABLE))
    {
      this.showStorageStatus();
      return;
    }
    //tcl_lwj end


    //tcl_lwj
    //acquire for cpu for bug 532900 528114
    //DO REMEMBER TO UNLOCK WHEN DOWNLOADING FINISHED OR
    //SETTINGS CLOSED
    this._cpuWakelock = navigator.requestWakeLock('cpu');
    //tcl_lwj end

    //Add download notification
    var settings = window.navigator.mozSettings;
    var notification = '=DwnRes=' + this._versionInfo.percentage;
    settings.createLock().set({'fota.notification.value': notification});

    //Disable check of update menu
    this.disableCheckUpdateMenu();

    button_download_action.innerHTML = _('btn_pause');
    button_download_action.disabled = true;
    button_download_action.onclick = this.pause.bind(this);
    update_infomation_subline.hidden = true;
    /*Modified by tcl_baijian 2014-03-04  send command to system begin*/
    /*navigator.mozJrdFota.download(this.onDownloadProgressCb.bind(this),
        this.onCommonCb.bind(this));*/
    this.sendFotaCommand('download', 'download');
    /*Modified by tcl_baijian 2014-03-04  send command to system end*/
  },

  checkBeforeGetPackageCb: function fota_checkBeforeGetPackageCb(actionStatus)
  {

      if (actionStatus != 'NoAction') {
          debug('checkBeforeGetPackage:: [Error] Another action:' +
              actionStatus + ' is running');
          return;
      }

      var result = this.checkNetworkAvailable(this.getNewpackage);
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
    /*Modified by tcl_baijian 2014-03-04  send command to system begin*/
    /*navigator.mozJrdFota.getNewPackage(this.onGetNewPackageCb.bind(this),
      this.onCommonCb.bind(this));*/
    this.sendFotaCommand('getNewPackage', 'getNewPackage');
    /*Modified by tcl_baijian 2014-03-04  send command to system end*/
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

  checkBeforeDownload: function fotaCheckBeforeDownload() {
    if (this.checkNetworkAvailable()) {
      if (this._storageState === this.STORAGE_AVAILABLE) {
        this.sendDownloadRequst();
      }else {
        this.showStorageStatus();
      }
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
      var os_version = this._settingCache['deviceinfo.os'];
      var svn = navigator.jrdExtension.readRoValue('ro.def.software.svn');
      updateDesc = _('brandShortName') + ' ' + os_version + '-' + svn;
    }
    this._descInfo.states = result;
    this._descInfo.ext = success;

    check_update_desc.textContent = updateDesc;
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
            default :;
        }
    }
});
/*Added by tcl_baijian 2014-03-04 receive from system message end*/
navigator.mozL10n.ready(Fota.init.bind(Fota));
window.addEventListener('unload', Fota.uninit.bind(Fota));
