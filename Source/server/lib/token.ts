import { createCipheriv, randomBytes } from 'crypto';

/**
 * ZEGO Token 生成工具 (基于 AppSign)
 * 参考 ZEGO 官方 Node.js 示例实现
 */

const enum AesEncryptMode {
    GCM = 1
}

function makeNonce(): number {
    const min = -Math.pow(2, 31);
    const max = Math.pow(2, 31) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function aesGcmEncrypt(plainText: string, key: string): { encryptBuf: Buffer; nonce: Buffer } {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    const encrypted = cipher.update(plainText, 'utf8');
    const encryptBuf = Buffer.concat([encrypted, cipher.final(), cipher.getAuthTag()]);
    return { encryptBuf, nonce };
}

export function generateToken04(
    appId: number,
    userId: string,
    secret: string,
    effectiveTimeInSeconds: number,
    payload?: string
): string {
    if (!appId || !userId || !secret || secret.length !== 32) {
        throw new Error('Invalid params for token generation');
    }

    const VERSION_FLAG = '04';
    const createTime = Math.floor(Date.now() / 1000);
    const tokenInfo = {
        app_id: appId,
        user_id: userId,
        nonce: makeNonce(),
        ctime: createTime,
        expire: createTime + effectiveTimeInSeconds,
        payload: payload || ''
    };

    const plaintText = JSON.stringify(tokenInfo);
    const { encryptBuf, nonce } = aesGcmEncrypt(plaintText, secret);

    const [b1, b2, b3, b4] = [new Uint8Array(8), new Uint8Array(2), new Uint8Array(2), new Uint8Array(1)];
    new DataView(b1.buffer).setBigInt64(0, BigInt(tokenInfo.expire), false);
    new DataView(b2.buffer).setUint16(0, nonce.byteLength, false);
    new DataView(b3.buffer).setUint16(0, encryptBuf.byteLength, false);
    new DataView(b4.buffer).setUint8(0, AesEncryptMode.GCM);

    const buf = Buffer.concat([
        Buffer.from(b1),
        Buffer.from(b2),
        Buffer.from(nonce),
        Buffer.from(b3),
        Buffer.from(encryptBuf),
        Buffer.from(b4),
    ]);

    return VERSION_FLAG + buf.toString('base64');
}
