'use strict';

function  clearvalue(obj){
  var CaretPos = 0;
  if(obj.selectionStart || obj.selectionStart == '0'){
    CaretPos = obj.value.length;

    if(obj.setSelectionRange)
    {
      obj.focus();
      obj.setSelectionRange(0,CaretPos);
    }
    else if (obj.createTextRange) {
      var range = obj.createTextRange();
      range.collapse(true);
      range.moveEnd('character', CaretPos);
      range.moveStart('character', CaretPos);
      range.select();
    }
   // console.log("CaretPos: "+CaretPos);
   // console.log("CaretPos value length   "+ obj.value+"length"+obj.value.length);
  }
}

var TpInformation = {
  tp_thr:1,  //acc_center_threld
  tp_edgethr:2,
  tp_linear_center_thr:1,
  tp_linear_edge_thr:2,
  tp_width:50,
  tp_length:75,
  tp_radius:4,
  tp_boader:5,
  looptimes:6,
  clicknum:1,
  tp_total_accuracy_test_time:1,
  tp_each_line_test_time:1,
  tp_total_linearity_time:1,
  bmanual:false,

  get configurationset() {
    delete this.configurationset;
    return this.configurationset = document.getElementById('configuration-set');
  },
  get lcdLength() {
    delete this.lcdLength;
    return this.lcdLength = document.getElementById('lcd-length');
  },
  get lcdWidth() {
    delete this.lcdWidth;
    return this.lcdWidth = document.getElementById('lcd-width');
  },
  get lcdSize() {
    delete this.lcdSize;
    return this.lcdSize = document.getElementById('lcd-size');
  },
  get accuracyTotal() {
    delete this.accuracyTotal;
    return this.accuracyTotal = document.getElementById('accuracy-total');
  },
  get linearityEachLine() {
    delete this.linearityEachLine;
    return this.linearityEachLine = document.getElementById('linearity-each-line');
  },
  get linearityTotal() {
    delete this.linearityTotal;
    return this.linearityTotal = document.getElementById('linearity-total');
  },
  get accuracyCenterThreshold() {
    delete this.accuracyCenterThreshold;
    return this.accuracyCenterThreshold = document.getElementById('accuracy-center-threshold');
  },
  get accuracyEdgeThreshold() {
    delete this.accuracyEdgeThreshold;
    return this.accuracyEdgeThreshold = document.getElementById('accuracy-edge-threshold');
  },
  get lineactionCenterThreshold() {
    delete this.lineactionCenterThreshold;
    return this.lineactionCenterThreshold = document.getElementById('lineaction-center-threshold');
  },
  get lineactionEdgeThreshold() {
    delete this.lineactionEdgeThreshold;
    return this.lineactionEdgeThreshold = document.getElementById('lineaction-edge-threshold');
  },
  get testBarRadius() {
    delete this.testBarRadius;
    return this.testBarRadius = document.getElementById('test-bar-radius');
  },

  get clickNum(){
    delete this.clickNum;
    return this.clickNum = document.getElementById("click-num");
  },

  getValue:function getValue(key){  //取存储的值 取不到则为value默认值
  var strvalue="";
     if(window.localStorage.getItem(key)){
       strvalue = window.localStorage.getItem(key);
     }
    return strvalue;
},

 getStorageValue:function tp_getStorage(){

   TpInformation.lcdLength.value = this.getValue("TP_LENGTH");
   console.log("-------------->lx:getStorageValue TP_LENGTH   "+this.getValue("TP_LENGTH"));

   TpInformation.lcdWidth.value = this.getValue("TP_WIDTH");

   TpInformation.linearityEachLine.value = this.getValue("EACH_LINE_TIME");

   TpInformation.linearityTotal.value = this.getValue("TOTAL_LINEARITY_TIME");

   this.accuracyCenterThreshold.value = this.getValue("ACC_CTR_THR");

   this.accuracyEdgeThreshold.value = this.getValue("ACC_EDGE_THR");

   this.accuracyTotal.value = this.getValue("TOTAL_ACCURACY_TIME");

   this.lineactionCenterThreshold.value = this.getValue("LIN_CTR_THR");

   this.lineactionEdgeThreshold.value = this.getValue("LIN_EDGE_THR");

   this.testBarRadius.value = this.getValue("TP_RADIUS");

   this.clickNum.value = this.getValue("CLICK_NUM");
   console.log("----------->lx:getStorageValue TP_LENGTH   "+this.getValue("CLICK_NUM"));
 },
  setStorageValue:function tp_setStorageValue(){

    window.localStorage.setItem("TP_LENGTH",TpInformation.lcdLength.value);
    window.localStorage.setItem("TP_WIDTH",TpInformation.lcdWidth.value);

    window.localStorage.setItem("EACH_LINE_TIME",TpInformation.linearityEachLine.value);
    window.localStorage.setItem("ACC_CTR_THR",TpInformation.accuracyCenterThreshold.value);
    window.localStorage.setItem("ACC_EDGE_THR",TpInformation.accuracyEdgeThreshold.value);
    window.localStorage.setItem("TOTAL_ACCURACY_TIME",TpInformation.accuracyTotal.value);
    window.localStorage.setItem("LIN_CTR_THR",TpInformation.lineactionCenterThreshold.value);
    window.localStorage.setItem("LIN_EDGE_THR",TpInformation.lineactionEdgeThreshold.value);
    window.localStorage.setItem("TP_RADIUS",TpInformation.testBarRadius.value);
    window.localStorage.setItem("CLICK_NUM",TpInformation.clickNum.value);
  },

  setTpValue:function tp_setTpValue(){
    console.log("-------------->lx: setTpValue: accuracyCenterThreshold.value   "+ (this.lcdLength.value||75));
     TpInformation.tp_thr = this.accuracyCenterThreshold.value||1,  //acc_center_threld
     TpInformation.tp_edgethr = this.accuracyEdgeThreshold.value||2,
     TpInformation.tp_linear_center_thr = this.lineactionCenterThreshold.value||1,
     TpInformation.tp_linear_edge_thr = this.lineactionEdgeThreshold.value||2,
     TpInformation.tp_width = this.lcdWidth.value||50,
     TpInformation.tp_length = this.lcdLength.value||75,
     TpInformation.tp_radius = this.testBarRadius.value||4;
     TpInformation.clicknum = this.clickNum.value||1;
     TpInformation.tp_total_accuracy_test_time = this.accuracyTotal.value||1;
     TpInformation.tp_each_line_test_time = this.linearityEachLine.value||1;
     TpInformation.tp_total_linearity_time = this.linearityTotal.value||1;
  },

  init: function at_init() {
    this.lcdSize.value = window.screen.width + '*' + window.screen.height;
    this.getStorageValue();
     this.setTpValue();
    this.configurationset.onclick=function(){
      TpInformation.setStorageValue();  //存储
      //TpInformation.getStorageValue();
      TpInformation.setTpValue();
    };
    document.getElementById("config-ul").onclick=function(event){
      event.preventDefault();
      event.stopPropagation();
      var inputid=event.target.id;
      var obj=document.getElementById(inputid);
      obj.select();
      //clearvalue(obj);

    };
  }
};
