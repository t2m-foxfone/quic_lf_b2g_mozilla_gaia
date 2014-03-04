'use strict';
function $(id) {
  return document.getElementById(id);
}

var JrdHwtest = {
  init : function jrdHwTestInit() {
    this.pageChangeHandler();
    this.fireEvent();
  },
  pageChangeHandler : function jrdHwTestPageChangeHandler() {
    this.initWifiTxRateOptions();
    var pageLinks = document.getElementsByTagName('a');
    for (var i = 0; i < pageLinks.length; i++) {
      var link = pageLinks[i];
      link.addEventListener('click', function() {
        var url = this.href;
        var index = url.indexOf('#');
        var sectionId = url.substr(index + 1);
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
  fireEvent : function jrdHwTestFireEvent() {
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
      dump("lx:wifiRate "+wifiRate);
      var runCommand = _self.getTxWifiRunCommand(protocolType, channel, txPower,wifiRate );
      var initCommand= "/system/bin/wifitest power "+' > /data/wifitext.txt';
      $('wifiTxStop').disabled = false;
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        dump("lx: initCommand "+initCommand+"\n");
        var initRequest=jrd.startUniversalCommand(initCommand, true);
         dump("lx: runCommand "+runCommand+"\n");
        var request = jrd.startUniversalCommand(runCommand, true);   
      }
    });
    $('wifiTxStop').addEventListener('click', function() {
      this.disabled = true;
      var stopCommand = '/system/bin/wifitest stop'+' > /data/wifitext.txt';
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        var request = jrd.startUniversalCommand(stopCommand, false);
      }
      $('wifiTxRun').disabled = false;
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
      var runCommand = _self.getTxBTRunCommand(btTxPattern, btTxChannel, btTxPacketType, btTxWhitening, btTxPower, btTxRxGain);
      this.disabled = true;
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        var request = jrd.startUniversalCommand(runCommand, true);
        request.onsuccess = function(e) {
          alert("success!");
          $('btTxRun').disabled = false;
        };
        request.onerror = function(e) {
          alert('error!');
          $('btTxRun').disabled = false;
        };
      }
    });
    $('gpsTest1Run').addEventListener('click', function() {
      this.disabled = true;
      var runCommand = '/system/bin/gps_test 1 0';
      $('gpsTest1Stop').disabled = false;
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        var request = jrd.startUniversalCommand(runCommand, false);
      }
    });
    $('gpsTest1Stop').addEventListener('click', function() {
      this.disabled = true;
      var stopCommand = '/system/bin/wifitest stop';
      if (navigator.jrdExtension) {
        navigator.jrdExtension.stopUniversalCommand();
      }
      $('gpsTest1Run').disabled = false;
    });
    //BT RADIO TEST BEGIN
    $('btRadioTestRun').addEventListener('click', function() {
      this.disabled = true;
      $('btRadioTestStop').disabled = false;
      var runCommand = 'bttest disable;' + 'bttest enable;' + 'hcitool cmd 0x06 0x0003;' + 'hcitool cmd 0x03 0x0005 0x02 0x00 0x02;' + 'hcitool cmd 0x03 0x001A 0x03;' + 'hcitool cmd 0x03 0x0020 0x00;' + 'hcitool cmd 0x03 0x0022 0x00';
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        var request = jrd.startUniversalCommand(runCommand, false);
      }
    });
    $('btRadioTestStop').addEventListener('click', function() {
      this.disabled = true;
      var stopCommand = 'bttest disable';
      if (navigator.jrdExtension) {
        var jrd = navigator.jrdExtension;
        var request = jrd.startUniversalCommand(stopCommand, true);
      }
      $('btRadioTestRun').disabled = false;
    });
    //BT RADIO TEST ENE
    
    var count,type;
    $('gpsTest2Cold').addEventListener('click', function() {
      disableButtonGPSTest2();
      count = 0;
      type = 'cold';
      runTest();
    });
    $('gpsTest2Hot').addEventListener('click', function() {
      disableButtonGPSTest2();
      count = 0;
      type = 'hot';
      runTest();
    });
    $('gpsTest2Warm').addEventListener('click', function() {
      disableButtonGPSTest2();
      count = 0;
      type = 'warm';
      runTest();
    });
    function disableButtonGPSTest2() {
      $('rst_gpstest2').innerHTML = 'testing.....(0)';
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
    };

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
      timeout : 60000,
      maximumAge : 0
    };

    function success(pos) {
      if (id != undefined) {
        geolocation.clearWatch(id);
        $('gps2ResultPanel').innerHTML = '[success]clear watch:[' + id + ']</br>' + $('gps2ResultPanel').innerHTML;
      }
      var crd = pos.coords;
      timeEnd = new Date().getTime();
      result = parseInt((timeEnd - timeBegin) / 1000);
      result2 = result;
      result = result + '\t' + crd.latitude + '\t' + crd.longitude;
      result2 = '[' + id + ']' + result2 + '\t' + (crd.latitude + '').substr(0, 7) + '\t' + (crd.longitude + '').substr(0, 7);
      $('gps2ResultPanel').innerHTML = result2 + '</br>' + $('gps2ResultPanel').innerHTML;
      
      Log('geolocation.watchPosition success id = ' + id + ' result: ' + result);

      if (count < total) {
        $('rst_gpstest2').innerHTML = 'testing.....(' + count + ')';
        runTest();
      } 
      else {
        $('rst_gpstest2').innerHTML = 'success';
        closeShell();
        enableButtonGPSTest2();
        result = '';
        closeShell();
      }

    };

    function error(err) {
      if (id != undefined) {
        geolocation.clearWatch(id);
        $('gps2ResultPanel').innerHTML = '[error]clear watch:[' + id + ']</br>' + $('gps2ResultPanel').innerHTML;
      }
      var msg = 'undefined error';
      if ( typeof err == "object") {
        if (err.code == 1) {
          msg = "Error:Permission denied";
        }
        if (err.code == 2) {
          msg = "Error:Position unavailable";
        }
        if (err.code == 3) {
          msg = "Error:Timed out";
        }
      }
      $('gps2ResultPanel').innerHTML = '[' + id + ']' + msg + '</br>' + $('gps2ResultPanel').innerHTML;
      
      Log('geolocation.watchPosition error id = ' + id + ' msg: ' + msg);
      
      // alert(msg + count);
      if (count < total) {
        $('rst_gpstest2').innerHTML = 'testing.....(' + count + ')';
        runTest();
      } else {
        $('rst_gpstest2').innerHTML = 'success';
        enableButtonGPSTest2();
        result = '';
        closeShell();
      }
    };

    function runTest(){
      Log('runTest :' + type);
      
      if(count > total) {
        return;
      }   
      var request = window.navigator.mozSettings.createLock().set({'geolocation.enabled' : false});
      DomRequestResult(request, 'geolocation.enabled: false', _settingCallback);

      function _settingCallback(){
        if (type != 'hot') {
          var request = navigator.jrdExtension.startUniversalCommand('gps_test ' + type, true);
          DomRequestResult(request, 'gps_test ' + type, _callback);      
        }
        else{
          _callback();
        }    
      }

      function _callback() {
        var request = window.navigator.mozSettings.createLock().set({'geolocation.enabled' : true});
        DomRequestResult(request, 'geolocation.enabled: true', testGPS);
      }

      function testGPS() {
        count ++;
        timeBegin = new Date().getTime();
        
        id = geolocation.watchPosition(success, error, options);
        Log('geolocation.watchPosition id = ' + id);
      }
    };
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

