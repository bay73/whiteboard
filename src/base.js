goog.provide('bay.whiteboard.Collection')
goog.provide('bay.whiteboard.translation')

// Base objects used for whiteboard:
// Andrey Bogdanov, May 2013
//
// bay.whiteboard.Collection - the list of elements which can be drawn
// Collection provides some method to work with set of elements
// There are three collections at whiteboard:
// - main - the main set of element at board
// - trace - the set of elements drawed as trace of elements of main set having trace field equals true
// - current - the set of auxilary elements of current drawing tool used by user
//
// bay.whiteboard.Element - the base drawing element on whiteboard. All elements should extend it
//
// bay.whiteboard.Vector  - pair of two coordinates
// most function could accept one Vector parameter as well as two coordinate parameters
//
// bay.whiteboard.Point - common point on a plane. Do not specify how the coordinates are set
//
// bay.whiteboard.PointFree - point with specified coordinates
//
//

// *************************************** Collection **************************************** //
bay.whiteboard.Collection = function(){
  this.list = [];
}

// simple getter
bay.whiteboard.Collection.prototype.getElements = function(){
  return this.list;
}

bay.whiteboard.Collection.prototype.getBoard = function(){
  return this.board;
}

bay.whiteboard.Collection.prototype.joinBoard = function(board){
  this.board = board;
}

// remove all elements from collection
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
// add one element to collection
bay.whiteboard.Collection.prototype.add = function(element){
  element.collection = this;
  this.list.push(element);
  this.onChange(element);
  return this.list.length;
}

// list of elements near the given point
// p - the given point
// d - maximum search distance
bay.whiteboard.Collection.prototype.getNeighbourList = function(p, d, onlyVisible, sorted){
  var neighbourList = [];
  for(var i=0;i<this.list.length;i++){
    if (this.list[i] && this.list[i].distance && (!onlyVisible || !this.list[i].hidden)) {
      var dist = this.list[i].distance(p.x, p.y);
      if (dist <= d){
        neighbourList.push({element: this.list[i], distance: dist});
      }
    }
  }
  // sort list if needed (use distance as sort key)
  if (sorted)
    neighbourList.sort(function(a,b){return a.distance - b.distance;});
  return neighbourList;
}

// serialization of one element
bay.whiteboard.Collection.prototype.getJson = function(element){
  return element.toJson(this.list, this.list.indexOf(element));
}

// add element from json string
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
// remove element
bay.whiteboard.Collection.prototype.acceptDeletion = function(id){
  var element = this.list[id];
  if(element){
    if(element.dependant.length == 0){
      element.deleteElement();
      if(this.list.length == id + 1){
        this.list.splice(id, 1);
      }else{
        this.list[id] = null;
      }
      return true;
    }
  }
  return false;
}
// serialization of all elements
bay.whiteboard.Collection.prototype.jsonCode = function(){
  var str = '[';
  var list = this.getElements();
  for(var i=0;i<list.length;i++){
    if(list[i] && list[i].toJson){
      if (i > 0) str += ',';
      str += '\n' + list[i].toJson(list, i);
    }
  }
  str += '\n]';
  return str;
}

// desrialization of whole collection from json string
bay.whiteboard.Collection.prototype.parseJson = function(str){
  var data = eval('(' + str + ')');
  this.rebuild(data);
  return this;
}

// desrialization of whole collection from evaluted json
bay.whiteboard.Collection.prototype.rebuild = function(data){
  this.clear();
  for(var i=0;i<data.length;i++){
    var func = bay.whiteboard.Collection.getFromJsonFunc(data[i].type);
    if (func){
      this.list[i] = func(data[i], this.list);
      this.list[i].collection = this;
      this.onChange(this.list[i]);
    }
  }
  return this;
}

// collection of typed functions for deserialization
bay.whiteboard.Collection.fromJsonFunc = {};
bay.whiteboard.Collection.getFromJsonFunc = function(type){
  return bay.whiteboard.Collection.fromJsonFunc[type];
}
bay.whiteboard.Collection.setFromJsonFunc = function(type, func){
  bay.whiteboard.Collection.fromJsonFunc[type] = func;
}

// to be defined on using of collection
bay.whiteboard.Collection.prototype.onChange = function(element){
}

