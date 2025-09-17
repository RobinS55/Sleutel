import React, { useState, useEffect, useRef } from "react";

const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 10;
const TILE_SIZE = 30;
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;
const STEP_SIZE = 1;

// genereer een pad tussen twee punten
function carvePath(tiles, ax, ay, bx, by) {
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

// genereer een enkele kamer
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

  const lockedPaths = [];

  // startkamer linksboven
  if (x === 0 && y === 0) {
    exits.left = null;
    exits.top = null;

    const startX = 0;
    const startY = 0;
    tiles[startY][startX] = "path";

    // verbindingspaden naar recht en onder
    carvePath(tiles, startX, startY, exits.right.x, exits.right.y);
    carvePath(tiles, startX, startY, exits.bottom.x, exits.bottom.y);

    // extra zijpad
    tiles[Math.floor(ROOM_HEIGHT/2)][Math.floor(ROOM_WIDTH/2)] = "path";
  } else {
    // willekeurige twee exits verbinden
    const availableExits = Object.keys(exits).filter(dir => exits[dir]);
    if (availableExits.length >= 2) {
      const a = exits[availableExits[0]];
      const b = exits[availableExits[1]];
      carvePath(tiles, a.x, a.y, b.x, b.y);
    }

    // optioneel locked pad
    if (Math.random() < 0.5) {
      const lx = Math.floor(Math.random() * ROOM_WIDTH);
      const ly = Math.floor(Math.random() * ROOM_HEIGHT);
      if (tiles[ly][lx] === "wall") {
        tiles[ly][lx] = "locked";
        lockedPaths.push({ x: lx, y: ly });
      }
    }

    for (const dir of ["left", "right", "top", "bottom"]) {
      if (exits[dir]) tiles[exits[dir].y][exits[dir].x] = "path";
    }
  }

  return { x, y, tiles, exits, lockedPaths, color: `hsl(${Math.random()*360},50%,30%)` };
}

export default function Board() {
  const canvasRef = useRef(null);
  const [board, setBoard] = useState(
    Array.from({ length: BOARD_HEIGHT }, () =>
      Array.from({ length: BOARD_WIDTH }, () => null)
    )
  );

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

  const [currentRoom, setCurrentRoom] = useState({ x:0, y:0 });
  const [playerPos, setPlayerPos] = useState({ x:0, y:0 });
  const [revealedRooms, setRevealedRooms] = useState(new Set(["0,0"]));

  // tekenen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const totalWidth = BOARD_WIDTH * ROOM_WIDTH * TILE_SIZE;
    const totalHeight = BOARD_HEIGHT * ROOM_HEIGHT * TILE_SIZE;
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    ctx.clearRect(0,0,totalWidth,totalHeight);

    for (let by=0; by<BOARD_HEIGHT; by++) {
      for (let bx=0; bx<BOARD_WIDTH; bx++) {
        const room = board[by][bx];
        if (!room) continue;

        const offsetX = bx * ROOM_WIDTH * TILE_SIZE;
        const offsetY = by * ROOM_HEIGHT * TILE_SIZE;

        // niet-verkende kamers donkerder
        if (!revealedRooms.has(`${bx},${by}`)) {
          ctx.fillStyle = "#111";
          ctx.fillRect(offsetX, offsetY, ROOM_WIDTH*TILE_SIZE, ROOM_HEIGHT*TILE_SIZE);
        }

        // kamerachtergrond kleur
        ctx.fillStyle = room.color;
        ctx.fillRect(offsetX, offsetY, ROOM_WIDTH*TILE_SIZE, ROOM_HEIGHT*TILE_SIZE);

        for (let y=0; y<ROOM_HEIGHT; y++) {
          for (let x=0; x<ROOM_WIDTH; x++) {
            let color = "#222";
            if (room.tiles[y][x] === "path") color = "#ccc";
            if (room.tiles[y][x] === "locked") color = "#888";

            for (const dir of ["left","right","top","bottom"]) {
              const exit = room.exits[dir];
              if (exit && exit.x===x && exit.y===y) color = "#0f0";
            }

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(offsetX+x*TILE_SIZE+TILE_SIZE/2, offsetY+y*TILE_SIZE+TILE_SIZE/2);
            ctx.arc(offsetX+x*TILE_SIZE+TILE_SIZE/2, offsetY+y*TILE_SIZE+TILE_SIZE/2, TILE_SIZE/2,0,2*Math.PI);
            ctx.fill();
          }
        }

        // highlight actieve kamer
        if (bx === currentRoom.x && by === currentRoom.y) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.strokeRect(offsetX, offsetY, ROOM_WIDTH*TILE_SIZE, ROOM_HEIGHT*TILE_SIZE);
        }
      }
    }

    // speler
    const spX = currentRoom.x * ROOM_WIDTH*TILE_SIZE + playerPos.x*TILE_SIZE;
    const spY = currentRoom.y * ROOM_HEIGHT*TILE_SIZE + playerPos.y*TILE_SIZE;
    ctx.fillStyle = "red";
    ctx.fillRect(spX, spY, TILE_SIZE, TILE_SIZE);

  }, [board, playerPos, currentRoom, revealedRooms]);

  // controls
  useEffect(() => {
    function handleKey(e) {
      const room = board[currentRoom.y][currentRoom.x];
      if (!room) return;

      let {x,y} = playerPos;

      if (e.key === "ArrowUp") y -= STEP_SIZE;
      if (e.key === "ArrowDown") y += STEP_SIZE;
      if (e.key === "ArrowLeft") x -= STEP_SIZE;
      if (e.key === "ArrowRight") x += STEP_SIZE;

      if (x<0 || y<0 || x>=ROOM_WIDTH || y>=ROOM_HEIGHT) return;
      if (room.tiles[y][x]==="wall") return;

      setPlayerPos({x,y});

      // check exits
      for (const dir of ["left","right","top","bottom"]) {
        const exit = room.exits[dir];
        if (exit && exit.x===x && exit.y===y) {
          let newRoomX = currentRoom.x;
          let newRoomY = currentRoom.y;
          let newPos = {x,y};

          if (dir==="left" && currentRoom.x>0) {
            newRoomX--;
            newPos = {x:ROOM_WIDTH-2, y:exit.y};
          }
          if (dir==="right" && currentRoom.x<BOARD_WIDTH-1) {
            newRoomX++;
            newPos = {x:1, y:exit.y};
          }
          if (dir==="top" && currentRoom.y>0) {
            newRoomY--;
            newPos = {x:exit.x, y:ROOM_HEIGHT-2};
          }
          if (dir==="bottom" && currentRoom.y<BOARD_HEIGHT-1) {
            newRoomY++;
            newPos = {x:exit.x, y:1};
          }

          setCurrentRoom({x:newRoomX, y:newRoomY});
          setPlayerPos(newPos);
          setRevealedRooms(prev => new Set(prev).add(`${newRoomX},${newRoomY}`));
        }
      }

      // open locked paths
      if (e.key===" ") {
        room.lockedPaths.forEach(p => room.tiles[p.y][p.x]="path");
        room.lockedPaths.length=0;
        setBoard([...board]);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [playerPos, currentRoom, board]);

  return <canvas ref={canvasRef}/>;
}
