import { NextResponse } from "next/server";
import { optimize } from "@/lib/optimization";
import { validateInput } from "@/lib/validation";
import type { SimulationInput } from "@/lib/model";
import { PayloadTooLargeError, readJsonLimited } from "@/lib/read-json";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ code: "INVALID_CONTENT_TYPE", message: "Send a JSON scenario." }, { status: 415 });
  }
  try {
    const body = await readJsonLimited(request, 64 * 1024);
    if (!body || typeof body !== "object" || !("input" in body) || !("budgetINR" in body)) throw new Error("Request must include a scenario and budget.");
    const requestBody = body as { input: unknown; budgetINR: unknown };
    if (typeof requestBody.budgetINR !== "number" || !Number.isInteger(requestBody.budgetINR) || requestBody.budgetINR < 0 || requestBody.budgetINR > 1_000_000_000) {
      throw new Error("Enter a whole-rupee budget from ₹0 to ₹1,000,000,000.");
    }
    const { input } = validateInput(requestBody.input as SimulationInput);
    return NextResponse.json({ recommendation: optimize(input, requestBody.budgetINR), validated: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ code: "PAYLOAD_TOO_LARGE", message: "Scenario must be 64 KB or smaller." }, { status: 413 });
    const message = error instanceof Error ? error.message : "Scenario could not be processed.";
    return NextResponse.json({ code: "INVALID_SCENARIO", message }, { status: 400 });
  }
}
