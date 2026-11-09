import { ApiError, fieldErrorsFrom, parseResponse, readJson, toUserMessage } from "../lib/http";

/** Awaits a promise that must reject and returns the ApiError it rejected with. */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("Expected the promise to reject");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("readJson", () => {
  it("parses a JSON body", async () => {
    await expect(readJson(json({ ok: true }))).resolves.toEqual({ ok: true });
  });
  it("returns null for HTML or empty bodies instead of throwing", async () => {
    await expect(readJson(new Response("<html>502 Bad Gateway</html>", { status: 502 }))).resolves.toBeNull();
    await expect(readJson(new Response(null, { status: 204 }))).resolves.toBeNull();
  });
});

describe("fieldErrorsFrom", () => {
  it("maps FastAPI 422 details to field names", () => {
    const body = { detail: [{ loc: ["body", "new_password"], msg: "String should have at least 8 characters" }] };
    expect(fieldErrorsFrom(body)).toEqual({ new_password: "String should have at least 8 characters" });
  });
  it("reads { field, message } and { errors: [] } shapes", () => {
    expect(fieldErrorsFrom({ field: "email", message: "Email no válido" })).toEqual({ email: "Email no válido" });
    expect(fieldErrorsFrom({ errors: [{ field: "title", message: "Muy corto" }] })).toEqual({ title: "Muy corto" });
  });
  it("ignores bodies that are not objects or have no field info", () => {
    expect(fieldErrorsFrom(null)).toEqual({});
    expect(fieldErrorsFrom("oops")).toEqual({});
    expect(fieldErrorsFrom({ detail: "Not found" })).toEqual({});
  });
});

describe("parseResponse", () => {
  it("returns the body of a successful response", async () => {
    await expect(parseResponse(json({ message: "ok" }), "fallback")).resolves.toEqual({ message: "ok" });
  });
  it("uses the API's own 4xx message (e.g. wrong current password)", async () => {
    const error = await failure(parseResponse(json({ detail: "La contraseña actual no es correcta." }, 400), "fallback"));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe("La contraseña actual no es correcta.");
  });
  it("never shows server text for 5xx responses", async () => {
    const error = await failure(parseResponse(json({ detail: "Traceback: KeyError at line 42" }, 500), "fallback"));
    expect(error.message).not.toContain("Traceback");
    expect(error.message).toMatch(/servidor/);
  });
  it("summarises validation errors and keeps them per field", async () => {
    const body = { detail: [{ loc: ["body", "email"], msg: "value is not a valid email address" }] };
    const error = await failure(parseResponse(json(body, 422), "fallback"));
    expect(error.fieldErrors).toEqual({ email: "value is not a valid email address" });
    expect(error.message).toBe("Revisa los campos marcados en el formulario.");
  });
  it("rejects a 200 whose body is not JSON", async () => {
    await expect(parseResponse(new Response("<html/>", { status: 200 }), "fallback")).rejects.toBeInstanceOf(ApiError);
  });
  it("gives a session message for 401 even if the API sent text", async () => {
    const error = await failure(parseResponse(json({ detail: "Signature has expired" }, 401), "fallback"));
    expect(error.message).toBe("Tu sesión ha caducado. Vuelve a iniciar sesión.");
  });
});

describe("toUserMessage", () => {
  it("returns ApiError messages as they are", () => {
    expect(toUserMessage(new ApiError("Email ya registrado", 409), "fallback")).toBe("Email ya registrado");
  });
  it("explains network failures and falls back for anything else", () => {
    expect(toUserMessage(new TypeError("Failed to fetch"), "fallback")).toMatch(/conexión/);
    expect(toUserMessage(new Error("weird"), "fallback")).toBe("fallback");
  });
});
