/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { RulesDrawer } from './components/layout/RulesDrawer';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { ToastContainer } from './components/layout/ToastContainer';

// Pages
import { DashboardPage } from './components/pages/DashboardPage';
import { BatchInventoryPage } from './components/pages/BatchInventoryPage';
import { FefoDispatchPage } from './components/pages/FefoDispatchPage';
import { ExpiryAlertsPage } from './components/pages/ExpiryAlertsPage';
import { SlowMovingPage } from './components/pages/SlowMovingPage';
import { PurchaseRecommendationsPage } from './components/pages/PurchaseRecommendationsPage';
import { DemandForecastPage } from './components/pages/DemandForecastPage';
import { WriteOffsFinancePage } from './components/pages/WriteOffsFinancePage';
import { ImpactMetricsPage } from './components/pages/ImpactMetricsPage';
import { WorkflowMapPage } from './components/pages/WorkflowMapPage';
import { RolesNotesPage } from './components/pages/RolesNotesPage';

const MainLayout: React.FC = () => {
  const { state } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderActivePage = () => {
    switch (state.activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'inventory':
        return <BatchInventoryPage />;
      case 'fefo':
        return <FefoDispatchPage />;
      case 'alerts':
        return <ExpiryAlertsPage />;
      case 'slow_moving':
        return <SlowMovingPage />;
      case 'purchasing':
        return <PurchaseRecommendationsPage />;
      case 'forecast':
        return <DemandForecastPage />;
      case 'finance':
        return <WriteOffsFinancePage />;
      case 'impact':
        return <ImpactMetricsPage />;
      case 'workflow':
        return <WorkflowMapPage />;
      case 'roles':
        return <RolesNotesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAF7F2] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-150">
      {/* Sidebar navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>

        <Footer />
      </div>

      {/* Overlays & Drawers */}
      <RulesDrawer />
      <GlobalSearchModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
