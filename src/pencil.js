goog.provide('bay.whiteboard.pencil');

goog.require('bay.whiteboard')
goog.require('bay.whiteboard.Collection')
goog.require('bay.whiteboard.geometry');

bay.whiteboard.Whiteboard.addGroup("pencil", 5, goog.getMsg("Free hand drawing"));

// *************************************** Curve ******************************************* //
bay.whiteboard.pencil.Curve = function(p){
  bay.whiteboard.Element.call(this);
  this.startPoint=p;
  p.dependant.push(this);
  this.points = [];
  this.pos={left: p.x, right: p.x, top: p.y, bottom: p.y};
  this.exists = true;
}
goog.inherits(bay.whiteboard.pencil.Curve, bay.whiteboard.Element);

bay.whiteboard.pencil.Curve.prototype.deleteElement = function(){
  this.startPoint.deleteDependant(this);
}

bay.whiteboard.pencil.Curve.prototype.addPoint = function(p){
  this.points.push(new bay.whiteboard.Vector(p.x - this.startPoint.x, p.y - this.startPoint.y));
  if (p.x < this.pos.left) this.pos.left = p.x;
  if (p.x > this.pos.right) this.pos.right = p.x;
  if (p.y > this.pos.top) this.pos.top = p.y;
  if (p.y < this.pos.bottom) this.pos.bottom = p.y;
  this.onChange();
}
bay.whiteboard.pencil.Curve.prototype.toString = function(){
  if(!this.exists) return goog.getMsg('Curve does not exists');
  return goog.getMsg('Curve');
}
bay.whiteboard.pencil.Curve.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var d = this.startPoint.distance(to);
  to = new bay.whiteboard.Vector(to.x - this.startPoint.x,to.y - this.startPoint.y);
  for(var i = 0; i<this.points.length; i++){
    var nextD = this.points[i].distance(to);
    if (nextD < d) d = nextD;
  }
  return d;
}
bay.whiteboard.pencil.Curve.prototype.recalc = function(){
  if(this.startPoint != null && this.startPoint.exists){
    this.exists = true;
    this.pos={left: this.startPoint.x, right: this.startPoint.x, top: this.startPoint.y, bottom: this.startPoint.y};
    for(var i = 0; i<this.points.length; i++){
      var p = this.points[i];
      if (p.x < this.pos.left) this.pos.left = p.x;
      if (p.x > this.pos.right) this.pos.right = p.x;
      if (p.y > this.pos.top) this.pos.top = p.y;
      if (p.y < this.pos.bottom) this.pos.bottom = p.y;
    }
  } else {
    this.exists = false;
  }
  this.recalcDependant();
}

bay.whiteboard.pencil.Curve.prototype.draw = function(board){
  if(!this.exists) return;
  var coords = board.transform([this.startPoint.x, this.startPoint.y]);
  var path = new goog.graphics.Path();
  path.moveTo( coords[0], coords[1] );
  for(var i = 0; i<this.points.length; i++){
    coords = board.transform([this.startPoint.x+this.points[i].x,this.startPoint.y+this.points[i].y]);
    path.lineTo( coords[0], coords[1] );
  }
  if (this.current){
    var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
    board.graphics.drawPath(path, stroke, null);
  }else{
    if (this.hover){
      var stroke = new goog.graphics.Stroke(board.properties.hover.width, board.properties.hover.color);
      board.graphics.drawPath(path, stroke, null);
    }
    var color = board.properties.curve.color;
    if (this.color){
      color = this.color;
    }
    var stroke = new goog.graphics.Stroke(board.properties.curve.width, color);
    board.graphics.drawPath(path, stroke, null);
  }
}

bay.whiteboard.Whiteboard.properties.curve = {
  width: 3,
  color: 'Gray'
}


bay.whiteboard.pencil.Curve.prototype.toJson = function(list, id){
  str = '{' + this.jsonHeader(id) + ', "type": "PencilCurve", "p0": ' + list.indexOf(this.startPoint);
  for(var i = 0; i<this.points.length; i++){
    var p = this.points[i];
    str += ', "x'+i+'": ' + p.x + ', "y'+i+'": '+p.y;
  }
  return str + '}';
}

bay.whiteboard.pencil.Curve.fromJson = function(item, list){
  var line = new bay.whiteboard.pencil.Curve( list[item.p0]);
  var i = 0;
  while(typeof item['x'+i] != 'undefined'){
    line.points.push(new bay.whiteboard.Vector(item['x'+i], item['y'+i]));
    i++;
  }
  line.restoreFromJson(item);
  return line;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilCurve", bay.whiteboard.pencil.Curve.fromJson);

// restore point from json data
bay.whiteboard.pencil.Curve.prototype.acceptData = function(data){
  bay.whiteboard.pencil.Curve.superClass_.acceptData.call(this, data);
  this.points = [];
  var i = 0;
  while(typeof data['x'+i] != 'undefined'){
    this.points.push(new bay.whiteboard.Vector(data['x'+i], data['y'+i]));
    i++;
  }
  this.recalc();
}


bay.whiteboard.Whiteboard.addTool(
  "curve", "pencil",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_curveCursor'); board.tool.current.curve = {};},
    toggleOff: function(board) {board.clearCurrentTool('bwb_curveCursor', 'curve');},
    onMove: function(board, e) {
      if (board.tool.current.curve.start){
        var coords = board.getConvertEventPos(e);
        board.tool.current.curve.start.addPoint(coords);
      }
    },
    onClick: function(board, e) {
      if (board.tool.current.curve.start){
        board.tool.current.toggleOff(board);
      }else{
        var point = board.pointAtEventPosition(e);
        var curve = new bay.whiteboard.pencil.Curve(point);
        board.collections.main.add(curve);
        board.tool.current.curve.start = curve;
      }
      board.redrawAll();
    }
  },
  1, goog.getMsg("Curve")
);


