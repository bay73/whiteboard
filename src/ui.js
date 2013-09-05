goog.provide('bay.whiteboard')

// Whiteboard user interface
// Andrey Bogdanov, May 2013
//
// Usage of whiteboard:
// board = bay.whiteboard.Create() - creating of new whiteboard item. Returns the created item
//
// board.render(domElement) - rendering whiteboard inside the given dom Element
//
// Some board methods:
//
// board.linkWebSocket('ws://addr:port/path') - link websocket to synchronize board between client
//
// board.setToolProperties( id, visible, order, group) - set properties for existing whiteboard tool buttons
// You could hide or reorder buttons
//
// board.redrawAll() - redraw all elements
// baord.scale(point, value) - zooming of whitboard with center at given point
// baord.shift(vector) - shift drawing to the given vector
// board.setBoundaries(left, right, top, bottom) - restrict the working area. If some arguments is missing on null, then this direction is not restricted
//
// board.properties - object containing drawing properties for elements
// board.properties.hover - color and width for outlining of hovered elements
// board.properties.axes - color, width, font for axes
// board.properties.current - color and width for current drawing
// board.properties.point - default color and size for geometry point
// board.properties.line - default color and line width for geometry line
// board.properties.circle - default color and line width for geometry circle
// board.properties.freeline - default color and line width for free line
// board.properties.rectangle - default color and line width for rectangle
// board.properties.pencilcircle - default color and line width for free circle
// board.properties.text - default color, line width and font for text box
// board.properties.underline - default color, width and opacity for underline element
// board.properties.arrow - default color, width and opacity for arrows
// board.properties.pointer - default color, age and size for pointer
//


goog.require('bay.whiteboard.Collection')

goog.require('goog.dom');
goog.require('goog.dom.ViewportSizeMonitor');
goog.require('goog.object');
goog.require('goog.style');
goog.require('goog.graphics');
goog.require('goog.graphics.Font');
goog.require('goog.fx.Dragger');
goog.require('goog.fx.Dragger.EventType');
goog.require('goog.ui.Button');
goog.require('goog.ui.BidiInput');
goog.require('goog.ui.Dialog');
goog.require('goog.ui.Textarea');
goog.require('goog.ui.Checkbox');
goog.require('goog.ui.ColorMenuButton');
goog.require('goog.ui.CustomColorPalette');
goog.require('goog.ui.KeyboardShortcutHandler');
goog.require('goog.ui.Tooltip');
goog.require('goog.events.MouseWheelHandler');
goog.require('goog.net.WebSocket');

// ******************************* constructor ***********************************//
bay.whiteboard.Create = function(){
  var whiteboard = new bay.whiteboard.Whiteboard();
  return whiteboard;
}

bay.whiteboard.Whiteboard = function(){
  // copy properties to the board item
  this.properties = goog.object.clone(bay.whiteboard.Whiteboard.properties);
  if (goog.userAgent.MOBILE){
    this.properties.hover.dist = this.properties.hover.dist * 5;
  }
  // initialize data
  this.initCollections();
  this.area = {};
  this.elements = {};

  this.tool = {};
  // register groups of tools
  this.tool.groups = [];
  for(var i = 0; i < bay.whiteboard.Whiteboard.toolGroups.length; i++){
    var group = {"id": bay.whiteboard.Whiteboard.toolGroups[i].id, "order": bay.whiteboard.Whiteboard.toolGroups[i].order, "desc": bay.whiteboard.Whiteboard.toolGroups[i].desc, "hidden": false};
    // group actions
    group.toggleOn = (function(group){return function(board){board.showToolBox(group)}})(group);
    group.toggleOff = (function(group){return function(board){board.hideToolBox(group)}})(group);
    this.tool.groups.push( group );
  }

  // register tools
  this.tool.tools = [];
  for(var i = 0; i < bay.whiteboard.Whiteboard.tools.length; i++){
    toolProto = bay.whiteboard.Whiteboard.tools[i];
    tool = {"id": toolProto.id, "order": toolProto.order, "desc": toolProto.desc, "hidden": false};
    // copy properties from tool prototype
    tool.action = toolProto.action;
    tool.toggleOn = toolProto.toggleOn;
    tool.toggleOff = toolProto.toggleOff;
    tool.onClick = toolProto.onClick;
    tool.onMove = toolProto.onMove;
    tool.group = toolProto.group;

    this.tool.tools.push(tool);
  }

}

bay.whiteboard.Whiteboard.prototype.setToolProperties = function(id, visible, order, group){
  for(var i = 0; i < this.tool.groups.length; i++){
    if (this.tool.groups[i].id == id) {
      this.tool.groups[i].hidden = !visible;
      this.tool.groups[i].order = order;
    }
  }
  for(var i = 0; i < this.tool.tools.length; i++){
    if (this.tool.tools[i].id == id) {
      this.tool.tools[i].hidden = !visible;
      this.tool.tools[i].order = order;
      this.tool.tools[i].group = group;
    }
  }
}
// ********************************** getters for some usefull elements ********************
bay.whiteboard.Whiteboard.prototype.getMainCollection = function(){
  return this.collections.main;
}

