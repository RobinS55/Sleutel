import React from "react";

export default function Room({ room, revealed, playerPos }) {
  const TILE_SIZE = 30;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${room.width}, ${TILE_SIZE}px)`,
        gridTemplateRows: `repeat(${room.height}, ${TILE_SIZE}px)`
      }}
    >
      {revealed &&
        room.tiles.map((row, y) =>
          row.map((tile, x) => {
            let color = tile === "wall" ? "#222" : "#ccc";

            for (const dir of ["left", "right", "top", "bottom"]) {
              const exit = room.exits[dir];
              if (exit && exit.x === x && exit.y === y) color = "#0f0";
            }

            if (playerPos && playerPos.x === x && playerPos.y === y) color = "red";

            return (
              <div
                key={`${x},${y}`}
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  background: color,
                  border: "1px solid #555",
                  boxSizing: "border-box"
                }}
              />
            );
          })
        )}
    </div>
  );
}