// *************************************** FreeLine ******************************************* //
bay.whiteboard.pencil.FreeLine = function(p1, p2){
  bay.whiteboard.geometry.Segment.call(this, p1, p2);
}

goog.inherits(bay.whiteboard.pencil.FreeLine, bay.whiteboard.geometry.Segment);

bay.whiteboard.pencil.FreeLine.prototype.draw = function(board){
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
      var color = board.properties.freeline.color;
      if (this.color){
        color = this.color;
      }
      var stroke = new goog.graphics.Stroke(board.properties.freeline.width, color);
      board.graphics.drawPath(path, stroke, null);
    }
  }
}

bay.whiteboard.Whiteboard.properties.freeline = {
  width: 3,
  color: 'Gray'
}


bay.whiteboard.pencil.FreeLine.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PencilFreeLine", "p1": ' + list.indexOf(this.startPoint) + ', "p2": ' + list.indexOf(this.endPoint) + '}';
}

bay.whiteboard.pencil.FreeLine.fromJson = function(item, list){
  var line = new bay.whiteboard.pencil.FreeLine( list[item.p1], list[item.p2]);
  line.restoreFromJson(item);
  return line;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilFreeLine", bay.whiteboard.pencil.FreeLine.fromJson);


bay.whiteboard.pencil.FreeLine.prototype.getTrace = function(){
  return new bay.whiteboard.pencil.FreeLine(new bay.whiteboard.PointFree(this.startPoint), new bay.whiteboard.PointFree(this.endPoint));
}

bay.whiteboard.Whiteboard.addTool(
  "freeline", "pencil",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_pencilLineCursor'); board.tool.current.ruler = {};},
    toggleOff: function(board) {board.clearCurrentTool('bwb_pencilLineCursor', 'ruler');},
    onMove: function(board, e) { if (board.tool.current.ruler.endTmp) {board.tool.current.ruler.endTmp.moveTo(board.getConvertEventPos(e)); }},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.ruler.start){
        board.collections.main.add(new bay.whiteboard.pencil.FreeLine(board.tool.current.ruler.start, point));
      }
      board.collections.current.clear();
      board.tool.current.ruler.start = point;
      board.collections.current.add(board.tool.current.ruler.endTmp = new bay.whiteboard.PointFree(point));
      board.tool.current.ruler.endTmp.hide();
      var line = new bay.whiteboard.pencil.FreeLine(board.tool.current.ruler.start, board.tool.current.ruler.endTmp)
      line.current = true;
      board.collections.current.add(line);
      board.redrawAll();
    }
  },
  2, goog.getMsg("Polyline")
);

// *************************************** Rectangle ******************************************* //
bay.whiteboard.pencil.Rectangle = function(p1, p2){
  bay.whiteboard.Element.call(this);
  this.pointOne = p1;
  this.pointTwo = p2;
  p1.dependant.push(this);
  p2.dependant.push(this);
  this.pos = {
    left: null,
    right: null,
    top: null,
    bottom: null
  }
  this.noLabel = true;
  this.recalc();
}

goog.inherits(bay.whiteboard.pencil.Rectangle, bay.whiteboard.Element);

bay.whiteboard.pencil.Rectangle.prototype.deleteElement = function(){
  this.pointOne.deleteDependant(this);
  this.pointTwo.deleteDependant(this);
}

bay.whiteboard.pencil.Rectangle.prototype.toString = function(){
  if(!this.exists) return goog.getMsg('Rectangle does not exist');
  return goog.getMsg('Rectangle');
}

bay.whiteboard.pencil.Rectangle.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var d = null;
  if (to.x <= this.pos.left){
    if (to.y < this.pos.bottom){
      d = Math.sqrt((to.x - this.pos.left)*(to.x - this.pos.left) + (to.y - this.pos.bottom)*(to.y - this.pos.bottom));
    }else if  (to.y >= this.pos.top){
      d = Math.sqrt((to.x - this.pos.left)*(to.x - this.pos.left) + (to.y - this.pos.top)*(to.y - this.pos.top));
    }else{
      d = this.pos.left  - to.x;
    }
  }else if  (to.x >= this.pos.right){
    if (to.y <= this.pos.bottom){
      d = Math.sqrt((to.x - this.pos.right)*(to.x - this.pos.right) + (to.y - this.pos.bottom)*(to.y - this.pos.bottom));
    }else if  (to.y >= this.pos.top){
      d = Math.sqrt((to.x - this.pos.right)*(to.x - this.pos.right) + (to.y - this.pos.top)*(to.y - this.pos.top));
    }else{
      d = to.x - this.pos.right;
    }
  }else{
    if (to.y <= this.pos.bottom){
      d = this.pos.bottom  - to.y;
    }else if  (to.y >= this.pos.top){
      d = to.y - this.pos.top;
    }else{
      d = this.pos.top - to.y;
      if (to.y - this.pos.bottom < d) d = to.y - this.pos.bottom;
      if (to.x - this.pos.left < d) d = to.x - this.pos.left;
      if (this.pos.right - to.x < d) d = this.pos.right - to.x;
    }
  }
  return d;
}

