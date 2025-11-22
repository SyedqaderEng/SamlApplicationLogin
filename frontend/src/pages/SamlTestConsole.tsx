import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface SamlEntity {
  id: string;
  type: string;
  entityId: string;
  ssoUrl?: string;
  acsUrls: string[];
}

interface SamlLog {
  id: string;
  entityId: string;
  eventType: string;
  status: string;
  details: any;
  createdAt: string;
}

export const SamlTestConsole: React.FC = () => {
  const [entities, setEntities] = useState<SamlEntity[]>([]);
  const [logs, setLogs] = useState<SamlLog[]>([]);
  const [selectedIdp, setSelectedIdp] = useState('');
  const [selectedSp, setSelectedSp] = useState('');
  const [selectedLog, setSelectedLog] = useState<SamlLog | null>(null);

  useEffect(() => {
    fetchEntities();
    fetchLogs();
  }, []);

  const fetchEntities = async () => {
    try {
      const response = await api.get('/api/metadata/entities');
      setEntities(response.data.entities);
    } catch (error) {
      toast.error('Failed to load entities');
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/api/config/logs?limit=20');
      setLogs(response.data.logs);
    } catch (error) {
      toast.error('Failed to load logs');
    }
  };

  const testSpLogin = () => {
    if (!selectedIdp) {
      toast.error('Please select an IdP');
      return;
    }

    const url = `${API_BASE_URL}/saml/login?idpEntityId=${encodeURIComponent(selectedIdp)}`;
    window.open(url, '_blank');
    toast.success('SP-initiated login started in new window');

    // Refresh logs after a delay
    setTimeout(fetchLogs, 2000);
  };

  const testIdpLogin = () => {
    if (!selectedSp) {
      toast.error('Please select an SP');
      return;
    }

    const url = `${API_BASE_URL}/saml/idp/sso`;
    window.open(url, '_blank');
    toast.success('IdP-initiated login started in new window');

    // Refresh logs after a delay
    setTimeout(fetchLogs, 2000);
  };

  const viewLogDetails = (log: SamlLog) => {
    setSelectedLog(log);
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) {
      return;
    }

    try {
      await api.delete('/api/config/logs');
      toast.success('Logs cleared');
      fetchLogs();
    } catch (error) {
      toast.error('Failed to clear logs');
    }
  };

  const idps = entities.filter((e) => e.type === 'IDP');
  const sps = entities.filter((e) => e.type === 'SP');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">SAML Test Console</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* SP-Initiated Login Test */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Test SP-Initiated Login</h2>
              <p className="text-sm text-gray-600 mb-4">
                This application acts as a Service Provider and initiates login with an external IdP.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="label">Select Identity Provider</label>
                  <select
                    value={selectedIdp}
                    onChange={(e) => setSelectedIdp(e.target.value)}
                    className="input"
                  >
                    <option value="">-- Select IdP --</option>
                    {idps.map((idp) => (
                      <option key={idp.id} value={idp.entityId}>
                        {idp.entityId}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={testSpLogin}
                  disabled={!selectedIdp}
                  className="btn btn-primary w-full"
                >
                  Start SP-Initiated Login
                </button>
                {idps.length === 0 && (
                  <p className="text-sm text-yellow-600">
                    No IdP entities found. Import IdP metadata first.
                  </p>
                )}
              </div>
            </div>

            {/* IdP-Initiated Login Test */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Test IdP-Initiated Login</h2>
              <p className="text-sm text-gray-600 mb-4">
                This application acts as an Identity Provider and authenticates users for external SPs.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="label">Select Service Provider</label>
                  <select
                    value={selectedSp}
                    onChange={(e) => setSelectedSp(e.target.value)}
                    className="input"
                  >
                    <option value="">-- Select SP --</option>
                    {sps.map((sp) => (
                      <option key={sp.id} value={sp.entityId}>
                        {sp.entityId}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={testIdpLogin}
                  disabled={!selectedSp}
                  className="btn btn-primary w-full"
                >
                  Start IdP-Initiated Login
                </button>
                {sps.length === 0 && (
                  <p className="text-sm text-yellow-600">
                    No SP entities found. Import SP metadata first.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SAML Endpoints Reference */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">SAML Endpoints Reference</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Service Provider (SP)</h3>
                <ul className="text-sm space-y-1">
                  <li>
                    <strong>Metadata:</strong>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {API_BASE_URL}/saml/metadata
                    </code>
                  </li>
                  <li>
                    <strong>ACS:</strong>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {API_BASE_URL}/saml/acs
                    </code>
                  </li>
                  <li>
                    <strong>SLO:</strong>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {API_BASE_URL}/saml/slo
                    </code>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Identity Provider (IdP)</h3>
                <ul className="text-sm space-y-1">
                  <li>
                    <strong>Metadata:</strong>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {API_BASE_URL}/saml/idp/metadata
                    </code>
                  </li>
                  <li>
                    <strong>SSO:</strong>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {API_BASE_URL}/saml/idp/sso
                    </code>
                  </li>
                  <li>
                    <strong>SLO:</strong>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {API_BASE_URL}/saml/idp/slo
                    </code>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* SAML Logs */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">SAML Activity Logs</h2>
              <div className="space-x-2">
                <button onClick={fetchLogs} className="btn btn-secondary">
                  Refresh
                </button>
                <button onClick={clearLogs} className="btn btn-danger">
                  Clear Logs
                </button>
              </div>
            </div>

            {logs.length === 0 ? (
              <p className="text-gray-600">No SAML activity logs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.eventType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'failure'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.entityId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => viewLogDetails(log)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Log Details Modal */}
          {selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Log Details</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <strong>Event Type:</strong> {selectedLog.eventType}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedLog.status}
                  </div>
                  <div>
                    <strong>Entity ID:</strong> {selectedLog.entityId || 'N/A'}
                  </div>
                  <div>
                    <strong>Timestamp:</strong>{' '}
                    {format(new Date(selectedLog.createdAt), 'PPpp')}
                  </div>
                  <div>
                    <strong>Details:</strong>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
