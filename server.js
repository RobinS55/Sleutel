import express from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// Serve Vite build folder
app.use(express.static(path.join(process.cwd(), "dist")));

// Fallback voor SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