// *************************************** Element **************************************** //
bay.whiteboard.Element = function(){
  this.label = '';
  this.exists = false;
  this.dependant = [];
}
// recalc position of dependent elements
bay.whiteboard.Element.prototype.recalcDependant = function(){
  if(this.dependant){
    for(var i=0;i < this.dependant.length;i++){
      if (this.dependant[i].recalc)
        this.dependant[i].recalc();
    }
  }
}
// virtual function for correct element deletion
bay.whiteboard.Element.prototype.deleteElement = function(){
}
// translation event to collection
bay.whiteboard.Element.prototype.onChange = function(){
  if (this.collection){
    this.collection.onChange(this);
  }
}
// remove element from dependatn list
bay.whiteboard.Element.prototype.deleteDependant = function(obj){
  index = this.dependant.indexOf(obj);
  this.dependant.splice(index, 1);
}
// check if the element can be drawn
bay.whiteboard.Element.prototype.isExists = function(){
  return this.exists;
}
// distance from element to point
bay.whiteboard.Element.prototype.distanceTo = function(p){
  if(!p || !p.exists || !this.exists) return NaN;
  return this.distance(p.x, p.y);
}
// auxilary function to build json string
bay.whiteboard.Element.prototype.jsonHeader = function(id){
  return '"id": ' + id +
         (this.label?', "label": "' + this.label + '"':'') +
         (this.color?', "color": "' + this.color + '"':'') +
         (this.trace?', "trace": true':'') +
         (this.hidden?', "hidden": true':'');
}
// auxilary function to parse json string
bay.whiteboard.Element.prototype.restoreFromJson = function(item){
  if (item.label) this.label = item.label; else this.label = "";
  if (item.hidden) this.hidden = true; else delete this.hidden;
  if (item.color) this.color = item.color; else delete this.color;
  if (item.trace) this.trace = true; else delete this.trace;
}
// vitual function to create element from json
bay.whiteboard.Element.prototype.acceptData = function(item){
  this.restoreFromJson(item);
}
// setters of hidden field
bay.whiteboard.Element.prototype.hide = function(){
  this.hidden = true;
  this.onChange();
}
bay.whiteboard.Element.prototype.show = function(){
  this.hidden = false;
  this.onChange();
}
// setter of label field
bay.whiteboard.Element.prototype.setLabel = function(label){
  this.label = label;
  this.onChange();
}
// setter of trace field
bay.whiteboard.Element.prototype.setTrace = function(trace){
  this.trace = trace;
  this.onChange();
}
// setter of color field
bay.whiteboard.Element.prototype.setColor = function(color){
  this.color = color;
  this.onChange();
}
// *************************************** Vector ******************************************* //
bay.whiteboard.Vector = function(x, y){
  // if first parameter is an object with two coordinates use this object
  if (x instanceof bay.whiteboard.Vector || x instanceof bay.whiteboard.Point){
    this.x = x.x;
    this.y = x.y;
  }else{
    this.x = x;
    this.y = y;
  }
}
bay.whiteboard.Vector.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  return Math.sqrt((to.x - this.x)*(to.x - this.x) + (to.y - this.y)*(to.y - this.y))
}
// *************************************** Point ******************************************* //
bay.whiteboard.Point = function(){
  bay.whiteboard.Element.call(this);
  this.x = null;
  this.y = null;
}
goog.inherits(bay.whiteboard.Point, bay.whiteboard.Element);
// creating user-readable label of element
bay.whiteboard.Point.prototype.toString = function(){
  if(!this.exists) return goog.getMsg('Point does not exist');
  return goog.getMsg('Point: [{$x},{$y}]', {'x': this.x.toFixed(2), 'y': this.y.toFixed(2)});
}
// calculate distance to other point
bay.whiteboard.Point.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  return Math.sqrt((to.x - this.x)*(to.x - this.x) + (to.y - this.y)*(to.y - this.y))
}
// Trace of any point is a point with given coordinates
bay.whiteboard.Point.prototype.getTrace = function(){
  return new bay.whiteboard.PointFree(this);
}
// main draw function
bay.whiteboard.Point.prototype.draw = function(board){
  // draw point if it exists and inside the area
  if(!this.exists) return;
  if(this.x >= board.area.minX && this.x <= board.area.maxX && this.y >= board.area.minY && this.y <= board.area.maxY){
    var coords = board.transform([this.x, this.y]);
    if (this.current){
      // if the element is a part of current collection draw it with current color
      var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
      var fill = new goog.graphics.SolidFill(board.properties.current.color);
      board.graphics.drawCircle(coords[0], coords[1], board.properties.point.size, stroke, fill);
    }else{
      if (this.hover){
        // if the element is hovered by mouse outlline it
        var stroke = new goog.graphics.Stroke(board.properties.hover.width, board.properties.hover.color);
        var fill = new goog.graphics.SolidFill(board.properties.hover.color);
        board.graphics.drawCircle(coords[0], coords[1], board.properties.point.size, stroke, fill);
      }
      // use board properties as default color
      color = board.properties.point.color;
      if (this.color){
        color = this.color;
      }
      var stroke = new goog.graphics.Stroke(board.properties.point.width, color);
      var fill = new goog.graphics.SolidFill(color);
      board.graphics.drawCircle(coords[0], coords[1], board.properties.point.size, stroke, fill);
      if (this.label){
        // add label if it is given
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
// change coordinates of point
bay.whiteboard.PointFree.prototype.moveTo = function(x, y){
  bay.whiteboard.Vector.call(this, x, y);
  this.recalc();
  this.onChange();
}
// restore point from json data
bay.whiteboard.PointFree.prototype.acceptData = function(data){
  bay.whiteboard.PointFree.superClass_.acceptData.call(this, data);
  bay.whiteboard.Vector.call(this, data.x, data.y);
  this.recalc();
}
// for free point recalc is simply set of exists field
bay.whiteboard.PointFree.prototype.recalc = function(){
  if(this.x != null && this.y != null)
    this.exists = true;
  else
    this.exists = false;
  this.recalcDependant();
}
// make json string for point
bay.whiteboard.PointFree.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "PointFree", "x": ' + this.x + ', "y": ' + this.y + '}';
}
// create new point from json string
bay.whiteboard.PointFree.fromJson = function(item, list){
  var point = new bay.whiteboard.PointFree( item.x, item.y);
  point.restoreFromJson(item);
  return point;
}
// register deserialize function
bay.whiteboard.Collection.setFromJsonFunc("PointFree", bay.whiteboard.PointFree.fromJson);


// ************************************* static method ***************************************************//
// TODO
// this method should be class independent !!!
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

goog.getMsg = function(str, opt_values) {
  var translation = {};
  if(typeof current_LOCALE !== "undefined")
    var translation = bay_whiteboard_translation[current_LOCALE];
  str = translation[str] || str;
  var values = opt_values || {};
  for (var key in values) {
    var value = ('' + values[key]).replace(/\$/g, '$$$$');
    str = str.replace(new RegExp('\\{\\$' + key + '\\}', 'gi'), value);
  }
  return str;
};
