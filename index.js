// IMPORTANT: instrument.js MUSS ganz oben importiert werden (vor allem anderen)
require("./instrument.js");

// Danach weitere Imports
const Sentry = require("@sentry/node");
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());                          // JSON-Parsing
app.use(express.static(path.join(__dirname, "public"))); // Statische Dateien (Frontend)

// --- In-Memory To-Do-Store (für Demo-Zwecke) ---
let todos = [];

// --- Routen (Controller) ---
app.get("/", (req, res) => {
  // index.html wird aus /public bedient, hier nur ein Hinweistext:
  res.type("text").send("To-Do-App läuft. Öffne / im Browser oder nutze die API unter /api/*");
});

// Alle To-Dos
app.get("/api/todos", (req, res) => {
  res.json(todos);
});

// Neues To-Do anlegen – absichtlicher Validierungsfehler, wenn task fehlt/leer
app.post("/api/todos", (req, res) => {
  const { task } = req.body;
  if (!task || typeof task !== "string" || task.trim() === "") {
    // absichtlicher Fehler: wir werfen hier, damit Sentry ihn erfasst
    throw new Error("Ungültiger To-Do-Eintrag (task fehlt oder ist leer).");
  }
  const newTodo = { id: Date.now(), task: task.trim() };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// To-Do löschen
app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  todos = todos.filter(t => t.id !== id);
  res.json({ deleted: id });
});

// Absichtlicher synchroner Serverfehler
app.get("/api/crash", (req, res) => {
  throw new Error("Absichtlicher Serverfehler (synchron)!");
});

// Absichtlicher asynchroner Fehler (unhandled Promise rejection)
app.get("/api/async-crash", async (req, res) => {
  await Promise.reject(new Error("Absichtlicher Serverfehler (asynchron)!"));
  res.json({ ok: true }); // wird nie erreicht
});

// Langsame Route, um Tracing zu zeigen
app.get("/api/slow", async (req, res) => {
  await new Promise(r => setTimeout(r, 1800));
  res.json({ delayedMs: 1800 });
});

// --- Jetzt den von Sentry empfohlenen Error-Handler registrieren ---
// Hinweis: Laut deiner Sentry-Anleitung soll *dieser* Handler vor anderen Error-MWs
// und NACH allen Controllern registriert werden.
Sentry.setupExpressErrorHandler(app);

// --- Optionaler eigener Fallback-Error-Handler ---
// (wird nach dem Sentry-Handler ausgeführt)
app.use((err, req, res, next) => {
  // Die vom Sentry-Handler gesetzte Event-ID hängt an res.sentry
  const eventId = res.sentry || null;
  console.error("Fehler aufgetreten:", err);
  res.status(500).json({
    error: "Interner Serverfehler",
    sentryEventId: eventId
  });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
