// 1. 酒馆 V2 标准角色卡数据结构 (100% 兼容 SillyTavern PNG/JSON)
export interface TavernCharacterCard {
  id: string;                 // 本地唯一ID
  avatar: string;             // 头像 Base64 或图片 URL
  isFavorite?: boolean;       // 是否收藏（置顶热切换）
  tags: string[];             // 标签分类（如：男友、系统、悬疑）
  createdAt: number;
  updatedAt: number;
  
  // 核心酒馆字段
  name: string;               // 角色名 (如: 岑烬)
  description: string;        // 角色描述 / 核心设定
  personality: string;        // 性格摘要
  scenario: string;           // 场景 / 世界观背景
  first_mes: string;          // 第一条开场白
  mes_example: string;        // 对话示例
  creator_notes?: string;     // 创作者注释
  system_prompt?: string;     // 角色专属系统指令
  alternate_greetings?: string[]; // 其他备选开场白

  // 👇 新增：角色专属语音设定（支持手动调配 + 继承 MoeTok 盲盒声线）
  voiceId?: string;           // 第三方 TTS 平台的专属音色 ID（ElevenLabs voice_id / Fish Audio reference_id）
  voiceStyle?: string;        // 声线基调（deep / youth / cold / sweet）
  
  // 附带的独立世界书 (Character Book)
  character_book?: {
    name?: string;
    entries: Array<{
      keys: string[];
      content: string;
      enabled: boolean;
      insertion_order: number;
    }>;
  };
}

// 2. 独立的全局 Setting 面板配置
export interface AppSettings {
  apiProvider: "openai" | "custom";
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  proactiveFrequencyMinutes: number;
  forumAutoRefresh: boolean;
  userPersona: {
    name: string;
    description: string;
  };
}

// 3. 独立世界观档案
export interface WorldBookProfile {
  id: string;
  name: string;
  description: string;
  entries: Array<{
    id: string;
    keys: string[];
    content: string;
    enabled: boolean;
  }>;
  updatedAt: number;
}

// 4. 独立 User 身份档案
export interface UserPersonaProfile {
  id: string;
  name: string;
  avatar?: string;
  persona: string;
  updatedAt: number;
}

// 5. 独立对话预设
export interface ChatPresetProfile {
  id: string;
  name: string;
  systemPrompt: string;
  jailbreakPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
  updatedAt: number;
}