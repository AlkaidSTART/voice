import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * 生成 RFC1123 格式的时间戳（UTC+0/GMT时区）
 */
function generateRFC1123Timestamp(): string {
  return new Date().toUTCString();
}

/**
 * 生成签名原始字段
 */
function buildSignatureOrigin(host: string, date: string, requestLine: string): string {
  return `host: ${host}\ndate: ${date}\n${requestLine}`;
}

/**
 * 生成签名
 */
function generateSignature(signatureOrigin: string, apiSecret: string): string {
  const hmac = crypto.createHmac('sha256', apiSecret);
  hmac.update(signatureOrigin);
  return hmac.digest('base64');
}

/**
 * 生成 authorization 参数
 */
function generateAuthorization(apiKey: string, signature: string): string {
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  return Buffer.from(authorizationOrigin).toString('base64');
}

/**
 * 构建 WebSocket 语音听写 URL（讯飞 iat 服务）
 */
function buildWsUrl(appId: string, apiKey: string, apiSecret: string): string {
  const host = 'iat.xf-yun.com';
  const requestLine = 'GET /v1 HTTP/1.1';
  const date = generateRFC1123Timestamp();
  
  const signatureOrigin = buildSignatureOrigin(host, date, requestLine);
  const signature = generateSignature(signatureOrigin, apiSecret);
  const authorization = generateAuthorization(apiKey, signature);
  
  return `wss://${host}/v1?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${host}`;
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    const APP_ID = process.env.NEXT_PUBLIC_XFYUN_APP_ID;
    const API_KEY = process.env.NEXT_PUBLIC_XFYUN_API_KEY;
    const API_SECRET = process.env.NEXT_PUBLIC_XFYUN_API_SECRET;

    if (!APP_ID || !API_KEY || !API_SECRET) {
      console.error('讯飞API配置缺失');
      return NextResponse.json(
        { error: '语音识别服务未配置' },
        { status: 503 }
      );
    }

    if (action === 'getUrl') {
      const wsUrl = buildWsUrl(APP_ID, API_KEY, API_SECRET);
      return NextResponse.json({
        success: true,
        wsUrl,
        appId: APP_ID,
      });
    }

    return NextResponse.json(
      { error: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('语音识别API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}