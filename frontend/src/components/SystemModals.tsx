import { CameraOutlined, DeleteOutlined, DesktopOutlined, LockOutlined, PoweroffOutlined, SettingOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Upload, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { changeOwnPassword, createUser, deleteRemoteMaster, fetchRemoteMasters, fetchUsers, logout, resetUserPassword, saveRemoteMaster, setUserEnabled, updateOwnProfile, updateUser, uploadOwnAvatar } from '../lib/api';
import { t } from '../lib/i18n';
import type { CurrentUser, Lang, RemoteConnection } from '../lib/types';

export function SystemMenu({ lang, user, onUserChange, onLoggedOut }: { lang: Lang; user: CurrentUser; onUserChange: (user: CurrentUser) => void; onLoggedOut: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [remoteMastersOpen, setRemoteMastersOpen] = useState(false);
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
            ...(isAdmin ? [{ key: 'remoteMasters', icon: <DesktopOutlined />, label: t(lang, 'remoteMaster') }] : []),
            { key: 'profile', icon: <UserOutlined />, label: t(lang, 'profile') },
            { key: 'password', icon: <LockOutlined />, label: t(lang, 'changePassword') },
            { type: 'divider' as const },
            { key: 'logout', icon: <PoweroffOutlined />, label: t(lang, 'logout'), danger: true },
          ],
          onClick: ({ key }) => {
            if (key === 'users') setUsersOpen(true);
            if (key === 'remoteMasters') setRemoteMastersOpen(true);
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
      {isAdmin && <RemoteMastersModal lang={lang} open={remoteMastersOpen} onClose={() => setRemoteMastersOpen(false)} />}
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

function RemoteMastersModal({ lang, open, onClose }: { lang: Lang; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mastersQuery = useQuery({ queryKey: ['remote-masters'], queryFn: fetchRemoteMasters, enabled: open });
  const remotes = mastersQuery.data?.remotes || [];
  const [editing, setEditing] = useState<RemoteConnection | null>(null);
  const [form] = Form.useForm();

  const openRemote = (remote?: RemoteConnection) => {
    const values = remote || {
      id: '',
      masterId: '',
      scope: 'shared',
      name: '',
      type: 'RDP',
      host: '',
      port: 3389,
      username: '',
      password: '',
      note: '',
      autoMatch: true
    };
    setEditing(values);
    form.setFieldsValue(values);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['remote-masters'] });
    await queryClient.invalidateQueries({ queryKey: ['portal-data'] });
  };

  const save = async () => {
    const values = await form.validateFields();
    const masterId = editing?.masterId || editing?.id || undefined;
    await saveRemoteMaster({ ...values, scope: 'shared' }, masterId);
    message.success(t(lang, 'save'));
    setEditing(null);
    await refresh();
  };

  const remove = async (remote: RemoteConnection) => {
    const masterId = remote.masterId || remote.id;
    if (!masterId) return;
    await deleteRemoteMaster(masterId);
    message.success(t(lang, 'delete'));
    await refresh();
  };

  return (
    <Modal title={t(lang, 'remoteMaster')} open={open} onCancel={onClose} footer={null} width={1040}>
      <Space direction="vertical" size={14} className="system-modal-stack">
        <Button type="primary" onClick={() => openRemote()}>{t(lang, 'addRemoteMaster')}</Button>
        <Table
          rowKey={(remote) => remote.masterId || remote.id}
          dataSource={remotes}
          loading={mastersQuery.isLoading}
          pagination={false}
          columns={[
            { title: t(lang, 'remoteName'), dataIndex: 'name', render: (value, remote) => value || `${remote.host}:${remote.port || 3389}` },
            { title: t(lang, 'type'), dataIndex: 'type', width: 100 },
            { title: t(lang, 'remoteHost'), dataIndex: 'host' },
            { title: t(lang, 'remotePort'), dataIndex: 'port', width: 100 },
            { title: t(lang, 'serverUser'), dataIndex: 'username' },
            { title: t(lang, 'enabled'), dataIndex: 'autoMatch', width: 96, render: (value) => <Switch checked={value !== false} disabled /> },
            {
              title: '',
              width: 150,
              render: (_, remote) => (
                <Space>
                  <Button size="small" onClick={() => openRemote(remote)}>{t(lang, 'edit')}</Button>
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => void remove(remote)} />
                </Space>
              )
            }
          ]}
        />
      </Space>
      <Modal title={editing?.id || editing?.masterId ? t(lang, 'edit') : t(lang, 'create')} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={save} width={720}>
        <Form form={form} layout="vertical">
          <Form.Item label={t(lang, 'remoteName')} name="name"><Input /></Form.Item>
          <Space.Compact block>
            <Form.Item label={t(lang, 'type')} name="type" initialValue="RDP" rules={[{ required: true }]} className="remote-master-compact-type">
              <Select options={[{ value: 'RDP', label: 'RDS/RDP' }, { value: 'SSH', label: 'SSH' }]} onChange={(value) => form.setFieldValue('port', value === 'SSH' ? 22 : 3389)} />
            </Form.Item>
            <Form.Item label={t(lang, 'remoteHost')} name="host" rules={[{ required: true }]} className="remote-master-compact-host">
              <Input />
            </Form.Item>
            <Form.Item label={t(lang, 'remotePort')} name="port" initialValue={3389} className="remote-master-compact-port">
              <InputNumber min={1} max={65535} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label={t(lang, 'serverUser')} name="username" className="remote-master-compact-half"><Input /></Form.Item>
            <Form.Item label={t(lang, 'serverPassword')} name="password" className="remote-master-compact-half"><Input.Password /></Form.Item>
          </Space.Compact>
          <Form.Item label={t(lang, 'remoteNote')} name="note"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label={t(lang, 'autoShared')} name="autoMatch" valuePropName="checked" initialValue>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}
