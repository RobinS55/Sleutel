import React, { useEffect, useState } from "react";
import "./Board.css";

/*
  Implementatie volgens jouw regels:
  - 4x4 bord (BOARD_SIZE)
  - elke tegel TILE_ROWS x TILE_COLS (7 x 15)
  - starttegel (0,0): speler start linksboven en heeft alleen middle-right & middle-bottom exits
  - overige tegels: 4 mogelijke exits; generator zorgt voor symmetrische connecties en min. 2 connected exits
  - overgang door exit => direct in de corresponderende ingang van aangrenzende tegel (wrap-around)
  - R draait actieve tegel 180° (starttegel niet)
*/

const BOARD_SIZE = 4;
const TILE_ROWS = 7;
const TILE_COLS = 15;
const CELL_PX = 18;
const MID_ROW = Math.floor(TILE_ROWS / 2);
const MID_COL = Math.floor(TILE_COLS / 2);

function makeEmptyGrid() {
  return Array.from({ length: TILE_ROWS }, () =>
    Array.from({ length: TILE_COLS }, () => "wall")
  );
}

function carvePath(grid, sx, sy, tx, ty) {
  let x = sx, y = sy;
  grid[y][x] = "path";
  while (x !== tx || y !== ty) {
    const dx = tx - x;
    const dy = ty - y;
    if (dx !== 0 && dy !== 0) {
      if (Math.random() < 0.5) x += dx > 0 ? 1 : -1;
      else y += dy > 0 ? 1 : -1;
    } else if (dx !== 0) x += dx > 0 ? 1 : -1;
    else if (dy !== 0) y += dy > 0 ? 1 : -1;
    grid[y][x] = "path";
  }
}

function addDeadEnds(grid, tries = 4) {
  for (let t = 0; t < tries; t++) {
    const r = 1 + Math.floor(Math.random() * (TILE_ROWS - 2));
    const c = 1 + Math.floor(Math.random() * (TILE_COLS - 2));
    if (grid[r][c] !== "path") continue;
    let len = 1 + Math.floor(Math.random() * 4);
    let x = c, y = r;
    let dir = Math.random() < 0.5 ? "h" : "v";
    for (let i = 0; i < len; i++) {
      if (dir === "h") x += Math.random() < 0.5 ? -1 : 1;
      else y += Math.random() < 0.5 ? -1 : 1;
      if (x < 1 || x >= TILE_COLS - 1 || y < 1 || y >= TILE_ROWS - 1) break;
      grid[y][x] = "path";
    }
  }
}

function generateTile(row, col, isStart = false) {
  const grid = makeEmptyGrid();
  let exits = { left: false, right: false, top: false, bottom: false };

  if (isStart) {
    exits.right = true;
    exits.bottom = true;
    grid[0][0] = "path"; // startplek
    carvePath(grid, 0, 0, MID_COL, MID_ROW);
    carvePath(grid, MID_COL, MID_ROW, MID_COL, TILE_ROWS - 1); // naar onder
    carvePath(grid, MID_COL, MID_ROW, TILE_COLS - 1, MID_ROW); // naar rechts
    grid[MID_ROW][TILE_COLS - 1] = "exit";
    grid[TILE_ROWS - 1][MID_COL] = "exit";
  } else {
    exits = { left: true, right: true, top: true, bottom: true };
    let chosen = ["left", "right", "top", "bottom"].sort(
      () => Math.random() - 0.5
    ).slice(0, 2);

    chosen.forEach((d) => {
      let sx, sy, tx, ty;
      if (d === "left") {
        grid[MID_ROW][0] = "exit";
        sx = 0; sy = MID_ROW;
        tx = MID_COL; ty = MID_ROW;
      } else if (d === "right") {
        grid[MID_ROW][TILE_COLS - 1] = "exit";
        sx = TILE_COLS - 1; sy = MID_ROW;
        tx = MID_COL; ty = MID_ROW;
      } else if (d === "top") {
        grid[0][MID_COL] = "exit";
        sx = MID_COL; sy = 0;
        tx = MID_COL; ty = MID_ROW;
      } else if (d === "bottom") {
        grid[TILE_ROWS - 1][MID_COL] = "exit";
        sx = MID_COL; sy = TILE_ROWS - 1;
        tx = MID_COL; ty = MID_ROW;
      }
      carvePath(grid, sx, sy, tx, ty);
    });
    addDeadEnds(grid);
  }
  return { grid, exits, rotated: false, discovered: isStart, isStart };
}

