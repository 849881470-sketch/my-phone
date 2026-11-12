import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, voiceId, voiceStyle, ttsApiBaseUrl, ttsApiKey } = await req.json();

    if (!ttsApiBaseUrl || !ttsApiKey) {
      return NextResponse.json({ error: "未配置 TTS API 地址或 Key" }, { status: 400 });
    }

    // 过滤括号里的动作/神态描写，只合成纯台词
    const cleanText = String(text || "")
      .replace(/[（\(][^）\)]*?[）\)]/g, "")
      .replace(/[\(\（\)\）]/g, "")
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: "有效台词为空" }, { status: 400 });
    }

    const baseUrl = ttsApiBaseUrl.trim().replace(/\/+$/, "");
    const key = ttsApiKey.trim();

    // 1. 适配 ElevenLabs
    if (baseUrl.includes("elevenlabs")) {
      const targetVoiceId =
        voiceId?.trim() ||
        (voiceStyle === "youth" ? "TX3LPaxmHKxFdv7VOQHJ" : "29vD33N1CtxCmqQRPOHJ");
      const v1Url = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;

      const response = await fetch(`${v1Url}/text-to-speech/${targetVoiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
        }),
      });

      if (!response.ok) {
        return NextResponse.json({ error: await response.text() }, { status: response.status });
      }
      return new Response(await response.arrayBuffer(), {
        headers: { "Content-Type": "audio/mpeg" },
      });
    }

    // 2. 适配 Fish Audio
    if (baseUrl.includes("fish.audio")) {
      const v1Url = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
      const response = await fetch(`${v1Url}/tts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          reference_id: voiceId?.trim() || undefined,
          format: "mp3",
        }),
      });

      if (!response.ok) {
        return NextResponse.json({ error: await response.text() }, { status: response.status });
      }
      return new Response(await response.arrayBuffer(), {
        headers: { "Content-Type": "audio/mpeg" },
      });
    }

    // 3. 适配标准 OpenAI 兼容格式 (/v1/audio/speech)
    const v1Url = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
    const response = await fetch(`${v1Url}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: cleanText,
        voice: voiceId?.trim() || (voiceStyle === "deep" ? "onyx" : voiceStyle === "sweet" ? "nova" : "echo"),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `TTS 平台返回错误: ${errText}` }, { status: response.status });
    }

    return new Response(await response.arrayBuffer(), {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "代理请求失败" }, { status: 500 });
  }
}