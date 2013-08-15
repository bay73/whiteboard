goog.provide('bay.whiteboard.art');

goog.require('goog.style');
goog.require('goog.graphics');
goog.require('goog.ui.BidiInput');
goog.require('goog.ui.Dialog');

goog.require('bay.whiteboard');
goog.require('bay.whiteboard.Collection');
goog.require('bay.whiteboard.pencil');


// *************************************** ClipArt ******************************************* //
bay.whiteboard.art.ClipArt = function(r,url){
  bay.whiteboard.Element.call(this);
  this.rectangle = r;
  r.dependant.push(this);
  this.label = url;
  this.recalc();
}
goog.inherits(bay.whiteboard.art.ClipArt, bay.whiteboard.Element);

bay.whiteboard.art.ClipArt.prototype.deleteElement = function(){
  this.rectangle.deleteDependant(this);
}


bay.whiteboard.art.ClipArt.prototype.toString = function(){
  if(!this.exists) return 'ClipArt does not exist';
  return 'ClipArt from [' + this.label + ']';
}

bay.whiteboard.art.ClipArt.prototype.distance = function(x, y){
  var to = new bay.whiteboard.Vector(x,y);
  var d = null;
  if (this.rectangle.pos.left <= to.x && to.x <= this.rectangle.pos.right && this.rectangle.pos.top >= to.y && to.y >= this.rectangle.pos.bottom){
    d = 0;
  }else{
    d = this.rectangle.distance(x, y);
  }
  return d;
}

bay.whiteboard.art.ClipArt.prototype.recalc = function(){
  if(this.rectangle.exists){
    this.exists = true;
  } else {
    this.exists = false;
  }
  this.recalcDependant();
}

bay.whiteboard.art.ClipArt.prototype.draw = function(board){
  if(!this.exists) return;
  if (this.color){
    color = this.color;
  }
  var width = (this.rectangle.pos.right - this.rectangle.pos.left) * board.area.transformation.getScaleX();
  var height = (this.rectangle.pos.bottom - this.rectangle.pos.top) * board.area.transformation.getScaleY();
  var coords = board.transform([this.rectangle.pos.left, this.rectangle.pos.top,
                                this.rectangle.pos.right, this.rectangle.pos.bottom]);
  var path = new goog.graphics.Path();
  path.moveTo( coords[0], coords[1] );
  path.lineTo( coords[0], coords[3] );
  path.lineTo( coords[2], coords[3] );
  path.lineTo( coords[2], coords[1] );
  path.lineTo( coords[0], coords[1] );
  if (this.current){
    var stroke = new goog.graphics.Stroke(board.properties.current.width, board.properties.current.color);
    board.graphics.drawPath(path, stroke, null);
  } else {
    if (this.hover){
      var fill = new goog.graphics.SolidFill(board.properties.hover.color, 0.2);
      board.graphics.drawPath(path, null, fill);
    }
    board.graphics.drawImage(coords[0], coords[1], width, height, this.label);
  }
}

bay.whiteboard.art.ClipArt.prototype.toJson = function(list, id){
  return '{' + this.jsonHeader(id) + ', "type": "ClipArt", "r": ' + list.indexOf(this.rectangle) + '}';
}

bay.whiteboard.art.ClipArt.fromJson = function(item, list){
  var text = new bay.whiteboard.art.ClipArt( list[item.r], item.label);
  text.restoreFromJson(item);
  return text;
}

bay.whiteboard.Collection.setFromJsonFunc("ClipArt", bay.whiteboard.art.ClipArt.fromJson);

