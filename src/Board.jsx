// src/Board.jsx
import React, { useState, useEffect } from "react";
import "./Board.css";

const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;
const ROOM_WIDTH = 12;
const ROOM_HEIGHT = 6;

function carvePath(tiles, x1, y1, x2, y2) {
  let x = x1;
  let y = y1;
  tiles[y][x] = "path";
  while (x !== x2 || y !== y2) {
    if (Math.random() < 0.5) {
      if (x < x2) x++;
      else if (x > x2) x--;
    } else {
      if (y < y2) y++;
      else if (y > y2) y--;
    }
    tiles[y][x] = "path";
  }
}

function generateRoom(x, y) {
  const tiles = Array.from({ length: ROOM_HEIGHT }, () =>
    Array.from({ length: ROOM_WIDTH }, () => "wall")
  );

  const exits = {
    left: { x: 0, y: Math.floor(ROOM_HEIGHT / 2) },
    right: { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) },
    top: { x: Math.floor(ROOM_WIDTH / 2), y: 0 },
    bottom: { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 },
  };

  // 🟢 Hoek-correcties
  if (x === 0 && y === 0) {
    exits.left = null;
    exits.top = null;
  }
  if (x === BOARD_WIDTH - 1 && y === 0) {
    exits.right = null;
    exits.top = null;
  }
  if (x === 0 && y === BOARD_HEIGHT - 1) {
    exits.left = null;
    exits.bottom = null; // ❌ onderuitgang uitschakelen in linksonder
  }
  if (x === BOARD_WIDTH - 1 && y === BOARD_HEIGHT - 1) {
    exits.right = null;
    exits.bottom = null;
  }

  // 🟢 Rand-correcties
  if (y === BOARD_HEIGHT - 1) exits.bottom = null; // onderste rij → geen onderuitgang
  if (y === 0) exits.top = null; // bovenste rij → geen bovenuitgang
  if (x === 0) exits.left = null; // linker kolom → geen linkeruitgang
  if (x === BOARD_WIDTH - 1) exits.right = null; // rechter kolom → geen rechteruitgang

  // eerste kamer moet een pad hebben naar rechts en beneden
  if (x === 0 && y === 0) {
    tiles[0][0] = "path";
    carvePath(tiles, 0, 0, exits.right.x, exits.right.y);
    carvePath(tiles, 0, 0, exits.bottom.x, exits.bottom.y);
  } else {
    const availableExits = Object.keys(exits).filter((dir) => exits[dir]);
    const shuffled = availableExits.sort(() => Math.random() - 0.5);

    if (shuffled.length >= 2) {
      carvePath(
        tiles,
        exits[shuffled[0]].x,
        exits[shuffled[0]].y,
        exits[shuffled[1]].x,
        exits[shuffled[1]].y
      );
    }

    // extra paden die verbonden blijven
    const extraPaths = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < extraPaths; i++) {
      const chosenExit =
        exits[availableExits[Math.floor(Math.random() * availableExits.length)]];
      if (chosenExit) {
        const ex = Math.floor(Math.random() * ROOM_WIDTH);
        const ey = Math.floor(Math.random() * ROOM_HEIGHT);
        carvePath(tiles, chosenExit.x, chosenExit.y, ex, ey);
      }
    }

    // exits zelf groen maken
    for (const dir of ["left", "right", "top", "bottom"]) {
      if (exits[dir]) tiles[exits[dir].y][exits[dir].x] = "path";
    }
  }

  return {
    x,
    y,
    tiles,
    exits,
    color: `hsl(${Math.random() * 360}, 50%, 25%)`,
    discovered: x === 0 && y === 0,
  };
}

export default function Board() {
  const [rooms, setRooms] = useState([]);
  const [player, setPlayer] = useState({ roomX: 0, roomY: 0, x: 0, y: 0 });

  useEffect(() => {
    const generated = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      const row = [];
      for (let x = 0; x < BOARD_WIDTH; x++) {
        row.push(generateRoom(x, y));
      }
      generated.push(row);
    }
    setRooms(generated);
  }, []);

  useEffect(() => {
    function handleKey(e) {
      setPlayer((prev) => {
        const room = rooms[prev.roomY]?.[prev.roomX];
        if (!room) return prev;

        let nx = prev.x;
        let ny = prev.y;
        let roomX = prev.roomX;
        let roomY = prev.roomY;

        if (e.key === "ArrowUp") ny--;
        if (e.key === "ArrowDown") ny++;
        if (e.key === "ArrowLeft") nx--;
        if (e.key === "ArrowRight") nx++;

        // kamer wissel checks
        if (ny < 0 && room.exits.top && nx === room.exits.top.x) {
          roomY = (roomY - 1 + BOARD_HEIGHT) % BOARD_HEIGHT;
          ny = ROOM_HEIGHT - 1;
          nx = rooms[roomY][roomX].exits.bottom.x;
        }
        if (ny >= ROOM_HEIGHT && room.exits.bottom && nx === room.exits.bottom.x) {
          roomY = (roomY + 1) % BOARD_HEIGHT;
          ny = 0;
          nx = rooms[roomY][roomX].exits.top.x;
        }
        if (nx < 0 && room.exits.left && ny === room.exits.left.y) {
          roomX = (roomX - 1 + BOARD_WIDTH) % BOARD_WIDTH;
          nx = ROOM_WIDTH - 1;
          ny = rooms[roomY][roomX].exits.right.y;
        }
        if (nx >= ROOM_WIDTH && room.exits.right && ny === room.exits.right.y) {
          roomX = (roomX + 1) % BOARD_WIDTH;
          nx = 0;
          ny = rooms[roomY][roomX].exits.left.y;
        }

        const newRoom = rooms[roomY][roomX];
        if (newRoom.tiles[ny]?.[nx] === "path") {
          rooms[roomY][roomX].discovered = true;
          setRooms([...rooms]);
          return { roomX, roomY, x: nx, y: ny };
        }
        return prev;
      });
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rooms]);

  if (rooms.length === 0) return <div>Loading...</div>;

  return (
    <div className="board">
      {rooms.map((row, ry) => (
        <div key={ry} className="row">
          {row.map((room, rx) => (
            <div
              key={rx}
              className="room"
              style={{
                backgroundColor: room.discovered ? room.color : "#111",
              }}
            >
              {room.discovered &&
                room.tiles.map((row, y) =>
                  row.map((tile, x) => {
                    let isPlayer =
                      player.roomX === rx &&
                      player.roomY === ry &&
                      player.x === x &&
                      player.y === y;
                    let isExit =
                      (room.exits.left &&
                        room.exits.left.x === x &&
                        room.exits.left.y === y) ||
                      (room.exits.right &&
                        room.exits.right.x === x &&
                        room.exits.right.y === y) ||
                      (room.exits.top &&
                        room.exits.top.x === x &&
                        room.exits.top.y === y) ||
                      (room.exits.bottom &&
                        room.exits.bottom.x === x &&
                        room.exits.bottom.y === y);
                    return (
                      <div
                        key={x + "-" + y}
                        className={
                          "tile " +
                          (isPlayer
                            ? "player"
                            : isExit
                            ? "exit"
                            : tile === "path"
                            ? "path"
                            : "wall")
                        }
                      />
                    );
                  })
                )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
