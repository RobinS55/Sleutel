import React, { useState, useEffect } from "react";
import "./Board.css";

const TILE_WIDTH = 15;
const TILE_HEIGHT = 7;

// Kleuren
const COLORS = {
  wall: "#000",
  path: "#888",
  player: "#ff0",
  exit: "#0f0",
};

// Startpositie
const START_TILE = { x: 0, y: 0 };
const START_POS = { row: 0, col: 0 };

// Hulpfuncties
const generateEmptyTile = () =>
  Array.from({ length: TILE_HEIGHT }, () =>
    Array.from({ length: TILE_WIDTH }, () => "wall")
  );

const generateTilePaths = (tileIndex) => {
  const tile = generateEmptyTile();

  const exits = {
    top: Math.floor(TILE_WIDTH / 2),
    bottom: Math.floor(TILE_WIDTH / 2),
    left: Math.floor(TILE_HEIGHT / 2),
    right: Math.floor(TILE_HEIGHT / 2),
  };

  if (tileIndex === 0) {
    // Starttegel: kronkelpad linksboven naar middenrechts en middenonder
    let r = 0, c = 0;
    while (c < TILE_WIDTH / 2) { tile[r][c] = "path"; c++; }
    r = 0; c = TILE_WIDTH / 2;
    while (r < TILE_HEIGHT / 2) { tile[r][c] = "path"; r++; }
    r = TILE_HEIGHT / 2; c = TILE_WIDTH / 2;
    while (c < TILE_WIDTH) { tile[r][c] = "path"; c++; }
    r = TILE_HEIGHT / 2; c = TILE_WIDTH / 2;
    while (r < TILE_HEIGHT) { tile[r][c] = "path"; r++; }
    return tile;
  }

  // Overige tegels: 2-3 willekeurige kronkelpaden
  const pathCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < pathCount; i++) {
    const startDir = ["top","bottom","left","right"][Math.floor(Math.random()*4)];
    const endDir = ["top","bottom","left","right"][Math.floor(Math.random()*4)];
    let r = startDir === "top" ? 0 : startDir === "bottom" ? TILE_HEIGHT-1 : Math.floor(TILE_HEIGHT/2);
    let c = startDir === "left" ? 0 : startDir === "right" ? TILE_WIDTH-1 : Math.floor(TILE_WIDTH/2);
    const targetR = endDir === "top" ? 0 : endDir === "bottom" ? TILE_HEIGHT-1 : Math.floor(TILE_HEIGHT/2);
    const targetC = endDir === "left" ? 0 : endDir === "right" ? TILE_WIDTH-1 : Math.floor(TILE_WIDTH/2);

    let currR = r, currC = c;
    while (currC !== targetC) { tile[currR][currC] = "path"; currC += currC < targetC ? 1 : -1; }
    while (currR !== targetR) { tile[currR][currC] = "path"; currR += currR < targetR ? 1 : -1; }
    tile[currR][currC] = "path";
  }

  return tile;
};

// Genereer 4x4 tegels
const generateBoard = () => {
  const tiles = [];
  for (let i = 0; i < 16; i++) {
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
    const dir = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] }[e.key];
    if (!dir) return;
    const [dr, dc] = dir;
    let newR = playerPos.row + dr;
    let newC = playerPos.col + dc;
    const tileIndex = playerTile.y*4 + playerTile.x;
    const tile = board[tileIndex];

    // Beweeg alleen op path
    if (newR >= 0 && newR < TILE_HEIGHT && newC >= 0 && newC < TILE_WIDTH && tile.grid[newR][newC] === "path") {
      setPlayerPos({ row: newR, col: newC });
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <div className="board-container">
      {board.map((tile, idx) => {
        const tileX = idx % 4;
        const tileY = Math.floor(idx / 4);
        return (
          <div
            key={idx}
            className={`tile ${tile.discovered ? "discovered" : "hidden"}`}
            style={{ top: `${tileY * TILE_HEIGHT*20}px`, left: `${tileX * TILE_WIDTH*20}px` }}
          >
            {tile.grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                let className = "cell";
                if (cell === "path") className += " path";
                if (cell === "wall") className += " wall";
                if (tileX===playerTile.x && tileY===playerTile.y && rIdx===playerPos.row && cIdx===playerPos.col) className += " player";
                if ((rIdx===0 && cIdx===Math.floor(TILE_WIDTH/2)) ||
                    (rIdx===TILE_HEIGHT-1 && cIdx===Math.floor(TILE_WIDTH/2)) ||
                    (cIdx===0 && rIdx===Math.floor(TILE_HEIGHT/2)) ||
                    (cIdx===TILE_WIDTH-1 && rIdx===Math.floor(TILE_HEIGHT/2))) {
                  className += " exit";
                }
                return <div key={`${rIdx}-${cIdx}`} className={className}></div>
              })
            )}
          </div>
        )
      })}
    </div>
  );
}