bay.whiteboard.pencil.Rectangle.prototype.closestPoint = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var s = null;
  var t = null;
  if (to.x <= this.pos.left){
    s = 'left';
    if (to.y < this.pos.bottom){
      t = 0;
    }else if  (to.y >= this.pos.top){
      t = 1;
    }else{
      t = (to.y - this.pos.bottom) / (this.pos.top - this.pos.bottom);
    }
  }else if  (to.x >= this.pos.right){
    s = 'right';
    if (to.y < this.pos.bottom){
      t = 0;
    }else if  (to.y >= this.pos.top){
      t = 1;
    }else{
      t = (to.y - this.pos.bottom) / (this.pos.top - this.pos.bottom);
    }
  }else{
    if (to.y <= this.pos.bottom){
      s = 'bottom';
      t = (to.x - this.pos.left) / (this.pos.right - this.pos.left);
    }else if  (to.y >= this.pos.top){
      s = 'top';
      t = (to.x - this.pos.left) / (this.pos.right - this.pos.left);
    }else{
      var d = this.pos.top - to.y;
      s = 'top';
      t = (to.x - this.pos.left) / (this.pos.right - this.pos.left);
      if (to.y - this.pos.bottom < d){
        d = to.y - this.pos.bottom;
        s = 'bottom';
        t = (to.x - this.pos.left) / (this.pos.right - this.pos.left);
      }
      if (to.x - this.pos.left < d) {
        d = to.x - this.pos.left;
        s = 'left';
        t = (to.y - this.pos.bottom) / (this.pos.top - this.pos.bottom);
      }
      if (this.pos.right - to.x < d) {
        d = this.pos.right - to.x;
        s = 'right';
        t = (to.y - this.pos.bottom) / (this.pos.top - this.pos.bottom);
      }
    }
  }
  return new bay.whiteboard.pencil.PointAtRect(this, s, t);
}

bay.whiteboard.pencil.Rectangle.prototype.recalc = function(){
  if(this.pointOne != null && this.pointTwo != null && this.pointOne.exists && this.pointTwo.exists){
    this.exists = true;
    if (this.pointOne.x < this.pointTwo.x) {
      this.pos.left = this.pointOne.x;
      this.pos.right = this.pointTwo.x;
    }else{
      this.pos.left = this.pointTwo.x;
      this.pos.right = this.pointOne.x;
    }
    if (this.pointOne.y < this.pointTwo.y) {
      this.pos.top = this.pointTwo.y;
      this.pos.bottom = this.pointOne.y;
    }else{
      this.pos.top = this.pointOne.y;
      this.pos.bottom = this.pointTwo.y;
    }
  } else {
    this.exists = false;
  }
  this.recalcDependant();
}

bay.whiteboard.pencil.Rectangle.prototype.draw = function(board){
  // draw line if it exists and intersectthe area
  if(!this.exists) return;
  var coords = board.transform([this.pos.left, this.pos.bottom,
                               this.pos.right, this.pos.top]);
  var path = new goog.graphics.Path();
  path.moveTo( coords[0], coords[1] );
  path.lineTo( coords[0], coords[3] );
  path.lineTo( coords[2], coords[3] );
  path.lineTo( coords[2], coords[1] );
  path.lineTo( coords[0], coords[1] );
  if (this.current){
    var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
    board.graphics.drawPath(path, stroke, null);
  }else{
    if (this.hover){
      var stroke = new goog.graphics.Stroke(board.properties.hover.width, board.properties.hover.color);
      board.graphics.drawPath(path, stroke, null);
    }
    var color = board.properties.rectangle.color;
    if (this.color){
      color = this.color;
    }
    var stroke = new goog.graphics.Stroke(board.properties.rectangle.width, color);
    board.graphics.drawPath(path, stroke, null);
  }
}

bay.whiteboard.Whiteboard.properties.rectangle = {
  width: 3,
  color: 'Grey'
}


bay.whiteboard.pencil.Rectangle.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PencilRect", "p1": ' + list.indexOf(this.pointOne) + ', "p2": ' + list.indexOf(this.pointTwo) + '}';
}

bay.whiteboard.pencil.Rectangle.fromJson = function(item, list){
  var rect = new bay.whiteboard.pencil.Rectangle( list[item.p1], list[item.p2]);
  rect.restoreFromJson(item);
  return rect;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilRect", bay.whiteboard.pencil.Rectangle.fromJson);

bay.whiteboard.Whiteboard.addTool(
  "rectangle", "pencil",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_rectCursor'); board.tool.current.text = {};},
    toggleOff: function(board) {board.clearCurrentTool('bwb_rectCursor', 'text');},
    onMove: function(board, e) { if (board.tool.current.text.endTmp) {board.tool.current.text.endTmp.moveTo(board.getConvertEventPos(e)); }},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.text.start){
        board.collections.main.add(new bay.whiteboard.pencil.Rectangle(board.tool.current.text.start, point));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else{
        board.collections.current.clear();
        board.tool.current.text.start = point;
        board.collections.current.add(board.tool.current.text.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.text.endTmp.hide();
        var line = new bay.whiteboard.pencil.Rectangle(board.tool.current.text.start, board.tool.current.text.endTmp)
        line.current = true;
        board.collections.current.add(line);
      }
      board.redrawAll();
    }
  },
  3, goog.getMsg("Rectangle")
);

// *************************************** PointAtRect ******************************************* //
bay.whiteboard.pencil.PointAtRect = function(l, s, t){
  bay.whiteboard.Point.call(this);
  this.obj = l;
  l.dependant.push(this);
  this.side = s;
  this.param = t;
  this.recalc();
}

goog.inherits(bay.whiteboard.pencil.PointAtRect, bay.whiteboard.Point);

bay.whiteboard.pencil.PointAtRect.prototype.deleteElement = function(){
  this.obj.deleteDependant(this);
}

