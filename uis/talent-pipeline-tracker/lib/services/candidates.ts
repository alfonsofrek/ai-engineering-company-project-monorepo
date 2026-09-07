import type {
  Candidate,
  CandidateInput,
  CandidateListResponse,
  CandidatePatch,
  Note,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiError("No se pudo conectar con la API de Talent Pipeline Tracker.");
  }

  if (!response.ok) {
    let message = `Error ${response.status} al comunicarse con la API.`;
    try {
      const body = await response.json();
      if (body?.detail) {
        message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // ignore body parse errors
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
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
