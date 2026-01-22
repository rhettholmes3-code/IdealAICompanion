---
name: diagnose_errors
description: Identify and resolve common runtime errors (ZEGO, MongoDB, Network).
---

# Diagnose Errors Skill

Use this skill to identify known error patterns in logs and apply proven fixes.

## Error Catalog

### 1. ZEGO RTC / AI Agent Errors

#### `410001002` (Agent Instance Not Found)
- **Symptom**: API returns `Code: 410001002, Message: "agent instance not found"`.
- **Cause**: The Agent Instance ID held by the frontend is expired or invalid (e.g., page was idle for too long).
- **Fix**: Refresh the browser page to generate a new Instance ID.

#### `410000003` (Param Error)
- **Symptom**: 400 Bad Request or SDK throws invalid param.
- **Cause**: Missing required fields in API calls (e.g., `LLM` config, `TTS` parameters).
- **Fix**: Check `action-dispatcher` or `route.ts`. Ensure `LLM` object has `Model`, `Vendor`, etc.

#### `410000018` (Rate Limit)
- **Symptom**: SDK returns QPS limit exceeded.
- **Fix**: Implement throttling or retry logic with exponential backoff.

### 2. Database (MongoDB) Errors

#### `MongoServerError: Updating the path 'x' would create a conflict at 'x'`
- **Code**: `ConflictingUpdateOperators` (Code 40)
- **Cause**: In a `findOneAndUpdate` with `upsert: true`, the same field appears in both `$set` (update) and `$setOnInsert` (default). Mongoose considers this a conflict even if one is `undefined`.
- **Fix**:
  1. Explicitly remove `undefined` keys from the `$set` object.
  2. Ensure `$set` and `$setOnInsert` have disjoint keys.

#### `ESERVFAIL` / `queryTxt ESERVFAIL`
- **Symptom**: MongoDB connection fails with DNS timeout/error.
- **Cause**: Network environment (VPN/Proxy) blocks `SRV` DNS records used by `mongodb+srv://`.
- **Fix**:
  1. Use the **Standard Connection String** (`mongodb://host:port,...`) instead of SRV.
  2. Check `DNS Overwrite` settings in proxy software.

### 3. Network / API Errors

#### `ENOTFOUND` (e.g., `aigc-aiagent-api.zegotech.cn`)
- **Symptom**: `getaddrinfo ENOTFOUND` for backend API calls.
- **Cause**: The Node.js server cannot resolve the domain. Often caused by:
  - Proxy/VPN interference (Tun mode, Fake-IP).
  - DNS pollution.
- **Fix**:
  - Add domain to proxy whitelist/direct rule.
  - Disable proxy for local dev server testing.
  - Ensure server machine has valid DNS configuration.
