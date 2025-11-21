import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { ImportMetadata } from './pages/ImportMetadata';
import { ExportMetadata } from './pages/ExportMetadata';
import { SamlTestConsole } from './pages/SamlTestConsole';
import { SamlCallback } from './pages/SamlCallback';
import { IdpLogin } from './pages/IdpLogin';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/saml/callback" element={<SamlCallback />} />
          <Route path="/idp-login" element={<IdpLogin />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import-metadata"
            element={
              <ProtectedRoute>
                <ImportMetadata />
              </ProtectedRoute>
            }
          />
          <Route
            path="/export-metadata"
            element={
              <ProtectedRoute>
                <ExportMetadata />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-console"
            element={
              <ProtectedRoute>
                <SamlTestConsole />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
