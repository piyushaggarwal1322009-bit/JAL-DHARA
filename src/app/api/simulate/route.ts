import { NextResponse } from "next/server";
import { simulate } from "@/lib/simulation";
import { validateInput } from "@/lib/validation";
import type { SimulationInput } from "@/lib/model";
import { PayloadTooLargeError, readJsonLimited } from "@/lib/read-json";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ code: "INVALID_CONTENT_TYPE", message: "Send a JSON scenario." }, { status: 415 });
  }

  try {
    const payload = await readJsonLimited(request, 64 * 1024);
    const parsed = validateInput(payload as SimulationInput);
    return NextResponse.json({ result: simulate(parsed.input), validated: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ code: "PAYLOAD_TOO_LARGE", message: "Scenario must be 64 KB or smaller." }, { status: 413 });
    const message = error instanceof Error ? error.message : "Scenario could not be processed.";
    return NextResponse.json({ code: "INVALID_SCENARIO", message }, { status: 400 });
  }
}
