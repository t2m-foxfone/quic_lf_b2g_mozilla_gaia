const INFO1_W = 90;
const INFO1_H = 35;

function getWidth(){
  //return window.screen.width;
  //return 320;
  return 480;

}

function getHeight(){
  //return window.screen.height;
  //return 480;
  return 854;
}



//   var count=obj.value.length;//统计文本域里面有多少个字符了，注意留空不行额
//   var a = obj.setSelectionRange();//创建文本范围对象a
//   a.moveStart('character',count); //更改范围起始位置/*如果count改为0就把光标放在text中的字符的最前面*/
//   a.collapse(true); //将插入点移动到当前范围的开始或结尾。
//   a.select(); //将当前选中区置为当前对象，执行




var utils={
POINT_DOWN : 0,
POINT_UP : 1,
POINT_MOVE : 2,
resultstring:null,
text_x:getWidth()/7,
text_y: getHeight()/20*7,
currview:0,
dashedLine: function ut__dashedLine(x, y, x2, y2, dashArray,context) {

    context.beginPath();
    if(!dashArray) dashArray = [5, 5];
    var dashCount = dashArray.length;
    context.moveTo(x, y);
    var dx = (x2 - x);
    var dy = (y2 - y);  //有正 负之分
    var slope;
    if(dx==0){
      slope = dx / dy  //垂直线slope为0


    }else{
      slope= dy / dx
    }

    var distRemaining = Math.sqrt(dx * dx + dy * dy);
    var dashIndex = 0, draw = true;
    while(distRemaining >= 0.1) {
      var  dashelm=(dashIndex++)%dashCount
      var dashLength = dashArray[dashelm];
      if(dashLength > distRemaining) dashLength = distRemaining;
      var xStep = Math.sqrt(dashLength * dashLength / (1 + slope * slope));  //步长
      var signal;
      if(x2==x){
        var signal = (y2 > y ? 1 : -1);

        x += slope * xStep * signal;  //x轴不便

        y += xStep * signal; //y轴递交

      }else{
        var signal = (x2 > x ? 1 : -1);
        x += xStep * signal;
        y += slope * xStep * signal;
      }

      //x += xStep * signal;
      //y += slope * xStep * signal;
      if (draw){
        context.lineTo(x,y);
      } else {
        context.moveTo(x, y);
      }
      // context[draw ?'lineTo' : 'moveTo'](x, y);
      //context.stroke();
      distRemaining -= dashLength;
      draw = !draw;
    }
   context.stroke();
  },

  drawPointInfo: function ut_drawPointInfo(x, y,context) {
    dump("lx:drawPointInfo ("+x+" , "+y+")\n");
  var str = x + ', ' + y;
   context.fillStyle='#000';
    context.fillRect(this.text_x, this.text_y, INFO1_W, INFO1_H);
    context.fillStyle='red';
    //context.font='getHeight()/40 Arial';
    context.fillText(str, this.text_x+20, this.text_y+25);
}

};

