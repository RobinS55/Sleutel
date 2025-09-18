// src/Board.jsx
import React, { useEffect, useState } from "react";
import "./Board.css";

/*
  Fixed generator + board:
  - 4x4 bord
  - kamers oneven afmetingen (middens)
  - startkamer = linksboven (0,0) -> alleen right + bottom en player start op (0,0)
  - elke andere kamer: 4 exits zichtbaar, minimaal 2 exits verbonden
  - variatie: DFS maze + extra lussen + optionele kleine openingen
  - speler kan alleen op PATH / EXIT lopen
  - R draait actieve kamer 180° (startkamer nooit)
*/

const COLS = 4;
const ROWS = 4;

// kamergrootte (oneven zodat middens exact zijn)
const ROOM_W = 13;
const ROOM_H = 7;

// tile types
const WALL = 0;
const PATH = 1;
const EXIT = 2;

function createEmpty(w = ROOM_W, h = ROOM_H) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => WALL));
}

/* Maze: randomized DFS on odd grid -> corridors with walls between */
function carveMaze(grid) {
  const h = grid.length;
  const w = grid[0].length;
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
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && grid[ny][nx] === WALL);

    if (!neighbors.length) {
      stack.pop();
      continue;
    }

    const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
    const mx = (x + nx) >> 1;
    const my = (y + ny) >> 1;
    grid[my][mx] = PATH;
    grid[ny][nx] = PATH;
    stack.push([nx, ny]);
  }
}

/* maak een meanderende verbindingsroute tussen twee punten (niet strikt rechtlijnig) */
function carvePathMeandering(grid, start, end) {
  let x = start.x;
  let y = start.y;
  grid[y][x] = PATH;

  // loop tot we bij end komen; kies soms horizontal dan vertical, of vice versa
  while (x !== end.x || y !== end.y) {
    const dx = end.x - x;
    const dy = end.y - y;

    // bias: als nog ver in x en y, randomize order
    if (dx !== 0 && dy !== 0) {
      if (Math.random() < 0.5) x += dx > 0 ? 1 : -1;
      else y += dy > 0 ? 1 : -1;
    } else if (dx !== 0) {
      x += dx > 0 ? 1 : -1;
    } else if (dy !== 0) {
      y += dy > 0 ? 1 : -1;
    }

    // set path
    if (x >= 0 && y >= 0 && x < ROOM_W && y < ROOM_H) grid[y][x] = PATH;
  }
}

/* voeg kleine zijpaden toe, startend vanaf bestaande PATH-cellen */
function addSidePaths(grid, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const px = Math.floor(Math.random() * ROOM_W);
    const py = Math.floor(Math.random() * ROOM_H);
    if (grid[py][px] !== PATH) continue;
    let length = 1 + Math.floor(Math.random() * 4);
    let x = px, y = py;
    for (let step = 0; step < length; step++) {
      const dir = Math.floor(Math.random() * 4);
      if (dir === 0 && x > 0) x--;
      if (dir === 1 && x < ROOM_W - 1) x++;
      if (dir === 2 && y > 0) y--;
      if (dir === 3 && y < ROOM_H - 1) y++;
      if (grid[y][x] === WALL) grid[y][x] = PATH;
    }
  }
}

/* maak enkele willekeurige lussen / openingen (verbind nabijgelegen walls) */
function addRandomLoops(grid, times = 3) {
  for (let t = 0; t < times; t++) {
    const x = 1 + Math.floor(Math.random() * (ROOM_W - 2));
    const y = 1 + Math.floor(Math.random() * (ROOM_H - 2));
    // kijk of rondom PATH is en maak zelf PATH
    if (grid[y][x] === WALL) {
      const neighPath = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => grid[ny] && grid[ny][nx] === PATH);
      if (neighPath) grid[y][x] = PATH;
    }
  }
}

