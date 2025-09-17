import React from 'react';
import ReactDOM from 'react-dom/client';
import Board from './Board';      // jouw bord component
import './index.css';             // CSS voor overflow:hidden en canvas styling

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Board />
  </React.StrictMode>
);
