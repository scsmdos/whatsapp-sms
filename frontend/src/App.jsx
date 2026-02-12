import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WhatsAppProvider } from './context/WhatsAppContext';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Lazy Load Pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Contacts = lazy(() => import('./pages/Contacts'));
const ContactGroups = lazy(() => import('./pages/ContactGroups'));
const Messages = lazy(() => import('./pages/Messages'));
const MessageTemplates = lazy(() => import('./pages/MessageTemplates'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const WhatsAppConnect = lazy(() => import('./pages/WhatsAppConnect'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
// WhatsAppChat not used yet

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <Loader2 className="h-10 w-10 animate-spin text-whatsapp-teal" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <WhatsAppProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />

              {/* Main App Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="whatsapp" element={<WhatsAppConnect />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="contact-groups" element={<ContactGroups />} />
                <Route path="messages" element={<Messages />} />
                <Route path="templates" element={<MessageTemplates />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="settings" element={<Settings />} />

              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </WhatsAppProvider>
    </AuthProvider>
  );
}

export default App;