bay.whiteboard.Whiteboard.prototype.getDrawArea = function(){
  return whiteboard.elements.drawElement;
}

// ********************************** register whitboard tools ********************
bay.whiteboard.Whiteboard.toolGroups = [];

bay.whiteboard.Whiteboard.tools = [];

bay.whiteboard.Whiteboard.addGroup = function(id, order, desc){
  for(var i = 0; i < bay.whiteboard.Whiteboard.toolGroups.length; i++){
    if (bay.whiteboard.Whiteboard.toolGroups[i].id == id) {
      return bay.whiteboard.Whiteboard.toolGroups[i];
    }
  }
  var group = {"id": id, "order": order, "desc": desc};
  bay.whiteboard.Whiteboard.toolGroups.push(group);
  return group;
}

bay.whiteboard.Whiteboard.addTool = function(id, groupId, actions, order, desc){
  if (groupId) bay.whiteboard.Whiteboard.addGroup(groupId);
  for(var i = 0; i < bay.whiteboard.Whiteboard.tools.length; i++){
    if (bay.whiteboard.Whiteboard.tools[i].id == id) {
      return bay.whiteboard.Whiteboard.tools[i];
    }
  }
  var tool = {"id": id, "order": order, "desc": desc, "group": groupId, "action": actions.action, "toggleOn": actions.toggleOn, "toggleOff": actions.toggleOff, "onClick": actions.onClick, "onMove": actions.onMove};
  bay.whiteboard.Whiteboard.tools.push(tool);
  return tool;
}

bay.whiteboard.Whiteboard.removeTool = function(id){
  for(var i = 0; i < bay.whiteboard.Whiteboard.tools.length; i++){
    if (bay.whiteboard.Whiteboard.tools[i].id == id) {
      bay.whiteboard.Whiteboard.tools.splice(i, 1);
    }
  }
}

// ********************************** default value for properties ********************//
bay.whiteboard.Whiteboard.properties = {
  events: {
    onclick:      true,
    onwheel:      true,
    ondrag:       true,
    hover:        true,
    onrightclick: true
  },
  point: {
    size:  2,
    color:  'black',
    width: 1,
    font:   'Times',
    fontsize: 14
  },
  hover: {
    width:   4,
    color:  'blue',
    dist:  10
  },
  current: {
    width:   1,
    color:    'red'
  },
  axes: {
    width:    0.5,
    color:    'skyblue',
    font:     'Times',
    fontsize: 11
  }
}
// ******************************* rendering ***********************************//
bay.whiteboard.Whiteboard.prototype.render = function(container){
  // container could be string or dom-element
  if(typeof container === 'string')
    this.container = goog.dom.getElement(container);
  else
    this.container = container;

  // create whiteboard layout - table with two cells
  this.elements.toolbarElement = goog.dom.createDom('td', 'bwb_toolbar', ' ');
  this.elements.drawElement = goog.dom.createDom('td', 'bwb_drawarea', ' ');
  layout = goog.dom.createDom(
    'table',
    'bwb_layout',
    goog.dom.createDom('tr', 'bwb_layout', this.elements.toolbarElement, this.elements.drawElement )
  );
  goog.dom.appendChild(this.container, layout);
  this.addButtons();
  this.getGraphics();

  this.addMouseMoveListener();
  this.addWheelListener();
  this.addClickListener();
  this.addDragListener();
  this.addRightClickListener();
  this.addKeyboardListener();
}
// ********************************** baord methods **************************************//
bay.whiteboard.Whiteboard.prototype.redrawAll = function(){
  var board = this;
  drawCollection = function(collection){
    var list = collection.getElements();
    for(var i=0;i<list.length;i++){
      if(list[i] && list[i].draw && !list[i].hidden){
        list[i].draw(board)
      }
    }
  }
  this.graphics.clear();
  if(this.area.showCoordinates)
    this.drawCoordinates();
  drawCollection(this.collections.tracer);
  drawCollection(this.collections.main);
  drawCollection(this.collections.current);
  if (this.dragger && this.dragger.point){
    point = this.dragger.point;
    if (point.exists){
      var stroke = new goog.graphics.Stroke(this.properties.axes.width, this.properties.axes.color);
      var font = new goog.graphics.Font(this.properties.axes.fontsize, this.properties.axes.font)
      var fill = new goog.graphics.SolidFill(this.properties.axes.color);
      var coords = this.transform([point.x, point.y]);
      this.graphics.drawText('[' + Math.round(point.x * 100)/100 + ', ' + Math.round(point.y * 100)/100 + ']', coords[0], coords[1] - this.properties.axes.fontsize, null, null, 'left', null, font, stroke, fill);
    }
  }
}
bay.whiteboard.Whiteboard.prototype.getViewport= function(){
  var viewport = {
    left: this.area.minX,
    right: this.area.maxX,
    top: this.area.maxY,
    bottom: this.area.minY
  };
  return viewport;
}

