import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { AppProvider } from './store';
import { Shell } from './components/Layout';
import { AuthGate } from './components/AuthGate';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/Tasks';
import CalendarPage from './pages/CalendarPage';
import HabitsPage from './pages/Habits';
import FocusPage from './pages/Focus';
import CompanionPage from './pages/Companion';
import StatsPage from './pages/Stats';
import VillagePage from './pages/Village';
import SettingsPage from './pages/Settings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate>
      <AppProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="habits" element={<HabitsPage />} />
            <Route path="focus" element={<FocusPage />} />
            <Route path="companion" element={<CompanionPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="village" element={<VillagePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </AppProvider>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);
