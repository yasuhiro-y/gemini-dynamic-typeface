'use client';

import { TabId, TABS } from '@/types/common';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const activeTabData = TABS.find(t => t.id === activeTab);

  return (
    <div className="mb-12">
      {/* Tab Buttons */}
      <div className="flex gap-6 mb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`text-sm font-medium tracking-wide transition-colors ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-xs text-white/40">
        {activeTabData?.description}
      </p>
    </div>
  );
}
