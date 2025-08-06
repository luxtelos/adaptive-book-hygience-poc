import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import "./App.css";
import LandingPage from "./components/LandingPage";
import AgentForm from "./components/AgentForm";
import QBOAuth from "./components/QBOAuth";
import OAuthCallback from "./components/OAuthCallBack"; // Fixed typo
import Assessment from "./components/Assessment";
import { QBOServiceProvider } from "./services/QBOServiceContext";


// 1. Define types for the state variables.
export type CurrentView = "landing" | "agent-form" | "qbo-auth" | "assessment";
export type CurrentStep =
  | "upload"
  | "customer-selection"
  | "analysis"
  | "results";
export type ViewMode = "business" | "technical";

// 2. Define an interface for the `formData` object.
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

// Protected Route Component
const ProtectedRoute: React.FC<{
  component: React.ComponentType<any>;
  [key: string]: any;
}> = ({ component: Component, ...props }) => {
  return (
    <SignedIn>
      <Component {...props} />
    </SignedIn>
  );
};

function AppContent() {
  // Define all the state variables needed for the different components
  const [currentStep, setCurrentStep] = useState<CurrentStep>("upload");
  const [viewMode, setViewMode] = useState<ViewMode>("business");
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

  // QBO Auth states
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [realmId, setRealmId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Define all the handler functions
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFileUpload = (reportName: string) => {
    setUploadedFiles((prevFiles) => {
      if (prevFiles.includes(reportName)) {
        return prevFiles; // Prevent duplicates
      }
      return [...prevFiles, reportName];
    });
  };

  const handleAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentStep("results");
    }, 4000); // Simulate a 4-second analysis process
  };

  return (
    <QBOServiceProvider>
      <Routes>
        {/* Public Landing Page - shows sign in/up options */}
        <Route path="/" element={<LandingPage />} />

        {/* Protected Routes - require authentication */}
        <Route
          path="/dashboard"
          element={
            <SignedIn>
              <LandingPage />
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
              formData={formData}
              accessToken={accessToken}
              refreshToken={refreshToken}
              realmId={realmId}
              authError={authError}
            />
          }
        />

        {/* OAuth Callback - needs to be accessible during redirect */}
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

        {/* Catch all - redirect based on auth status */}
        <Route
          path="*"
          element={
            <>
              <SignedIn>
                <Navigate to="/dashboard" replace />
              </SignedIn>
              <SignedOut>
                <Navigate to="/" replace />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </QBOServiceProvider>
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
