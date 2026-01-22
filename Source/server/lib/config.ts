import fs from 'fs';
import path from 'path';

export interface AgentConfig {
    id: string;
    zego_agent_id: string;
    name: string;
    backgroundImage: string;
    order?: number;
    agent_info: {
        name: string;
        description: string;
        llm: {
            Vendor: string;
            Url: string;
            ApiKey: string;
            Model?: string;
            Visibility?: number;
            MaxTokens?: number;
            PresencePenalty?: number;
            FrequencyPenalty?: number;
        };
    };
    tts: {
        Vendor: string;
        Params: {
            app?: {
                api_key: string;
            };
            model: string;
            voice_setting: {
                voice_id: string;
            };
        };
        FilterTags?: {
            Enabled: boolean;
            Pattern: string;
        };
    };
    asr: {
        Vendor: string;
        VADSilenceSegmentation: number;
        Params: {
            hotword_list: string;
        };
    };
    prompt: {
        template: string;
    };
    interaction?: {
        welcome: string;
        silence: {
            short: string;  // 5s
            medium: string; // 15s
            long: string;   // 30s
        };
    };
    bailian?: {
        appId: string;
        apiKey: string;
    };
}

export class ConfigManager {
    private static instance: ConfigManager;
    private agentsDir: string;

    private constructor() {
        this.agentsDir = path.join(process.cwd(), 'config/agents');
    }

    static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    loadAllAgents(): AgentConfig[] {
        if (!fs.existsSync(this.agentsDir)) {
            console.warn(`Agents directory not found: ${this.agentsDir}`);
            return [];
        }

        const files = fs.readdirSync(this.agentsDir);
        const agents: AgentConfig[] = [];

        for (const file of files) {
            if (path.extname(file) === '.json') {
                try {
                    const configPath = path.join(this.agentsDir, file);
                    const fileContent = fs.readFileSync(configPath, 'utf-8');
                    const config = JSON.parse(fileContent) as AgentConfig;

                    // Simple validation
                    if (config.id && config.name) {
                        agents.push(config);
                    }
                } catch (error) {
                    console.error(`Failed to load agent config from ${file}:`, error);
                }
            }
        }
        return agents;
    }

    getAgentConfig(agentId: string): AgentConfig | null {
        // Since we want real-time updates, we can either scan all or just try to read the specific file.
        // Assuming agentId maps to filename for simplicity, or we scan all to find matching ID.
        // Reading specific file is more efficient if agentId == filename (excluding ext).
        // But the plan says "Server Config Loading: Start server, check logs...".
        // And the user asked "scan and load all agents".
        // Let's reuse loadAllAgents for consistency or implement specific file read.

        // Strategy: Scan all to find the one with matching ID. 
        // This is safer if filename != agentId, though we recommend they match.
        const agents = this.loadAllAgents();
        return agents.find(agent => agent.id === agentId) || null;
    }
}

