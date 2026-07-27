/* ==========================================================================
   Aura Canvas — Infinite Canvas Engine (Pan, Zoom, SVG Curves & Minimap)
   ========================================================================== */

export class CanvasEngine {
  constructor(containerEl, worldEl, svgEl, nodeManager) {
    this.container = containerEl;
    this.world = worldEl;
    this.svg = svgEl;
    this.nodeManager = nodeManager;

    // Viewport transform state
    this.panX = window.innerWidth / 2 - 400;
    this.panY = window.innerHeight / 2 - 300;
    this.scale = 1.0;

    // Active tool state ('select', 'pan', 'connect')
    this.activeTool = 'select';

    // Interaction tracking flags
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    
    this.isDraggingNode = false;
    this.draggedNodeId = null;
    this.dragOffset = { x: 0, y: 0 };

    this.isDraggingFrame = false;
    this.draggedFrameId = null;
    this.frameEnclosedNodes = [];

    this.isResizing = false;
    this.resizingTarget = null; // { type: 'node'|'frame', id, startWidth, startHeight, startMouseX, startMouseY }

    this.isConnecting = false;
    this.connectStart = null; // { nodeId, handle, x, y }

    this.isBoxSelecting = false;
    this.boxStart = { x: 0, y: 0 };
    this.selectedNodeIds = new Set();

    // Callbacks
    this.onNodeSelect = null;
    this.onContextMenu = null;

    this.initEvents();
    this.updateTransform();

    // Listen to data model changes
    this.nodeManager.onChange(() => {
      this.render();
      this.renderMinimap();
    });
  }

  setTool(toolName) {
    this.activeTool = toolName;
    this.container.classList.remove('panning', 'connecting');
    if (toolName === 'pan') this.container.classList.add('panning');
    if (toolName === 'connect') this.container.classList.add('connecting');
  }

  updateTransform() {
    this.world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    
    // Update zoom indicator UI if exists
    const zoomText = document.getElementById('zoom-percentage');
    if (zoomText) zoomText.textContent = `${Math.round(this.scale * 100)}%`;
    
    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) zoomSlider.value = this.scale;

