/* ==========================================================================
   Aura Canvas — Multi-View System (Kanban & Outline List)
   ========================================================================== */

export class ViewSystem {
  constructor(nodeManager) {
    this.nodeManager = nodeManager;
    this.currentView = 'canvas';

    this.nodeManager.onChange(() => {
      if (this.currentView === 'kanban') this.renderKanban();
      if (this.currentView === 'list') this.renderList();
    });
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Toggle active view containers
    document.querySelectorAll('.view-container').forEach(c => c.classList.remove('active-view'));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add('active-view');

    // Toggle header button active status
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    if (viewName === 'kanban') this.renderKanban();
    if (viewName === 'list') this.renderList();
  }

  // ------------------------------------------------------------------------
  // Render Kanban Board View
  // ------------------------------------------------------------------------
  renderKanban() {
    const container = document.getElementById('kanban-columns-container');
    if (!container) return;

    const columns = ['Ideas', 'To Do', 'In Progress', 'Done'];
    container.innerHTML = '';

    columns.forEach(status => {
      const colEl = document.createElement('div');
      colEl.className = 'kanban-column';
      
      const nodesInCol = this.nodeManager.nodes.filter(n => (n.status || 'To Do') === status);

      colEl.innerHTML = `
        <div class="column-header">
          <span>${status}</span>
          <span style="font-size: 0.8rem; opacity: 0.6;">${nodesInCol.length}</span>
        </div>
        <div class="column-cards-list" data-status="${status}">
          ${nodesInCol.map(n => `
            <div class="kanban-card" data-id="${n.id}">
              <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 6px;">${n.title}</div>
              <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">${n.content ? n.content.substring(0, 80) + '...' : ''}</div>
              <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                <span style="color: var(--color-accent);">${n.type}</span>
                <select class="kanban-status-select" data-id="${n.id}">
                  ${columns.map(c => `<option value="${c}" ${c === status ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Listen to status select changes
      colEl.querySelectorAll('.kanban-status-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          this.nodeManager.updateNode(e.target.dataset.id, { status: e.target.value });
        });
      });

      container.appendChild(colEl);
    });
  }

  // ------------------------------------------------------------------------
  // Render Outline List View
  // ------------------------------------------------------------------------
  renderList() {
    const container = document.getElementById('list-content-container');
    const statsEl = document.getElementById('list-stats-counter');
    if (!container) return;

    if (statsEl) {
      statsEl.textContent = `${this.nodeManager.nodes.length} Nodes, ${this.nodeManager.connections.length} Connections, ${this.nodeManager.frames.length} Groups`;
    }

    container.innerHTML = '';

    if (this.nodeManager.nodes.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-subtle); padding: 40px;">No nodes in workspace yet. Add nodes in Canvas mode!</div>`;
      return;
    }

    this.nodeManager.nodes.forEach(n => {
      const row = document.createElement('div');
      row.className = 'list-node-row';

      // Find connections linked to this node
      const linkedConns = this.nodeManager.connections.filter(c => c.fromNodeId === n.id || c.toNodeId === n.id);

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--color-${n.color || 'purple'});"></div>
          <div>
            <div style="font-weight: 700; font-size: 1rem;">${n.title}</div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">${n.type} • Status: ${n.status || 'To Do'}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 0.8rem; color: var(--color-primary-glow); background: rgba(99,102,241,0.1); padding: 3px 10px; border-radius: 12px;">
            <i class="ri-git-commit-line"></i> ${linkedConns.length} links
          </span>
          <button class="icon-btn btn-delete-list-node" data-id="${n.id}" title="Delete Node"><i class="ri-delete-bin-line"></i></button>
        </div>
      `;

      row.querySelector('.btn-delete-list-node').addEventListener('click', () => {
        this.nodeManager.deleteNode(n.id);
      });

      container.appendChild(row);
    });
  }
}
