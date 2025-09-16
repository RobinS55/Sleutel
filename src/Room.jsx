import React from "react";

export default function Room({ room, revealed, playerPos }) {
  const size = 10; // px per tile

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${room.width}, ${size}px)`,
        gridTemplateRows: `repeat(${room.height}, ${size}px)`,
        margin: 4,
        background: revealed ? "#eee" : "#333"
      }}
    >
      {revealed &&
        room.tiles.map((row, y) =>
          row.map((tile, x) => {
            let color = tile === "wall" ? "#222" : "#ccc";
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
