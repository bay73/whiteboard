goog.provide('bay.whiteboard.geometry');

goog.require('bay.whiteboard')
goog.require('bay.whiteboard.Collection')

// *************************************** PointAtLine ******************************************* //
bay.whiteboard.geometry.PointAtLine = function(l, t){
  bay.whiteboard.Point.call(this);
  this.obj = l;
  l.dependant.push(this);
  this.param = t;
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.PointAtLine, bay.whiteboard.Point);

bay.whiteboard.geometry.PointAtLine.prototype.moveTo = function(x, y){
  if (this.obj){
    var point = this.obj.closestPoint(x, y);
    this.param = point.param;
  }
  this.recalc();
  this.onChange();
}

bay.whiteboard.geometry.PointAtLine.prototype.acceptData = function(data){
  bay.whiteboard.geometry.PointAtLine.superClass_.acceptData.call(this, data);
  if (this.obj){
    var point = this.obj.closestPoint(data.x, data.y);
    this.param = point.param;
  }
  this.recalc();
}

bay.whiteboard.geometry.PointAtLine.prototype.recalc = function(){
  if(!this.obj || !this.obj.exists || this.param == null){
    this.exists = false;
  }else{
    this.exists = true;
    this.x = this.obj.startPoint.x + this.obj.direction.x * this.param;
    this.y = this.obj.startPoint.y + this.obj.direction.y * this.param;
  }
  this.recalcDependant();
}

bay.whiteboard.geometry.PointAtLine.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PointAtLine", "obj": ' + list.indexOf(this.obj) + ', "t": ' + this.param + '}';
}

bay.whiteboard.geometry.PointAtLine.fromJson = function(item, list){
  var point = new bay.whiteboard.geometry.PointAtLine( list[item.obj], item.t);
  point.restoreFromJson(item);
  return point;
}

bay.whiteboard.Collection.setFromJsonFunc("PointAtLine", bay.whiteboard.geometry.PointAtLine.fromJson);


// *************************************** PointAtCircle ******************************************* //
bay.whiteboard.geometry.PointAtCircle = function(c, v){
  bay.whiteboard.Point.call(this);
  this.obj = c;
  c.dependant.push(this);
  this.direction = v;
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.PointAtCircle, bay.whiteboard.Point);

bay.whiteboard.geometry.PointAtCircle.prototype.moveTo = function(x, y){
  if (this.obj){
    var point = this.obj.closestPoint(x, y);
    this.direction = point.direction;
  }
  this.recalc();
  this.onChange();
}

bay.whiteboard.geometry.PointAtCircle.prototype.acceptData = function(data){
  bay.whiteboard.geometry.PointAtCircle.superClass_.acceptData.call(this, data);
  if (this.obj){
    var point = this.obj.closestPoint(data.x, data.y);
    this.direction = point.direction;
  }
  this.recalc();
}


bay.whiteboard.geometry.PointAtCircle.prototype.recalc = function(){
  if(!this.obj || !this.obj.exists || !this.direction){
    this.exists = false;
  }else{
    d = Math.sqrt(this.direction.x*this.direction.x + this.direction.y*this.direction.y);
    if (d != 0){
      this.exists = true;
      this.x = this.obj.centerPoint.x + this.obj.radius * this.direction.x / d;
      this.y = this.obj.centerPoint.y + this.obj.radius * this.direction.y / d;
    }else{
      this.exists = false;
    }
  }
  this.recalcDependant();
}

bay.whiteboard.geometry.PointAtCircle.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PointAtCircle", "obj": ' + list.indexOf(this.obj) + ', "x": ' + this.direction.x + ', "y": ' + this.direction.y + '}';
}

bay.whiteboard.geometry.PointAtCircle.fromJson = function(item, list){
  var point = new bay.whiteboard.geometry.PointAtCircle( list[item.obj], new bay.whiteboard.Vector(item.x, item.y));
  point.restoreFromJson(item);
  return point;
}
bay.whiteboard.Collection.setFromJsonFunc("PointAtCircle", bay.whiteboard.geometry.PointAtCircle.fromJson);


// *************************************** TwoLineIntersectionPoint ******************************************* //
bay.whiteboard.geometry.Point_2l = function(l1, l2){
  bay.whiteboard.Point.call(this);
  this.obj1 = l1;
  this.obj2 = l2;
  l1.dependant.push(this);
  l2.dependant.push(this);
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.Point_2l, bay.whiteboard.Point);

