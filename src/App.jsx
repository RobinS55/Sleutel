import React, { useState, useEffect } from "react";

// Room grootte
const ROOM_SIZE = 20;

// Genereer een room met een pad en enkele doodlopende paden
function generateRoom() {
  const tiles = Array.from({ length: ROOM_SIZE }, (_, y) =>
    Array.from({ length: ROOM_SIZE }, (_, x) => ({
      x,
      y,
      type: 'wall',
      discovered: false
    }))
  );

  // Willekeurig pad van linksboven naar rechtsonder
  let cx = 0;
  let cy = 0;
  while (cx < ROOM_SIZE && cy < ROOM_SIZE) {
    tiles[cy][cx].type = 'path';

    if (Math.random() < 0.5 && cx < ROOM_SIZE - 1) cx++;
    else if (cy < ROOM_SIZE - 1) cy++;
    else cx++;
  }

  // Voeg enkele doodlopende paden toe
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * ROOM_SIZE);
    const y = Math.floor(Math.random() * ROOM_SIZE);
    if (tiles[y][x].type === 'wall') {
      tiles[y][x].type = 'deadend';
    }
  }

  return { tiles, width: ROOM_SIZE, height: ROOM_SIZE };
}

// Room component
function Room({ room, playerPos }) {
  const TILE_SIZE = 40; // pixels per tile

  return (
    <div
      className="room"
      style={{
        width: room.width * TILE_SIZE,
        height: room.height * TILE_SIZE,
        overflow: 'auto',
        border: '2px solid black',
        position: 'relative'
      }}
    >
      {room.tiles.map((row, y) =>
        row.map((tile, x) => (
          <div
            key={`${x}-${y}`}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              position: 'absolute',
              top: y * TILE_SIZE,
              left: x * TILE_SIZE,
              backgroundColor:
                playerPos.x === x && playerPos.y === y
                  ? 'yellow'
                  : tile.type === 'path'
                  ? 'lightgreen'
                  : tile.type === 'deadend'
                  ? 'red'
                  : 'gray',
              border: '1px solid black',
              boxSizing: 'border-box'
            }}
          />
        ))
      )}
    </div>
  );
}

// App component
export default function App() {
  const [room] = useState(() => generateRoom());
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKey = (e) => {
      setPlayerPos((prev) => {
        let { x, y } = prev;
        let nx = x;
        let ny = y;

        if (e.key === "ArrowUp") ny = Math.max(y - 1, 0);
        if (e.key === "ArrowDown") ny = Math.min(y + 1, ROOM_SIZE - 1);
        if (e.key === "ArrowLeft") nx = Math.max(x - 1, 0);
        if (e.key === "ArrowRight") nx = Math.min(x + 1, ROOM_SIZE - 1);

        // alleen bewegen op path of deadend
        const target = room.tiles[ny][nx];
        if (target.type === 'path' || target.type === 'deadend') {
          // markeer ontdekt
          target.discovered = true;
          return { x: nx, y: ny };
        }
        return prev;
      });
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [room]);

  return <Room room={room} playerPos={playerPos} />;
}
