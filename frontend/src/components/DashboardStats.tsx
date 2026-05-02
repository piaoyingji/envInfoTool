import { DesktopOutlined, SafetyCertificateOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { Card, Col, Row, Statistic } from 'antd';
import type { ReactNode } from 'react';
import type { Lang } from '../lib/types';
import { t } from '../lib/i18n';

export default function DashboardStats({ lang, customers, servers, vpns, issues }: { lang: Lang; customers: number; servers: number; vpns: number; issues: number }) {
  return (
    <Row gutter={[16, 16]} className="stat-row">
      <StatCard icon={<TeamOutlined />} label={t(lang, 'customerTotal')} value={customers} color="blue" />
      <StatCard icon={<DesktopOutlined />} label={t(lang, 'serverCount')} value={servers} color="teal" />
      <StatCard icon={<SafetyCertificateOutlined />} label={t(lang, 'vpnTotal')} value={vpns} color="gold" />
      <StatCard icon={<WarningOutlined />} label={t(lang, 'alertTotal')} value={issues} color="red" />
    </Row>
  );
}

function StatCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color: string }) {
  return (
    <Col xs={12} md={6}>
      <Card className={`stat-card ${color}`}>
        <div className="stat-icon">{icon}</div>
        <Statistic title={label} value={value} />
      </Card>
    </Col>
  );
}
