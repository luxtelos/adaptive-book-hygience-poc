import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ReloadIcon } from '@radix-ui/react-icons';
import { RegistrationService } from '../lib/registrationService';

interface AuthGuardProps {
  children?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!isLoaded || !user || !user.primaryEmailAddress?.emailAddress) {
        navigate('/', { replace: true });
        setIsCheckingRegistration(false);
        return;
      }

      try {
        setIsCheckingRegistration(true);
        const registrationData = await RegistrationService.getRegistrationData(user.primaryEmailAddress.emailAddress);

        if (!registrationData) {
          navigate('/form', { replace: true });
        } else {
          // If no children (i.e., used on /dashboard route), redirect to QBO auth
          if (!children) {
            navigate('/qbo-auth', { replace: true });
          }
          // If has children, allow access to protected component (no action needed)
        }
      } catch (error) {
        console.error('Error checking registration:', error);
        navigate('/form', { replace: true });
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    checkRegistrationStatus();
  }, [user, isLoaded, navigate]);

  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <ReloadIcon className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Checking your profile...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your registration status.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (children && user) {
    return <>{children}</>;
  }

  return null;
};

export default AuthGuard;