/* verbind exit naar bestaand pad (zo nodig) */
function ensureExitConnected(grid, ex, ey) {
  // als al PATH/adjacent PATH -> done
  const adj = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  const nearPath = adj.some(([dx, dy]) => {
    const nx = ex + dx;
    const ny = ey + dy;
    return nx >= 0 && ny >= 0 && nx < ROOM_W && ny < ROOM_H && grid[ny][nx] === PATH;
  });
  if (nearPath) {
    grid[ey][ex] = EXIT;
    return;
  }

  // anders: carveroute van exit naar center (meanderend)
  const center = { x: Math.floor(ROOM_W / 2), y: Math.floor(ROOM_H / 2) };
  carvePathMeandering(grid, { x: ex, y: ey }, center);
  grid[ey][ex] = EXIT;
}

/* Zorg dat minimaal 'minConnected' exits verbonden zijn met PATH */
function ensureMinConnectedExits(grid, exits, minConnected = 2) {
  const adj = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  const statuses = exits.map(([ex, ey]) =>
    adj.some(([dx, dy]) => {
      const nx = ex + dx, ny = ey + dy;
      return nx >= 0 && ny >= 0 && nx < ROOM_W && ny < ROOM_H && grid[ny][nx] === PATH;
    })
  );

  let connectedCount = statuses.filter(Boolean).length;
  const unconnectedIndices = statuses.map((ok, i) => (!ok ? i : -1)).filter(i => i !== -1);

  // shuffle unconnectedIndices
  for (let i = unconnectedIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unconnectedIndices[i], unconnectedIndices[j]] = [unconnectedIndices[j], unconnectedIndices[i]];
  }

  while (connectedCount < minConnected && unconnectedIndices.length > 0) {
    const idx = unconnectedIndices.shift();
    const [ex, ey] = exits[idx];
    ensureExitConnected(grid, ex, ey);
    connectedCount++;
  }

  // mark all exits as EXIT (even if they were PATH already)
  for (const [ex, ey] of exits) grid[ey][ex] = EXIT;
}

/* rotate grid 90deg clockwise */
function rotateGrid90(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const out = createEmpty();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[x][h - 1 - y] = grid[y][x];
    }
  }
  return out;
}

/* rotate positions (x,y) 90deg clockwise around grid */
function rotatePos90([x, y], w = ROOM_W, h = ROOM_H) {
  return [h - 1 - y, x];
}

/* rotate grid n times (n in 0..3) */
function rotateGrid(grid, times) {
  let out = grid;
  for (let i = 0; i < times; i++) out = rotateGrid90(out);
  return out;
}

