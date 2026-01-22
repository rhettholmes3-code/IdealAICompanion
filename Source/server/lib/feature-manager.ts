import fs from 'fs';
import path from 'path';

interface FeatureConfig {
    enabled: boolean;
    description: string;
    default: boolean;
    config?: any;
}

interface FeaturesData {
    version: string;
    last_updated: string;
    description: string;
    features: Record<string, FeatureConfig>;
    experimental?: {
        description: string;
        features: Record<string, FeatureConfig>;
    };
}

/**
 * FeatureManager - 统一管理实验性功能开关
 * 
 * 功能：
 * - 读取 config/features.json 配置文件
 * - 提供功能开关查询接口
 * - 提供功能配置参数获取接口
 * - 支持运行时动态切换（可选）
 */
export class FeatureManager {
    private static instance: FeatureManager;
    private config: FeaturesData;
    private configPath: string;

    private constructor() {
        this.configPath = path.join(process.cwd(), 'config/features.json');
        this.config = this.loadConfig();
    }

    static getInstance(): FeatureManager {
        if (!FeatureManager.instance) {
            FeatureManager.instance = new FeatureManager();
        }
        return FeatureManager.instance;
    }

    private loadConfig(): FeaturesData {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.warn(`[FeatureManager] Config file not found: ${this.configPath}`);
                return this.getDefaultConfig();
            }

            const content = fs.readFileSync(this.configPath, 'utf-8');
            const config = JSON.parse(content);
            console.log('[FeatureManager] Config loaded successfully');
            return config;
        } catch (error) {
            console.error('[FeatureManager] Failed to load config:', error);
            return this.getDefaultConfig();
        }
    }

    private getDefaultConfig(): FeaturesData {
        return {
            version: '1.0.0',
            last_updated: new Date().toISOString(),
            description: 'Default feature configuration',
            features: {}
        };
    }

    /**
     * 检查功能是否启用
     * @param featureName 功能名称（如 'dynamic_scene_context'）
     * @returns 是否启用
     */
    isEnabled(featureName: string): boolean {
        const feature = this.config.features[featureName];
        if (!feature) {
            // 如果功能不存在，检查实验性功能
            const experimentalFeature = this.config.experimental?.features[featureName];
            return experimentalFeature?.enabled ?? false;
        }
        return feature.enabled ?? false;
    }

    /**
     * 获取功能的配置参数
     * @param featureName 功能名称
     * @returns 配置对象
     */
    getFeatureConfig(featureName: string): any {
        const feature = this.config.features[featureName];
        if (!feature) {
            const experimentalFeature = this.config.experimental?.features[featureName];
            return experimentalFeature?.config ?? {};
        }
        return feature.config ?? {};
    }

    /**
     * 动态切换功能开关（运行时）
     * @param featureName 功能名称
     * @param enabled 是否启用
     */
    toggleFeature(featureName: string, enabled: boolean): void {
        if (this.config.features[featureName]) {
            this.config.features[featureName].enabled = enabled;
            this.persistConfig();
            console.log(`[FeatureManager] Toggled ${featureName} to ${enabled}`);
        } else if (this.config.experimental?.features[featureName]) {
            this.config.experimental.features[featureName].enabled = enabled;
            this.persistConfig();
            console.log(`[FeatureManager] Toggled experimental ${featureName} to ${enabled}`);
        } else {
            console.warn(`[FeatureManager] Feature not found: ${featureName}`);
        }
    }

    /**
     * 持久化配置到文件（可选）
     */
    private persistConfig(): void {
        try {
            this.config.last_updated = new Date().toISOString();
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            console.log('[FeatureManager] Config persisted successfully');
        } catch (error) {
            console.error('[FeatureManager] Failed to persist config:', error);
        }
    }

    /**
     * 重新加载配置（用于热更新）
     */
    reload(): void {
        this.config = this.loadConfig();
        console.log('[FeatureManager] Config reloaded');
    }

    /**
     * 获取所有功能列表（用于调试/管理界面）
     */
    getAllFeatures(): Record<string, FeatureConfig> {
        return {
            ...this.config.features,
            ...(this.config.experimental?.features ?? {})
        };
    }
}
