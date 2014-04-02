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
    var clearButton = document.getElementById('nfcClear');
    var StartButton =document.getElementById('nfcStart');
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
      if (navigator.jrdExtension) {
        debug('lx:nfcEUTStop \n');
        navigator.jrdExtension.stopUniversalCommand();
      }
    };
    StartButton.onclick = function() {
      this.disabled = true;
     var totalTimes = $('inputTimes').value;
     var intervalTime =$('intervalTime').value;
      dump('lx:total time ' + totalTimes + '\n');
      var nfcStartCommand = '/system/bin/test_pn547  1 ' + intervalTime + ' ' + totalTimes;
        if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug('lx:nfc Run  ' + nfcStartCommand + '\n');
        var request = jrd.startUniversalCommand(nfcStartCommand, true);
          request.onsuccess = function() {
           // alert('success!');
            var sysVer = navigator.jrdExtension.fileRead('/data/test_pn547.txt');
            dump("lx: nfcEUTRun " + sysVer +'\n');
            $('successTimes').textContent = sysVer;
            $('nfcClear').disabled = false;
          }

          request.onerror = function(e) {
            alert('error!');
            $('nfcClear').disabled = false;
          };
      }
    };

  }

  return {
    init: init
  };
}());

NFCTest.init();

