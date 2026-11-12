// 专属男友本地 AI 引擎配置
export interface BoyfriendConfig {
  name: string;
  worldView: string;      // 你们俩的世界观、背景
  personality: string;    // 男友性格、说话语气
  apiKey: string;         // 你的 OpenAI API Key（只保存在你本地浏览器，绝不上传）
  apiBaseUrl?: string;    // 支持自定义中转商 API 地址（省钱利器）
  modelName: string;      // 比如 gpt-4o-mini，便宜又好用
}

// 默认配置获取
export function getBoyfriendConfig(): BoyfriendConfig {
  if (typeof window === "undefined") {
    return { name: "专属男友", worldView: "", personality: "", apiKey: "", modelName: "gpt-4o-mini" };
  }
  const saved = localStorage.getItem("my_boyfriend_config");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return {
    name: "Aiden",
    worldView: "现代都市，与你同居，他是你温柔体贴的专属恋人。",
    personality: "温柔、偶尔傲娇、会关心人、秒回消息。",
    apiKey: "",
    apiBaseUrl: "https://api.openai.com/v1",
    modelName: "gpt-4o-mini", // 推荐用 mini，便宜且极快，完全不心疼 Token
  };
}

export function saveBoyfriendConfig(config: BoyfriendConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem("my_boyfriend_config", JSON.stringify(config));
}

// 发送消息给 OpenAI（带上严格的 Token 控制和自定义人设）
export async function sendChatMessageToBoyfriend(
  historyMessages: { role: "user" | "assistant" | "system"; content: string }[],
  onChunk?: (text: string) => void
): Promise<string> {
  const config = getBoyfriendConfig();
  if (!config.apiKey) {
    throw new Error("请先在设置里填入你的 OpenAI API Key 才能开始恋爱哦！");
  }

  const systemPrompt = `
    你现在是用户的专属AI男友。
    名字：${config.name}
    世界观与背景：${config.worldView}
    性格与语气：${config.personality}
    
    规则：
    1. 保持沉浸式的男友身份，用微信聊天或日常对话的口吻回复。
    2. 绝对不能出戏，不能承认自己是AI。
    3. 语言要自然、有情绪起伏，根据用户的状态给予高情绪价值。
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
  ];

  const baseUrl = config.apiBaseUrl || "https://api.openai.com/v1";
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName || "gpt-4o-mini",
      messages,
      stream: true, // 开启流式传输，男友打字效果更真实
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI 调用失败: ${response.status} - ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("无法读取响应流");

  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === "[DONE]") continue;

      try {
        const json = JSON.parse(dataStr);
        const delta = json.choices?.[0]?.delta?.content || "";
        if (delta) {
          fullText += delta;
          if (onChunk) onChunk(fullText);
        }
      } catch {
        // 解析json出错跳过
      }
    }
  }

  return fullText;
}