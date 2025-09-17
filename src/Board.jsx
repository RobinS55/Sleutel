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

  if (x === 0 && y === 0) {
    // Eerste kamer: startpunt linksboven
    tiles[0][0] = "path";
    carvePath(tiles, 0, 0, exits.right.x, exits.right.y);
    carvePath(tiles, 0, 0, exits.bottom.x, exits.bottom.y);
    tiles[exits.right.y][exits.right.x] = "path";
    tiles[exits.bottom.y][exits.bottom.x] = "path";

    return {
      x,
      y,
      tiles,
      exits,
      color: `hsl(${Math.random() * 360},50%,25%)`,
      discovered: true,
    };
  }

  // Andere kamers: altijd 4 uitgangen
  const exitKeys = ["left", "right", "top", "bottom"];
  // minstens 2 verbonden
  const [exit1, exit2] = exitKeys.sort(() => Math.random() - 0.5);
  carvePath(tiles, exits[exit1].x, exits[exit1].y, exits[exit2].x, exits[exit2].y);

  const extraPaths = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < extraPaths; i++) {
    const ex = Math.floor(Math.random() * ROOM_WIDTH);
    const ey = Math.floor(Math.random() * ROOM_HEIGHT);
    const chosenExit = exits[exitKeys[i % exitKeys.length]];
    carvePath(tiles, chosenExit.x, chosenExit.y, ex, ey);
  }

  // Alle 4 exits altijd zichtbaar
  for (const dir of exitKeys) {
    tiles[exits[dir].y][exits[dir].x] = "path";
  }

  return {
    x,
    y,
    tiles,
    exits,
    color: `hsl(${Math.random() * 360},50%,25%)`,
    discovered: false,
  };
}

function rotateRoom180(room) {
  const newTiles = Array.from({ length: ROOM_HEIGHT }, () =>
    Array.from({ length: ROOM_WIDTH }, () => "wall")
  );

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

        // kamer wissel
        if (ny < 0 && nx === room.exits.top.x) {
          if (roomY > 0) {
            roomY -= 1;
            ny = ROOM_HEIGHT - 1;
            nx = rooms[roomY][roomX].exits.bottom.x;
          } else return prev;
        }
        if (ny >= ROOM_HEIGHT && nx === room.exits.bottom.x) {
          if (roomY < BOARD_HEIGHT - 1) {
            roomY += 1;
            ny = 0;
            nx = rooms[roomY][roomX].exits.top.x;
          } else return prev;
        }
        if (nx < 0 && ny === room.exits.left.y) {
          if (roomX > 0) {
            roomX -= 1;
            nx = ROOM_WIDTH - 1;
            ny = rooms[roomY][roomX].exits.right.y;
          } else return prev;
        }
        if (nx >= ROOM_WIDTH && ny === room.exits.right.y) {
          if (roomX < BOARD_WIDTH - 1) {
            roomX += 1;
            nx = 0;
            ny = rooms[roomY][roomX].exits.left.y;
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
                      (room.exits.left.x === x && room.exits.left.y === y) ||
                      (room.exits.right.x === x && room.exits.right.y === y) ||
                      (room.exits.top.x === x && room.exits.top.y === y) ||
                      (room.exits.bottom.x === x && room.exits.bottom.y === y);
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
