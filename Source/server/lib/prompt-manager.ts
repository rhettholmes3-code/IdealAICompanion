import fs from 'fs';
import path from 'path';

// ============ Types ============

export type SceneType = 'chat' | 'game' | 'task';
export type SilenceLevel = 'welcome' | 'short' | 'medium' | 'long';
export interface SceneContext {
    currentTime: string;
    location: string;
    interactionGoal?: string;
}

export interface PromptVariables {
    // Dynamic variables
    CURRENT_TIME?: string;
    LOCATION?: string;
    SCENE_TYPE?: string;
    GAME_TYPE?: string;

    // Scene module (auto-filled)
    SCENE_MODULE?: string;

    // Game/Task specific
    GAME_STATE?: string;
    TASK_STATE?: string;

    // User Memory Injection
    TARGET_USER?: string;
    RELATIONSHIP_EVOLUTION?: string;

    // Legacy compatibility
    INTERACTION_GOAL?: string;

    [key: string]: string | undefined;
}

export interface ProactiveConfig {
    welcome: Record<SceneType, string>;
    silence: Record<SceneType, Record<string, string>>;
    context_prefix: string;
}

// ============ PromptManager ============

export class PromptManager {
    private static instance: PromptManager;
    private proactiveConfigCache: Map<string, ProactiveConfig> = new Map();
    private sceneModuleCache: Map<string, string> = new Map();

    private constructor() { }

    static getInstance(): PromptManager {
        if (!PromptManager.instance) {
            PromptManager.instance = new PromptManager();
        }
        return PromptManager.instance;
    }

    // ============ Core Prompt Generation ============

    /**
     * 生成完整的 System Prompt
     * @param agentId Agent ID，如 "xiaoye"
     * @param sceneType 当前场景类型
     * @param overrides 变量覆盖
     */
    generateFinalPrompt(
        agentId: string,
        sceneType: SceneType = 'chat',
        overrides: Partial<PromptVariables> = {}
    ): string {
        // 1. 加载核心模板
        console.log(`[PromptManager] generateFinalPrompt: agent=${agentId}, scene=${sceneType}, gameType=${overrides.GAME_TYPE}`);
        const corePath = path.join(process.cwd(), 'config/prompts/agents', agentId, 'core.xml');

        if (!fs.existsSync(corePath)) {
            console.error(`[PromptManager] Core template not found: ${corePath}`);
            // Fallback to legacy path
            return this.generateLegacyPrompt(agentId, overrides);
        }

        let template = fs.readFileSync(corePath, 'utf-8');

        // 2. 检查是否为特定游戏模式 (Split-Brain)
        if (overrides.GAME_TYPE) {
            const gameTemplatePath = path.join(process.cwd(), 'config/prompts/games', `${overrides.GAME_TYPE}_fast.xml`);
            console.log(`[PromptManager] Checking game prompt at: ${gameTemplatePath}`);

            if (fs.existsSync(gameTemplatePath)) {
                console.log(`[PromptManager] Game prompt found! Loading...`);
                template = fs.readFileSync(gameTemplatePath, 'utf-8');
                // 游戏专用 Prompt 通常是完整的，不需要 SCENE_MODULE 注入，但为了兼容性还是加载一下
                // 实际上 turtle_soup_fast.xml 是一体化的，所以这里可以跳过 SCENE_MODULE 注入
                // 但要确保 SCENE_MODULE 变量被清空，以免残留
                overrides.SCENE_MODULE = '';
            } else {
                console.warn(`[PromptManager] Game prompt NOT found. Fallback to legacy path.`);
                // Fallback to core + scene structure
                const sceneModule = this.loadSceneModule(sceneType);
                overrides.SCENE_MODULE = sceneModule;
            }
        } else {
            // 正常模式：加载并注入场景模块
            const sceneModule = this.loadSceneModule(sceneType);
            overrides.SCENE_MODULE = sceneModule;
        }

        // 3. 设置场景类型显示名称
        const sceneTypeNames: Record<SceneType, string> = {
            'chat': '闲聊',
            'game': '游戏模式',
            'task': '任务处理'
        };
        overrides.SCENE_TYPE = sceneTypeNames[sceneType];

        // 4. 合并变量并替换
        const variables = this.getAllVariables(overrides);

        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            let replacement = value === undefined || value === null ? '' : value;

            // 特殊处理 relationship_evolution，如果是 JSON 字符串，尝试提取内容
            if (key === 'RELATIONSHIP_EVOLUTION' && typeof replacement === 'string' && replacement.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(replacement);
                    if (parsed.relationship_evolution) {
                        replacement = parsed.relationship_evolution;
                    } else if (parsed.relationship) {
                        replacement = parsed.relationship;
                    }
                } catch (e) {
                    // Ignore parse error, use as is
                }
            }

