// src/Board.jsx
import React, { useState, useEffect } from "react";
import "./Board.css";

const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;
const ROOM_WIDTH = 11;  // oneven
const ROOM_HEIGHT = 7;  // oneven

function createEmptyRoom() {
  return Array.from({ length: ROOM_HEIGHT }, () =>
    Array.from({ length: ROOM_WIDTH }, () => "wall")
  );
}

function carvePath(tiles, start, end) {
  let x = start.x;
  let y = start.y;
  tiles[y][x] = "path";
  while (x !== end.x || y !== end.y) {
    const dx = end.x - x;
    const dy = end.y - y;
    if (dx !== 0 && (Math.random() < 0.5 || dy === 0)) x += dx > 0 ? 1 : -1;
    else if (dy !== 0) y += dy > 0 ? 1 : -1;
    tiles[y][x] = "path";
  }
}

function addSidePaths(tiles, paths = 2) {
  for (let i = 0; i < paths; i++) {
    let startX = Math.floor(Math.random() * ROOM_WIDTH);
    let startY = Math.floor(Math.random() * ROOM_HEIGHT);
    if (tiles[startY][startX] !== "path") continue;
    let length = 1 + Math.floor(Math.random() * 3);
    let x = startX;
    let y = startY;
    for (let j = 0; j < length; j++) {
      let dir = Math.floor(Math.random() * 4);
      if (dir === 0 && x > 0) x--;
      if (dir === 1 && x < ROOM_WIDTH - 1) x++;
      if (dir === 2 && y > 0) y--;
      if (dir === 3 && y < ROOM_HEIGHT - 1) y++;
      if (tiles[y][x] === "wall") tiles[y][x] = "path";
    }
  }
}

function generateRoom(x, y) {
  const tiles = createEmptyRoom();

  const exits = {
    left: { x: 0, y: Math.floor(ROOM_HEIGHT / 2) },
    right: { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) },
    top: { x: Math.floor(ROOM_WIDTH / 2), y: 0 },
    bottom: { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 },
  };

  if (x === 0 && y === 0) {
    carvePath(tiles, { x: 0, y: 0 }, exits.right);
    carvePath(tiles, { x: 0, y: 0 }, exits.bottom);
    addSidePaths(tiles, 2);
    return {
      x,
      y,
      tiles,
      exits: { right: exits.right, bottom: exits.bottom },
      color: `hsl(${Math.random() * 360},50%,30%)`,
      discovered: true,
      isStart: true,
    };
  }

  // Andere kamers: altijd 4 uitgangen met minimaal 1 pad verbonden
  carvePath(tiles, exits.left, exits.right);
  carvePath(tiles, exits.top, exits.bottom);
  addSidePaths(tiles, 2);

  // Zorg dat alle uitgangen path zijn
  for (const dir of ["left", "right", "top", "bottom"]) {
    tiles[exits[dir].y][exits[dir].x] = "path";
  }

  return {
    x,
    y,
    tiles,
    exits,
    color: `hsl(${Math.random() * 360},50%,30%)`,
    discovered: false,
    isStart: false,
  };
}

function rotateRoom180(room) {
  if (room.isStart) return room;
  const newTiles = createEmptyRoom();
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      newTiles[ROOM_HEIGHT - 1 - y][ROOM_WIDTH - 1 - x] = room.tiles[y][x];
    }
  }
  const newExits = {
    left: { x: 0, y: ROOM_HEIGHT - 1 - room.exits.right.y },
    right: { x: ROOM_WIDTH - 1, y: ROOM_HEIGHT - 1 - room.exits.left.y },
    top: { x: ROOM_WIDTH - 1 - room.exits.bottom.x, y: 0 },
    bottom: { x: ROOM_WIDTH - 1 - room.exits.top.x, y: ROOM_HEIGHT - 1 },
  };
  return { ...room, tiles: newTiles, exits: newExits };
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
      if (e.key === "r" || e.key === "R") {
        setRooms((prevRooms) => {
          const updated = [...prevRooms];
          const current = updated[player.roomY][player.roomX];
          const rotated = rotateRoom180(current);
          const newX = ROOM_WIDTH - 1 - player.x;
          const newY = ROOM_HEIGHT - 1 - player.y;
          updated[player.roomY][player.roomX] = rotated;
          setPlayer({ ...player, x: newX, y: newY });
          return updated;
        });
        return;
      }

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

        const currentRoomExits = room.exits;

        // LEFT
        if (nx < 0 && currentRoomExits.left) {
          if (roomX > 0) {
            roomX -= 1;
            nx = ROOM_WIDTH - 1;
            ny = rooms[roomY][roomX].exits.right.y;
          } else if (!(roomX === 0 && roomY === BOARD_HEIGHT - 1)) {
            roomX = BOARD_WIDTH - 1;
            nx = ROOM_WIDTH - 1;
            ny = rooms[roomY][roomX].exits.right.y;
          } else return prev;
        }

        // RIGHT
        if (nx >= ROOM_WIDTH && currentRoomExits.right) {
          if (roomX < BOARD_WIDTH - 1) {
            roomX += 1;
            nx = 0;
            ny = rooms[roomY][roomX].exits.left.y;
          } else if (!(roomX === BOARD_WIDTH - 1 && roomY === 0)) {
            roomX = 0;
            nx = 0;
            ny = rooms[roomY][roomX].exits.left.y;
          } else return prev;
        }

        // UP
        if (ny < 0 && currentRoomExits.top) {
          if (roomY > 0) {
            roomY -= 1;
            ny = ROOM_HEIGHT - 1;
            nx = rooms[roomY][roomX].exits.bottom.x;
          } else return prev;
        }

        // DOWN
        if (ny >= ROOM_HEIGHT && currentRoomExits.bottom) {
          if (roomY < BOARD_HEIGHT - 1) {
            roomY += 1;
            ny = 0;
            nx = rooms[roomY][roomX].exits.top.x;
          } else return prev;
        }

        const newRoom = rooms[roomY][roomX];
        if (newRoom.tiles[ny]?.[nx] === "path") {
          newRoom.discovered = true;
          setRooms([...rooms]);
          return { roomX, roomY, x: nx, y: ny };
        }
        return prev;
      });
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rooms, player]);

  if (rooms.length === 0) return <div>Loading...</div>;

  return (
    <div className="board">
      {rooms.map((row, ry) =>
        row.map((room, rx) => (
          <div
            key={`${rx}-${ry}`}
            className="room"
            style={{ backgroundColor: room.discovered ? room.color : "#111" }}
          >
            {room.discovered &&
              room.tiles.map((r, y) =>
                r.map((tile, x) => {
                  const isPlayer =
                    player.roomX === rx &&
                    player.roomY === ry &&
                    player.x === x &&
                    player.y === y;
                  const isExit =
                    Object.values(room.exits).some(
                      (e) => e.x === x && e.y === y
                    );
                  return (
                    <div
                      key={`${x}-${y}`}
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
        ))
      )}
    </div>
  );
}
