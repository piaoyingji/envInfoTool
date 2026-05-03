import { CameraOutlined, LockOutlined, PoweroffOutlined, SettingOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Form, Input, Modal, Select, Space, Switch, Table, Upload, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { changeOwnPassword, createUser, fetchUsers, logout, resetUserPassword, setUserEnabled, updateOwnProfile, updateUser, uploadOwnAvatar } from '../lib/api';
import { t } from '../lib/i18n';
import type { CurrentUser, Lang } from '../lib/types';

export function SystemMenu({ lang, user, onUserChange, onLoggedOut }: { lang: Lang; user: CurrentUser; onUserChange: (user: CurrentUser) => void; onLoggedOut: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const isAdmin = user.role === 'Admins';

  const doLogout = async () => {
    await logout();
    onLoggedOut();
  };

  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            ...(isAdmin ? [{ key: 'users', icon: <UserAddOutlined />, label: t(lang, 'userManagement') }] : []),
            { key: 'profile', icon: <UserOutlined />, label: t(lang, 'profile') },
            { key: 'password', icon: <LockOutlined />, label: t(lang, 'changePassword') },
            { type: 'divider' as const },
            { key: 'logout', icon: <PoweroffOutlined />, label: t(lang, 'logout'), danger: true },
          ],
          onClick: ({ key }) => {
            if (key === 'users') setUsersOpen(true);
            if (key === 'profile') setProfileOpen(true);
            if (key === 'password') setPasswordOpen(true);
            if (key === 'logout') void doLogout();
          }
        }}
      >
        <Button type="text" icon={<SettingOutlined />} aria-label={t(lang, 'systemMenu')} />
      </Dropdown>
      <ProfileModal lang={lang} open={profileOpen} user={user} onClose={() => setProfileOpen(false)} onUserChange={onUserChange} />
      <PasswordModal lang={lang} open={passwordOpen} onClose={() => setPasswordOpen(false)} onLoggedOut={onLoggedOut} />
      {isAdmin && <UsersModal lang={lang} open={usersOpen} onClose={() => setUsersOpen(false)} />}
    </>
  );
}

function ProfileModal({ lang, open, user, onClose, onUserChange }: { lang: Lang; open: boolean; user: CurrentUser; onClose: () => void; onUserChange: (user: CurrentUser) => void }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) form.setFieldsValue({ displayName: user.displayName, email: user.email });
  }, [open, user, form]);

  const save = async () => {
    const values = await form.validateFields();
    setBusy(true);
    try {
      const saved = await updateOwnProfile(values);
      onUserChange(saved);
      message.success(t(lang, 'save'));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t(lang, 'profile')} open={open} onCancel={onClose} onOk={save} confirmLoading={busy}>
      <Space align="center" className="profile-avatar-row">
        <Avatar size={64} src={user.avatarUrl ? `${user.avatarUrl}?t=${Date.now()}` : undefined}>{user.username[0]}</Avatar>
        <Upload showUploadList={false} beforeUpload={async (file) => {
          const saved = await uploadOwnAvatar(file);
          onUserChange(saved);
          message.success(t(lang, 'avatar'));
          return false;
        }}>
          <Button icon={<CameraOutlined />}>{t(lang, 'avatar')}</Button>
        </Upload>
      </Space>
      <Form form={form} layout="vertical">
        <Form.Item label={t(lang, 'displayName')} name="displayName"><Input /></Form.Item>
        <Form.Item label={t(lang, 'email')} name="email"><Input /></Form.Item>
      </Form>
    </Modal>
  );
}

function PasswordModal({ lang, open, onClose, onLoggedOut }: { lang: Lang; open: boolean; onClose: () => void; onLoggedOut: () => void }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const values = await form.validateFields();
    setBusy(true);
    try {
      await changeOwnPassword(values.currentPassword, values.newPassword);
      message.success(t(lang, 'save'));
      onClose();
      onLoggedOut();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={t(lang, 'changePassword')} open={open} onCancel={onClose} onOk={save} confirmLoading={busy}>
      <Form form={form} layout="vertical">
        <Form.Item label={t(lang, 'currentPassword')} name="currentPassword" rules={[{ required: true }]}><Input.Password /></Form.Item>
        <Form.Item label={t(lang, 'newPassword')} name="newPassword" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
      </Form>
    </Modal>
  );
}

function UsersModal({ lang, open, onClose }: { lang: Lang; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers, enabled: open });
  const users = usersQuery.data?.users || [];
  const [editing, setEditing] = useState<CurrentUser | null>(null);
  const [form] = Form.useForm();

  const openUser = (user?: CurrentUser) => {
    setEditing(user || { id: '', username: '', role: 'Users', email: '', displayName: '' });
    form.setFieldsValue(user || { username: '', role: 'Users', email: '', displayName: '', password: '' });
  };

  const save = async () => {
    const values = await form.validateFields();
    const saved = editing?.id ? await updateUser(editing.id, values) : await createUser(values);
    await queryClient.invalidateQueries({ queryKey: ['users'] });
    if ('temporaryPassword' in saved && saved.temporaryPassword) {
      Modal.info({ title: t(lang, 'temporaryPassword'), content: String(saved.temporaryPassword) });
    }
    setEditing(null);
  };

  return (
    <Modal title={t(lang, 'userManagement')} open={open} onCancel={onClose} footer={null} width={860}>
      <Button type="primary" onClick={() => openUser()}>{t(lang, 'create')}</Button>
      <Table
        rowKey="id"
        dataSource={users}
        pagination={false}
        columns={[
          { title: t(lang, 'username'), dataIndex: 'username' },
          { title: t(lang, 'displayName'), dataIndex: 'displayName' },
          { title: t(lang, 'email'), dataIndex: 'email' },
          { title: t(lang, 'role'), dataIndex: 'role' },
          {
            title: t(lang, 'enabled'),
            render: (_, user) => <Switch checked={!user.disabled} onChange={async (checked) => {
              await setUserEnabled(user.id, checked);
              await queryClient.invalidateQueries({ queryKey: ['users'] });
            }} />
          },
          {
            title: '',
            render: (_, user) => (
              <Space>
                <Button size="small" onClick={() => openUser(user)}>{t(lang, 'edit')}</Button>
                <Button size="small" onClick={async () => {
                  const saved = await resetUserPassword(user.id);
                  Modal.info({ title: t(lang, 'temporaryPassword'), content: saved.temporaryPassword });
                }}>{t(lang, 'reset')}</Button>
              </Space>
            )
          }
        ]}
      />
      <Modal title={editing?.id ? t(lang, 'edit') : t(lang, 'create')} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={save}>
        <Form form={form} layout="vertical">
          <Form.Item label={t(lang, 'username')} name="username" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label={t(lang, 'displayName')} name="displayName"><Input /></Form.Item>
          <Form.Item label={t(lang, 'email')} name="email"><Input /></Form.Item>
          <Form.Item label={t(lang, 'role')} name="role"><Select options={[{ value: 'Admins', label: 'Admins' }, { value: 'Users', label: 'Users' }]} /></Form.Item>
          {!editing?.id && <Form.Item label={t(lang, 'password')} name="password"><Input.Password /></Form.Item>}
        </Form>
      </Modal>
    </Modal>
  );
}
