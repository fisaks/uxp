import express, { Request, Response } from "express";

import dotenv from 'dotenv';

dotenv.config();

// Use these in your database connection
const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
};
/*
// Example: Using dbConfig for a MySQL connection
import mysql from 'mysql2/promise';

async function connectToDatabase() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected to MySQL database');
}

connectToDatabase().catch(console.error);
*/
console.log("Started env is " + JSON.stringify( dbConfig))


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
