/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { LogType } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * POST /api/log
 * 记录操作日志
 * - 支持登录、搜索、播放三种日志类型
 */
export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { type, content } = body;

    // 验证日志类型
    if (!type || !Object.values(LogType).includes(type as LogType)) {
      return NextResponse.json({ error: '无效的日志类型' }, { status: 400 });
    }

    // 记录日志
    await db.addLoginLog(authInfo.username, {
      username: authInfo.username,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      ua: request.headers.get('user-agent') || '',
      success: true,
      time: Date.now(),
      type: type as LogType,
      content: content || '',
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('记录日志失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}