function rotateTile(tile) {
  const newGrid = makeEmptyGrid();
  for (let r = 0; r < TILE_ROWS; r++) {
    for (let c = 0; c < TILE_COLS; c++) {
      newGrid[TILE_ROWS - 1 - r][TILE_COLS - 1 - c] = tile.grid[r][c];
    }
  }
  return {
    ...tile,
    grid: newGrid,
    rotated: !tile.rotated,
  };
}

export default function Board() {
  const [tiles, setTiles] = useState([]);
  const [player, setPlayer] = useState({ tileR: 0, tileC: 0, r: 0, c: 0 });

  useEffect(() => {
    const t = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const row = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        row.push(generateTile(r, c, r === 0 && c === 0));
      }
      t.push(row);
    }
    setTiles(t);
    setPlayer({ tileR: 0, tileC: 0, r: 0, c: 0 }); // start linksboven
  }, []);

  const move = (dr, dc) => {
    setPlayer((p) => {
      const t = tiles[p.tileR][p.tileC];
      let nr = p.r + dr;
      let nc = p.c + dc;
      if (nr < 0 || nr >= TILE_ROWS || nc < 0 || nc >= TILE_COLS) return p;
      const cell = t.grid[nr][nc];
      if (cell === "wall") return p;
      // doorgang naar andere tegel?
      if (cell === "exit") {
        let newTileR = p.tileR;
        let newTileC = p.tileC;
        let newR = nr;
        let newC = nc;
        if (nr === 0 && nc === MID_COL) { // top
          newTileR = (p.tileR - 1 + BOARD_SIZE) % BOARD_SIZE;
          newR = TILE_ROWS - 1; newC = MID_COL;
        } else if (nr === TILE_ROWS - 1 && nc === MID_COL) { // bottom
          newTileR = (p.tileR + 1) % BOARD_SIZE;
          newR = 0; newC = MID_COL;
        } else if (nc === 0 && nr === MID_ROW) { // left
          newTileC = (p.tileC - 1 + BOARD_SIZE) % BOARD_SIZE;
          newC = TILE_COLS - 1; newR = MID_ROW;
        } else if (nc === TILE_COLS - 1 && nr === MID_ROW) { // right
          newTileC = (p.tileC + 1) % BOARD_SIZE;
          newC = 0; newR = MID_ROW;
        }
        const newTiles = [...tiles];
        newTiles[newTileR][newTileC].discovered = true;
        setTiles(newTiles);
        return { tileR: newTileR, tileC: newTileC, r: newR, c: newC };
      }
      return { ...p, r: nr, c: nc };
    });
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowUp") move(-1, 0);
      else if (e.key === "ArrowDown") move(1, 0);
      else if (e.key === "ArrowLeft") move(0, -1);
      else if (e.key === "ArrowRight") move(0, 1);
      else if (e.key === "r" || e.key === "R") {
        setTiles((old) => {
          const newTiles = [...old];
          const t = old[player.tileR][player.tileC];
          if (!t.isStart) newTiles[player.tileR][player.tileC] = rotateTile(t);
          return newTiles;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [player, tiles]);

  return (
    <div className="board">
      {tiles.map((row, r) =>
        row.map((tile, c) => (
          <div
            key={`${r}-${c}`}
            className={`tile ${tile.discovered ? "discovered" : "hidden"}`}
            style={{
              gridRow: r + 1,
              gridColumn: c + 1,
              width: TILE_COLS * CELL_PX,
              height: TILE_ROWS * CELL_PX,
            }}
          >
            {tile.discovered &&
              tile.grid.map((line, rr) =>
                line.map((cell, cc) => {
                  let cls = "cell wall";
                  if (cell === "path") cls = "cell path";
                  if (cell === "exit") cls = "cell exit";
                  if (
                    r === player.tileR &&
                    c === player.tileC &&
                    rr === player.r &&
                    cc === player.c
                  ) {
                    cls = "cell player";
                  }
                  return (
                    <div
                      key={`${rr}-${cc}`}
                      className={cls}
                      style={{ width: CELL_PX, height: CELL_PX }}
                    />
                  );
                })
              )}
          </div>
        ))
      )}
    </div>
  );
}
