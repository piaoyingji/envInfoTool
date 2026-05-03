import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Select, Space, Typography, message } from 'antd';
import { useState } from 'react';
import onecrmLogo from '../assets/onecrm-logo.svg';
import { forgotPassword, login, resetPassword } from '../lib/api';
import { t } from '../lib/i18n';
import type { CurrentUser, Lang } from '../lib/types';

export default function LoginPage({ lang, onLangChange, onLogin }: { lang: Lang; onLangChange: (lang: Lang) => void; onLogin: (user: CurrentUser) => void }) {
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(new URLSearchParams(location.search).get('resetToken') ? 'reset' : 'login');
  const [busy, setBusy] = useState(false);
  const resetToken = new URLSearchParams(location.search).get('resetToken') || '';

  const submitLogin = async (values: { username: string; password: string }) => {
    setBusy(true);
    try {
      const result = await login(values.username, values.password);
      onLogin(result.user);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (values: { usernameOrEmail: string }) => {
    setBusy(true);
    try {
      await forgotPassword(values.usernameOrEmail);
      message.success(lang === 'zh' ? '如果账号存在，重置邮件已经发送。' : 'アカウントが存在する場合、再設定メールを送信しました。');
      setMode('login');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (values: { newPassword: string }) => {
    setBusy(true);
    try {
      await resetPassword(resetToken, values.newPassword);
      message.success(t(lang, 'save'));
      history.replaceState(null, '', '/index.html');
      setMode('login');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <img src={onecrmLogo} alt="OneCRM" />
          <div>
            <h1>OneCRM</h1>
            <p>{t(lang, 'loginSubtitle')}</p>
          </div>
        </div>
        <div className="login-lang">
          <Select value={lang} onChange={onLangChange} options={[{ value: 'ja', label: '日本語' }, { value: 'zh', label: '中文' }]} />
        </div>
        {mode === 'login' && (
          <Form layout="vertical" onFinish={submitLogin}>
            <Form.Item name="username" label={t(lang, 'username')} rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label={t(lang, 'password')} rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={busy} block>{t(lang, 'login')}</Button>
            <Button type="link" onClick={() => setMode('forgot')}>{t(lang, 'forgotPassword')}</Button>
          </Form>
        )}
        {mode === 'forgot' && (
          <Form layout="vertical" onFinish={submitForgot}>
            <Typography.Paragraph type="secondary">{t(lang, 'sendResetMail')}</Typography.Paragraph>
            <Form.Item name="usernameOrEmail" label={`${t(lang, 'username')} / ${t(lang, 'email')}`} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={busy}>{t(lang, 'sendResetMail')}</Button>
              <Button onClick={() => setMode('login')}>{t(lang, 'cancel')}</Button>
            </Space>
          </Form>
        )}
        {mode === 'reset' && (
          <Form layout="vertical" onFinish={submitReset}>
            <Form.Item name="newPassword" label={t(lang, 'newPassword')} rules={[{ required: true, min: 6 }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={busy}>{t(lang, 'resetPassword')}</Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
