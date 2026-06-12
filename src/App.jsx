import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import RoleGate from '@/components/RoleGate';
import TransferLog from '@/pages/TransferLog';
import SubmitRequest from '@/pages/SubmitRequest';
import ReceiveTruck from '@/pages/ReceiveTruck';
import ReceivingHistory from '@/pages/ReceivingHistory';
import TransactionHistory from '@/pages/TransactionHistory';
import PackList from '@/pages/PackList';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0D0D0D' }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#1E1E1E', borderTopColor: '#4F7EF7' }} />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <RoleGate>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<Layout />}>
          <Route path="/" element={<TransferLog />} />
          <Route path="/submit" element={<SubmitRequest />} />
          <Route path="/receive" element={<ReceiveTruck />} />
          <Route path="/receiving-history" element={<ReceivingHistory />} />
          <Route path="/history" element={<TransactionHistory />} />
          <Route path="/packlist" element={<PackList />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </RoleGate>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;