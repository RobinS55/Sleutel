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
  const lockedPaths = [];

  if (x === 0 && y === 0) {
    exits.left = null; exits.top = null;
    tiles[0][0] = "path";
    carvePath(tiles, 0, 0, exits.right.x, exits.right.y);
    carvePath(tiles, 0, 0, exits.bottom.x, exits.bottom.y);
    carvePath(tiles, Math.floor(ROOM_WIDTH/2), Math.floor(ROOM_HEIGHT/2),
                     Math.floor(ROOM_WIDTH/2)+2, Math.floor(ROOM_HEIGHT/2));
  } else {
    const availableExits = Object.keys(exits).filter(dir => exits[dir]);
    const shuffled = availableExits.sort(() => Math.random()-0.5);
    carvePath(tiles, exits[shuffled[0]].x, exits[shuffled[0]].y,
                     exits[shuffled[1]].x, exits[shuffled[1]].y);

    const extra = 1 + Math.floor(Math.random()*3);
    for (let i = 0; i < extra; i++) {
      const sx = Math.floor(Math.random()*ROOM_WIDTH);
      const sy = Math.floor(Math.random()*ROOM_HEIGHT);
      const ex = Math.floor(Math.random()*ROOM_WIDTH);
      const ey = Math.floor(Math.random()*ROOM_HEIGHT);
      carvePath(tiles, sx, sy, ex, ey);
    }

    for(const dir of ["left","right","top","bottom"]){
      if(exits[dir]) tiles[exits[dir].y][exits[dir].x] = "path";
    }
  }

  return { x, y, tiles, exits, lockedPaths, color:`hsl(${Math.random()*360},50%,30%)` };
}

