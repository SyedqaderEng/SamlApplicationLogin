import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { authService, User } from '../services/auth';
import { SamlStatusCard } from '../components/SamlStatusCard';

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [samlLogs, setSamlLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [userData, logsData] = await Promise.all([
        authService.getCurrentUser(),
        authService.getSamlLogs(),
      ]);
      setUser(userData);
      setSamlLogs(logsData);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load user data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

          {/* User Profile Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <SamlStatusCard
              title="User Profile"
              data={{
                Email: user.email,
                'Display Name': user.displayName || 'N/A',
                'Last Login': user.lastLoginAt
                  ? format(new Date(user.lastLoginAt), 'PPpp')
                  : 'N/A',
              }}
            />

            <SamlStatusCard
              title="SAML Information"
              data={{
                'SAML NameID': user.samlNameId || 'Not authenticated via SAML',
                'SAML Entity ID': user.samlEntityId || 'N/A',
                'SAML Attributes': user.samlAttributes
                  ? JSON.stringify(user.samlAttributes, null, 2)
                  : 'N/A',
              }}
            />
          </div>

          {/* SAML Logs */}
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Recent SAML Login Attempts
            </h2>
            {samlLogs.length === 0 ? (
              <p className="text-gray-600">No SAML login attempts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entity ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {samlLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(log.createdAt), 'PPpp')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.eventType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.entityId || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