bay.whiteboard.geometry.Point_2l.prototype.deleteElement = function(){
  this.obj1.deleteDependant(this);
  this.obj2.deleteDependant(this);
}

bay.whiteboard.geometry.Point_2l.prototype.recalc = function(){
  if (!this.obj1 || !this.obj2 || !this.obj1.exists || !this.obj2.exists){
    this.exists = false;
  }else{
    // two lines intersection points
    var a = this.obj1.direction.x;
    var b = this.obj1.direction.y;
    var a1 = this.obj2.direction.x;
    var b1 = this.obj2.direction.y;
    var d = a1*b - b1*a;
    // check if the lines are parallel
    if (d == 0){
      this.exists = false;
    }else{
      this.exists = true;
      var t = (b*(this.obj1.startPoint.x - this.obj2.startPoint.x) - a*(this.obj1.startPoint.y - this.obj2.startPoint.y))/d;
      this.x = this.obj2.startPoint.x + a1 * t;
      this.y = this.obj2.startPoint.y + b1 * t;
    }
  }
  this.recalcDependant();
}

bay.whiteboard.geometry.Point_2l.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "Point_2l", "obj1": ' + list.indexOf(this.obj1) + ', "obj2": ' + list.indexOf(this.obj2) + '}';
}

bay.whiteboard.geometry.Point_2l.fromJson = function(item, list){
  var point = new bay.whiteboard.geometry.Point_2l( list[item.obj1], list[item.obj2]);
  point.restoreFromJson(item);
  return point;
}
bay.whiteboard.Collection.setFromJsonFunc("Point_2l", bay.whiteboard.geometry.Point_2l.fromJson);



// *************************************** TwoCircleIntersectionPoint ******************************************* //

bay.whiteboard.geometry.Point_2c = function(c1, c2, num){
  bay.whiteboard.Point.call(this);
  this.obj1 = c1;
  this.obj2 = c2;
  c1.dependant.push(this);
  c2.dependant.push(this);
  this.intersectNum = num;
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.Point_2c, bay.whiteboard.Point);

bay.whiteboard.geometry.Point_2c.prototype.deleteElement = function(){
  this.obj1.deleteDependant(this);
  this.obj2.deleteDependant(this);
}

bay.whiteboard.geometry.Point_2c.prototype.recalc = function(){
  if (!this.obj1 || !this.obj2 || !this.obj1.exists || !this.obj2.exists){
    this.exists = false;
  }else{
    // two circles intersection point
    var r1 = this.obj1.radius;
    var r2 = this.obj2.radius;
    var a = this.obj2.centerPoint.x - this.obj1.centerPoint.x;
    var b = this.obj2.centerPoint.y - this.obj1.centerPoint.y;
    var d2 = a*a + b*b;
    var d = Math.sqrt(a*a + b*b);
    if (d > r1+r2 || d < r2-r1 || d < r1-r2 || d==0){
      this.exists = false;
    }else{
      var p = (r1*r1 - r2*r2 + d2 ) / (2*d);
      var h = Math.sqrt( r1*r1 - p*p );
      var x = this.obj1.centerPoint.x + p*(this.obj2.centerPoint.x - this.obj1.centerPoint.x) / d;
      var y = this.obj1.centerPoint.y + p*(this.obj2.centerPoint.y - this.obj1.centerPoint.y) / d;
      this.exists = true;
      if (this.intersectNum == 1){
        this.x = x + h * (this.obj2.centerPoint.y - this.obj1.centerPoint.y) / d;
        this.y = y - h * (this.obj2.centerPoint.x - this.obj1.centerPoint.x) / d;
      }else{
        this.x = x - h * (this.obj2.centerPoint.y - this.obj1.centerPoint.y) / d;
        this.y = y + h * (this.obj2.centerPoint.x - this.obj1.centerPoint.x) / d;
      }
    }
  }
  this.recalcDependant();
}

bay.whiteboard.geometry.Point_2c.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "Point_2c", "obj1": ' + list.indexOf(this.obj1) + ', "obj2": ' + list.indexOf(this.obj2) + ', "num": ' + this.intersectNum +'}';
}

