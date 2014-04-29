/**
 * Created with JetBrains WebStorm.
 * User: tclxa
 * Date: 3/18/14
 * Time: 11:12 AM
 * To change this template use File | Settings | File Templates.
 */

function debug(msg) {
  dump('lx:-*-* nfc.js-*-* ' + msg + '\n');
}
var NFCTest = (function() {
  var totalTime;
  var successTime;
  function init() {
    var timeId;
    var clearButton = document.getElementById('nfcClear');
    var StartButton = document.getElementById('nfcStart');
     totalTime = 0;
     successTime = 0;


    clearButton.onclick = function() {
      dump('lx: clearButtom click \n');
      this.disabled = true;
      totalTime = 0;
      successTime = 0;
      //document.getElementById('totalTimes').textContent ="Total Times:   " +
      // totalTime;
      $('nfcStart').disabled = false;
      document.getElementById('successTimes').textContent =
        'Success Times:   ' + successTime;
      var wirteCommand = 'echo \"stop\" > ' + '/data/nfc_pcd.txt';
      if (navigator.jrdExtension) {
        debug('lx:nfcEUTStop \n');
        //var request= navigator.jrdExtension.stopUniversalCommand();
        var request = navigator.jrdExtension.startUniversalCommand(wirteCommand, true);
        request.onsuccess = function(msg) {
            dump('lx:stop onsuccess ' + msg);
         // var wirteCommand = 'echo \"\" > ' + '/data/nfc_pcd.txt';
        };
        request.onerror = function(msg) {
          dump('lx:stop error ' + msg);
        };
      }
    };
    StartButton.onclick = function() {

     var totalTimes = $('inputTimes').value;
     var intervalTime = $('intervalTime').value;
      dump('lx:total time ' + totalTimes + '\n');
      if (totalTimes && intervalTime) {
        this.disabled = true;
      var nfcStartCommand = '/system/bin/test_pn547  1 ' + intervalTime + ' ' + totalTimes + ' > /data/nfc.txt';
        if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug('lx:nfc Run  ' + nfcStartCommand + '\n');
        var request = jrd.startUniversalCommand(nfcStartCommand, true);
          request.onsuccess = function() {
            dump('lx:NFC PCD Test Success!!!');
            var sysVer = navigator.jrdExtension.fileRead('/data/test_pn547.txt');
            dump('lx: nfcEUTRun ' + sysVer + '\n');
            $('successTimes').textContent = sysVer;
            //$('nfcClear').disabled = false;
            clearInterval(timeId);
          };

          request.onerror = function(e) {
            alert('error!');
            $('nfcClear').disabled = false;
          };
      }
      timeId = setInterval(function() {
        var value = navigator.jrdExtension.fileRead('/data/test_pn547.txt');
        dump('lx: nfcEUTRun ' + value + '\n');
        $('successTimes').textContent = value;
        $('nfcClear').disabled = false;
      }, 2000);
    } else {
      alert('input has no value!!');
      }

    };

  }

  return {
    init: init
  };
}());

NFCTest.init();

