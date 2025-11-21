import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface IdpLoginForm {
  email: string;
  password: string;
  spEntityId: string;
}

export const IdpLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [entities, setEntities] = useState<any[]>([]);
  const { register, handleSubmit, formState: { errors } } = useForm<IdpLoginForm>();

  useState(() => {
    fetchEntities();
  });

  const fetchEntities = async () => {
    try {
      const response = await api.get('/api/metadata/entities');
      const sps = response.data.entities.filter((e: any) => e.type === 'SP');
      setEntities(sps);
    } catch (error) {
      // Non-authenticated call is ok
    }
  };

  const onSubmit = async (data: IdpLoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/saml/idp/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (response.ok) {
        const html = await response.text();
        // Display the HTML which contains the auto-submit form
        document.open();
        document.write(html);
        document.close();
      } else {
        const error = await response.json();
        toast.error(error.error || 'IdP login failed');
      }
    } catch (error: any) {
      toast.error('IdP login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Identity Provider Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Authenticate to continue to the Service Provider
          </p>
          {searchParams.get('requestId') && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Request ID: {searchParams.get('requestId')}
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="spEntityId" className="label">
                Service Provider
              </label>
              <select
                {...register('spEntityId', { required: 'Service Provider is required' })}
                id="spEntityId"
                className="input"
              >
                <option value="">-- Select Service Provider --</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.entityId}>
                    {entity.entityId}
                  </option>
                ))}
              </select>
              {errors.spEntityId && (
                <p className="mt-1 text-sm text-red-600">{errors.spEntityId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                {...register('password', {
                  required: 'Password is required',
                })}
                id="password"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Continue to Service Provider'}
            </button>
          </div>
        </form>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            This is the Identity Provider login page. After successful authentication,
            you will be redirected to the Service Provider with a SAML assertion.
          </p>
        </div>
      </div>
    </div>
  );
};
