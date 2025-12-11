'use client';

import { useEffect, useState } from 'react';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

interface LoginLog {
  id?: string;
  username: string;
  ip: string;
  ua: string;
  success: boolean;
  reason?: string;
  time: number;
  type: 'login' | 'search' | 'play';
  content?: string;
}

export default function AdminLoginLogs() {
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const info = getAuthInfoFromBrowserCookie();
    if (info?.username) {
      setAuthUser(info.username);
    }
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (username) params.set('username', username);
      if (limit) params.set('limit', String(limit));
      const res = await fetch(`/api/admin/loginlogs?${params.toString()}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `请求失败(${res.status})`);
      }
      const data = await res.json();
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setSelectedLogs([]);
    } catch (e: any) {
      setError(e?.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const deleteSingleLog = async (logId: string) => {
    if (!window.confirm('确定要删除这条日志吗？')) return;
    
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/admin/loginlogs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logId,
          username: username || authUser || '',
        }),
      });
      
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `删除失败(${res.status})`);
      }
      
      setLogs(logs.filter(log => log.id !== logId));
      setSelectedLogs(selectedLogs.filter(id => id !== logId));
    } catch (e: any) {
      setDeleteError(e?.message || '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteSelectedLogs = async () => {
    if (selectedLogs.length === 0) {
      setDeleteError('请选择要删除的日志');
      return;
    }
    
    if (!window.confirm(`确定要删除选中的${selectedLogs.length}条日志吗？`)) return;
    
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/admin/loginlogs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logIds: selectedLogs,
          username: username || authUser || '',
        }),
      });
      
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `删除失败(${res.status})`);
      }
      
      setLogs(logs.filter(log => !selectedLogs.includes(log.id || '')));
      setSelectedLogs([]);
    } catch (e: any) {
      setDeleteError(e?.message || '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleLogSelection = (logId: string) => {
    setSelectedLogs(prev => {
      if (prev.includes(logId)) {
        return prev.filter(id => id !== logId);
      } else {
        return [...prev, logId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log.id || '').filter(Boolean));
    }
  };

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                placeholder={authUser ? `留空查询所有账户（仅站长），默认：${authUser}` : '留空查询所有账户（仅站长）'}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                非站长仅可查询自己的登录日志；用户名留空时，站长可查询所有账户的登录日志。
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">条数</label>
              <input
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(Number(e.target.value || 50), 200)))}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchLogs}
                disabled={loading}
                className={`px-3 py-2 rounded-md text-sm font-medium ${loading ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white'} transition-colors w-full`}
              >
                {loading ? '加载中...' : '查询'}
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {deleteError && (
          <div className="mt-3 text-sm text-red-600 dark:text-red-400">{deleteError}</div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {logs.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 p-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={logs.length > 0 && selectedLogs.length === logs.length}
                onChange={toggleSelectAll}
                disabled={logs.length === 0}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">全选</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              已选择 {selectedLogs.length} / {logs.length} 条
            </div>
            <button
              onClick={deleteSelectedLogs}
              disabled={selectedLogs.length === 0 || deleteLoading}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedLogs.length === 0 || deleteLoading ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white' : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white'}`}
            >
              {deleteLoading ? '删除中...' : `删除选中(${selectedLogs.length})`}
            </button>
          </div>
        )}
        
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-10">
                <input
                  type="checkbox"
                  checked={logs.length > 0 && selectedLogs.length === logs.length}
                  onChange={toggleSelectAll}
                  disabled={logs.length === 0}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">时间</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">用户名</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">类型</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">内容</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">IP</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">结果</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  {loading ? '正在加载...' : '暂无数据'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id || `${log.time}-${log.username}`} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {log.id && (
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log.id)}
                        onChange={() => log.id && toggleLogSelection(log.id)}
                        disabled={deleteLoading}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-blue-500"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatTime(log.time)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{log.username}</td>
                  <td className="px-4 py-2 text-sm whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${log.type === 'login' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : log.type === 'search' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'}`}>
                      {log.type === 'login' ? '登录' : log.type === 'search' ? '搜索' : '播放'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate" title={log.content}>
                    {log.content || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{log.ip}</td>
                  <td className="px-4 py-2 text-sm whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${log.success ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>
                      {log.success ? '成功' : '失败'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm whitespace-nowrap">
                    {log.id && (
                      <button
                        onClick={() => log.id && deleteSingleLog(log.id)}
                        disabled={deleteLoading}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${deleteLoading ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white' : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white'}`}
                        title="删除日志"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}