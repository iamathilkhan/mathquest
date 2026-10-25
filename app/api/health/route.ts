export async function GET(): Promise<Response> {
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL_PRIMARY) {
    return Response.json(
      { status: "degraded", reason: "no_key" },
      { status: 503 }
    );
  }

  return Response.json({ status: "ok" }, { status: 200 });
}
