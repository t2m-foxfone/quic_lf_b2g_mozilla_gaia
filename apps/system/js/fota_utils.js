'use strict';
var DEBUG = true;

if (DEBUG) {
 var debug = function(str) {
   dump('-*-JRD_Fota-*-' + '(System): ' + str + '\n');
 };
}else {
 var debug = function(str) {};
}

var Fota_CustomDialog = (function() {

  var screen = null;
  var dialog = null;
  var header = null;
  var message = null;
  var yes = null;
  var no = null;
  var section = null;

  return {
    hide: function dialog_hide() {
      if (screen === null)
        return;
      debug('Fota_CustomDialog:: Hide Entry.');
      document.body.removeChild(screen);
      screen = null;
      dialog = null;
      header = null;
      message = null;
      section = null;
      yes = null;
      no = null;
    },

    /**
    * Method that shows the dialog
    * @param  {String} title the title of the dialog. null or empty for
    *                        no title.
    * @param  {String} msg message for the dialog.
    * @param  {Object} cancel {title, callback} object when confirm.
    * @param  {Object} confirm {title, callback} object when cancel.
    */
    show: function dialog_show(title, msg, cancel, confirm) {
      debug('Fota_CustomDialog:: Show Entry.');
      if (screen === null) {
        screen = document.createElement('form');
        screen.setAttribute('role', 'dialog');
        screen.setAttribute('data-type', 'confirm');

        section = document.createElement('section');
        section.style.overflowY = 'hidden';
        screen.appendChild(section);


        if (title && title != '') {
          header = document.createElement('h1');
          header.id = 'dialog-title';
          header.textContent = title;
          section.appendChild(header);
        }

        message = document.createElement('p');
        message.id = 'dialog-message';
        section.appendChild(message);

        var menu = document.createElement('menu');
        menu.dataset['items'] = 1;

        no = document.createElement('button');
        var noText = document.createTextNode(cancel.title);
        no.appendChild(noText);
        no.id = 'dialog-no';
        no.addEventListener('click', clickHandler);
        menu.appendChild(no);

        if (confirm) {
          menu.dataset['items'] = 2;
          yes = document.createElement('button');
          var yesText = document.createTextNode(confirm.title);
          yes.appendChild(yesText);
          yes.id = 'dialog-yes';
          yes.className = 'danger';
          yes.addEventListener('click', clickHandler);
          menu.appendChild(yes);
        }else {
          no.className = 'full';
        }

        screen.appendChild(menu);

        document.body.appendChild(screen);
        debug('Fota_CustomDialog:: Show End.');
      }

      // Put the message in the dialog.
      // Note plain text since this may include text from
      // untrusted app manifests, for example.
      message.textContent = msg;

      // Make the screen visible
      screen.classList.add('visible');

      // This is the event listener function for the buttons
      function clickHandler(evt) {

        // Hide the dialog
        screen.classList.remove('visible');

        // Call the appropriate callback, if it is defined
        if (evt.target === yes && confirm.callback) {
          confirm.callback();
        } else if (evt.target === no && cancel.callback) {
          cancel.callback();
        }
      }
    }
  };
}());
/*
var CustomProgress = (function() {

  var screen = null;
  var progress = null;
  var header = null;
  var p = null;
  var section = null;

  return {
    hide: function dialog_hide() {
      if (screen === null)
        return;
      debug('CustomProgress:: Hide Entry.');
      document.body.removeChild(screen);
      screen = null;
      section = null;
      progress = null;
      header = null;
      p = null;
    },

    show: function progress_show(title) {
      if (screen === null) {
        screen = document.createElement('form');
        screen.setAttribute('role', 'dialog');
        screen.setAttribute('data-type', 'confirm');

        section = document.createElement('section');
        section.style.overflowY = 'hidden';
        screen.appendChild(section);

        if (title && title != '') {
          header = document.createElement('h1');
          header.textContent = title;
          section.appendChild(header);
        }
        p = document.createElement('p');
        p.style.textAlign = 'center';
        progress = document.createElement('progress');
        p.appendChild(progress);
        section.appendChild(p);

        document.body.appendChild(screen);
      }

      // Make the screen visible
      screen.classList.add('visible');
    }
  };
}());
*/

//show confirm screen.
function showConfirm(params) {
  var acceptObject = {
    title: params.accept_str,
    callback: function onAccept() {
      Fota_CustomDialog.hide();
      if (typeof params.acceptCb === 'function') {
        params.acceptCb();
      }
    }
  };

  var cancelObject = {
    title: _('cancel'),
    callback: function onCancel() {
      if (typeof params.cancelCb === 'function') {
        params.cancelCb();
      }
      Fota_CustomDialog.hide();
    }

  };

  Fota_CustomDialog.show(params.title, params.msg, cancelObject, acceptObject);
}

function showAttention(params) {
  debug('showAttention:: Entry.');
  var btnObject = {
    title: _('ok'),
    callback: function onAccept() {
        Fota_CustomDialog.hide();
      if (typeof params.acceptCb === 'function') {
        params.acceptCb();
      }
    }
  };
  Fota_CustomDialog.show(params.title, params.msg, btnObject);
}

function showDialog(title, msg, cb) {
  debug('showDialog:: Entry.');
  var btnObject = {
    title: 'OK',
    callback: function onAccept() {
      Fota_CustomDialog.hide();
      if (typeof cb === 'function') {
        cb();
      }
    }
  };
  Fota_CustomDialog.show(title, msg, btnObject);
}
/*
function isBatteryLevelAvailable() {
  var battery = window.navigator.battery;
  if (!battery) {
    debug('isBatteryLevelAvailable:: Could not get window.navigator.battery');
    return false;
  }
  var level = Math.min(100, Math.round(battery.level * 100));
  debug('isBatteryLevelAvailable:: Now BatteryLevel: ' + level);
  if (level < 30) {
    return false;
  }else {
    return true;
  }
}
*/