bay.whiteboard.Whiteboard.addTool(
  "clipart", "pencil",
  {
    toggleOn: function(board) {
      board.tool.current.clipart = {};
      board.tool.current.clipart.dialog = bay.whiteboard.art.chooseClipArt(
        board,
        function(url){
          board.tool.current.clipart.label = url;
          board.tool.current.clipart.dialog.dispose();
          goog.dom.classes.add(board.elements.drawElement, 'bwb_clipartCursor');
        },
        function(){
          board.tool.current.clipart.dialog.dispose();
          board.tool.current.toggleOff(board);
        }
      );
    },
    toggleOff: function(board) {
      if (board.tool.current.clipart.dialog)
        board.tool.current.clipart.dialog.dispose();
      board.clearCurrentTool('bwb_clipartCursor', 'clipart');
    },
    onMove: function(board, e) { if(board.tool.current.clipart){if (board.tool.current.clipart.endTmp) {board.tool.current.clipart.endTmp.moveTo(board.getConvertEventPos(e));} }},
    onClick: function(board, e) {
      if(board.tool.current.clipart && board.tool.current.clipart.label){
        var point = board.pointAtEventPosition(e);
        if (board.tool.current.clipart.start){
          var rect = new bay.whiteboard.pencil.Rectangle(board.tool.current.clipart.start, point);
          board.collections.main.add(rect);
          board.collections.main.add(new bay.whiteboard.art.ClipArt(rect, board.tool.current.clipart.label));
          board.collections.current.clear();
          board.tool.current.toggleOff(board);
        }else{
          board.collections.current.clear();
          board.tool.current.clipart.start = point;
          board.collections.current.add(board.tool.current.clipart.endTmp = new bay.whiteboard.PointFree(point));
          board.tool.current.clipart.endTmp.hide();
          var line = new bay.whiteboard.pencil.Rectangle(board.tool.current.clipart.start, board.tool.current.clipart.endTmp)
          line.current = true;
          board.collections.current.add(line);
        }
        board.redrawAll();
      }
    }
  },
  20, "Insert picture"
);

bay.whiteboard.art.chooseClipArt = function(board, onOk, onCancel){
  return bay.whiteboard.art.chooseUrlDialog(board, onOk, onCancel,'http://icons.iconarchive.com/icons/femfoyou/angry-birds/128/angry-bird-icon.png');
}

bay.whiteboard.Whiteboard.addTool("background", "tools",
  {
    action: function(board, e) {
      var dialog = bay.whiteboard.art.chooseBackground(
        board,
        function(url){
          dialog.dispose();
          board.setBackground(url);
        },
        function(){
          dialog.dispose();
        }
      );
    }
  },
  20, "Change whiteboard background"
);

bay.whiteboard.art.chooseBackground = function(board, onOk, onCancel){
  return bay.whiteboard.art.chooseUrlDialog(board, onOk, onCancel,'http://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/World_map_pol_2005_v02.svg/2000px-World_map_pol_2005_v02.svg.png');
}


bay.whiteboard.art.chooseUrlDialog = function(board, onOk, onCancel, defaulValue){
  var infoDialog = new goog.ui.Component();
  infoDialog.render(document.body);
  var position = goog.style.getPosition(board.elements.drawElement);
  goog.dom.classes.add(infoDialog.getElement(), 'bwb_pictureUrlDialog');
  goog.style.setPosition(infoDialog.getElement(), position.x + 40, position.y + 10);
  var artUrl = new goog.ui.BidiInput();
  infoDialog.addChild(artUrl, true);
  artUrl.setValue(defaulValue);
  goog.dom.classes.add(artUrl.getElement(), 'bwb_pictureUrlInput');
  var okButton = new goog.ui.Button('Ok');
  infoDialog.addChild(okButton, true);
  goog.events.listen(okButton, goog.ui.Component.EventType.ACTION, function(){onOk(artUrl.getValue());});
  goog.dom.classes.add(okButton.getElement(), 'bwb_pictureUrlOkButton');
  var cancelButton = new goog.ui.Button('Cancel');
  infoDialog.addChild(cancelButton, true);
  goog.events.listen(cancelButton, goog.ui.Component.EventType.ACTION, function(){onCancel();});
  goog.dom.classes.add(cancelButton.getElement(), 'bwb_pictureUrlCancelButton');
  goog.style.showElement(infoDialog.getElement(), true);
  return infoDialog;
}
