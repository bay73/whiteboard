goog.provide('bay.whiteboard')

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
goog.require('goog.events.MouseWheelHandler');

// ******************************* constructor ***********************************//
bay.whiteboard.Create = function(){
  var whiteboard = new bay.whiteboard.Whiteboard();
  return whiteboard;
}

bay.whiteboard.Whiteboard = function(){
  this.initCollections();
  this.properties = goog.object.clone(bay.whiteboard.Whiteboard.properties);
  if (goog.userAgent.MOBILE){
    this.properties.hover.dist = this.properties.hover.dist * 5;
  }
  this.tool = {};
  this.area = {};
  this.elements = {};
}

// ********************************** register whitboard tools ********************
bay.whiteboard.Whiteboard.toolGroups = [];

bay.whiteboard.Whiteboard.tools = [];

bay.whiteboard.Whiteboard.addGroup = function(id){
  for(var i = 0; i < bay.whiteboard.Whiteboard.toolGroups.length; i++){
    if (bay.whiteboard.Whiteboard.toolGroups[i].id == id) {
      return bay.whiteboard.Whiteboard.toolGroups[i];
    }
  }
  var group = {"id": id};
  bay.whiteboard.Whiteboard.toolGroups.push(group);
  return group;
}

bay.whiteboard.Whiteboard.addTool = function(id, groupId, actions){
  if (groupId) bay.whiteboard.Whiteboard.addGroup(groupId);
  for(var i = 0; i < bay.whiteboard.Whiteboard.tools.length; i++){
    if (bay.whiteboard.Whiteboard.tools[i].id == id) {
      return bay.whiteboard.Whiteboard.tools[i];
    }
  }
  var tool = {"id": id, "group": groupId, "action": actions.action, "toggleOn": actions.toggleOn, "toggleOff": actions.toggleOff, "onClick": actions.onClick, "onMove": actions.onMove};
  bay.whiteboard.Whiteboard.tools.push(tool);
  return tool;
}

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
    width:   3,
    color:  'blue',
    dist:  10
  },
  current: {
    width:   1,
    color:    'red'
  }
}
// ******************************* renderer ***********************************//
bay.whiteboard.Whiteboard.prototype.render = function(container){
  // container could be string or dom-element
  if(typeof container === 'string')
    this.container = goog.dom.getElement(container);
  else
    this.container = container;

  // create whiteboard layout - table with two cells
  this.elements.toolbarElement = goog.dom.createDom('td', {class: 'bwb_toolbar'}, ' ');
  this.elements.drawElement = goog.dom.createDom('td', {class: 'bwb_drawarea'}, ' ');
  layout = goog.dom.createDom(
    'table',
    {class: 'bwb_layout'},
    goog.dom.createDom('tr', {class: 'bwb_layout'}, this.elements.toolbarElement, this.elements.drawElement )
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

bay.whiteboard.Whiteboard.prototype.getGraphics = function(){
  if (!this.graphics){
    if (!goog.graphics.isBrowserSupported()){
      alert("This browser doesn''t support graphics. Please use another web browser.");
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

// ********************************** utilities ***********************************
bay.whiteboard.Whiteboard.prototype.getHoverDist = function(){
  return this.properties.hover.dist / this.area.transformation.getScaleX();
}

bay.whiteboard.Whiteboard.prototype.initCollections = function(){
  this.collections = {};
  this.collections.main = new bay.whiteboard.Collection();
  this.collections.current = new bay.whiteboard.Collection();
  this.collections.tracer = new bay.whiteboard.Collection();
}

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

bay.whiteboard.Whiteboard.prototype.onSetTransformation = function(){
  this.area.reverseTransformation = this.area.transformation.createInverse();
  var coords = this.reverseTransform([0, 0, this.graphics.getCoordSize().width, this.graphics.getCoordSize().height]);
  this.area.minX = coords[0];
  this.area.minY = coords[3];
  this.area.maxX = coords[2];
  this.area.maxY = coords[1];
}

bay.whiteboard.Whiteboard.prototype.redrawAll = function(){
  var board = this;
  drawCollection = function(collection){
    var list = collection.getElements();
    for(var i=0;i<list.length;i++){
      if(list[i].draw && !list[i].hidden){
        list[i].draw(board)
      }
    }
  }
  this.graphics.clear();
  drawCollection(this.collections.tracer);
  drawCollection(this.collections.main);
  drawCollection(this.collections.current);
}

bay.whiteboard.Whiteboard.prototype.scale = function(p, n){
  var coords = this.reverseTransform(p);
  this.area.transformation = this.area.transformation.translate(coords.x, coords.y).scale(n, n).translate(-coords.x, -coords.y);
  this.onSetTransformation();
}

bay.whiteboard.Whiteboard.prototype.shift = function(p){
  this.area.transformation = this.area.transformation.preTranslate(this.graphics.getCoordSize().width * p.x, -this.graphics.getCoordSize().height * p.y);
  this.onSetTransformation();
}

bay.whiteboard.Whiteboard.prototype.markHoverElements = function(p){
  var list = this.collections.main.getElements();
  for(var i=0;i<list.length;i++){
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
  this.redrawAll();
}

bay.whiteboard.Whiteboard.prototype.zoomOut = function(){
  this.scale(new bay.whiteboard.Vector(this.graphics.getCoordSize().width/2, this.graphics.getCoordSize().height/2), 0.5);
  this.redrawAll();
}

// *********************************** codePanel *********************************************//
bay.whiteboard.Whiteboard.prototype.showCodePanel = function(){
  var dialog = new goog.ui.Dialog();
  dialog.setTitle('JSON code for drawing');
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
        if (newPoint.isExists()){
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

bay.whiteboard.Whiteboard.prototype.getEventPos = function(e){
  var pos = goog.style.getClientPosition(this.elements.drawElement);
  return new bay.whiteboard.Vector(e.clientX - pos.x, e.clientY - pos.y);
}

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
/*
      if (this.state.compassEndTmp) this.state.compassEndTmp.moveTo(this.getConvertEventPos(e));
      if (this.state.compassCenterTmp) this.state.compassCenterTmp.moveTo(this.getConvertEventPos(e));
      if (this.state.rectEndTmp) this.state.rectEndTmp.moveTo(this.getConvertEventPos(e));
*/
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
      this.redrawAll();
      e.preventDefault();
    }
    goog.events.listen(new goog.events.MouseWheelHandler(this.elements.drawElement), goog.events.MouseWheelHandler.EventType.MOUSEWHEEL, wheelHandler, null, this);
  }
}

bay.whiteboard.Whiteboard.prototype.addClickListener = function(){
  if(this.properties.events.onclick){
    var clickHandler = function(e){
      // find or add point at click position
      if (this.tool.current && this.tool.current.onClick){
        this.tool.current.onClick(this, e);
      } else {
        var point = this.pointAtEventPosition(e);
        this.redrawAll();
      }
      e.preventDefault();
    }
    goog.events.listen(this.elements.drawElement, goog.events.EventType.CLICK, clickHandler, null, this);
  }
}

bay.whiteboard.Whiteboard.prototype.addDragListener = function(){
  if(this.properties.events.ondrag){
    var dragHandler = function(e){
      if (this.dragger.point && this.dragger.point.moveTo)
        this.dragger.point.moveTo(this.getConvertEventPos(e));
        this.TraceAll();
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
        if (this.tool.current){
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
    if(list[i].trace && list[i].exists){
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
    if (tool)
      goog.events.listen(button, goog.ui.Component.EventType.ACTION, function(e){ this.buttonAction(tool, e)}, null, board);
    return button;
  }

  // create buttons and tool boxes for group of tools
  board.tool.groups = [];
  for(var i = 0; i < bay.whiteboard.Whiteboard.toolGroups.length; i++){
    var group = {"id": bay.whiteboard.Whiteboard.toolGroups[i].id};
    board.tool.groups.push( group );
    group.button = createButton(group.id, group);
    // new tool box
    group.toolBox = goog.dom.createDom('div', {class: 'bwb_toolbox'}, ' ');
    goog.dom.appendChild(this.container, group.toolBox);
    goog.style.showElement(group.toolBox, false);
    // group actions
    group.toggleOn = (function(group){return function(board){board.showToolBox(group)}})(group);
    group.toggleOff = (function(group){return function(board){board.hideToolBox(group)}})(group);
  }

  // create buttons for tools
  board.tool.tools = [];
  for(var i = 0; i < bay.whiteboard.Whiteboard.tools.length; i++){
    toolProto = bay.whiteboard.Whiteboard.tools[i];
    tool = {"id": toolProto.id};
    board.tool.tools.push(tool);
    // copy properties from toll prototype
    tool.action = toolProto.action;
    tool.toggleOn = toolProto.toggleOn;
    tool.toggleOff = toolProto.toggleOff;
    tool.onClick = toolProto.onClick;
    tool.onMove = toolProto.onMove;
    // add button
    if (toolProto.group == null){
      createButton(toolProto.id, tool);
    }else{
      for(var g = 0; g < board.tool.groups.length; g++){
        if (board.tool.groups[g].id == toolProto.group) {
          createButton(tool.id, tool, board.tool.groups[g].toolBox);
        }
      }
    }
  }
}

bay.whiteboard.Whiteboard.prototype.buttonAction = function(tool, e){
  if (tool.action){
    // if action runs immediate action call it
    tool.action(this, e);
  }else{
    // else toggle the current state of board
    if (this.tool.current && this.tool.current.toggleOff){
      this.tool.current.toggleOff(this);
    }
    if (this.tool.current != tool){
      this.tool.current = tool;
      if (tool.toggleOn){
        tool.toggleOn(this);
      }
    }else{
      this.tool.current = null;
    }
  }
}

bay.whiteboard.Whiteboard.prototype.hideToolBox = function(group){
  goog.style.showElement(group.toolBox, false);
}

bay.whiteboard.Whiteboard.prototype.showToolBox = function(group){
  var position = goog.style.getPageOffset(group.button.getElement());
  var size = goog.style.getSize(group.button.getElement());
  position.x += size.width;
  goog.style.setPosition(group.toolBox, position);
  goog.style.showElement(group.toolBox, true);
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
    leftButton.setTooltip('Click to select other element');
    goog.events.listen(leftButton, goog.ui.Component.EventType.ACTION, function(){this.showInfo(x, y, list, current-1);}, null, this);
    goog.dom.classes.add(leftButton.getElement(), 'bwb_navigate bwb_left');
    var rightButton = new goog.ui.Button('>');
    rightButton.setTooltip('Click to select other element');
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
    goog.events.listen(label.getElement(), goog.ui.Component.EventType.BLUR, function(){element.label = label.getValue();}, null, this);
    goog.dom.classes.add(label.getElement(), 'bwb_labelInput');
  }
  // button to hide element
  var hideButton = new goog.ui.Button('Hide');
  hideButton.setTooltip('Click to hide element');
  infoDialog.addChild(hideButton, true);
  goog.dom.classes.add(hideButton.getElement(), 'bwb_hideButton');
  goog.events.listen(hideButton, goog.ui.Component.EventType.ACTION, function(e){element.hide();this.redrawAll(); this.elements.infoDialog.dispose();this.elements.infoDialog = null;}, null, this);
  // check box to turn on trace
  var traceCb = new goog.ui.Checkbox(element.trace);
  infoDialog.addChild(traceCb, true);
  var traceCbLabel = new goog.ui.Control('Trace');
  infoDialog.addChild(traceCbLabel, true);
  goog.dom.classes.add(traceCbLabel.getElement(), 'bwb_traceCheck');
  goog.dom.classes.add(traceCb.getElement(), 'bwb_traceCheck');
  goog.events.listen(traceCb, goog.ui.Component.EventType.CHANGE, function(e){element.trace = traceCb.isChecked(); this.redrawAll();}, null, this);
  // button to colorize element
  var colorButton = new goog.ui.ColorMenuButton('Color');
  colorButton.setTooltip('Click to select color');
  if (element.color)
    colorButton.setSelectedColor(element.color);
  else
    colorButton.setSelectedColor('#000000');
  infoDialog.addChild(colorButton, true);
  goog.dom.classes.add(colorButton.getElement(), 'bwb_colorButton');
  goog.events.listen(colorButton, goog.ui.Component.EventType.ACTION, function(e){element.color=colorButton.getSelectedColor();this.redrawAll();}, null, this);
  // show the descriptor
  goog.style.showElement(infoDialog.getElement(), true);
}

bay.whiteboard.Whiteboard.prototype.clearCurrentTool = function(cursorStyle, currentProp){
  goog.dom.classes.remove(this.elements.drawElement, cursorStyle);
  this.tool.current[currentProp] = {};
  this.tool.current = null;
  this.collections.current.clear();
  this.redrawAll();
}

bay.whiteboard.Whiteboard.addTool("zoom-in", null, { action: function(board, e) { board.zoomIn();} });

bay.whiteboard.Whiteboard.addTool("zoom-out", null, { action: function(board, e) { board.zoomOut();} });

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
  }
);

