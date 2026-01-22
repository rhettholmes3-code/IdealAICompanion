/**
 * 动态场景功能验证脚本
 * 用于测试场景推断逻辑和 FeatureManager 开关
 */

// 模拟不同时间和用户画像的场景推断
const testCases = [
    {
        name: "周四下午 - 工作日办公室",
        time: new Date(2026, 0, 8, 15, 30), // 2026-01-08 15:30 周四
        userProfile: { work_habit: "frequent overtime" },
        expected: {
            location: "办公室",
            atmosphere: "忙碌工作中"
        }
    },
    {
        name: "周五晚上 - 周末前夕",
        time: new Date(2026, 0, 10, 21, 0), // 2026-01-10 21:00 周五
        userProfile: {},
        expected: {
            location: "家中沙发",
            atmosphere: "周末前夕的松弛感"
        }
    },
    {
        name: "周三深夜 - 加班用户",
        time: new Date(2026, 0, 8, 22, 30), // 2026-01-08 22:30 周三
        userProfile: { work_habit: "frequent overtime, including late nights" },
        expected: {
            location: "可能还在办公室加班",
            atmosphere: "加班辛苦"
        }
    },
    {
        name: "周六上午 - 周末休息",
        time: new Date(2026, 0, 11, 10, 0), // 2026-01-11 10:00 周六
        userProfile: {},
        expected: {
            location: "家中",
            atmosphere: "周末"
        }
    }
];

console.log("=".repeat(60));
console.log("动态场景功能验证");
console.log("=".repeat(60));

// 测试 FeatureManager
try {
    const { FeatureManager } = require('./lib/feature-manager');
    const fm = FeatureManager.getInstance();

    console.log("\n✅ FeatureManager 加载成功");
    console.log(`   dynamic_scene_context 开关状态: ${fm.isEnabled('dynamic_scene_context') ? '✅ 开启' : '❌ 关闭'}`);
    console.log(`   persona_evolution 开关状态: ${fm.isEnabled('persona_evolution') ? '✅ 开启' : '❌ 关闭'}`);
} catch (error) {
    console.error("\n❌ FeatureManager 加载失败:", error.message);
}

// 测试 PromptManager
try {
    const { PromptManager } = require('./lib/prompt-manager');
    const pm = PromptManager.getInstance();

    console.log("\n✅ PromptManager 加载成功");

    // 模拟不同时间的场景生成
    console.log("\n" + "=".repeat(60));
    console.log("场景推断测试");
    console.log("=".repeat(60));

    testCases.forEach((testCase, index) => {
        console.log(`\n[测试 ${index + 1}] ${testCase.name}`);

        // 临时修改系统时间（仅用于演示）
        const originalDate = Date;
        global.Date = class extends Date {
            constructor(...args) {
                if (args.length === 0) {
                    super(testCase.time);
                } else {
                    super(...args);
                }
            }
        };

        try {
            const scene = pm.generateSceneContext(testCase.userProfile);
            console.log(`   当前时间: ${scene.currentTime}`);
            console.log(`   推断地点: ${scene.location}`);
            console.log(`   推断氛围: ${scene.interactionGoal}`);

            // 验证
            const locationMatch = scene.location.includes(testCase.expected.location);
            const atmosphereMatch = scene.interactionGoal.includes(testCase.expected.atmosphere);

            if (locationMatch && atmosphereMatch) {
                console.log(`   结果: ✅ 推断正确`);
            } else {
                console.log(`   结果: ⚠️  推断可能需要调整`);
            }
        } catch (error) {
            console.log(`   结果: ❌ 错误 - ${error.message}`);
        } finally {
            global.Date = originalDate;
        }
    });

} catch (error) {
    console.error("\n❌ PromptManager 测试失败:", error.message);
}

console.log("\n" + "=".repeat(60));
console.log("验证完成");
console.log("=".repeat(60));