            template = template.split(placeholder).join(replacement);
        });

        return template;
    }

    /**
     * 兼容旧版调用方式
     */
    private generateLegacyPrompt(
        templateFilename: string,
        overrides: Partial<PromptVariables> = {}
    ): string {
        const templatePath = path.join(process.cwd(), 'config/prompts', templateFilename);

        if (!fs.existsSync(templatePath)) {
            console.error(`[PromptManager] Legacy template not found: ${templatePath}`);
            return '';
        }

        let template = fs.readFileSync(templatePath, 'utf-8');
        const variables = this.getAllVariables(overrides);

        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            const replacement = value === undefined || value === null ? '' : value;
            template = template.split(placeholder).join(replacement);
        });

        return template;
    }

    // ============ Scene Module Loading ============

    /**
     * 加载场景模块
     */
    private loadSceneModule(sceneType: SceneType): string {
        // Check cache
        if (this.sceneModuleCache.has(sceneType)) {
            return this.sceneModuleCache.get(sceneType)!;
        }

        const scenePath = path.join(process.cwd(), 'config/prompts/scenes', `${sceneType}.xml`);

        if (fs.existsSync(scenePath)) {
            const content = fs.readFileSync(scenePath, 'utf-8');
            this.sceneModuleCache.set(sceneType, content);
            return content;
        }

        console.warn(`[PromptManager] Scene module not found: ${sceneType}`);
        return '';
    }

    /**
     * 清除场景模块缓存（开发时热更新用）
     */
    clearCache(): void {
        this.sceneModuleCache.clear();
        this.proactiveConfigCache.clear();
    }

    // ============ Proactive Prompt Generation ============

    /**
     * 获取主动对话配置
     */
    getProactiveConfig(agentId: string): ProactiveConfig {
        if (this.proactiveConfigCache.has(agentId)) {
            return this.proactiveConfigCache.get(agentId)!;
        }

        const configPath = path.join(
            process.cwd(),
            'config/prompts/agents',
            agentId,
            'proactive_config.json'
        );

        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                this.proactiveConfigCache.set(agentId, config);
                return config;
            } catch (e) {
                console.error(`[PromptManager] Failed to parse proactive config: ${configPath}`, e);
            }
        }

        // Fallback default
        const defaultConfig: ProactiveConfig = {
            welcome: {
                chat: '请向用户打个招呼。',
                game: '欢迎回到游戏。',
                task: '任务处理中。'
            },
            silence: {
                chat: { short: '', medium: '用户沉默了，主动关心一下。', long: '用户很久没说话了。' },
                game: { short: '', medium: '给用户一个提示。', long: '用户可能卡住了。' },
                task: { short: '', medium: '任务还在处理。', long: '任务需要更多时间。' }
            },
            context_prefix: ''
        };
        return defaultConfig;
    }

    /**
     * 生成主动对话提示词
     */
    generateProactivePrompt(
        agentId: string,
        sceneType: SceneType,
        level: SilenceLevel,
        overrides: Partial<PromptVariables> = {}
    ): string {
        const config = this.getProactiveConfig(agentId);

        let template: string;
        if (level === 'welcome') {
            template = config.welcome[sceneType] || config.welcome.chat;
        } else {
            template = config.silence[sceneType]?.[level] || '';
        }

        if (!template) return '';

        // Add context prefix
        const prefix = config.context_prefix || '';
        template = prefix + template;

        // Replace variables
        const variables = this.getAllVariables(overrides);
        Object.entries(variables).forEach(([key, value]) => {
            template = template.split(`{{${key}}}`).join(value || '');
        });

        return template;
    }

    // ============ Variable Management ============

    private getAllVariables(overrides: Partial<PromptVariables>): PromptVariables {
        const defaults = this.getDefaultVariables();
        return { ...defaults, ...overrides };
    }

    private getDefaultVariables(): PromptVariables {
        const scene = this.generateSceneContext();

        return {
            CURRENT_TIME: scene.currentTime,
            LOCATION: scene.location,
            SCENE_TYPE: '闲聊',
            SCENE_MODULE: '',
            GAME_STATE: '',
            TASK_STATE: '',
            TARGET_USER: '',
            RELATIONSHIP_EVOLUTION: '',
            INTERACTION_GOAL: '日常陪伴'
        };
    }

    /**
     * 动态生成场景上下文
     */
    generateSceneContext(): { currentTime: string; location: string; interactionGoal?: string } {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const isWeekend = day === 0 || day === 6;
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

        const currentTime = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${dayNames[day]} ${hour.toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        let location = '家中';
        if (hour >= 10 && hour < 19 && !isWeekend) {
            location = '办公室';
        }

        return {
            currentTime,
            location,
            interactionGoal: '日常陪伴'
        };
    }
}

// ============ Convenience Export ============

/**
 * 便捷导出函数 - 新版 API
 */
export function generatePrompt(
    agentId: string,
    sceneType: SceneType = 'chat',
    overrides?: Partial<PromptVariables>
): string {
    return PromptManager.getInstance().generateFinalPrompt(agentId, sceneType, overrides);
}

/**
 * 兼容旧版调用
 * @deprecated Use generatePrompt instead
 */
export function getSystemPrompt(
    templateFilename: string,
    overrides?: Partial<PromptVariables>,
    userProfile?: any
): string {
    // Extract agentId from filename (e.g., "xiaoye.xml" -> "xiaoye")
    const agentId = templateFilename.replace('.xml', '');
    return PromptManager.getInstance().generateFinalPrompt(agentId, 'chat', overrides);
}
