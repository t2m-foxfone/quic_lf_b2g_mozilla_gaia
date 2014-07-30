/* move to fota_util.js
var DEBUG = true;

if (DEBUG) {
  var debug = function(str) {
    dump('-*-JRD_Fota-*-' + '(System): ' + str + '\n');
  };
}else {
  var debug = function(str) {};
}
*/
var JrdFotaNotifiCation = {
  TRANSITION_SPEED: 1.8,
  TRANSITION_FRACTION: 0.30,

  init: function fn_init() {
    var self = this;
    this.notifContainer =
         document.getElementById('fota-manager-container');

    debug('init:: notifContainer.children' + this.notifContainer.children);

    this.clearAllButton = document.getElementById('notification-clear');
    this.clearAllButton.addEventListener('click', this.clearAll.bind(this));
    this.node = null;

    debug('init:: entry.');

    this.notifContainer.onclick = this.handleOpenApp.bind(this);


    SettingsListener.observe('fota.notification.value', null, function(value) {
      debug('fota_notification:: init. Handle the notification value ' +
            'changed: ' + value);
      self.notificationValue = value;
      if (!value) {
        return;
      }else {
        var result = new String(value);
        var origin = result.slice(0, 8);
        var msg = result.slice(8, result.length);
        debug('origin:: ' + origin + ' msg:' + msg);
        self.updateNotification({origin: origin, msg: msg});
      }
      var settings = window.navigator.mozSettings;
      settings.createLock().set({'fota.notification.value': null});
    });
   },

   addNotification: function fn_addNotification(param) {
     var downloading = false;
     if (!param) {
       debug('addNotification:: The param is not exist.');
       return;
     }
     //Here we need to keep the notification is only one, so we need to
     //the last one when we want to add one.
     this.removeNotification();
     if (!this.notifContainer.classList.contains('displayed')) {
       this.notifContainer.classList.add('displayed');
     }
     var newNotif =
       '<div class = "fake-notification">' +
        '<div class="icon">' +
        '</div>' +
        '<div class="percentage">' +
        '</div>' +
        '<div class="title">' +
        '</div>' +
        '<div class="progress">' +
         '<progress value=0 max=100></progress>' +
        '</div>' +
        '<div class = "message">' +
        '</div>';
       '</div>';

     this.notifContainer.insertAdjacentHTML('afterbegin', newNotif);

     var newNode = this.notifContainer.firstElementChild;

     debug('title: ' + param.title + '  message: ' + param.message);
     newNode.querySelector('.percentage').textContent = param.percentage + '%';
     newNode.querySelector('.title').textContent = param.title;
     var process = newNode.querySelector('.progress').firstElementChild;
     var message = newNode.querySelector('.message');
     /*if param.percentage is undefined,
     there will be an error:not a finite floating-point value*/
     if (param.percentage)
     {
         process.value = param.percentage;
     }
     message.textContent = param.message;

     if (param.downloading != undefined) {
       param.downloading ? this.notifContainer.classList.add('downloading') :
        this.notifContainer.classList.remove('downloading');
       downloading = param.downloading;
     }
     this.node = newNode;

     if (this.downloading === true && !downloading) {
       StatusBar.decSystemDownloads();
     }else if (downloading) {
       StatusBar.incSystemDownloads();
     }
     this.downloading = downloading;

     NotificationScreen.incExternalNotifications();
   },

   removeNotification: function fn_removeNotification() {

     if (this.notifContainer.classList.contains('downloading')) {
       this.notifContainer.classList.remove('downloading');
     }
     if (this.notifContainer.classList.contains('displayed')) {
       this.notifContainer.classList.remove('displayed');
       NotificationScreen.decExternalNotifications();
     }
     if (!this.node) {
       return;
     }

     if (this.downloading === true) {
       StatusBar.decSystemDownloads();
       this.downloading = false;
     }
     this.node.parentNode.removeChild(this.node);
     this.node = null;
   },
   updateNotification: function fn_updateNotification(param) {
    debug('updateNotification param: ' + JSON.stringify(param));
    if (param && param.origin) {
      if (param.origin === '=cloBar=') {
       if (this.downloading === true) {
         StatusBar.decSystemDownloads();
         this.downloading = false;
       }
      }
      else {
        var result = {};
        result.title = navigator.mozL10n.get('fota_mng_title2');
        if (param.origin === '=DwnRes=') {
          result.percentage = Number(param.msg);
          result.downloading = true;
        }else {
          result.message = param.msg;
        }
        debug('updateNotification: percentage:' + result.percentage +
              ' downloading' + result.downloading);
        this.addNotification(result);
      }
    }
  },
  clearAll: function fn_clearAll() {
     this.removeNotification();
  },

  openFota: function ns_openApp() {
    var activity = new MozActivity({
            name: 'configure',
            data: {
              target: 'device',
              section: 'systemUpdate'
            }
          });
  },

  handleOpenApp: function ns_tap() {

    this.openFota();
    this.removeNotification();
    UtilityTray.hide();
  }
};


JrdFotaNotifiCation.init();