bay.whiteboard.geometry.Point_2c.fromJson = function(item, list){
  var point = new bay.whiteboard.geometry.Point_2c( list[item.obj1], list[item.obj2], item.num);
  point.restoreFromJson(item);
  return point;
}

bay.whiteboard.Collection.setFromJsonFunc("Point_2c", bay.whiteboard.geometry.Point_2c.fromJson);

// *************************************** LineAndCircleIntersectionPoint ******************************************* //

bay.whiteboard.geometry.Point_lc = function(l, c, num){
  bay.whiteboard.Point.call(this);
  this.obj1 = l;
  this.obj2 = c;
  l.dependant.push(this);
  c.dependant.push(this);
  this.intersectNum = num;
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.Point_lc, bay.whiteboard.Point);

bay.whiteboard.geometry.Point_lc.prototype.deleteElement = function(){
  this.obj1.deleteDependant(this);
  this.obj2.deleteDependant(this);
}

bay.whiteboard.geometry.Point_lc.prototype.recalc = function(){
  if (!this.obj1 || !this.obj2 || !this.obj1.exists || !this.obj2.exists){
    this.exists = false;
  }else{
    if (this.obj1.distanceTo(this.obj2.centerPoint) > this.obj2.radius){
      this.exists = false;
    }else{
      var a = this.obj1.direction.x * this.obj1.direction.x + this.obj1.direction.y * this.obj1.direction.y;
      var b = 2*this.obj1.direction.x*(this.obj1.startPoint.x - this.obj2.centerPoint.x) + 2*this.obj1.direction.y*(this.obj1.startPoint.y - this.obj2.centerPoint.y)
      var c = (this.obj1.startPoint.x - this.obj2.centerPoint.x)*(this.obj1.startPoint.x - this.obj2.centerPoint.x) +
              (this.obj1.startPoint.y - this.obj2.centerPoint.y)*(this.obj1.startPoint.y - this.obj2.centerPoint.y) -
               this.obj2.radius * this.obj2.radius;
      var D = Math.sqrt(b * b - 4 * a * c);
      this.exists = true;
      if (this.intersectNum == 1){
        var t = (-b + D ) / (2 * a);
      }else{
        var t = (-b - D ) / (2 * a);
      }
      this.x = this.obj1.startPoint.x + t * this.obj1.direction.x;
      this.y = this.obj1.startPoint.y + t * this.obj1.direction.y;
    }
  }
  this.recalcDependant();
}

bay.whiteboard.geometry.Point_lc.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "Point_lc", "obj1": ' + list.indexOf(this.obj1) + ', "obj2": ' + list.indexOf(this.obj2) + ', "num": ' + this.intersectNum + '}';
}

bay.whiteboard.geometry.Point_lc.fromJson = function(item, list){
  var point = new bay.whiteboard.geometry.Point_lc( list[item.obj1], list[item.obj2], item.num);
  point.restoreFromJson(item);
  return point;
}

bay.whiteboard.Collection.setFromJsonFunc("Point_lc", bay.whiteboard.geometry.Point_lc.fromJson);

bay.whiteboard.Whiteboard.addTool(
  "point", "geometry",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_pointCursor'); board.tool.current.point = {};},
    toggleOff: function(board) { board.clearCurrentTool('bwb_pointCursor', 'point');},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      board.tool.current.toggleOff(board);
      board.redrawAll();
    }
  }
);


// *************************************** Line **************************************** //
bay.whiteboard.geometry.Line = function(){
  bay.whiteboard.Element.call(this);
  this.startPoint = null;
  this.direction = null;
  this.noLabel = true;
}

goog.inherits(bay.whiteboard.geometry.Line, bay.whiteboard.Element);

bay.whiteboard.geometry.Line.prototype.toString = function(){
  if(!this.exists) return 'Line does not exist';
  return 'Line [' + this.startPoint.x.toFixed(2) + ', ' + this.startPoint.y.toFixed(2) + '] - [' + (this.startPoint.x + this.direction.x).toFixed(2) + ', ' + (this.startPoint.y + this.direction.y).toFixed(2) + ']';
}

bay.whiteboard.geometry.Line.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  return Math.abs(this.direction.x * (to.y - this.startPoint.y) - this.direction.y * (to.x - this.startPoint.x)) / Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
}