bay.whiteboard.Whiteboard.prototype.setBoundaries= function(left, right, top, bottom){
  this.area.left = left;
  if(this.area.left != null && this.area.left > this.area.minX) this.area.left = this.area.minX;
  this.area.right = right;
  if(this.area.right != null && this.area.right < this.area.maxX) this.area.right = this.area.maxX;
  this.area.top = top;
  if(this.area.top != null && this.area.top < this.area.maxY) this.area.top = this.area.maxY;
  this.area.bottom = bottom;
  if(this.area.bottom != null && this.area.bottom > this.area.minY) this.area.bottom = this.area.minY;
}

bay.whiteboard.Whiteboard.prototype.scale = function(p, n){
  var coords = this.reverseTransform(p);
  var oldTransformation = this.area.transformation.clone();
  this.area.transformation = this.area.transformation.translate(coords.x, coords.y).scale(n, n).translate(-coords.x, -coords.y);
  return this.onSetTransformation(oldTransformation);
}
bay.whiteboard.Whiteboard.prototype.shift = function(p){
  var oldTransformation = this.area.transformation.clone();
  this.area.transformation = this.area.transformation.preTranslate(this.graphics.getCoordSize().width * p.x, -this.graphics.getCoordSize().height * p.y);
  return this.onSetTransformation(oldTransformation);
}
bay.whiteboard.Whiteboard.prototype.markHoverElements = function(p){
  var list = this.collections.main.getElements();
  for(var i=0;i<list.length;i++){
    if(list[i])
      list[i].hover = false;
  }
  var coords = this.reverseTransform(p);
  list = this.collections.main.getNeighbourList(coords, this.getHoverDist());
  for(var i=0;i<list.length;i++){
    list[i].element.hover = true;
  }
}
bay.whiteboard.Whiteboard.prototype.zoomIn = function(){
  this.scale(new bay.whiteboard.Vector(this.graphics.getCoordSize().width/2, this.graphics.getCoordSize().height/2), 2);
  this.drawBackground();
  this.redrawAll();
}
bay.whiteboard.Whiteboard.prototype.zoomOut = function(){
  this.scale(new bay.whiteboard.Vector(this.graphics.getCoordSize().width/2, this.graphics.getCoordSize().height/2), 0.5);
  this.drawBackground();
  this.redrawAll();
}
bay.whiteboard.Whiteboard.prototype.linkWebSocket = function(url){
  this.ws_  = new goog.net.WebSocket();
  var onWsOpen = function(e){
  };
  var onWsMessage = function(e){
    this.acceptBackground(e.message);
    this.collections.main.acceptJsonStr(e.message);
    this.redrawAll();
  };
  var onWsError = function(e){
    this.ws_.close();
  };
  var onWsClose = function(e){
    this.ws_.dispose();
  };
  this.ws_.addEventListener(goog.net.WebSocket.EventType.OPENED, onWsOpen, false, this);
  this.ws_.addEventListener(goog.net.WebSocket.EventType.MESSAGE, onWsMessage, false, this);
  this.ws_.addEventListener(goog.net.WebSocket.EventType.CLOSED, onWsClose, false, this);
  this.ws_.addEventListener(goog.net.WebSocket.EventType.ERROR, onWsError, false, this);
  this.ws_.open(url);
  var board = this;
  this.collections.main.onChange = function(e){
    if (board.ws_.isOpen())
      board.ws_.send(this.getJson(e));
  }
  this.onBackground = function(e){
    if (board.ws_.isOpen())
     board.ws_.send(board.backgroundJson());
  }
}
// ********************************** utilities ***********************************
bay.whiteboard.Whiteboard.prototype.getGraphics = function(){
  if (!this.graphics){
    if (!goog.graphics.isBrowserSupported()){
      alert(goog.getMsg("This browser doesn''t support graphics. Please use another web browser."));
    }
    var size = goog.style.getSize(this.elements.drawElement);
    var graphics = goog.graphics.createSimpleGraphics( size.width-12, size.height-12);
    var drawElement = this.elements.drawElement;
    goog.events.listen(new goog.dom.ViewportSizeMonitor(), goog.events.EventType.RESIZE, function(e) { var size = goog.style.getSize(drawElement); graphics.setSize(size.width-12, size.height-12);});
    graphics.render(this.elements.drawElement);
    this.graphics = graphics;
    this.area.transformation = goog.graphics.AffineTransform.getTranslateInstance(graphics.getCoordSize().width/2, graphics.getCoordSize().height/2).scale(1, -1);
    this.onSetTransformation();
  }
  return this.graphics;
}
bay.whiteboard.Whiteboard.prototype.getHoverDist = function(){
  return this.properties.hover.dist / this.area.transformation.getScaleX();
}
bay.whiteboard.Whiteboard.prototype.initCollections = function(){
  this.collections = {};
  this.collections.main = new bay.whiteboard.Collection();
  this.collections.main.joinBoard(this);
  this.collections.current = new bay.whiteboard.Collection();
  this.collections.current.joinBoard(this);
  this.collections.tracer = new bay.whiteboard.Collection();
  this.collections.tracer.joinBoard(this);
}
// transformations between baord coordinates and graphics coordinates
bay.whiteboard.Whiteboard.prototype.transform = function(values){
  var transformed = [];
  if (values instanceof bay.whiteboard.Vector){
    this.area.transformation.transform([values.x, values.y], 0, transformed, 0, 1);
    return new bay.whiteboard.Vector(transformed[0], transformed[1]);
  }else{
    this.area.transformation.transform(values, 0, transformed, 0, values.length/2);
    return transformed;
  }
}
bay.whiteboard.Whiteboard.prototype.reverseTransform = function(values){
  var transformed = [];
  if (values instanceof bay.whiteboard.Vector){
    this.area.reverseTransformation.transform([values.x, values.y], 0, transformed, 0, 1);
    return new bay.whiteboard.Vector(transformed[0], transformed[1]);
  }else{
    this.area.reverseTransformation.transform(values, 0, transformed, 0, values.length/2);
    return transformed;
  }
}
bay.whiteboard.Whiteboard.prototype.onSetTransformation = function(oldTransformation){
  this.area.reverseTransformation = this.area.transformation.createInverse();
  var coords = this.reverseTransform([0, 0, this.graphics.getCoordSize().width, this.graphics.getCoordSize().height]);
  if(this.area.left != null && coords[0] < this.area.left ||
     this.area.right != null && coords[2] > this.area.right ||
     this.area.bottom != null && coords[3] < this.area.bottom ||
     this.area.top != null && coords[1] > this.area.top
     ){
    this.area.transformation = oldTransformation;
    this.area.reverseTransformation = this.area.transformation.createInverse();
    return false;
  }else{
    this.area.minX = coords[0];
    this.area.minY = coords[3];
    this.area.maxX = coords[2];
    this.area.maxY = coords[1];
    return true;
  }
}
// *********************************** codePanel *********************************************//
bay.whiteboard.Whiteboard.prototype.showCodePanel = function(){
  var dialog = new goog.ui.Dialog();
  dialog.setTitle(goog.getMsg('JSON code for drawing'));
  dialog.setButtonSet(goog.ui.Dialog.ButtonSet.OK_CANCEL);
  var textArea = new goog.ui.Textarea(this.collections.main.jsonCode());
  textArea.setMinHeight(this.graphics.getCoordSize().height/2);
  textArea.setMaxHeight(this.graphics.getCoordSize().height);
  dialog.addChild(textArea, true);
  goog.style.setSize(textArea.getElement(), this.graphics.getCoordSize().width/2, this.graphics.getCoordSize().height/2);
  goog.dom.classes.add(textArea.getElement(), 'codeArea');
  goog.events.listen(dialog, goog.ui.Dialog.EventType.SELECT, function(e) {
    if (e.key == 'ok'){
      this.collections.main.parseJson(textArea.getValue());
      this.redrawAll();
    }
    dialog.dispose();
  }, null, this);
  dialog.setVisible(true);
}

