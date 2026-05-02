import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { useState } from 'react';
import { t } from '../lib/i18n';
import type { Lang, Organization } from '../lib/types';

export default function DataNavigator({ lang, organizations, selectedOrg, setSelectedOrg }: { lang: Lang; organizations: Organization[]; selectedOrg: string; setSelectedOrg: (id: string) => void }) {
  const [navSearch, setNavSearch] = useState('');
  const keyword = navSearch.trim().toLowerCase();
  const visible = organizations.filter((org) => !keyword || `${org.code} ${org.name}`.toLowerCase().includes(keyword));

  return (
    <aside className="data-navigator">
      <div className="data-nav-head">
        <span>{t(lang, 'dataNavigator')}</span>
        <b>{organizations.length}</b>
      </div>
      <Input className="data-nav-search" prefix={<SearchOutlined />} value={navSearch} onChange={(event) => setNavSearch(event.target.value)} placeholder={t(lang, 'customerSearch')} />
      <div className="data-nav-list">
        <button className={selectedOrg === 'all' ? 'data-nav-item active' : 'data-nav-item'} onClick={() => setSelectedOrg('all')}>
          <span className="data-nav-code">ALL</span>
          <span className="data-nav-name">{t(lang, 'allCustomers')}</span>
        </button>
        {visible.map((org) => (
          <button key={org.id} className={selectedOrg === org.id ? 'data-nav-item active' : 'data-nav-item'} onClick={() => setSelectedOrg(org.id)}>
            <span className="data-nav-code">{org.code}</span>
            <span className="data-nav-name">{org.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