/* generate single room, with the rules */
function generateRoom(row, col) {
  // default grid
  const grid = createEmpty();

  // center maze carved first for variation
  carveMaze(grid);

  // compute midpoints (centers of edges)
  const midX = Math.floor(ROOM_W / 2);
  const midY = Math.floor(ROOM_H / 2);

  let exits = [];

  // start room is linksboven (row=0,col=0) -> ONLY right + bottom; and ensure specific carving from (0,0)
  if (row === 0 && col === 0) {
    // reset and craft startroom: guarantee path from (0,0) to right & bottom
    const startGrid = createEmpty();
    // ensure start tile is path
    startGrid[0][0] = PATH;
    const rightExit = [ROOM_W - 1, midY];
    const bottomExit = [midX, ROOM_H - 1];

    // carve meandering paths from start to both exits
    carvePathMeandering(startGrid, { x: 0, y: 0 }, { x: rightExit[0], y: rightExit[1] });
    carvePathMeandering(startGrid, { x: 0, y: 0 }, { x: bottomExit[0], y: bottomExit[1] });

    // add some side paths and loops for fun
    addSidePaths(startGrid, 4);
    addRandomLoops(startGrid, 4);

    // mark exits
    startGrid[rightExit[1]][rightExit[0]] = EXIT;
    startGrid[bottomExit[1]][bottomExit[0]] = EXIT;

    return {
      tiles: startGrid,
      exits: [rightExit, bottomExit], // only these two are present logically for startroom
      discovered: true,
      color: `hsl(${Math.floor(Math.random() * 360)},50%,30%)`,
      row,
      col,
      isStart: true,
    };
  }

  // For other rooms: we already carved a base maze in 'grid'
  // create exits positions (all four)
  exits = [
    [0, midY], // left
    [ROOM_W - 1, midY], // right
    [midX, 0], // top
    [midX, ROOM_H - 1], // bottom
  ];

  // ensure at least 2 exits connected to PATH
  ensureMinConnectedExits(grid, exits, 2);

  // add varied loops and side paths
  addSidePaths(grid, 3 + Math.floor(Math.random() * 3));
  addRandomLoops(grid, 2 + Math.floor(Math.random() * 3));

  // random rotation for variety (but not start room)
  const rotTimes = Math.floor(Math.random() * 4); // 0..3
  let rotatedGrid = rotateGrid(grid, rotTimes);

  // rotate exit coordinates accordingly
  let rotatedExits = exits.map((pos) => {
    let p = pos;
    for (let i = 0; i < rotTimes; i++) p = rotatePos90(p, ROOM_W, ROOM_H);
    return p;
  });

  // ensure rotated exits are marked properly as EXIT (they should already be marked but be safe)
  rotatedExits.forEach(([ex, ey]) => {
    if (rotatedGrid[ey][ex] === WALL) rotatedGrid[ey][ex] = EXIT;
    else rotatedGrid[ey][ex] = rotatedGrid[ey][ex] === PATH ? EXIT : EXIT;
  });

  return {
    tiles: rotatedGrid,
    exits: rotatedExits,
    discovered: false,
    color: `hsl(${Math.floor(Math.random() * 360)},50%,30%)`,
    row,
    col,
    isStart: false,
  };
}

/* board generator */
function generateBoard() {
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    const brow = [];
    for (let c = 0; c < COLS; c++) {
      brow.push(generateRoom(r, c));
    }
    board.push(brow);
  }
  return board;
}

/* helper: check tile walkable (PATH or EXIT) */
function walkable(tile) {
  return tile === PATH || tile === EXIT;
}

/* rotate a room 180 degrees (tiles & exits) */
function rotateRoom180(room) {
  if (room.isStart) return room; // start never rotates
  // rotate tiles 180 is two times 90
  const first = rotateGrid(room.tiles, 2);
  // rotate exits by 180
  const rotatedExits = room.exits.map(([x, y]) => [ROOM_W - 1 - x, ROOM_H - 1 - y]);
  return { ...room, tiles: first, exits: rotatedExits };
}

