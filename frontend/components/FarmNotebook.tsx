"use client";

import { T } from "@/components/LanguageProvider";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "./Icon";
type Note = {
  id: string;
  body: string;
  category: string;
  created: string;
  farm: string;
};
const KEY = "duducare-farm-notes-v1";
export function FarmNotebook() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
        if (
          !Array.isArray(raw) ||
          !raw.every(
            (x) =>
              typeof x.id === "string" &&
              typeof x.body === "string" &&
              typeof x.category === "string" &&
              typeof x.created === "string" &&
              typeof x.farm === "string",
          )
        )
          throw new Error();
        setNotes(raw as Note[]);
      } catch {
        setError(
          "Saved notes could not be read. Export or recover browser data before saving new notes.",
        );
      } finally {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  function persist(next: Note[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setNotes(next);
      return true;
    } catch {
      setError(
        "This browser could not save notes. Enable site storage or export the notes already on this page.",
      );
      return false;
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = String(data.get("body") || "").trim();
    const farm = String(data.get("farm") || "").trim();
    if (!body || !farm) {
      setStatus("Enter a farm name and an observation using more than spaces.");
      return;
    }
    const next = [
      {
        id: crypto.randomUUID(),
        body,
        farm,
        category: String(data.get("category")),
        created: new Date().toISOString(),
      },
      ...notes,
    ];
    if (persist(next)) {
      form.reset();
      setStatus("Observation saved on this browser.");
    }
  }
  function remove(id: string) {
    if (window.confirm("Delete this note from this browser?")) {
      if (persist(notes.filter((x) => x.id !== id))) setStatus("Note deleted.");
    }
  }
  function exportNotes() {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "duducare-farm-notes.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  const filtered = notes.filter((x) =>
    `${x.farm} ${x.body} ${x.category}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <>
      <div className="status-message">
        <strong><T>Your observations, kept on your device.</T></strong>
        <p><T>Notes are saved only in this browser, without GPS. They are not synced or expert-verified. Avoid personal details on shared devices; export a backup before clearing browser data.</T></p>
      </div>
      {error && (
        <p role="alert" className="error-message mb-4">
          {error}
        </p>
      )}
      <div className="workspace-grid">
        <form className="panel stack" onSubmit={submit}>
          <p className="eyebrow"><T>YOUR FARM NOTEBOOK</T></p>
          <h2><T>Notice it. Note it.</T></h2>
          <label className="field-label"><T>Farm or plot name</T><input
              name="farm"
              className="field"
              maxLength={100}
              required
              placeholder="e.g. Kitchen garden"
            />
          </label>
          <label className="field-label"><T>Category</T><select className="field" name="category">
              <option value="Crop management"><T>Crop management</T></option><option value="Livestock observation"><T>Livestock observation</T></option>
              <option value="Land preparation"><T>Land preparation</T></option>
              <option value="Planting"><T>Planting</T></option>
              <option value="Crop health"><T>Crop health</T></option>
              <option value="Weather"><T>Weather</T></option>
              <option value="Harvest"><T>Harvest</T></option>
              <option value="Other"><T>Other</T></option>
            </select>
          </label>
          <label className="field-label"><T>What did you observe?</T><textarea
              className="field"
              name="body"
              rows={4}
              maxLength={4000}
              required
              placeholder="Crop, changes you noticed, and what to check next…"
            />
          </label>
          <button
            className="button button-primary"
            disabled={!ready || Boolean(error)}
          >
            <Icon name="book" /><T>Save observation</T></button>
          <p role="status" className="text-sm text-emerald-800">
            {status}
          </p>
        </form>
        <section className="panel stack">
          <div className="section-heading">
            <h2><T>Your observations (</T>{notes.length})</h2>
            <button
              className="button button-secondary"
              disabled={!notes.length}
              onClick={exportNotes}
            ><T>Export</T></button>
          </div>
          <label className="field-label"><T>Find a note</T><input
              className="field"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search farm, crop, or observation"
            />
          </label>
          {!ready ? (
            <p><T>Loading your notebook…</T></p>
          ) : !filtered.length ? (
            <div className="py-6">
              <Icon name="farm" size={32} />
              <h3 className="mt-4 font-semibold">
                {notes.length
                  ? "No notes match your search."
                  : "A fresh page for your farm."}
              </h3>
              <p className="page-description mt-2">
                {notes.length
                  ? "Try another word or clear your search."
                  : "Add your first observation to start keeping track."}
              </p>
            </div>
          ) : (
            filtered.map((note) => (
              <article className="note-item" key={note.id}>
                <div className="min-w-0">
                  <strong>{note.farm}</strong>
                  <p className="text-xs text-slate-600">
                    {note.category}<T>· Farmer observation</T></p>
                  <p className="my-2">{note.body}</p>
                  <time dateTime={note.created}>
                    {new Date(note.created).toLocaleString()}
                  </time>
                </div>
                <button
                  className="button button-secondary self-start"
                  aria-label={`Delete note for ${note.farm}`}
                  onClick={() => remove(note.id)}
                ><T>Delete</T></button>
              </article>
            ))
          )}
        </section>
      </div>
      <div className="panel mt-5">
        <h2><T>Keep your plans close.</T></h2>
        <Link
          className="button button-secondary mt-4 ml-2"
          href="/planting/plans"
        ><T>Saved planting plans</T><Icon name="arrow" size={16} />
        </Link>
      </div>
    </>
  );
}
