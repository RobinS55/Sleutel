import React, { useState, useEffect, useRef } from "react";

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 10;
const TILE_SIZE = 30;
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;
const STEP_SIZE = 1;

// grootte van het zichtbare scherm in tegels
const VIEW_WIDTH = 20;
const VIEW_HEIGHT = 12;

function generateRoom(x, y) {
  const tiles = Array.from({ length: ROOM_HEIGHT }, () =>
    Array.from({ length: ROOM_WIDTH }, () => "wall")
  );

  const mainPath = [];

  // Hoofdpad start altijd linksboven in de kamer
  let cx = 1;
  let cy = 1;
  tiles[cy][cx] = "path";
  mainPath.push({ x: cx, y: cy });

  // als dit de eerste kamer is (0,0): forceer rechts én beneden
  if (x === 0 && y === 0) {
    // pad naar rechts
    while (cx < ROOM_WIDTH - 2) {
      cx++;
      tiles[cy][cx] = "path";
      mainPath.push({ x: cx, y: cy });
    }
    // pad naar beneden
    while (cy < ROOM_HEIGHT - 2) {
      cy++;
      tiles[cy][cx] = "path";
      mainPath.push({ x: cx, y: cy });
    }
  } else {
    // normale kamer: pad eerst naar rechts, dan omlaag
    while (cx < ROOM_WIDTH - 2) {
      cx++;
      tiles[cy][cx] = "path";
      mainPath.push({ x: cx, y: cy });
    }
    while (cy < ROOM_HEIGHT - 2) {
      cy++;
      tiles[cy][cx] = "path";
      mainPath.push({ x: cx, y: cy });
    }
  }

  // zijpaden
  for (const p of mainPath) {
    if (Math.random() < 0.3) {
      let length = Math.floor(Math.random() * 3) + 1;
      let dir = Math.random() < 0.5 ? "vertical" : "horizontal";
      let sx = p.x;
      let sy = p.y;
      for (let i = 0; i < length; i++) {
        if (dir === "vertical") sy++;
        else sx++;
        if (sx >= ROOM_WIDTH - 1 || sy >= ROOM_HEIGHT - 1) break;
        tiles[sy][sx] = "path";
      }
    }
  }

  // exits
  const exits = {
    left: { x: 0, y: Math.floor(ROOM_HEIGHT / 2) },
    right: { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) },
    top: { x: Math.floor(ROOM_WIDTH / 2), y: 0 },
    bottom: { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 }
  };
  if (x === 0 && y === 0) {
    exits.left = null;
    exits.top = null;
  }

  if (exits.right) tiles[exits.right.y][exits.right.x] = "path";
  if (exits.bottom) tiles[exits.bottom.y][exits.bottom.x] = "path";

  return { x, y, tiles, exits };
}

export default function Board() {
  const canvasRef = useRef(null);
  const [board] = useState(() =>
    Array.from({ length: BOARD_HEIGHT }, (_, y) =>
      Array.from({ length: BOARD_WIDTH }, (_, x) => generateRoom(x, y))
    )
  );

  const [currentRoom, setCurrentRoom] = useState({ x: 0, y: 0 });
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [revealedRooms, setRevealedRooms] = useState(new Set(["0,0"]));

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // bereken wereldpositie van de speler
      const worldX = currentRoom.x * ROOM_WIDTH + playerPos.x;
      const worldY = currentRoom.y * ROOM_HEIGHT + playerPos.y;

      // viewport centreren rond speler
      const offsetX = worldX - Math.floor(VIEW_WIDTH / 2);
      const offsetY = worldY - Math.floor(VIEW_HEIGHT / 2);

      for (let ry = 0; ry < BOARD_HEIGHT; ry++) {
        for (let rx = 0; rx < BOARD_WIDTH; rx++) {
          const key = `${rx},${ry}`;
          if (!revealedRooms.has(key)) continue;

          const room = board[ry][rx];
          for (let y = 0; y < ROOM_HEIGHT; y++) {
            for (let x = 0; x < ROOM_WIDTH; x++) {
              let color = room.tiles[y][x] === "wall" ? "#222" : "#ccc";
              for (const dir of ["left", "right", "top", "bottom"]) {
                const exit = room.exits[dir];
                if (exit && exit.x === x && exit.y === y) color = "#0f0";
              }

              const worldTileX = rx * ROOM_WIDTH + x;
              const worldTileY = ry * ROOM_HEIGHT + y;

              // alleen tekenen wat binnen de viewport valt
              if (
                worldTileX >= offsetX &&
                worldTileX < offsetX + VIEW_WIDTH &&
                worldTileY >= offsetY &&
                worldTileY < offsetY + VIEW_HEIGHT
              ) {
                const px = (worldTileX - offsetX) * TILE_SIZE;
                const py = (worldTileY - offsetY) * TILE_SIZE;
                ctx.fillStyle = color;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              }
            }
          }
        }
      }

      // speler tekenen in viewport
      const px = (worldX - offsetX) * TILE_SIZE;
      const py = (worldY - offsetY) * TILE_SIZE;
      ctx.fillStyle = "red";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    }

    draw();
  }, [board, playerPos, currentRoom, revealedRooms]);

  useEffect(() => {
    function handleKey(e) {
      let { x, y } = playerPos;
      const room = board[currentRoom.y][currentRoom.x];

      if (e.key === "ArrowUp") y -= STEP_SIZE;
      if (e.key === "ArrowDown") y += STEP_SIZE;
      if (e.key === "ArrowLeft") x -= STEP_SIZE;
      if (e.key === "ArrowRight") x += STEP_SIZE;

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
            newRoomX = Math.max(0, currentRoom.x - 1);
            newPos = { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) };
          }
          if (dir === "right") {
            newRoomX = Math.min(BOARD_WIDTH - 1, currentRoom.x + 1);
            newPos = { x: 0, y: Math.floor(ROOM_HEIGHT / 2) };
          }
          if (dir === "top") {
            newRoomY = Math.max(0, currentRoom.y - 1);
            newPos = { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 };
          }
          if (dir === "bottom") {
            newRoomY = Math.min(BOARD_HEIGHT - 1, currentRoom.y + 1);
            newPos = { x: Math.floor(ROOM_WIDTH / 2), y: 0 };
          }

          setCurrentRoom({ x: newRoomX, y: newRoomY });
          setPlayerPos(newPos);
          const key = `${newRoomX},${newRoomY}`;
          setRevealedRooms((prev) => new Set(prev).add(key));
        }
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [playerPos, currentRoom, board]);

  return (
    <canvas
      ref={canvasRef}
      width={VIEW_WIDTH * TILE_SIZE}
      height={VIEW_HEIGHT * TILE_SIZE}
    />
  );
}
