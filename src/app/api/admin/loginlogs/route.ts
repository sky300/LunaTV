import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/admin/loginlogs?username=<name>&limit=<n>
 *
 * - 站长可查询任意用户名；
 * - 非站长仅可查询自己的登录日志；
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get('username');
    const limitStr = searchParams.get('limit');
    const limit = Math.max(1, Math.min(Number(limitStr) || 50, 200));

    const config = await getConfig();

    // 权限与状态校验
    const isOwner = authInfo.username === process.env.USERNAME;

    // 用户名为空（包括未提供或空字符串）时的处理
    const isEmptyQuery = rawUsername === null || rawUsername.trim() === '';

    if (!isOwner) {
      // 非站长：只能查询自己的日志；当用户名为空时，默认查询本人
      const queryUser = isEmptyQuery ? authInfo.username : rawUsername!;

      if (queryUser !== authInfo.username) {
        return NextResponse.json({ error: '权限不足' }, { status: 403 });
      }
      // 检查用户存在或被封禁
      const user = config.UserConfig.Users.find(
        (u) => u.username === authInfo.username
      );
      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 401 });
      }
      if (user.banned) {
        return NextResponse.json({ error: '用户已被封禁' }, { status: 401 });
      }

      const logs = await db.getLoginLogs(queryUser, limit);
      return NextResponse.json({ logs }, { status: 200 });
    } else {
      // 站长查询其他用户时，允许直接访问；如需，可校验目标用户是否存在
      // 站长：
      // - 用户名为空 => 查询所有账户的登录日志（合并后按时间倒序，并按 limit 截断）
      // - 提供用户名 => 查询该用户的登录日志
      if (isEmptyQuery) {
        let allUsers = await db.getAllUsers();
        // 确保包含站长账号
        allUsers.push(process.env.USERNAME as string);
        allUsers = Array.from(new Set(allUsers));

        const allLogsArrays = await Promise.all(
          allUsers.map((u) => db.getLoginLogs(u, limit))
        );
        const merged = allLogsArrays.flat();
        // 按时间倒序排序
        merged.sort((a, b) => (b.time || 0) - (a.time || 0));
        // 截断到 limit 条
        const logs = merged.slice(0, limit);
        return NextResponse.json({ logs }, { status: 200 });
      } else {
        const logs = await db.getLoginLogs(rawUsername!, limit);
        return NextResponse.json({ logs }, { status: 200 });
      }
    }
  } catch (error) {
    console.error('获取登录日志失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/loginlogs
 * 删除登录日志
 * - 支持单条删除（logId参数）
 * - 支持多选删除（logIds参数，JSON数组）
 */
export async function DELETE(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const config = await getConfig();
    
    // 权限与状态校验
    const isOwner = authInfo.username === process.env.USERNAME;
    
    // 获取请求体
    const body = await request.json();
    const { logId, logIds, username } = body;
    
    // 验证用户名
    const queryUser = username || authInfo.username;
    
    if (!isOwner && queryUser !== authInfo.username) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }
    
    // 检查用户存在或被封禁
    const user = config.UserConfig.Users.find(
      (u) => u.username === queryUser
    );
    if (!user && queryUser !== process.env.USERNAME) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    
    // 执行删除操作
    if (logId) {
      // 单条删除
      await db.deleteLoginLog(queryUser, logId);
    } else if (logIds && Array.isArray(logIds)) {
      // 多选删除
      await db.deleteLoginLogs(queryUser, logIds);
    } else {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('删除登录日志失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}