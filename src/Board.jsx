import React, { useState, useEffect, useRef } from "react";

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 10;
const TILE_SIZE = 30;
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;
const STEP_SIZE = 1;

function carvePath(tiles, ax, ay, bx, by) {
  let x = ax, y = ay;
  tiles[y][x] = "path";
  while (x !== bx || y !== by) {
    if (Math.random() < 0.5) {
      if (x < bx) x++; else if (x > bx) x--;
      else if (y < by) y++; else if (y > by) y--;
    } else {
      if (y < by) y++; else if (y > by) y--;
      else if (x < bx) x++; else if (x > bx) x--;
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
    exits.left = null;
    exits.top = null;
    tiles[0][0] = "path";
    carvePath(tiles, 0, 0, exits.right.x, exits.right.y);
    carvePath(tiles, 0, 0, exits.bottom.x, exits.bottom.y);
  } else {
    const availableExits = Object.keys(exits).filter(dir => exits[dir]);
    const shuffled = availableExits.sort(() => Math.random() - 0.5);
    carvePath(
      tiles,
      exits[shuffled[0]].x,
      exits[shuffled[0]].y,
      exits[shuffled[1]].x,
      exits[shuffled[1]].y
    );

    const extra = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < extra; i++) {
      const sx = Math.floor(Math.random() * ROOM_WIDTH);
      const sy = Math.floor(Math.random() * ROOM_HEIGHT);
      const ex = Math.floor(Math.random() * ROOM_WIDTH);
      const ey = Math.floor(Math.random() * ROOM_HEIGHT);
      carvePath(tiles, sx, sy, ex, ey);
    }

    for (const dir of ["left", "right", "top", "bottom"]) {
      if (exits[dir]) tiles[exits[dir].y][exits[dir].x] = "path";
    }
  }

  return { x, y, tiles, exits, color: `hsl(${Math.random() * 360},50%,30%)` };
}

export default function Board() {
  const canvasRef = useRef(null);
  const [board, setBoard] = useState(null);
  const [currentRoom, setCurrentRoom] = useState({ x: 0, y: 0 });
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [revealedRooms, setRevealedRooms] = useState(new Set(["0,0"]));
  const [roomStack, setRoomStack] = useState([]);

  // genereer board
  useEffect(() => {
    const newBoard = Array.from({ length: BOARD_HEIGHT }, (_, y) =>
      Array.from({ length: BOARD_WIDTH }, (_, x) => generateRoom(x, y))
    );
    setBoard(newBoard);
    setPlayerPos({ x: 0, y: 0 });
  }, []);

  // tekenen
  useEffect(() => {
    if (!board) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = vw;
    canvas.height = vh;

    // center op huidige kamer
    const room = board[currentRoom.y][currentRoom.x];
    const offsetX = vw / 2 - ROOM_WIDTH * TILE_SIZE / 2;
    const offsetY = vh / 2 - ROOM_HEIGHT * TILE_SIZE / 2;

    ctx.clearRect(0, 0, vw, vh);

    // teken alle kamers licht
    for (let by = 0; by < BOARD_HEIGHT; by++) {
      for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        const r = board[by][bx];
        const roomOffsetX = offsetX + (bx - currentRoom.x) * ROOM_WIDTH * TILE_SIZE;
        const roomOffsetY = offsetY + (by - currentRoom.y) * ROOM_HEIGHT * TILE_SIZE;

        // achtergrond
        ctx.fillStyle = r.color;
        ctx.fillRect(roomOffsetX, roomOffsetY, ROOM_WIDTH * TILE_SIZE, ROOM_HEIGHT * TILE_SIZE);

        for (let y = 0; y < ROOM_HEIGHT; y++) {
          for (let x = 0; x < ROOM_WIDTH; x++) {
            ctx.fillStyle = r.tiles[y][x] === "path" ? "#ccc" : "#222";
            ctx.fillRect(roomOffsetX + x * TILE_SIZE, roomOffsetY + y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }

        // exits
        for (const dir of ["left", "right", "top", "bottom"]) {
          const exit = r.exits[dir];
          if (exit) {
            ctx.fillStyle = "green";
            ctx.fillRect(
              roomOffsetX + exit.x * TILE_SIZE,
              roomOffsetY + exit.y * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE
            );
          }
        }

        // overlay onontdekt
        if (!revealedRooms.has(`${bx},${by}`)) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(roomOffsetX, roomOffsetY, ROOM_WIDTH * TILE_SIZE, ROOM_HEIGHT * TILE_SIZE);
        }
      }
    }

    // speler
    const spX = offsetX + playerPos.x * TILE_SIZE;
    const spY = offsetY + playerPos.y * TILE_SIZE;
    ctx.fillStyle = "red";
    ctx.fillRect(spX, spY, TILE_SIZE, TILE_SIZE);
  }, [board, playerPos, currentRoom, revealedRooms]);

  // beweging
  useEffect(() => {
    if (!board) return;
    function handleKey(e) {
      const room = board[currentRoom.y][currentRoom.x];
      let { x, y } = playerPos;

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
          const oppositeDir = dir === "left" ? "right" : dir === "right" ? "left" : dir === "top" ? "bottom" : "top";

          if (dir === "left") newRoomX = currentRoom.x > 0 ? currentRoom.x - 1 : BOARD_WIDTH - 1;
          if (dir === "right") newRoomX = currentRoom.x < BOARD_WIDTH - 1 ? currentRoom.x + 1 : 0;
          if (dir === "top") newRoomY = currentRoom.y > 0 ? currentRoom.y - 1 : BOARD_HEIGHT - 1;
          if (dir === "bottom") newRoomY = currentRoom.y < BOARD_HEIGHT - 1 ? currentRoom.y + 1 : 0;

          const newPos = { ...board[newRoomY][newRoomX].exits[oppositeDir] };
          if (board[newRoomY][newRoomX].tiles[newPos.y][newPos.x] === "wall")
            board[newRoomY][newRoomX].tiles[newPos.y][newPos.x] = "path";

          setRoomStack(prev => [...prev, { room: currentRoom, pos: playerPos }]);

          setCurrentRoom({ x: newRoomX, y: newRoomY });
          setPlayerPos(newPos);
          setRevealedRooms(prev => new Set(prev).add(`${newRoomX},${newRoomY}`));
        }
      }

      if (e.key === "Backspace" && roomStack.length > 0) {
        const last = roomStack[roomStack.length - 1];
        setCurrentRoom(last.room);
        setPlayerPos(last.pos);
        setRoomStack(prev => prev.slice(0, -1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [board, playerPos, currentRoom, roomStack]);

  return <canvas ref={canvasRef} style={{ display: "block", margin: 0, padding: 0 }} />;
}
