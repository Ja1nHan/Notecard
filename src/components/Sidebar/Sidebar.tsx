import { useAppStore } from '../../stores/useAppStore';
import { Plus, Settings } from 'lucide-react';
import { TabList } from './TabList';
import { GlobalLockStatus } from './GlobalLockStatus';
import { useUpdateStore } from '../../stores/useUpdateStore';
import { useTranslation } from 'react-i18next';
import './Sidebar.css';

interface SidebarProps {
  onOpenSettings: () => void;
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const { t } = useTranslation();
  const addTab = useAppStore((s) => s.addTab);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);

  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">{t('sidebar.categories')}</div>

      <div className="tab-list">
        <TabList />
        <div className="tab-add" title={t('sidebar.newCategory')} onClick={addTab}>
          <Plus />
          {t('sidebar.newCategory')}
        </div>
      </div>

      <div className="sidebar-bottom">
        <GlobalLockStatus />
        <div className="sidebar-settings" onClick={onOpenSettings}>
          <Settings />
          {t('sidebar.settings')}
          {updateAvailable && <span className="update-dot" />}
        </div>
      </div>
    </aside>
  );
}
