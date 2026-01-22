---
name: implement_game_logic
description: Boilerplate for a wrapper class implementing IGameController.
---

# Implement Game Logic

Use this skill when the user asks to "add a new game", "create a new puzzle", or "implement game rules".

## 1. Concepts
The system uses `GameEngine` to manage game states. Each game must implement the `IGameController` interface.

- **Game Type**: A unique string ID (e.g., `turtle_soup`, `riddle`).
- **Session**: Stores the current state of a game room.
- **Controller**: The logic handler (start, turn, end).

## 2. Implementation Steps

### Step 1: Create Controller File
Create `Source/server/lib/games/[game_name]-controller.ts`.

**Template:**
```typescript
import { IGameController, GameSession, GameResult } from './game-engine';

export class YourGameController implements IGameController {
    /**
     * Initialize game state
     */
    start(session: GameSession, params?: any): GameResult {
        // Initialize state
        session.gameState = {
            // ... your custom state
            score: 0
        };
        
        return {
            success: true,
            message: "Game started successfully",
            data: {
                intro: "Welcome to the game! [Intro text...]",
                // ... other initial data
            }
        };
    }

    /**
     * Handle user input/turn
     */
    processTurn(session: GameSession, input: string): GameResult {
        // Logic here
        // ...
        
        return {
            success: true,
            message: "Turn processed",
            data: {
                reply: "AI reply here..."
            }
        };
    }

    /**
     * Clean up
     */
    end(session: GameSession): string {
        return "Game Over. Thanks for playing!";
    }
}
```

### Step 2: Register in Game Engine
Open `Source/server/lib/games/game-engine.ts`.
1. Import your controller.
2. Add it to the `controllers` map in the constructor.

```typescript
this.controllers.set('your_game_type', new YourGameController());
```

## 3. Verification
- Start the game via ActionDispatcher (`GAME` action).
- Verify `start` returns `success: true`.
- Verify `intro` text is returned in `data`.
