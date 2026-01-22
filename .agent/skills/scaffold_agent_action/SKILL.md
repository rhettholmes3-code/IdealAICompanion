---
name: scaffold_agent_action
description: Generate boilerplate code for new ZEGO AI Agent actions, ensuring API compliance (Priority, Headers, etc).
---

# Scaffold ZEGO Agent Action

Use this skill when the user asks to "add a new action", "implement a game feature", or "handle a new intent". This skill ensures that all new code adheres to the "Golden Standard" of ZEGO API usage.

## 1. Context Analysis
First, identify the following from the user's request:
- **Action Name**: (e.g., `TELL_JOKE`, `START_GAME`)
- **Parameters**: What data is needed? (e.g., `jokeType`, `gameId`)
- **Response Type**:
    - **LLM Reply**: The agent should "think" and reply with personality (Use `SendAgentInstanceLLM`).
    - **System Notification**: The system should broadcast a message directly (Use `SendAgentInstanceTTS`).

## 2. Code Generation Standards

### Standard 1: Action Dispatcher Case
In `action-dispatcher.ts`, generate a new case block.

**Template (LLM Reply):**
```typescript
case 'YOUR_ACTION_NAME':
    // 1. Execute Logic (if any)
    const result = await this.yourLogicService.execute(payload.params);

    // 2. Send Result to Agent (Standard Call)
    await sendZegoRequest('SendAgentInstanceLLM', {
        AgentInstanceId: payload.instanceId,
        Text: `[系统消息] ${result}\n请用有趣的语气播报以上内容。`, // Context injection
        Priority: 'Medium',          // CRITICAL: Must be 'Medium'
        AddAnswerToHistory: true     // CRITICAL: Must be true
    });
    break;
```

**Template (System Notification):**
```typescript
case 'YOUR_SYSTEM_ACTION':
    await sendZegoRequest('SendAgentInstanceTTS', {
        AgentInstanceId: payload.instanceId,
        Text: "系统提示：游戏即将开始...",
        Priority: 'Medium',
        SamePriorityOption: 'Enqueue' // CRITICAL: Prevent cut-off
    });
    break;
```

### Standard 2: Interface Definition
Always define the payload interface if parameters are complex.

## 3. Implementation Steps
1.  **Read** `Source/server/lib/action-dispatcher.ts` to find the `switch` statement.
2.  **Generate** the code snippet using the templates above.
3.  **Apply** the edit using `replace_file_content` (or `multi_replace` if adding imports).

## 4. Verification
After generating code, verify:
- Is `Priority: 'Medium'`?
- Is `AddAnswerToHistory: true` (for LLM)?
- Is `SamePriorityOption: 'Enqueue'` (for TTS)?
