import { TavernCharacterCard } from "../types";

/**
 * 从 PNG 文件的二进制流中提取 SillyTavern 的 `chara` 数据块
 */
async function extractCharaFromPng(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  // 验证 PNG 文件头 (89 50 4E 47 0D 0A 1A 0A)
  if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) {
    throw new Error("不是有效的 PNG 图片文件");
  }

  let offset = 8;
  const decoder = new TextDecoder("utf-8");

  while (offset < view.byteLength) {
    const length = view.getUint32(offset);
    const type = decoder.decode(new Uint8Array(buffer, offset + 4, 4));

    if (type === "tEXt") {
      const chunkData = new Uint8Array(buffer, offset + 8, length);
      // 寻找空字节 (0x00) 分隔符，前面是 keyword，后面是 text
      let nullIndex = -1;
      for (let i = 0; i < chunkData.length; i++) {
        if (chunkData[i] === 0) {
          nullIndex = i;
          break;
        }
      }

      if (nullIndex !== -1) {
        const keyword = decoder.decode(chunkData.slice(0, nullIndex));
        if (keyword === "chara") {
          const base64Text = decoder.decode(chunkData.slice(nullIndex + 1));
          // 解码 Base64（处理 UTF-8 中文字符防乱码）
          const binaryString = atob(base64Text);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return decoder.decode(bytes);
        }
      }
    }

    // 移动到下一个 chunk (length + type(4) + data(length) + crc(4))
    offset += 12 + length;
  }

  throw new Error("这张 PNG 图片里没有包含酒馆角色卡数据 (未找到 chara 块)");
}

/**
 * 把 File 转成压缩后的 Base64 头像，防止本地存储爆掉
 */
function fileToAvatarBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 统一导入入口：支持 .png 和 .json 角色卡
 */
export async function importTavernCard(file: File): Promise<TavernCharacterCard> {
  let rawJsonString = "";
  let avatarDataUrl = "";

  if (file.name.toLowerCase().endsWith(".png") || file.type === "image/png") {
    rawJsonString = await extractCharaFromPng(file);
    avatarDataUrl = await fileToAvatarBase64(file);
  } else if (file.name.toLowerCase().endsWith(".json") || file.type === "application/json") {
    rawJsonString = await file.text();
  } else {
    throw new Error("仅支持导入酒馆标准的 .png 或 .json 角色卡文件");
  }

  const parsed = JSON.parse(rawJsonString);
  // 兼容 V2 结构 (数据在 parsed.data 里) 和 V1 结构 (数据在根目录)
  const data = parsed.spec === "chara_card_v2" && parsed.data ? parsed.data : parsed;

  if (!data.name) {
    throw new Error("角色卡解析失败：缺少角色名称");
  }

  return {
    id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    avatar: avatarDataUrl,
    isFavorite: false,
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    name: data.name || "未命名角色",
    description: data.description || "",
    personality: data.personality || "",
    scenario: data.scenario || "",
    first_mes: data.first_mes || "",
    mes_example: data.mes_example || "",
    creator_notes: data.creator_notes || "",
    system_prompt: data.system_prompt || "",
    alternate_greetings: Array.isArray(data.alternate_greetings) ? data.alternate_greetings : [],
    character_book: data.character_book || undefined,
  };
}

/**
 * 导出为标准酒馆 V2 JSON 文件
 */
export function exportTavernCardJson(card: TavernCharacterCard) {
  const v2Payload = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: card.name,
      description: card.description,
      personality: card.personality,
      scenario: card.scenario,
      first_mes: card.first_mes,
      mes_example: card.mes_example,
      creator_notes: card.creator_notes || "",
      system_prompt: card.system_prompt || "",
      alternate_greetings: card.alternate_greetings || [],
      tags: card.tags || [],
      character_book: card.character_book,
    },
  };

  const blob = new Blob([JSON.stringify(v2Payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${card.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}