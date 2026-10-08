import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const savedKey = process.env.GROQ_API_KEY;
afterEach(() => {
  if (savedKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = savedKey;
});

describe("POST /api/ask", () => {
  it("rejects an empty question", async () => {
    const response = await POST(new Request("http://localhost/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: " " }),
    }));
    expect(response.status).toBe(400);
  });

  it("returns a clear unavailable response when Groq is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    const response = await POST(new Request("http://localhost/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "Why does the simulation show spill?" }),
    }));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("AI_UNAVAILABLE");
  });
});
