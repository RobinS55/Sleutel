import React, { useState, useEffect } from "react";
import "./Board.css";

const TILE_WIDTH = 15;
const TILE_HEIGHT = 7;
const BOARD_SIZE = 4; // 4x4

const COLORS = {
  wall: "#000",
  path: "#888",
  player: "#ff0",
  exit: "#0f0",
};

// Startpositie
const START_TILE = { x: 0, y: 0 };
const START_POS = { row: 0, col: 0 };

// Genereer lege tegel
const generateEmptyTile = () =>
  Array.from({ length: TILE_HEIGHT }, () =>
    Array.from({ length: TILE_WIDTH }, () => "wall")
  );

// Genereer paden
const generateTilePaths = (tileIndex) => {
  const tile = generateEmptyTile();

  const midRow = Math.floor(TILE_HEIGHT / 2);
  const midCol = Math.floor(TILE_WIDTH / 2);

  // Starttegel
  if (tileIndex === 0) {
    // Kronkelpad linksboven start naar middenrechts en middenonder
    let r = 0, c = 0;
    while (c < midCol) { tile[r][c] = "path"; c++; }
    r = 0; c = midCol;
    while (r < midRow) { tile[r][c] = "path"; r++; }
    r = midRow; c = midCol;
    while (c < TILE_WIDTH) { tile[r][c] = "path"; c++; }
    r = midRow; c = midCol;
    while (r < TILE_HEIGHT) { tile[r][c] = "path"; r++; }
    return tile;
  }

  // Andere tegels: minimaal 2 paden
  const pathPairs = [
    ["left", "right"],
    ["top", "bottom"],
    ["left", "bottom"],
    ["top", "right"],
  ];
  const selected = pathPairs[Math.floor(Math.random() * pathPairs.length)];

  const positions = {
    left: { r: midRow, c: 0 },
    right: { r: midRow, c: TILE_WIDTH - 1 },
    top: { r: 0, c: midCol },
    bottom: { r: TILE_HEIGHT - 1, c: midCol },
  };

  selected.forEach(([startDir, endDir]) => {
    let { r, c } = positions[startDir];
    const { r: tr, c: tc } = positions[endDir];
    while (r !== tr || c !== tc) {
      tile[r][c] = "path";
      if (r < tr) r++; else if (r > tr) r--;
      if (c < tc) c++; else if (c > tc) c--;
    }
    tile[tr][tc] = "path";
  });

  return tile;
};

// Genereer bord
const generateBoard = () => {
  const tiles = [];
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    tiles.push({ grid: generateTilePaths(i), discovered: i === 0 });
  }
  return tiles;
};

export default function Board() {
  const [board, setBoard] = useState(generateBoard());
  const [playerTile, setPlayerTile] = useState(START_TILE);
  const [playerPos, setPlayerPos] = useState(START_POS);

  const handleKey = (e) => {
    e.preventDefault();
    const dirMap = { ArrowUp: [-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] };
    const dir = dirMap[e.key];
    if (!dir) return;
    const [dr, dc] = dir;
    let newR = playerPos.row + dr;
    let newC = playerPos.col + dc;
    const tileIndex = playerTile.y * BOARD_SIZE + playerTile.x;
    const tile = board[tileIndex];

    if (newR >=0 && newR<TILE_HEIGHT && newC>=0 && newC<TILE_WIDTH && tile.grid[newR][newC]==="path") {
      setPlayerPos({ row:newR, col:newC });
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <div className="board-container">
      {board.map((tile, idx) => {
        const tileX = idx % BOARD_SIZE;
        const tileY = Math.floor(idx / BOARD_SIZE);
        return (
          <div
            key={idx}
            className={`tile ${tile.discovered ? "discovered" : "hidden"}`}
            style={{ top: `${tileY * TILE_HEIGHT * 20}px`, left: `${tileX * TILE_WIDTH * 20}px` }}
          >
            {tile.grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                let className = "cell";
                if (cell === "path") className += " path";
                if (cell === "wall") className += " wall";
                if (tileX===playerTile.x && tileY===playerTile.y && rIdx===playerPos.row && cIdx===playerPos.col) className += " player";
                if ((rIdx===0 && cIdx===Math.floor(TILE_WIDTH/2)) ||
                    (rIdx===TILE_HEIGHT-1 && cIdx===Math.floor(TILE_WIDTH/2)) ||
                    (cIdx===Math.floor(TILE_HEIGHT/2) && cIdx===0) ||
                    (cIdx===TILE_WIDTH-1 && rIdx===Math.floor(TILE_HEIGHT/2))) {
                  className += " exit";
                }
                return <div key={`${rIdx}-${cIdx}`} className={className}></div>
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