bay.whiteboard.pencil.PointAtRect.prototype.moveTo = function(x, y){
  if (this.obj){
    var point = this.obj.closestPoint(x, y);
    this.side = point.side;
    this.param = point.param;
  }
  this.recalc();
  this.onChange();
}

bay.whiteboard.pencil.PointAtRect.prototype.acceptData = function(data){
  bay.whiteboard.pencil.PointAtRect.superClass_.acceptData.call(this, data);
  if (this.obj){
    this.side = data.s;
    this.param = data.t;
  }
  this.recalc();
}

bay.whiteboard.pencil.PointAtRect.prototype.recalc = function(){
  if(!this.obj || !this.obj.exists || this.param == null || this.side == null){
    this.exists = false;
  }else{
    this.exists = true;
    if (this.side == 'left'){
      this.x = this.obj.pos.left;
      this.y = this.obj.pos.bottom  + (this.obj.pos.top - this.obj.pos.bottom) * this.param;
    }else if (this.side == 'right'){
      this.x = this.obj.pos.right;
      this.y = this.obj.pos.bottom  + (this.obj.pos.top - this.obj.pos.bottom) * this.param;
    }else if (this.side == 'top'){
      this.x = this.obj.pos.left + (this.obj.pos.right - this.obj.pos.left)  * this.param;
      this.y = this.obj.pos.top;
    }else if (this.side == 'bottom'){
      this.x = this.obj.pos.left + (this.obj.pos.right - this.obj.pos.left)  * this.param;
      this.y = this.obj.pos.bottom;
    }
  }
  this.recalcDependant();
}

bay.whiteboard.pencil.PointAtRect.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PencilPointAtRect", "obj": ' + list.indexOf(this.obj) + ', "s": "' + this.side + '", "t": "' + this.param + '"}';
}

bay.whiteboard.pencil.PointAtRect.fromJson = function(item, list){
  var point = new bay.whiteboard.pencil.PointAtRect( list[item.obj], item.s, item.t);
  point.restoreFromJson(item);
  return point;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilPointAtRect", bay.whiteboard.pencil.PointAtRect.fromJson);

// *************************************** TwoPointsCircle **************************************** //
// circle given by center point and two points which define radius
bay.whiteboard.pencil.Circle = function(c, p){
  bay.whiteboard.geometry.Circle.call(this);
  this.centerPoint = c;
  this.endPoint = p;
  c.dependant.push(this);
  p.dependant.push(this);
  this.recalc();
}

goog.inherits(bay.whiteboard.pencil.Circle, bay.whiteboard.geometry.Circle);

bay.whiteboard.pencil.Circle.prototype.deleteElement = function(){
  this.centerPoint.deleteDependant(this);
  this.endPoint.deleteDependant(this);
}

bay.whiteboard.pencil.Circle.prototype.recalc = function(){
  if (!this.centerPoint || !this.endPoint || !this.centerPoint.exists || !this.endPoint.exists){
    this.exists = false;
  } else {
    this.exists = true;
    this.radius = this.centerPoint.distanceTo(this.endPoint);
  }
  this.recalcDependant();
}

bay.whiteboard.pencil.Circle.prototype.draw = function(board){
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
      var color = board.properties.pencilcircle.color;
      if (this.color){
        color = this.color;
      }
      var stroke = new goog.graphics.Stroke(board.properties.pencilcircle.width, color);
      board.graphics.drawCircle(coords[0], coords[1], this.radius * board.area.transformation.getScaleX(), stroke, null);
    }
  }
}

bay.whiteboard.Whiteboard.properties.pencilcircle = {
  width: 3,
  color: 'Grey'
}

bay.whiteboard.pencil.Circle.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PencilCircle", "p1": ' + list.indexOf(this.centerPoint) + ', "p2": ' + list.indexOf(this.endPoint) + '}';
}

bay.whiteboard.pencil.Circle.fromJson = function(item, list){
  var circle = new bay.whiteboard.pencil.Circle( list[item.p1], list[item.p2]);
  circle.restoreFromJson(item);
  return circle;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilCircle", bay.whiteboard.pencil.Circle.fromJson);


bay.whiteboard.Whiteboard.addTool(
  "pencilcircle", "pencil",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_circleCursor'); board.tool.current.compass = {};},
    toggleOff: function(board) { board.clearCurrentTool('bwb_circleCursor', 'compass'); },
    onMove: function(board, e) {
      if (board.tool.current.compass.endTmp) {board.tool.current.compass.endTmp.moveTo(board.getConvertEventPos(e)); }
    },
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.compass.start){
        board.collections.main.add(new bay.whiteboard.pencil.Circle(board.tool.current.compass.start, point));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else{
        board.collections.current.clear();
        board.tool.current.compass.start = point;
        board.collections.current.add(board.tool.current.compass.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.compass.endTmp.hide();
        var circle = new bay.whiteboard.pencil.Circle(board.tool.current.compass.start, board.tool.current.compass.endTmp)
        circle.current = true;
        board.collections.current.add(circle);
      }
      board.redrawAll();
    }
  },
  4, goog.getMsg("Circle")
);


// *************************************** Text ******************************************* //
bay.whiteboard.pencil.Text = function(r, t){
  bay.whiteboard.Element.call(this);
  this.rectangle = r;
  r.dependant.push(this);
  this.label = t;
  this.recalc();
}

goog.inherits(bay.whiteboard.pencil.Text, bay.whiteboard.Element);

bay.whiteboard.pencil.Text.prototype.deleteElement = function(){
  this.rectangle.deleteDependant(this);
}


bay.whiteboard.pencil.Text.prototype.toString = function(){
  if(!this.exists) return goog.getMsg('Text does not exist');
  return goog.getMsg('Text [{$label}]', {'label' : this.label});
}

