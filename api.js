// ---------- Constants ----------
// Base URL of the practice API (required by the assignment)
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;

// ---------- Element references ----------
const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const form = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");
const notesList = document.getElementById("notes-list");

// ---------- UI state helpers ----------

// Shows a message in the status paragraph. The type ("loading", "success"
// or "error") is added as a CSS class so each state looks different.
function setStatus(message, type) {
  statusEl.textContent = message; // textContent only: never inject HTML
  statusEl.className = type || "";
}

// Disables or enables every button while a request runs. This prevents
// double submits and conflicting requests. Delete buttons are included
// because they are created dynamically.
function setBusy(isBusy) {
  loadBtn.disabled = isBusy;
  submitBtn.disabled = isBusy;
  notesList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.disabled = isBusy;
  });
}

// ---------- Reusable request function ----------
// ONE place that talks to the network. It calls fetch, checks response.ok
// and throws on HTTP errors, because fetch only rejects on network failure
// (a 404 or 500 would otherwise look like a success).
async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  // Keep the status code so the UI can show it (e.g. "status 201")
  const data = await response.json();
  return { status: response.status, data: data };
}

// ---------- API functions: GET, POST, DELETE ----------

// GET: load 10 notes
function getNotes() {
  return request(`${API_URL}?_limit=10`);
}

// POST: create a note. The API echoes it back with a new id.
function createNote(note) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });
}

// DELETE: remove a note by id
function deleteNote(id) {
  return request(`${API_URL}/${id}`, { method: "DELETE" });
}

// ---------- Rendering ----------

// Empty state: shown when the list has no notes
function showEmptyState() {
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = "No notes to show yet. Click \"Load notes\" or create one.";
  notesList.appendChild(li);
}

// Builds one note item. User/API text is inserted with textContent only,
// so a title like "<script>" is displayed as text and never executed.
function createNoteItem(note) {
  const li = document.createElement("li");
  li.className = "note";

  const title = document.createElement("h3");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body || "(no body)";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";

  // Clicking Delete removes THIS list item (the API reuses id 101 for
  // every new post, so we remove by element, not by id).
  deleteBtn.addEventListener("click", () => handleDelete(note.id, li));

  li.append(title, body, deleteBtn);
  return li;
}

// Replaces the list contents with the given notes (or the empty state)
function renderNotes(notes) {
  notesList.innerHTML = "";
  if (notes.length === 0) {
    showEmptyState();
    return;
  }
  notes.forEach((note) => notesList.appendChild(createNoteItem(note)));
}

// ---------- Event handlers (each wraps its request in try/catch/finally) ----------

// GET handler: loading -> success / error / empty
async function handleLoad() {
  setStatus("Loading notes...", "loading"); // loading state
  setBusy(true);

  try {
    const result = await getNotes();
    renderNotes(result.data); // shows the empty state if the array is empty

    if (result.data.length === 0) {
      setStatus("No notes found.", "success");
    } else {
      setStatus(`Loaded ${result.data.length} notes from the server.`, "success");
    }
  } catch (error) {
    // friendly error message; details are logged for developers
    console.error(error);
    setStatus("Sorry, we could not load your notes. Please try again.", "error");
  } finally {
    setBusy(false); // runs on success AND failure, so buttons always recover
  }
}

// POST handler: validate -> send -> show new note at the top
async function handleSubmit(event) {
  event.preventDefault(); // stop the page from reloading

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: a title is required, with a maximum of 100 characters
  if (title === "") {
    setStatus("Please enter a title.", "error");
    return;
  }
  if (title.length > MAX_TITLE_LENGTH) {
    setStatus(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`, "error");
    return;
  }

  setStatus("Creating note...", "loading");
  setBusy(true);

  try {
    const result = await createNote({ title: title, body: body, userId: 1 });

    // Remove the empty-state message before adding the first note
    const emptyItem = notesList.querySelector(".empty");
    if (emptyItem) {
      emptyItem.remove();
    }

    // New note goes to the TOP of the list
    notesList.prepend(createNoteItem(result.data));

    // Show the status code and new id, e.g. "Note created (status 201, id 101)."
    setStatus(
      `Note created (status ${result.status}, id ${result.data.id}).`,
      "success"
    );
    form.reset(); // clear the form afterwards
  } catch (error) {
    console.error(error);
    setStatus("Sorry, the note could not be created. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

// DELETE handler: send request, then remove the item from the page
async function handleDelete(id, listItem) {
  setStatus("Deleting note...", "loading");
  setBusy(true);

  try {
    await deleteNote(id);
    listItem.remove(); // only remove from the page after the server says OK

    // If that was the last note, show the empty state again
    if (notesList.querySelectorAll(".note").length === 0) {
      showEmptyState();
    }
    setStatus("Note deleted.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Sorry, the note could not be deleted. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

// ---------- Wire up events ----------
loadBtn.addEventListener("click", handleLoad);
form.addEventListener("submit", handleSubmit);

// Initial empty state, before anything is loaded
showEmptyState();
