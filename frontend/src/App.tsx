import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Login } from './pages/Login.js';
import { Navbar } from './components/Navbar.js';
import { AlertBanner } from './components/AlertBanner.js';
import { Dashboard } from './pages/Dashboard.js';
import { ItemsCatalog } from './pages/ItemsCatalog.js';
import { RequestsPage } from './pages/RequestsPage.js';
import { ProcurementPage } from './pages/ProcurementPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { QRScannerModal } from './pages/QRScannerModal.js';
import { Item, Alert, SupplyRequest, PurchaseOrder } from './types/index.js';
import { api } from './services/api.js';

function MainLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'items' | 'requests' | 'procurement' | 'reports'>('dashboard');
  const [items, setItems] = useState<Item[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const fetchAppData = async () => {
    if (!isAuthenticated) return;
    setIsDataLoading(true);
    try {
      const [itemsRes, alertsRes, reqsRes, posRes] = await Promise.allSettled([
        api.getItems(),
        api.getAlerts(false),
        api.getRequests(),
        api.getPurchaseOrders(),
      ]);

      if (itemsRes.status === 'fulfilled') setItems(itemsRes.value.items || []);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.alerts || []);
      if (reqsRes.status === 'fulfilled') setRequests(reqsRes.value.requests || []);
      if (posRes.status === 'fulfilled') setPurchaseOrders(posRes.value.purchaseOrders || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppData();
    }
  }, [isAuthenticated, user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-sky-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab: any) => setCurrentTab(tab)}
        alerts={alerts}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AlertBanner alerts={alerts} onAlertResolved={fetchAppData} />

        {currentTab === 'dashboard' && (
          <Dashboard
            items={items}
            alerts={alerts}
            requests={requests}
            purchaseOrders={purchaseOrders}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onNavigateTab={(tab: any) => setCurrentTab(tab)}
            onRefreshData={fetchAppData}
          />
        )}

        {currentTab === 'items' && (
          <ItemsCatalog items={items} onRefresh={fetchAppData} />
        )}

        {currentTab === 'requests' && (
          <RequestsPage requests={requests} items={items} onRefresh={fetchAppData} />
        )}

        {currentTab === 'procurement' && (
          <ProcurementPage purchaseOrders={purchaseOrders} items={items} onRefresh={fetchAppData} />
        )}

        {currentTab === 'reports' && <ReportsPage />}
      </main>

      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onStockUpdated={fetchAppData}
      />

      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Hemas Hospital Thalawathugoda • Housekeeping Supply Management</span>
          <span className="text-slate-400">Internal Use Only</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
