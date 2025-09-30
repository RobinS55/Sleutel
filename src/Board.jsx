import React, { useState, useEffect } from "react";
import "./Board.css";

const TILE_ROWS = 7;
const TILE_COLS = 15;
const BOARD_SIZE = 4; // 4x4 tegels

// Maak een lege tegel (alle blokken zwart)
const createEmptyTile = () => {
  const tile = [];
  for (let r = 0; r < TILE_ROWS; r++) {
    const row = [];
    for (let c = 0; c < TILE_COLS; c++) {
      row.push({ type: "wall" }); // standaard muur
    }
    tile.push(row);
  }
  return tile;
};

// Voorbeeldfunctie om paden te genereren in een tegel
const generateTilePath = (isStart = false) => {
  const tile = createEmptyTile();

  // Starttegel: pad linksboven -> middenrechts & middenonder
  if (isStart) {
    tile[0][0].type = "player";
    for (let r = 0; r <= TILE_ROWS - 1; r++) tile[r][0].type = "path"; // kronkelpad links
    for (let c = 0; c < TILE_COLS; c++) tile[TILE_ROWS - 1][c].type = "path"; // pad naar onder
    for (let r = 0; r <= TILE_ROWS - 1; r++) tile[r][TILE_COLS - 1].type = "path"; // pad naar rechts
    // Uitgangen groen
    tile[Math.floor(TILE_ROWS/2)][TILE_COLS-1].type = "exit";
    tile[TILE_ROWS-1][Math.floor(TILE_COLS/2)].type = "exit";
  } else {
    // Overige tegels: 4 uitgangen, minimaal 2 verbonden
    const midRow = Math.floor(TILE_ROWS / 2);
    const midCol = Math.floor(TILE_COLS / 2);
    tile[midRow][0].type = "exit"; // links
    tile[0][midCol].type = "exit"; // boven
    tile[midRow][TILE_COLS-1].type = "exit"; // rechts
    tile[TILE_ROWS-1][midCol].type = "exit"; // onder

    // Genereer willekeurige paden
    for (let r = 1; r < TILE_ROWS - 1; r++) {
      for (let c = 1; c < TILE_COLS - 1; c++) {
        tile[r][c].type = Math.random() > 0.3 ? "path" : "wall";
      }
    }
    // Zorg dat minimaal 2 uitgangen verbonden zijn
    tile[midRow][Math.floor(TILE_COLS/2)].type = "path";
    tile[Math.floor(TILE_ROWS/2)][midCol].type = "path";
  }

  return tile;
};

const Board = () => {
  const [tiles, setTiles] = useState([]);
  const [playerPos, setPlayerPos] = useState({ tileRow:0, tileCol:0, row:0, col:0 });

  // Initialiseer 4x4 tegels
  useEffect(() => {
    const newTiles = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const rowTiles = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = generateTilePath(r===0 && c===0);
        rowTiles.push({ grid: tile, visible: r===0 && c===0 });
      }
      newTiles.push(rowTiles);
    }
    setTiles(newTiles);
  }, []);

  // Beweging
  const movePlayer = (dr, dc) => {
    const { tileRow, tileCol, row, col } = playerPos;
    const tile = tiles[tileRow][tileCol].grid;
    const newRow = row + dr;
    const newCol = col + dc;

    // Check binnen tegel
    if (newRow >=0 && newRow < TILE_ROWS && newCol >=0 && newCol < TILE_COLS) {
      const cell = tile[newRow][newCol];
      if (cell.type === "path" || cell.type === "exit") {
        setPlayerPos({ ...playerPos, row:newRow, col:newCol });

        // Check exit
        if(cell.type === "exit") {
          let nextTileRow = tileRow;
          let nextTileCol = tileCol;

          // Bepaal welke uitgang
          if(newRow===Math.floor(TILE_ROWS/2) && newCol===TILE_COLS-1) nextTileCol +=1; // rechts
          else if(newRow===TILE_ROWS-1 && newCol===Math.floor(TILE_COLS/2)) nextTileRow +=1; // onder
          else if(newRow===Math.floor(TILE_ROWS/2) && newCol===0) nextTileCol -=1; // links
          else if(newRow===0 && newCol===Math.floor(TILE_COLS/2)) nextTileRow -=1; // boven

          // Check grenzen
          if(nextTileRow>=0 && nextTileRow<BOARD_SIZE && nextTileCol>=0 && nextTileCol<BOARD_SIZE) {
            const newTiles = [...tiles];
            newTiles[nextTileRow][nextTileCol].visible = true;
            setTiles(newTiles);

            // Plaats speler bij ingang
            const nextTile = newTiles[nextTileRow][nextTileCol].grid;
            let entryRow = 0, entryCol = 0;
            if(nextTileRow > tileRow) { entryRow=0; entryCol=Math.floor(TILE_COLS/2); } // van boven
            else if(nextTileRow < tileRow) { entryRow=TILE_ROWS-1; entryCol=Math.floor(TILE_COLS/2); } // van onder
            else if(nextTileCol > tileCol) { entryRow=Math.floor(TILE_ROWS/2); entryCol=0; } // van links
            else if(nextTileCol < tileCol) { entryRow=Math.floor(TILE_ROWS/2); entryCol=TILE_COLS-1; } // van rechts

            setPlayerPos({ tileRow:nextTileRow, tileCol:nextTileCol, row:entryRow, col:entryCol });
          }
        }
      }
    }
  };

  // Keyboard events
  useEffect(() => {
    const handleKey = (e) => {
      if(e.key === "ArrowUp") movePlayer(-1,0);
      else if(e.key === "ArrowDown") movePlayer(1,0);
      else if(e.key === "ArrowLeft") movePlayer(0,-1);
      else if(e.key === "ArrowRight") movePlayer(0,1);
    };
    window.addEventListener("keydown", handleKey);
    return ()=>window.removeEventListener("keydown", handleKey);
  }, [playerPos, tiles]);

  return (
    <div className="board">
      {tiles.map((tileRow, rIdx) =>
        tileRow.map((tileObj, cIdx) =>
          <div key={`${rIdx}-${cIdx}`} className="tile" style={{visibility: tileObj.visible ? "visible":"hidden"}}>
            {tileObj.grid.map((row, ri)=>
              <div className="row" key={ri}>
                {row.map((cell, ci)=> {
                  let className = cell.type;
                  if(playerPos.tileRow===rIdx && playerPos.tileCol===cIdx && playerPos.row===ri && playerPos.col===ci) className="player";
                  return <div key={ci} className={className}></div>
                })}
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
};

export default Board;
