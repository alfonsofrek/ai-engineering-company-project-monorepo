import type {
  Candidate,
  CandidateInput,
  CandidateListResponse,
  CandidatePatch,
  Note,
} from "@/types";
import { authFetch } from "@/lib/auth-client";
import { parseResponse } from "@/lib/http";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export { ApiError } from "@/lib/http";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Network failures (fetch rejects) are mapped by toUserMessage in the UI;
  // HTTP failures become ApiError with a readable message — never a raw status code or JSON dump.
  const response = await authFetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (response.status === 204) {
    if (!response.ok) await parseResponse<never>(response, "No se pudo completar la operación.");
    return undefined as T;
  }
  return parseResponse<T>(response, "No se pudo completar la operación con la API de candidatos.");
}

export interface RecordsQuery {
  status?: string;
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function getCandidates(query: RecordsQuery = {}): Promise<CandidateListResponse> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.stage) params.set("stage", query.stage);
  if (query.search) params.set("search", query.search);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 100));

  return request<CandidateListResponse>(`/records?${params.toString()}`);
}

export function getCandidateById(id: string): Promise<Candidate> {
  return request<Candidate>(`/records/${id}`);
}

export function createCandidate(input: CandidateInput): Promise<Candidate> {
  return request<Candidate>("/records", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCandidate(id: string, input: CandidateInput): Promise<Candidate> {
  return request<Candidate>(`/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function patchCandidate(id: string, patch: CandidatePatch): Promise<Candidate> {
  return request<Candidate>(`/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function getNotes(candidateId: string): Promise<Note[]> {
  return request<Note[]>(`/records/${candidateId}/notes`);
}

export function createNote(candidateId: string, content: string): Promise<Note> {
  return request<Note>(`/records/${candidateId}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function deleteNote(candidateId: string, noteId: string): Promise<void> {
  return request<void>(`/records/${candidateId}/notes/${noteId}`, {
    method: "DELETE",
  });
}
