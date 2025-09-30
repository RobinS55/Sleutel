import React from "react";
import ReactDOM from "react-dom/client";
import Board from "./Board";
import "./Board.css";

document.title = "Het bordspel sleutel";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Board />
  </React.StrictMode>
);
