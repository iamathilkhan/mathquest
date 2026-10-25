/**
 * lib/map/pathfinding.ts
 *
 * Shortest-path graph traversal (BFS). PURE function, no I/O.
 *
 * Graph is a collection of nodes (realm ids) with coordinates and edges
 * connecting them. A node is passable if it's the start, unlocked, or not
 * locked by a guardian (use lib/game/unlock to check).
 */

export interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  waypoints: Array<{ x: number; y: number }>; // intermediate points for curved paths
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * shortestPath: BFS to find the shortest node path from `from` to `to`.
 *
 * Returns the node ids in order (including start and end), or null if unreachable.
 * A node is passable if it's the start/end or isPassable(nodeId) is true.
 *
 * Deterministic: ties are broken by node id (alphabetical).
 */
export function shortestPath(
  graph: Graph,
  from: string,
  to: string,
  isPassable: (nodeId: string) => boolean
): string[] | null {
  if (from === to) return [from];

  const start = graph.nodes.find((n) => n.id === from);
  const end = graph.nodes.find((n) => n.id === to);
  if (!start || !end) return null;

  const queue: Array<{ nodeId: string; path: string[] }> = [{ nodeId: from, path: [from] }];
  const visited = new Set<string>([from]);

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === to) return path;

    // Find all edges from this node
    const next = graph.edges
      .filter((e) => e.from === nodeId)
      .map((e) => e.to)
      .sort() // deterministic tie-break
      .filter((id) => !visited.has(id));

    for (const nextId of next) {
      // Passable if it's the destination or isPassable says so
      if (nextId === to || isPassable(nextId)) {
        visited.add(nextId);
        queue.push({ nodeId: nextId, path: [...path, nextId] });
      }
    }
  }

  return null; // unreachable
}

/**
 * findEdge: utility to get the edge object between two nodes.
 */
export function findEdge(graph: Graph, from: string, to: string): GraphEdge | null {
  return graph.edges.find((e) => e.from === from && e.to === to) ?? null;
}
