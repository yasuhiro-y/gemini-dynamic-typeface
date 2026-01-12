'use client';

import { useState } from 'react';
import { TabNavigation } from '@/components/shared/TabNavigation';
import { TypefaceGenerator } from '@/components/typeface/TypefaceGenerator';
import { IllustrationGenerator } from '@/components/illustration/IllustrationGenerator';
import { TabId } from '@/types/common';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('typeface');

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      {activeTab === 'typeface' && <TypefaceGenerator />}
      {activeTab === 'illustration' && <IllustrationGenerator />}
    </main>
  );
}
