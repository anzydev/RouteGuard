<div align="center">

# ⚡ RouteGuard

### AI-Powered Supply Chain Disruption Simulator & Decision Engine

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-RouteGuard-7c3aed?style=for-the-badge)](https://route-guard.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Zustand](https://img.shields.io/badge/Zustand-State_Mgmt-orange?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?style=flat-square&logo=leaflet)](https://leafletjs.com)

<br>

*Simulate disruptions. Detect cascade risks. Get AI-powered decisions — in real time.*

<br>

</div>

---

## 🎬 What is RouteGuard?

RouteGuard is an interactive web application that simulates supply chain disruptions across Indian logistics corridors. It visualizes shipments on a dark-themed interactive map, calculates real-time risk scores, propagates cascade effects through a graph network, and generates AI-powered recommendations to reroute, delay, or split shipments.

### ✨ Key Highlights

- 🌐 **Cinematic splash screen** with animated wireframe globe
- 🗺️ **Dark-themed interactive map** with live truck markers and animated routes
- 🧠 **AI Decision Engine** — reroute (Dijkstra), delay, or split with confidence scores
- ⚡ **Cascade Risk Detection** — graph-based disruption propagation with iterative decay
- 🔊 **Sound effects** — Web Audio API synthesized tones (no external files)
- 📊 **Live metrics bar** — animated counters, sparkline, cost/delay impact
- 🔔 **Toast notifications** — glass-morphism slide-in alerts with severity colors
- ⚗️ **What-If sandbox mode** — experiment without affecting live state

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        PRESENTATION                           │
│  TopBar │ LeftSidebar │ MapArea │ RightPanel │ MetricsBar     │
├────────────────────────────────────────────────────────────────┤
│                      STATE (Zustand)                          │
│  SimulationStore │ ShipmentStore │ DisruptionStore │ AlertStore│
├────────────────────────────────────────────────────────────────┤
│                        ENGINES                                │
│   RiskEngine │ CascadeEngine │ DecisionEngine │ RouteOptimizer│
├────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                             │
│        Mock Shipments (8 routes) │ Graph Network (Dijkstra)   │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/anzydev/RouteGuard.git
cd RouteGuard

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🎮 How to Use

| Action | How |
|--------|-----|
| **Start simulation** | Click `▶ Start` in the top bar |
| **Adjust speed** | Click `1x` / `2x` / `5x` speed buttons |
| **Add disruption** | Right panel → Controls → "Add Weather Zone" → click map |
| **View AI decisions** | Right panel → AI Decisions tab |
| **Apply a decision** | Click `✓ Apply` on a decision card |
| **Select shipment** | Click a card in the left sidebar or a route on the map |
| **What-If mode** | Toggle "What-if" switch in the top bar |
| **Reset everything** | Click `↻ Reset` |
| **View pitch deck** | Navigate to `/deck.html` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **State** | Zustand (4 stores) |
| **Map** | React Leaflet + CartoDB Dark Tiles |
| **Design** | Material You (MD3) Dark Theme, CSS Modules |
| **Audio** | Web Audio API (synthesized tones) |
| **Globe** | Canvas 2D (wireframe animation) |
| **Font** | Inter (Google Fonts) |

---

## 🧠 AI Engines

### Risk Engine
Calculates per-shipment risk using a weighted formula:
```
Risk = (weather × 0.35) + (traffic × 0.25) + (history × 0.2) + (speed × 0.2)
```

### Cascade Engine
Propagates risk through the graph network using iterative decay:
```
NodeRisk(n+1) = ∑ connected_risks × decay_factor
```

### Decision Engine
Generates three types of recommendations:
- **🔀 Reroute** — Dijkstra shortest path avoiding high-risk nodes
- **⏱️ Delay** — Hold shipment until disruption clears
- **✂️ Split** — Divide cargo across multiple routes

---

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css          # MD3 dark theme design system
│   ├── layout.js            # Root layout with Inter font
│   └── page.js              # Dashboard + simulation loop
├── components/
│   ├── TopBar/              # Simulation controls
│   ├── LeftSidebar/         # Shipment cards
│   ├── MapArea/             # Interactive Leaflet map
│   ├── RightPanel/          # Controls, alerts, AI decisions
│   ├── MetricsBar/          # Live animated metrics
│   ├── Toast/               # Notification system
│   └── SplashScreen/        # Animated globe intro
├── engines/
│   ├── riskEngine.js        # Weighted risk calculation
│   ├── cascadeEngine.js     # Graph-based propagation
│   ├── decisionEngine.js    # AI recommendations
│   └── routeOptimizer.js    # Dijkstra path → waypoints
├── stores/
│   ├── useSimulationStore.js
│   ├── useShipmentStore.js
│   ├── useDisruptionStore.js
│   └── useAlertStore.js
├── data/
│   ├── mockShipments.js     # 8 Indian city routes
│   └── graphNodes.js        # Route network graph
└── utils/
    ├── constants.js          # Risk thresholds, defaults
    ├── geoUtils.js           # Haversine, interpolation
    ├── formatters.js         # Time, risk formatting
    └── soundEffects.js       # Web Audio API sounds
```

---

## 📜 License

MIT

---

<div align="center">
<br>

**Built with ❤️ for the hackathon**

⚡ RouteGuard — Protecting every mile of your supply chain.

</div>