// *************************** event utilities *************************************** //
bay.whiteboard.Whiteboard.prototype.findPoint = function(list){
  for(var i=0;i<list.length;i++){
    if (list[i].element instanceof bay.whiteboard.Point){
      return list[i].element;
    }
  }
  return null;
}
// create new point at event position
bay.whiteboard.Whiteboard.prototype.pointAtEventPosition = function(e){
  // add point at click position
  var coords = this.getConvertEventPos(e);
  var minDist = this.getHoverDist();
  var list = this.collections.main.getNeighbourList(coords, minDist, true, true);
  // try to find already existed point
  var point = this.findPoint(list);
  // try to find closest intersectionpoint
  if (!point){
    for(var i=0;i<list.length;i++){
      if (list[i].distance >= minDist) break;
      for(var j=i + 1;j<list.length;j++){
        var newPoint = bay.whiteboard.getIntersection(list[i].element, list[j].element, coords);
        if (newPoint && newPoint.isExists()){
          var dist = newPoint.distance(coords);
          if (dist <= minDist){
            point = newPoint;
            minDist = dist;
          }
        }
      }
    }
    if(point){
      this.collections.main.add(point);
    }
  }
  if (!point){
    // if point not exists and no intersections - add new
    if (list.length > 0 && list[0].element.closestPoint){
      // closest point on a line
      point = list[0].element.closestPoint(coords);
    }else{
      // free point
      point = new bay.whiteboard.PointFree(coords);
    }
    this.collections.main.add(point);
  }
  return point;
}
// coordinates of event position using graphics coordinates
bay.whiteboard.Whiteboard.prototype.getEventPos = function(e){
  var pos = goog.style.getClientPosition(this.elements.drawElement);
  return new bay.whiteboard.Vector(e.clientX - pos.x, e.clientY - pos.y);
}
// coordinates of event position using board coordinates
bay.whiteboard.Whiteboard.prototype.getConvertEventPos = function(e){
  return this.reverseTransform(this.getEventPos(e));
}