export default function Board() {
  const canvasRef = useRef(null);

  const [board, setBoard] = useState(Array.from({ length: BOARD_HEIGHT }, ()=>Array.from({ length: BOARD_WIDTH }, ()=>null)));
  const [currentRoom, setCurrentRoom] = useState({x:0,y:0});
  const [playerPos, setPlayerPos] = useState({x:0,y:0});
  const [revealedRooms, setRevealedRooms] = useState(new Set(["0,0"]));
  const [roomHistory, setRoomHistory] = useState([]);

  // genereer bord
  useEffect(()=>{
    const newBoard = Array.from({ length: BOARD_HEIGHT }, (_,y)=>Array.from({ length: BOARD_WIDTH }, (_,x)=>generateRoom(x,y)));
    setBoard(newBoard);
  },[]);

  // canvas tekenen met scaling
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");

    // viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const totalWidth = BOARD_WIDTH * ROOM_WIDTH * TILE_SIZE;
    const totalHeight = BOARD_HEIGHT * ROOM_HEIGHT * TILE_SIZE;

    canvas.width = totalWidth;
    canvas.height = totalHeight;
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;

    const scaleX = vw / totalWidth;
    const scaleY = vh / totalHeight;
    ctx.save();
    ctx.scale(scaleX, scaleY);

    ctx.clearRect(0,0,totalWidth,totalHeight);

    for(let by=0;by<BOARD_HEIGHT;by++){
      for(let bx=0;bx<BOARD_WIDTH;bx++){
        const room = board[by][bx];
        if(!room) continue;

        const roomOffsetX = bx*ROOM_WIDTH*TILE_SIZE;
        const roomOffsetY = by*ROOM_HEIGHT*TILE_SIZE;

        // kamer achtergrond
        ctx.fillStyle = room.color;
        ctx.fillRect(roomOffsetX, roomOffsetY, ROOM_WIDTH*TILE_SIZE, ROOM_HEIGHT*TILE_SIZE);

        // tiles
        for(let y=0;y<ROOM_HEIGHT;y++){
          for(let x=0;x<ROOM_WIDTH;x++){
            let color = "#222";
            if(room.tiles[y][x]==="path") color="#ccc";
            ctx.fillStyle=color;
            ctx.beginPath();
            ctx.arc(roomOffsetX + x*TILE_SIZE + TILE_SIZE/2, roomOffsetY + y*TILE_SIZE + TILE_SIZE/2,
                    TILE_SIZE/2, 0, 2*Math.PI);
            ctx.fill();
          }
        }

        // highlight actieve kamer
        if(bx===currentRoom.x && by===currentRoom.y){
          ctx.strokeStyle="#fff";
          ctx.lineWidth=4;
          ctx.strokeRect(roomOffsetX, roomOffsetY, ROOM_WIDTH*TILE_SIZE, ROOM_HEIGHT*TILE_SIZE);
        }

        // onontdekte kamers donkerder overlay
        if(!revealedRooms.has(`${bx},${by}`)){
          ctx.fillStyle="rgba(0,0,0,0.5)";
          ctx.fillRect(roomOffsetX, roomOffsetY, ROOM_WIDTH*TILE_SIZE, ROOM_HEIGHT*TILE_SIZE);
        }
      }
    }

    // speler tekenen
    const spX = currentRoom.x*ROOM_WIDTH*TILE_SIZE + playerPos.x*TILE_SIZE;
    const spY = currentRoom.y*ROOM_HEIGHT*TILE_SIZE + playerPos.y*TILE_SIZE;
    ctx.fillStyle="red";
    ctx.fillRect(spX, spY, TILE_SIZE, TILE_SIZE);

    ctx.restore();
  }, [board, playerPos, currentRoom, revealedRooms]);

  // controls
  useEffect(()=>{
    function handleKey(e){
      const room = board[currentRoom.y][currentRoom.x];
      if(!room) return;
      let {x,y} = playerPos;

      if(e.key==="ArrowUp") y-=STEP_SIZE;
      if(e.key==="ArrowDown") y+=STEP_SIZE;
      if(e.key==="ArrowLeft") x-=STEP_SIZE;
      if(e.key==="ArrowRight") x+=STEP_SIZE;

      if(x<0 || y<0 || x>=ROOM_WIDTH || y>=ROOM_HEIGHT) return;
      if(room.tiles[y][x]==="wall") return;
      setPlayerPos({x,y});

      for(const dir of ["left","right","top","bottom"]){
        const exit = room.exits[dir];
        if(exit && exit.x===x && exit.y===y){
          let newRoomX=currentRoom.x;
          let newRoomY=currentRoom.y;
          const oppositeDir = dir==="left"?"right":dir==="right"?"left":dir==="top"?"bottom":"top";

          if(dir==="left") newRoomX = currentRoom.x>0? currentRoom.x-1 : BOARD_WIDTH-1;
          if(dir==="right") newRoomX = currentRoom.x<BOARD_WIDTH-1? currentRoom.x+1 : 0;
          if(dir==="top") newRoomY = currentRoom.y>0? currentRoom.y-1 : BOARD_HEIGHT-1;
          if(dir==="bottom") newRoomY = currentRoom.y<BOARD_HEIGHT-1? currentRoom.y+1 : 0;

          const newPos = {...board[newRoomY][newRoomX].exits[oppositeDir]};
          if(board[newRoomY][newRoomX].tiles[newPos.y][newPos.x]==="wall")
            board[newRoomY][newRoomX].tiles[newPos.y][newPos.x]="path";

          // history bijhouden
          setRoomHistory(prev => [...prev, {room: currentRoom, pos: playerPos}]);

          setCurrentRoom({x:newRoomX,y:newRoomY});
          setPlayerPos(newPos);
          setRevealedRooms(prev=>new Set(prev).add(`${newRoomX},${newRoomY}`));
        }
      }

      // open locked paths
      if(e.key===" "){
        room.lockedPaths.forEach(p => room.tiles[p.y][p.x]="path");
        room.lockedPaths.length=0;
        setBoard([...board]);
      }

      // teruggaan
      if(e.key==="Backspace" && roomHistory.length>0){
        const last = roomHistory[roomHistory.length-1];
        setCurrentRoom(last.room);
        setPlayerPos(last.pos);
        setRoomHistory(prev => prev.slice(0,-1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return ()=>window.removeEventListener("keydown", handleKey);
  }, [playerPos,currentRoom,board,roomHistory]);

  return <canvas ref={canvasRef} style={{display:"block"}} />;
}