bay.whiteboard.geometry.Line.prototype.closestPoint = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var t = (this.direction.x*(to.x - this.startPoint.x) + this.direction.y *(to.y - this.startPoint.y))/(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
  return new bay.whiteboard.geometry.PointAtLine(this, t);
}

bay.whiteboard.geometry.Line.prototype.getMinAndMaxParamValue = function (area){
  // intersections with vertical boundaries
  var l1 = -Number.MAX_VALUE;
  var r1 = Number.MAX_VALUE;
  if (this.direction.x != 0){
    l1 = (area.minX - this.startPoint.x)/this.direction.x;
    r1 = (area.maxX - this.startPoint.x)/this.direction.x;
    if (l1 > r1){ var swap = r1; r1 = l1; l1 = swap; }
  }
  // intersections with horizontal boundaries
  var l2 = -Number.MAX_VALUE;
  var r2 = Number.MAX_VALUE;
  if (this.direction.y != 0){
    l2 = (area.minY - this.startPoint.y)/this.direction.y;
    r2 = (area.maxY - this.startPoint.y)/this.direction.y;
    if (l2 > r2){ var swap = r2; r2 = l2; l2 = swap; }
  }
  if (l1 < r2 && r1 > l2){
    var l = l2;
    if(l1 > l2) l = l1;
    var r = r2;
    if(r1 < r2) r = r1;
    return {min: l, max: r};
  }else{
    return null;
  }
}

bay.whiteboard.geometry.Line.prototype.draw = function(board){
  // draw line if it exists and intersectthe area
  if(!this.exists) return;
  var val = this.getMinAndMaxParamValue(board.area);
  if (val){
    var coords = board.transform([this.startPoint.x + val.min * this.direction.x, this.startPoint.y + val.min * this.direction.y,
                                  this.startPoint.x + val.max * this.direction.x, this.startPoint.y + val.max * this.direction.y]);
    var path = new goog.graphics.Path();
    path.moveTo( coords[0], coords[1] );
    path.lineTo( coords[2], coords[3] );
    if (this.current){
      var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
      board.graphics.drawPath(path, stroke, null);
    } else {
      if (this.hover){
        var stroke = new goog.graphics.Stroke(board.properties.hover.width, board.properties.hover.color);
        board.graphics.drawPath(path, stroke, null);
      }
      var color = board.properties.line.color;
      if (this.color){
        color = this.color;
      }
      var stroke = new goog.graphics.Stroke(board.properties.line.width, color);
      board.graphics.drawPath(path, stroke, null);
    }
  }
}

bay.whiteboard.geometry.Line.prototype.getTrace = function(){
  var tracer = new bay.whiteboard.geometry.Line();
  tracer.startPoint = new bay.whiteboard.geometry.PointFree(this.startPoint);
  tracer.direction = new bay.whiteboard.Vector(this.direction);
  return tracer;
}


bay.whiteboard.Whiteboard.properties.line = {
  width: 1,
  color: 'Black'
}

// *************************************** GeneralLine **************************************** //
// Line represented by general equation a*x + b*y = c
bay.whiteboard.geometry.LineGeneral = function(a, b, c){
  bay.whiteboard.geometry.Line.call(this);
  this.a = a;
  this.b = b;
  this.c = c;
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.LineGeneral, bay.whiteboard.geometry.Line);

bay.whiteboard.geometry.LineGeneral.prototype.recalc = function(){
  if (this.a != null && this.b != null && this.c != null){
    if (this.a==0 && this.b==0){
      this.exists = false;
    }else{
      this.exists = true;
      if (this.a == 0){
        this.startPoint = new bay.whiteboard.PointFree(0, this.c / this.b);
        this.direction = new bay.whiteboard.Vector(1, 0);
      }else if (this.b == 0){
        this.startPoint = new bay.whiteboard.PointFree(this.c / this.a, 0);
        this.direction = new bay.whiteboard.Vector(0, 1);
      }else{
        this.startPoint = new bay.whiteboard.PointFree(0, this.c / this.b);
        this.direction = new bay.whiteboard.Vector(1 / this.a, -1 / this.b);
      }
    }
  } else {
    this.exists = false;
  }
  this.recalcDependant();
}

bay.whiteboard.geometry.LineGeneral.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "LineGeneral", "a": ' + this.a + ', "b": ' + this.b + ', "c": ' + this.c + '}';
}

