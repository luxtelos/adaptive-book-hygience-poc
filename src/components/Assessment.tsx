import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ReloadIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import { useUser } from "@clerk/clerk-react";
import { FormData, CurrentStep, ViewMode } from "../App";
import { QBOCustomer, DateRange } from "../services/qboApiService";
import { useQBOService } from "../services/QBOServiceContext";
import logger from "../lib/logger";

interface AssessmentProps {
  currentStep: CurrentStep;
  setCurrentStep: React.Dispatch<React.SetStateAction<CurrentStep>>;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  uploadedFiles: string[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  isAnalyzing: boolean;
  setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  formData: FormData;
  handleFileUpload: (reportName: string) => void;
  handleAnalysis: () => void;
  accessToken: string | null;
  realmId: string | null;
}

// Types for assessment results
type ConnectionStatus = "idle" | "success" | "error";

interface Pillar {
  name: string;
  score: number;
  status: "good" | "warning" | "critical";
}

interface CriticalIssue {
  problem: string;
  location: string;
  fix: string;
  time: string;
  priority: "High" | "Medium";
}

interface AssessmentResults {
  overallScore: number;
  category: string;
  categoryColor: string;
  pillars: Pillar[];
  criticalIssues: CriticalIssue[];
}

const Assessment = ({
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
  handleAnalysis,
  accessToken,
  realmId,
}: AssessmentProps) => {
  const navigate = useNavigate();
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);

