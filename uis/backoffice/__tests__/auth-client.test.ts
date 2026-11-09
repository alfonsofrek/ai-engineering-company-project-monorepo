import { apiFetch, TOKEN_KEY } from "../lib/auth-client";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe("apiFetch", () => {
  let storage: MemoryStorage;
  let events: string[];

  beforeEach(() => {
    storage = new MemoryStorage();
    events = [];
    Object.assign(globalThis, {
      window: { dispatchEvent: (event: Event) => events.push(event.type) },
      localStorage: storage,
    });
  });
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it("adds the bearer token when there is a session", async () => {
    storage.setItem(TOKEN_KEY, "abc.def.ghi");
    const fetchMock = jest.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock;
    await apiFetch("/api/auth/me");
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer abc.def.ghi");
  });

  it("sends no Authorization header without a session", async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock;
    await apiFetch("/api/auth/forgot-password", { method: "POST" });
    expect((fetchMock.mock.calls[0][1].headers as Headers).has("Authorization")).toBe(false);
  });

  it("drops the token and announces it when the API answers 401", async () => {
    storage.setItem(TOKEN_KEY, "expired");
    globalThis.fetch = jest.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    const response = await apiFetch("/api/auth/me");
    expect(response.status).toBe(401);
    expect(storage.getItem(TOKEN_KEY)).toBeNull();
    expect(events).toEqual(["trackflow:unauthorized"]);
  });

  it("keeps the session on other errors such as a wrong current password (400)", async () => {
    storage.setItem(TOKEN_KEY, "valid");
    globalThis.fetch = jest.fn().mockResolvedValue(new Response("{}", { status: 400 }));
    await apiFetch("/api/auth/change-password", { method: "POST" });
    expect(storage.getItem(TOKEN_KEY)).toBe("valid");
    expect(events).toEqual([]);
  });
});
