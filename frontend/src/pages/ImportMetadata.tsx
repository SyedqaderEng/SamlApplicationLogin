import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';

interface ImportForm {
  xml: string;
  type: 'SP' | 'IDP';
}

interface SamlEntity {
  id: string;
  type: string;
  entityId: string;
  ssoUrl?: string;
  sloUrl?: string;
  acsUrls: string[];
  active: boolean;
  certificateFingerprints: string[];
  createdAt: string;
}

export const ImportMetadata: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [entities, setEntities] = useState<SamlEntity[]>([]);
  const [useFile, setUseFile] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ImportForm>();

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const response = await api.get('/api/metadata/entities');
      setEntities(response.data.entities);
    } catch (error) {
      toast.error('Failed to load entities');
    }
  };

  const onSubmit = async (data: ImportForm) => {
    setIsLoading(true);
    try {
      await api.post('/api/metadata/import', data);
      toast.success('Metadata imported successfully!');
      setValue('xml', '');
      fetchEntities();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Import failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setValue('xml', content);
      };
      reader.readAsText(file);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entity?')) {
      return;
    }

    try {
      await api.delete(`/api/metadata/entities/${id}`);
      toast.success('Entity deleted successfully');
      fetchEntities();
    } catch (error) {
      toast.error('Failed to delete entity');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await api.patch(`/api/metadata/entities/${id}/toggle`);
      toast.success('Entity status updated');
      fetchEntities();
    } catch (error) {
      toast.error('Failed to update entity');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Import SAML Metadata</h1>

          {/* Import Form */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Import New Metadata</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Metadata Type</label>
                <select {...register('type', { required: true })} className="input">
                  <option value="SP">Service Provider (SP)</option>
                  <option value="IDP">Identity Provider (IdP)</option>
                </select>
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <button
                  type="button"
                  onClick={() => setUseFile(!useFile)}
                  className="btn btn-secondary"
                >
                  {useFile ? 'Paste XML' : 'Upload File'}
                </button>
              </div>

              {useFile ? (
                <div>
                  <label className="label">Upload XML File</label>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={handleFileUpload}
                    className="input"
                  />
                </div>
              ) : (
                <div>
                  <label className="label">Paste XML Metadata</label>
                  <textarea
                    {...register('xml', { required: 'XML metadata is required' })}
                    rows={10}
                    className="input font-mono text-sm"
                    placeholder="Paste your SAML metadata XML here..."
                  />
                  {errors.xml && (
                    <p className="mt-1 text-sm text-red-600">{errors.xml.message}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? 'Importing...' : 'Import Metadata'}
              </button>
            </form>
          </div>

          {/* Imported Entities */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Imported Entities</h2>
            {entities.length === 0 ? (
              <p className="text-gray-600">No entities imported yet.</p>
            ) : (
              <div className="space-y-4">
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {entity.entityId}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entity.type === 'SP'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {entity.type}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleActive(entity.id)}
                          className={`btn ${
                            entity.active ? 'btn-secondary' : 'btn-primary'
                          }`}
                        >
                          {entity.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(entity.id)}
                          className="btn btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {entity.ssoUrl && (
                        <p>
                          <strong>SSO URL:</strong> {entity.ssoUrl}
                        </p>
                      )}
                      {entity.acsUrls.length > 0 && (
                        <p>
                          <strong>ACS URLs:</strong> {entity.acsUrls.join(', ')}
                        </p>
                      )}
                      {entity.certificateFingerprints.length > 0 && (
                        <p>
                          <strong>Certificate Fingerprints:</strong>{' '}
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {entity.certificateFingerprints[0]}
                          </code>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
