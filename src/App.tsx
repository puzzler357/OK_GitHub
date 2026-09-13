/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import OrgChart from './pages/OrgChart';
import Movements from './pages/Movements';
import Templates from './pages/Templates';
import TemplateBuilder from './pages/TemplateBuilder';
import DocumentGenerator from './pages/DocumentGenerator';

import Reports from './pages/Reports';
import Timesheet from './pages/Timesheet';
import CalendarView from './pages/CalendarView';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Recruiting from './pages/Recruiting';
import TimeOff from './pages/TimeOff';
import Onboarding from './pages/Onboarding';
import Performance from './pages/Performance';
import KnowledgeBase from './pages/KnowledgeBase';
import Archive from './pages/Archive';

import LockScreen from './components/LockScreen';
import { ErrorState } from './components/States';
import { useIdleLock } from './lib/useIdleLock';
import { useAppStore } from './store/useAppStore';
import { useDatabaseStore } from './store/useDatabaseStore';

export default function App() {
  const { user, startScreen, locked } = useAppStore();
  const { fetchAll, error } = useDatabaseStore();

  useIdleLock();

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user, fetchAll]);

  if (!user) {
    return <Login />;
  }

  // Блокировка закрывает приложение целиком: данные не должны оставаться
  // на экране, пока владелец отошёл.
  if (locked) {
    return <LockScreen />;
  }

  // Ошибка загрузки перекрывает приложение: показывать пустые экраны и
  // молчать о причине — худший из вариантов.
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <ErrorState message={error} onRetry={() => { void fetchAll(); }} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Стартовый экран настраивается в «Настройки → Общие». */}
          <Route path="/" element={<Navigate to={startScreen || '/dashboard'} replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/org-chart" element={<OrgChart />} />
          <Route path="/movements" element={<Movements />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/new" element={<TemplateBuilder />} />
          <Route path="/generate" element={<DocumentGenerator />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/timesheet" element={<Timesheet />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/recruiting" element={<Recruiting />} />
          <Route path="/timeoff" element={<TimeOff />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
