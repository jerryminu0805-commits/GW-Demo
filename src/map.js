const WIDTH = 22;
const HEIGHT = 18;

function key(x, y) {
  return `${x},${y}`;
}

export class GameMap {
  constructor() {
    this.width = WIDTH;
    this.height = HEIGHT;
    this.tiles = new Map();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles.set(key(x, y), {
          type: 'normal',
          unitId: null,
        });
      }
    }
  }

  inside(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x, y) {
    if (!this.inside(x, y)) {
      return { type: 'void', unitId: null };
    }
    return this.tiles.get(key(x, y));
  }

  setType(x, y, type) {
    if (!this.inside(x, y)) return;
    const tile = this.tiles.get(key(x, y));
    tile.type = type;
  }

  placeUnit(unit) {
    for (let dy = 0; dy < unit.size.height; dy++) {
      for (let dx = 0; dx < unit.size.width; dx++) {
        const tx = unit.position.x + dx;
        const ty = unit.position.y + dy;
        const tile = this.getTile(tx, ty);
        if (tile) {
          tile.unitId = unit.id;
        }
      }
    }
  }

  removeUnit(unit) {
    for (let dy = 0; dy < unit.size.height; dy++) {
      for (let dx = 0; dx < unit.size.width; dx++) {
        const tx = unit.position.x + dx;
        const ty = unit.position.y + dy;
        const tile = this.getTile(tx, ty);
        if (tile && tile.unitId === unit.id) {
          tile.unitId = null;
        }
      }
    }
  }

  canMove(unit, x, y) {
    for (let dy = 0; dy < unit.size.height; dy++) {
      for (let dx = 0; dx < unit.size.width; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (!this.inside(tx, ty)) return false;
        const tile = this.getTile(tx, ty);
        if (tile.type !== 'normal' && tile.type !== 'haz-field') return false;
        if (tile.unitId && tile.unitId !== unit.id) return false;
      }
    }
    return true;
  }

  moveUnit(unit, x, y) {
    this.removeUnit(unit);
    unit.position.x = x;
    unit.position.y = y;
    this.placeUnit(unit);
  }

  findPath(unit, target) {
    const visited = new Set();
    const queue = [];
    const startKey = key(unit.position.x, unit.position.y);
    queue.push({ x: unit.position.x, y: unit.position.y, prev: null });
    visited.add(startKey);

    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    while (queue.length) {
      const node = queue.shift();
      if (node.x === target.x && node.y === target.y) {
        const path = [];
        let cur = node;
        while (cur.prev) {
          path.push({ x: cur.x, y: cur.y });
          cur = cur.prev;
        }
        return path.reverse();
      }
      for (const dir of dirs) {
        const nx = node.x + dir.x;
        const ny = node.y + dir.y;
        const k = key(nx, ny);
        if (visited.has(k)) continue;
        if (!this.canMove(unit, nx, ny)) continue;
        visited.add(k);
        queue.push({ x: nx, y: ny, prev: node });
      }
    }
    return [];
  }

  findPathToAny(unit, targets) {
    const targetKeys = new Set(targets.map((pos) => key(pos.x, pos.y)));
    const visited = new Set();
    const queue = [];
    const startKey = key(unit.position.x, unit.position.y);
    queue.push({ x: unit.position.x, y: unit.position.y, prev: null });
    visited.add(startKey);

    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    while (queue.length) {
      const node = queue.shift();
      const nodeKey = key(node.x, node.y);
      if (targetKeys.has(nodeKey)) {
        const path = [];
        let cur = node;
        while (cur.prev) {
          path.push({ x: cur.x, y: cur.y });
          cur = cur.prev;
        }
        return path.reverse();
      }
      for (const dir of dirs) {
        const nx = node.x + dir.x;
        const ny = node.y + dir.y;
        const k = key(nx, ny);
        if (visited.has(k)) continue;
        if (!this.canMove(unit, nx, ny)) continue;
        visited.add(k);
        queue.push({ x: nx, y: ny, prev: node });
      }
    }
    return [];
  }
}

export function createMap() {
  const map = new GameMap();

  for (let x = 14; x < 22; x++) {
    for (let y = 0; y < 10; y++) {
      map.setType(x, y, 'void');
    }
  }

  for (let x = 2; x <= 4; x++) {
    for (let y = 3; y <= 5; y++) {
      map.setType(x, y, 'cover');
    }
  }

  for (let x = 2; x <= 5; x++) {
    for (let y = 12; y <= 14; y++) {
      map.setType(x, y, 'cover');
    }
  }

  for (let x = 10; x <= 12; x++) {
    for (let y = 11; y <= 13; y++) {
      map.setType(x, y, 'cover');
    }
  }

  return map;
}
