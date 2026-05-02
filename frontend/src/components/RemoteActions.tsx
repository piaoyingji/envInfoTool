import { CloudDownloadOutlined, DesktopOutlined, DownloadOutlined, LinkOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Space, Tag, Tooltip } from 'antd';
import type { Lang, RemoteConnection } from '../lib/types';
import { t } from '../lib/i18n';

type Props = {
  disabled: boolean;
  guacamoleAvailable: boolean;
  lang: Lang;
  remote: RemoteConnection;
  onDirect: () => void;
  onGuac: () => void;
  onRdp: () => void;
};

export function RemoteActions({ disabled, guacamoleAvailable, lang, remote, onDirect, onGuac, onRdp }: Props) {
  const isRdp = remote.type.toUpperCase() === 'RDP';
  if (!isRdp) return <Tag color="green">{remote.type}</Tag>;
  return (
    <>
      <Tooltip title={t(lang, 'rdpDirect')}>
        <Button disabled={disabled} icon={<LinkOutlined />} onClick={onDirect} />
      </Tooltip>
      <Tooltip title={guacamoleAvailable ? t(lang, 'guacamoleReady') : t(lang, 'guacamoleUnavailable')}>
        <Button disabled={disabled} icon={<DesktopOutlined />} onClick={onGuac} />
      </Tooltip>
      <Tooltip title={t(lang, 'rdpFile')}>
        <Button disabled={disabled} icon={<DownloadOutlined />} onClick={onRdp} />
      </Tooltip>
      <Tooltip title={t(lang, 'rdpCert')}>
        <Button disabled={disabled} icon={<SafetyCertificateOutlined />} href="/rdp_signing_cert.cer" />
      </Tooltip>
    </>
  );
}

export function RemoteQuickActions(props: Props) {
  if (props.remote.type.toUpperCase() !== 'RDP') return <Tag color="green">{props.remote.type}</Tag>;
  return (
    <Space size={6} className="remote-quick-actions">
      <Tooltip title={t(props.lang, 'rdpDirect')}>
        <Button disabled={props.disabled} icon={<LinkOutlined />} onClick={props.onDirect} />
      </Tooltip>
      <Tooltip title={props.guacamoleAvailable ? t(props.lang, 'guacamoleReady') : t(props.lang, 'guacamoleUnavailable')}>
        <Button className={props.guacamoleAvailable ? 'guacamole-action ready' : 'guacamole-action'} disabled={props.disabled} icon={<DesktopOutlined />} onClick={props.onGuac} />
      </Tooltip>
      <Tooltip title={t(props.lang, 'rdpFile')}>
        <Button disabled={props.disabled} icon={<CloudDownloadOutlined />} onClick={props.onRdp} />
      </Tooltip>
      <Tooltip title={t(props.lang, 'rdpCert')}>
        <Button disabled={props.disabled} icon={<SafetyCertificateOutlined />} href="/rdp_signing_cert.cer" />
      </Tooltip>
    </Space>
  );
}
