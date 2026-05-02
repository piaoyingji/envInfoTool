import { Card, Col, Form, Input, Row, Select, Tag } from 'antd';
import { t } from '../lib/i18n';
import type { Lang, Organization } from '../lib/types';

export default function DataAdminPage({ lang, organizations }: { lang: Lang; organizations: Organization[] }) {
  return (
    <div className="admin-page">
      {organizations.map((org) => (
        <Card className="edit-org-card" key={org.id}>
          <div className="edit-org-head"><h2>{org.name}</h2><span>{org.code}</span></div>
          <div className="edit-grid">
            {org.environments.map((env) => (
              <Card className="edit-env-card" key={env.id}>
                <Form layout="vertical">
                  <Row gutter={16}>
                    <Col span={24}><Form.Item label={t(lang, 'environmentName')}><Input value={env.title} readOnly /></Form.Item></Col>
                    <Col span={24}><Form.Item label={t(lang, 'tags')}><Input value={env.tags.map((tag) => tag.name).join(', ')} readOnly /></Form.Item></Col>
                    <Col span={24}><Form.Item label={t(lang, 'url')}><Input value={env.url} readOnly /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label={t(lang, 'loginId')}><Input value={env.login_id} readOnly /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label={t(lang, 'password')}><Input value={env.login_password} readOnly /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item label="DB Type"><Select value={env.db_type || undefined} options={[{ value: 'Oracle' }, { value: 'PostgreSQL' }]} /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item label="DB Version"><Select value={env.db_version || undefined} options={[11, 12, 18, 19, 15, 16, 17].map((value) => ({ value: String(value) }))} /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item label={t(lang, 'dbAddress')}><Input value={[env.db_host, env.db_port, env.db_name].filter(Boolean).join(':')} readOnly /></Form.Item></Col>
                  </Row>
                </Form>
                <Tag color="cyan">2.5 Preview</Tag>
              </Card>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
