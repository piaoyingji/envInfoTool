import { Tag } from 'antd';
import type { ReactNode } from 'react';

const colorPool = ['magenta', 'green', 'cyan', 'orange', 'red', 'blue', 'purple', 'gold'];

export const tagColorByName: Record<string, string> = {
  oracle: 'magenta',
  'oracle 19': 'green',
  postgresql: 'cyan',
  'postgresql 16': 'orange',
  uhr: 'cyan',
  upds: 'magenta',
  phr: 'magenta',
  vpn: 'gold',
  '申请必要': 'orange',
  '本番': 'green',
  '社内': 'red',
  '開発': 'green',
  '开发': 'green',
  '教育': 'blue',
  'カスタマイズ': 'magenta',
  'テスト': 'blue',
  '测试': 'blue',
  '検証': 'purple',
  '验证': 'purple',
};

export function oneTagColor(name: string): string {
  const key = name.trim().toLowerCase();
  if (!key) return 'default';
  if (tagColorByName[key]) return tagColorByName[key];
  if (key.includes('oracle')) return 'magenta';
  if (key.includes('postgres')) return 'cyan';
  if (key.includes('vpn')) return 'gold';
  if (key.includes('申請') || key.includes('申请') || key.includes('必要')) return 'orange';
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return colorPool[hash % colorPool.length];
}

export function serviceTagColor(name: string): string {
  const key = name.trim().toLowerCase();
  if (!key) return 'default';
  if (key.includes('postgres')) return 'orange';
  if (key.includes('oracle')) return 'magenta';
  if (key.includes('minio')) return 'gold';
  if (key.includes('nacos')) return 'purple';
  if (key.includes('nginx')) return 'green';
  if (key.includes('apache')) return 'volcano';
  if (key.includes('tomcat')) return 'red';
  if (key.includes('rdp')) return 'blue';
  if (key.includes('ssh')) return 'cyan';
  return 'geekblue';
}

export default function OneTag({ children, name, color, icon, className, kind = 'tag' }: { children?: ReactNode; name?: string; color?: string; icon?: ReactNode; className?: string; kind?: 'tag' | 'service' }) {
  const label = name || (typeof children === 'string' ? children : '');
  const resolvedColor = color || (kind === 'service' ? serviceTagColor(label) : oneTagColor(label));
  return (
    <Tag className={`one-tag${className ? ` ${className}` : ''}`} color={resolvedColor} icon={icon}>
      {children || label}
    </Tag>
  );
}