// *********************************** listeners *********************************************//
bay.whiteboard.Whiteboard.prototype.addMouseMoveListener = function(){
  if (this.properties.events.hover){
    var moveHandler = function(e){
      this.markHoverElements(this.getEventPos(e));
      if (this.tool.current && this.tool.current.onMove){
        this.tool.current.onMove(this, e);
      }
      this.redrawAll();
    }
    goog.events.listen(this.elements.drawElement, goog.events.EventType.MOUSEMOVE, moveHandler, null, this);
  }
}

bay.whiteboard.Whiteboard.prototype.addWheelListener = function(){
  if(this.properties.events.onwheel){
    var wheelHandler = function(e){
      if (e.altKey){
        this.scale(this.getEventPos(e), Math.pow(2, -e.detail/20));
      } else if (e.shiftKey){
        this.shift(new bay.whiteboard.Vector(-e.detail/40, 0));
      } else if (!e.ctrlKey && !e.metaKey){
        this.shift(new bay.whiteboard.Vector(0, -e.detail/40));
      }
      this.drawBackground();
      this.redrawAll();
      e.preventDefault();
    }
    goog.events.listen(new goog.events.MouseWheelHandler(this.elements.drawElement), goog.events.MouseWheelHandler.EventType.MOUSEWHEEL, wheelHandler, null, this);
  }
}
bay.whiteboard.Whiteboard.prototype.addClickListener = function(){
  if(this.properties.events.onclick){
    var clickHandler = function(e){
      if (this.tool.current && this.tool.current.onClick){
        this.tool.current.onClick(this, e);
      }
      e.preventDefault();
    }
    goog.events.listen(this.elements.drawElement, goog.events.EventType.CLICK, clickHandler, null, this);
  }
}
bay.whiteboard.Whiteboard.prototype.addDragListener = function(){
  if(this.properties.events.ondrag){
    var dragHandler = function(e){
      if (this.dragger.point && this.dragger.point.moveTo){
        this.dragger.point.moveTo(this.getConvertEventPos(e));
        this.TraceAll();
      }
    }
    goog.events.listen(
      this.elements.drawElement,
      goog.events.EventType.MOUSEDOWN,
      function(e) {
        var minDist = this.getHoverDist();
        var list = this.collections.main.getNeighbourList(this.getConvertEventPos(e), minDist, true, true);
        var point = this.findPoint(list);
        this.dragger = new goog.fx.Dragger(this.elements.drawElement);
        if(point)
          this.dragger.point = point;
        goog.events.listen(this.dragger, goog.fx.Dragger.EventType.DRAG, dragHandler, null, this );
        goog.events.listen(this.dragger, goog.fx.Dragger.EventType.END, function(e) {if (this.dragger) {this.dragger.dispose(); this.dragger = null;}}, null, this );
        this.dragger.startDrag(e);
      },
      null,
      this);
  }
}
bay.whiteboard.Whiteboard.prototype.addRightClickListener = function(){
  if(this.properties.events.onrightclick){
    goog.events.listen(
      this.elements.drawElement, goog.events.EventType.CONTEXTMENU,
      function(e){
        if (this.tool.current && this.tool.current.toggleOff){
          this.tool.current.toggleOff(this);
        }
        this.showInfoDialog(e);
      },
      null, this);
  }
}
bay.whiteboard.Whiteboard.prototype.addKeyboardListener = function(){
  var shortcutHandler = new goog.ui.KeyboardShortcutHandler(document);
  shortcutHandler.registerShortcut('CTRL_J', goog.events.KeyCodes.J, goog.ui.KeyboardShortcutHandler.Modifiers.CTRL);
  var onKeyPress = function(e){
    if(e.identifier == 'CTRL_J'){
      this.showCodePanel();
    }
  }
  goog.events.listen(shortcutHandler, goog.ui.KeyboardShortcutHandler.EventType.SHORTCUT_TRIGGERED, onKeyPress, null, this);
}

// ************************************** tracing elements ****************************************** //
bay.whiteboard.Whiteboard.prototype.TraceAll = function(){
  var list = this.collections.main.getElements();
  for(var i = 0; i < list.length; i++){
    if(list[i] && list[i].trace && list[i].exists){
      if (list[i].getTrace){
        var tracer = list[i].getTrace();
        tracer.exists = true;
        this.collections.tracer.add(tracer);
      }
    }
  }
}

