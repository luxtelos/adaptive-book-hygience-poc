import React, { useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage.tsx';
import AgentForm from './components/AgentForm.tsx';
import AssessmentApp from './components/Assessment.tsx';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // State to manage current view
  const [currentStep, setCurrentStep] = useState('upload'); // State for assessment steps
  const [viewMode, setViewMode] = useState('business'); // State for view mode (business/technical)
  const [uploadedFiles, setUploadedFiles] = useState([]); // State for uploaded files
  const [isAnalyzing, setIsAnalyzing] = useState(false); // State for analysis progress
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    businessType: '',
    bookkeepingChallenges: '',
    currentSoftware: '',
    monthlyRevenue: '',
    urgencyLevel: ''
  }); // State for form data

  // Handler for form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handler for form submission
  const handleFormSubmit = () => {
    setCurrentStep('upload');
    setUploadedFiles([]);
    setIsAnalyzing(false);
    setViewMode('business');
    setCurrentView('assessment');
  };

  // Handler for file uploads
  const handleFileUpload = (reportName) => {
    if (!uploadedFiles.includes(reportName)) {
      setUploadedFiles([...uploadedFiles, reportName]);
    }
  };

  // Handler for analysis
  const handleAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentStep('results');
    }, 3000);
  };

  // Render the appropriate component based on currentView
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
        <AssessmentApp
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