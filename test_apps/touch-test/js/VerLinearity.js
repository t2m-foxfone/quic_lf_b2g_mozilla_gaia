
const VerLinearity=(function VerLinearity()
{
  var MaxPointNum=8000;
  var LinePoint = new Array();  //采样点数组

  var TestLineNum=5;
  var myline = new Array();  //五条测试线
  var fscaleX = 1.0;
  var fscaleY = 1.0;
  var currline = 0;
  var PointNum = 0;  //采样点计数
  var currpointNum = 0;
  var uptime = 0; //抬起次数
  var offset = 0;
  var fdisthr = 0;
  var fdisedgethr =0;
  var fdisedgeHeight =0;

  var edgemaddis = new Array();
  var edgemindis = new Array();
  var edgemaxpoint = new Array();
  var isShortLine = new Array();


  var maxdis = new Array();
  var mindis = new Array();
  var maxpoint =new Array();
  var testover = false;
  var testpass = true;
  var context;


  function initialize(){
    var i;
    for(i=0;i<MaxPointNum;i++){
      var MyPoint={};
       MyPoint.point={};
      MyPoint.point.x=0;
      MyPoint.point.y=0;
      MyPoint.belongTo =0;;
      MyPoint.IsStart =false;
      MyPoint.IsEnd=false;
      MyPoint.IsBeyond=false;
      LinePoint[i]=MyPoint;  //LinePoint[i].point.x LinePoint[i].IsBeyond
    }

    for(i=0; i < TestLineNum; i++){ //实例化线的起点和终点
      myline[i] = new Array();
      var point={};
      point.x=0;
      point.y=0;
      isShortLine[i] = false;
      maxpoint[i] = point;
      edgemaxpoint[i] = point;

      for(var j=0;j<4;j++){
        var LineP1={};
        LineP1.x = 0;
        LineP1.y = 0;
        myline[i][j] = LineP1; //myline[i][j].x   myline[i][j].y j不同 代表不同的点
      }
    }
    var canvas = document.getElementById('acc_canvas');
    context = canvas.getContext('2d');
    initVariable();
    initLine();
    drawVerLine();

  }
  function initVariable(){
    PointNum = 0;
    testover = false;
    testpass = true;
    currline = 0;
    uptime = 0;

  }


  function initLine(){
    fscaleX = getWidth() / TpInformation.tp_width;  //50f
    fscaleY = getHeight() / TpInformation.tp_length;  //75f

    var off =0;
    off = (getWidth()-TpInformation.tp_radius*2*fscaleX)/4;
    offset = TpInformation.tp_radius*fscaleX;


    for(var i=0;i<TestLineNum;i++){
      myline[i][0].x = offset+off*i;
      myline[i][0].y =0;
      myline[i][1].x = offset+off*i;
      myline[i][1].y = getHeight();
      myline[i][2].x = myline[i][0].x/fscaleX;
      myline[i][2].y = myline[i][0].y/fscaleY;
      myline[i][3].x = myline[i][1].x/fscaleX;
      myline[i][3].y = myline[i][1].y/fscaleY;
      mindis[i] =TpInformation.tp_width>TpInformation.tp_length ? TpInformation.tp_width : TpInformation.tp_length;
    }

    fdisthr = fscaleX * TpInformation.tp_linear_center_thr;  //自适应后屏幕上距离阀值
    fdisedgethr = fscaleX * TpInformation.tp_linear_edge_thr;
    fdisedgeHeight = fscaleY * TpInformation.tp_radius;//add by bing.wang.hz 2012-09-01  边缘

    var back_btn=document.getElementById('myButton');
    back_btn.style.top = fdisedgeHeight*2+"px";
    back_btn.style.left = offset+fdisthr*2+"px";
    //back_btn.style.zIndex = -50;

  }

function SetCurrPointState(state){
  console.log("lx:Ver state: "+state+"\n");
  switch(state){
    case utils.POINT_DOWN:
    {
      LinePoint[PointNum].IsStart=true;
      break;
    }
    case utils.POINT_MOVE:
      break;
    case utils.POINT_UP:{
      LinePoint[PointNum].IsEnd =true;
      uptime++;
      console.log("lx:Ver uptime: "+uptime);
      if(uptime >= TestLineNum)  //抬起的次数超过测试线的数目5
      {
//        window.location.hash = "root";
//        utils.currview=0;
        return true;
      }
      break;
    }
  }

}

   function SetCurrPoint(currpoint){

     if(PointNum>MaxPointNum){
       PointNum = 0;
       LinePoint[PointNum].IsStart = true;//add by bing.wang.hz 2012-09-01
       //firstPoint = LinePoint[PointNum];//add by bing.wang.hz 2012-09-01 第一个采样点
     }
     else{
       LinePoint[PointNum].point.x = currpoint.x;
       LinePoint[PointNum].point.y = currpoint.y;
       utils.drawPointInfo(LinePoint[PointNum].point.x, LinePoint[PointNum].point.y,context);
       PointNum++;
      // drawTraceLine();
     }
   }


  function drawVerLine(){
   var dasharray;
    context.beginPath();
    context.strokeStyle ='green';

  for(var i=0;i<TestLineNum;i++){
    context.moveTo(myline[i][0].x,myline[i][0].y);
    context.lineTo(myline[i][1].x,myline[i][1].y);
    context.stroke();

  if(i==0 || i==4){

    context.moveTo(myline[i][0].x-fdisedgethr, myline[i][0].y);

    utils.dashedLine(myline[i][0].x-fdisedgethr, myline[i][0].y, myline[i][1].x-fdisedgethr, myline[i][1].y, dasharray,context);

    context.moveTo(myline[i][0].x+fdisedgethr, myline[i][0].y);

    utils.dashedLine(myline[i][0].x+fdisedgethr, myline[i][0].y, myline[i][1].x+fdisedgethr, myline[i][1].y, dasharray,context);

  }else{  //画中间的虚线
    context.moveTo(myline[i][0].x-fdisedgethr, myline[i][0].y)
    utils.dashedLine(myline[i][0].x-fdisedgethr, myline[i][0].y, myline[i][0].x-fdisedgethr, myline[i][0].y+fdisedgeHeight, dasharray,context);
    utils.dashedLine(myline[i][0].x-fdisedgethr, myline[i][0].y+fdisedgeHeight, myline[i][0].x-fdisthr, myline[i][0].y+fdisedgeHeight, dasharray,context);
    utils.dashedLine( myline[i][0].x-fdisthr, myline[i][0].y+fdisedgeHeight, myline[i][1].x-fdisthr, myline[i][1].y-fdisedgeHeight,dasharray,context);

    utils.dashedLine(myline[i][1].x-fdisthr, myline[i][1].y-fdisedgeHeight, myline[i][1].x-fdisedgethr, myline[i][1].y-fdisedgeHeight,dasharray,context);
    utils.dashedLine(myline[i][1].x-fdisedgethr, myline[i][1].y-fdisedgeHeight,myline[i][1].x-fdisedgethr, myline[i][1].y,dasharray,context); //画完左边的虚线


    context.moveTo(myline[i][0].x+fdisedgethr, myline[i][0].y);  //
    utils.dashedLine(myline[i][0].x+fdisedgethr, myline[i][0].y, myline[i][0].x+fdisedgethr, myline[i][0].y+fdisedgeHeight,dasharray,context);  //右边虚线
    utils.dashedLine(myline[i][0].x+fdisedgethr, myline[i][0].y+fdisedgeHeight,myline[i][0].x+fdisthr, myline[i][0].y+fdisedgeHeight,dasharray,context);
    utils.dashedLine(myline[i][0].x+fdisthr, myline[i][0].y+fdisedgeHeight, myline[i][1].x+fdisthr, myline[i][1].y-fdisedgeHeight,dasharray,context);

    utils.dashedLine(myline[i][1].x+fdisthr, myline[i][1].y-fdisedgeHeight, myline[i][1].x+fdisedgethr, myline[i][1].y-fdisedgeHeight,dasharray,context);
    utils.dashedLine(myline[i][1].x+fdisedgethr, myline[i][1].y-fdisedgeHeight, myline[i][1].x+fdisedgethr, myline[i][1].y,dasharray,context);
  }

  }
  }


  function drawTraceLine(){

    if(PointNum >1){  //只有在获取大于等于两个采样点时 才有轨迹可以描绘
     // for(var i=0;i < PointNum-1; i++){
      i = PointNum-2;
      //在浏览器上测试 不能取到movedown的点 直接是move的点 因此点的轨迹应该是PointNum-1  在手机上 down作为开始点 可以moveTo该点 以后的点用LineTo就可以画出
        if(LinePoint[i].IsStart ){
          context.beginPath();
          context.strokeStyle = 'red';
          context.moveTo(LinePoint[i].point.x,LinePoint[i].point.y);
          context.lineTo(LinePoint[i + 1].point.x, LinePoint[i + 1].point.y);
          context.stroke();
        }else if(LinePoint[i+1].IsStart){

        }
        else{
          context.lineTo(LinePoint[i + 1].point.x, LinePoint[i + 1].point.y);
          context.stroke();


//          context.beginPath();
//          if(LinePoint[i].IsBeyond){
//            context.strokeStyle ='red';
//          }else{
//            context.strokeStyle ='red';
//
//          }
//          context.moveTo(LinePoint[i].point.x,  //轨迹线为白色
//            LinePoint[i].point.y);
//          context.arc(LinePoint[i].point.x,  //轨迹线为白色
//            LinePoint[i].point.y,0.2,0,2*Math.PI);
//          context.stroke();

        }

     // }
    }

  }

  return{

    init : initialize,
    SetCurrPointState : SetCurrPointState,
    SetCurrPoint : SetCurrPoint

  };



}());