// ******************************* toolbar buttons ***********************************//
bay.whiteboard.Whiteboard.prototype.addButtons = function(){
  var board = this;
  // axiliary function to create buttons
  var createButton = function(className, tool, toolBox){
    var size = goog.style.getSize(board.elements.toolbarElement);
    var button = new goog.ui.Button();
    // add button to main tool bar or to small tool box
    if (toolBox)
      button.render(toolBox);
    else
      button.render(board.elements.toolbarElement);
    goog.style.setSize(button.getElement(), size.width - 4, size.width - 4);
    goog.dom.classes.add(button.getElement(), 'bwb_toolbarButton ' + className);
    if (tool){
      goog.events.listen(button, goog.ui.Component.EventType.ACTION, function(e){ this.buttonAction(tool, e)}, null, board);
      if (tool.desc){
        var tooltip = new goog.ui.Tooltip(button.getElement(), tool.desc);
      }
    }
    return button;
  }

  var sortOrder = function(a, b){
    var aOrd = a.order;
    if(!aOrd) aOrd = 0;
    var bOrd = b.order;
    if(!bOrd) bOrd = 0;
    return aOrd - bOrd;
  }
  // create buttons and tool boxes for group of tools
  board.tool.groups.sort(sortOrder);
  for(var i = 0; i < board.tool.groups.length; i++){
    var group = board.tool.groups[i];
    if (!group.hidden){
      group.button = createButton(group.id, group);
      // new tool box
      group.toolBox = goog.dom.createDom('div', 'bwb_toolbox', ' ');
      goog.dom.appendChild(this.container, group.toolBox);
      goog.style.showElement(group.toolBox, false);
    }
  }
  // create buttons for tools
  board.tool.tools.sort(sortOrder);
  for(var i = 0; i < board.tool.tools.length; i++){
    tool = board.tool.tools[i];
    if (!tool.hidden){
      // add button
      if (tool.group == null){
        createButton(tool.id, tool);
      }else{
        for(var g = 0; g < board.tool.groups.length; g++){
          if (board.tool.groups[g].id == tool.group && !board.tool.groups[g].hidden) {
            createButton(tool.id, tool, board.tool.groups[g].toolBox);
          }
        }
      }
    }
  }
}
bay.whiteboard.Whiteboard.prototype.buttonAction = function(tool, e){
  if (tool.action){
    if (this.tool.current && this.tool.current.toggleOff){
      this.tool.current.toggleOff(this);
      this.tool.current = null;
    }
    // if action runs immediate action call it
    tool.action(this, e);
  }else{
    var notCurrent = (this.tool.current != tool);
    // else toggle the current state of board
    if (this.tool.current && this.tool.current.toggleOff){
      this.tool.current.toggleOff(this);
    }
    if (notCurrent){
      this.tool.current = tool;
      if (tool.toggleOn){
        tool.toggleOn(this);
      }
    }else{
      this.tool.current = null;
    }
  }
}
bay.whiteboard.Whiteboard.prototype.clearCurrentTool = function(cursorStyle, currentProp){
  goog.dom.classes.remove(this.elements.drawElement, cursorStyle);
  this.tool.current[currentProp] = {};
  this.tool.current = null;
  this.collections.current.clear();
  this.redrawAll();
}
bay.whiteboard.Whiteboard.prototype.hideToolBox = function(group){
  if (this.tool.current==group){
    this.tool.current=null;
  }
  goog.style.showElement(group.toolBox, false);
}

bay.whiteboard.Whiteboard.prototype.showToolBox = function(group){
  var position = goog.style.getPageOffset(group.button.getElement());
  var size = goog.style.getSize(group.button.getElement());
  position.x += size.width;
  goog.style.setPosition(group.toolBox, position);
  goog.style.showElement(group.toolBox, true);
}
bay.whiteboard.Whiteboard.prototype.toggleCoordinate = function(value){
  if (typeof value != 'undefined')
    this.area.showCoordinates = value;
  else
    this.area.showCoordinates = !this.area.showCoordinates;
  this.redrawAll();
}
// *********************************** info Dialog *********************************************//
bay.whiteboard.Whiteboard.prototype.showInfoDialog = function(e){
  var minDist = this.getHoverDist();
  var list = this.collections.main.getNeighbourList(this.getConvertEventPos(e), minDist, true, true);
  if(list.length > 0){
    this.showInfo(e.clientX, e.clientY, list, 0);
  }else{
    if (this.elements.infoDialog){
      this.elements.infoDialog.dispose();
      this.elements.infoDialog = null;
    }
  }
  e.preventDefault();
}

