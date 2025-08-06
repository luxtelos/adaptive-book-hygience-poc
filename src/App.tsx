import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import './App.css';
import LandingPage from './components/LandingPage';
import Dashboard from './components/LandingPage';
import AgentForm from './components/AgentForm';
import QBOAuth from './components/QBOAuth';
import OAuthCallback from './components/OAuthCallBack';
import Assessment from './components/Assessment';
import AuthGuard from './components/AuthGuard';

export type CurrentView = 'landing' | 'agent-form' | 'qbo-auth' | 'assessment';
export type CurrentStep = 'upload' | 'analysis' | 'results';
export type ViewMode = 'business' | 'technical';

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  businessType: string;
  bookkeepingChallenges: string;
  currentSoftware: string;
  monthlyRevenue: string;
  urgencyLevel: string;
}

const ProtectedRoute: React.FC<{
  component: React.ComponentType<any>;
  requiresRegistration?: boolean;
  [key: string]: any;
}> = ({ component: Component, requiresRegistration = false, ...props }) => {
  return (
    <SignedIn>
      {requiresRegistration ? (
        <AuthGuard>
          <Component {...props} />
        </AuthGuard>
      ) : (
        <Component {...props} />
      )}
    </SignedIn>
  );
};

function AppContent() {
  const [currentStep, setCurrentStep] = useState<CurrentStep>('upload');
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    businessType: "",
    bookkeepingChallenges: "",
    currentSoftware: "",
    monthlyRevenue: "",
    urgencyLevel: "",
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [realmId, setRealmId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFileUpload = (reportName: string) => {
    setUploadedFiles((prevFiles) => {
      if (prevFiles.includes(reportName)) {
        return prevFiles;
      }
      return [...prevFiles, reportName];
    });
  };

  const handleAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentStep('results');
    }, 4000);
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <SignedIn>
            <Dashboard />
          </SignedIn>
        }
      />
      <Route
        path="/form"
        element={
          <ProtectedRoute
            component={AgentForm}
            formData={formData}
            handleInputChange={handleInputChange}
          />
        }
      />
      <Route
        path="/qbo-auth"
        element={
          <ProtectedRoute
            component={QBOAuth}
            requiresRegistration={true}
            formData={formData}
            accessToken={accessToken}
            refreshToken={refreshToken}
            realmId={realmId}
            authError={authError}
          />
        }
      />
      <Route
        path="/oauth-callback"
        element={
          <OAuthCallback
            setAccessToken={setAccessToken}
            setRefreshToken={setRefreshToken}
            setRealmId={setRealmId}
            setError={setAuthError}
          />
        }
      />
      <Route
        path="/assessment"
        element={
          <SignedIn>
            {accessToken ? (
              <Assessment
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
                viewMode={viewMode}
                setViewMode={setViewMode}
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles}
                isAnalyzing={isAnalyzing}
                setIsAnalyzing={setIsAnalyzing}
                formData={formData}
                handleFileUpload={handleFileUpload}
                handleAnalysis={handleAnalysis}
                accessToken={accessToken}
                realmId={realmId}
              />
            ) : (
              <Navigate to="/qbo-auth" replace />
            )}
          </SignedIn>
        }
      />
      <Route
        path="*"
        element={
          <>
            <SignedIn>
              <LandingPage />
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;