bay.whiteboard.geometry.LineGeneral.fromJson = function(item, list){
  var line = new bay.whiteboard.geometry.LineGeneral( item.a, item.b, item.c);
  line.restoreFromJson(item);
  return line;
}

bay.whiteboard.Collection.setFromJsonFunc("LineGeneral", bay.whiteboard.geometry.LineGeneral.fromJson);


// *************************************** TwoPointLine **************************************** //
// line going through two points
bay.whiteboard.geometry.Line_2p = function(p1, p2){
  bay.whiteboard.geometry.Line.call(this);
  this.startPoint = p1;
  this.endPoint = p2;
  p1.dependant.push(this);
  p2.dependant.push(this);
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.Line_2p, bay.whiteboard.geometry.Line);

bay.whiteboard.geometry.Line_2p.prototype.deleteElement = function(){
  this.startPoint.deleteDependant(this);
  this.endPoint.deleteDependant(this);
}

bay.whiteboard.geometry.Line_2p.prototype.recalc = function(){
  if (!this.startPoint || !this.endPoint || !this.startPoint.exists || !this.endPoint.exists){
    this.exists = false;
  } else {
    this.exists = true;
    this.direction = new bay.whiteboard.Vector(this.endPoint.x - this.startPoint.x, this.endPoint.y - this.startPoint.y);
  }
  this.recalcDependant();
}

bay.whiteboard.Whiteboard.addTool(
  "ruler", "geometry",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_rulerCursor'); board.tool.current.ruler = {};},
    toggleOff: function(board) { board.clearCurrentTool('bwb_rulerCursor', 'ruler');},
    onMove: function(board, e) { if (board.tool.current.ruler.endTmp) {board.tool.current.ruler.endTmp.moveTo(board.getConvertEventPos(e)); }},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.ruler.start){
        board.collections.main.add(new bay.whiteboard.geometry.Line_2p(board.tool.current.ruler.start, point));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else{
        board.collections.current.clear();
        board.tool.current.ruler.start = point;
        board.collections.current.add(board.tool.current.ruler.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.ruler.endTmp.hide();
        var line = new bay.whiteboard.geometry.Line_2p(board.tool.current.ruler.start, board.tool.current.ruler.endTmp)
        line.current = true;
        board.collections.current.add(line);
      }
      board.redrawAll();
    }
  }
);

bay.whiteboard.geometry.Line_2p.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "Line_2p", "p1": ' + list.indexOf(this.startPoint) + ', "p2": ' + list.indexOf(this.endPoint) + '}';
}

bay.whiteboard.geometry.Line_2p.fromJson = function(item, list){
  var line = new bay.whiteboard.geometry.Line_2p( list[item.p1], list[item.p2]);
  line.restoreFromJson(item);
  return line;
}

bay.whiteboard.Collection.setFromJsonFunc("Line_2p", bay.whiteboard.geometry.Line_2p.fromJson);


// *************************************** Segment **************************************** //
// line segment connected two points
bay.whiteboard.geometry.Segment = function(p1, p2){
  bay.whiteboard.geometry.Line_2p.call(this, p1, p2);
}

goog.inherits(bay.whiteboard.geometry.Segment, bay.whiteboard.geometry.Line_2p);

bay.whiteboard.geometry.Segment.prototype.length = function(){
  return Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
}

bay.whiteboard.geometry.Segment.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var a = this.startPoint.y - to.y;
  var b = this.endPoint.y - to.y;
  if (this.direction.x != 0){
    a = this.startPoint.x - to.x + this.direction.y * (this.startPoint.y - to.y) / this.direction.x;
    b = this.endPoint.x - to.x + this.direction.y * (this.endPoint.y - to.y) / this.direction.x;
  }
  if (a*b <= 0){
    return Math.abs(this.direction.x * (to.y - this.startPoint.y) - this.direction.y * (to.x - this.startPoint.x)) / Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y)
  }else{
    a = this.startPoint.distance(to.x, to.y);
    b = this.endPoint.distance(to.x, to.y);
    if(a < b) return a;
    else return b;
  }
}

