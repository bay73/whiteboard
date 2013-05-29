goog.provide('bay.whiteboard.Collection')

// *************************************** Collection **************************************** //
bay.whiteboard.Collection = function(){
  this.list = [];
}

bay.whiteboard.Collection.prototype.getElements = function(){
  return this.list;
}

bay.whiteboard.Collection.prototype.clear = function(){
  for(var i=this.list.length - 1;i>=0;i--){
    if (this.list[i] && this.list[i].deleteElement)
      this.list[i].deleteElement();
  }
  this.list = [];
  if (this.onClear)
    this.onClear(e);
  return this;
}

bay.whiteboard.Collection.prototype.add = function(e){
  e.collection = this;
  this.list.push(e);
  this.onChange(e);
  return this.list.length;
}

// list of elements near the given point
bay.whiteboard.Collection.prototype.getNeighbourList = function(p, d, onlyVisible, sorted){
  var neighbourList = [];
  for(var i=0;i<this.list.length;i++){
    if (this.list[i].distance && (!onlyVisible || !this.list[i].hidden)) {
      var dist = this.list[i].distance(p.x, p.y);
      if (dist <= d){
        neighbourList.push({element: this.list[i], distance: dist});
      }
    }
  }
  if (sorted)
    neighbourList.sort(function(a,b){return a.distance - b.distance;});
  return neighbourList;
}

bay.whiteboard.Collection.prototype.getJson = function(element){
  return element.toJson(this.list, this.list.indexOf(element));
}


bay.whiteboard.Collection.prototype.jsonCode = function(){
  var str = '[';
  var list = this.getElements();
  for(var i=0;i<list.length;i++){
    if(list[i].toJson){
      if (i > 0) str += ',';
      str += '\n' + list[i].toJson(list, i);
    }
  }
  str += '\n]';
  return str;
}

bay.whiteboard.Collection.prototype.parseJson = function(str){
  var data = eval('(' + str + ')');
  this.rebuild(data);
  return this;
}

bay.whiteboard.Collection.prototype.rebuild = function(data){
  this.clear();
  for(var i=0;i<data.length;i++){
    var func = bay.whiteboard.Collection.getFromJsonFunc(data[i].type);
    if (func)
      this.list[i] = func(data[i], this.list);
      this.onChange(this.list[i]);
  }
  return this;
}

bay.whiteboard.Collection.prototype.acceptJsonStr = function(str){
  var data = eval('(' + str + ')');
  var id = data.id;
  if (!this.list[id]){
    var func = bay.whiteboard.Collection.getFromJsonFunc(data.type);
    if (func){
      this.list[id] = func(data, this.list);
      this.list[id].collection = this;
    }
  } else {
    this.list[id].acceptData(data);
  }
  return this;
}

bay.whiteboard.Collection.fromJsonFunc = {};

bay.whiteboard.Collection.getFromJsonFunc = function(type){
  return bay.whiteboard.Collection.fromJsonFunc[type];
}

bay.whiteboard.Collection.setFromJsonFunc = function(type, func){
  bay.whiteboard.Collection.fromJsonFunc[type] = func;
}

bay.whiteboard.Collection.prototype.onChange = function(element){
}

// *************************************** Element **************************************** //
bay.whiteboard.Element = function(){
  this.label = '';
  this.exists = false;
  this.dependant = [];
}

bay.whiteboard.Element.prototype.recalcDependat = function(){
  if(this.dependant){
    for(var i=0;i < this.dependant.length;i++){
      if (this.dependant[i].recalc)
        this.dependant[i].recalc();
    }
  }
}

bay.whiteboard.Element.prototype.deleteElement = function(){
}

bay.whiteboard.Element.prototype.onChange = function(){
  if (this.collection){
    this.collection.onChange(this);
  }
}

bay.whiteboard.Element.prototype.deleteDependant = function(obj){
  index = this.dependant.indexOf(obj);
  this.dependant.splice(index, 1);
}

bay.whiteboard.Element.prototype.isExists = function(){
  return this.exists;
}

bay.whiteboard.Element.prototype.distanceTo = function(p){
  if(!p || !p.exists || !this.exists) return NaN;
  return this.distance(p.x, p.y);
}

bay.whiteboard.Element.prototype.jsonHeader = function(id){
  return '"id": ' + id +
         (this.label?', "label": "' + this.label + '"':'') +
         (this.color?', "color": "' + this.color + '"':'') +
         (this.trace?', "trace": true':'') +
         (this.hidden?', "hidden": true':'');
}

bay.whiteboard.Element.prototype.restoreFromJson = function(item){
  if (item.label) this.label = item.label;
  if (item.hidden) this.hidden = true;
  if (item.color) this.color = item.color;
  if (item.trace) this.trace = true;
}

