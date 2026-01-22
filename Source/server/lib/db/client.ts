import mongoose from 'mongoose';

// Fix global type access
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    let uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    // SANITIZATION: Fix common copy-paste error where appName is empty or malformed
    // e.g. "...?w=majority&appName=" or ".../?appName" (no equals)
    if (uri.includes('appName')) {
        console.log('[MongoDB] Sanitizing URI (removing appName parameter)...');

        // Remove "appName" parameter entirely, logic:
        // Match (?|&)appName(=something)?
        uri = uri.replace(/([?&])appName(=[^&]*)?/g, (match, prefix) => {
            // If it started with ?, keep ? (to start next param if any)
            // If it started with &, remove it (effectively collapsing preceeding param to next)
            return prefix === '?' ? '?' : '';
        });

        // Clean up artifacts
        // 1. "&&" -> "&"
        uri = uri.replace(/&&/g, '&');
        // 2. "?&" -> "?" (if first param was removed and next one started with &? unlikely but safe)
        uri = uri.replace(/\?&/g, '?');

        // 3. Trailing "?" or "&" (if last param was removed)
        if (uri.endsWith('?') || uri.endsWith('&')) {
            uri = uri.slice(0, -1);
        }
    }

    // Debug: Log masked URI
    const masked = uri.replace(/:([^:@]+)@/, ':****@');
    console.log(`[MongoDB] Connecting to: ${masked}`);

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000, // Fail fast after 5 seconds
        };

        cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
            console.log('[MongoDB] Connected successfully');
            return mongoose;
        });
    }


    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('[MongoDB] Connection failed:', e);
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
