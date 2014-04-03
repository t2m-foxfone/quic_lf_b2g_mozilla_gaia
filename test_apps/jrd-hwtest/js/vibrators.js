/**
 * Created by tclxa on 3/31/14.
 */
'use strict';
function $(id) {
	return document.getElementById(id);
}
var vibrateInterval;
var vCanncelTimer;
var _Self;
var isRunning;

var vTimerCheckDuration = (1000*60);
var vOneHour = (1000*60*60);
var vDefaultTime = (1000*60*60)*72;
var vStarTime = 0; // Frome  1970/01/01 util now (ms)
var vEndTime = 0; // = vStarTime + (1000*60*60)*vDefaultTime;
var vRunningTimes = 0;
var lbbtVibrateTimeAdd;

var vibrators = {
	init : function vibratorsInit()
	{
		this.vAddListener();
		lbbtVibrateTimeAdd = document.getElementById('lbdefaultTime')
		_Self = this;
	},

	vStartVibrate : function vVibratorsStartVibrate(vbTimes)
	{
		navigator.vibrate(vbTimes);
	},

	vStopVibrate : function vVibratorsStopVibrate()
	{
		isRunning = false;

		if(vibrateInterval)
		{
			clearInterval(vibrateInterval);
			vibrateInterval = null;
		}

		if(vCanncelTimer)
		{
			clearInterval(vCanncelTimer);
			vCanncelTimer = null;
		}
		navigator.vibrate(0);
		_Self.vSetbtState();
		//Timer.vReset();
	},

	vToRun : function vVibrateToRun(vbTimes, vbinvTimes)
	{
		Timer.init();
		navigator.vibrate(vbTimes);
		vibrateInterval = setInterval(function() {
				_Self.vStartVibrate(vbTimes);
		}, (parseInt(vbTimes) + parseInt(vbinvTimes)));
		isRunning = true;
		_Self.vSetCanncelTimer();
		_Self.vSetbtState();
	},

	vSetCanncelTimer : function vVibratorSetCanncelTimer()
	{
		if(Timer.vIsSetTimeOut())
		{
			vCanncelTimer = setInterval(function() {
				_Self.vStopVibrate();
			}, 0);
		}
		else
		{
			vCanncelTimer = setInterval(function() {
				_Self.vSetCanncelTimer();
			}, vTimerCheckDuration);
		}
		lbbtVibrateTimeAdd.textContent = Timer.vGetLeftTimeByHrMin();
	},

	vAddListener : function vVibratoraddListener() //add Listenner
	{
		$('btVibrateRun').addEventListener('click', function()
		{
			var vbtimesIndex = $('vbTimes').selectedIndex;
			var vbTimes = $('vbTimes').options[vbtimesIndex].value;
			var vbinvTimesIndex = $('vbinvTimes').selectedIndex;
			var vbinvTimes = $('vbinvTimes').options[vbinvTimesIndex].value;
			_Self.vToRun(vbTimes, vbinvTimes);
		});

		$('btVibrateStop').addEventListener('click', function()
		{
			_Self.vStopVibrate();
			lbbtVibrateTimeAdd.textContent = Timer.vGetTimeDefaultByHour();
		});

		$('btVibrateTimeAdd').addEventListener('click', function()
		{

			if(0 <= vDefaultTime)
			{
				vDefaultTime += vOneHour;
			}

			lbbtVibrateTimeAdd.textContent = Timer.vGetTimeDefaultByHour();
		});
		$('btDefaultTimeaSubtract').addEventListener('click', function()
		{
			if(0 <= vDefaultTime)
			{
				vDefaultTime -= vOneHour;
			}
			lbbtVibrateTimeAdd.textContent = Timer.vGetTimeDefaultByHour();
		});

		$('btVibrateUnlimited').addEventListener('click', function()
		{
			Timer.init();
			var vbtimesIndex = $('vbTimes').selectedIndex;
			var vbTimes = $('vbTimes').options[vbtimesIndex].value;
			var vbinvTimesIndex = $('vbinvTimes').selectedIndex;
			var vbinvTimes = $('vbinvTimes').options[vbinvTimesIndex].value;

			navigator.vibrate(vbTimes);
			vibrateInterval = setInterval(function() {
				_Self.vStartVibrate(vbTimes);
			}, (parseInt(vbTimes) + parseInt(vbinvTimes)));

			isRunning = true;
			_Self.vSetbtState();
			lbbtVibrateTimeAdd.textContent = 'Unlimited';
		});
	},
	vSetbtState : function vVibrateSetbtDisable()
	{
		var vmState = false;

		if(true == isRunning)
		{
			document.getElementById('btVibrateRun').disabled = true;
			document.getElementById('btVibrateUnlimited').disabled = true;
			document.getElementById('btVibrateStop').disabled = false;
			vmState = true;
		}
		else
		{
			document.getElementById('btVibrateRun').disabled = false;
			document.getElementById('btVibrateUnlimited').disabled = false;
			document.getElementById('btVibrateStop').disabled = true;
			vmState = false;
		}
		document.getElementById('vbTimes').disabled = vmState;
		document.getElementById('vbinvTimes').disabled = vmState;
		document.getElementById('btVibrateTimeAdd').disabled = vmState;
		document.getElementById('btDefaultTimeaSubtract').disabled = vmState;
	}
};

var Timer = {
	init : function vTimerInit() {
		this.vSetStartTime();
		this.vSetEndTime();
	},

	vReset : function vTimevReset()
	{
		vStarTime = 0;
		vEndTime = 0;
		vRunningTimes = 0;
	},

	vGetStartTime : function vTimerGetGetStartTime()
	{
		return vStarTime;
	},

	vSetStartTime : function vTimerGetGetStartTime()
	{
		vStarTime = Date.now();
	},

	vGetEndTime : function vTimerGetGetStartTime()
	{
		return vEndTime;
	},

	vSetEndTime : function vTimerGetGetStartTime()
	{
		vEndTime = vStarTime + vDefaultTime;
	},

	vRunningTime : function vTimerRunningTime()
	{
		vRunningTimes = Date.now() - vStarTime;
		return vRunningTimes;
	},

	vIsSetTimeOut : function vTimerIsSetTimeOut()
	{
		if(this.vRunningTime > vDefaultTime)
		{
			return true;
		}
		else
		{
			return false;
		}
	},

	vGetLeftTimeByHrMin : function vTimevGetRunningTimeByHrMin()
	{
		var vNowTime = Date.now();
		var vleftTime = vEndTime - vNowTime;
		var hours = vleftTime / vOneHour;
		var hoursRound = Math.floor(hours);
		var minutes = (vleftTime - (vOneHour *hoursRound )) / (1000 * 60);
		var minutesRound = Math.floor(minutes);
		dump("jrd-Vibrator hoursRound = " + hoursRound + "minutesRound" +minutesRound);
		dump("jrd-Vibrator hoursRound = " + minutesRound);
		return hoursRound + ':' + minutesRound;
	},

	vGetTimeDefaultByHour : function vGetTimeTimeDefaultByHour()
	{
		var vmDefaultDays = vDefaultTime / vOneHour;
		return vmDefaultDays;
	}
};

vibrators.init();