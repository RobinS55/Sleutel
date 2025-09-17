import React, { useState, useEffect, useRef } from "react";

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 10;
const TILE_SIZE = 30;
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;
const STEP_SIZE = 1;

function carvePath(tiles, ax, ay, bx, by) {
  // slingeren: stap voor stap horizontaal/verticaal random
  let x = ax;
  let y = ay;
  tiles[y][x] = "path";
  while (x !== bx || y !== by) {
    if (Math.random() < 0.5) {
      if (x < bx) x++;
      else if (x > bx) x--;
      else if (y < by) y++;
      else if (y > by) y--;
    } else {
      if (y < by) y++;
      else if (y > by) y--;
      else if (x < bx) x++;
      else if (x > bx) x--;
    }
    tiles[y][x] = "path";
  }
}

function generateRoom(x, y, board) {
  const tiles = Array.from({ length: ROOM_HEIGHT }, () =>
    Array.from({ length: ROOM_WIDTH }, () => "wall")
  );

  const exits = {
    left: { x: 0, y: Math.floor(ROOM_HEIGHT / 2) },
    right: { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) },
    top: { x: Math.floor(ROOM_WIDTH / 2), y: 0 },
    bottom: { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 },
  };

  // Speciale regel: eerste kamer heeft alleen rechts en onder open
  if (x === 0 && y === 0) {
    exits.left = null;
    exits.top = null;
  }

  // verbind met buurkamers zodat je terug kan
  if (x > 0 && board[y][x - 1]?.exits.right) {
    exits.left = { ...exits.left };
  }
  if (y > 0 && board[y - 1][x]?.exits.bottom) {
    exits.top = { ...exits.top };
  }

  // kies altijd minimaal 2 exits om een pad te maken
  const validExits = Object.values(exits).filter(Boolean);
  if (validExits.length >= 2) {
    const e1 = validExits[0];
    const e2 = validExits[1];
    carvePath(tiles, e1.x, e1.y, e2.x, e2.y);
  }

  // open exits zelf
  for (const dir of ["left", "right", "top", "bottom"]) {
    if (exits[dir]) {
      tiles[exits[dir].y][exits[dir].x] = "path";
    }
  }

  // extra doodlopende slingerpaden
  for (let i = 0; i < 2; i++) {
    const px = Math.floor(Math.random() * ROOM_WIDTH);
    const py = Math.floor(Math.random() * ROOM_HEIGHT);
    if (tiles[py][px] === "path") {
      let len = Math.floor(Math.random() * 6) + 3;
      let nx = px;
      let ny = py;
      while (
        len-- > 0 &&
        nx > 1 &&
        ny > 1 &&
        nx < ROOM_WIDTH - 2 &&
        ny < ROOM_HEIGHT - 2
      ) {
        tiles[ny][nx] = "path";
        if (Math.random() < 0.5) nx += Math.random() < 0.5 ? 1 : -1;
        else ny += Math.random() < 0.5 ? 1 : -1;
      }
    }
  }

  return { x, y, tiles, exits };
}

export default function Board() {
  const canvasRef = useRef(null);
  const [board, setBoard] = useState(() =>
    Array.from({ length: BOARD_HEIGHT }, (_, y) =>
      Array.from({ length: BOARD_WIDTH }, (_, x) => null)
    )
  );

  // vul board met kamers die elkaar kennen
  useEffect(() => {
    const newBoard = Array.from({ length: BOARD_HEIGHT }, (_, y) =>
      Array.from({ length: BOARD_WIDTH }, (_, x) => null)
    );
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        newBoard[y][x] = generateRoom(x, y, newBoard);
      }
    }
    setBoard(newBoard);
  }, []);

  const [currentRoom, setCurrentRoom] = useState({ x: 0, y: 0 });
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [revealedRooms, setRevealedRooms] = useState(new Set(["0,0"]));

  // tekenen: altijd hele kamer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !board[currentRoom.y][currentRoom.x]) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const room = board[currentRoom.y][currentRoom.x];
    for (let y = 0; y < ROOM_HEIGHT; y++) {
      for (let x = 0; x < ROOM_WIDTH; x++) {
        let color = room.tiles[y][x] === "wall" ? "#222" : "#ccc";

        // exits groen
        for (const dir of ["left", "right", "top", "bottom"]) {
          const exit = room.exits[dir];
          if (exit && exit.x === x && exit.y === y) color = "#0f0";
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // speler
    ctx.fillStyle = "red";
    ctx.fillRect(
      playerPos.x * TILE_SIZE,
      playerPos.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  }, [board, playerPos, currentRoom, revealedRooms]);

  // controls
  useEffect(() => {
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
          let newPos = { x, y };

          if (dir === "left" && currentRoom.x > 0) {
            newRoomX--;
            newPos = { x: ROOM_WIDTH - 2, y: exit.y };
          }
          if (dir === "right" && currentRoom.x < BOARD_WIDTH - 1) {
            newRoomX++;
            newPos = { x: 1, y: exit.y };
          }
          if (dir === "top" && currentRoom.y > 0) {
            newRoomY--;
            newPos = { x: exit.x, y: ROOM_HEIGHT - 2 };
          }
          if (dir === "bottom" && currentRoom.y < BOARD_HEIGHT - 1) {
            newRoomY++;
            newPos = { x: exit.x, y: 1 };
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
      width={ROOM_WIDTH * TILE_SIZE}
      height={ROOM_HEIGHT * TILE_SIZE}
    />
  );
}
