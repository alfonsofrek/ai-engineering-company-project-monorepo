"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { STAGE_OPTIONS, STATUS_OPTIONS } from "@/types";

export function CandidateFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", search);
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-[220px] flex-col gap-1">
        <label htmlFor="search" className="text-xs font-medium text-slate-600">
          Buscar por nombre o email
        </label>
        <input
          id="search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ej. maria.perez@empresa.com"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        />
      </form>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium text-slate-600">
          Estado
        </label>
        <select
          id="status"
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="stage" className="text-xs font-medium text-slate-600">
          Etapa
        </label>
        <select
          id="stage"
          value={searchParams.get("stage") ?? ""}
          onChange={(e) => updateParam("stage", e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          {STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleSearchSubmit}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
      >
        Buscar
      </button>
    </div>
  );
}
