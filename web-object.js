"use strict";

var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

module.exports = WebObject;

WebObject.draggingObject = null;

function WebObject (opts, parent) {
	if (this instanceof WebObject === false) {
		return new WebObject(opts, parent);
	}
	
	EventEmitter.call(this);
	
	opts = opts || {};
	
	var self = this;
	
	self._isWebObject = true;
	self.settings = opts;
	self.className = opts.className || 'web-object';
	self.type = opts.type || 'WebObject';
	self.parent = parent;
	
	self.root = document.createElement('div');
	self.root.className = opts.className;
	
	self.objects = [];
	
	['header', 'body', 'footer'].forEach(function (part) {
		self[part] = document.createElement('div');
		self[part].className = opts.className + '-' + part;
		self.root.appendChild(self[part]);
		
		appendChild(self, self[part], self.root);
	});
	
	if (opts.draggable) {
		self.root.className += ' draggable';
		
		self.root.draggable = true;
		self.root.ondragstart = dragstart;
		self.root.dragend = dragend;
	}
	
	function dragstart (e) {
		WebObject.draggingObject = self;
	}
	
	function dragend(e) {
		WebObject.draggingObject = null;
	}
	
	if (opts.droppable) {
		self.root.ondragover = dragover;
		self.root.ondragenter = dragenter;
		self.root.ondragleave = dragleave;
		self.root.ondrop = drop
	}
	
	var dragCounter = 0;
	
	function dragover(e) {
		e.preventDefault();
	}
	
	function dragenter(e) {
		e.preventDefault();
		
		var object = WebObject.draggingObject;
		
		if (!object) {
			return;
		}
		
 		if (!dragCounter) { 
			self.emit('dragover', object);
 		}
		
		dragCounter += 1;
	}
	
	function dragleave(e) {
		e.preventDefault();
		
		var object = WebObject.draggingObject;
		
		if (!object) {
			return;
		}
		
		dragCounter -= 1;
		
		if (!dragCounter) {
			self.emit('dragleave', object);
		}
	}
	
	function drop(e) {
		e.preventDefault();
		
		dragCounter = 0;
		
		var object = WebObject.draggingObject;
		
		if (!object) {
			return;
		}
		
		self.emit('drop', object);
	}
}

inherits(WebObject, EventEmitter);

function appendChild(sourceObject, source, target) {
	if (typeof source === 'string') {
		target.innerHTML = source;
	}
	else if (typeof source === 'function') {
		target.appendChild(source(sourceObject));
	}
	else {
		target.appendChild(source);
	}
}

WebObject.prototype.add = function (opts) {
	var self = this;
	
	var object = WebObject(opts, self);
	
	self.addObject(object);
	
	return object;
};

WebObject.prototype.addObject = function (object, index) {
	var self = this;
	
	if (index) {
		self.objects.push(object);
		self.body.appendChild(object.root);
	}
	else {
		self.objects.splice(index, 0, object);
		self.body.insertBefore(object.root, self.body.children[index]);
	}
	
	self.emit('added', object);
	
	return self;
};

WebObject.prototype.removeObject = function (object) {
	var self = this;
	
	self.objects.splice(self.objects.indexOf(object), 1);
	self.body.removeChild(object.root);
	self.emit('removed', object);
	
	return self;
};

WebObject.prototype.move = function (dest) {
	var self = this;
	
	var src = self.parent;
	
	self.parent.removeObject(self);
	self.parent = destinationObject;
	destinationObject.addObject(self);
	
	self.emit('move', dest, src);
	
	return self;
};

WebObject.prototype.position = function (index) {
	var self = this;
	
	self.parent.positionObject(self, index);
	
	return self;
}

Column.prototype.positionObject = function (object, index) {
	var self = this;
	
	self.objects.splice(self.objects.indexOf(object), 1);
	self.objects.splice(index, 0, object);
	self.body.removeChild(object.root);
	self.body.insertBefore(object.root, self.body.children[index]);
	
	return self;
};

WebObject.prototype.hide = function () {
	var self = this;
	
	self.root._defaultDisplay = self.root.style.display;
	self.root.style.display = 'none';
	
	return self;
};

WebObject.prototype.show = function () {
	var self = this;
	
	self.root.style.display = self.root._defaultDisplay;
	
	return self;
};

WebObject.prototype.toggle = function () {
	var self = this;
	
	if (self.root.style.display === 'none') {
		self.show();
	}
	else {
		self.hide();
	}
	
	return self;
};

WebObject.prototype.hide = function () {
	var self = this;
	
	if (self.visible()) {
		self.root._defaultDisplay = self.root.style.display;
		self.root.style.display = 'none';
	}
	
	return self;
};

WebObject.prototype.show = function () {
	var self = this;
	
	if (!self.visible()) {
		self.root.style.display = self.root._defaultDisplay;
	}
	
	return self;
};

WebObject.prototype.toggle = function () {
	var self = this;
	
	if (!self.visible()) {
		self.show();
	}
	else {
		self.hide();
	}
	
	return self;
};

WebObject.prototype.visible = function () {
	var self = this;
	
	return self.root.style.display !== 'none';
}