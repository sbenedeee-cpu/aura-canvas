/* ==========================================================================
   Aura Canvas — Application Controller & UI Coordinator
   ========================================================================== */

import { NodeManager } from './nodeManager.js';
import { CanvasEngine } from './canvas.js';
import { ViewSystem } from './views.js';
import { PRESET_TEMPLATES } from './templates.js';
import { BrainstormingAgent } from './agent.js';

class AuraCanvasApp {
  constructor() {
    // 1. Initialize State Manager
    const savedState = localStorage.getItem('aura_canvas_workspace');
    const initialData = savedState ? JSON.parse(savedState) : PRESET_TEMPLATES['product-roadmap'];
    
    this.nodeManager = new NodeManager(initialData);

    // Auto-save state to LocalStorage
    this.nodeManager.onChange(() => {
      localStorage.setItem('aura_canvas_workspace', JSON.stringify(this.nodeManager.exportState()));
    });

    // 2. Initialize Canvas Engine
    const container = document.getElementById('canvas-viewport');
    const world = document.getElementById('canvas-world');
    const svg = document.getElementById('canvas-svg');

    this.canvasEngine = new CanvasEngine(container, world, svg, this.nodeManager);

    // 3. Initialize View System & Brainstorm Agent
    this.viewSystem = new ViewSystem(this.nodeManager);
    this.agent = new BrainstormingAgent(this.nodeManager, this.canvasEngine);

    // 4. Wire UI Controls & Shortcuts
    this.initUI();
    this.initCommandPalette();
    this.initShortcuts();

    // Initial render call
    this.canvasEngine.render();
    this.showToast('Welcome to Aura Canvas!');
  }

