var DEBUG = 1;

function debug(msg){
  if(DEBUG){
    dump("-*-*-*- Auto_test.js lx: "+msg+"\n")
  }
}
const Auto_Test=(function AutoTest(){

 var GET_DURATION=500;
 var auto=false;
 var bsignalresult=true;
 var Test_Item=9;
  var looptimes = 1;

 var TEST_ACCURACY =0;
 var TEST_DIAGONAL_LINEARITY =1;
 var  TEST_LINE_LINEARITY =2;
 var TEST_VER_LINEARITY =3;
 var  TEST_RESPONES =4;
 var TEST_SENSITIVITY=5;
 var TEST_EDGE =6;
 var TEST_TWOPOINT =7;
 var  TEST_JITTER =8;


  var RUN_NESTSTEP =0;
  var CURR_TEST_OVER=1;
  var VIEW_INIT = 2;
  var SHOW_CURR_VIEW =3;
  var  LONGTIME_TEST =4;
  var SAVEDATA_INTIME =5;
  //currview:0,

  var isMainView=true;
  var bpass =true;
  var bmanual=true;
  var bnextstep=true;
  var mNumPoint=0;
  var Test_Item=3;

  var currpointintime={};
  var testview =new Array();
  var context=null;
  var screen=null;
  var canvas=null;
  var btn_setting=null;
  var btn_auto=null;
  var mListView=null;
  var startPoint={x:0,y:0};
  var startEvent;
  var isTouch = 'ontouchstart' in window;
  var touchstart = isTouch ? 'touchstart' : 'mousedown';
  var touchmove = isTouch ? 'touchmove' : 'mousemove';
  var touchend = isTouch ? 'touchend' : 'mouseup';
  dump("------------------------ lx: isTouch   "+isTouch);



 function getbtn_setting() {
    //delete this.btn_setting;
    return btn_setting=document.getElementById("btn_setting");  //config按钮点击的监听
  }

  function init() {
   // alert("init");
    btn_setting=document.getElementById("btn_setting");
    btn_auto=document.getElementById("Start_auto_test");
    mListView=document.getElementById("test-list");
    bmanual =TpInformation.bmanual;
    canvas = document.getElementById('acc_canvas');
    context = canvas.getContext('2d');


   // canvas.addEventListener(touchstart,HandleEvent);
   // canvas.addEventListener("touchmove",HandleEvent);

    var isInFullScreen = window.fullScreen;

    isMainView = true;
     InitViews();
      var backLink=document.getElementById('back_link');
    backLink.onclick=function(){
      backLink.setAttribute('href','#root');
      canvas.removeEventListener(touchstart,HandleEvent);
    }


  }

  function clearLastView(){
    context.clearRect(0, 0, getWidth(), getHeight());
    debug("lx:clear canvas\n");
    canvas.addEventListener(touchstart,HandleEvent);

  }
  function releaseEvent(){
    window.removeEventListener(touchmove,HandleEvent);
    window.removeEventListener(touchend,HandleEvent);
  }
  function attachEvent(){
    window.addEventListener(touchmove,HandleEvent);
    window.addEventListener(touchend,HandleEvent);

  }

   function HandleEvent(event){
    event.preventDefault();
    event.stopPropagation();

   if(!bnextstep)
   return true;

    var tmppoint={};
   // var startPoint={};
//    tmppoint.x=event.pageX;
//    tmppoint.y=event.pageY;
    mNumPoint++;
    var currview = utils.currview;
    switch(event.type){
      //case 'mousedown':
       case touchstart:
      {
        startEvent = isTouch ? event.touches[0] : event;
//        tmppoint.x = event.touches[0].clientX;
//        tmppoint.y = event.touches[0].clientY;
//        startPoint.x=event.touches[0].clientX;
//        startPoint.y=event.touches[0].clientY;
         tmppoint.x = startEvent.clientX;
         tmppoint.y = startEvent.clientY;
         startPoint.x = startEvent.clientX;
         startPoint.y = startEvent.clientY;
        attachEvent();
        context.beginPath();
        context.arc(startPoint.x, startPoint.y,1,0,2*Math.PI);
        context.strokeStyle = 'blue';
        context.stroke();
        if(currview==1){ //currview时整数值、
          debug("TEST_TWOPOINT");
          DiagonalLine.SetCurrPointState(utils.POINT_DOWN);
          DiagonalLine.SetCurrPoint(tmppoint);

        } else if(currview==2){
          debug("TEST_JITTER");
          LineLinearity.SetCurrPointState(utils.POINT_DOWN);
          LineLinearity.SetCurrPoint(tmppoint);

        }else if(currview==3){
          VerLinearity.SetCurrPointState(utils.POINT_DOWN);
          VerLinearity.SetCurrPoint(tmppoint);

        }else{
          AccuratyView.SetCurrPointState(utils.POINT_DOWN);
          AccuratyView.SetCurrPoint(tmppoint.x,tmppoint.y);

        }

        //window.addEventListener("touchend",HandleEvent);
        break;
    }

      //case 'mousemove':
    case touchmove:
    {
      startEvent = isTouch ? event.touches[0] : event;
      tmppoint.x = startEvent.clientX;
      tmppoint.y = startEvent.clientY;

      context.beginPath();
      context.strokeStyle = 'blue';
      context.lineWidth = 1;
      context.moveTo(startPoint.x, startPoint.y);
      context.lineTo(tmppoint.x, tmppoint.y);
      context.stroke();
      startPoint.x = tmppoint.x;
      startPoint.y = tmppoint.y;
      debug("lx: tmppoint ("+tmppoint.x+" , "+tmppoint.x+")");
      if(currview==1){
        DiagonalLine.SetCurrPointState(utils.POINT_MOVE);
        DiagonalLine.SetCurrPoint(tmppoint);
      }
      else if(currview==2){
        LineLinearity.SetCurrPointState(utils.POINT_MOVE);
        LineLinearity.SetCurrPoint(tmppoint);
      }else if(currview==3){
        VerLinearity.SetCurrPointState(utils.POINT_MOVE);
        VerLinearity.SetCurrPoint(tmppoint);
      }
      else{
        AccuratyView.SetCurrPointState(utils.POINT_MOVE);
        AccuratyView.SetCurrPoint(tmppoint.x,tmppoint.y);
      }


    break;

    }
      //case 'mouseup':
      case touchend:
      {       dump("lx:touch end");
            releaseEvent();
      //  window.removeEventListener("touchend",HandleEvent);
        if(currview==1){
          DiagonalLine.SetCurrPointState(utils.POINT_UP);
        }
        else if(currview==2){
          debug("lx:Hor mouseup"+"\n");
          LineLinearity.SetCurrPointState(utils.POINT_UP);
        }else if(currview==3){
          debug("lx:Ver mouseup"+"\n");
          VerLinearity.SetCurrPointState(utils.POINT_UP);
        }
        else{
          debug("lx:Acc mouseup"+"\n");
        AccuratyView.SetCurrPointState(utils.POINT_UP);

        }
        //document.getElementById('myButton').style.zIndex = 50;

        break;
      }

    }
    return true;
  }


  function InitViews() {

    if(btn_auto){
      btn_auto.addEventListener("click",function(){
        window.location.hash = "accuracyJitter";
        Auto_Test.clearLastView();
        utils.currview = 0;
        AccuratyView.init();
      });
    }
    document.getElementById("configuration-btn").onclick = function(){
      TpInformation.getStorageValue();
      TpInformation.setTpValue();
    };

   if(mListView){
    mListView.addEventListener("click",function(event){
      debug("lx:mListView click\n");
      Auto_Test.clearLastView();
     switch (event.target.id){
       case 'Accuracy':
         utils.currview = 0;
         AccuratyView.init();
         //Auto_Test.attachEvent();
         debug("lx:click init Accuracy");
         break;
       case 'Diagonal':
         utils.currview = 1;
        DiagonalLine.init();
         //Auto_Test.attachEvent();
         break;
       case 'Horizontal':
         utils.currview = 2;
         LineLinearity.init();
         //Auto_Test.attachEvent();
         break;
       case 'Vertical':
         utils.currview = 3;
         VerLinearity.init();
         //Auto_Test.attachEvent();
         break;

     };
    });  //测试列表li点击的监听
   }

}
  function ChangeView(currview){
      clearLastView();
    switch(currview){
      case 1:
        DiagonalLine.init();
        break;
      case 2:
        LineLinearity.init();
        break;
      case 3:
        VerLinearity.init();
        break;

    }
   isMainView=false;
 }
  return{
    init:init,
    clearLastView:clearLastView,
    attachEvent:attachEvent,
    releaseEvent:releaseEvent,
    ChangeView:ChangeView
  }


}());

window.addEventListener('load',function onload(){
  window.removeEventListener('load',onload);
  Auto_Test.init();

});