bay.whiteboard.pencil.Text.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var d = null;
  if (this.rectangle.pos.left <= to.x && to.x <= this.rectangle.pos.right && this.rectangle.pos.top >= to.y && to.y >= this.rectangle.pos.bottom){
    d = 0;
  }else{
    d = this.rectangle.distance(x, y);
  }
  return d;
}

bay.whiteboard.pencil.Text.prototype.recalc = function(){
  if(this.rectangle.exists){
    this.exists = true;
  } else {
    this.exists = false;
  }
  this.recalcDependant();
}

bay.whiteboard.pencil.Text.prototype.width = function(font, size) {
  var f = (size + 'px ' + font);
  var o = goog.dom.createDom(
          'div', {style: "position: absolute; float: left; white-space: nowrap; display: hidden; font: " + f + ";"},
          this.label);
  goog.dom.appendChild(document.body, o);
  w = goog.style.getSize(o).width;
  goog.dom.removeNode(o);
  return w;
}

bay.whiteboard.pencil.Text.prototype.draw = function(board){
  if(!this.exists) return;
  if (this.color){
    color = this.color;
  }
  var coords = board.transform([this.rectangle.pos.left, this.rectangle.pos.top]);
  var width = (this.rectangle.pos.right - this.rectangle.pos.left) * board.area.transformation.getScaleX();
  var height = (this.rectangle.pos.bottom - this.rectangle.pos.top) * board.area.transformation.getScaleY();
  var font = new goog.graphics.Font(height, board.properties.text.font);
  var textWidth = this.width(board.properties.text.font, height);
  var textHeight = height;
  if (textWidth > width){
    textHeight = height * width / textWidth
  }
  var font = new goog.graphics.Font(textHeight, board.properties.text.font);
  if (this.current){
    var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
    var fill = new goog.graphics.SolidFill(board.properties.current.color);
    board.graphics.drawText(this.label, coords[0], coords[1], width, height, 'center', 'center', font, stroke, fill);
  } else {
    if (this.hover){
      var coords1 = board.transform([this.rectangle.pos.left, this.rectangle.pos.bottom,
                                  this.rectangle.pos.right, this.rectangle. pos.top]);
      var path = new goog.graphics.Path();
      path.moveTo( coords1[0], coords1[1] );
      path.lineTo( coords1[0], coords1[3] );
      path.lineTo( coords1[2], coords1[3] );
      path.lineTo( coords1[2], coords1[1] );
      path.lineTo( coords1[0], coords1[1] );
      var fill = new goog.graphics.SolidFill(board.properties.hover.color, 0.2);
      board.graphics.drawPath(path, null, fill);
    }
    var color = board.properties.text.color;
    if (this.color){
      color = this.color;
    }
    var stroke = new goog.graphics.Stroke(board.properties.text.width, color);
    var fill = new goog.graphics.SolidFill(color);
    board.graphics.drawText(this.label, coords[0], coords[1], width, height, 'center', 'center', font, stroke, fill);
  }
}

bay.whiteboard.Whiteboard.properties.text = {
  width: 1,
  color: 'DarkBlue',
  font:  'Times'
}

bay.whiteboard.pencil.Text.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "Text", "r": ' + list.indexOf(this.rectangle) + '}';
}

bay.whiteboard.pencil.Text.fromJson = function(item, list){
  var text = new bay.whiteboard.pencil.Text( list[item.r], item.label);
  text.restoreFromJson(item);
  return text;
}

bay.whiteboard.Collection.setFromJsonFunc("Text", bay.whiteboard.pencil.Text.fromJson);

bay.whiteboard.Whiteboard.addTool(
  "text", "pencil",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_textCursor'); board.tool.current.text = {};},
    toggleOff: function(board) { board.clearCurrentTool('bwb_textCursor', 'text');},
    onMove: function(board, e) { if (board.tool.current.text.endTmp) {board.tool.current.text.endTmp.moveTo(board.getConvertEventPos(e)); }},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.text.start){
        var rect = new bay.whiteboard.pencil.Rectangle(board.tool.current.text.start, point);
        board.collections.main.add(rect);
        board.collections.main.add(new bay.whiteboard.pencil.Text(rect, 'Some text'));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else{
        board.collections.current.clear();
        board.tool.current.text.start = point;
        board.collections.current.add(board.tool.current.text.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.text.endTmp.hide();
        var line = new bay.whiteboard.pencil.Rectangle(board.tool.current.text.start, board.tool.current.text.endTmp)
        line.current = true;
        board.collections.current.add(line);
      }
      board.redrawAll();
    }
  },
  5, goog.getMsg("Text box")
);

// *************************************** Underline ******************************************* //
bay.whiteboard.pencil.Underline = function(p1, p2, thickness){
  bay.whiteboard.Element.call(this);
  this.startPoint=p1;
  this.endPoint=p2;
  p1.dependant.push(this);
  p2.dependant.push(this);
  if(thickness)
    this.thickness = thickness;
  else
    this.thickness = 15;
  this.recalc();
}
goog.inherits(bay.whiteboard.pencil.Underline, bay.whiteboard.Element);

bay.whiteboard.pencil.Underline.prototype.deleteElement = function(){
  this.startPoint.deleteDependant(this);
  this.endPoint.deleteDependant(this);
}

bay.whiteboard.pencil.Underline.prototype.toString = function(){
  if(!this.exists) return goog.getMsg('Underline does not exists');
  return goog.getMsg('Underline');
}

