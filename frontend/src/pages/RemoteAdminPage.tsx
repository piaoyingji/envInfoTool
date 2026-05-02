import { Card, Col, Form, Input, Row, Select, Tag } from 'antd';
import { t } from '../lib/i18n';
import type { Lang, Organization } from '../lib/types';

export default function RemoteAdminPage({ lang, organizations }: { lang: Lang; organizations: Organization[] }) {
  return (
    <div className="admin-page">
      {organizations.map((org) => (
        <Card className="edit-org-card" key={org.id}>
          <div className="edit-org-head"><h2>{org.name}</h2><span>{org.code}</span></div>
          <div className="edit-grid">
            {org.environments.flatMap((env) => env.remoteConnections.map((remote) => (
              <Card className="edit-env-card" key={remote.id}>
                <Form layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24} md={8}><Form.Item label={t(lang, 'environmentName')}><Input value={env.title} readOnly /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item label={t(lang, 'type')}><Select value={remote.type} options={[{ value: 'RDP' }, { value: 'SSH' }]} /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item label={t(lang, 'serverAddress')}><Input value={`${remote.host}:${remote.port || ''}`} readOnly /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label={t(lang, 'serverUser')}><Input value={remote.username} readOnly /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label={t(lang, 'serverPassword')}><Input value={remote.password} readOnly /></Form.Item></Col>
                  </Row>
                </Form>
                <Tag color={remote.type === 'RDP' ? 'blue' : 'green'}>{remote.type}</Tag>
              </Card>
            )))}
          </div>
        </Card>
      ))}
    </div>
  );
}
