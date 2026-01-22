---
name: configure_prompt
description: Guide on editing agent prompts, core.xml, and dynamic variables.
---

# Configure Prompt

Use this skill when modifying agent persona, system prompts, or adding dynamic variables.

## 1. Prompt Architecture
- **Core Template**: `Source/server/config/prompts/agents/[agentId]/core.xml`
- **Dynamic Variables**: `{{VARIABLE_NAME}}` format.
- **Scene Modules**: `Source/server/config/prompts/scenes/[sceneType].xml` (chat, game, task).
- **Proactive Config**: `proactive_config.json` (for "Talk First" behavior).

## 2. Editing Workflow

### Scenario A: Modify Persona (Static)
1. Open `core.xml` for the target agent.
2. Edit the `<Role>`, `<Character>`, or `<Style>` sections.
3. **Important**: Maintain the XML structure. Do not break tags.

### Scenario B: Add New Dynamic Variable
1. **Edit XML**: Add `{{NEW_VAR}}` to `core.xml`.
2. **Update Type**: Open `Source/server/lib/prompt-manager.ts`.
   - Add `NEW_VAR?: string;` to `PromptVariables` interface.
3. **Implement Injection**:
   - Locate `generateFinalPrompt` or `generateSceneContext`.
   - Add logic to populate `overrides.NEW_VAR`.

## 3. Validation
- Check `PromptManager.generateFinalPrompt` logs to ensure variable replacement works.
- Verify no `{{UNREPLACED_VAR}}` remains in the final string.
