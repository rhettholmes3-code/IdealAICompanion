import axios from 'axios';

export interface BailianResponse {
    success: boolean;
    output?: {
        text: string;
        session_id: string;
    };
    error?: any;
}

export class BailianService {
    private appId: string;
    private apiKey: string;
    private baseUrl: string = 'https://dashscope.aliyuncs.com/api/v1/apps';

    constructor(appId: string, apiKey: string) {
        this.appId = appId;
        this.apiKey = apiKey;
    }

    /**
     * Specialized method for Memory Agent
     */
    async interact(transcript: string, sessionId?: string, initialMemory?: string): Promise<BailianResponse> {
        // Construct explicit instruction for the Memory Agent
        const systemInstruction = `
[Task]
Analyze the dialogue history and update the User Profile and Relationship Evolution.
Output JSON format with 'memory' (user profile) and 'relationship_evolution'.

[Focus Areas]
- Basic Info: Name, Age, Gender, **LOCATION (City/Region)**
- Preferences: Food, Drink, Hobbies, Dislikes
- Relationship: Current status, dynamic changes

[Current Memory State]
${initialMemory || '{}'}

[New Dialogue]
${transcript}
`;
        return this.completion(systemInstruction, sessionId);
    }

    /**
     * Generic completion method for any prompt
     */
    async completion(prompt: string, sessionId?: string): Promise<BailianResponse> {
        const url = `${this.baseUrl}/${this.appId}/completion`;
        const payload = {
            input: {
                prompt: prompt,
                session_id: sessionId
            },
            parameters: {},
            debug: {}
        };

        // [Debug] Log full payload to inspect what is sent
        console.log('[Bailian] Payload Input Prompt:', JSON.stringify(payload.input.prompt).substring(0, 200) + '...');

        try {
            console.log(`[Bailian] Calling API with sessionId: ${sessionId || 'new'}`);
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 && response.data.output) {
                return {
                    success: true,
                    output: response.data.output
                };
            } else {
                return {
                    success: false,
                    error: response.data
                };
            }
        } catch (error: any) {
            console.error('[Bailian] API Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    parseOutput(text: string): { memory?: any; relationship?: string } {
        // Attempt to parse JSON from the output text.
        // The LLM might wrap it in ```json ... ``` or just return JSON.
        try {
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : text;

            const parsed = JSON.parse(jsonStr);
            console.log('[Bailian] Raw Parsed Output:', parsed);

            // 扁平化处理：百炼可能返回嵌套结构
            let userProfile = parsed.memory || parsed.user_profile || {};
            let relationship = parsed.relationship_evolution || parsed.relationship || '';

            // 如果 memory 里错误嵌套了 relationship_evolution，拆分出来
            if (userProfile && typeof userProfile === 'object') {
                if (userProfile.relationship_evolution) {
                    relationship = userProfile.relationship_evolution;
                    delete userProfile.relationship_evolution;
                }
                // 如果 memory 里有嵌套的 memory 字段，提取出来
                if (userProfile.memory) {
                    userProfile = userProfile.memory;
                }
            }

            // 确保 relationship 是字符串
            if (typeof relationship === 'object') {
                relationship = JSON.stringify(relationship);
            }

            console.log('[Bailian] Normalized Output:', { memory: userProfile, relationship });

            return {
                memory: userProfile,
                relationship: relationship
            };
        } catch (e) {
            console.warn('[Bailian] Failed to parse JSON output:', e);
            return {};
        }
    }
}
