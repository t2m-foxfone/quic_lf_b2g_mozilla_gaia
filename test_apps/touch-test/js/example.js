/**
 * Created with JetBrains WebStorm.
 * User: archermind
 * Date: 4/29/13
 * Time: 6:30 PM
 * To change this template use File | Settings | File Templates.
 */
/**
 * Created with JetBrains WebStorm.
 * User: archermind
 * Date: 4/29/13
 * Time: 6:18 PM
 * To change this template use File | Settings | File Templates.
 */
var MyPoint={
  point:{},
  belongTo:0,//modified by bing.wang.hz for accuracy test 2012-08-81
  IsStart:false,
  IsEnd:false,//add by bing.wang.hz for Linearity Test 2012-09-01
  IsBeyond:0
}


const Example=(function Example()
{
  var LinePoint=new Array();
  var myline = new Array();

  for(var i=0;i<5;i++){
   // var MyPoint={};
    //MyPoint.point={};
    var point={};
    point.x=i;
    point.y=i+5;
    LinePoint[i]=point;
    console.log("point:  "+LinePoint[i].x +"       "+LinePoint[i].y);
  }

    for(i=0; i < 5; i++){ //实例化线的起点和终点
      myline[i] = new Array();
      for(var j=0;j<4;j++){
        var LineP1={};
        LineP1.x=0;
        LineP1.y=0;
        myline[i][j]=LineP1;
      }

      console.log("line: "+i +"point:"+myline[i][0].x +myline[i][0].y);
    }

}());