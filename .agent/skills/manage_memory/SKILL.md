---
name: manage_memory
description: Standard usage of MemoryManager for user profiles and long-term memory.
---

# Manage Memory

Use this skill when you need to read, write, or update user long-term memory (User Profile).

## 1. Architecture
- **MemoryManager**: Singleton class handling file-based json storage.
- **Storage Location**: `Source/server/data/memory/[userId].json` (typically).

## 2. Standard Usage

### Read Memory
```typescript
import { MemoryManager } from '@/lib/memory-manager';

const memoryManager = MemoryManager.getInstance();
const userMemory = memoryManager.getUserMemory(userId, agentId);

// Access fields
const name = userMemory.targetUser; // "User's Name"
const evolution = userMemory.relationshipEvolution; // Relationship summary
```

### Update Memory
```typescript
// Update specific fields
await memoryManager.updateUserMemory(userId, agentId, {
    targetUser: "New Name",
    // Merge new events into evolution summary
    relationshipEvolution: currentEvolution + "\n[Event] User did X." 
});
```

## 3. Prompt Injection
Memory is automatically injected into `{{TARGET_USER}}` and `{{RELATIONSHIP_EVOLUTION}}` by `ActionDispatcher.updateAgentPromptState`. You usually **do not** need to manually inject it unless you are bypassing the dispatcher.
