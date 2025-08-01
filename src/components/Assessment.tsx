import React, { useState, useEffect } from 'react';
import { 
  Link2Icon, 
  UploadIcon, 
  CheckCircledIcon, 
  ExclamationTriangleIcon, 
  CrossCircledIcon, 
  EyeOpenIcon, 
  GearIcon, 
  CalendarIcon, 
  BarChartIcon, 
  DownloadIcon, 
  PlayIcon, 
  ReloadIcon 
} from '@radix-ui/react-icons';

const AssessmentApp = ({ 
  currentStep, 
  setCurrentStep, 
  viewMode, 
  setViewMode, 
  uploadedFiles, 
  setUploadedFiles, 
  isAnalyzing, 
  setIsAnalyzing, 
  formData, 
  handleFileUpload, 
  handleAnalysis 
}) => {
  const [isConnecting, setIsConnecting] = useState(false); // State for API connection loading
  const [connectionStatus, setConnectionStatus] = useState(null); // null, 'success', 'error'
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false); // Track if API was attempted
  
  // Temporary flag to control API usage (set to false until actual API is ready)
  const isApiEnabled = true;

  const mockAssessmentResults = {
    overallScore: 73,
    category: "MINOR FIXES NEEDED",
    categoryColor: "yellow",
    pillars: [
      { name: "Bank & Credit Card Matching", score: 85, status: "good" },
      { name: "Money Organization System", score: 68, status: "warning" },
      { name: "Transaction Categorization", score: 72, status: "warning" },
      { name: "Control Account Accuracy", score: 90, status: "good" },
      { name: "Customer/Vendor Balances", score: 50, status: "critical" }
    ],
    criticalIssues: [
      {
        problem: "Uncategorized transactions detected in General Ledger",
        location: "Accounting > Chart of Accounts > Uncategorized Income/Expense",
        fix: "1. Navigate to Chart of Accounts\n2. Review uncategorized transactions\n3. Assign appropriate categories\n4. Create missing account categories if needed",
        time: "2-3 hours",
        priority: "High"
      },
      {
        problem: "Customer balance discrepancies in A/R aging",
        location: "Sales > Customers > Customer Balance Detail",
        fix: "1. Run A/R Aging Summary\n2. Compare with individual customer balances\n3. Identify and resolve timing differences\n4. Apply unapplied payments",
        time: "1-2 hours",
        priority: "Medium"
      }
    ]
  };

  const requiredReports = [
    "Profit and Loss Statement",
    "Balance Sheet",
    "General Ledger",
    "Chart of Accounts",
    "Trial Balance",
    "Bank Reconciliation Reports",
    "A/R Aging Summary & Detail",
    "A/P Aging Summary & Detail",
    "Audit Log"
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return <CheckCircledIcon className="w-5 h-5 text-green-500" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <CrossCircledIcon className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  // Simulate API connection to QuickBooks
  const handleQuickBooksConnect = () => {
    setIsConnecting(true);
    setConnectionStatus(null);

    // Simulate API call with a 3-second delay
    setTimeout(() => {
      // Force failure if API is disabled, otherwise use random success/failure (70% success rate)
      const isSuccess = isApiEnabled ? Math.random() > 0.3 : false;
      
      if (isSuccess) {
        // On success, mark all required reports as "uploaded" and move to analysis step
        setUploadedFiles(requiredReports);
        setConnectionStatus('success');
        setIsConnecting(false);
        setCurrentStep('analysis'); // Automatically transition to analysis step
      } else {
        // On failure, set error status
        setConnectionStatus('error');
        setIsConnecting(false);
      }
      setHasAttemptedConnection(true);
    }, 3000);
  };

  // Automatically trigger API connection attempt when entering upload step
  useEffect(() => {
    if (currentStep === 'upload' && !hasAttemptedConnection && !isConnecting && !connectionStatus) {
      handleQuickBooksConnect();
    }
  }, [currentStep, hasAttemptedConnection, isConnecting, connectionStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Financial Books Hygiene Assessment</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {formData.firstName || 'User'}</span>
              <div className="flex space-x-2">
                <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                  QuickBooks Online Integration
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
              <span className="ml-2 font-medium">Data Upload</span>
            </div>
            <div className={`flex items-center ${currentStep === 'analysis' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'analysis' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
              <span className="ml-2 font-medium">Analysis</span>
            </div>
            <div className={`flex items-center ${currentStep === 'results' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'results' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
              <span className="ml-2 font-medium">Results</span>
            </div>
          </div>
        </div>

        {/* Upload Step */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            {/* QuickBooks Connection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Link2Icon className="w-5 h-5 mr-2" />
                Connect to QuickBooks Online
              </h2>
              <p className="text-gray-600 mb-4">
                Connect directly to your QuickBooks Online account for automated data extraction. Our secure API integration fetches all required reports instantly.
              </p>
              {!isConnecting && !connectionStatus && (
                <button 
                  onClick={handleQuickBooksConnect}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Link2Icon className="w-5 h-5 mr-2" />
                  Connect to QuickBooks
                </button>
              )}
              {isConnecting && (
                <div className="flex flex-col items-center">
                  <ReloadIcon className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                  <p className="text-lg font-medium text-gray-900">Connecting to QuickBooks...</p>
                  <p className="text-sm text-gray-600 mt-2">Fetching your financial data</p>
                </div>
              )}
              {connectionStatus === 'error' && (
                <div className="flex flex-col items-center">
                  <CrossCircledIcon className="w-8 h-8 text-red-500 mb-4" />
                  <p className="text-lg font-medium text-gray-900">Connection Failed</p>
                  <p className="text-sm text-gray-600 mt-2">Unable to connect to QuickBooks. Please try again or upload files manually below.</p>
                  <button 
                    onClick={handleQuickBooksConnect}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <ReloadIcon className="w-5 h-5 mr-2" />
                    Retry Connection
                  </button>
                </div>
              )}
            </div>

            {/* Manual Upload (shown only on API failure) */}
            {connectionStatus === 'error' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <UploadIcon className="w-5 h-5 mr-2" />
                  Manual Report Upload
                </h2>
                <p className="text-gray-600 mb-4">
                  The API could not fetch your data. Please upload Excel (.xlsx) reports from QuickBooks Online manually. <strong>Note:</strong> Export as Excel format, not PDF.
                </p>

                {/* Date Range Selection */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Fiscal Year</label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <select className="w-full border-none focus:outline-none">
                        <option>2024</option>
                        <option>2023</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Previous Fiscal Year</label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <select className="w-full border-none focus:outline-none">
                        <option>2023</option>
                        <option>2022</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rolling 13 Months</label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <input type="text" value="Jan 2023 - Jan 2024" className="w-full border-none focus:outline-none" readOnly />
                    </div>
                  </div>
                </div>

                {/* Required Reports Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredReports.map((report, index) => (
                    <div key={index} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{report}</span>
                        {uploadedFiles.includes(report) ? (
                          <CheckCircledIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <UploadIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <button 
                        onClick={() => handleFileUpload(report)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {uploadedFiles.includes(report) ? 'Uploaded ✓' : 'Click to upload .xlsx file'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {uploadedFiles.length} of {requiredReports.length} reports uploaded
                  </span>
                  <button 
                    onClick={() => setCurrentStep('analysis')}
                    disabled={uploadedFiles.length < 3}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Proceed to Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analysis Step */}
        {currentStep === 'analysis' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Ready to Analyze Your Books</h2>
            <p className="text-gray-600 mb-6">
              We'll analyze your financial data across 5 key pillars to assess your books' hygiene and provide actionable recommendations.
            </p>
            
            {!isAnalyzing ? (
              <button 
                onClick={handleAnalysis}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
              >
                <PlayIcon className="w-5 h-5 mr-2" />
                Run Assessment
              </button>
            ) : (
              <div className="flex flex-col items-center">
                <ReloadIcon className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-lg font-medium text-gray-900">Analyzing Your Financial Data...</p>
                <p className="text-sm text-gray-600 mt-2">This may take a few moments</p>
              </div>
            )}
          </div>
        )}

        {/* Results Step */}
        {currentStep === 'results' && (
          <div className="space-y-6">
            {/* View Toggle */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={() => setViewMode('business')}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${viewMode === 'business' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  <EyeOpenIcon className="w-4 h-4 mr-2" />
                  Business Owner View
                </button>
                <button 
                  onClick={() => setViewMode('technical')}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${viewMode === 'technical' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  <GearIcon className="w-4 h-4 mr-2" />
                  Bookkeeper View
                </button>
              </div>
            </div>

            {/* Business Owner View */}
            {viewMode === 'business' && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <h2 className="text-2xl font-semibold mb-4">Your Books Health Score</h2>
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10"/>
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#fbbf24" 
                        strokeWidth="10"
                        strokeDasharray={`${mockAssessmentResults.overallScore * 2.83} 283`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-yellow-600">{mockAssessmentResults.overallScore}</span>
                    </div>
                  </div>
                  <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-medium">
                    {mockAssessmentResults.category}
                  </div>
                </div>

                {/* What This Means */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold mb-4">What This Means for Your Business</h3>
                  <div className="prose text-gray-700">
                    <p>Your financial records are generally well-maintained but need some attention in specific areas. With minor fixes, your books will be ready for reliable monthly operations and accurate financial reporting.</p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Key Findings:</h4>
                    <ul className="space-y-2">
                      <li>• Your bank matching is strong, ensuring accurate cash tracking</li>
                      <li>• Some transactions need proper categorization for clearer profit reports</li>
                      <li>• Customer balances need attention - this affects your cash flow visibility</li>
                      <li>• Your control accounts are accurate, which is excellent for financial integrity</li>
                    </ul>

                    <h4 className="font-semibold mt-4 mb-2">Recommended Next Steps:</h4>
                    <ul className="space-y-2">
                      <li>• Work with your bookkeeper to categorize uncategorized transactions</li>
                      <li>• Review and resolve customer balance discrepancies</li>
                      <li>• Implement monthly book reviews to maintain this health score</li>
                    </ul>
                  </div>
                </div>

                {/* Pillar Breakdown */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <BarChartIcon className="w-5 h-5 mr-2" />
                    Areas of Your Financial System
                  </h3>
                  <div className="space-y-4">
                    {mockAssessmentResults.pillars.map((pillar, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center">
                          {getStatusIcon(pillar.status)}
                          <span className="ml-3 font-medium">{pillar.name}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className={`h-2 rounded-full ${pillar.status === 'good' ? 'bg-green-500' : pillar.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${pillar.score}%` }}
                            ></div>
                          </div>
                          <span className={`font-semibold ${getScoreColor(pillar.score)}`}>{pillar.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Technical/Bookkeeper View */}
            {viewMode === 'technical' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold">Technical Remediation Plan</h2>
                  <button className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Export Report
                  </button>
                </div>

                {/* Critical Issues */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-red-600 flex items-center">
                      <CrossCircledIcon className="w-5 h-5 mr-2" />
                      Critical Issues Requiring Immediate Action
                    </h3>
                  </div>
                  <div className="divide-y">
                    {mockAssessmentResults.criticalIssues.map((issue, index) => (
                      <div key={index} className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Problem</h4>
                            <p className="text-sm text-gray-700">{issue.problem}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Location in QBO</h4>
                            <p className="text-sm text-blue-600 font-mono bg-blue-50 p-2 rounded">{issue.location}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Fix Instructions</h4>
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded">{issue.fix}</pre>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Est. Time</h4>
                            <p className="text-sm text-gray-700">{issue.time}</p>
                            <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${issue.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {issue.priority} Priority
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pillar Details */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Detailed Pillar Assessment</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Pillar</th>
                          <th className="text-left py-2">Score</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2">Issues Found</th>
                          <th className="text-left py-2">Action Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockAssessmentResults.pillars.map((pillar, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-3 font-medium">{pillar.name}</td>
                            <td className={`py-3 font-semibold ${getScoreColor(pillar.score)}`}>{pillar.score}%</td>
                            <td className="py-3">{getStatusIcon(pillar.status)}</td>
                            <td className="py-3 text-sm text-gray-600">
                              {pillar.status === 'critical' ? '3 critical issues' : pillar.status === 'warning' ? '2 minor issues' : 'No issues'}
                            </td>
                            <td className="py-3 text-sm">
                              {pillar.status === 'good' ? 'Monitor monthly' : 'Immediate attention needed'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentApp;