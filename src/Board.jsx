import React, { useState, useEffect } from "react";

const ROOM_WIDTH = 12;   // kamer 2x zo breed als hoog
const ROOM_HEIGHT = 6;
const TILE_SIZE = 40;

const BOARD_WIDTH = 4;   // aantal kamers horizontaal
const BOARD_HEIGHT = 4;  // aantal kamers verticaal

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

  if (x === 0 && y === 0) {
    // startkamer
    exits.left = null;
    exits.top = null;
    tiles[0][0] = "path";
    carvePath(tiles, 0, 0, exits.right.x, exits.right.y);
    carvePath(tiles, 0, 0, exits.bottom.x, exits.bottom.y);
  } else {
    // kies minimaal 2 exits
    const availableExits = Object.keys(exits).filter((dir) => exits[dir]);
    const shuffled = availableExits.sort(() => Math.random() - 0.5);

    carvePath(
      tiles,
      exits[shuffled[0]].x,
      exits[shuffled[0]].y,
      exits[shuffled[1]].x,
      exits[shuffled[1]].y
    );

    // meer paden, slingers en doodlopers
    const extraPaths = 3 + Math.floor(Math.random() * 5); // 3-7 extra paden
    for (let i = 0; i < extraPaths; i++) {
      const sx = Math.floor(Math.random() * ROOM_WIDTH);
      const sy = Math.floor(Math.random() * ROOM_HEIGHT);
      const ex = Math.floor(Math.random() * ROOM_WIDTH);
      const ey = Math.floor(Math.random() * ROOM_HEIGHT);
      carvePath(tiles, sx, sy, ex, ey);
    }

    // exits altijd open
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
    discovered: x === 0 && y === 0, // startkamer zichtbaar
  };
}

export default function Board() {
  const [rooms, setRooms] = useState(new Map());
  const [player, setPlayer] = useState({ roomX: 0, roomY: 0, x: 0, y: 0 });

  useEffect(() => {
    const startRoom = generateRoom(0, 0);
    setRooms(new Map([[`0,0`, startRoom]]));
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      setPlayer((prev) => {
        const keyMap = {
          ArrowUp: { dx: 0, dy: -1 },
          ArrowDown: { dx: 0, dy: 1 },
          ArrowLeft: { dx: -1, dy: 0 },
          ArrowRight: { dx: 1, dy: 0 },
        };
        if (!(e.key in keyMap)) return prev;

        const { dx, dy } = keyMap[e.key];
        const roomKey = `${prev.roomX},${prev.roomY}`;
        const currentRoom = rooms.get(roomKey);
        if (!currentRoom) return prev;

        const newX = prev.x + dx;
        const newY = prev.y + dy;

        // beweging binnen kamer
        if (
          newX >= 0 &&
          newX < ROOM_WIDTH &&
          newY >= 0 &&
          newY < ROOM_HEIGHT &&
          currentRoom.tiles[newY][newX] === "path"
        ) {
          return { ...prev, x: newX, y: newY };
        }

        // kamerwissel
        for (const [dir, exit] of Object.entries(currentRoom.exits)) {
          if (exit && prev.x === exit.x && prev.y === exit.y) {
            let newRoomX = prev.roomX;
            let newRoomY = prev.roomY;
            if (dir === "left") newRoomX--;
            if (dir === "right") newRoomX++;
            if (dir === "top") newRoomY--;
            if (dir === "bottom") newRoomY++;

            const newRoomKey = `${newRoomX},${newRoomY}`;
            let newRoom = rooms.get(newRoomKey);
            if (!newRoom) {
              newRoom = generateRoom(newRoomX, newRoomY);
              setRooms((prevRooms) => {
                const updated = new Map(prevRooms);
                updated.set(newRoomKey, { ...newRoom, discovered: true });
                return updated;
              });
            } else {
              newRoom.discovered = true;
            }

            let newPlayerPos = { x: exit.x, y: exit.y };
            if (dir === "left") {
              newPlayerPos = { x: newRoom.exits.right.x, y: newRoom.exits.right.y };
            }
            if (dir === "right") {
              newPlayerPos = { x: newRoom.exits.left.x, y: newRoom.exits.left.y };
            }
            if (dir === "top") {
              newPlayerPos = { x: newRoom.exits.bottom.x, y: newRoom.exits.bottom.y };
            }
            if (dir === "bottom") {
              newPlayerPos = { x: newRoom.exits.top.x, y: newRoom.exits.top.y };
            }

            return { roomX: newRoomX, roomY: newRoomY, ...newPlayerPos };
          }
        }

        return prev;
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rooms]);

  const activeRoomKey = `${player.roomX},${player.roomY}`;
  const activeRoom = rooms.get(activeRoomKey);

  return (
    <svg
      width="100%"
      height="100vh"
      style={{ background: "black", display: "block" }}
      viewBox={`0 0 ${BOARD_WIDTH * ROOM_WIDTH * TILE_SIZE} ${
        BOARD_HEIGHT * ROOM_HEIGHT * TILE_SIZE
      }`}
    >
      {Array.from(rooms.values()).map((room) =>
        room.discovered ? (
          <g
            key={`${room.x},${room.y}`}
            transform={`translate(${room.x * ROOM_WIDTH * TILE_SIZE}, ${
              room.y * ROOM_HEIGHT * TILE_SIZE
            })`}
          >
            {room.tiles.map((row, y) =>
              row.map((tile, x) => {
                const isExit = Object.values(room.exits).some(
                  (e) => e && e.x === x && e.y === y
                );
                return (
                  <rect
                    key={`${x},${y}`}
                    x={x * TILE_SIZE}
                    y={y * TILE_SIZE}
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    fill={
                      isExit
                        ? "green"
                        : tile === "wall"
                        ? room.color
                        : "black"
                    }
                    stroke="gray"
                    strokeWidth={1}
                  />
                );
              })
            )}
          </g>
        ) : null
      )}

      {activeRoom && (
        <rect
          x={activeRoom.x * ROOM_WIDTH * TILE_SIZE}
          y={activeRoom.y * ROOM_HEIGHT * TILE_SIZE}
          width={ROOM_WIDTH * TILE_SIZE}
          height={ROOM_HEIGHT * TILE_SIZE}
          fill="none"
          stroke="white"
          strokeWidth={3}
        />
      )}

      <circle
        cx={player.roomX * ROOM_WIDTH * TILE_SIZE + player.x * TILE_SIZE + TILE_SIZE / 2}
        cy={player.roomY * ROOM_HEIGHT * TILE_SIZE + player.y * TILE_SIZE + TILE_SIZE / 2}
        r={TILE_SIZE / 3}
        fill="yellow"
      />
    </svg>
  );
}
