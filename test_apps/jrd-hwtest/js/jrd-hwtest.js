'use strict';
function debug(msg) {
 dump('-*-*jrd-hwtest.js -*-* ' + msg);
}
function $(id) {
  return document.getElementById(id);
}

var JrdHwtest = {
  init: function jrdHwTestInit() {
    var nfcStop = navigator.jrdExtension.fileRead('/system/bin/nfc_stop');
    dump('lx:nfcStop ' + nfcStop +'\n');
    var listItem = document.querySelector('#root ul');
    var nfcItem =$('nfcItem');
    if(nfcStop == ''||nfcStop == null) {
      listItem.removeChild(nfcItem);
    }
    this.pageChangeHandler();
    this.fireEvent();
  },
  pageChangeHandler: function jrdHwTestPageChangeHandler() {
    this.initWifiTxRateOptions();
    var pageLinks = document.getElementsByTagName('a');
    for (var i = 0; i < pageLinks.length; i++) {
      var link = pageLinks[i];
      link.addEventListener('click', function() {
        var url = this.href;
        var index = url.indexOf('#');
        var sectionId = url.substr(index + 1);
        console.log('lx: sectionId ' + sectionId + '\n');
        //if(sectionId=="wifiTx") {
        switch (sectionId) {
          case 'wifiTx':
          case 'wifiRx':
          var initCommand = '/system/bin/wifitest power ' +
            ' > /data/wifitext.txt';
            if (navigator.jrdExtension) {
              var jrd = navigator.jrdExtension;
              debug('lx: wifiTx  initCommand ' + initCommand + '\n');
              var initRequest = jrd.startUniversalCommand(initCommand, true);
            }
            break;
          case 'bluetoothTx':
            //var initCommand = "/system/bin/btTx_test bttest enable; "
            // + "/system/bin/btTx_test  bttest is_enabled " +
            // " > /data/btTx_test.txt";
            var initCommand = '/system/bin/btTx_start' +
              ' > /data/btTx_start.txt';
	          if (navigator.jrdExtension) {
              var jrd = navigator.jrdExtension;
              debug('lx: bluetoothTx  initCommand ' + initCommand + '\n');
              var initRequest = jrd.startUniversalCommand(initCommand, true);
             }
            break;
          case 'nfc':
            var initCommand ='/system/bin/nfc_stop' + ' > /data/nfc_stop.txt';
            if (navigator.jrdExtension) {
              var jrd = navigator.jrdExtension;
              debug('lx: nfc-eut  initCommand ' + initCommand + '\n');
              var initRequest = jrd.startUniversalCommand(initCommand, true);
            }
            break;
          case 'nfc-pcd':
            var nfcStart ='/system/bin/nfc_start';
            if (navigator.jrdExtension) {
              var jrd = navigator.jrdExtension;
              debug('lx: nfc-pcd  initCommand ' + nfcStart + '\n');
              var initRequest = jrd.startUniversalCommand(nfcStart, true);
            }
            break;
          default :
            break;
        }
        //}
        var sections = document.getElementsByTagName('section');
        for (var j = 0; j < sections.length; j++) {
          var section = sections[j];
          if (section.id != sectionId) {
            section.style.display = 'none';
          } else {
            section.style.display = 'block';
          }
        }
      });
    }
  },
  fireEvent: function jrdHwTestFireEvent() {
    //window.navigator.mozSettings.createLock().set({
      //'screen.timeout' : 9999999
    //});
    if (navigator.requestWakeLock)
    {
      navigator.requestWakeLock('screen');
    }

    window.navigator.mozSettings.createLock().set({
      'devtools.debugger.remote-enabled' : true
    });
    window.navigator.mozSettings.createLock().set({
      'ril.data.enabled' : true
    });

    var _self = this;
//    $('wifi-back').onclick = function() {
//      var stopCommand = '/system/bin/wifitest tx stop' +
//        ' > /data/wifitext.txt';
//      if (navigator.jrdExtension) {
//        var jrd = navigator.jrdExtension;
//        console.log('lx: wifi-back ' + stopCommand + '\n');
//        var request = jrd.startUniversalCommand(stopCommand, false);
//      }
//    };
    $('wifiRateType').addEventListener('change', function() {
      _self.initWifiTxRateOptions();
    });
    $('wifiTxRun').addEventListener('click', function() {
      this.disabled = true;
      var channelIndex = $('channelSelect').selectedIndex;
      var channel = $('channelSelect').options[channelIndex].value;
      var powderIndex = $('txPowerSelect').selectedIndex;
      var txPower = $('txPowerSelect').options[powderIndex].value;
      var protocolIndex = $('wifiRateType').selectedIndex;
      var protocolType = $('wifiRateType').options[protocolIndex].value;
      var rateIndex = $('wifiRate').selectedIndex;
      var wifiRate = $('wifiRate').options[rateIndex].value;
      debug('lx:wifiRate ' + wifiRate);
      var runCommand = _self.getTxWifiRunCommand(protocolType,
        channel, txPower, wifiRate);
      $('wifiTxStop').disabled = false;
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
      debug('lx: runCommand ' + runCommand + '\n');
        var request = jrd.startUniversalCommand(runCommand, true);
      }
    });
    $('wifiTxStop').addEventListener('click', function() {
      this.disabled = true;
      var stopCommand = '/system/bin/wifitest tx stop' + ' > /data/wifitext_stop.txt';
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug("lx: stopCommand "+ stopCommand + "\n");
        var request = jrd.startUniversalCommand(stopCommand, true);
      }
      $('wifiTxRun').disabled = false;
    });

    $('wifiRxRun').addEventListener('click', function() {
      this.disabled = true;
      var channelIndex = $('rxChannelSelect').selectedIndex;
      var channel = $('rxChannelSelect').options[channelIndex].value;
      var rxRun = '/system/bin/wifitest tx cmd ' + channel;
      $('wifiRxStop').disabled = false;
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug('lx: runCommand ' + rxRun + '\n');
        var request = jrd.startUniversalCommand(rxRun, true);
      }
    });
    $('wifiRxStop').addEventListener('click', function() {
      this.disabled = true;
      var stopCommand = '/system/bin/wifitest tx stop' +
        ' > /data/wifitext.txt';
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        dump('lx:rxStop  ' + stopCommand + '\n');
        var request = jrd.startUniversalCommand(stopCommand, false);
      }
      $('wifiRxRun').disabled = false;
    });

