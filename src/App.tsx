import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Indent from './pages/Indent';
import Approval from './pages/Approval';
import TechnicianAssign from './pages/TechnicianAssign';
import WorkTracking from './pages/WorkTracking';
import Inspected from './pages/Inspected';
import Payment from './pages/Payment';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'indent':
        return <Indent />;
      case 'approval':
        return <Approval />;
      case 'technician-assign':
        return <TechnicianAssign />;
      case 'work-tracking':
        return <WorkTracking />;
      case 'inspection':
        return <Inspected />;
      case 'payment':
        return <Payment />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
