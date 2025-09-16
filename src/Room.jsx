import React from "react";

export default function Room({ room, revealed, playerPos, offset }) {
  const TILE_SIZE = 30;

  return (
    <>
      {revealed &&
        room.tiles.map((row, y) =>
          row.map((tile, x) => {
            const globalX = x + offset.x;
            const globalY = y + offset.y;
            let color = tile === "wall" ? "#222" : "#ccc";

            for (const dir of ["left", "right", "top", "bottom"]) {
              const exit = room.exits[dir];
              if (exit && exit.x === x && exit.y === y) {
                color = "#0f0";
              }
            }

            if (playerPos && playerPos.x === globalX && playerPos.y === globalY) {
              color = "red";
            }

            return (
              <div
                key={`${globalX},${globalY}`}
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  background: color,
                  boxSizing: "border-box",
                  border: "1px solid #555"
                }}
              />
            );
          })
        )}
    </>
  );
}
