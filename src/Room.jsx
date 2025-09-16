import React from "react";

export default function Room({ room, revealed, playerPos }) {
  const size = 15; // 15px per tegel

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${room.width}, ${size}px)`,
        gridTemplateRows: `repeat(${room.height}, ${size}px)`,
        background: revealed ? "#eee" : "#333"
      }}
    >
      {revealed &&
        room.tiles.map((row, y) =>
          row.map((tile, x) => {
            let color = tile === "wall" ? "#222" : "#ccc";

            // exits groen
            for (const dir of ["left", "right", "top", "bottom"]) {
              const exit = room.exits[dir];
              if (exit && exit.x === x && exit.y === y) {
                color = "#0f0";
              }
            }

            if (playerPos && playerPos.x === x && playerPos.y === y) {
              color = "red";
            }

            return (
              <div
                key={`${x},${y}`}
                style={{
                  width: size,
                  height: size,
                  background: color,
                  border: "1px solid #555"
                }}
              />
            );
          })
        )}
    </div>
  );
}
