/**
 * Created with JetBrains WebStorm.
 * User: archermind
 * Date: 5/8/13
 * Time: 10:41 AM
 * To change this template use File | Settings | File Templates.
 */
'use strict';

var AccuratyView =(function AccuratyView()
{
 var CircleNum = 13;
 var MaxPointNum = 5000;

 var TestCircle = [];  //测试圈对象  TestCircle:{index:[{x:"", y:"", raduis:"", bedge:""}, {}, {}] }
 var PointNum = 0;  //采样点计数
 var LinePoint = [];
 var ClickPoint = [];//单击点  圈数*设置的点击次数*测试时间

 var pointDis = [];
 var weighCircle = [];

 var point = 0; //点击点计数


 var selectpoint = 0;
 var currentpoint = 0;  //距离触摸点最近的圈的索引  或者权重最大的圈
 var radius1 = 0;
 var radius = 0;
 var radius2 = 0;
 var upFirstPoint = 0;
 var upLastPoint = 0;
 var dis = 0;
 var dis_intime=0;
 var uptime = 0;
 var times = 0;
 var maxpoint=[];
 var pointDis=[];
 var weightCircle=[];
 var statDis=[];



 var current=[];
 var bpass = true;
 var bfirst = false;
 var testover=false;

 var clicknum=1;
 var accuracytime=TpInformation.tp_total_accuracy_test_time;

 var fscaleX=0;
 var fscaleY=0;
 var avgwidth=0
 var avgheight=0;
 var canvas=null;
 var context=null;
 var data=[];

var maxdis=[];
var avgdis=[];
var mindis=[];

 var bShowResult=false;

 var clickcount=0;

 function initialize(){

    for(var i=0;i<CircleNum;i++){
      data[i]=[];
      TestCircle[i]={};
      TestCircle[i].radius = 6.0;
      TestCircle[i].bedge = false;
      TestCircle[i].center_x = 0;
      TestCircle[i].center_y = 0;
      maxdis[i] = 0;
      avgdis[i] = 0;
      mindis[i] = 999;
      weightCircle[i] = 0;

      maxpoint[i]={};
      maxpoint[i].x=0;
      maxpoint[i].y=0;
      for(var j=0; j < TpInformation.clicknum; j++){
        data[i][j]={};
        data[i][j].dis=dis;
      }
    }
    var clicklength = CircleNum*TpInformation.clicknum*TpInformation.tp_total_accuracy_test_time;
    for(var i=0;i < clicklength;i++){
      ClickPoint[i]={};
      ClickPoint[i].IsStart = false;
      ClickPoint[i].IsEnd = false;
      ClickPoint[i].IsBeyond = false;
      ClickPoint[i].belongTo = 0;
      ClickPoint[i].point_x = 0;
      ClickPoint[i].point_y = 0;
    }

    for(var i=0;i<MaxPointNum;i++){
      LinePoint[i]={};
      LinePoint[i].IsStart = false;
      LinePoint[i].IsEnd = false;
      LinePoint[i].IsBeyond = false;
      LinePoint[i].belongTo = 0;
      LinePoint[i].point_x = 0;
      LinePoint[i].point_y = 0;
      pointDis[i]=0;
    }

    canvas = document.getElementById('acc_canvas');
    context = canvas.getContext('2d');
    initVariable();
    initTestPoint();
    myDrawCircle();
    myDrawLine();
  }

  function initVariable(){

    PointNum=0;
    selectpoint=0;
    currentpoint=0;
    point=0;
    dis=0;
    dis_intime=0;

    upFirstPoint=0;
    upLastPoint=0;
    testover=false;
    bfirst = false;
    bpass=true;
    bShowResult=false;
    uptime=0;
    clicknum = TpInformation.clicknum;


  }

 function initTestPoint(){   //测试圈的半径大小、位置设置
    fscaleX = getWidth() / TpInformation.tp_width;
    fscaleY = getHeight() / TpInformation.tp_length;
    radius2 = TpInformation.tp_radius *fscaleX;  //？？？？
    radius1 = TpInformation.tp_radius * fscaleX;  //？？？？？？？？？？
    radius = TpInformation.tp_thr * fscaleX;
    var edgeradius = (TpInformation.tp_edgethr) * fscaleX;  //自适应的边缘半径

    avgwidth = (getWidth()-radius2*2)/4;  //??????????平均宽度  每列圆之间的宽度
    avgheight = (getHeight()-radius2*2)/4;  //每排圆之间的高度 radius2为外圈大圆的半径
    var n=0;
    //console.log("Accuraty"+ fscaleX+"\n");

    var back_btn = document.getElementById('myButton');
    back_btn.style.left = radius2*2+"px";
    back_btn.style.top = radius2*2+"px";
    //back_btn.style.zIndex = -50;


    for(var i=0; i<3; i++)
    {
      for(var j=0; j<3; j++)
      {
        var tmp={};

        tmp.center_x = radius2 + avgwidth*(j*2);
        tmp.center_y = radius2 + avgheight*(i*2);


        if(n==3 || n==4 ||n==6 || n==8 || n==9)
        {  tmp.radius=6.0;
          tmp.bedge=false;
        }
        else
        {
          tmp.radius = edgeradius;
          tmp.bedge=true;
        }
        TestCircle[n]=tmp;
        n++;
      }
      if(n >= CircleNum)
        break;
      for(j=0; j<2; j++)
      {  var tmp={};

        tmp.center_x = radius2 + avgwidth*(j*2+1);
        tmp.center_y = radius2 + avgheight*(i*2+1);
        if(n==3 || n==4 || n==8 || n==9)
        {
          tmp.radius = radius;
          tmp.bedge = false;
        }
        else
        {
          tmp.radius=edgeradius;
          tmp.bedge = true;
        }
        TestCircle[n]=tmp;
        n++;
      }
    }

  }

  function SearchTarget(point_x,point_y){
    var targetpoint = 0;
    var mindis = getHeight();
    var dis = 0;
    for(var i=0; i<CircleNum; i++)
    {
      dis = Math.sqrt((point_x-TestCircle[i].center_x)*(point_x-TestCircle[i].center_x)
        +(point_y-TestCircle[i].center_y)*(point_y-TestCircle[i].center_y));
      if(dis < mindis)
      {
        mindis = dis;
        targetpoint = i;
      }
    }
    return targetpoint;

  }


  function DistanceP2P(P1, P2){
    var dispp = 0;

    dispp = Math.sqrt((P1.x - P2.x)*(P1.x - P2.x) + (P1.y - P2.y)*(P1.y - P2.y));
    return dispp;
  }

function SetCurrPointState(state){
    // console.log("lx:acc state: "+state+"\n");
    switch(state){
      case utils.POINT_DOWN:
        bpass = true;  //add_liangxin 此处将上以此的测试结果清除 以免影响后续的正确测试 在touchdown时设置的状态 并计算了距离 在touchup的时候处理了圆圈的变化 以及对测试结果进行了计算
        upFirstPoint = PointNum;  //按下时的采样点点数
        LinePoint[PointNum].IsStart=true;
        break;

      case utils.POINT_UP:
      {
       // console.log("lx:utils.POINT_UP");
        uptime++;  //抬起的次数

        if(clickcount == TpInformation.clicknum){  //点击次数和设定的单机次数相同 应该跳向下一个圈了
          var total=0;
          var max=0;


          for(var i=0;i < clickcount;i++){

            total += data[selectpoint][i].dis;  //选择圈的地i此点击的距离
            if(max < data[selectpoint][i].dis) {
              max = data[selectpoint][i].dis;
            }
          }
          avgdis[selectpoint] = total/clickcount;
          maxdis[selectpoint] = max;

          clickcount = 0;
        }

       data[selectpoint][clickcount].dis = dis;  //此处记录了每次点击的距离值
        clickcount++;
        ClickPoint[point].point_x = current.point_x;  //点击点
        ClickPoint[point].point_y = current.point_y;
        ClickPoint[point].belongTo = selectpoint;
        point++;
        if(uptime >= 13*clicknum*TpInformation.tp_total_accuracy_test_time){  //一轮测试结束
          point = 0;
          testover = true;   //测试超时
         // console.log("lx:should next test\n");  //自动测试中 此处可以跳转的下一个测试
//          utils.currview = 1;
//          Auto_Test.ChangeView(utils.currview);
         return true;

        } else {
          if(((uptime%clicknum)== 0) && (uptime >= clicknum)){
           // console.log("---------> clicknum:"+clicknum);

            selectpoint++;  //已经选择过的点计数  点击次数够了 跳向下一个圈  选择(红色)圈数加1
           // console.log("lx:selectpoint++ :"+selectpoint+"\n");
            if(selectpoint == CircleNum){
              selectpoint = 0;
              // times++;
            }


            if(clicknum!=1){
              bfirst = true;  //this.clicknum不为1的标识
            }
          } else {
            bfirst = false;
          }
        }


        if(PointNum>0){
          PointNum--;
          upLastPoint = PointNum;
          CalculateResult();   //up的时候输出结果
          if (!bShowResult) {
            bShowResult = true;  //显示结果的标志
          }
          PointNum++;

          myDrawCircle();  //画圆 更新圆
        }

        for(var i=0;i< CircleNum;i++){
          weightCircle[i] = 0;
        }

        break;
      }
      case utils.POINT_MOVE:
        break;

    }

  }

function SetCurrPoint(point_x,point_y){
    if(PointNum > MaxPointNum) {
      PointNum = 0;  //
      LinePoint[PointNum].IsStart=true;
    } else {
      //  console.log("calculate distance\n");
      LinePoint[PointNum].point_x = point_x;
      LinePoint[PointNum].point_y = point_y;
      current.point_x = point_x;
      current.point_y = point_y;
      currentpoint = SearchTarget(point_x, point_y);
       weightCircle[currentpoint]++;
     LinePoint[PointNum].belongTo = selectpoint;
      var tmpp1 ={};
      tmpp1.x =TestCircle[selectpoint].center_x/fscaleX;
      tmpp1.y =TestCircle[selectpoint].center_y/fscaleY;

      var tmpp2={};
      tmpp2.x =point_x / fscaleX;
      tmpp2.y =point_y / fscaleY;

      dis = DistanceP2P(tmpp1, tmpp2);
      pointDis[PointNum] = dis;   //采样点的点点距离(测试圈圆心和触摸点的距离)

      var thr =TpInformation.tp_thr;
      if(TestCircle[currentpoint].bedge){
        thr = TpInformation.tp_edgethr;
      }

      dis_intime = dis;  //dis_intime未使用到 实时距离
      LinePoint[PointNum].IsBeyond = false;
      if(dis >thr){
        LinePoint[PointNum].IsBeyond = true;
      }
      if(!bfirst){
        if(LinePoint[PointNum].IsBeyond)
          bpass=false;  //超出阀值 则不能通过测试
        if(dis >maxdis[currentpoint]){
         maxdis[currentpoint] = dis;
         maxpoint[currentpoint].x = point_x;
         maxpoint[currentpoint].y = point_y;
        }
        if(dis < mindis[currentpoint]){
         mindis[currentpoint] =dis;
        }
      }
    }
    utils.drawPointInfo(LinePoint[PointNum].point_x, LinePoint[PointNum].point_y,context);
    PointNum++;

}

  function CalculateResult(){
    var temp=0;
    var i
    var tmpMaxDis= 0,
      tmpMinDis= 999; //?????????
    var tmpMaxPoint={};
    for(i=0;i<CircleNum;i++){
      if( weightCircle[i]>=temp){
        temp = weightCircle[i];
        currentpoint = i;  //去得最大的权重圈

      }
    }

    var thr;
    if(TestCircle[currentpoint].bedge){
      thr=TpInformation.tp_edgethr;
    }else{
      thr = TpInformation.tp_thr;
    }
    if(weightCircle[currentpoint] <4){

      i =upFirstPoint;
      for(;i<upLastPoint;i++){
        if(currentpoint ==LinePoint[i].belongTo){
          if(pointDis[i] > thr){
            LinePoint[i].IsBeyond = true;
          }
          if(LinePoint[i].IsBeyond){
            bpass=false;
          }
          if(pointDis[i] > tmpMaxDis){
            tmpMaxDis = pointDis[i];
            tmpMaxPoint.x = LinePoint[i].point_x;
            tmpMaxPoint.y = LinePoint[i].point_y
          }
          if(pointDis[i] <mindis[currentpoint]){  //???????????????????????
            //if(pointDis[i] <tmpMinDis){
            tmpMinDis = pointDis[i];   //取计算的距离为临时最小距离
          }
        }else{
          LinePoint[i].IsBeyond =true;
          if(LinePoint[i].IsBeyond)
            bpass = false;
        }

      }
    }else{

     // console.log("====the case 2 has been excute,and the weightCircle[currentpoint] is " + weightCircle[currentpoint]+"\n");
      var min = 0, max = 0, count = 0;
      min = weightCircle[currentpoint] /4;
      max = weightCircle[currentpoint] -min;
      i = upFirstPoint;
      for(;i < upLastPoint;i++){
        if(currentpoint = LinePoint[i].belongTo){
          if(pointDis[i] > thr){
            LinePoint[i].IsBeyond = true;
          }
          if(count > min){
            if(count<=max){
              if(LinePoint[i].IsBeyond)
                bpass =false;
              if(pointDis[i] >tmpMaxDis){
                tmpMaxDis = pointDis[i];
                tmpMaxPoint.x=LinePoint[i].point_x;
                tmpMaxPoint.y=LinePoint[i].point_y;
              }
              if(pointDis[i]<mindis[currentpoint]){

                tmpMinDis = pointDis[i];
              }
            }else{
              break;
            }
          }
          count++;
        }else{
          LinePoint[i].IsBeyond =true;
          if(LinePoint[i].IsBeyond)
            bpass =false;

        }

      }

    }
    //showPoint =currentPoint;  //showPoint没有用到
    setResultString();


  }

function setResultString(){
    var tmpstr = "";
    //boolean ng = true;
    utils.resultstring = "Accuracy Result: ";
    if(bpass)
    {
      utils.resultstring += "PASS\n";
    }
    else
    {
      utils.resultstring += "NG\n"; //测试未通过

    }
    utils.resultstring += "******************************************\n";
    for(var i=0;i<CircleNum;i++){


      tmpstr = (i+1);   //1-13
      tmpstr += "Max = "+maxdis[i]+" Avg = " +avgdis[i]; //最大距离 平均距离
      tmpstr += " MaxPoint("+ maxpoint[currentpoint].x+","+maxpoint[currentpoint].y+")" +"\n"; //圈最大点左边

      if(testover){
        var clicklength = CircleNum * clicknum * TpInformation.tp_total_accuracy_test_time;
        for(var p = 0;p < clicklength;p++)
        {
          console.log("bbb: " + ClickPoint[p].point_x + "  belog: " + ClickPoint[p].belongTo + " i: " + i+"\n");
          if(ClickPoint[p].belongTo == i)
          {
            tmpstr += "(" +ClickPoint[p].point_x + "," + ClickPoint[p].point_y + ")\n";
            tmpstr += "******************\n";
          }
        }
      }
      utils.resultstring += tmpstr;
      tmpstr = "";

    }
    utils.resultstring += "******************************************\n";
    console.log("resultstring"+utils.resultstring);

  }

 function  myDrawCircle() {

    //console.log("selectpoint is:" + selectpoint +"\n");

    for(var i=0; i<CircleNum; i++)
    {

      //console.log("selectpoint is:" +selectpoint +"\n");
      var tmpradius = TestCircle[i].radius;

      context.beginPath();
      if(i == selectpoint){  //被选中的圈为红色 默认第一个圆为被选中的圆
        context.strokeStyle = 'red';
      } else{
        //未被选中的圈为绿色圈
        context.strokeStyle = 'green';
      }

      context.arc(TestCircle[i].center_x, TestCircle[i].center_y,
        tmpradius, 0, Math.PI*2);  //小圈边境 radius

      context.moveTo(TestCircle[i].center_x+radius1,TestCircle[i].center_y);//如果不给出起点 会以上次的终点为起点 中间会多出一条线
      context.arc(TestCircle[i].center_x, TestCircle[i].center_y,
        radius1, 0, Math.PI*2,true);  //大圈半径
      // context.closePath();

      context.stroke();

    }

  }

  function myDrawLine(){

    var dasharray;  //虚线长度数组
    for(var j=0;j<5;j++){  //垂直竖线
      utils.dashedLine(radius2 + avgwidth*j, 0, radius2 + avgwidth*j, getHeight(), dasharray, context);
    }
    for(var j=0;j<5;j++){  //5条横线


      utils.dashedLine(0, radius2 + avgheight*j,getWidth(), radius2 + avgheight*j, dasharray,context);

    }
  }

  function drawTrace(){
    if(PointNum >1){//只有在获取大于等于两个采样点时 才有轨迹可以描绘
      var i = PointNum-2;
      //在浏览器上测试 不能取到movedown的点 直接是move的点 因此点的轨迹应该是PointNum-1  在手机上 down作为开始点 可以moveTo该点 以后的点用LineTo就可以画出
      if(LinePoint[i].IsStart){

        context.arc(LinePoint[i].point_x, LinePoint[i].point_y,1,0,2*Math.PI);
        context.strokeStyle = 'red';
        context.stroke();
        context.beginPath();
        context.moveTo(LinePoint[i].point_x, LinePoint[i].point_y);

      } else if(LinePoint[i+1].IsStart){
        context.beginPath();
        context.arc(LinePoint[i+1].point_x, LinePoint[i+1].point_y, 1, 0, 2*Math.PI);
        context.strokeStyle = 'red';
        context.stroke();
        context.beginPath();
        context.moveTo(LinePoint[i+1].point_x, LinePoint[i+1].point_y);
      }else{
        context.strokeStyle = 'red';
        context.lineWidth = 1;
        context.lineTo(LinePoint[i+1].point_x, LinePoint[i+1].point_y);
        context.stroke();
      }
    }

  }

return {
  init:initialize,
  SetCurrPointState:SetCurrPointState,
  SetCurrPoint:SetCurrPoint
};

}());











