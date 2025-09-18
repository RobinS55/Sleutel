import React, { useEffect, useState } from "react";
import "./Board.css";

/*
  Kernregels die deze generator volgt:
  - Bord: 4 x 4 kamers
  - Elke kamer: oneven grid (zodat uitgangen exact in het midden liggen)
  - Startkamer = linksboven (0,0): alleen rechts + onder, nooit draaien
  - Andere kamers: 4 zichtbare uitgangen, maar niet elke uitgang hoeft verbonden te zijn
  - Minimaal 2 uitgangen per kamer zijn daadwerkelijk verbonden aan het pad
  - Iedere kamer is een unieke maze voor variatie
  - Startkamer is 'ontdekt'; overige kamers donker (fog) tot ontdekt (we tonen fog)
*/

const BOARD_COLS = 4;
const BOARD_ROWS = 4;

// oneven kamer afmetingen
const ROOM_W = 13; // breedte (oneven)
const ROOM_H = 7;  // hoogte (oneven)

// cell types
const WALL = 0;
const PATH = 1;
const EXIT = 2;

function createEmptyGrid(w, h) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => WALL));
}

// Randomized DFS maze carving on a grid with odd sizes yields nice corridors.
// We will carve on a grid that allows stepping by 2 to ensure corridors with walls between.
function carveMaze(grid) {
  const h = grid.length;
  const w = grid[0].length;

  // Ensure w,h are odd
  const sx = Math.floor(w / 2);
  const sy = Math.floor(h / 2);

  grid[sy][sx] = PATH;
  const stack = [[sx, sy]];

  const dirs = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];

  while (stack.length) {
    const [x, y] = stack[stack.length - 1];

    const neighbors = dirs
      .map(([dx, dy]) => [x + dx, y + dy])
      .filter(
        ([nx, ny]) =>
          nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && grid[ny][nx] === WALL
      );

    if (!neighbors.length) {
      stack.pop();
      continue;
    }

    const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
    // knock down the wall between
    const mx = (x + nx) >> 1;
    const my = (y + ny) >> 1;
    grid[my][mx] = PATH;
    grid[ny][nx] = PATH;
    stack.push([nx, ny]);
  }
}

// ensure an exit cell (edge-center) connects to some PATH tile
function ensureExitConnected(grid, ex, ey) {
  const h = grid.length;
  const w = grid[0].length;

  // if adjacent to a PATH already -> fine
  const adj = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  const isNearPath = adj.some(([dx, dy]) => {
    const nx = ex + dx;
    const ny = ey + dy;
    return nx >= 0 && ny >= 0 && nx < w && ny < h && grid[ny][nx] === PATH;
  });
  if (isNearPath) {
    grid[ey][ex] = EXIT;
    return;
  }

  // Otherwise carve a straight line toward center until we hit PATH
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  let x = ex;
  let y = ey;
  grid[y][x] = PATH;
  while (!(x === cx && y === cy) && grid[y][x] !== PATH) {
    if (x < cx) x++;
    else if (x > cx) x--;
    if (y < cy) y++;
    else if (y > cy) y--;
    grid[y][x] = PATH;
  }
  grid[ey][ex] = EXIT;
}

// ensure at least N exits are connected to the path (N = 2 minimum)
function ensureMinConnectedExits(grid, exits, minConnected = 2) {
  // mark which exits are already adjacent to PATH
  const adj = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  const connected = exits.map(([ex, ey]) => {
    const near = adj.some(([dx, dy]) => {
      const nx = ex + dx;
      const ny = ey + dy;
      return nx >= 0 && ny >= 0 && nx < grid[0].length && ny < grid.length && grid[ny][nx] === PATH;
    });
    return near;
  });

  let totalConnected = connected.filter(Boolean).length;

  // If not enough, connect random unconnected exits
  const unconnectedIndices = connected
    .map((v, i) => (!v ? i : -1))
    .filter((i) => i !== -1);

  while (totalConnected < minConnected && unconnectedIndices.length > 0) {
    const idx = unconnectedIndices.splice(Math.floor(Math.random() * unconnectedIndices.length), 1)[0];
    const [ex, ey] = exits[idx];
    ensureExitConnected(grid, ex, ey);
    totalConnected++;
  }

  // finally mark all exits as EXIT in grid (some already set)
  exits.forEach(([ex, ey]) => {
    if (grid[ey][ex] !== EXIT) grid[ey][ex] = grid[ey][ex] === PATH ? EXIT : EXIT;
  });
}

// Generate single room (row, col coordinates only used for special-casing start)
function generateRoom(row, col) {
  const grid = createEmptyGrid(ROOM_W, ROOM_H);

  // carve maze
  carveMaze(grid);

  const midX = Math.floor(ROOM_W / 2);
  const midY = Math.floor(ROOM_H / 2);

  // compute exit coordinates (center of edges)
  const exits = [];

  // Special rule: first room is linksboven (row=0,col=0) -> only right + bottom
  if (row === 0 && col === 0) {
    exits.push([ROOM_W - 1, midY]); // right
    exits.push([midX, ROOM_H - 1]); // bottom
  } else {
    // all four exits visible
    exits.push([0, midY]); // left
    exits.push([ROOM_W - 1, midY]); // right
    exits.push([midX, 0]); // top
    exits.push([midX, ROOM_H - 1]); // bottom
  }

  // Ensure at least 2 exits connected to path
  ensureMinConnectedExits(grid, exits, 2);

  return {
    tiles: grid,
    exits,
    discovered: row === 0 && col === 0, // only start discovered
    color: `hsl(${Math.floor(Math.random() * 360)}, 45%, 28%)`,
    row,
    col,
  };
}

// Build the full 4x4 board (array of rooms)
function generateBoard() {
  const board = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    const brow = [];
    for (let c = 0; c < BOARD_COLS; c++) {
      brow.push(generateRoom(r, c));
    }
    board.push(brow);
  }
  return board;
}

export default function Board() {
  const [board, setBoard] = useState([]);
  // active room highlight (start at 0,0 per afspraak)
  const [active, setActive] = useState({ row: 0, col: 0 });

  useEffect(() => {
    const b = generateBoard();
    setBoard(b);
    setActive({ row: 0, col: 0 });
  }, []);

  // helper: check if cell is an exit
  function isExit(tiles, x, y) {
    return tiles[y][x] === EXIT;
  }

  if (!board.length) return <div>Loading...</div>;

  return (
    <div className="board-root">
      <h2 className="title">Sleutel</h2>
      <div className="board-grid">
        {board.map((rowRooms, r) =>
          rowRooms.map((room, c) => {
            const isActive = active.row === r && active.col === c;
            return (
              <div
                key={`${r}-${c}`}
                className={`room ${room.discovered ? "discovered" : "hidden"}`}
                style={{ borderColor: isActive ? "#fff" : "#333", background: room.discovered ? room.color : "#111" }}
              >
                {/* render tiles */}
                {room.tiles.map((rowCells, y) => (
                  <div key={y} className="room-row">
                    {rowCells.map((cell, x) => {
                      const classNames = ["cell"];
                      if (cell === WALL) classNames.push("cell-wall");
                      if (cell === PATH) classNames.push("cell-path");
                      if (cell === EXIT) classNames.push("cell-exit");
                      return <div key={x} className={classNames.join(" ")} />;
                    })}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      <div className="legend">
        <div className="legend-item"><span className="cell cell-path small"></span> pad</div>
        <div className="legend-item"><span className="cell cell-exit small"></span> uitgang</div>
        <div className="legend-item"><span className="cell cell-wall small"></span> muur</div>
      </div>
    </div>
  );
}