  // Customer selection state
  const [customers, setCustomers] = useState<QBOCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<QBOCustomer | null>(
    null,
  );
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    start_date: "2024-01-01",
    end_date: "2024-12-31",
  });

  // Get QBO service from context
  const { qboService, error: serviceError } = useQBOService();

  const { isLoaded, isSignedIn, user } = useUser();

  // Handle service initialization errors
  if (serviceError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <CrossCircledIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Service Error
            </h2>
            <p className="text-gray-600 mb-4">{serviceError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add progress state for better UX
  const [progressState, setProgressState] = useState<{
    percentage: number;
    currentStep: string;
  } | null>(null);

  const mockAssessmentResults: AssessmentResults = {
    overallScore: 73,
    category: "MINOR FIXES NEEDED",
    categoryColor: "yellow",
    pillars: [
      { name: "Bank & Credit Card Matching", score: 85, status: "good" },
      { name: "Money Organization System", score: 68, status: "warning" },
      { name: "Transaction Categorization", score: 72, status: "warning" },
      { name: "Control Account Accuracy", score: 90, status: "good" },
      { name: "Customer/Vendor Balances", score: 50, status: "critical" },
    ],
    criticalIssues: [
      {
        problem: "Uncategorized transactions detected in General Ledger",
        location:
          "Accounting > Chart of Accounts > Uncategorized Income/Expense",
        fix: "1. Navigate to Chart of Accounts\n2. Review uncategorized transactions\n3. Assign appropriate categories\n4. Create missing account categories if needed",
        time: "2-3 hours",
        priority: "High",
      },
      {
        problem: "Customer balance discrepancies in A/R aging",
        location: "Sales > Customers > Customer Balance Detail",
        fix: "1. Run A/R Aging Summary\n2. Compare with individual customer balances\n3. Identify and resolve timing differences\n4. Apply unapplied payments",
        time: "1-2 hours",
        priority: "Medium",
      },
    ],
  };

  const requiredReports: string[] = [
    "Profit and Loss Statement",
    "Balance Sheet",
    "General Ledger",
    "Chart of Accounts",
    "Trial Balance",
    "Bank Reconciliation Reports",
    "A/R Aging Summary & Detail",
    "A/P Aging Summary & Detail",
    "Audit Log",
  ];

  // Auto-fetch customers when component loads if we have access token
  useEffect(() => {
    if (
      accessToken &&
      realmId &&
      currentStep === "upload" &&
      customers.length === 0
    ) {
      handleCustomersFetch();
    }
  }, [accessToken, realmId, currentStep]);

  const handleCustomersFetch = async () => {
    if (!qboService) {
      logger.error("QBO service not available");
      setCustomerError("QBO service not available");
      return;
    }

    setIsLoadingCustomers(true);
    setCustomerError(null);

    try {
      const fetchedCustomers = await qboService.fetchCustomers();
      setCustomers(fetchedCustomers);
      setCurrentStep("customer-selection");
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomerError(
        "Failed to fetch customers from QuickBooks. Please try manual upload.",
      );
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleCustomerSelect = (customer: QBOCustomer) => {
    setSelectedCustomer(customer);
    setIsCustomerDropdownOpen(false);
  };

  const handleFetchFinancialData = async () => {
    if (!selectedCustomer) {
      logger.warn("No customer selected for financial data fetch");
      return;
    }

    if (!qboService) {
      logger.error("QBO service not available");
      setDataFetchError("QBO service not available");
      return;
    }

    logger.group("Financial Data Fetch");
    logger.info(
      `Starting financial data fetch for customer: ${selectedCustomer.Name}`,
    );

    setIsFetchingData(true);
    setDataFetchError(null);
    setProgressState(null);

    try {
      const progressCallback = (progress: any) => {
        setProgressState({
          percentage: progress.percentage,
          currentStep: progress.currentStep,
        });

        logger.debug(
          `Financial data fetch progress: ${progress.percentage.toFixed(1)}% - ${progress.currentStep}`,
        );
      };

      await qboService.fetchAllFinancialData(
        selectedCustomer.Id,
        dateRange,
        progressCallback,
      );

      // Simulate successful data fetch
      setUploadedFiles(requiredReports);
      setCurrentStep("analysis");
      logger.info("Financial data fetch completed successfully");
    } catch (error) {
      logger.error("Error fetching financial data:", error);
      setDataFetchError(
        error instanceof Error
          ? error.message
          : "Failed to fetch financial data",
      );
    } finally {
      setIsFetchingData(false);
      setProgressState(null);
      logger.groupEnd();
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.Name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.DisplayName.toLowerCase().includes(
        customerSearchTerm.toLowerCase(),
      ) ||
      (customer.CompanyName &&
        customer.CompanyName.toLowerCase().includes(
          customerSearchTerm.toLowerCase(),
        )),
  );

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = (status: "good" | "warning" | "critical") => {
    switch (status) {
      case "good":
        return <CheckCircledIcon className="w-5 h-5 text-green-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case "critical":
        return <CrossCircledIcon className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Financial Books Hygiene Assessment
            </h1>
            <div className="flex items-center space-x-4">
              {isLoaded && isSignedIn && user ? (
                <span className="text-sm text-gray-600">
                  Welcome, {user.username}
                </span>
              ) : (
                <span className="text-sm text-gray-600">
                  Welcome, {formData.firstName}
                </span>
              )}
              <div className="flex space-x-2">
                <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                  QuickBooks Connected
                </span>
                <button
                  onClick={() => navigate("/qbo-auth")}
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div
              className={`flex items-center ${currentStep === "upload" ? "text-blue-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "upload" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              >
                1
              </div>
              <span className="ml-2 font-medium">Data Fetch</span>
            </div>
            <div
              className={`flex items-center ${currentStep === "analysis" ? "text-blue-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "analysis" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              >
                2
              </div>
              <span className="ml-2 font-medium">Analysis</span>
            </div>
            <div
              className={`flex items-center ${currentStep === "results" ? "text-blue-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "results" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              >
                3
              </div>
              <span className="ml-2 font-medium">Results</span>
            </div>
          </div>
        </div>

        {/* Connect/Data Fetch Step */}
        {currentStep === "upload" && (
          <div className="space-y-6">
            {/* QBO Customer Fetch Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Link2Icon className="w-5 h-5 mr-2" />
                Connecting to QuickBooks Online
              </h2>

              {isLoadingCustomers && (
                <div className="flex flex-col items-center py-8">
                  <ReloadIcon className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-lg font-medium text-gray-900">
                    Fetching Customer List...
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Connected to: {formData.company} (Realm ID: {realmId})
                  </p>
                  <div className="mt-4 w-full max-w-md">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full animate-pulse"
                        style={{ width: "60%" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {!isLoadingCustomers &&
                customers.length === 0 &&
                !customerError && (
                  <button
                    onClick={handleCustomersFetch}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Link2Icon className="w-5 h-5 mr-2" />
                    Connect to QuickBooks
                  </button>
                )}

              {customers.length > 0 && (
                <div className="flex flex-col items-center py-4">
                  <CheckCircledIcon className="w-12 h-12 text-green-600 mb-4" />
                  <p className="text-lg font-medium text-gray-900">
                    Successfully Connected!
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Found {customers.length} customers in QuickBooks Online
                  </p>
                </div>
              )}

              {customerError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CrossCircledIcon className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-medium">
                        Connection Failed
                      </p>
                      <p className="text-red-700 text-sm mt-1">
                        {customerError}
                      </p>
                      <button
                        onClick={handleCustomersFetch}
                        className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Upload Fallback */}
            {(dataFetchError ||
              (!isFetchingData && uploadedFiles.length === 0)) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <UploadIcon className="w-5 h-5 mr-2" />
                  Manual Report Upload (Fallback)
                </h2>
                <p className="text-gray-600 mb-4">
                  If automatic data fetching fails, you can upload Excel (.xlsx)
                  reports manually from QuickBooks Online.
                </p>

                {/* Date Range Selection */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Fiscal Year
                    </label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <select className="w-full border-none focus:outline-none">
                        <option>2024</option>
                        <option>2023</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Previous Fiscal Year
                    </label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <select className="w-full border-none focus:outline-none">
                        <option>2023</option>
                        <option>2022</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rolling 13 Months
                    </label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <input
                        type="text"
                        value="Jan 2023 - Jan 2024"
                        className="w-full border-none focus:outline-none"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Required Reports Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredReports.map((report, index) => (
                    <div
                      key={index}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {report}
                        </span>
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
                        {uploadedFiles.includes(report)
                          ? "Uploaded ✓"
                          : "Click to upload .xlsx file"}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {uploadedFiles.length} of {requiredReports.length} reports
                    uploaded
                  </span>
                  <button
                    onClick={() => setCurrentStep("analysis")}
                    disabled={uploadedFiles.length < 3}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Proceed to Analysis
                  </button>
                </div>
              </div>
            )}

            {/* Auto-proceed when customers are fetched */}
            {customers.length > 0 && !isLoadingCustomers && (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600 mb-4">
                  Customer list fetched successfully!
                </p>
                <button
                  onClick={() => setCurrentStep("customer-selection")}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue to Customer Selection
                </button>
              </div>
            )}
          </div>
        )}

        {/* Customer Selection Step */}
        {currentStep === "customer-selection" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <PersonIcon className="w-5 h-5 mr-2" />
                Select Customer for Analysis
              </h2>
              <p className="text-gray-600 mb-6">
                Choose the customer whose financial data you want to analyze.
                This will filter reports to show data specific to this customer.
              </p>

              {/* Customer Selection */}
              <div className="space-y-6">
                {/* Search and Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Search
                  </label>
                  <div className="relative">
                    <div className="flex items-center border-2 border-gray-300 rounded-lg focus-within:border-blue-500">
                      <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 ml-3" />
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        className="w-full px-3 py-3 border-none focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          setIsCustomerDropdownOpen(!isCustomerDropdownOpen)
                        }
                        className="px-3 py-3 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronDownIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Dropdown */}
                    {isCustomerDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <button
                              key={customer.Id}
                              onClick={() => handleCustomerSelect(customer)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {customer.DisplayName}
                                  </p>
                                  {customer.CompanyName && (
                                    <p className="text-sm text-gray-600">
                                      {customer.CompanyName}
                                    </p>
                                  )}
                                  {customer.PrimaryEmailAddr && (
                                    <p className="text-xs text-gray-500">
                                      {customer.PrimaryEmailAddr.Address}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    ${customer.Balance.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Balance
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            No customers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Customer Preview */}
                {selectedCustomer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Selected Customer
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedCustomer.DisplayName}
                        </p>
                        {selectedCustomer.CompanyName && (
                          <p className="text-gray-600">
                            {selectedCustomer.CompanyName}
                          </p>
                        )}
                        {selectedCustomer.PrimaryEmailAddr && (
                          <p className="text-sm text-gray-600">
                            {selectedCustomer.PrimaryEmailAddr.Address}
                          </p>
                        )}
                        {selectedCustomer.PrimaryPhone && (
                          <p className="text-sm text-gray-600">
                            {selectedCustomer.PrimaryPhone.FreeFormNumber}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Current Balance</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${selectedCustomer.Balance.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Total with Jobs: $
                          {selectedCustomer.BalanceWithJobs.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Last Updated:{" "}
                          {new Date(
                            selectedCustomer.MetaData.LastUpdatedTime,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Date Range Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <input
                        type="date"
                        value={dateRange.start_date}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            start_date: e.target.value,
                          }))
                        }
                        className="w-full border-none focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <input
                        type="date"
                        value={dateRange.end_date}
                        onChange={(e) =>
                          setDateRange((prev) => ({
                            ...prev,
                            end_date: e.target.value,
                          }))
                        }
                        className="w-full border-none focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={() => setCurrentStep("upload")}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to Connection
                  </button>

                  <div className="space-x-4">
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCurrentStep("analysis");
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Skip (All Customers)
                    </button>
                    <button
                      onClick={handleFetchFinancialData}
                      disabled={isFetchingData || !selectedCustomer}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isFetchingData ? (
                        <>
                          <ReloadIcon className="w-4 h-4 animate-spin" />
                          {progressState ? (
                            <span>
                              {progressState.currentStep} (
                              {progressState.percentage.toFixed(0)}%)
                            </span>
                          ) : (
                            "Fetching Data..."
                          )}
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-4 h-4" />
                          Fetch Financial Data
                        </>
                      )}
                    </button>

                    {/* Progress indicator */}
                    {progressState && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{progressState.currentStep}</span>
                          <span>{progressState.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressState.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Data Fetch Progress */}
                {isFetchingData && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <ReloadIcon className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                      <span className="font-medium text-blue-900">
                        Fetching Financial Data...
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Retrieving comprehensive financial reports for{" "}
                      {selectedCustomer?.DisplayName}
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full animate-pulse"
                        style={{ width: "60%" }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Data Fetch Error */}
                {dataFetchError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CrossCircledIcon className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                      <div>
                        <p className="text-red-800 font-medium">
                          Data Fetch Failed
                        </p>
                        <p className="text-red-700 text-sm mt-1">
                          {dataFetchError}
                        </p>
                        <button
                          onClick={handleFetchFinancialData}
                          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          Retry Fetch
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analysis Step */}
        {currentStep === "analysis" && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">
              Ready to Analyze Your Books
            </h2>
            <p className="text-gray-600 mb-6">
              We'll analyze your financial data across 5 key pillars to assess
              your books' hygiene and provide actionable recommendations.
            </p>

            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                ✓ Successfully connected to {formData.company}
              </p>
              <p className="text-green-700 text-sm mt-1">
                {uploadedFiles.length} reports ready for analysis
              </p>
            </div>

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
                <p className="text-lg font-medium text-gray-900">
                  Analyzing Your Financial Data...
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  This may take a few moments
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results Step */}
        {currentStep === "results" && (
          <div className="space-y-6">
            {/* View Toggle */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setViewMode("business")}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${viewMode === "business" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  <EyeOpenIcon className="w-4 h-4 mr-2" />
                  Business Owner View
                </button>
                <button
                  onClick={() => setViewMode("technical")}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${viewMode === "technical" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  <GearIcon className="w-4 h-4 mr-2" />
                  Bookkeeper View
                </button>
              </div>
            </div>

            {/* Business Owner View */}
            {viewMode === "business" && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <h2 className="text-2xl font-semibold mb-4">
                    Your Books Health Score
                  </h2>
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="10"
                      />
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
                      <span className="text-3xl font-bold text-yellow-600">
                        {mockAssessmentResults.overallScore}
                      </span>
                    </div>
                  </div>
                  <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-medium">
                    {mockAssessmentResults.category}
                  </div>
                </div>

                {/* What This Means */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold mb-4">
                    What This Means for {formData.company}
                  </h3>
                  <div className="prose text-gray-700">
                    <p>
                      Your financial records are generally well-maintained but
                      need some attention in specific areas. With minor fixes,
                      your books will be ready for reliable monthly operations
                      and accurate financial reporting.
                    </p>

                    <h4 className="font-semibold mt-4 mb-2">Key Findings:</h4>
                    <ul className="space-y-2">
                      <li>
                        • Your bank matching is strong, ensuring accurate cash
                        tracking
                      </li>
                      <li>
                        • Some transactions need proper categorization for
                        clearer profit reports
                      </li>
                      <li>
                        • Customer balances need attention - this affects your
                        cash flow visibility
                      </li>
                      <li>
                        • Your control accounts are accurate, which is excellent
                        for financial integrity
                      </li>
                    </ul>

                    <h4 className="font-semibold mt-4 mb-2">
                      Recommended Next Steps:
                    </h4>
                    <ul className="space-y-2">
                      <li>
                        • Work with your bookkeeper to categorize uncategorized
                        transactions
                      </li>
                      <li>
                        • Review and resolve customer balance discrepancies
                      </li>
                      <li>
                        • Implement monthly book reviews to maintain this health
                        score
                      </li>
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
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center">
                          {getStatusIcon(pillar.status)}
                          <span className="ml-3 font-medium">
                            {pillar.name}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className={`h-2 rounded-full ${pillar.status === "good" ? "bg-green-500" : pillar.status === "warning" ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${pillar.score}%` }}
                            ></div>
                          </div>
                          <span
                            className={`font-semibold ${getScoreColor(pillar.score)}`}
                          >
                            {pillar.score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Technical/Bookkeeper View */}
            {viewMode === "technical" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold">
                    Technical Remediation Plan
                  </h2>
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
                    {mockAssessmentResults.criticalIssues.map(
                      (issue, index) => (
                        <div key={index} className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Problem
                              </h4>
                              <p className="text-sm text-gray-700">
                                {issue.problem}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Location in QBO
                              </h4>
                              <p className="text-sm text-blue-600 font-mono bg-blue-50 p-2 rounded">
                                {issue.location}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Fix Instructions
                              </h4>
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                {issue.fix}
                              </pre>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Est. Time
                              </h4>
                              <p className="text-sm text-gray-700">
                                {issue.time}
                              </p>
                              <span
                                className={`inline-block mt-2 px-2 py-1 text-xs rounded ${issue.priority === "High" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                              >
                                {issue.priority} Priority
                              </span>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Pillar Details */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Detailed Pillar Assessment
                  </h3>
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
                            <td
                              className={`py-3 font-semibold ${getScoreColor(pillar.score)}`}
                            >
                              {pillar.score}%
                            </td>
                            <td className="py-3">
                              {getStatusIcon(pillar.status)}
                            </td>
                            <td className="py-3 text-sm text-gray-600">
                              {pillar.status === "critical"
                                ? "3 critical issues"
                                : pillar.status === "warning"
                                  ? "2 minor issues"
                                  : "No issues"}
                            </td>
                            <td className="py-3 text-sm">
                              {pillar.status === "good"
                                ? "Monitor monthly"
                                : "Immediate attention needed"}
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

export default Assessment;
