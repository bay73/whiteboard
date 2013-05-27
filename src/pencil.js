goog.provide('bay.whiteboard.pencil');

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
  this.recalc();
}

goog.inherits(bay.whiteboard.pencil.Rectangle, bay.whiteboard.Element);

bay.whiteboard.pencil.Rectangle.prototype.toString = function(){
  if(!this.exists) return 'Rectangle does not exist';
  return 'Rectangle';
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
  this.recalcDependat();
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
  width: 1,
  color: 'Black'
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
    toggleOff: function(board) { goog.dom.classes.remove(board.elements.drawElement, 'bwb_rectCursor'); board.tool.current.text = {}; board.tool.current = null;},
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
  }
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

bay.whiteboard.pencil.PointAtRect.prototype.moveTo = function(x, y){
  if (this.obj){
    var point = this.obj.closestPoint(x, y);
    this.side = point.side;
    this.param = point.param;
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
  this.recalcDependat();
}

bay.whiteboard.pencil.PointAtRect.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PencilPointAtRect", "obj": ' + list.indexOf(this.obj) + ', "s": "' + this.side + '", "t": ' + this.param + '"}';
}

bay.whiteboard.pencil.PointAtRect.fromJson = function(item, list){
  var point = new bay.whiteboard.pencil.PointAtRect( list[item.obj], item.s, item.t);
  point.restoreFromJson(item);
  return point;
}

bay.whiteboard.Collection.setFromJsonFunc("PencilPointAtRect", bay.whiteboard.pencil.PointAtRect.fromJson);

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
  this.startPoint.deleteDependant(this);
}


bay.whiteboard.pencil.Text.prototype.toString = function(){
  if(!this.exists) return 'Text does not exist';
  return 'Text [' + this.label + ']';
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
  this.recalcDependat();
}

bay.whiteboard.pencil.Text.prototype.width = function(font, size) {
  var f = (size + 'px ' + font);
  var o = goog.dom.createDom(
          'div', {style: "position: absolute; float: left; white-space: nowrap; display: hidden; font: " + f + ";"},
          this.label);
  goog.dom.appendChild(document.body, o);
  w = goog.style.getSize(o).width;
  o.remove();
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
    var color = board.properties.line.color;
    if (this.color){
      color = this.color;
    }
    var stroke = new goog.graphics.Stroke(board.properties.line.width, color);
    var fill = new goog.graphics.SolidFill(color);
    board.graphics.drawText(this.label, coords[0], coords[1], width, height, 'center', 'center', font, stroke, fill);
  }
}

bay.whiteboard.Whiteboard.properties.text = {
  width: 1,
  color: 'DarkBlue',
  font:  'Times',
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
    toggleOff: function(board) { goog.dom.classes.remove(board.elements.drawElement, 'bwb_textCursor'); board.tool.current.text = {}; board.tool.current = null;},
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
  }
);
