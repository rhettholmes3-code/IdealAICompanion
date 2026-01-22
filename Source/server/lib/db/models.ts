import mongoose, { Schema, Model, Document } from 'mongoose';

// --- User Memory Schema ---
export interface IUserMemory extends Document {
    userId: string;
    agentId: string;
    targetUser: string;
    relationshipEvolution: string;
    lastUpdated: number;
}

const UserMemorySchema = new Schema<IUserMemory>({
    userId: { type: String, required: true },
    agentId: { type: String, required: true },
    targetUser: { type: String, default: '' },
    relationshipEvolution: { type: String, default: '' },
    lastUpdated: { type: Number, default: () => Date.now() }
});

// Composite unique index to ensure one memory per user-agent pair
UserMemorySchema.index({ userId: 1, agentId: 1 }, { unique: true });


// --- Game Session Schema ---
// Allows us to query by roomId efficiently
export interface IGameSession extends Document {
    roomId: string; // The ZEGO Room ID
    gameType: 'turtle_soup' | 'riddle' | 'idiom_chain';
    status: 'idle' | 'playing' | 'paused' | 'finished';

    // Game State (Optional fields depending on game type)
    gameId?: string;
    kipsHit?: number[];      // For Turtle Soup
    progressScore?: number;  // For Turtle Soup
    lastAnalysis?: any;      // JSON for last judge result

    // Specific Game Data (Mixed Types for flexibility)
    // We use Mixed to store the raw puzzle/riddle objects as they are in the JSON files
    currentPuzzle?: any;
    currentRiddle?: any;
    currentIdiom?: any;

    history: Array<{
        role: 'user' | 'agent' | 'system';
        content: string;
        timestamp: number;
    }>;

    hintCount?: number;

    // Timestamps
    createdAt: number;
    updatedAt: number;
}

const GameSessionSchema = new Schema<IGameSession>({
    roomId: { type: String, required: true, unique: true },
    gameType: { type: String, required: true, enum: ['turtle_soup', 'riddle', 'idiom_chain'] },
    status: { type: String, required: true, enum: ['idle', 'playing', 'paused', 'finished'], default: 'idle' },

    gameId: String,
    kipsHit: [Number],
    progressScore: Number,
    lastAnalysis: Schema.Types.Mixed,

    currentPuzzle: Schema.Types.Mixed,
    currentRiddle: Schema.Types.Mixed,
    currentIdiom: Schema.Types.Mixed,

    history: [{
        _id: false, // No need for separate IDs for history items
        role: { type: String, enum: ['user', 'agent', 'system'] },
        content: String,
        timestamp: Number
    }],

    hintCount: { type: Number, default: 0 },

    // We explicitly define number fields for timestamps to match existing interface
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, default: () => Date.now() }
}, {
    // Mongoose can also handle createdAt/updatedAt automatically, 
    // but we'll stick to our manual number control to minimize interface friction
    timestamps: false
});

// TTL Index: Automatically delete sessions that haven't been updated in 24 hours
// 24 hours = 86400 seconds
GameSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

// Singleton Model Initialization
// Next.js hot reload can cause "Cannot overwrite model once compiled" error
// So we check mongoose.models first
export const UserMemory: Model<IUserMemory> = mongoose.models.UserMemory || mongoose.model<IUserMemory>('UserMemory', UserMemorySchema);
export const GameSession: Model<IGameSession> = mongoose.models.GameSession || mongoose.model<IGameSession>('GameSession', GameSessionSchema);
