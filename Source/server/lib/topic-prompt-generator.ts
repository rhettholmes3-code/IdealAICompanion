import { SceneContext } from './prompt-manager';

/**
 * 生成主动话题推荐的引导 Prompt
 * 根据沉默时长和场景生成不同程度的话题引导
 */
export function generateTopicPrompt(
    silenceLevel: 'short' | 'medium' | 'long',
    scene: SceneContext
): string {
    const sceneInfo = `当前场景：${scene.currentTime}，用户${scene.location}，氛围：${scene.interactionGoal}。`;

    const levelPrompts = {
        short: `${sceneInfo}用户有点沉默了，请你结合场景简单问候或发起一个轻松的小话题（15字以内）。`,
        medium: `${sceneInfo}用户沉默了一会儿，请你根据场景主动关心用户或推荐一个有趣的话题（20字以内）。`,
        long: `${sceneInfo}用户长时间沉默，请你温柔地确认用户是否还在，或者分享一个暖心的话题（20字以内）。`
    };

    return levelPrompts[silenceLevel];
}

/**
 * 根据沉默时长判断级别
 */
export function getSilenceLevel(silenceDuration: number): 'short' | 'medium' | 'long' {
    if (silenceDuration < 15) return 'short';
    if (silenceDuration < 30) return 'medium';
    return 'long';
}
