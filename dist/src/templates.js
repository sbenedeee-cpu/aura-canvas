/* ==========================================================================
   Aura Canvas — Templates Dataset
   ========================================================================== */

export const PRESET_TEMPLATES = {
  'product-roadmap': {
    title: 'Startup Launch Strategy & Roadmap',
    nodes: [
      {
        id: 'node-1',
        type: 'note',
        title: 'Core Vision & Value Prop',
        content: 'Transform disconnected notes into a unified visual knowledge graph.\nTarget Users: Founders, Product Designers, Software Engineers.',
        x: 100,
        y: 120,
        width: 280,
        height: 160,
        color: 'purple',
        status: 'Done',
        tags: ['#strategy', '#vision']
      },
      {
        id: 'node-2',
        type: 'task',
        title: 'V1 Feature Launch Checklist',
        content: '',
        tasks: [
          { text: 'Infinite spatial canvas with 60fps pan/zoom', completed: true },
          { text: 'SVG curved node connection handles', completed: true },
          { text: 'Resizable group boundary frames', completed: true },
          { text: 'Multi-view: Canvas, Kanban & Outline', completed: false },
          { text: 'Command Palette (Ctrl+K)', completed: false }
        ],
        x: 450,
        y: 120,
        width: 320,
        height: 220,
        color: 'cyan',
        status: 'In Progress',
        tags: ['#tasks', '#engineering']
      },
      {
        id: 'node-3',
        type: 'code',
        title: 'Canvas Pan/Zoom Math',
        content: 'const screenToWorld = (screenX, screenY) => {\n  return {\n    x: (screenX - panX) / scale,\n    y: (screenY - panY) / scale\n  };\n};',
        x: 820,
        y: 120,
        width: 320,
        height: 180,
        color: 'emerald',
        status: 'Done',
        tags: ['#code', '#canvas']
      },
      {
        id: 'node-4',
        type: 'image',
        title: 'Aura Glassmorphic UI Concept',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        content: 'Vibrant neon purple and cyan accents on deep glass background.',
        x: 100,
        y: 350,
        width: 280,
        height: 230,
        color: 'pink',
        status: 'Ideas',
        tags: ['#design', '#ui']
      },
      {
        id: 'node-5',
        type: 'link',
        title: 'Vite & Vanilla Web Spec',
        url: 'https://vitejs.dev/',
        content: 'Fast development server with ES modules HMR.',
        x: 450,
        y: 380,
        width: 300,
        height: 140,
        color: 'amber',
        status: 'Done',
        tags: ['#resource', '#docs']
      }
    ],
    frames: [
      {
        id: 'frame-1',
        title: 'PHASE 1: Core Foundation & Architecture',
        x: 60,
        y: 50,
        width: 1120,
        height: 560
      }
    ],
    connections: [
      { id: 'conn-1', fromNodeId: 'node-1', fromHandle: 'right', toNodeId: 'node-2', toHandle: 'left', label: 'drives requirements' },
      { id: 'conn-2', fromNodeId: 'node-2', fromHandle: 'right', toNodeId: 'node-3', toHandle: 'left', label: 'implements' },
      { id: 'conn-3', fromNodeId: 'node-1', fromHandle: 'bottom', toNodeId: 'node-4', toHandle: 'top', label: 'inspires visual style' },
      { id: 'conn-4', fromNodeId: 'node-2', fromHandle: 'bottom', toNodeId: 'node-5', toHandle: 'top', label: 'built on' }
    ]
  },

  'system-architecture': {
    title: 'Distributed System Architecture Graph',
    nodes: [
      {
        id: 'sys-1',
        type: 'note',
        title: 'Client Web Application',
        content: 'Aura Canvas Frontend SPA built with custom Canvas Engine and WebSocket real-time sync listeners.',
        x: 80,
        y: 150,
        width: 280,
        height: 140,
        color: 'cyan',
        status: 'Done',
        tags: ['#frontend', '#client']
      },
      {
        id: 'sys-2',
        type: 'note',
        title: 'API Gateway & Load Balancer',
        content: 'Nginx + Node.js Proxy routing REST requests and upgrading WebSocket channels.',
        x: 430,
        y: 150,
        width: 260,
        height: 140,
        color: 'purple',
        status: 'In Progress',
        tags: ['#gateway', '#backend']
      },
      {
        id: 'sys-3',
        type: 'code',
        title: 'WebSocket Connection Handler',
        content: 'wss.on("connection", (socket) => {\n  socket.on("node:move", (delta) => {\n    broadcastToRoom(delta);\n  });\n});',
        x: 750,
        y: 120,
        width: 320,
        height: 170,
        color: 'emerald',
        status: 'In Progress',
        tags: ['#websocket', '#realtime']
      },
      {
        id: 'sys-4',
        type: 'note',
        title: 'PostgreSQL Knowledge Graph DB',
        content: 'Stores nodes table, connections table, and spatial JSON metadata.',
        x: 430,
        y: 360,
        width: 260,
        height: 140,
        color: 'amber',
        status: 'To Do',
        tags: ['#database', '#sql']
      }
    ],
    frames: [
      {
        id: 'sys-frame-1',
        title: 'Cloud Infrastructure Boundary',
        x: 390,
        y: 70,
        width: 720,
        height: 470
      }
    ],
    connections: [
      { id: 'c1', fromNodeId: 'sys-1', fromHandle: 'right', toNodeId: 'sys-2', toHandle: 'left', label: 'HTTPS / WSS' },
      { id: 'c2', fromNodeId: 'sys-2', fromHandle: 'right', toNodeId: 'sys-3', toHandle: 'left', label: 'socket bridge' },
      { id: 'c3', fromNodeId: 'sys-2', fromHandle: 'bottom', toNodeId: 'sys-4', toHandle: 'top', label: 'reads / writes' }
    ]
  },

  'creative-brainstorm': {
    title: 'Creative UX Moodboard & Brainstorm',
    nodes: [
      {
        id: 'cb-1',
        type: 'note',
        title: 'User Emotion Goal',
        content: 'Make the workspace feel alive, fluid, and effortless. "Like floating through thoughts in space."',
        x: 120,
        y: 100,
        width: 260,
        height: 150,
        color: 'pink',
        status: 'Ideas',
        tags: ['#ux', '#emotion']
      },
      {
        id: 'cb-2',
        type: 'image',
        title: 'Cyberpunk Neon Palette',
        imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
        content: 'Dark background with vibrant glowing node indicators.',
        x: 430,
        y: 100,
        width: 290,
        height: 230,
        color: 'purple',
        status: 'Done',
        tags: ['#moodboard', '#colors']
      },
      {
        id: 'cb-3',
        type: 'task',
        title: 'Micro-Interactions List',
        content: '',
        tasks: [
          { text: 'Hover glow on connection handles', completed: true },
          { text: 'Smooth deceleration pan inertial scroll', completed: false },
          { text: 'Animated dotted lines on active connections', completed: true }
        ],
        x: 760,
        y: 100,
        width: 300,
        height: 190,
        color: 'cyan',
        status: 'In Progress',
        tags: ['#animation', '#polish']
      }
    ],
    frames: [
      {
        id: 'cb-frame-1',
        title: 'Visual Design Inspirations',
        x: 80,
        y: 50,
        width: 1020,
        height: 420
      }
    ],
    connections: [
      { id: 'cbc-1', fromNodeId: 'cb-1', fromHandle: 'right', toNodeId: 'cb-2', toHandle: 'left', label: 'defines color theme' },
      { id: 'cbc-2', fromNodeId: 'cb-2', fromHandle: 'right', toNodeId: 'cb-3', toHandle: 'left', label: 'drives animations' }
    ]
  }
};
