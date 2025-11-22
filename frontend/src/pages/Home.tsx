import { Link } from 'react-router-dom';
import { authService } from '../services/auth';

export const Home: React.FC = () => {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            SAML Test Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Complete SAML Service Provider (SP) and Identity Provider (IdP) Testing Platform
          </p>

          <div className="flex justify-center space-x-4 mb-12">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary text-lg px-8 py-3">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary text-lg px-8 py-3">
                  Login
                </Link>
                <Link to="/signup" className="btn btn-secondary text-lg px-8 py-3">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            <div className="card text-left">
              <div className="text-3xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-2">SAML SP Support</h3>
              <p className="text-gray-600">
                Act as a Service Provider and authenticate users via external Identity Providers
              </p>
            </div>

            <div className="card text-left">
              <div className="text-3xl mb-4">🔑</div>
              <h3 className="text-xl font-semibold mb-2">SAML IdP Support</h3>
              <p className="text-gray-600">
                Act as an Identity Provider and authenticate users for external Service Providers
              </p>
            </div>

            <div className="card text-left">
              <div className="text-3xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2">Metadata Management</h3>
              <p className="text-gray-600">
                Import and export SAML metadata for both SP and IdP configurations
              </p>
            </div>

            <div className="card text-left">
              <div className="text-3xl mb-4">🧪</div>
              <h3 className="text-xl font-semibold mb-2">Test Console</h3>
              <p className="text-gray-600">
                Comprehensive testing interface for SP-initiated and IdP-initiated flows
              </p>
            </div>

            <div className="card text-left">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Activity Logs</h3>
              <p className="text-gray-600">
                View detailed logs of all SAML requests, responses, and authentication attempts
              </p>
            </div>

            <div className="card text-left">
              <div className="text-3xl mb-4">👤</div>
              <h3 className="text-xl font-semibold mb-2">User Dashboard</h3>
              <p className="text-gray-600">
                Track user profiles, SAML attributes, and authentication history
              </p>
            </div>
          </div>

          <div className="mt-12 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <ol className="text-left list-decimal list-inside space-y-2 text-gray-700">
              <li>Create an account or login to access the platform</li>
              <li>Import SAML metadata for external IdPs or SPs</li>
              <li>Export your own metadata to share with SAML partners</li>
              <li>Use the Test Console to test SP and IdP initiated flows</li>
              <li>View activity logs and user information in the Dashboard</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
