import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ReloadIcon } from "@radix-ui/react-icons";
import logger from "../lib/logger";

// OAuth Configuration from environment variables
const POST_LOGIN_REDIRECT = import.meta.env.VITE_QBO_POST_LOGIN_REDIRECT;

// Validate required environment variable
if (!POST_LOGIN_REDIRECT) {
  logger.error("VITE_QBO_POST_LOGIN_REDIRECT environment variable is required");
}

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
  setError,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    logger.group("OAuth Callback Processing");

    const params = new URLSearchParams(location.search);
    const qbTokens = params.get("qb_tokens");
    const error = params.get("error");

    logger.debug("OAuth callback - code received:", qbTokens);
    logger.debug("OAuth callback - error received:", error);

    if (error) {
      logger.error("OAuth error:", error);
      setError(`OAuth error: ${error}`);
      logger.debugBreak("OAuth error occurred - check error details above");
      logger.info("Redirecting to QBO Auth page due to error");
    }

    if (qbTokens) {
      try {
        const decodeQbTokens = JSON.parse(decodeURIComponent(qbTokens));
        logger.debug("Decoded QB tokens:", decodeQbTokens);

        // Clear any previous errors
        setError(null);
        setAccessToken(decodeQbTokens.access_token);
        setRefreshToken(decodeQbTokens.refresh_token || null);

        logger.info(
          "Successfully processed OAuth tokens, navigating to assessment",
        );
        navigate("/assessment");
      } catch (parseError) {
        logger.error("Failed to parse QB tokens:", parseError);
        setError("Invalid token format received from QuickBooks");
        navigate("/qbo-auth");
      }

      // fetch(`${POST_LOGIN_REDIRECT}?code=${code}`, {
      //   method: "GET",
      //   redirect: "manual"
      // })
      //   .then((res) => {
      //     if (!res.ok) {
      //       throw new Error(`HTTP error! status: ${res.status}`);
      //     }
      //     const headers = res.headers;
      //     const accessToken = headers.get("access-token")
      //     const refreshToken = headers.get("refresh-token")
      //     const tokenType = headers.get("token-type")

      //     const data = {
      //       accessToken, refreshToken, tokenType
      //     }

      //     console.log("data", data)

      //     if (data.accessToken) {
      //       setAccessToken(data.refreshToken);
      //       setRefreshToken(data.tokenType || null);
      //       // setRealmId(data.realmId || data.realm_id || "N/A");
      //       // Redirect directly to assessment page after successful auth
      //       navigate("/assessment");
      //     } else {
      //       throw new Error("Invalid response from backend - no access token received");
      //     }
      //   })
      //   .catch((err: Error) => {
      //     console.error("Fetch error:", err);
      //     setError(`Failed to authenticate: ${err.message}`);
      //     navigate('/qbo-auth');
      //   });
    } else {
      logger.error("No authorization code received from QuickBooks");
      setError("No authorization code received from QuickBooks");
      navigate("/qbo-auth");
    }

    logger.groupEnd();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <ReloadIcon className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Authentication...
          </h2>
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
