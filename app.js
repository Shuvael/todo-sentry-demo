const $form = document.getElementById("todo-form");
const $task = document.getElementById("task");
const $list = document.getElementById("todo-list");
const $out  = document.getElementById("out");

function log(line) {
  $out.textContent += line + "\n";
}

async function loadTodos() {
  const res = await fetch("/api/todos");
  const data = await res.json();
  $list.innerHTML = "";
  data.forEach(todo => {
    const li = document.createElement("li");
    li.textContent = `• ${todo.task}`;
    li.title = "Klicken zum Löschen";
    li.addEventListener("click", async () => {
      await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
      log(`Gelöscht: ${todo.id}`);
      loadTodos();
    });
    $list.appendChild(li);
  });
}

$form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const task = $task.value;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Fehler beim Hinzufügen (${res.status}): ${txt}`);
    }
    $task.value = "";
    log("To-Do hinzugefügt.");
    loadTodos();
  } catch (err) {
    // Optional: Clientseitig an Sentry senden
    if (window.Sentry) Sentry.captureException(err);
    console.error(err);
    log("Client-Fehler: " + err.message);
  }
});

document.getElementById("btn-client-error").addEventListener("click", () => {
  // Absichtlicher ReferenceError
  /* eslint-disable no-undef */
    nichtDefinierteFunktion();
});

document.getElementById("btn-server-crash").addEventListener("click", async () => {
  try {
    const res = await fetch("/api/crash");
    log(`/api/crash -> ${res.status}`);
  } catch (e) {
    log("Fetch-Fehler /api/crash: " + e.message);
  }
});

document.getElementById("btn-async-crash").addEventListener("click", async () => {
  try {
    const res = await fetch("/api/async-crash");
    log(`/api/async-crash -> ${res.status}`);
  } catch (e) {
    log("Fetch-Fehler /api/async-crash: " + e.message);
  }
});

document.getElementById("btn-slow").addEventListener("click", async () => {
  const t0 = performance.now();
  const res = await fetch("/api/slow");
  const t1 = performance.now();
  log(`/api/slow -> ${res.status}, Dauer ~${Math.round(t1 - t0)}ms`);
});

loadTodos();
