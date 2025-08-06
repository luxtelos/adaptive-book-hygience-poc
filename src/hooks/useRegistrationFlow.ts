import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { RegistrationService } from '../lib/registrationService';

export const useRegistrationFlow = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);

  const startAssessment = async () => {
    if (!isLoaded || !user || !user.primaryEmailAddress?.emailAddress) {
      navigate('/', { replace: true });
      return;
    }

    try {
      setIsCheckingRegistration(true);
      const registrationData = await RegistrationService.getRegistrationData(user.primaryEmailAddress.emailAddress);

      if (registrationData) {
        navigate('/qbo-auth', { replace: true });
      } else {
        navigate('/form', { replace: true });
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
      navigate('/form', { replace: true });
    } finally {
      setIsCheckingRegistration(false);
    }
  };

  return { isCheckingRegistration, startAssessment };
};