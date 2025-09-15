import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BOARD_SIZE = 4;

function App() {
  const [board, setBoard] = useState([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const initBoard = Array.from({ length: BOARD_SIZE }, (_, y) =>
      Array.from({ length: BOARD_SIZE }, (_, x) => ({
        discovered: x === 0 && y === 0,
        x,
        y
      }))
    );
    setBoard(initBoard);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      setPlayerPos((prev) => {
        let { x, y } = prev;
        if (e.key === "ArrowUp") y = Math.max(y - 1, 0);
        if (e.key === "ArrowDown") y = Math.min(y + 1, BOARD_SIZE - 1);
        if (e.key === "ArrowLeft") x = Math.max(x - 1, 0);
        if (e.key === "ArrowRight") x = Math.min(x + 1, BOARD_SIZE - 1);
        setBoard((b) => {
          const newBoard = b.map((row) => row.map((tile) => ({ ...tile })));
          newBoard[y][x].discovered = true;
          return newBoard;
        });
        return { x, y };
      });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="board">
      {board.map((row, y) => (
        <div key={y} className="row">
          {row.map((tile, x) => (
            <div
              key={x}
              className={`tile ${tile.discovered ? "discovered" : ""} ${
                playerPos.x === x && playerPos.y === y ? "player" : ""
              }`}
            >
              {playerPos.x === x && playerPos.y === y ? "😃" : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default App;
