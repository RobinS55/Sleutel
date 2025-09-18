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
    chosenExits = [exits.right, exits.bottom];
    room[1][1] = "start"; // speler begint linksboven in eerste kamer
    carvePath(room, [1,1], exits.right);
    carvePath(room, [1,1], exits.bottom);
  } else {
    const exitKeys = Object.keys(exits);
    chosenExits = exitKeys
      .sort(() => 0.5 - Math.random())
      .slice(0, 2)
      .map((key) => exits[key]);
    chosenExits.forEach((exit) => carvePath(room, [Math.floor(GRID_SIZE/2), Math.floor(GRID_SIZE/2)], exit));
  }

  // extra doodlopende paden voor variatie
  for (let i = 0; i < 2; i++) {
    const randX = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
    const randY = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
    if (room[randY][randX] === "wall") {
      carvePath(room, [Math.floor(GRID_SIZE/2), Math.floor(GRID_SIZE/2)], [randX, randY]);
    }
  }

  // markeer uitgangen
  Object.values(exits).forEach(([x, y]) => {
    if (room[y][x] === "path") room[y][x] = "exit";
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
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0, y: 1, x: 1 });

  useEffect(() => {
    document.title = "Sleutel";
    setBoard(generateBoard());
  }, []);

  // eenvoudige beweging met pijltjestoetsen
  useEffect(() => {
    const handleKey = (e) => {
      if (!board.length) return;
      let { row, col, y, x } = playerPos;
      const room = board[row][col];

      let newY = y;
      let newX = x;

      if (e.key === "ArrowUp") newY--;
      if (e.key === "ArrowDown") newY++;
      if (e.key === "ArrowLeft") newX--;
      if (e.key === "ArrowRight") newX++;

      // binnen kamer checken
      if (newY >= 0 && newY < GRID_SIZE && newX >= 0 && newX < GRID_SIZE) {
        const cell = room[newY][newX];
        if (cell === "path" || cell === "exit") {
          setPlayerPos({ row, col, y: newY, x: newX });
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [playerPos, board]);

  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((room, colIndex) => (
            <div key={colIndex} className="room">
              {room.map((rowCells, y) => (
                <div key={y} className="room-row">
                  {rowCells.map((cell, x) => {
                    let className = cell;
                    if (
                      rowIndex === playerPos.row &&
                      colIndex === playerPos.col &&
                      y === playerPos.y &&
                      x === playerPos.x
                    ) {
                      className = "player";
                    }
                    return <div key={x} className={`cell ${className}`}></div>;
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