bay.whiteboard.pencil.Underline.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var a = this.startPoint.y - to.y;
  var b = this.endPoint.y - to.y;
  if (this.direction.x != 0){
    a = this.startPoint.x - to.x + this.direction.y * (this.startPoint.y - to.y) / this.direction.x;
    b = this.endPoint.x - to.x + this.direction.y * (this.endPoint.y - to.y) / this.direction.x;
  }
  if (a*b <= 0){
    var d = Math.abs(this.direction.x * (to.y - this.startPoint.y) - this.direction.y * (to.x - this.startPoint.x)) / Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
    if (d < this.thickness) return 0;
    else return d - this.thickness;
  }else{
    a = this.startPoint.distance(to.x, to.y);
    b = this.endPoint.distance(to.x, to.y);
    if(a < b) return a;
    else return b;
  }
}

bay.whiteboard.pencil.Underline.prototype.recalc = function(){
  if (!this.startPoint || !this.endPoint || !this.startPoint.exists || !this.endPoint.exists){
    this.exists = false;
  } else {
    this.exists = true;
    this.direction = new bay.whiteboard.Vector(this.endPoint.x - this.startPoint.x, this.endPoint.y - this.startPoint.y);
  }
  this.recalcDependant();
}

bay.whiteboard.pencil.Underline.prototype.draw = function(board){
  // draw segment if it exists and intersectthe area
  if(!this.exists) return;
  var val = bay.whiteboard.geometry.Line.prototype.getMinAndMaxParamValue.call(this, board.area);
  if (val && val.max > 0 && val.min < 1){
    var norm = Math.sqrt(this.direction.x*this.direction.x + this.direction.y*this.direction.y);
    if (norm != 0){
      var rect = [];
      rect[0] = this.startPoint.x + this.thickness*this.direction.y/norm;
      rect[1] = this.startPoint.y - this.thickness*this.direction.x/norm;
      rect[2] = this.startPoint.x - this.thickness*this.direction.y/norm;
      rect[3] = this.startPoint.y + this.thickness*this.direction.x/norm;
      rect[4] = this.endPoint.x + this.thickness*this.direction.y/norm;
      rect[5] = this.endPoint.y - this.thickness*this.direction.x/norm;
      rect[6] = this.endPoint.x - this.thickness*this.direction.y/norm;
      rect[7] = this.endPoint.y + this.thickness*this.direction.x/norm;

      var coords = board.transform(rect);
      var path = new goog.graphics.Path();
      path.moveTo( coords[0], coords[1] );
      path.lineTo( coords[2], coords[3] );
      path.lineTo( coords[6], coords[7] );
      path.lineTo( coords[4], coords[5] );
      path.lineTo( coords[0], coords[1] );
      if (this.current){
        var fill = new goog.graphics.SolidFill(board.properties.current.color, board.properties.underline.opacity);
        board.graphics.drawPath(path, null, fill);
      } else {
        if (this.hover){
          var fill = new goog.graphics.SolidFill(board.properties.hover.color, board.properties.underline.opacity);
          board.graphics.drawPath(path, null, fill);
        }
        var color = board.properties.underline.color;
        if (this.color){
          color = this.color;
        }
        var fill = new goog.graphics.SolidFill(color, board.properties.underline.opacity);
        board.graphics.drawPath(path, null, fill);
      }
    }
  }
}

bay.whiteboard.Whiteboard.properties.underline = {
  thickness: 15,
  color: 'Magenta',
  opacity: 0.3
}


bay.whiteboard.pencil.Underline.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PencilUnderline", "p1": ' + list.indexOf(this.startPoint) + ', "p2": ' + list.indexOf(this.endPoint) + ', "thick": ' + this.thickness + '}';
}

bay.whiteboard.pencil.Underline.fromJson = function(item, list){
  var line = new bay.whiteboard.pencil.Underline( list[item.p1], list[item.p2]);
  line.thickness = item.thick;
  line.restoreFromJson(item);
  return line;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilUnderline", bay.whiteboard.pencil.Underline.fromJson);


bay.whiteboard.Whiteboard.addTool(
  "underline", "pencil",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_underlineCursor'); board.tool.current.underline = {};},
    toggleOff: function(board) {board.clearCurrentTool('bwb_underlineCursor', 'underline');},
    onMove: function(board, e) { if (board.tool.current.underline.endTmp) {board.tool.current.underline.endTmp.moveTo(board.getConvertEventPos(e)); }},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.underline.start){
        board.collections.main.add(new bay.whiteboard.pencil.Underline(board.tool.current.underline.start, point, board.properties.underline.thickness));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else{
        board.collections.current.clear();
        board.tool.current.underline.start = point;
        board.collections.current.add(board.tool.current.underline.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.underline.endTmp.hide();
        var line = new bay.whiteboard.pencil.Underline(board.tool.current.underline.start, board.tool.current.underline.endTmp, board.properties.underline.thickness)
        line.current = true;
        board.collections.current.add(line);
      }
      board.redrawAll();
    }
  },
  7, goog.getMsg("Highlight board area")
);


// *************************************** Arrow ******************************************* //
bay.whiteboard.pencil.Arrow = function(p1, p2, thickness){
  bay.whiteboard.Element.call(this);
  this.startPoint=p1;
  this.endPoint=p2;
  p1.dependant.push(this);
  p2.dependant.push(this);
  if(thickness)
    this.thickness = thickness;
  else
    this.thickness = 15;
  this.recalc();
}
goog.inherits(bay.whiteboard.pencil.Arrow, bay.whiteboard.Element);

bay.whiteboard.pencil.Arrow.prototype.deleteElement = function(){
  this.startPoint.deleteDependant(this);
  this.endPoint.deleteDependant(this);
}

bay.whiteboard.pencil.Arrow.prototype.toString = function(){
  if(!this.exists) return goog.getMsg('Arrow does not exists');
  return goog.getMsg('Arrow');
}