bay.whiteboard.geometry.Segment.prototype.draw = function(board){
  // draw segment if it exists and intersectthe area
  if(!this.exists) return;
  var val = this.getMinAndMaxParamValue(board.area);
  if (val && val.max > 0 && val.min < 1){
    // bound drawing with ends of segment
    if (val.min < 0) val.min = 0;
    if (val.max > 1) val.max = 1;
    var coords = board.transform([this.startPoint.x + val.min * this.direction.x, this.startPoint.y + val.min * this.direction.y,
                                  this.startPoint.x + val.max * this.direction.x, this.startPoint.y + val.max * this.direction.y]);
    var path = new goog.graphics.Path();
    path.moveTo( coords[0], coords[1] );
    path.lineTo( coords[2], coords[3] );
    if (this.current){
      var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
      board.graphics.drawPath(path, stroke, null);
    } else {
      if (this.hover){
        var stroke = new goog.graphics.Stroke(board.properties.hover.width, board.properties.hover.color);
        board.graphics.drawPath(path, stroke, null);
      }
      var color = board.properties.line.color;
      if (this.color){
        color = this.color;
      }
      var stroke = new goog.graphics.Stroke(board.properties.line.width, color);
      board.graphics.drawPath(path, stroke, null);
    }
  }
}

bay.whiteboard.geometry.Segment.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "Segment", "p1": ' + list.indexOf(this.startPoint) + ', "p2": ' + list.indexOf(this.endPoint) + '}';
}

bay.whiteboard.geometry.Segment.fromJson = function(item, list){
  var line = new bay.whiteboard.geometry.Segment( list[item.p1], list[item.p2]);
  line.restoreFromJson(item);
  return line;
}

bay.whiteboard.Collection.setFromJsonFunc("Segment", bay.whiteboard.geometry.Segment.fromJson);


bay.whiteboard.geometry.Segment.prototype.getTrace = function(){
  return new bay.whiteboard.geometry.Segment(new bay.whiteboard.geometry.PointFree(this.startPoint), new bay.whiteboard.geometry.PointFree(this.endPoint));
}

bay.whiteboard.Whiteboard.addTool(
  "segment", "geometry",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_rulerCursor'); board.tool.current.ruler = {};},
    toggleOff: function(board) { board.clearCurrentTool('bwb_rulerCursor', 'ruler');},
    onMove: function(board, e) { if (board.tool.current.ruler.endTmp) {board.tool.current.ruler.endTmp.moveTo(board.getConvertEventPos(e)); }},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.ruler.start){
        board.collections.main.add(new bay.whiteboard.geometry.Segment(board.tool.current.ruler.start, point));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else{
        board.collections.current.clear();
        board.tool.current.ruler.start = point;
        board.collections.current.add(board.tool.current.ruler.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.ruler.endTmp.hide();
        var line = new bay.whiteboard.geometry.Segment(board.tool.current.ruler.start, board.tool.current.ruler.endTmp)
        line.current = true;
        board.collections.current.add(line);
      }
      board.redrawAll();
    }
  }
);

// *************************************** Circle **************************************** //
bay.whiteboard.geometry.Circle = function(){
  bay.whiteboard.Element.call(this);
  this.centerPoint = null;
  this.radius = null;
  this.noLabel = true;
}

goog.inherits(bay.whiteboard.geometry.Circle, bay.whiteboard.Element);

bay.whiteboard.geometry.Circle.prototype.toString = function(){
  if(!this.exists) return 'Circle does not exist';
  return 'Circle [' + this.centerPoint.x.toFixed(2) + ', ' + this.centerPoint.y.toFixed(2) + '] -> ' + this.radius.toFixed(2);
}

bay.whiteboard.geometry.Circle.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  return Math.abs(this.centerPoint.distance(to.x, to.y) - this.radius);
}

bay.whiteboard.geometry.Circle.prototype.closestPoint = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var v = new bay.whiteboard.Vector(to.x - this.centerPoint.x, to.y - this.centerPoint.y);
  return new bay.whiteboard.geometry.PointAtCircle(this, v);
}

