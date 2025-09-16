import React, { useState, useEffect } from "react";
import Room from "./Room";

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 20;
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;

function generateRoom(x, y) {
  // standaard exits
  let exits = {
    left: { x: 0, y: Math.floor(ROOM_HEIGHT / 2) },
    right: { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) },
    top: { x: Math.floor(ROOM_WIDTH / 2), y: 0 },
    bottom: { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 }
  };

  // speciale regel voor startkamer (0,0): alleen rechts en onder
  if (x === 0 && y === 0) {
    exits = {
      left: null,
      top: null,
      right: exits.right,
      bottom: exits.bottom
    };
  }

  // simpele tile generator: alles muur behalve doorgangen
  const tiles = Array.from({ length: ROOM_HEIGHT }, (_, row) =>
    Array.from({ length: ROOM_WIDTH }, (_, col) => {
      if (
        (exits.left && col === exits.left.x && row === exits.left.y) ||
        (exits.right && col === exits.right.x && row === exits.right.y) ||
        (exits.top && col === exits.top.x && row === exits.top.y) ||
        (exits.bottom && col === exits.bottom.x && row === exits.bottom.y)
      ) {
        return "path";
      }
      return Math.random() < 0.2 ? "path" : "wall"; // willekeurige paden
    })
  );

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

      // check of nieuwe tile bestaat
      if (x < 0 || y < 0 || x >= ROOM_WIDTH || y >= ROOM_HEIGHT) return;
      if (room.tiles[y][x] === "wall") return;

      setPlayerPos({ x, y });

      // check of speler op een exit staat
      for (const dir of ["left", "right", "top", "bottom"]) {
        const exit = room.exits[dir];
        if (exit && exit.x === x && exit.y === y) {
          let newRoomX = currentRoom.x;
          let newRoomY = currentRoom.y;
          let newPos = { x, y };

          if (dir === "left") {
            newRoomX = (currentRoom.x - 1 + BOARD_WIDTH) % BOARD_WIDTH;
            newPos = {
              x: ROOM_WIDTH - 1,
              y: Math.floor(ROOM_HEIGHT / 2)
            };
          }
          if (dir === "right") {
            newRoomX = (currentRoom.x + 1) % BOARD_WIDTH;
            newPos = {
              x: 0,
              y: Math.floor(ROOM_HEIGHT / 2)
            };
          }
          if (dir === "top") {
            newRoomY = (currentRoom.y - 1 + BOARD_HEIGHT) % BOARD_HEIGHT;
            newPos = {
              x: Math.floor(ROOM_WIDTH / 2),
              y: ROOM_HEIGHT - 1
            };
          }
          if (dir === "bottom") {
            newRoomY = (currentRoom.y + 1) % BOARD_HEIGHT;
            newPos = {
              x: Math.floor(ROOM_WIDTH / 2),
              y: 0
            };
          }

          // speciale regel: je kunt niet naar (0,0) terug
          if (newRoomX === 0 && newRoomY === 0 && !(currentRoom.x === 0 && currentRoom.y === 0)) {
            return; // blokkeer terugweg
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
