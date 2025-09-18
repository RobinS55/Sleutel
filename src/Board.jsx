import React, { useEffect, useState } from "react";
import "./Board.css";

const ROOM_SIZE = 9; // oneven, zodat uitgangen altijd in het midden
const GRID_SIZE = 4;

const createEmptyRoom = () =>
  Array.from({ length: ROOM_SIZE }, () =>
    Array.from({ length: ROOM_SIZE }, () => "wall")
  );

function generateRoom(x, y, exits, isFirstRoom) {
  const room = createEmptyRoom();
  const mid = Math.floor(ROOM_SIZE / 2);

  // basispad
  room[mid][mid] = "path";

  // maak alle exits zichtbaar
  if (exits.top) room[0][mid] = "exit";
  if (exits.bottom) room[ROOM_SIZE - 1][mid] = "exit";
  if (exits.left) room[mid][0] = "exit";
  if (exits.right) room[mid][ROOM_SIZE - 1] = "exit";

  // verbind exits met centrum via slingerpaden
  const connect = (tx, ty) => {
    let cx = mid;
    let cy = mid;
    while (cx !== tx || cy !== ty) {
      if (cx < tx) cx++;
      else if (cx > tx) cx--;
      else if (cy < ty) cy++;
      else if (cy > ty) cy--;
      room[cy][cx] = "path";
    }
  };

  if (exits.top) connect(mid, 0);
  if (exits.bottom) connect(mid, ROOM_SIZE - 1);
  if (exits.left) connect(0, mid);
  if (exits.right) connect(ROOM_SIZE - 1, mid);

  // extra doodlopende paden toevoegen voor variatie
  for (let i = 0; i < 3; i++) {
    let cx = mid;
    let cy = mid;
    for (let j = 0; j < 3; j++) {
      if (Math.random() > 0.5 && cx + 1 < ROOM_SIZE - 1) cx++;
      else if (cy + 1 < ROOM_SIZE - 1) cy++;
      room[cy][cx] = "path";
    }
  }

  // eerste kamer: pad naar rechts en beneden verplicht
  if (isFirstRoom) {
    connect(mid, ROOM_SIZE - 1);
    connect(ROOM_SIZE - 1, mid);
  }

  return room;
}

function generateBoard() {
  const board = [];
  const exitsMap = {};

  for (let y = 0; y < GRID_SIZE; y++) {
    board[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const isFirst = x === 0 && y === 0;

      const exits = {
        top: y > 0,
        bottom: y < GRID_SIZE - 1,
        left: x > 0,
        right: x < GRID_SIZE - 1,
      };

      // speciale regels rand
      if (x === 0 && y === GRID_SIZE - 1) exits.bottom = false; // linksonder
      if (x === GRID_SIZE - 1 && y === 0) exits.right = false; // rechtsboven

      // eerste kamer
      if (isFirst) {
        exits.left = false;
        exits.top = false;
        exits.right = true;
        exits.bottom = true;
      }

      exitsMap[`${x},${y}`] = exits;
      board[y][x] = generateRoom(x, y, exits, isFirst);
    }
  }

  return { board, exitsMap };
}

export default function Board() {
  const [{ board, exitsMap }] = useState(generateBoard);
  const [pos, setPos] = useState({ x: 0, y: 0, px: 0, py: 0 });

  // keyboard besturing
  useEffect(() => {
    const handleKey = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();

        let { x, y, px, py } = pos;
        const room = board[y][x];
        let nx = px;
        let ny = py;

        if (e.key === "ArrowUp") ny--;
        if (e.key === "ArrowDown") ny++;
        if (e.key === "ArrowLeft") nx--;
        if (e.key === "ArrowRight") nx++;

        if (room[ny] && room[ny][nx] && room[ny][nx] !== "wall") {
          // gewone beweging in kamer
          setPos({ x, y, px: nx, py: ny });
        } else if (room[py][px] === "exit") {
          // check uitgang
          let newX = x;
          let newY = y;
          let newPx = px;
          let newPy = py;

          if (py === 0 && exitsMap[`${x},${y}`].top) {
            newY = (y - 1 + GRID_SIZE) % GRID_SIZE;
            newPy = ROOM_SIZE - 2;
            newPx = Math.floor(ROOM_SIZE / 2);
          } else if (
            py === ROOM_SIZE - 1 &&
            exitsMap[`${x},${y}`].bottom
          ) {
            newY = (y + 1) % GRID_SIZE;
            newPy = 1;
            newPx = Math.floor(ROOM_SIZE / 2);
          } else if (px === 0 && exitsMap[`${x},${y}`].left) {
            newX = (x - 1 + GRID_SIZE) % GRID_SIZE;
            newPx = ROOM_SIZE - 2;
            newPy = Math.floor(ROOM_SIZE / 2);
          } else if (
            px === ROOM_SIZE - 1 &&
            exitsMap[`${x},${y}`].right
          ) {
            newX = (x + 1) % GRID_SIZE;
            newPx = 1;
            newPy = Math.floor(ROOM_SIZE / 2);
          }

          setPos({ x: newX, y: newY, px: newPx, py: newPy });
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pos, board, exitsMap]);

  return (
    <div className="board">
      {board.map((row, y) => (
        <div key={y} className="board-row">
          {row.map((room, x) => (
            <div
              key={x}
              className={`room ${x === pos.x && y === pos.y ? "active" : ""}`}
            >
              {room.map((r, ry) => (
                <div key={ry} className="room-row">
                  {r.map((cell, rx) => {
                    const isPlayer =
                      x === pos.x && y === pos.y && rx === pos.px && ry === pos.py;
                    return (
                      <div
                        key={rx}
                        className={`cell ${cell} ${isPlayer ? "player" : ""}`}
                      />
                    );
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