bay.whiteboard.geometry.Circle.prototype.draw = function(board){
  // draw circle if it exists and can touch the area
  if(!this.exists) return;
  if(this.centerPoint.x >= board.area.minX - this.radius &&
    this.centerPoint.x <= board.area.maxX + this.radius &&
    this.centerPoint.y >= board.area.minY - this.radius &&
    this.centerPoint.y <= board.area.maxY + this.radius){
    var coords = board.transform([this.centerPoint.x, this.centerPoint.y]);
    if (this.current){
      var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
      board.graphics.drawCircle(coords[0], coords[1], this.radius * board.area.transformation.getScaleX(), stroke, null);
    } else {
      if (this.hover){
        var stroke = new goog.graphics.Stroke(board.properties.hover.width, board.properties.hover.color);
        board.graphics.drawCircle(coords[0], coords[1], this.radius * board.area.transformation.getScaleX(), stroke, null);
      }
      var color = board.properties.circle.color;
      if (this.color){
        color = this.color;
      }
      var stroke = new goog.graphics.Stroke(board.properties.circle.width, color);
      board.graphics.drawCircle(coords[0], coords[1], this.radius * board.area.transformation.getScaleX(), stroke, null);
    }
  }
}

bay.whiteboard.geometry.Circle.prototype.getTrace = function(){
  var tracer = new bay.whiteboard.geometry.Circle();
  tracer.centerPoint = new bay.whiteboard.PointFree(this.centerPoint);
  tracer.radius = this.radius;
  return tracer;
}

bay.whiteboard.Whiteboard.properties.circle = {
  width: 1,
  color: 'Black'
}

// *************************************** GeneralCircle **************************************** //
// Circle represented by general equation (x - a)^2 + (x - и)^2 = с^2
bay.whiteboard.geometry.CircleGeneral = function(a, b, c){
  bay.whiteboard.geometry.Circle.call(this);
  this.a = a;
  this.b = b;
  this.c = c;
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.CircleGeneral, bay.whiteboard.geometry.Circle);

bay.whiteboard.geometry.CircleGeneral.prototype.recalc = function(){
  if (this.a != null && this.b != null && this.c != null){
    this.exists = true;
    this.centerPoint = new bay.whiteboard.PointFree(this.a, this.b);
    this.radius = Math.abs(this.c);
  } else {
    this.exists = false;
  }
  this.recalcDependant();
}

bay.whiteboard.geometry.CircleGeneral.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "CircleGeneral", "a": ' + this.a + ', "b": ' + this.b + ', "c": ' + this.c + '}';
}

bay.whiteboard.geometry.CircleGeneral.fromJson = function(item, list){
  var circle = new bay.whiteboard.geometry.CircleGeneral( item.a, item.b, item.c);
  circle.restoreFromJson(item);
  return circle;
}

bay.whiteboard.Collection.setFromJsonFunc("CircleGeneral", bay.whiteboard.geometry.CircleGeneral.fromJson);



// *************************************** ThreePointsCircle **************************************** //
// circle given by center point and two points which define radius
bay.whiteboard.geometry.Circle_3p = function(c, p1, p2){
  bay.whiteboard.geometry.Circle.call(this);
  this.centerPoint = c;
  this.startPoint = p1;
  this.endPoint = p2;
  c.dependant.push(this);
  p1.dependant.push(this);
  p2.dependant.push(this);
  this.recalc();
}

goog.inherits(bay.whiteboard.geometry.Circle_3p, bay.whiteboard.geometry.Circle);

bay.whiteboard.geometry.Circle_3p.prototype.deleteElement = function(){
  this.centerPoint.deleteDependant(this);
  this.startPoint.deleteDependant(this);
  this.endPoint.deleteDependant(this);
}

bay.whiteboard.geometry.Circle_3p.prototype.recalc = function(){
  if (!this.centerPoint || !this.startPoint || !this.endPoint || !this.centerPoint.exists || !this.startPoint.exists || !this.endPoint.exists){
    this.exists = false;
  } else {
    this.exists = true;
    this.radius = this.startPoint.distanceTo(this.endPoint);
  }
  this.recalcDependant();
}

bay.whiteboard.geometry.Circle_3p.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "Circle_3p", "p1": ' + list.indexOf(this.centerPoint) + ', "p2": ' + list.indexOf(this.startPoint) + ', "p3": ' + list.indexOf(this.endPoint) + '}';
}

bay.whiteboard.geometry.Circle_3p.fromJson = function(item, list){
  var circle = new bay.whiteboard.geometry.Circle_3p( list[item.p1], list[item.p2], list[item.p3]);
  circle.restoreFromJson(item);
  return circle;
}

bay.whiteboard.Collection.setFromJsonFunc("Circle_3p", bay.whiteboard.geometry.Circle_3p.fromJson);


