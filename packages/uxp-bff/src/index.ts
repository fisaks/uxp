import express, { Request, Response } from "express";

const app = express();
const port = 3001;

// Middleware
app.use(express.json());

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Hello from the BFF!!" });
});

app.get("/api/data", (req: Request, res: Response) => {
  res.json({ data: "Some data from the BFF" });
});

// Start the server
app.listen(port, () => {
  console.log(`BFF is running at http://localhost:${port}`);
});
