"use strict";

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

module.exports = WebObject;

WebObject.draggingObject = null;
WebObject.count = 0;

function WebObject (opts, parent) {
	if (this instanceof WebObject === false) {
		return new WebObject(opts, parent);
	}
	
	EventEmitter.call(this);
	
	opts = opts || {};
	
	var self = this;

	self._isWebObject = true;
	self.settings = opts;
	self.className = opts.className || self.className|| 'web-object';
	self.type = opts.type || self.type || 'WebObject';
	self.parent = parent || self.parent;
	self.id = opts.id || self.id || (self.type + '-' + WebObject.count++);
	self.appendTo = opts.appendTo || self.appendTo || 'body';
	self.draggable = opts.draggable || self.draggable;
	self.droppable = opts.droppable || self.droppable;

	self.root = self.root || document.createElement('div');
	self.root.className = self.className;
	
	self.parts = self.parts || opts.parts || ['header', 'body', 'footer'];
	self.objects = [];
	self.index = {};
	
	self.parts.forEach(function (part) {
		if (self.hasOwnProperty(part)) {
			throw new Error('Can not use part name "' + part + '". Its use would collide with an existing object property.');
		}
		
		self[part] = document.createElement('div');
		self[part].className = self.className + '-' + part;
		self.root.appendChild(self[part]);
		
		appendChild(self, opts[part], self[part]);
	});
	
	if (self.draggable) {
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
	
	if (self.droppable) {
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
	else if (source) {
		target.appendChild(source);
	}
}

WebObject.prototype.add = function (opts) {
	var self = this;
	
	var object = (opts._isWebObject)
		? opts
		: WebObject(opts, self)
		;
	
	self.addObject(object);
	
	return object;
};

WebObject.prototype.addObject = function (object, index) {
	var self = this;

	self.index[object.id] = object;
	
	if (!index) {
		self.objects.push(object);
		self[self.appendTo].appendChild(object.root);
	}
	else {
		self.objects.splice(index, 0, object);
		self[self.appendTo].insertBefore(object.root, self[self.appendTo].children[index]);
	}
	
	self.emit('added', object);
	
	return self;
};

WebObject.prototype.removeObject = function (object) {
	var self = this;
	
	delete self.index[object.id];
	
	self.objects.splice(self.objects.indexOf(object), 1);
	self[self.appendTo].removeChild(object.root);
	self.emit('removed', object);
	
	return self;
};

WebObject.prototype.move = function (dest) {
	var self = this;
	
	var src = self.parent;
	
	self.parent.removeObject(self);
	self.parent = dest;
	dest.addObject(self);
	
	self.emit('move', dest, src);
	
	return self;
};

WebObject.prototype.position = function (index) {
	var self = this;
	
	self.parent.positionObject(self, index);
	
	return self;
}

WebObject.prototype.positionObject = function (object, index) {
	var self = this;
	
	self.objects.splice(self.objects.indexOf(object), 1);
	self.objects.splice(index, 0, object);
	self[self.appendTo].removeChild(object.root);
	self[self.appendTo].insertBefore(object.root, self[self.appendTo].children[index]);
	
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

WebObject.prototype.each = function (fn, deep) {
	var self = this;
	
	if (deep) {
		self.objects.forEach(function (obj) {
			fn(obj);
			
			obj.each(fn);
		});
	}
	else {
		self.objects.forEach(fn);
	}
	
	return self;
}

WebObject.prototype.filter = function (fn) {
	var self = this;
	
	var matches = self.objects.filter(function (object) {
		var result = fn(object, self);
		
		if (result) {
			object.show();
		}
		else {
			object.hide();
		}
		
		return result;
	});
	
	self.emit('filter', matches);
	
	return matches;
}

WebObject.prototype.sort = function (fn) {
	var self = this;
	
	self.objects.sort(fn);
	
	self.objects.forEach(function (object, i) {
		self.positionObject(object, i);
	});
	
	return self;
}

WebObject.prototype.getObjectById = function (id) {
	var self = this;

	return self.index[id];
}

WebObject.prototype.getIndex = function () {
	var self = this;

	return self.parent.getIndexOf(self);
}

WebObject.prototype.getIndexOf = function (object) {
	var self = this;

	return self.objects.indexOf(object);
}

WebObject.prototype.getObjectByIndex = function (index) {
	var self = this;

	return self.objects[index];
}

