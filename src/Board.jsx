import React, { useState, useEffect } from "react";
import Room from "./Room";

const ROOM_WIDTH = 40;   // 2x zo breed
const ROOM_HEIGHT = 20;
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;

function carveMaze(width, height, exits) {
  const tiles = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => "wall")
  );

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < width && y < height;
  }

  function dfs(x, y) {
    tiles[y][x] = "path";
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ].sort(() => Math.random() - 0.5);

    for (const [dx, dy] of dirs) {
      const nx = x + dx * 2;
      const ny = y + dy * 2;
      if (inBounds(nx, ny) && tiles[ny][nx] === "wall") {
        tiles[y + dy][x + dx] = "path";
        dfs(nx, ny);
      }
    }
  }

  dfs(1, 1);

  function connectExit(exit) {
    if (!exit) return;
    tiles[exit.y][exit.x] = "path";
    if (exit.x === 0) tiles[exit.y][1] = "path";
    if (exit.x === width - 1) tiles[exit.y][width - 2] = "path";
    if (exit.y === 0) tiles[1][exit.x] = "path";
    if (exit.y === height - 1) tiles[height - 2][exit.x] = "path";
  }

  for (const dir of ["left", "right", "top", "bottom"]) {
    connectExit(exits[dir]);
  }

  return tiles;
}

function generateRoom(x, y) {
  let exits = {
    left: { x: 0, y: Math.floor(ROOM_HEIGHT / 2) },
    right: { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) },
    top: { x: Math.floor(ROOM_WIDTH / 2), y: 0 },
    bottom: { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 }
  };

  if (x === 0 && y === 0) {
    exits = {
      left: null,
      top: null,
      right: exits.right,
      bottom: exits.bottom
    };
  }

  const tiles = carveMaze(ROOM_WIDTH, ROOM_HEIGHT, exits);

  return { x, y, width: ROOM_WIDTH, height: ROOM_HEIGHT, tiles, exits };
}

export default function Board() {
  const [board] = useState(() =>
    Array.from({ length: BOARD_HEIGHT }, (_, row) =>
      Array.from({ length: BOARD_WIDTH }, (_, col) => generateRoom(col, row))
    )
  );

  const [revealedRooms, setRevealedRooms] = useState(new Set(["0,0"]));
  const [currentRoom, setCurrentRoom] = useState({ x: 0, y: 0 });
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });

  useEffect(() => {
    function handleKey(e) {
      const room = board[currentRoom.y][currentRoom.x];
      let { x, y } = playerPos;

      if (e.key === "ArrowUp") y -= 1;
      if (e.key === "ArrowDown") y += 1;
      if (e.key === "ArrowLeft") x -= 1;
      if (e.key === "ArrowRight") x += 1;

      if (x < 0 || y < 0 || x >= ROOM_WIDTH || y >= ROOM_HEIGHT) return;
      if (room.tiles[y][x] === "wall") return;

      setPlayerPos({ x, y });

      for (const dir of ["left", "right", "top", "bottom"]) {
        const exit = room.exits[dir];
        if (exit && exit.x === x && exit.y === y) {
          let newRoomX = currentRoom.x;
          let newRoomY = currentRoom.y;
          let newPos = { x, y };

          if (dir === "left") {
            newRoomX = (currentRoom.x - 1 + BOARD_WIDTH) % BOARD_WIDTH;
            newPos = { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) };
          }
          if (dir === "right") {
            newRoomX = (currentRoom.x + 1) % BOARD_WIDTH;
            newPos = { x: 0, y: Math.floor(ROOM_HEIGHT / 2) };
          }
          if (dir === "top") {
            newRoomY = (currentRoom.y - 1 + BOARD_HEIGHT) % BOARD_HEIGHT;
            newPos = { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 };
          }
          if (dir === "bottom") {
            newRoomY = (currentRoom.y + 1) % BOARD_HEIGHT;
            newPos = { x: Math.floor(ROOM_WIDTH / 2), y: 0 };
          }

          if (newRoomX === 0 && newRoomY === 0 && !(currentRoom.x === 0 && currentRoom.y === 0)) {
            return;
          }

          setCurrentRoom({ x: newRoomX, y: newRoomY });
          setPlayerPos(newPos);
          setRevealedRooms((prev) => new Set([...prev, `${newRoomX},${newRoomY}`]));
        }
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [playerPos, currentRoom, board]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${BOARD_WIDTH}, auto)` }}>
      {board.map((row, rowIndex) =>
        row.map((room, colIndex) => {
          const key = `${colIndex},${rowIndex}`;
          const revealed = revealedRooms.has(key);
          const isCurrent = currentRoom.x === colIndex && currentRoom.y === rowIndex;
          return (
            <Room
              key={key}
              room={room}
              revealed={revealed}
              playerPos={isCurrent ? playerPos : null}
            />
          );
        })
      )}
    </div>
  );
}
