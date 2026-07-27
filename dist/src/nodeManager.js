/* ==========================================================================
   Aura Canvas — Node & State Manager
   ========================================================================== */

export class NodeManager {
  constructor(initialData = null) {
    this.nodes = [];
    this.frames = [];
    this.connections = [];
    this.history = [];
    this.historyIndex = -1;
    this.listeners = new Set();

    if (initialData) {
      this.loadState(initialData, false);
    }
  }

  // Subscribe to state change events
  onChange(callback) {
    this.listeners.add(callback);
  }

  notify() {
    for (const callback of this.listeners) {
      callback();
    }
  }

  // Record undo/redo snapshot
  saveSnapshot() {
    // Truncate future history if we were in the middle of undo chain
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    const snapshot = JSON.stringify({
      nodes: this.nodes,
      frames: this.frames,
      connections: this.connections
    });

    this.history.push(snapshot);
    if (this.history.length > 50) this.history.shift(); // keep max 50 states
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const snapshot = JSON.parse(this.history[this.historyIndex]);
      this.nodes = snapshot.nodes;
      this.frames = snapshot.frames;
      this.connections = snapshot.connections;
      this.notify();
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const snapshot = JSON.parse(this.history[this.historyIndex]);
      this.nodes = snapshot.nodes;
      this.frames = snapshot.frames;
      this.connections = snapshot.connections;
      this.notify();
      return true;
    }
    return false;
  }

  // Load a complete state JSON object
  loadState(data, recordHistory = true) {
    this.nodes = data.nodes ? [...data.nodes] : [];
    this.frames = data.frames ? [...data.frames] : [];
    this.connections = data.connections ? [...data.connections] : [];
    
    if (recordHistory) {
      this.saveSnapshot();
    } else {
      this.history = [JSON.stringify({ nodes: this.nodes, frames: this.frames, connections: this.connections })];
      this.historyIndex = 0;
    }
    this.notify();
  }

  exportState() {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      nodes: this.nodes,
      frames: this.frames,
      connections: this.connections
    };
  }

  // ------------------------------------------------------------------------
  // Node Operations
  // ------------------------------------------------------------------------
  addNode(type = 'note', x = 300, y = 200, customData = {}) {
    const defaultWidths = { note: 260, task: 300, code: 320, image: 280, link: 280 };
    const defaultHeights = { note: 160, task: 220, code: 190, image: 230, link: 150 };

    const newNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      title: customData.title || `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: customData.content || (type === 'note' ? 'Click to edit note details...' : ''),
      x,
      y,
      width: customData.width || defaultWidths[type] || 260,
      height: customData.height || defaultHeights[type] || 160,
      color: customData.color || 'purple',
      status: customData.status || 'To Do',
      tags: customData.tags || ['#new'],
      tasks: type === 'task' ? (customData.tasks || [
        { text: 'First task item', completed: false },
        { text: 'Second task item', completed: true }
      ]) : undefined,
      imageUrl: type === 'image' ? (customData.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80') : undefined,
      url: type === 'link' ? (customData.url || 'https://github.com') : undefined
    };

    this.nodes.push(newNode);
    this.saveSnapshot();
    this.notify();
    return newNode;
  }

  updateNode(id, updates) {
    const node = this.nodes.find(n => n.id === id);
    if (node) {
      Object.assign(node, updates);
      this.notify();
    }
  }

  deleteNode(id) {
    this.nodes = this.nodes.filter(n => n.id !== id);
    // Remove associated connections
    this.connections = this.connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id);
    this.saveSnapshot();
    this.notify();
  }

  duplicateNode(id) {
    const node = this.nodes.find(n => n.id === id);
    if (node) {
      const copy = JSON.parse(JSON.stringify(node));
      copy.id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      copy.x += 40;
      copy.y += 40;
      copy.title += ' (Copy)';
      this.nodes.push(copy);
      this.saveSnapshot();
      this.notify();
      return copy;
    }
  }

  // ------------------------------------------------------------------------
  // Frame Operations
  // ------------------------------------------------------------------------
  addFrame(x = 100, y = 100, width = 600, height = 400, title = 'New Group Frame') {
    const newFrame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      x,
      y,
      width,
      height
    };
    this.frames.push(newFrame);
    this.saveSnapshot();
    this.notify();
    return newFrame;
  }

  updateFrame(id, updates) {
    const frame = this.frames.find(f => f.id === id);
    if (frame) {
      Object.assign(frame, updates);
      this.notify();
    }
  }

  deleteFrame(id) {
    this.frames = this.frames.filter(f => f.id !== id);
    this.saveSnapshot();
    this.notify();
  }

  // Get nodes enclosed inside a frame
  getNodesInFrame(frameId) {
    const frame = this.frames.find(f => f.id === frameId);
    if (!frame) return [];

    return this.nodes.filter(node => {
      return (
        node.x >= frame.x &&
        node.y >= frame.y &&
        node.x + node.width <= frame.x + frame.width &&
        node.y + node.height <= frame.y + frame.height
      );
    });
  }

  // ------------------------------------------------------------------------
  // Connection Operations
  // ------------------------------------------------------------------------
  addConnection(fromNodeId, fromHandle, toNodeId, toHandle, label = '') {
    if (fromNodeId === toNodeId) return; // don't connect to self

    // Check if duplicate connection already exists
    const exists = this.connections.some(c => 
      (c.fromNodeId === fromNodeId && c.toNodeId === toNodeId) ||
      (c.fromNodeId === toNodeId && c.toNodeId === fromNodeId)
    );

    if (exists) return;

    const newConnection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      fromNodeId,
      fromHandle,
      toNodeId,
      toHandle,
      label
    };

    this.connections.push(newConnection);
    this.saveSnapshot();
    this.notify();
    return newConnection;
  }

  updateConnectionLabel(id, newLabel) {
    const conn = this.connections.find(c => c.id === id);
    if (conn) {
      conn.label = newLabel;
      this.saveSnapshot();
      this.notify();
    }
  }

  deleteConnection(id) {
    this.connections = this.connections.filter(c => c.id !== id);
    this.saveSnapshot();
    this.notify();
  }
}
