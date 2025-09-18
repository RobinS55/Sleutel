import React, { useState, useEffect } from "react";
import "./Board.css";

const ROOM_SIZE = 9; // oneven zodat uitgangen midden zitten
const BOARD_ROWS = 4;
const BOARD_COLS = 4;

// Cel types
const EMPTY = 0;
const WALL = 1;
const PATH = 2;
const EXIT = 3;

function generateMaze(roomSize, exits) {
  // Maak grid vol walls
  const grid = Array.from({ length: roomSize }, () =>
    Array(roomSize).fill(WALL)
  );

  // Start midden
  const startX = Math.floor(roomSize / 2);
  const startY = Math.floor(roomSize / 2);
  grid[startY][startX] = PATH;

  const stack = [[startX, startY]];

  // DFS maze carving
  const directions = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];

  while (stack.length > 0) {
    const [x, y] = stack[stack.length - 1];

    // Vind alle buren die walls zijn
    const neighbors = directions
      .map(([dx, dy]) => [x + dx, y + dy])
      .filter(
        ([nx, ny]) =>
          nx > 0 &&
          ny > 0 &&
          nx < roomSize - 1 &&
          ny < roomSize - 1 &&
          grid[ny][nx] === WALL
      );

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nx, ny] =
        neighbors[Math.floor(Math.random() * neighbors.length)];
      const mx = (x + nx) / 2;
      const my = (y + ny) / 2;
      grid[my][mx] = PATH;
      grid[ny][nx] = PATH;
      stack.push([nx, ny]);
    }
  }

  // Zet exits en verbind met maze
  exits.forEach(([ex, ey]) => {
    grid[ey][ex] = EXIT;

    // Als exit niet aan pad grenst -> verbind
    if (
      ![
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => {
        const nx = ex + dx;
        const ny = ey + dy;
        return (
          nx >= 0 &&
          ny >= 0 &&
          nx < roomSize &&
          ny < roomSize &&
          grid[ny][nx] === PATH
        );
      })
    ) {
      // verbind naar centrum
      let cx = startX;
      let cy = startY;
      let x = ex;
      let y = ey;
      while (x !== cx || y !== cy) {
        if (x < cx) x++;
        else if (x > cx) x--;
        if (y < cy) y++;
        else if (y > cy) y--;
        grid[y][x] = PATH;
      }
    }
  });

  return grid;
}

function generateRoom(row, col) {
  const size = ROOM_SIZE;
  const exits = [];

  const mid = Math.floor(size / 2);

  // Linksonder: alleen rechts + boven
  if (row === BOARD_ROWS - 1 && col === 0) {
    exits.push([size - 1, mid]); // rechts
    exits.push([mid, 0]); // boven
  } else {
    // Normale kamer -> 4 exits
    exits.push([0, mid]); // links
    exits.push([size - 1, mid]); // rechts
    exits.push([mid, 0]); // boven
    exits.push([mid, size - 1]); // onder
  }

  return generateMaze(size, exits);
}

export default function Board() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const newRooms = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      const row = [];
      for (let c = 0; c < BOARD_COLS; c++) {
        row.push(generateRoom(r, c));
      }
      newRooms.push(row);
    }
    setRooms(newRooms);
  }, []);

  return (
    <div className="board">
      {rooms.map((row, r) => (
        <div key={r} className="board-row">
          {row.map((room, c) => (
            <div key={c} className="room">
              {room.map((rowCells, y) => (
                <div key={y} className="room-row">
                  {rowCells.map((cell, x) => {
                    let className = "cell";
                    if (cell === WALL) className += " wall";
                    if (cell === PATH) className += " path";
                    if (cell === EXIT) className += " exit";
                    return <div key={x} className={className}></div>;
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