//    $('wifiRx-back').onclick = function() {
//      var stopCommand = '/system/bin/wifitest tx stop' +
//        ' > /data/wifitext.txt';
//      if (navigator.jrdExtension) {
//        var jrd = navigator.jrdExtension;
//        console.log('lx: wifi-back ' + stopCommand + '\n');
//        var request = jrd.startUniversalCommand(stopCommand, false);
//      }
//    };

    $('btTxHop').addEventListener('change',function() {
      var btTxHopIndex =$('btTxHop').selectedIndex;
      var btTxHop =$('btTxHop').options[btTxHopIndex].value;
      dump('lx: btTxHopIndex '+btTxHopIndex+'btTxHop value ' + btTxHop +'\n');
      if(btTxHop =='0x01') {
        dump('lx:add disable');
        $('btChannelItem').classList.add('disable');
       // $('btChannel').classList.add('disable');
        $('btTxChannel').selectedIndex = 0;
      } else {
        if($('btChannelItem').classList.contains('disable'))
          $('btChannelItem').classList.remove('disable');
        dump('lx:remove disable');
//        if($('btChannel').classList.contains('disable'))
//          $('btChannel').classList.remove('disable');
      }
    });
    $('btTxRun').addEventListener('click', function() {
      var patternIndex = $('btTxPattern').selectedIndex;
      var btTxPattern = $('btTxPattern').options[patternIndex].value;
      var channelIndex = $('btTxChannel').selectedIndex;
      var btTxChannel = $('btTxChannel').options[channelIndex].value;
      var packet = $('btTxPacketType').selectedIndex;
      var btTxPacketType = $('btTxPacketType').options[packet].value;
      var whiteningIndex = $('btTxWhitening').selectedIndex;
      var btTxWhitening = $('btTxWhitening').options[whiteningIndex].value;
      var powerIndex = $('btTxPower').selectedIndex;
      var btTxPower = $('btTxPower').options[powerIndex].value;
      var rxGainIndex = $('btTxRxGain').selectedIndex;
      var btTxRxGain = $('btTxRxGain').options[rxGainIndex].value;
      var btTxHopIndex =$('btTxHop').selectedIndex;
      var btTxHop =$('btTxHop').options[btTxHopIndex].value;



      //var runCommand = _self.getTxBTRunCommand(btTxPattern, btTxChannel, btTxPacketType, btTxWhitening, btTxPower, btTxRxGain);
      var  txRunCommand = '/system/bin/btTx_run ' + btTxChannel + ' ' + btTxPattern + ' ' + btTxPacketType + ' ' + btTxWhitening + ' ' + btTxPower + ' ' + btTxRxGain + ' ' + btTxHop;
      this.disabled = true;
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug('lx: btTxRun runCommand ' + txRunCommand + '\n');
        var request = jrd.startUniversalCommand(txRunCommand, true);
        request.onsuccess = function(e) {
          alert('success!');
          $('btTxRun').disabled = false;
        };
        request.onerror = function(e) {
          alert('error!');
          $('btTxRun').disabled = false;
        };
      }
    });
    $('btTx-back').onclick = function() {
       var btDisable = 'bttest disable';
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        console.log('lx: bluetooth-back ' + btDisable + '\n');
        var request = jrd.startUniversalCommand(btDisable, false);
      }

    };
    $('gpsTest1Run').addEventListener('click', function() {
      this.disabled = true;
      var runCommand = '/system/bin/gps_test 1 0';
      $('gpsTest1Stop').disabled = false;
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug('lx:gpsTest1Run runCommand ' + runCommand + '\n');
        var request = jrd.startUniversalCommand(runCommand, true);
      }
    });
    $('gpsTest1Stop').addEventListener('click', function() {
      this.disabled = true;
      var stopCommand = '/system/bin/wifitest stop';
      if (navigator.jrdExtension) {
        debug('lx:gpsTest1Stop stopCommand ' + stopCommand + '\n');
        navigator.jrdExtension.stopUniversalCommand();
      }
      $('gpsTest1Run').disabled = false;
    });
    //BT RADIO TEST BEGIN
    $('btRadioTestRun').addEventListener('click', function() {
      this.disabled = true;
      $('btRadioTestStop').disabled = false;   
      var bttestCommand = '/system/bin/bt_radio_run ' + ' > /data/bt_radio_run.txt';
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug('lx:btRadioTestRun runCommand ' + bttestCommand + '\n');
        var request = jrd.startUniversalCommand(bttestCommand, true);
      }
    });
    $('btRadioTestStop').addEventListener('click', function() {
      this.disabled = true;
      var stopCommand = '/system/bin/bt_radio_stop';
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug('lx:btRadioTestStop stopCommand ' + stopCommand + '\n');
        var request = jrd.startUniversalCommand(stopCommand, true);
      }
      $('btRadioTestRun').disabled = false;
    });
    //BT RADIO TEST ENE

    var count, type;
    $('gpsTest2Cold').addEventListener('click', function() {

      count = 0;
      type = 'cold';
      runTest();
      disableButtonGPSTest2();
    });
    $('gpsTest2Hot').addEventListener('click', function() {

      count = 0;
      type = 'hot';
      runTest();
      disableButtonGPSTest2();
    });
    $('gpsTest2Warm').addEventListener('click', function() {
      count = 0;
      type = 'warm';
      runTest();
      disableButtonGPSTest2();
    });

    $('nfcEUTRun').addEventListener('click', function() {
      var index = $('nfcRunTest').selectedIndex;
      var value = $('nfcRunTest').options[index].value;
      var nfcRunCommand = '/system/bin/test_pn547  ' + value;

      this.disabled = true;
      $('nfcEUTStop').disabled = false;
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        debug('lx:nfc Run  ' + nfcRunCommand + '\n');
        var request = jrd.startUniversalCommand(nfcRunCommand, true);
      }
    });

    $('nfcEUTStop').addEventListener('click', function() {
      if (navigator.jrdExtension) {
        debug('lx:nfcEUTStop \n');
        navigator.jrdExtension.stopUniversalCommand();
      }
      this.disabled = true;
      $('nfcEUTRun').disabled = false;
    });

    function disableButtonGPSTest2() {
      $('rst_gpstest2').innerHTML = type + '  testing.....(0)';
      $('gpsTest2Cold').disabled = true;
      $('gpsTest2Warm').disabled = true;
      $('gpsTest2Hot').disabled = true;
    }

    function enableButtonGPSTest2() {
      $('gpsTest2Cold').disabled = false;
      $('gpsTest2Warm').disabled = false;
      $('gpsTest2Hot').disabled = false;
    }

    function closeGPS() {
      window.navigator.mozSettings.createLock().set({
        'geolocation.enabled' : false
      });
    }

    function openGPS() {
      window.navigator.mozSettings.createLock().set({
        'geolocation.enabled' : true
      });
    }

    function closeShell() {
      try {
        navigator.jrdExtension.stopUniversalCommand();
      } catch(e) {
      }
    }

    var result = '';
    var result2 = '';
    var filename = '';
    var total = 60;
    var id;
    var geolocation = navigator.geolocation;
    var timeBegin = 0;
    var timeEnd = 0;
    var options = {
      enableHighAccuracy : true,
      timeout : 50000,
      maximumAge : 0
    };

    function success(pos) {
      if (id != undefined) {
        if(30 <= pos.coords.accuracy){
          return;
        }
        geolocation.clearWatch(id);
        $('gps2ResultPanel').innerHTML = '[success]clear watch:[' + id + ']</br>' + $('gps2ResultPanel').innerHTML;
      }
      var crd = pos.coords;
      timeEnd = Date.now();
      dump('lx: timeEnd ' + timeEnd + '\n');
      result = parseInt((timeEnd - timeBegin) / 1000);
      result2 = result;
      result = result + '\t' + crd.latitude + '\t' + crd.longitude;
      dump('lx: result2 ' + result2 + '\n');
      result2 = '[' + id + ']' + result2 + '\t' + (crd.latitude + '').substr(0, 7) + '\t' + (crd.longitude + '').substr(0, 7);
      {
        var filename = '/data/jrdhwtest-gps2-' + type + '.log';
        var wirteCommand = 'echo \"' + result + '\" >> ' + filename;
        var request = navigator.jrdExtension.startUniversalCommand(wirteCommand, true);
      }
      $('gps2ResultPanel').innerHTML = result2 + '</br>' + $('gps2ResultPanel').innerHTML;

      Log('geolocation.watchPosition success id = ' + id + ' result: ' + result);

      if (count < total) {
        $('rst_gpstest2').innerHTML = type + '  testing.....(' + count + ')';
        runTest();
      }
      else {
        $('rst_gpstest2').innerHTML = 'success';
        closeShell();
        enableButtonGPSTest2();
        result = '';
        closeShell();
      }

    }

    function error(err) {
      if (id != undefined) {
        geolocation.clearWatch(id);
        $('gps2ResultPanel').innerHTML = '[error]clear watch:[' + id + ']</br>' + $('gps2ResultPanel').innerHTML;
      }
      var msg = 'undefined error';
      if (typeof err == 'object') {
        if (err.code == 1) {
          msg = 'Error:Permission denied';
        }
        if (err.code == 2) {
          msg = 'Error:Position unavailable';
        }
        if (err.code == 3) {
          msg = 'Error:Timed out';
        }
      }
      $('gps2ResultPanel').innerHTML = '[' + id + ']' + msg + '</br>' + $('gps2ResultPanel').innerHTML;

      Log('geolocation.watchPosition error id = ' + id + ' msg: ' + msg);

      // alert(msg + count);
      if (count < total) {
        $('rst_gpstest2').innerHTML = type + '  testing.....(' + count + ')';
        runTest();
      } else {
        $('rst_gpstest2').innerHTML = 'success';
        enableButtonGPSTest2();
        result = '';
        closeShell();
      }
    }

    function runTest() {
      Log('runTest :' + type);
       debug('lx: Type ' + type + '\n');
      if (count > total) {
        return;
      }
      var request = window.navigator.mozSettings.createLock().set({'geolocation.enabled' : false});
      DomRequestResult(request, 'geolocation.enabled: false', window.setTimeout(_settingCallback, 10000));

      function _settingCallback(){
        if (type != 'hot') {
          var request = navigator.jrdExtension.startUniversalCommand('gps_test ' + type, true);
          DomRequestResult(request, 'gps_test ' + type, window.setTimeout(_callback, 10000));
        }
        else {
          _callback();
        }
      }

      function _callback() {
        var request = window.navigator.mozSettings.createLock().set({'geolocation.enabled' : true});
        DomRequestResult(request, 'geolocation.enabled: true', window.setTimeout(testGPS, 10000));
      }

      function testGPS() {
        count++;
        timeBegin = Date.now();

        id = geolocation.watchPosition(success, error, options);
        Log('geolocation.watchPosition id = ' + id);
      }
    }
  },
  initWifiTxRateOptions : function initWifiTxOptions() {
    var rateIndex = $('wifiRateType').selectedIndex;
    var option = $('wifiRateType').options[rateIndex].innerHTML;
    if (option == '11b' || !option) {
      $('wifiRate').innerHTML = "<option value='0'>1Mbps</option>" + "<option value='1'>2Mbps</option>" + "<option value='2'>5.5Mbps</option>" + "<option value='3'>11Mbps</option>";
    } else if (option == '11g') {
      $('wifiRate').innerHTML = "<option value='4'>6Mbps</option>" + "<option value='5'>9Mbps</option>" + "<option value='6'>12Mbps</option>" + "<option value='7'>18Mbps</option>" + "<option value='8'>24Mbps</option>" + "<option value='9'>36Mbps</option>" + "<option value='10'>48Mbps</option>" + "<option value='11'>54Mbps</option>";
    } else if (option == '11n') {
      $('wifiRate').innerHTML = "<option value='12'>6.5Mbps</option>" + "<option value='13'>13Mbps</option>" + "<option value='14'>19.5Mbps</option>" + "<option value='15'>26Mbps</option>" + "<option value='16'>39Mbps</option>" + "<option value='17'>52Mbps</option>" + "<option value='18'>58.5Mbps</option>" + "<option value='19'>65Mbps</option>";
    }
  },
  getTxWifiRunCommand : function getTxWifiRunCommand(txpro, txfreq, txpwr, txrate) {
    return '/system/bin/wifitest tx cmd ' + txpro + ' ' + txfreq + ' ' + txpwr + ' ' + txrate + ' > /data/wifitext.txt';
  },
  getTxBTRunCommand : function getTxBTRunCommand(pattern, channel, packet, whitening, power, rxGain) {
    return 'hcitool cmd 0x3F 0x0004 0x04 ' + this.getTxBTChannel(channel) + pattern + ' ' + packet + ' ' + whitening + ' ' + power + ' ' + rxGain + ' 0x9c 0x35 0xBD 0x9c 0x35 0xBD 0x00 0x1B 0x00 0x00';
  },
  getTxBTChannel : function getTxBTChannel(channel) {
    var result = '';
    for (var i = 0; i < 5; i++) {
      result += channel;
      result += ' ';
    }
    return result;
  }
};
JrdHwtest.init();


function DomRequestResult(request, data, callback) {
  request.onsuccess = function(e) {
    Log('DomRequest success: ' + data);
    if(callback){
      callback();
    }
  };
  request.onerror = function(e) {
    Log('DomRequest error: ' + data);
  }
};

var ALL_LOGS = "";
window.addEventListener('load', function onLoad() {
  Log('load');
  
  window.removeEventListener('load', onLoad);
  document.getElementById('save').addEventListener('click', function(){
    var filename = '/system/usr/jrdhwtest-gps2-' + new Date().getTime() + '.log';   
    var wirteCommand = "echo \"" + ALL_LOGS + "\" >> " + filename;
    
    ALL_LOGS = "";     
    var request = navigator.jrdExtension.startUniversalCommand(wirteCommand, true);
		request.onsuccess = function(e) {
			alert('save success');
		};
		request.onerror = function(e) {
			alert('save faile');
		} 
  });
});