    this.renderMinimap();
  }

  screenToWorld(screenX, screenY) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.panX) / this.scale,
      y: (screenY - rect.top - this.panY) / this.scale
    };
  }

  worldToScreen(worldX, worldY) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: worldX * this.scale + this.panX + rect.left,
      y: worldY * this.scale + this.panY + rect.top
    };
  }

  zoomTo(newScale, centerScreenX = window.innerWidth / 2, centerScreenY = window.innerHeight / 2) {
    const clampedScale = Math.min(Math.max(newScale, 0.2), 2.5);
    const worldBefore = this.screenToWorld(centerScreenX, centerScreenY);

    this.scale = clampedScale;
    
    const rect = this.container.getBoundingClientRect();
    this.panX = centerScreenX - rect.left - worldBefore.x * this.scale;
    this.panY = centerScreenY - rect.top - worldBefore.y * this.scale;

    this.updateTransform();
  }

  zoomFit() {
    if (this.nodeManager.nodes.length === 0) {
      this.panX = window.innerWidth / 2 - 400;
      this.panY = window.innerHeight / 2 - 300;
      this.scale = 1.0;
      this.updateTransform();
      return;
    }

    // Compute bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodeManager.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 100;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;

    const viewportW = this.container.clientWidth;
    const viewportH = this.container.clientHeight;

    const scaleX = viewportW / contentW;
    const scaleY = viewportH / contentH;
    this.scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.panX = viewportW / 2 - centerX * this.scale;
    this.panY = viewportH / 2 - centerY * this.scale;

    this.updateTransform();
  }

  // ------------------------------------------------------------------------
  // Event Listeners Initialization
  // ------------------------------------------------------------------------
  initEvents() {
    // Wheel Zoom & Pan
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom
        const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
        this.zoomTo(this.scale * zoomDelta, e.clientX, e.clientY);
      } else {
        // Scroll pan
        this.panX -= e.deltaX;
        this.panY -= e.deltaY;
        this.updateTransform();
      }
    }, { passive: false });

    // Pointer Down (Mouse & Touch)
    this.container.addEventListener('pointerdown', (e) => {
      if (e.button === 1 || this.activeTool === 'pan' || e.spaceKey) {
        // Start Canvas Pan
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        this.container.classList.add('panning');
        return;
      }

      // Check context menu trigger
      if (e.button === 2) return;

      const target = e.target;

      // Handle Handle Connection Start
      if (target.classList.contains('connection-handle')) {
        const nodeCard = target.closest('.node-card, .frame-box');
        if (nodeCard) {
          const nodeId = nodeCard.dataset.id;
          const handle = target.dataset.handle;
          const handlePos = this.getHandleWorldPos(nodeId, handle);

          this.isConnecting = true;
          this.connectStart = { nodeId, handle, x: handlePos.x, y: handlePos.y };
          this.container.classList.add('connecting');
          return;
        }
      }

      // Handle Resizer Start
      if (target.classList.contains('resizer-handle')) {
        const card = target.closest('.node-card, .frame-box');
        if (card) {
          const isFrame = card.classList.contains('frame-box');
          const id = card.dataset.id;
          const item = isFrame ? this.nodeManager.frames.find(f => f.id === id) : this.nodeManager.nodes.find(n => n.id === id);

          this.isResizing = true;
          this.resizingTarget = {
            type: isFrame ? 'frame' : 'node',
            id,
            startW: item.width,
            startH: item.height,
            startX: e.clientX,
            startY: e.clientY
          };
          return;
        }
      }

      // Handle Node Card Drag Start
      const nodeCard = target.closest('.node-card');
      if (nodeCard && !target.closest('input, textarea, button')) {
        const id = nodeCard.dataset.id;
        const node = this.nodeManager.nodes.find(n => n.id === id);
        if (node) {
          this.isDraggingNode = true;
          this.draggedNodeId = id;
          const worldMouse = this.screenToWorld(e.clientX, e.clientY);
          this.dragOffset = { x: worldMouse.x - node.x, y: worldMouse.y - node.y };

          if (!e.shiftKey) {
            this.selectedNodeIds.clear();
          }
          this.selectedNodeIds.add(id);
          this.renderSelectionState();
          if (this.onNodeSelect) this.onNodeSelect(node);
          return;
        }
      }

      // Handle Frame Drag Start
      const frameBox = target.closest('.frame-box');
      if (frameBox && (target.closest('.frame-header') || target === frameBox)) {
        const id = frameBox.dataset.id;
        const frame = this.nodeManager.frames.find(f => f.id === id);
        if (frame) {
          this.isDraggingFrame = true;
          this.draggedFrameId = id;
          const worldMouse = this.screenToWorld(e.clientX, e.clientY);
          this.dragOffset = { x: worldMouse.x - frame.x, y: worldMouse.y - frame.y };
          
          // Get nodes currently enclosed inside this frame to move together
          this.frameEnclosedNodes = this.nodeManager.getNodesInFrame(id).map(n => ({
            id: n.id,
            offsetX: n.x - frame.x,
            offsetY: n.y - frame.y
          }));
          return;
        }
      }

      // Clicking on empty canvas -> clear selection or drag box select
      if (target === this.container || target === this.world || target.classList.contains('canvas-grid')) {
        if (!e.shiftKey) {
          this.selectedNodeIds.clear();
          this.renderSelectionState();
        }
        
        // Start Box Selection
        this.isBoxSelecting = true;
        this.boxStart = this.screenToWorld(e.clientX, e.clientY);
        const selBox = document.getElementById('selection-box');
        if (selBox) {
          selBox.style.display = 'block';
          selBox.style.left = `${this.boxStart.x}px`;
          selBox.style.top = `${this.boxStart.y}px`;
          selBox.style.width = '0px';
          selBox.style.height = '0px';
        }
      }
    });

    // Pointer Move
    window.addEventListener('pointermove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.panStart.x;
        this.panY = e.clientY - this.panStart.y;
        this.updateTransform();
        return;
      }

      if (this.isDraggingNode && this.draggedNodeId) {
        const worldMouse = this.screenToWorld(e.clientX, e.clientY);
        const newX = Math.round(worldMouse.x - this.dragOffset.x);
        const newY = Math.round(worldMouse.y - this.dragOffset.y);
        
        this.nodeManager.updateNode(this.draggedNodeId, { x: newX, y: newY });
        return;
      }

      if (this.isDraggingFrame && this.draggedFrameId) {
        const worldMouse = this.screenToWorld(e.clientX, e.clientY);
        const newFrameX = Math.round(worldMouse.x - this.dragOffset.x);
        const newFrameY = Math.round(worldMouse.y - this.dragOffset.y);

        this.nodeManager.updateFrame(this.draggedFrameId, { x: newFrameX, y: newFrameY });

        // Move enclosed nodes with frame
        this.frameEnclosedNodes.forEach(item => {
          this.nodeManager.updateNode(item.id, {
            x: newFrameX + item.offsetX,
            y: newFrameY + item.offsetY
          });
        });
        return;
      }

      if (this.isResizing && this.resizingTarget) {
        const deltaX = (e.clientX - this.resizingTarget.startX) / this.scale;
        const deltaY = (e.clientY - this.resizingTarget.startY) / this.scale;

        const newW = Math.max(180, Math.round(this.resizingTarget.startW + deltaX));
        const newH = Math.max(100, Math.round(this.resizingTarget.startH + deltaY));

        if (this.resizingTarget.type === 'node') {
          this.nodeManager.updateNode(this.resizingTarget.id, { width: newW, height: newH });
        } else {
          this.nodeManager.updateFrame(this.resizingTarget.id, { width: newW, height: newH });
        }
        return;
      }

      if (this.isConnecting && this.connectStart) {
        const currentWorld = this.screenToWorld(e.clientX, e.clientY);
        const tempLine = document.getElementById('temp-connection-line');
        if (tempLine) {
          tempLine.style.display = 'block';
          const pathD = this.calculateBezierPath(
            this.connectStart.x, this.connectStart.y, this.connectStart.handle,
            currentWorld.x, currentWorld.y, 'left'
          );
          tempLine.setAttribute('d', pathD);
        }
        return;
      }

      if (this.isBoxSelecting) {
        const currentWorld = this.screenToWorld(e.clientX, e.clientY);
        const minX = Math.min(this.boxStart.x, currentWorld.x);
        const minY = Math.min(this.boxStart.y, currentWorld.y);
        const width = Math.abs(currentWorld.x - this.boxStart.x);
        const height = Math.abs(currentWorld.y - this.boxStart.y);

        const selBox = document.getElementById('selection-box');
        if (selBox) {
          selBox.style.left = `${minX}px`;
          selBox.style.top = `${minY}px`;
          selBox.style.width = `${width}px`;
          selBox.style.height = `${height}px`;
        }

        // Highlight nodes intersecting with selection box
        this.nodeManager.nodes.forEach(n => {
          if (
            n.x < minX + width &&
            n.x + n.width > minX &&
            n.y < minY + height &&
            n.y + n.height > minY
          ) {
            this.selectedNodeIds.add(n.id);
          }
        });
        this.renderSelectionState();
        return;
      }
    });

    // Pointer Up
    window.addEventListener('pointerup', (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        if (this.activeTool !== 'pan') this.container.classList.remove('panning');
      }

      if (this.isDraggingNode || this.isDraggingFrame || this.isResizing) {
        this.isDraggingNode = false;
        this.isDraggingFrame = false;
        this.isResizing = false;
        this.resizingTarget = null;
        this.nodeManager.saveSnapshot();
      }

      if (this.isConnecting) {
        this.isConnecting = false;
        const tempLine = document.getElementById('temp-connection-line');
        if (tempLine) tempLine.style.display = 'none';

        // Check if pointer released on a connection handle
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.classList.contains('connection-handle')) {
          const targetCard = target.closest('.node-card, .frame-box');
          if (targetCard) {
            const targetNodeId = targetCard.dataset.id;
            const targetHandle = target.dataset.handle;
            if (targetNodeId !== this.connectStart.nodeId) {
              this.nodeManager.addConnection(
                this.connectStart.nodeId, this.connectStart.handle,
                targetNodeId, targetHandle, 'relates to'
              );
            }
          }
        }
        this.container.classList.remove('connecting');
      }

      if (this.isBoxSelecting) {
        this.isBoxSelecting = false;
        const selBox = document.getElementById('selection-box');
        if (selBox) selBox.style.display = 'none';
      }
    });

    // Context Menu (Right Click)
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const nodeCard = e.target.closest('.node-card');
      if (nodeCard && this.onContextMenu) {
        this.onContextMenu(e.clientX, e.clientY, nodeCard.dataset.id);
      }
    });
  }

  // ------------------------------------------------------------------------
  // Bezier Connections Math
  // ------------------------------------------------------------------------
  getHandleWorldPos(nodeId, handleName) {
    const node = this.nodeManager.nodes.find(n => n.id === nodeId) || this.nodeManager.frames.find(f => f.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    switch (handleName) {
      case 'top': return { x: node.x + node.width / 2, y: node.y };
      case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
      case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
      case 'left': return { x: node.x, y: node.y + node.height / 2 };
      default: return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    }
  }

  calculateBezierPath(x1, y1, handle1, x2, y2, handle2) {
    const offset = Math.min(Math.hypot(x2 - x1, y2 - y1) * 0.4, 150);

    let cx1 = x1, cy1 = y1, cx2 = x2, cy2 = y2;
    if (handle1 === 'right') cx1 += offset;
    if (handle1 === 'left') cx1 -= offset;
    if (handle1 === 'top') cy1 -= offset;
    if (handle1 === 'bottom') cy1 += offset;

    if (handle2 === 'right') cx2 += offset;
    if (handle2 === 'left') cx2 -= offset;
    if (handle2 === 'top') cy2 -= offset;
    if (handle2 === 'bottom') cy2 += offset;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

  // ------------------------------------------------------------------------
  // Render World Layers
  // ------------------------------------------------------------------------
  render() {
    this.renderFrames();
    this.renderNodes();
    this.renderConnections();
    this.renderSelectionState();
  }

  renderFrames() {
    const framesLayer = document.getElementById('frames-layer');
    if (!framesLayer) return;

    framesLayer.innerHTML = '';
    this.nodeManager.frames.forEach(frame => {
      const el = document.createElement('div');
      el.className = 'frame-box';
      el.dataset.id = frame.id;
      el.style.left = `${frame.x}px`;
      el.style.top = `${frame.y}px`;
      el.style.width = `${frame.width}px`;
      el.style.height = `${frame.height}px`;

      el.innerHTML = `
        <div class="frame-header">
          <i class="ri-crop-2-line"></i>
          <input type="text" class="frame-title-input" value="${frame.title}" data-id="${frame.id}">
        </div>
        <div class="resizer-handle"></div>
      `;

      // Title edit listener
      const input = el.querySelector('.frame-title-input');
      input.addEventListener('change', (e) => {
        this.nodeManager.updateFrame(frame.id, { title: e.target.value });
      });

      framesLayer.appendChild(el);
    });
  }

  renderNodes() {
    const nodesLayer = document.getElementById('nodes-layer');
    if (!nodesLayer) return;

    nodesLayer.innerHTML = '';
    this.nodeManager.nodes.forEach(node => {
      const el = document.createElement('div');
      el.className = `node-card ${this.selectedNodeIds.has(node.id) ? 'selected' : ''}`;
      el.dataset.id = node.id;
      el.dataset.color = node.color || 'purple';
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.style.width = `${node.width}px`;
      el.style.height = `${node.height}px`;

      let bodyHTML = '';
      if (node.type === 'note') {
        bodyHTML = `<textarea class="node-textarea" data-field="content" placeholder="Type notes...">${node.content || ''}</textarea>`;
      } else if (node.type === 'task') {
        const taskItems = (node.tasks || []).map((t, idx) => `
          <div class="checklist-item ${t.completed ? 'completed' : ''}">
            <input type="checkbox" data-idx="${idx}" ${t.completed ? 'checked' : ''}>
            <input type="text" data-idx="${idx}" value="${t.text}">
          </div>
        `).join('');

        bodyHTML = `
          <div class="checklist-container">
            ${taskItems}
            <button class="btn-add-item"><i class="ri-add-line"></i> Add Task Item</button>
          </div>
        `;
      } else if (node.type === 'code') {
        bodyHTML = `<textarea class="code-block-editor" data-field="content" spellcheck="false" placeholder="// Write code snippet...">${node.content || ''}</textarea>`;
      } else if (node.type === 'image') {
        bodyHTML = `
          <img src="${node.imageUrl}" class="node-image-preview" alt="Card Image">
          <input type="text" class="node-title-input" data-field="imageUrl" value="${node.imageUrl}" placeholder="Image URL...">
        `;
      } else if (node.type === 'link') {
        bodyHTML = `
          <div style="font-size: 0.85rem; color: var(--color-accent); display: flex; align-items: center; gap: 6px;">
            <i class="ri-global-line"></i> <a href="${node.url}" target="_blank" style="color: var(--color-accent); text-decoration: none;">${node.url}</a>
          </div>
          <textarea class="node-textarea" data-field="content" placeholder="Description...">${node.content || ''}</textarea>
        `;
      }

      const iconMap = { note: 'ri-sticky-note-line', task: 'ri-checkbox-line', code: 'ri-code-s-slash-line', image: 'ri-image-line', link: 'ri-link' };

      el.innerHTML = `
        <div class="connection-handle handle-top" data-handle="top" data-id="${node.id}"></div>
        <div class="connection-handle handle-right" data-handle="right" data-id="${node.id}"></div>
        <div class="connection-handle handle-bottom" data-handle="bottom" data-id="${node.id}"></div>
        <div class="connection-handle handle-left" data-handle="left" data-id="${node.id}"></div>

        <div class="node-header">
          <div class="node-type-badge">
            <i class="${iconMap[node.type] || 'ri-file-line'}"></i>
            <span>${node.type}</span>
          </div>
          <div class="node-actions">
            <button class="node-action-btn btn-duplicate-node" title="Duplicate"><i class="ri-file-copy-line"></i></button>
            <button class="node-action-btn btn-delete-node" title="Delete"><i class="ri-close-line"></i></button>
          </div>
        </div>

        <div class="node-body">
          <input type="text" class="node-title-input" data-field="title" value="${node.title}" placeholder="Title...">
          ${bodyHTML}
        </div>

        <div class="resizer-handle"></div>
      `;

      // Input Event Handlers
      el.querySelectorAll('[data-field]').forEach(input => {
        input.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          this.nodeManager.updateNode(node.id, { [field]: e.target.value });
        });
      });

      // Task List Interactivity
      if (node.type === 'task') {
        el.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(chk => {
          chk.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const tasks = [...node.tasks];
            tasks[idx].completed = e.target.checked;
            this.nodeManager.updateNode(node.id, { tasks });
          });
        });

        el.querySelectorAll('.checklist-item input[type="text"]').forEach(txt => {
          txt.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const tasks = [...node.tasks];
            tasks[idx].text = e.target.value;
            this.nodeManager.updateNode(node.id, { tasks });
          });
        });

        const btnAdd = el.querySelector('.btn-add-item');
        if (btnAdd) {
          btnAdd.addEventListener('click', () => {
            const tasks = [...(node.tasks || []), { text: 'New subtask', completed: false }];
            this.nodeManager.updateNode(node.id, { tasks });
          });
        }
      }

      // Quick actions
      el.querySelector('.btn-delete-node').addEventListener('click', () => this.nodeManager.deleteNode(node.id));
      el.querySelector('.btn-duplicate-node').addEventListener('click', () => this.nodeManager.duplicateNode(node.id));

      nodesLayer.appendChild(el);
    });
  }

  renderConnections() {
    const connGroup = document.getElementById('connections-group');
    if (!connGroup) return;

    connGroup.innerHTML = '';
    
    // Remove existing labels
    document.querySelectorAll('.connection-label').forEach(lbl => lbl.remove());

    this.nodeManager.connections.forEach(conn => {
      const pos1 = this.getHandleWorldPos(conn.fromNodeId, conn.fromHandle);
      const pos2 = this.getHandleWorldPos(conn.toNodeId, conn.toHandle);

      const pathD = this.calculateBezierPath(pos1.x, pos1.y, conn.fromHandle, pos2.x, pos2.y, conn.toHandle);

      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('class', 'connection-line dashed');
      pathEl.setAttribute('d', pathD);
      pathEl.dataset.id = conn.id;

      // Click connection to edit label or delete
      pathEl.addEventListener('click', () => {
        const newLabel = prompt('Connection Relationship Label:', conn.label || '');
        if (newLabel !== null) {
          if (newLabel.trim() === '') {
            this.nodeManager.deleteConnection(conn.id);
          } else {
            this.nodeManager.updateConnectionLabel(conn.id, newLabel.trim());
          }
        }
      });

      connGroup.appendChild(pathEl);

      // Render Midpoint Relationship Label
      if (conn.label) {
        const midX = (pos1.x + pos2.x) / 2;
        const midY = (pos1.y + pos2.y) / 2;

        const labelEl = document.createElement('div');
        labelEl.className = 'connection-label';
        labelEl.textContent = conn.label;
        labelEl.style.left = `${midX}px`;
        labelEl.style.top = `${midY}px`;
        labelEl.addEventListener('click', () => {
          const newLabel = prompt('Edit Relationship Label:', conn.label);
          if (newLabel !== null) this.nodeManager.updateConnectionLabel(conn.id, newLabel);
        });

        this.world.appendChild(labelEl);
      }
    });
  }

  renderSelectionState() {
    document.querySelectorAll('.node-card').forEach(card => {
      if (this.selectedNodeIds.has(card.dataset.id)) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  // ------------------------------------------------------------------------
  // Minimap Navigation Radar Rendering
  // ------------------------------------------------------------------------
  renderMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.nodeManager.nodes.length === 0) return;

    // Calculate bounds of world
    let minX = -1000, minY = -1000, maxX = 2000, maxY = 2000;
    this.nodeManager.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const worldW = maxX - minX;
    const worldH = maxY - minY;

    const scaleX = canvas.width / worldW;
    const scaleY = canvas.height / worldH;

    // Draw frames
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1;
    this.nodeManager.frames.forEach(f => {
      const rx = (f.x - minX) * scaleX;
      const ry = (f.y - minY) * scaleY;
      const rw = f.width * scaleX;
      const rh = f.height * scaleY;
      ctx.strokeRect(rx, ry, rw, rh);
    });

    // Draw nodes
    ctx.fillStyle = '#6366f1';
    this.nodeManager.nodes.forEach(n => {
      const nx = (n.x - minX) * scaleX;
      const ny = (n.y - minY) * scaleY;
      const nw = Math.max(4, n.width * scaleX);
      const nh = Math.max(4, n.height * scaleY);
      ctx.fillRect(nx, ny, nw, nh);
    });

    // Render Viewfinder Rectangle
    const viewfinder = document.getElementById('minimap-viewfinder');
    if (viewfinder) {
      const viewWorldTopLeft = this.screenToWorld(0, 0);
      const viewWorldBottomRight = this.screenToWorld(this.container.clientWidth, this.container.clientHeight);

      const vx = (viewWorldTopLeft.x - minX) * scaleX;
      const vy = (viewWorldTopLeft.y - minY) * scaleY;
      const vw = (viewWorldBottomRight.x - viewWorldTopLeft.x) * scaleX;
      const vh = (viewWorldBottomRight.y - viewWorldTopLeft.y) * scaleY;

      viewfinder.style.left = `${Math.max(0, vx)}px`;
      viewfinder.style.top = `${Math.max(0, vy)}px`;
      viewfinder.style.width = `${Math.min(canvas.width, vw)}px`;
      viewfinder.style.height = `${Math.min(canvas.height, vh)}px`;
    }
  }
}
