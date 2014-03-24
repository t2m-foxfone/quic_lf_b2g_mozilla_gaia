/**
 * Created with JetBrains WebStorm.
 * User: archermind
 * Date: 5/2/13
 * Time: 11:04 AM
 * To change this template use File | Settings | File Templates.
 */
const DiagonalLine=(function DiagonalLine(){
  var MaxPointNum = 8000;
  var LinePoint=new Array();
  var PointNum=0;
  var uptime=0;
  var myline=new Array();
  var currline =0;

  var maxdis=new Array();
  var mindis=new Array();
  var fdisthr=0;
  var fdisthry=0;
  var fdisthrx=0;

  var fdisedgethr=0;
  var fdisedgewidth=0;
  var fDiagonalL =0;

  var firstPoint = new Array();

  var edgemaxdis = new Array();
  var edgemindix = new Array();
  var edgemaxpoint = new Array();
  var isShortLine = new Array();

  var edgearea=new Array();

  var maxpoint=new Array();

  var testover = false;
  var testpass = true;
  var context;

  function initialize(){
    var i=0;
    for(;i<MaxPointNum;i++){
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

    for(i=0;i<4;i++){
      var tmp={};
      tmp.x=0;
      tmp.y=0;
      edgearea[i]=tmp;
    }

    for(i=0;i<2;i++){
      myline[i]=new Array();
      var point={};
      point.x=0;
      point.y=0;
      maxpoint[i]=point;
      edgemaxpoint[i]=point;
      for(var j=0;j<4;j++){
        var dgpoint={};
        dgpoint.x=0;
        dgpoint.y=0;
        myline[i][j]=dgpoint;
      }
    }
    testover=false;
    var canvas = document.getElementById('acc_canvas');
    context = canvas.getContext('2d');
    initVariable();
    initLine();
    drawDiagonalLine();
  }

  function initVariable(){
     PointNum=0;
     uptime=0;
     currline =0;
     fDiagonalL =0;
    testover = false;
    testpass = true;

  }

  function initLine(){
    fscaleX = getWidth() / TpInformation.tp_width;
    fscaleY = getHeight() / TpInformation.tp_length;

    var back_btn=document.getElementById('myButton');
    back_btn.style.left = getWidth()/4+"px";
    //back_btn.style.zIndex = -50;

    myline[0][0].x=0;
    myline[0][0].y =0;
    myline[0][1].x=getWidth();
    myline[0][1].y=getHeight();

    myline[0][2].x=0;
    myline[0][2].y=0;
    myline[0][3].x=TpInformation.tp_width;
    myline[0][3].y=TpInformation.tp_length;

    myline[1][0].x = getWidth();
    myline[1][0].y = 0;
    myline[1][1].x =0;
    myline[1][1].y= getHeight();

    myline[1][2].x=TpInformation.tp_width;
    myline[1][2].y=0;
    myline[1][3].x=0;
    myline[1][3].y=TpInformation.tp_length;
    mindis[0]=mindis[1]=TpInformation.tp_width>TpInformation.tp_length ? TpInformation.tp_width : TpInformation.tp_length;

    fDiagonalL = Math.sqrt(TpInformation.tp_width*TpInformation.tp_width + TpInformation.tp_length*TpInformation.tp_length);  //对角线的长度
    fdisthr = ((TpInformation.tp_linear_center_thr*fDiagonalL)/TpInformation.tp_width);  //thr/cos(a)
    fdisthry = fdisthr * fscaleY;
    fdisthr = ((TpInformation.tp_linear_center_thr*fDiagonalL)/TpInformation.tp_length);  //thr/sin(a)
    fdisthrx = fdisthr * fscaleX;

    fdisedgethr = fscaleY * TpInformation.tp_linear_edge_thr;
    fdisedgewidth = fscaleY * TpInformation.tp_radius;//add by bing.wang.hz 2012-09-01

  }


  function SetCurrPointState(state){
    console.log("lx:Diag state"+state+"\n");
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
        console.log("Diadg uptime:  "+uptime);
        if(uptime >= 2*TpInformation.tp_each_line_test_time*TpInformation.tp_total_linearity_time)
        {
          testover=true;
//          utils.currview=2;
//          Auto_Test.ChangeView(utils.currview);
          return true;
        }else{

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
  function drawDiagonalLine(){

    var dasharray;
    context.beginPath();
    context.strokeStyle ='green';

    context.moveTo(myline[0][0].x,myline[0][0].y);//画实线
    context.lineTo(myline[0][1].x,myline[0][1].y);
    //context.stroke();
    context.moveTo(myline[1][0].x,myline[1][0].y);
    context.lineTo(myline[1][1].x,myline[1][1].y);
    context.stroke();

    context.moveTo(myline[0][0].x, myline[0][0].y+fdisthry);
    utils.dashedLine(myline[0][0].x, myline[0][0].y+fdisthry,myline[0][1].x-fdisthrx, myline[0][1].y, dasharray,context);

    context.moveTo(myline[0][0].x+fdisthrx, myline[0][0].y);
    utils.dashedLine(myline[0][0].x+fdisthrx, myline[0][0].y, myline[0][1].x, myline[0][1].y-fdisthry, dasharray,context);


    context.moveTo(myline[1][0].x-fdisthrx, myline[1][0].y);
    utils.dashedLine(myline[1][0].x-fdisthrx, myline[1][0].y,myline[1][1].x, myline[1][1].y-fdisthry,dasharray,context);

    context.moveTo(myline[1][0].x, myline[1][0].y+fdisthry);
    utils.dashedLine(myline[1][0].x, myline[1][0].y+fdisthry,myline[1][1].x+fdisthrx, myline[1][1].y, dasharray,context);

  }

  function drawTraceLine(){

    if(PointNum >1){  //只有在获取大于等于两个采样点时 才有轨迹可以描绘
     // for(var i=0;i < PointNum; i++){
     var i=PointNum-2;
        //在浏览器上测试 不能取到movedown的点 直接是move的点 因此点的轨迹应该是PointNum-1  在手机上 down作为开始点 可以moveTo该点 以后的点用LineTo就可以画出
        if(LinePoint[i].IsStart){
          context.beginPath();
          context.strokeStyle = 'red';
          context.moveTo(LinePoint[i].point.x,LinePoint[i].point.y);
          context.lineTo(LinePoint[i + 1].point.x, LinePoint[i + 1].point.y);
          context.stroke();
        } else if( LinePoint[i+1].IsStart){

//          context.moveTo(LinePoint[i].point.x,LinePoint[i].point.y);

        }
        else{

          context.lineTo(LinePoint[i + 1].point.x, LinePoint[i + 1].point.y);
          context.stroke();
//        }

     }
    }

  }


  return{
    init : initialize,
    SetCurrPointState : SetCurrPointState,
    SetCurrPoint : SetCurrPoint
  };


}());