bay.whiteboard.pencil.Arrow.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var a = this.startPoint.y - to.y;
  var b = this.endPoint.y - to.y;
  if (this.direction.x != 0){
    a = this.startPoint.x - to.x + this.direction.y * (this.startPoint.y - to.y) / this.direction.x;
    b = this.endPoint.x - to.x + this.direction.y * (this.endPoint.y - to.y) / this.direction.x;
  }
  if (a*b <= 0){
    var d = Math.abs(this.direction.x * (to.y - this.startPoint.y) - this.direction.y * (to.x - this.startPoint.x)) / Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
    if (d < this.thickness) return 0;
    else return d - this.thickness;
  }else{
    a = this.startPoint.distance(to.x, to.y);
    b = this.endPoint.distance(to.x, to.y);
    if(a < b) return a;
    else return b;
  }
}

bay.whiteboard.pencil.Arrow.prototype.recalc = function(){
  if (!this.startPoint || !this.endPoint || !this.startPoint.exists || !this.endPoint.exists){
    this.exists = false;
  } else {
    this.exists = true;
    this.direction = new bay.whiteboard.Vector(this.endPoint.x - this.startPoint.x, this.endPoint.y - this.startPoint.y);
  }
  this.recalcDependant();
}

bay.whiteboard.pencil.Arrow.prototype.draw = function(board){
  // draw segment if it exists and intersectthe area
  if(!this.exists) return;
  var val = bay.whiteboard.geometry.Line.prototype.getMinAndMaxParamValue.call(this, board.area);
  if (val && val.max > 0 && val.min < 1){
    var norm = Math.sqrt(this.direction.x*this.direction.x + this.direction.y*this.direction.y);
    if (norm != 0){
      var shape = [];
      shape[0] = this.startPoint.x + this.thickness*this.direction.y/norm;
      shape[1] = this.startPoint.y - this.thickness*this.direction.x/norm;
      shape[2] = this.startPoint.x - this.thickness*this.direction.y/norm;
      shape[3] = this.startPoint.y + this.thickness*this.direction.x/norm;
      shape[4] = this.endPoint.x - 6*this.thickness*this.direction.x/norm - this.thickness*this.direction.y/norm;
      shape[5] = this.endPoint.y - 6*this.thickness*this.direction.y/norm + this.thickness*this.direction.x/norm;
      shape[6] = this.endPoint.x - 6*this.thickness*this.direction.x/norm - 3*this.thickness*this.direction.y/norm;
      shape[7] = this.endPoint.y - 6*this.thickness*this.direction.y/norm + 3*this.thickness*this.direction.x/norm;
      shape[8] = this.endPoint.x;
      shape[9] = this.endPoint.y;
      shape[10] = this.endPoint.x - 6*this.thickness*this.direction.x/norm + 3*this.thickness*this.direction.y/norm;
      shape[11] = this.endPoint.y - 6*this.thickness*this.direction.y/norm - 3*this.thickness*this.direction.x/norm;
      shape[12] = this.endPoint.x - 6*this.thickness*this.direction.x/norm + this.thickness*this.direction.y/norm;
      shape[13] = this.endPoint.y - 6*this.thickness*this.direction.y/norm - this.thickness*this.direction.x/norm;

      var coords = board.transform(shape);
      var path = new goog.graphics.Path();
      path.moveTo( coords[0], coords[1] );
      path.lineTo( coords[2], coords[3] );
      path.lineTo( coords[4], coords[5] );
      path.lineTo( coords[6], coords[7] );
      path.lineTo( coords[8], coords[9] );
      path.lineTo( coords[10], coords[11] );
      path.lineTo( coords[12], coords[13] );
      path.lineTo( coords[0], coords[1] );
      if (this.current){
        var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
        board.graphics.drawPath(path, stroke, null);
      } else {
        if (this.hover){
          var fill = new goog.graphics.SolidFill(board.properties.hover.color, board.properties.arrow.opacity);
          board.graphics.drawPath(path, null, fill);
        }
        var color = board.properties.arrow.color;
        if (this.color){
          color = this.color;
        }
        var stroke = new goog.graphics.Stroke(board.properties.arrow.width, color);
        var fill = new goog.graphics.SolidFill(color, board.properties.arrow.opacity);
        board.graphics.drawPath(path, stroke, fill);
      }
    }
  }
}

bay.whiteboard.Whiteboard.properties.arrow = {
  width: 1,
  thickness: 3,
  color: 'Gray',
  opacity: 0.3
}


bay.whiteboard.pencil.Arrow.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PencilArrow", "p1": ' + list.indexOf(this.startPoint) + ', "p2": ' + list.indexOf(this.endPoint) + ', "thick": ' + this.thickness + '}';
}

bay.whiteboard.pencil.Arrow.fromJson = function(item, list){
  var line = new bay.whiteboard.pencil.Arrow( list[item.p1], list[item.p2]);
  line.thickness = item.thick;
  line.restoreFromJson(item);
  return line;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilArrow", bay.whiteboard.pencil.Arrow.fromJson);


bay.whiteboard.Whiteboard.addTool(
  "arrow", "pencil",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_arrowCursor'); board.tool.current.arrow = {};},
    toggleOff: function(board) {board.clearCurrentTool('bwb_arrowCursor', 'arrow');},
    onMove: function(board, e) { if (board.tool.current.arrow.endTmp) {board.tool.current.arrow.endTmp.moveTo(board.getConvertEventPos(e)); }},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      if (board.tool.current.arrow.start){
        board.collections.main.add(new bay.whiteboard.pencil.Arrow(board.tool.current.arrow.start, point, board.properties.arrow.thickness));
        board.collections.current.clear();
        board.tool.current.toggleOff(board);
      }else{
        board.collections.current.clear();
        board.tool.current.arrow.start = point;
        board.collections.current.add(board.tool.current.arrow.endTmp = new bay.whiteboard.PointFree(point));
        board.tool.current.arrow.endTmp.hide();
        var line = new bay.whiteboard.pencil.Arrow(board.tool.current.arrow.start, board.tool.current.arrow.endTmp, board.properties.arrow.thickness)
        line.current = true;
        board.collections.current.add(line);
      }
      board.redrawAll();
    }
  },
  6, goog.getMsg("Draw an arrow")
);

