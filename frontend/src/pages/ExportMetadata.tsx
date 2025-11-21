import { useState } from 'react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const ExportMetadata: React.FC = () => {
  const [spMetadata, setSpMetadata] = useState('');
  const [idpMetadata, setIdpMetadata] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchSpMetadata = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/metadata/export/sp`);
      const xml = await response.text();
      setSpMetadata(xml);
      toast.success('SP metadata loaded');
    } catch (error) {
      toast.error('Failed to load SP metadata');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIdpMetadata = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/metadata/export/idp`);
      const xml = await response.text();
      setIdpMetadata(xml);
      toast.success('IdP metadata loaded');
    } catch (error) {
      toast.error('Failed to load IdP metadata');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadMetadata = (type: 'sp' | 'idp') => {
    const xml = type === 'sp' ? spMetadata : idpMetadata;
    if (!xml) {
      toast.error('Please load the metadata first');
      return;
    }

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-metadata.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${type.toUpperCase()} metadata downloaded`);
  };

  const copyToClipboard = (text: string, type: string) => {
    if (!text) {
      toast.error('Please load the metadata first');
      return;
    }

    navigator.clipboard.writeText(text);
    toast.success(`${type} metadata copied to clipboard`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Export SAML Metadata</h1>

          <div className="space-y-6">
            {/* SP Metadata */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Service Provider (SP) Metadata</h2>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <button
                    onClick={fetchSpMetadata}
                    disabled={isLoading}
                    className="btn btn-primary"
                  >
                    Load SP Metadata
                  </button>
                  {spMetadata && (
                    <>
                      <button
                        onClick={() => downloadMetadata('sp')}
                        className="btn btn-secondary"
                      >
                        Download XML
                      </button>
                      <button
                        onClick={() => copyToClipboard(spMetadata, 'SP')}
                        className="btn btn-secondary"
                      >
                        Copy to Clipboard
                      </button>
                    </>
                  )}
                </div>

                {spMetadata && (
                  <div>
                    <label className="label">SP Metadata XML</label>
                    <textarea
                      value={spMetadata}
                      readOnly
                      rows={15}
                      className="input font-mono text-sm"
                    />
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>SP Metadata URL:</strong>{' '}
                        <code className="bg-blue-100 px-2 py-1 rounded">
                          {API_BASE_URL}/saml/metadata
                        </code>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* IdP Metadata */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Identity Provider (IdP) Metadata</h2>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <button
                    onClick={fetchIdpMetadata}
                    disabled={isLoading}
                    className="btn btn-primary"
                  >
                    Load IdP Metadata
                  </button>
                  {idpMetadata && (
                    <>
                      <button
                        onClick={() => downloadMetadata('idp')}
                        className="btn btn-secondary"
                      >
                        Download XML
                      </button>
                      <button
                        onClick={() => copyToClipboard(idpMetadata, 'IdP')}
                        className="btn btn-secondary"
                      >
                        Copy to Clipboard
                      </button>
                    </>
                  )}
                </div>

                {idpMetadata && (
                  <div>
                    <label className="label">IdP Metadata XML</label>
                    <textarea
                      value={idpMetadata}
                      readOnly
                      rows={15}
                      className="input font-mono text-sm"
                    />
                    <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>IdP Metadata URL:</strong>{' '}
                        <code className="bg-purple-100 px-2 py-1 rounded">
                          {API_BASE_URL}/saml/idp/metadata
                        </code>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                Important Information
              </h3>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                <li>SP metadata is used by Identity Providers to trust this application as a Service Provider</li>
                <li>IdP metadata is used by Service Providers to trust this application as an Identity Provider</li>
                <li>Metadata includes entity IDs, endpoints, and signing certificates</li>
                <li>Share the appropriate metadata with external SAML partners to establish trust</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
