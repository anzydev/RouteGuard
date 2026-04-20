/**
 * Graph representation of the route network for Dijkstra-based optimization.
 * Nodes = cities, Edges = routes with distance weights.
 */

// Adjacency list with distances (km, approximate)
export const routeGraph = {
  mumbai:    { pune: 150, ahmedabad: 524, nagpur: 840, indore: 590 },
  delhi:     { jaipur: 281, lucknow: 556, bhopal: 777, nagpur: 1095 },
  chennai:   { bangalore: 346, hyderabad: 627, kolkata: 1660 },
  kolkata:   { lucknow: 985, hyderabad: 1490, chennai: 1660, nagpur: 1094 },
  bangalore: { chennai: 346, hyderabad: 572, pune: 840 },
  hyderabad: { bangalore: 572, chennai: 627, nagpur: 498, mumbai: 711 },
  pune:      { mumbai: 150, bangalore: 840, hyderabad: 560, indore: 590 },
  jaipur:    { delhi: 281, ahmedabad: 660, indore: 590, mumbai: 1150 },
  ahmedabad: { mumbai: 524, jaipur: 660, indore: 400, bhopal: 570 },
  lucknow:   { delhi: 556, kolkata: 985, bhopal: 600, nagpur: 890 },
  nagpur:    { mumbai: 840, delhi: 1095, hyderabad: 498, kolkata: 1094, bhopal: 360 },
  indore:    { mumbai: 590, pune: 590, jaipur: 590, ahmedabad: 400, bhopal: 193 },
  bhopal:    { delhi: 777, ahmedabad: 570, indore: 193, nagpur: 360, lucknow: 600 },
};

/**
 * Generate an alternative route between two cities using Dijkstra,
 * avoiding specified nodes.
 */
export function findShortestPath(graph, start, end, avoidNodes = []) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();

  // Initialize
  for (const node of Object.keys(graph)) {
    distances[node] = Infinity;
    previous[node] = null;
    if (!avoidNodes.includes(node)) {
      unvisited.add(node);
    }
  }
  distances[start] = 0;

  while (unvisited.size > 0) {
    // Find node with smallest distance
    let current = null;
    let smallestDist = Infinity;
    for (const node of unvisited) {
      if (distances[node] < smallestDist) {
        smallestDist = distances[node];
        current = node;
      }
    }

    if (current === null || current === end) break;
    unvisited.delete(current);

    // Update neighbors
    const neighbors = graph[current] || {};
    for (const [neighbor, weight] of Object.entries(neighbors)) {
      if (avoidNodes.includes(neighbor)) continue;
      const alt = distances[current] + weight;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }

  // Reconstruct path
  const path = [];
  let node = end;
  while (node) {
    path.unshift(node);
    node = previous[node];
  }

  if (path[0] !== start) return { path: [], distance: Infinity };

  return { path, distance: distances[end] };
}