// *************************************** Pointer ******************************************* //
bay.whiteboard.pencil.Pointer = function(p){
  bay.whiteboard.Element.call(this);
  this.point = p;
  if(p){
    p.dependant.push(this);
    var currentPointer = this;
    this.interval = setInterval(function(){currentPointer.decreaseAge(100);},100);
  }
  this.recalc();
}

goog.inherits(bay.whiteboard.pencil.Pointer, bay.whiteboard.Element);

bay.whiteboard.pencil.Pointer.prototype.deleteElement = function(){
  if(this.point)
    this.point.deleteDependant(this);
}

bay.whiteboard.pencil.Pointer.prototype.toString = function(){
  if(!this.exists) return goog.getMsg('Pointer does not exists');
  return goog.getMsg('Pointer [{$x},{$y}]', {'x': this.point.x.toFixed(2), 'y': this.point.y.toFixed(2)});
}

bay.whiteboard.pencil.Pointer.prototype.decreaseAge = function(delta){
  if(this.collection && this.collection.getBoard())
    this.board = this.collection.getBoard();
  if(this.board){
    if (this.age == undefined){
      this.age = this.board.properties.pointer.age;
      this.recalc();
    }
    this.age -= delta;
    if (this.age <= 0) {
      clearInterval(this.interval);
      if(this.point){
        this.point.deleteDependant(this);
        this.point = null;
      }
      this.recalc();
    };
    this.board.redrawAll();
  }
}

bay.whiteboard.pencil.Pointer.prototype.distance = function(x, y){
  if(this.exists)
    return this.point.distance(x,y);
}

bay.whiteboard.pencil.Pointer.prototype.recalc = function(){
  if(this.point != null && this.point.exists && this.age > 0)
    this.exists = true;
  else
    this.exists = false;
  this.recalcDependant();
}

bay.whiteboard.pencil.Pointer.prototype.draw = function(board){
  // draw segment if it exists and intersectthe area
  if(!this.exists) return;
  if(this.point.x >= board.area.minX && this.point.x <= board.area.maxX && this.point.y >= board.area.minY && this.point.y <= board.area.maxY){
    var radius = board.properties.pointer.radius * (this.age%500/500) * board.area.transformation.getScaleX();
    var shape = [];
    shape[0] = this.point.x;
    shape[1] = this.point.y;
    shape[2] = this.point.x - board.properties.pointer.radius;
    shape[3] = this.point.y;
    shape[4] = this.point.x + board.properties.pointer.radius;
    shape[5] = this.point.y;
    shape[6] = this.point.x;
    shape[7] = this.point.y - board.properties.pointer.radius;
    shape[8] = this.point.x;
    shape[9] = this.point.y + board.properties.pointer.radius;
    var coords = board.transform(shape);
    var path1 = new goog.graphics.Path();
    path1.moveTo( coords[2], coords[3] );
    path1.lineTo( coords[4], coords[5] );
    var path2 = new goog.graphics.Path();
    path2.moveTo( coords[6], coords[7] );
    path2.lineTo( coords[8], coords[9] );
    if (this.current){
      var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
      board.graphics.drawCircle(coords[0], coords[1], radius, stroke, null);
    } else {
      if (this.hover){
        var stroke = new goog.graphics.Stroke(board.properties.hover.width, board.properties.hover.color);
        board.graphics.drawPath(path1, stroke, null);
        board.graphics.drawPath(path2, stroke, null);
      }
      var color = board.properties.pointer.color;
      if (this.color){
        color = this.color;
      }
      var stroke = new goog.graphics.Stroke(board.properties.pointer.width, color);
      board.graphics.drawCircle(coords[0], coords[1], radius, stroke, null);
      board.graphics.drawPath(path1, stroke, null);
      board.graphics.drawPath(path2, stroke, null);
    }
  }
}

bay.whiteboard.Whiteboard.properties.pointer = {
  width: 1,
  radius: 30,
  color: 'Magenta',
  age: 10000
}


bay.whiteboard.pencil.Pointer.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PencilPointer", "p": ' + list.indexOf(this.point) + ', "age" :' + this.age + '}';
}

bay.whiteboard.pencil.Pointer.fromJson = function(item, list){
  var point = new bay.whiteboard.pencil.Pointer( list[item.p]);
  point.age = item.age;
  point.restoreFromJson(item);
  point.recalc();
  return point;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilPointer", bay.whiteboard.pencil.Pointer.fromJson);


bay.whiteboard.Whiteboard.addTool(
  "pointer", "pencil",
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_pointerCursor'); board.tool.current.pointer = {};},
    toggleOff: function(board) {board.clearCurrentTool('bwb_pointerCursor', 'pointer');},
    onClick: function(board, e) {
      var point = board.pointAtEventPosition(e);
      board.collections.main.add(new bay.whiteboard.pencil.Pointer(point));
      board.tool.current.toggleOff(board);
      board.redrawAll();
    }
  },
  8, goog.getMsg("Highlight a point at whiteboard")
);

