require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "events",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

const TABLE = process.env.DB_TABLE || "event management";

// Quote SQL identifiers safely, including table/column names containing spaces.
function ident(value) {
  return "`" + String(value).replace(/`/g, "``") + "`";
}

const T = ident(TABLE);
const C = {
  id: ident("event id"),
  name: ident("event name"),
  time: ident("event time"),
  date: ident("event day"),
  venue: ident("venue"),
  description: ident("description")
};

function normalise(row) {
  return {
    id: row.id,
    name: row.name ?? "",
    time: row.time ?? "",
    date: row.date ?? "",
    venue: row.venue ?? "",
    description: row.description ?? ""
  };
}

function cleanEvent(body) {
  const name = String(body.name || "").trim();
  const time = String(body.time || "").trim();
  const date = String(body.date || "").trim();
  const venue = String(body.venue || "").trim();
  const description = String(body.description || "").trim();

  if (!name || !time || !date || !venue || !description) {
    const error = new Error("Please fill in every event field.");
    error.status = 400;
    throw error;
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    const error = new Error("Enter the event time in HH:MM format.");
    error.status = 400;
    throw error;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error("Choose a valid event date.");
    error.status = 400;
    throw error;
  }
  return { name, time: time.length === 5 ? time + ":00" : time, date, venue, description };
}

app.get("/api/health", async (_req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ ok: true, message: "Website server and MySQL connection are working." });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "The website is running, but MySQL connection failed. Check your .env settings and database/table names.",
      detail: error.message
    });
  }
});

app.get("/api/events", async (_req, res, next) => {
  try {
    const sql = `SELECT ${C.id} AS id, ${C.name} AS name, ${C.time} AS time, ${C.date} AS date, ${C.venue} AS venue, ${C.description} AS description FROM ${T} ORDER BY ${C.date} ASC, ${C.time} ASC`;
    const [rows] = await pool.query(sql);
    res.json(rows.map(normalise));
  } catch (error) {
    next(error);
  }
});

app.get("/api/events/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid event ID." });
    const sql = `SELECT ${C.id} AS id, ${C.name} AS name, ${C.time} AS time, ${C.date} AS date, ${C.venue} AS venue, ${C.description} AS description FROM ${T} WHERE ${C.id} = ? LIMIT 1`;
    const [rows] = await pool.execute(sql, [id]);
    if (!rows.length) return res.status(404).json({ message: "Event not found." });
    res.json(normalise(rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post("/api/events", async (req, res, next) => {
  try {
    const event = cleanEvent(req.body);
    const sql = `INSERT INTO ${T} (${C.name}, ${C.time}, ${C.date}, ${C.venue}, ${C.description}) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [event.name, event.time, event.date, event.venue, event.description]);
    res.status(201).json({ message: "Event created successfully.", id: result.insertId });
  } catch (error) {
    next(error);
  }
});

app.put("/api/events/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid event ID." });
    const event = cleanEvent(req.body);
    const sql = `UPDATE ${T} SET ${C.name} = ?, ${C.time} = ?, ${C.date} = ?, ${C.venue} = ?, ${C.description} = ? WHERE ${C.id} = ?`;
    const [result] = await pool.execute(sql, [event.name, event.time, event.date, event.venue, event.description, id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Event not found." });
    res.json({ message: "Event updated successfully." });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/events/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid event ID." });
    const [result] = await pool.execute(`DELETE FROM ${T} WHERE ${C.id} = ?`, [id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Event not found." });
    res.json({ message: "Event deleted successfully." });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// Friendly error responses for API calls and unknown routes.
app.use((err, req, res, _next) => {
  console.error(err);
  if (req.path.startsWith("/api/")) {
    const status = err.status || 500;
    return res.status(status).json({
      message: status === 500
        ? "Database request failed. Check the database/table/column names and MySQL service."
        : err.message,
      detail: process.env.NODE_ENV === "production" ? undefined : err.message
    });
  }
  res.status(500).send("Something went wrong. Check the server terminal for details.");
});

app.listen(PORT, () => {
  console.log(`College Event Management is running at http://localhost:${PORT}`);
});