export default function Board() {
  const [board, setBoard] = useState([]);
  const [player, setPlayer] = useState({
    roomRow: 0,
    roomCol: 0,
    x: 0,
    y: 0,
  });
  const [active, setActive] = useState({ row: 0, col: 0 });

  useEffect(() => {
    const b = generateBoard();
    setBoard(b);
    // ensure player starts at (0,0) in top-left room and that tile is PATH (start room generation guarantees that)
    setPlayer({ roomRow: 0, roomCol: 0, x: 0, y: 0 });
    setActive({ row: 0, col: 0 });
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (board.length === 0) return;

      // rotate active room with 'R'
      if (e.key === "r" || e.key === "R") {
        setBoard((prev) => {
          const updated = prev.map((row) => row.map((c) => ({ ...c })));
          const cur = updated[active.row][active.col];
          if (cur.isStart) return prev; // don't rotate start
          const rotated = rotateRoom180(cur);
          // update player position inside room if active room is where player is
          if (player.roomRow === active.row && player.roomCol === active.col) {
            const newX = ROOM_W - 1 - player.x;
            const newY = ROOM_H - 1 - player.y;
            setPlayer((p) => ({ ...p, x: newX, y: newY }));
          }
          updated[active.row][active.col] = rotated;
          return updated;
        });
        return;
      }

      // movement
      const keyMap = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      if (!keyMap[e.key]) return;
      const [dx, dy] = keyMap[e.key];

      setPlayer((prev) => {
        const room = board[prev.roomRow][prev.roomCol];
        if (!room) return prev;
        let nx = prev.x + dx;
        let ny = prev.y + dy;
        let newRoomRow = prev.roomRow;
        let newRoomCol = prev.roomCol;

        // movement inside room
        if (nx >= 0 && nx < ROOM_W && ny >= 0 && ny < ROOM_H) {
          const tile = room.tiles[ny][nx];
          if (walkable(tile)) {
            // moved inside same room
            setActive({ row: newRoomRow, col: newRoomCol });
            // mark discovered if not yet
            if (!room.discovered) {
              setBoard((prevB) => {
                const up = prevB.map((r) => r.map((c) => ({ ...c })));
                up[newRoomRow][newRoomCol].discovered = true;
                return up;
              });
            }
            return { ...prev, x: nx, y: ny };
          }
          // not walkable -> no move
          return prev;
        }

        // trying to move out of bounds: only allow if we are on the exit tile for that side
        // compute current room's exit coords for direction
        const exits = room.exits; // array of [x,y] for that room
        // helper to find exit coords for side:
        const midX = Math.floor(ROOM_W/2);
        const midY = Math.floor(ROOM_H/2);
        const leftExit = findExitCoord(room, "left", midX, midY);
        const rightExit = findExitCoord(room, "right", midX, midY);
        const topExit = findExitCoord(room, "top", midX, midY);
        const bottomExit = findExitCoord(room, "bottom", midX, midY);

        // moving left out
        if (nx < 0 && leftExit && prev.x === leftExit[0] && prev.y === leftExit[1]) {
          // compute target room col (wrap-around)
          const targetCol = prev.roomCol > 0 ? prev.roomCol - 1 : COLS - 1;
          const targetRow = prev.roomRow;
          const targetRoom = board[targetRow][targetCol];
          const targetEnter = findExitCoord(targetRoom, "right", midX, midY);
          if (!targetEnter) return prev;
          const tx = targetEnter[0];
          const ty = targetEnter[1];
          // only allow if target tile is walkable (PATH or EXIT)
          if (walkable(targetRoom.tiles[ty][tx])) {
            // discover target
            setBoard((prevB) => {
              const up = prevB.map((r) => r.map((c) => ({ ...c })));
              up[targetRow][targetCol].discovered = true;
              return up;
            });
            setActive({ row: targetRow, col: targetCol });
            return { roomRow: targetRow, roomCol: targetCol, x: tx, y: ty };
          }
          return prev;
        }

        // moving right out
        if (nx >= ROOM_W && rightExit && prev.x === rightExit[0] && prev.y === rightExit[1]) {
          const targetCol = prev.roomCol < COLS - 1 ? prev.roomCol + 1 : 0;
          const targetRow = prev.roomRow;
          const targetRoom = board[targetRow][targetCol];
          const targetEnter = findExitCoord(targetRoom, "left", midX, midY);
          if (!targetEnter) return prev;
          const tx = targetEnter[0];
          const ty = targetEnter[1];
          if (walkable(targetRoom.tiles[ty][tx])) {
            setBoard((prevB) => {
              const up = prevB.map((r) => r.map((c) => ({ ...c })));
              up[targetRow][targetCol].discovered = true;
              return up;
            });
            setActive({ row: targetRow, col: targetCol });
            return { roomRow: targetRow, roomCol: targetCol, x: tx, y: ty };
          }
          return prev;
        }

        // moving up out
        if (ny < 0 && topExit && prev.x === topExit[0] && prev.y === topExit[1]) {
          const targetRow = prev.roomRow > 0 ? prev.roomRow - 1 : ROWS - 1;
          const targetCol = prev.roomCol;
          const targetRoom = board[targetRow][targetCol];
          const targetEnter = findExitCoord(targetRoom, "bottom", midX, midY);
          if (!targetEnter) return prev;
          const tx = targetEnter[0];
          const ty = targetEnter[1];
          if (walkable(targetRoom.tiles[ty][tx])) {
            setBoard((prevB) => {
              const up = prevB.map((r) => r.map((c) => ({ ...c })));
              up[targetRow][targetCol].discovered = true;
              return up;
            });
            setActive({ row: targetRow, col: targetCol });
            return { roomRow: targetRow, roomCol: targetCol, x: tx, y: ty };
          }
          return prev;
        }

        // moving down out
        if (ny >= ROOM_H && bottomExit && prev.x === bottomExit[0] && prev.y === bottomExit[1]) {
          const targetRow = prev.roomRow < ROWS - 1 ? prev.roomRow + 1 : 0;
          const targetCol = prev.roomCol;
          const targetRoom = board[targetRow][targetCol];
          const targetEnter = findExitCoord(targetRoom, "top", midX, midY);
          if (!targetEnter) return prev;
          const tx = targetEnter[0];
          const ty = targetEnter[1];
          if (walkable(targetRoom.tiles[ty][tx])) {
            setBoard((prevB) => {
              const up = prevB.map((r) => r.map((c) => ({ ...c })));
              up[targetRow][targetCol].discovered = true;
              return up;
            });
            setActive({ row: targetRow, col: targetCol });
            return { roomRow: targetRow, roomCol: targetCol, x: tx, y: ty };
          }
          return prev;
        }

        // otherwise blocked
        return prev;
      });
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [board, active, player]);

  if (!board.length) return <div>Loading...</div>;

  // helper to find exit coords for a named side
  function findExitCoord(room, side, midX = Math.floor(ROOM_W / 2), midY = Math.floor(ROOM_H / 2)) {
    if (!room || !room.exits) return null;
    // room.exits is array of coords for non-start or array of two coords for start
    // we find the exit that matches side by comparing coordinates
    if (side === "left") {
      return room.exits.find(([ex, ey]) => ex === 0 && ey === midY) || null;
    }
    if (side === "right") {
      return room.exits.find(([ex, ey]) => ex === ROOM_W - 1 && ey === midY) || null;
    }
    if (side === "top") {
      return room.exits.find(([ex, ey]) => ex === midX && ey === 0) || null;
    }
    if (side === "bottom") {
      return room.exits.find(([ex, ey]) => ex === midX && ey === ROOM_H - 1) || null;
    }
    return null;
  }

  // render board: 4x4 grid of rooms; highlight active
  return (
    <div className="root">
      <h1 className="title">Sleutel</h1>

      <div className="board-grid">
        {board.map((rowRooms, r) =>
          rowRooms.map((room, c) => {
            const isActive = active.row === r && active.col === c;
            const discovered = !!room.discovered;
            return (
              <div
                className={`room ${discovered ? "discovered" : "undiscovered"} ${isActive ? "active-room" : ""}`}
                key={`${r}-${c}`}
                style={{ borderColor: isActive ? "#fff" : "#333", background: discovered ? room.color : "#111" }}
              >
                {/* room tiles */}
                {room.tiles.map((rowArr, y) => (
                  <div className="room-row" key={y}>
                    {rowArr.map((tile, x) => {
                      const isPlayerHere =
                        player.roomRow === r && player.roomCol === c && player.x === x && player.y === y;
                      const classes = ["tile"];
                      if (tile === WALL) classes.push("tile-wall");
                      if (tile === PATH) classes.push("tile-path");
                      if (tile === EXIT) classes.push("tile-exit");
                      if (isPlayerHere) classes.push("tile-player");
                      return <div key={x} className={classes.join(" ")} />;
                    })}
                  </div>
                ))}
                {/* small coords label */}
                <div className="room-label">[{r},{c}]</div>
              </div>
            );
          })
        )}
      </div>

      <div className="controls">
        Gebruik pijltjestoetsen om te bewegen. Druk <b>R</b> om actieve kamer 180° te draaien (startkamer draait niet).
      </div>
    </div>
  );
}
