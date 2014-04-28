/**
 * Created by tclxa on 3/31/14.
 */
'use strict';
function $(id) {
  return document.getElementById(id);
}
$('menuItem-vibrator').addEventListener('click', function(){
	vibrators.init();
});

var vibrateInterval;
var vCanncelTimer;
var _self;
var isRunning;

var vOneHour = (1000*60*60);
var vDefaultTime = (1000*60*60)*72;
var vStarTime = 0; // Frome  1970/01/01 util now (ms)
var vEndTime = 0; // = vStarTime + (1000*60*60)*vDefaultTime;
var lbbtVibrateTimeAdd;

var vibrators = {
	init : function vibratorsInit(){
		_self = this;
		_self.vAddListeners();
		lbbtVibrateTimeAdd = $('lbdefaultTime');
	},
	vStartVibrate : function vVibratorsStartVibrate(vbTimes){
		navigator.vibrate(vbTimes);
	},
	vStopVibrate : function vVibratorsStopVibrate(){
		isRunning = false;

		if(vibrateInterval){
			clearInterval(vibrateInterval);
			vibrateInterval = null;
		}

		if(vCanncelTimer){
			clearInterval(vCanncelTimer);
			vCanncelTimer = null;
		}
		navigator.vibrate(0);
		_self.vSetbtState();
	},
	vToRun : function vVibrateToRun(vbTimes, vbinvTimes){
		_self.vStartVibrate(vbTimes);
		vibrateInterval =  window.setInterval(function() {
			_self.vStartVibrate(vbTimes);
		}, (vbTimes + vbinvTimes));
		isRunning = true;
		_self.vSetCanncelTimer();
		_self.vSetbtState();
	},
	vSetCanncelTimer : function vVibratorSetCanncelTimer(){
		if(Timer.vIsSetTimeOut()){
			vCanncelTimer = window.setTimeout(function() {
				_self.vStopVibrate();
			}, 1000*1);
		}
		else{
			vCanncelTimer = window.setTimeout(function() {
				_self.vSetCanncelTimer();
			}, 1000*60 );
		}
		lbbtVibrateTimeAdd.textContent = Timer.vGetLeftTimeByHrMin();
	},
	vAddListeners : function vVibratoraddListeners(){
		$('btVibrateRun').addEventListener('click', function(){
			Timer.init();
			var vbtimesIndex = $('vbTimes').selectedIndex;
			var vbTimes = parseInt($('vbTimes').options[vbtimesIndex].value);
			var vbinvTimesIndex = $('vbinvTimes').selectedIndex;
			var vbinvTimes = parseInt($('vbinvTimes').options[vbinvTimesIndex].value);
			_self.vToRun(vbTimes, vbinvTimes);
		});

		$('btVibrateStop').addEventListener('click', function(){
			_self.vStopVibrate();
			lbbtVibrateTimeAdd.textContent = _self.vGetDefaultByHour();
		});

		$('btVibrateTimeAdd').addEventListener('click', function(){
			if(vOneHour <= vDefaultTime){
				vDefaultTime += vOneHour;
			}
			lbbtVibrateTimeAdd.textContent = _self.vGetDefaultByHour();
		});
		$('btDefaultTimeaSubtract').addEventListener('click', function(){
			if(vOneHour < vDefaultTime){
				vDefaultTime -= vOneHour;
			}
			lbbtVibrateTimeAdd.textContent = _self.vGetDefaultByHour();
		});

		$('btVibrateUnlimited').addEventListener('click', function(){
			Timer.init();
			var vbtimesIndex = $('vbTimes').selectedIndex;
			var vbTimes = parseInt($('vbTimes').options[vbtimesIndex].value);
			var vbinvTimesIndex = $('vbinvTimes').selectedIndex;
			var vbinvTimes = parseInt($('vbinvTimes').options[vbinvTimesIndex].value);
			_self.vStartVibrate(vbTimes);
			vibrateInterval = window.setInterval(function() {
				_self.vStartVibrate(vbTimes);
			}, (vbTimes + vbinvTimes));

			isRunning = true;
			_self.vSetbtState();
			lbbtVibrateTimeAdd.textContent = 'Unlimited';
		});
	},
	vSetbtState : function vVibrateSetbtDisable(){
		var vmState = false;

		if(true == isRunning){
			$('btVibrateRun').disabled = true;
			$('btVibrateUnlimited').disabled = true;
			$('btVibrateStop').disabled = false;
			vmState = true;
		}
		else{
			$('btVibrateRun').disabled = false;
			$('btVibrateUnlimited').disabled = false;
			$('btVibrateStop').disabled = true;
			vmState = false;
		}
		$('vbTimes').disabled = vmState;
		$('vbinvTimes').disabled = vmState;
		$('btVibrateTimeAdd').disabled = vmState;
		$('btDefaultTimeaSubtract').disabled = vmState;
	},

	vGetDefaultByHour : function vGetDefaultByHour(){
		var vmDefaultHours = vDefaultTime / vOneHour;
		return vmDefaultHours;
	}
};

var Timer = {
	init : function vTimerInit() {
		this.vSetStartTime();
		this.vSetEndTime();
	},
	vReset : function vTimevReset(){
		vStarTime = 0;
		vEndTime = 0;
	},

	vSetStartTime : function vTimerGetGetStartTime(){
		vStarTime = Date.now();
	},

	vSetEndTime : function vTimerGetGetStartTime(){
		vEndTime = vStarTime + vDefaultTime;
	},

	vIsSetTimeOut : function vTimerIsSetTimeOut(){
		if((vEndTime - Date.now()) > 1000*60){
			return false;
		}
		else{
			return true;
		}
	},
	vGetLeftTimeByHrMin : function vTimevGetRunningTimeByHrMin(){
		var vleftTime = vEndTime - Date.now();
		var hours = vleftTime / vOneHour;
		var hoursRound = Math.floor(hours);
		var minutes = (vleftTime - (vOneHour *hoursRound )) / (1000 * 60);
		var minutesRound = Math.floor(minutes);
		return hoursRound + ':' + minutesRound;
	}
};
