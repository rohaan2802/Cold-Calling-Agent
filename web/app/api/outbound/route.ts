import { NextResponse } from "next/server";
import {
  extractRawError,
  friendlyUserError,
  userMsg,
  validateOutboundPhone,
} from "@/lib/callErrors";
import { speechCaptureOverrides } from "@/lib/speechConfig";
import {
  ENGLISH_END_MESSAGE,
  ENGLISH_FIRST_MESSAGE,
  ENGLISH_SYSTEM_PROMPT,
} from "@/lib/englishSystemPrompt";
import { vapiFetch } from "@/lib/vapi";

export async function POST(req: Request) {
  try {
    let body: { number?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: userMsg("phoneInvalid") }, { status: 400 });
    }

    const validated = validateOutboundPhone(String(body.number || ""));
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    if (!assistantId || !phoneNumberId || phoneNumberId.includes("your_phone")) {
      return NextResponse.json({ error: userMsg("configMissing") }, { status: 500 });
    }

    const speech = speechCaptureOverrides("en");

    const res = await vapiFetch("/call", {
      method: "POST",
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: { number: validated.e164 },
        assistantOverrides: {
          firstMessage: ENGLISH_FIRST_MESSAGE,
          endCallMessage: ENGLISH_END_MESSAGE,
          variableValues: { preferredLanguage: "English" },
          model: {
            provider: "groq",
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
            maxTokens: 110,
            messages: [{ role: "system", content: ENGLISH_SYSTEM_PROMPT }],
          },
          voice: {
            provider: "vapi",
            voiceId: "Elliot",
            language: "en",
            speed: 0.8,
          },
          ...speech,
        },
      }),
    });

    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const raw = extractRawError(data?.message ?? data?.error ?? data);
      return NextResponse.json(
        { error: friendlyUserError(raw || userMsg("genericStart")) },
        { status: res.status >= 400 && res.status < 600 ? res.status : 400 }
      );
    }

    const reason = String(data?.endedReason || "");
    if (/insufficient-credits|daily-limit|error/i.test(reason)) {
      return NextResponse.json(
        { error: friendlyUserError(reason) },
        { status: 402 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: friendlyUserError(err) },
      { status: 500 }
    );
  }
}