  showToast(message, icon = 'ri-information-line') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ------------------------------------------------------------------------
  // UI Button Bindings
  // ------------------------------------------------------------------------
  initUI() {
    // View Switcher Buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewSystem.switchView(btn.dataset.view);
      });
    });

    // Left Toolbar Tools
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.canvasEngine.setTool(btn.dataset.tool);
      });
    });

    // Add Nodes Toolbar Actions
    const worldCenter = () => this.canvasEngine.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);

    document.getElementById('add-node-note').addEventListener('click', () => {
      const pos = worldCenter();
      this.nodeManager.addNode('note', pos.x - 130, pos.y - 80);
      this.showToast('Added Note Node');
    });

    document.getElementById('add-node-task').addEventListener('click', () => {
      const pos = worldCenter();
      this.nodeManager.addNode('task', pos.x - 150, pos.y - 110);
      this.showToast('Added Checklist Node');
    });

    document.getElementById('add-node-image').addEventListener('click', () => {
      const pos = worldCenter();
      const promptUrl = prompt('Enter Image URL:', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80');
      if (promptUrl) {
        this.nodeManager.addNode('image', pos.x - 140, pos.y - 115, { imageUrl: promptUrl });
        this.showToast('Added Image Card Node');
      }
    });

    document.getElementById('add-node-link').addEventListener('click', () => {
      const pos = worldCenter();
      const url = prompt('Enter Link URL:', 'https://antigravity.google');
      if (url) {
        this.nodeManager.addNode('link', pos.x - 140, pos.y - 70, { url });
        this.showToast('Added Link Bookmark');
      }
    });

    document.getElementById('add-node-code').addEventListener('click', () => {
      const pos = worldCenter();
      this.nodeManager.addNode('code', pos.x - 160, pos.y - 95);
      this.showToast('Added Code Snippet Node');
    });

    document.getElementById('add-node-frame').addEventListener('click', () => {
      const pos = worldCenter();
      this.nodeManager.addFrame(pos.x - 250, pos.y - 180, 500, 360, 'Group Frame');
      this.showToast('Added Boundary Frame');
    });

    // Undo / Redo Buttons
    document.getElementById('btn-undo').addEventListener('click', () => {
      if (this.nodeManager.undo()) this.showToast('Undo performed');
    });
    document.getElementById('btn-redo').addEventListener('click', () => {
      if (this.nodeManager.redo()) this.showToast('Redo performed');
    });

    // Zoom Controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      this.canvasEngine.zoomTo(this.canvasEngine.scale + 0.15);
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      this.canvasEngine.zoomTo(this.canvasEngine.scale - 0.15);
    });
    document.getElementById('btn-zoom-fit').addEventListener('click', () => {
      this.canvasEngine.zoomFit();
    });
    document.getElementById('zoom-slider').addEventListener('input', (e) => {
      this.canvasEngine.zoomTo(parseFloat(e.target.value));
    });

    // Export Dropdown Menu
    const btnExportMenu = document.getElementById('btn-export-menu');
    const exportDropdown = document.getElementById('export-dropdown');
    btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDropdown.classList.toggle('show');
    });
    window.addEventListener('click', () => exportDropdown.classList.remove('show'));

    // Export JSON
    document.getElementById('btn-export-json').addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.nodeManager.exportState(), null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `aura_canvas_workspace_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      this.showToast('Exported Workspace JSON');
    });

    // Import JSON
    const fileInput = document.getElementById('input-import-file');
    document.getElementById('btn-import-json').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            this.nodeManager.loadState(data);
            this.canvasEngine.zoomFit();
            this.showToast('Workspace Imported Successfully!');
          } catch (err) {
            alert('Invalid Workspace JSON file.');
          }
        };
        reader.readAsText(file);
      }
    });

    // Export Canvas PNG Screenshot
    document.getElementById('btn-export-png').addEventListener('click', () => {
      this.exportCanvasPNG();
    });

    // Clear Canvas
    document.getElementById('btn-clear-canvas').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the entire workspace?')) {
        this.nodeManager.loadState({ nodes: [], frames: [], connections: [] });
        this.showToast('Workspace Cleared');
      }
    });

    // Templates Modal
    const modal = document.getElementById('templates-modal');
    document.getElementById('btn-templates').addEventListener('click', () => {
      modal.style.display = 'flex';
    });
    document.getElementById('btn-close-templates').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Brainstorming Agent Floating Panel
    const agentPanel = document.getElementById('agent-panel');
    const btnAgentPanel = document.getElementById('btn-agent-panel');
    const btnCloseAgent = document.getElementById('btn-close-agent');
    const topicInput = document.getElementById('agent-topic-input');

    btnAgentPanel.addEventListener('click', () => {
      const isVisible = agentPanel.style.display === 'flex';
      agentPanel.style.display = isVisible ? 'none' : 'flex';
    });
    btnCloseAgent.addEventListener('click', () => {
      agentPanel.style.display = 'none';
    });

    // Generate Mind Map Action
    const handleGenerateMap = (topic) => {
      if (!topic) return;
      this.agent.generateMindMap(topic);
      this.showToast(`Brainstorm Agent generated Mind Map for "${topic}"!`, 'ri-sparkles-line');
    };

    document.getElementById('btn-agent-generate-map').addEventListener('click', () => {
      const topic = topicInput.value.trim();
      if (topic) {
        handleGenerateMap(topic);
        topicInput.value = '';
      }
    });

    topicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const topic = topicInput.value.trim();
        if (topic) {
          handleGenerateMap(topic);
          topicInput.value = '';
        }
      }
    });

    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        handleGenerateMap(chip.dataset.topic);
      });
    });

    // Expand Selected Node
    document.getElementById('btn-agent-expand').addEventListener('click', () => {
      const selectedId = Array.from(this.canvasEngine.selectedNodeIds)[0];
      if (!selectedId) {
        alert('Please click on a node on the canvas first!');
        return;
      }
      const created = this.agent.expandNode(selectedId);
      this.showToast(`Expanded ${created.length} sub-ideas!`, 'ri-node-tree');
    });

    // Convert Note to Tasks
    document.getElementById('btn-agent-to-task').addEventListener('click', () => {
      const selectedId = Array.from(this.canvasEngine.selectedNodeIds)[0];
      if (!selectedId) {
        alert('Please click on a node card first!');
        return;
      }
      this.agent.convertNoteToTasks(selectedId);
      this.showToast('Converted Note into Checklist Tasks!', 'ri-list-check');
    });

    // Auto-Connect Nodes
    document.getElementById('btn-agent-autoconnect').addEventListener('click', () => {
      const count = this.agent.autoConnectOrphans();
      this.showToast(`Connected ${count} related nodes on canvas!`, 'ri-git-merge-line');
    });
    const inputApiKey = document.getElementById('input-api-key');
    const inputApiEndpoint = document.getElementById('input-api-endpoint');
    const selectAiModel = document.getElementById('select-ai-model');

    document.getElementById('btn-settings').addEventListener('click', () => {
      inputApiKey.value = localStorage.getItem('aura_api_key') || '';
      inputApiEndpoint.value = localStorage.getItem('aura_api_endpoint') || 'https://api.openai.com/v1';
      selectAiModel.value = localStorage.getItem('aura_ai_model') || 'gpt-4o-mini';
      settingsModal.style.display = 'flex';
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });

    document.getElementById('btn-save-settings').addEventListener('click', () => {
      const key = inputApiKey.value.trim();
      const endpoint = inputApiEndpoint.value.trim() || 'https://api.openai.com/v1';
      const model = selectAiModel.value;

      localStorage.setItem('aura_api_key', key);
      localStorage.setItem('aura_api_endpoint', endpoint);
      localStorage.setItem('aura_ai_model', model);

      settingsModal.style.display = 'none';
      this.showToast(key ? 'API Key & Settings Saved!' : 'Settings Saved');
    });

    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.template;
        if (PRESET_TEMPLATES[key]) {
          this.nodeManager.loadState(PRESET_TEMPLATES[key]);
          modal.style.display = 'none';
          this.canvasEngine.zoomFit();
          this.showToast(`Loaded Template: ${PRESET_TEMPLATES[key].title}`);
        }
      });
    });

    // Context Menu Action Listeners
    const contextMenu = document.getElementById('context-menu');
    this.canvasEngine.onContextMenu = (x, y, nodeId) => {
      contextMenu.style.display = 'block';
      contextMenu.style.left = `${x}px`;
      contextMenu.style.top = `${y}px`;
      contextMenu.dataset.nodeId = nodeId;
    };

    window.addEventListener('click', () => {
      contextMenu.style.display = 'none';
    });

    contextMenu.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nodeId = contextMenu.dataset.nodeId;
        const action = btn.dataset.action;

        if (action === 'duplicate') this.nodeManager.duplicateNode(nodeId);
        if (action === 'delete') this.nodeManager.deleteNode(nodeId);
        if (action === 'color') {
          const color = prompt('Choose node color (purple, cyan, pink, amber, emerald):', 'cyan');
          if (color) this.nodeManager.updateNode(nodeId, { color });
        }
        if (action === 'status') {
          const status = prompt('Set node status (Ideas, To Do, In Progress, Done):', 'Done');
          if (status) this.nodeManager.updateNode(nodeId, { status });
        }
      });
    });
  }

  // Export Canvas as PNG Image
  exportCanvasPNG() {
    this.showToast('Generating PNG Canvas Image...');
    const worldEl = document.getElementById('canvas-world');
    
    // Create an offscreen HTML5 Canvas
    const width = 1920;
    const height = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background fill
    ctx.fillStyle = '#0f121d';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 0; x < width; x += 30) {
      for (let y = 0; y < height; y += 30) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Draw Node Cards summary
    this.nodeManager.nodes.forEach((n, i) => {
      ctx.fillStyle = 'rgba(21, 26, 42, 0.9)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;

      const px = 100 + (i % 4) * 400;
      const py = 100 + Math.floor(i / 4) * 260;

      ctx.fillRect(px, py, 340, 200);
      ctx.strokeRect(px, py, 340, 200);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText(n.title, px + 20, py + 35);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText(`[${n.type.toUpperCase()}] Status: ${n.status || 'To Do'}`, px + 20, py + 65);
    });

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `aura_canvas_snapshot_${Date.now()}.png`;
    a.click();
  }

  // ------------------------------------------------------------------------
  // Command Palette (Ctrl+K / Cmd+K)
  // ------------------------------------------------------------------------
  initCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('command-palette-input');
    const results = document.getElementById('command-results');

    const openPalette = () => {
      modal.style.display = 'flex';
      input.value = '';
      input.focus();
      this.renderCommandResults('');
    };

    const closePalette = () => {
      modal.style.display = 'none';
    };

    input.addEventListener('input', (e) => {
      this.renderCommandResults(e.target.value.trim().toLowerCase());
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePalette();
    });

    this.openCommandPalette = openPalette;
    this.closeCommandPalette = closePalette;
  }

  renderCommandResults(query) {
    const resultsContainer = document.getElementById('command-results');
    resultsContainer.innerHTML = '';

    const actions = [
      { label: 'Add Note Node', icon: 'ri-sticky-note-line', action: () => this.nodeManager.addNode('note', 400, 300) },
      { label: 'Add Checklist Node', icon: 'ri-checkbox-line', action: () => this.nodeManager.addNode('task', 400, 300) },
      { label: 'Add Code Snippet Node', icon: 'ri-code-s-slash-line', action: () => this.nodeManager.addNode('code', 400, 300) },
      { label: 'Add Group Frame', icon: 'ri-crop-2-line', action: () => this.nodeManager.addFrame(200, 200, 500, 350) },
      { label: 'Switch to Canvas View', icon: 'ri-artboard-line', action: () => this.viewSystem.switchView('canvas') },
      { label: 'Switch to Kanban View', icon: 'ri-layout-column-line', action: () => this.viewSystem.switchView('kanban') },
      { label: 'Switch to Outline View', icon: 'ri-list-check-2', action: () => this.viewSystem.switchView('list') },
      { label: 'Zoom Fit All Nodes', icon: 'ri-aspect-ratio-line', action: () => this.canvasEngine.zoomFit() }
    ];

    // Filter nodes by title or content
    const matchedNodes = this.nodeManager.nodes.filter(n => 
      n.title.toLowerCase().includes(query) || (n.content && n.content.toLowerCase().includes(query))
    );

    const matchedActions = actions.filter(a => a.label.toLowerCase().includes(query));

    // Render Actions
    matchedActions.forEach(act => {
      const item = document.createElement('div');
      item.className = 'command-item';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="${act.icon}"></i> <span>${act.label}</span>
        </div>
        <span style="font-size: 0.75rem; opacity: 0.6;">Command</span>
      `;
      item.addEventListener('click', () => {
        act.action();
        this.closeCommandPalette();
      });
      resultsContainer.appendChild(item);
    });

    // Render Matched Nodes
    matchedNodes.forEach(n => {
      const item = document.createElement('div');
      item.className = 'command-item';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="ri-file-line"></i> <span>${n.title}</span>
        </div>
        <span style="font-size: 0.75rem; color: var(--color-accent);">${n.type}</span>
      `;
      item.addEventListener('click', () => {
        this.viewSystem.switchView('canvas');
        this.canvasEngine.zoomTo(1.0, window.innerWidth / 2, window.innerHeight / 2);
        this.canvasEngine.panX = window.innerWidth / 2 - (n.x + n.width / 2);
        this.canvasEngine.panY = window.innerHeight / 2 - (n.y + n.height / 2);
        this.canvasEngine.updateTransform();
        this.canvasEngine.selectedNodeIds.clear();
        this.canvasEngine.selectedNodeIds.add(n.id);
        this.canvasEngine.renderSelectionState();
        this.closeCommandPalette();
      });
      resultsContainer.appendChild(item);
    });
  }

  // ------------------------------------------------------------------------
  // Keyboard Shortcuts
  // ------------------------------------------------------------------------
  initShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Command Palette (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openCommandPalette();
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.nodeManager.redo();
        } else {
          this.nodeManager.undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.nodeManager.redo();
        return;
      }

      // Delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (this.canvasEngine.selectedNodeIds.size > 0) {
          this.canvasEngine.selectedNodeIds.forEach(id => this.nodeManager.deleteNode(id));
          this.canvasEngine.selectedNodeIds.clear();
          this.showToast('Deleted selected nodes');
        }
      }

      // View switching shortcuts
      if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key.toLowerCase() === 'v') this.viewSystem.switchView('canvas');
        if (e.key.toLowerCase() === 'k') this.viewSystem.switchView('kanban');
        if (e.key.toLowerCase() === 'l') this.viewSystem.switchView('list');
      }
    });
  }
}

// Bootstrap Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.auraApp = new AuraCanvasApp();
});