bay.whiteboard.Whiteboard.prototype.showInfo = function(x, y, list, current){
  // recreate dialog
  if(this.elements.infoDialog){
    this.elements.infoDialog.dispose();
    this.elements.infoDialog = null;
  }
  var infoDialog = new goog.ui.Component();
  infoDialog.render(document.body);
  goog.dom.classes.add(infoDialog.getElement(), 'bwb_infoDialog');
  this.elements.infoDialog = infoDialog;
  goog.style.setPosition(infoDialog.getElement(), x, y);
  // add navigate buttons if number of elements more then one
  if (list.length > 1){
    var leftButton = new goog.ui.Button('<');
    infoDialog.addChild(leftButton, true);
    leftButton.setTooltip(goog.getMsg('Click to select other element'));
    goog.events.listen(leftButton, goog.ui.Component.EventType.ACTION, function(){this.showInfo(x, y, list, current-1);}, null, this);
    goog.dom.classes.add(leftButton.getElement(), 'bwb_navigate bwb_left');
    var rightButton = new goog.ui.Button('>');
    rightButton.setTooltip(goog.getMsg('Click to select other element'));
    infoDialog.addChild(rightButton, true);
    goog.events.listen(rightButton, goog.ui.Component.EventType.ACTION, function(){this.showInfo(x, y, list, current+1);}, null, this);
    goog.dom.classes.add(rightButton.getElement(), 'bwb_navigate bwb_right');
  }
  // build descriptor for the current element
  if(current < 0) current = list.length - 1;
  if(current >= list.length) current = 0;
  element = list[current].element;
  // text with elements decription
  var desc = new goog.ui.Control(element.toString());
  infoDialog.addChild(desc, true);
  goog.dom.classes.add(desc.getElement(), 'bwb_objDesc');
  // input to set label for points
  if (!element.noLabel){
    var label = new goog.ui.BidiInput();
    infoDialog.addChild(label, true);
    label.setValue(element.label);
    goog.events.listen(label.getElement(), goog.ui.Component.EventType.BLUR, function(){element.setLabel(label.getValue());}, null, this);
    goog.dom.classes.add(label.getElement(), 'bwb_labelInput');
  }
  // button to hide element
  var hideButton = new goog.ui.Button(goog.getMsg('Hide'));
  hideButton.setTooltip(goog.getMsg('Click to hide element'));
  infoDialog.addChild(hideButton, true);
  goog.dom.classes.add(hideButton.getElement(), 'bwb_hideButton');
  goog.events.listen(hideButton, goog.ui.Component.EventType.ACTION, function(e){element.hide();this.redrawAll(); this.elements.infoDialog.dispose();this.elements.infoDialog = null;}, null, this);
  // check box to turn on trace
  var traceCb = new goog.ui.Checkbox(element.trace);
  infoDialog.addChild(traceCb, true);
  var traceCbLabel = new goog.ui.Control(goog.getMsg('Trace'));
  infoDialog.addChild(traceCbLabel, true);
  goog.dom.classes.add(traceCbLabel.getElement(), 'bwb_traceCheck');
  goog.dom.classes.add(traceCb.getElement(), 'bwb_traceCheck');
  goog.events.listen(traceCb, goog.ui.Component.EventType.CHANGE, function(e){element.setTrace(traceCb.isChecked()); this.redrawAll();}, null, this);
  // button to colorize element
  var colorButton = new goog.ui.ColorMenuButton(goog.getMsg('Color'));
  colorButton.setTooltip(goog.getMsg('Click to select color'));
  if (element.color)
    colorButton.setSelectedColor(element.color);
  else
    colorButton.setSelectedColor('#000000');
  infoDialog.addChild(colorButton, true);
  goog.dom.classes.add(colorButton.getElement(), 'bwb_colorButton');
  goog.events.listen(colorButton, goog.ui.Component.EventType.ACTION, function(e){element.setColor(colorButton.getSelectedColor());this.redrawAll();}, null, this);
  // show the descriptor
  goog.style.showElement(infoDialog.getElement(), true);
}

bay.whiteboard.Whiteboard.prototype.drawCoordinates = function(){
  var stroke = new goog.graphics.Stroke(this.properties.axes.width, this.properties.axes.color);
  var font = new goog.graphics.Font(this.properties.axes.fontsize, this.properties.axes.font);
  var fill = new goog.graphics.SolidFill(this.properties.axes.color);

  var coords = this.transform([this.area.minX, 0, this.area.maxX, 0, 0, this.area.minY, 0, this.area.maxY]);
  var xPath = new goog.graphics.Path();
  xPath.moveTo( coords[0], coords[1] );
  xPath.lineTo( coords[2], coords[3] );
  this.graphics.drawPath(xPath, stroke, null);
  var yPath = new goog.graphics.Path();
  yPath.moveTo( coords[4], coords[5] );
  yPath.lineTo( coords[6], coords[7] );
  this.graphics.drawPath(yPath, stroke, null);
  var scale = this.area.transformation.getScaleX();
  var step = 100/scale;
  var exp = 1;
  if (step < 1){
    while (step * exp < 1) exp *= 10;
  }else{
    while (step * exp > 10) exp /= 10;
  }
  step = Math.round(step * exp) / exp;
  var x = this.area.minX;
  x = Math.floor(x / step) * step;
  while (x < this.area.maxX){
    coords = this.transform([x, -step/10, x, step/10, x, 0]);
    var path = new goog.graphics.Path();
    path.moveTo( coords[0], coords[1] );
    path.lineTo( coords[2], coords[3] );
    this.graphics.drawPath(path, stroke, null);
    this.graphics.drawText(Math.round(x*10000)/10000, coords[4], coords[5], null, null, 'left', null, font, stroke, fill);
    x = x + step;
  }
  var y = this.area.minY;
  y = Math.floor(y / step) * step;
  while (y < this.area.maxY){
    coords = this.transform([-step/10, y, step/10, y, 0, y]);
    var path = new goog.graphics.Path();
    path.moveTo( coords[0], coords[1] );
    path.lineTo( coords[2], coords[3] );
    this.graphics.drawPath(path, stroke, null);
    this.graphics.drawText(Math.round(y*10000)/10000, coords[4], coords[5], null, null, 'left', null, font, stroke, fill);
    y = y + step;
  }
}

