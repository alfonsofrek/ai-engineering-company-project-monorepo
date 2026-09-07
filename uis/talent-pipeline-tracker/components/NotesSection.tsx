"use client";

import { useEffect, useState } from "react";
import { Note } from "@/types";
import { ApiError, createNote, deleteNote, getNotes } from "@/lib/services/candidates";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";

export function NotesSection({ candidateId }: { candidateId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadNotes() {
      setStatus("loading");
      try {
        const data = await getNotes(candidateId);
        if (!cancelled) {
          setNotes(data);
          setStatus("success");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "No se pudieron cargar las notas.");
          setStatus("error");
        }
      }
    }
    loadNotes();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const note = await createNote(candidateId, content.trim());
      setNotes((prev) => [note, ...prev]);
      setContent("");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "No se pudo agregar la nota.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    setDeletingId(noteId);
    setErrorMessage("");
    try {
      await deleteNote(candidateId, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "No se pudo eliminar la nota.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Notas internas</h2>

      <form onSubmit={handleAddNote} className="mb-4 flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Agregar una nota interna sobre este candidato..."
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="self-start rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Agregar nota"}
        </button>
      </form>

      {errorMessage && (
        <div className="mb-3">
          <ErrorState message={errorMessage} />
        </div>
      )}

      {status === "loading" && <LoadingState label="Cargando notas..." />}
      {status === "success" && notes.length === 0 && (
        <p className="text-sm text-slate-500">Aún no hay notas para este candidato.</p>
      )}
      {status === "success" && notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-700">{note.content}</p>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  disabled={deletingId === note.id}
                  className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  {deletingId === note.id ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(note.created_at).toLocaleString("es-ES")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
