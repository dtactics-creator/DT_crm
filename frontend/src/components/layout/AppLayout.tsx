import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import type { Crumb } from './crumbs';
import { createContext, useContext } from 'react';

const CrumbCtx = createContext<(c: Crumb[]) => void>(() => {});
export const useCrumbs = () => useContext(CrumbCtx);

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ label: 'Dashboard' }]);

  return (
    <CrumbCtx.Provider value={setCrumbs}>
      <div className="min-h-screen flex bg-app">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar crumbs={crumbs} onMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </CrumbCtx.Provider>
  );
}