bay.whiteboard.Element.prototype.acceptData = function(item){
  if (item.label) this.label = item.label;
  if (item.hidden) this.hidden = true;
  if (item.color) this.color = item.color;
  if (item.trace) this.trace = true;
}

bay.whiteboard.Vector = function(x, y){
  if (x instanceof bay.whiteboard.Vector || x instanceof bay.whiteboard.Point){
    this.x = x.x;
    this.y = x.y;
  }else{
    this.x = x;
    this.y = y;
  }
}

bay.whiteboard.Element.prototype.hide = function(){
  this.hidden = true;
  this.onChange();
}

bay.whiteboard.Element.prototype.show = function(){
  this.hidden = false;
  this.onChange();
}

bay.whiteboard.Element.prototype.setLabel = function(label){
  this.label = label;
  this.onChange();
}

bay.whiteboard.Element.prototype.setTrace = function(trace){
  this.trace = trace;
  this.onChange();
}

bay.whiteboard.Element.prototype.setColor = function(color){
  this.color = color;
  this.onChange();
}
// *************************************** Point ******************************************* //
bay.whiteboard.Point = function(){
  bay.whiteboard.Element.call(this);
  this.x = null;
  this.y = null;
}

goog.inherits(bay.whiteboard.Point, bay.whiteboard.Element);

bay.whiteboard.Point.prototype.toString = function(){
  if(!this.exists) return 'Point does not exist';
  return 'Point: [' + this.x.toFixed(2) + ', ' + this.y.toFixed(2) + ']';
}

bay.whiteboard.Point.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  return Math.sqrt((to.x - this.x)*(to.x - this.x) + (to.y - this.y)*(to.y - this.y))
}

bay.whiteboard.Point.prototype.getTrace = function(){
  return new bay.whiteboard.PointFree(this);
}

bay.whiteboard.Point.prototype.draw = function(board){
  // draw point if it exists and inside the area
  if(!this.exists) return;
  if(this.x >= board.area.minX && this.x <= board.area.maxX && this.y >= board.area.minY && this.y <= board.area.maxY){
    var coords = board.transform([this.x, this.y]);
    if (this.current){
      var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
      var fill = new goog.graphics.SolidFill(board.properties.current.color);
      board.graphics.drawCircle(coords[0], coords[1], board.properties.point.size, stroke, fill);
    }else{
      if (this.hover){
        var stroke = new goog.graphics.Stroke(board.properties.hover.width, board.properties.hover.color);
        var fill = new goog.graphics.SolidFill(board.properties.hover.color);
        board.graphics.drawCircle(coords[0], coords[1], board.properties.point.size, stroke, fill);
      }
      color = board.properties.point.color;
      if (this.color){
        color = this.color;
      }
      var stroke = new goog.graphics.Stroke(board.properties.point.width, color);
      var fill = new goog.graphics.SolidFill(color);
      board.graphics.drawCircle(coords[0], coords[1], board.properties.point.size, stroke, fill);
      if (this.label){
        var font = new goog.graphics.Font(board.properties.point.fontsize, board.properties.point.font)
        board.graphics.drawText(this.label, coords[0], coords[1], null, null, 'left', null, font, stroke, fill);
      }
    }
  }
}

// *************************************** FreePoint ******************************************* //
bay.whiteboard.PointFree = function(x, y){
  bay.whiteboard.Point.call(this);
  this.moveTo(x, y);
}

goog.inherits(bay.whiteboard.PointFree, bay.whiteboard.Point);

bay.whiteboard.PointFree.prototype.moveTo = function(x, y){
  bay.whiteboard.Vector.call(this, x, y);
  this.recalc();
  this.onChange();
}

bay.whiteboard.PointFree.prototype.acceptData = function(data){
  bay.whiteboard.PointFree.superClass_.acceptData.call(this, data);
  bay.whiteboard.Vector.call(this, data.x, data.y);
  this.recalc();
}

bay.whiteboard.PointFree.prototype.recalc = function(){
  if(this.x != null && this.y != null)
    this.exists = true;
  else
    this.exists = false;
  this.recalcDependat();
}

bay.whiteboard.PointFree.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PointFree", "x": ' + this.x + ', "y": ' + this.y + '}';
}

bay.whiteboard.PointFree.fromJson = function(item, list){
  var point = new bay.whiteboard.PointFree( item.x, item.y);
  point.restoreFromJson(item);
  return point;
}

bay.whiteboard.Collection.setFromJsonFunc("PointFree", bay.whiteboard.PointFree.fromJson);

// ************************************* static methods ***************************************************//
bay.whiteboard.getIntersection = function(obj1, obj2, x, y){
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