bay.whiteboard.Whiteboard.prototype.setBackground = function(url){
  var board = this;
  if(!this.background){
    this.background = {};
  }
  this.background.url = url;
  var img = new Image();
  img.onload = function() {
    var width = this.width;
    var height = this.height;
    var areaWidth = board.area.maxX - board.area.minX;
    var areaHeight = board.area.maxY - board.area.minY;
    var rX = areaWidth/width;
    var rY = areaHeight/height;
    board.background.imageWidth = width*Math.min(rX, rY);
    board.background.imageHeight = height*Math.min(rX, rY);
    board.background.imageLeft = board.area.minX + (areaWidth - board.background.imageWidth)/2;
    board.background.imageTop = board.area.maxY - (areaHeight - board.background.imageHeight)/2;
    if(board.onBackground){
      board.onBackground();
    }
    board.drawBackground();
  }
  img.src = url;
}

bay.whiteboard.Whiteboard.prototype.drawBackground = function(){
  if(this.background && this.background.url){
    var width = Math.round(this.background.imageWidth * this.area.transformation.getScaleX());
    var height = Math.round(-this.background.imageHeight * this.area.transformation.getScaleY());
    var coords = this.transform([this.background.imageLeft, this.background.imageTop]);
    var left = Math.round(coords[0]);
    var top = Math.round(coords[1]);
    goog.style.setStyle(this.elements.drawElement, {"background-image":"url(" + this.background.url + ")", "background-repeat":"no-repeat", "background-position":left+"px "+top+"px", "background-size":width+"px "+height+"px"});
  }
}


bay.whiteboard.Whiteboard.prototype.backgroundJson = function(){
  if(this.background)
    return '{"type": "Background", "url": "' + this.background.url + '", "width": ' + this.background.imageWidth + ', "height": ' + this.background.imageHeight + ', "left": ' + this.background.imageLeft + ', "top": ' + this.background.imageTop + '}';
  else
    return '';
}

bay.whiteboard.Whiteboard.prototype.acceptBackground = function(str){
  var data = eval('(' + str + ')');
  if(data.type == "Background"){
    if(!this.background){
      this.background = {};
    }
    this.background.url = data.url;
    this.background.imageWidth = data.width;
    this.background.imageHeight = data.height;
    this.background.imageLeft = data.left;
    this.background.imageTop = data.top;
    this.drawBackground();
  }
}


// *************************** Default tools for whiteboard ***************************//
bay.whiteboard.Whiteboard.addGroup("tools", 99, goog.getMsg("Common tools"));
bay.whiteboard.Whiteboard.addTool("zoom-in", "tools", { action: function(board, e) { board.zoomIn();} }, 1, goog.getMsg("Zoom in"));
bay.whiteboard.Whiteboard.addTool("zoom-out", "tools", { action: function(board, e) { board.zoomOut();} }, 2, goog.getMsg("Zoom out"));
bay.whiteboard.Whiteboard.addTool("coordinates", "tools", { action: function(board, e) { board.toggleCoordinate();} }, 3, goog.getMsg("Show coordinates"));
bay.whiteboard.Whiteboard.addTool("eraseAll", "tools", { action: function(board, e) { board.collections.main.clear();board.collections.tracer.clear(); board.redrawAll();} }, 4, goog.getMsg("Clear all"));
bay.whiteboard.Whiteboard.addTool("eraseTrace", "tools", { action: function(board, e) { board.collections.tracer.clear(); board.redrawAll();} }, 5, goog.getMsg("Clear traces"));

bay.whiteboard.Whiteboard.addTool(
  "info", null,
  {
    toggleOn: function(board) { goog.dom.classes.add(board.elements.drawElement, 'bwb_infoCursor');},
    toggleOff: function(board) {
      goog.dom.classes.remove(board.elements.drawElement, 'bwb_infoCursor');
      if (board.elements.infoDialog){
        board.elements.infoDialog.dispose();
        board.elements.infoDialog = null;
      }
    },
    onClick: function(board, e) { board.showInfoDialog(e); }
  },
  10, goog.getMsg("Show information about selected element")
);

