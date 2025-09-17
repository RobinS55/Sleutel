import React, { useState, useEffect, useRef } from "react";

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 10;
const TILE_SIZE = 30;
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;
const STEP_SIZE = 1;

const VIEW_WIDTH = 20;
const VIEW_HEIGHT = 12;

function generateRoom(x, y) {
  // init grid = walls
  const tiles = Array.from({ length: ROOM_HEIGHT }, () =>
    Array.from({ length: ROOM_WIDTH }, () => "wall")
  );

  const exits = {
    left: { x: 0, y: Math.floor(ROOM_HEIGHT / 2) },
    right: { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) },
    top: { x: Math.floor(ROOM_WIDTH / 2), y: 0 },
    bottom: { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 },
  };

  // startkamer: alleen rechts en onder
  if (x === 0 && y === 0) {
    exits.left = null;
    exits.top = null;
  }

  // helper: carve een recht pad van A naar B
  function carvePath(ax, ay, bx, by) {
    let x = ax;
    let y = ay;
    tiles[y][x] = "path";
    while (x !== bx || y !== by) {
      if (x < bx) x++;
      else if (x > bx) x--;
      else if (y < by) y++;
      else if (y > by) y--;
      tiles[y][x] = "path";
    }
  }

  // --- hoofdpad ---
  if (x === 0 && y === 0) {
    // eerste kamer → rechts en onder
    carvePath(1, 1, exits.right.x - 1, exits.right.y);
    carvePath(1, 1, exits.bottom.x, exits.bottom.y - 1);
  } else {
    // kies 2 willekeurige exits
    const all = Object.keys(exits).filter((k) => exits[k]);
    const e1 = exits[all[Math.floor(Math.random() * all.length)]];
    let e2 = e1;
    while (e2 === e1) {
      e2 = exits[all[Math.floor(Math.random() * all.length)]];
    }
    carvePath(e1.x, e1.y, e2.x, e2.y);
  }

  // open exits zelf
  for (const dir of ["left", "right", "top", "bottom"]) {
    const exit = exits[dir];
    if (exit) {
      tiles[exit.y][exit.x] = "path";
    }
  }

  // extra doodlopende paadjes
  for (let i = 0; i < 3; i++) {
    const px = Math.floor(Math.random() * ROOM_WIDTH);
    const py = Math.floor(Math.random() * ROOM_HEIGHT);
    if (tiles[py][px] === "path") {
      let len = Math.floor(Math.random() * 5) + 2;
      let dir = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ][Math.floor(Math.random() * 4)];
      let nx = px;
      let ny = py;
      while (
        len-- > 0 &&
        nx > 0 &&
        ny > 0 &&
        nx < ROOM_WIDTH - 1 &&
        ny < ROOM_HEIGHT - 1
      ) {
        nx += dir[0];
        ny += dir[1];
        tiles[ny][nx] = "path";
      }
    }
  }

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

  // tekenen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const worldX = currentRoom.x * ROOM_WIDTH + playerPos.x;
    const worldY = currentRoom.y * ROOM_HEIGHT + playerPos.y;

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

    // speler
    const px = (worldX - offsetX) * TILE_SIZE;
    const py = (worldY - offsetY) * TILE_SIZE;
    ctx.fillStyle = "red";
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  }, [board, playerPos, currentRoom, revealedRooms]);

  // controls
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

      // exits check
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
