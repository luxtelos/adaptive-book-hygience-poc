import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReloadIcon } from '@radix-ui/react-icons';

const POST_LOGIN_REDIRECT = "http://localhost:5173/assessment"; 

interface OAuthCallbackProps {
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setRealmId: (id: string | null) => void;
  setError: (error: string | null) => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ 
  setAccessToken, 
  setRefreshToken, 
  setRealmId, 
  setError 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const error = params.get("error");
    
    console.log("OAuth callback - code received:", code);
    console.log("OAuth callback - error received:", error);

    if (error) {
      console.error("OAuth error:", error);
      setError(`OAuth error: ${error}`);
      debugger;
      console.log("Redirecting to QBO Auth page due to error");
    }

    if (code) {
      // Clear any previous errors
      setError(null);
      
      fetch(`${POST_LOGIN_REDIRECT}?code=${code}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data: { 
          access_token?: string; 
          refresh_token?: string; 
          realmId?: string; 
          realm_id?: string;
          error?: string;
        }) => {
          console.log("n8n response:", data);
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          if (data.access_token) {
            setAccessToken(data.access_token);
            setRefreshToken(data.refresh_token || null);
            setRealmId(data.realmId || data.realm_id || "N/A");
            // Redirect directly to assessment page after successful auth
            navigate("/assessment");
          } else {
            throw new Error("Invalid response from backend - no access token received");
          }
        })
        .catch((err: Error) => {
          console.error("Fetch error:", err);
          setError(`Failed to authenticate: ${err.message}`);
          navigate('/qbo-auth');
        });
    } else {
      console.error("No code in URL");
      setError("No authorization code received from QuickBooks");
      navigate('/qbo-auth');
    }
  }, [location, navigate, setAccessToken, setRefreshToken, setRealmId, setError]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <ReloadIcon className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Authentication...</h2>
          <p className="text-gray-600">
            Please wait while we complete your QuickBooks connection.
          </p>
          <div className="mt-6">
            <div className="animate-pulse flex space-x-1 justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;