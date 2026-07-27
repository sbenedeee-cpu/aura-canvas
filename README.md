# 🎨 Aura Canvas

> **Infinite Visual Workspace** — Think, organize, and create through connected ideas.

Aura Canvas is a powerful infinite canvas application that combines the freedom of a whiteboard with the structure of a knowledge graph. Brainstorm, map relationships, plan projects, collect research, and collaborate visually — all in one beautiful, distraction-free interface.

---

## ✨ Features

- **🖼️ Infinite Canvas** — Smooth 60fps pan & zoom with fluid navigation
- **🔗 Visual Connections** — Bezier curved connections with animated flows and arrowheads
- **🗂️ Multiple Node Types** — Text notes, task checklists, code blocks, image cards, link bookmarks
- **📦 Group Frames** — Organize related nodes into labeled container frames
- **🗺️ Mini-Map** — Radar navigator for orientation on the infinite canvas
- **🤖 AI Brainstorming Agent** — Built-in heuristic agent that generates mind maps, expands ideas, and auto-connects nodes
- **📋 Multi-View System** — Switch between Canvas, Kanban Board, and Outline List views
- **🎨 Starter Templates** — Startup Launch Roadmap, System Architecture, Creative UX Brainstorm
- **⌨️ Command Palette** — Keyboard-driven workflow (`Ctrl+K`)
- **💾 Auto-Save** — LocalStorage persistence with JSON import/export
- **📸 PNG Export** — Screenshot your canvas

---

## 🚀 Quick Start

### Option 1 — Open directly in browser (no build needed)

```bash
# Python static server
python -m http.server 8000
# Then open http://localhost:8000
```

### Option 2 — Deploy to Vercel

```bash
npx vercel --prod
```

### Option 3 — Deploy to Netlify

```bash
npx netlify deploy --dir=dist --prod
```

---

## 📁 Project Structure

```
aura-canvas/
├── index.html          # Main SPA entry point
├── style.css           # Glassmorphic dark design system
├── src/
│   ├── app.js          # Application coordinator & event listeners
│   ├── canvas.js       # 60fps pan/zoom infinite canvas engine
│   ├── nodeManager.js  # Node CRUD, undo/redo state history
│   ├── views.js        # Multi-view system (Kanban, Outline)
│   ├── templates.js    # Starter template datasets
│   └── agent.js        # AI Brainstorming Agent
└── dist/               # Production-ready build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Command Palette |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Delete` | Delete selected node |
| `Escape` | Deselect / Close modal |
| Scroll | Zoom in/out |
| Middle drag | Pan canvas |

---

## 🤖 AI Brainstorming Agent

The built-in agent requires no external API keys — it runs entirely in-browser using intelligent heuristics:

- **Mind Map Generator** — Creates a root node + 4 branches + group frame from any topic
- **Idea Expander** — Generates 4 connected sub-ideas around any selected node
- **Note → Checklist** — Converts text notes into actionable task checklists
- **Auto-Connect** — Finds unconnected orphan nodes and links them intelligently

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

Built with ❤️ using vanilla HTML, CSS & JavaScript — no framework dependencies.
