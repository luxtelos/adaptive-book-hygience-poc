import React, { useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import AgentForm from './components/AgentForm';
import Assessment from './components/Assessment';

// 1. Define types for the state variables.
export type CurrentView = 'landing' | 'agent-form' | 'assessment'; // Export for reuse
export type CurrentStep = 'upload' | 'analysis' | 'results';
export type ViewMode = 'business' | 'technical';

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

function App() {
  // Define all the state variables needed for the different components
  const [currentView, setCurrentView] = useState<CurrentView>('landing');
  const [currentStep, setCurrentStep] = useState<CurrentStep>('upload');
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    businessType: '',
    bookkeepingChallenges: '',
    currentSoftware: '',
    monthlyRevenue: '',
    urgencyLevel: '',
  });

  // Define all the handler functions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setCurrentView('assessment');
    // In a real app, you would send formData to your backend here
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
      setCurrentStep('results');
    }, 4000); // Simulate a 4-second analysis process
  };

  return (
    <div className="App">
      {currentView === 'landing' && <LandingPage setCurrentView={setCurrentView} />}
      {currentView === 'agent-form' && (
        <AgentForm
          setCurrentView={setCurrentView}
          formData={formData}
          handleInputChange={handleInputChange}
          handleFormSubmit={handleFormSubmit}
        />
      )}
      {currentView === 'assessment' && (
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
        />
      )}
    </div>
  );
}

export default App;