bay.whiteboard.Whiteboard.addTool(
  "compass", "geometry",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_compassCursor'); board.tool.current.compass = {};},
    toggleOff: function(board) { board.clearCurrentTool('bwb_compassCursor', 'compass');},
    onMove: function(board, e) {
      if (board.tool.current.compass.centerTmp) {board.tool.current.compass.centerTmp.moveTo(board.getConvertEventPos(e)); }
      else if (board.tool.current.compass.endTmp) {board.tool.current.compass.endTmp.moveTo(board.getConvertEventPos(e)); }
    },
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.compass.end){
        board.collections.main.add(new bay.whiteboard.geometry.Circle_3p(point, board.tool.current.compass.start, board.tool.current.compass.end));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else if (board.tool.current.compass.start){
        board.collections.current.clear();
        board.tool.current.compass.end = point;
        board.collections.current.add(board.tool.current.compass.centerTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.compass.centerTmp.hide()
        var circle = new bay.whiteboard.geometry.Circle_3p(board.tool.current.compass.centerTmp, board.tool.current.compass.start, board.tool.current.compass.end);
        circle.current = true;
        board.collections.current.add(circle);
      }else{
        board.collections.current.clear();
        board.tool.current.compass.start = point;
        board.collections.current.add(board.tool.current.compass.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.compass.endTmp.hide();
        var line = new bay.whiteboard.geometry.Segment(board.tool.current.compass.start, board.tool.current.compass.endTmp)
        line.current = true;
        board.collections.current.add(line);
      }
      board.redrawAll();
    }
  }
);

bay.whiteboard.Whiteboard.addTool(
  "circle", "geometry",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_compassCursor'); board.tool.current.compass = {};},
    toggleOff: function(board) { board.clearCurrentTool('bwb_compassCursor', 'compass');},
    onMove: function(board, e) {
      if (board.tool.current.compass.endTmp) {board.tool.current.compass.endTmp.moveTo(board.getConvertEventPos(e)); }
    },
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.compass.start){
        board.collections.main.add(new bay.whiteboard.geometry.Circle_3p(board.tool.current.compass.start, board.tool.current.compass.start, point));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else{
        board.collections.current.clear();
        board.tool.current.compass.start = point;
        board.collections.current.add(board.tool.current.compass.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.compass.endTmp.hide();
        var circle = new bay.whiteboard.geometry.Circle_3p(board.tool.current.compass.start, board.tool.current.compass.start, board.tool.current.compass.endTmp)
        circle.current = true;
        board.collections.current.add(circle);
      }
      board.redrawAll();
    }
  }
);

// ************************************* static methods ***************************************************//
bay.whiteboard.geometry.getIntersection = function(obj1, obj2, x, y){
  if(obj1 instanceof bay.whiteboard.geometry.Line && obj2 instanceof bay.whiteboard.geometry.Line){
    return new bay.whiteboard.geometry.Point_2l(obj1, obj2);
  }else if(obj1 instanceof bay.whiteboard.geometry.Circle && obj2 instanceof bay.whiteboard.geometry.Circle){
    var point1 = new bay.whiteboard.geometry.Point_2c(obj1, obj2, 0);
    var point2 = new bay.whiteboard.geometry.Point_2c(obj1, obj2, 1);
    if (point1.distance(x, y) < point2.distance(x, y)){
      return point1;
    }else{
      return point2;
    }
  }else if(obj1 instanceof bay.whiteboard.geometry.Circle && obj2 instanceof bay.whiteboard.geometry.Line){
    var point1 = new bay.whiteboard.geometry.Point_lc(obj2, obj1, 0);
    var point2 = new bay.whiteboard.geometry.Point_lc(obj2, obj1, 1);
    if (point1.distance(x, y) < point2.distance(x, y)){
      return point1;
    }else{
      return point2;
    }
  }else if(obj1 instanceof bay.whiteboard.geometry.Line && obj2 instanceof bay.whiteboard.geometry.Circle){
    var point1 = new bay.whiteboard.geometry.Point_lc(obj1, obj2, 0);
    var point2 = new bay.whiteboard.geometry.Point_lc(obj1, obj2, 1);
    if (point1.distance(x, y) < point2.distance(x, y)){
      return point1;
    }else{
      return point2;
    }
  }
}
