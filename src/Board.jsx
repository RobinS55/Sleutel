import React, { useState, useEffect } from "react";
import "./Board.css";

const GRID_SIZE = 9; // oneven -> uitgangen in het midden
const BOARD_COLS = 4;
const BOARD_ROWS = 4;

function generateEmptyRoom() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "wall")
  );
}

function carvePath(room, start, end) {
  // simpele "slingerende" lijn tussen start en end
  let [x, y] = start;
  room[y][x] = "path";

  while (x !== end[0] || y !== end[1]) {
    if (Math.random() < 0.5 && x !== end[0]) {
      x += x < end[0] ? 1 : -1;
    } else if (y !== end[1]) {
      y += y < end[1] ? 1 : -1;
    }
    room[y][x] = "path";
  }
}

function generateRoom(isFirst = false) {
  const room = generateEmptyRoom();
  const mid = Math.floor(GRID_SIZE / 2);

  const exits = {
    left: [0, mid],
    right: [GRID_SIZE - 1, mid],
    top: [mid, 0],
    bottom: [mid, GRID_SIZE - 1],
  };

  let chosenExits = [];

  if (isFirst) {
    // eerste kamer: altijd rechts + beneden
    chosenExits = [exits.right, exits.bottom];
    room[mid][mid] = "start"; // speler start in het midden
  } else {
    // minimaal 2 willekeurige uitgangen
    const exitKeys = Object.keys(exits);
    chosenExits = exitKeys
      .sort(() => 0.5 - Math.random())
      .slice(0, 2)
      .map((key) => exits[key]);
  }

  // carve paden naar gekozen uitgangen
  chosenExits.forEach((exit) => carvePath(room, [mid, mid], exit));

  // extra doodlopende paden voor variatie
  for (let i = 0; i < 2; i++) {
    const randX = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
    const randY = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
    if (room[randY][randX] === "wall") {
      carvePath(room, [mid, mid], [randX, randY]);
    }
  }

  // markeer uitgangen
  Object.values(exits).forEach(([x, y]) => {
    if (room[y][x] === "path") {
      room[y][x] = "exit";
    }
  });

  return room;
}

function generateBoard() {
  const board = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    const rowArr = [];
    for (let col = 0; col < BOARD_COLS; col++) {
      rowArr.push(generateRoom(row === 0 && col === 0));
    }
    board.push(rowArr);
  }
  return board;
}

export default function Board() {
  const [board, setBoard] = useState([]);

  useEffect(() => {
    document.title = "Sleutel"; // titel in de browser
    setBoard(generateBoard());
  }, []);

  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((room, colIndex) => (
            <div key={colIndex} className="room">
              {room.map((r, y) => (
                <div key={y} className="room-row">
                  {r.map((cell, x) => (
                    <div key={x} className={`cell ${cell}`}></div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
