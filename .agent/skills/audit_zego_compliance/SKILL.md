---
name: audit_zego_compliance
description: Scan and fix common ZEGO AI Agent API violations (Priority mismatch, missing fields).
---

# Audit ZEGO Compliance

Use this skill when debugging, fixing errors, or performing a "health check" on the codebase.

## 1. Compliance Checklist

| Check Item | Golden Standard | Violation Example | Fix |
| :--- | :--- | :--- | :--- |
| **Priority Value** | `'Medium'` | `'Middle'`, `'Low'` (context dependent), `'High'` (reserved) | Change to `'Medium'` |
| **LLM Context** | `AddAnswerToHistory: true` | Missing or `false` | Add `AddAnswerToHistory: true` |
| **TTS Queue** | `SamePriorityOption: 'Enqueue'` | Missing | Add `SamePriorityOption: 'Enqueue'` |
| **Config Nesting**| `LLM: { Vendor: ... }` | `Vendor: ...` (flat) | Nest under `LLM: {}` |

## 2. Audit Steps (Manual Execution)

Run the following grep commands to find violations:

### Step 1: Check for Invalid Priority
```bash
grep -r "Priority: ['\"]Middle['\"]" Source/
```
**Action**: If found, replace with `Priority: 'Medium'`.

### Step 2: Check for Missing History in LLM Calls
```bash
# This is a heuristic check. Visually inspect usages of SendAgentInstanceLLM
grep -r -C 5 "SendAgentInstanceLLM" Source/
```
**Action**: Ensure `AddAnswerToHistory: true` exists in the params object.

### Step 3: Check for Flat Configs
```bash
grep -r "UpdateAgentInstance" Source/
```
**Action**: Check if `Vendor`/`Model` are direct children of the payload. If so, move them under `LLM`.

## 3. Auto-Fix Strategy
If you are confident, you can use `replace_file_content` to fix these directly.

**Example Fix (Priority):**
Target: `Priority: 'Middle'`
Replacement: `Priority: 'Medium'`

**Example Fix (History):**
Target: `Priority: 'Medium'`
Replacement: `Priority: 'Medium',\n            AddAnswerToHistory: true`
