import React from 'react';
import { FileText, User, Building, ArrowRight } from 'lucide-react';

const AgentForm = ({ setCurrentView, formData, handleInputChange, handleFormSubmit }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold text-gray-900">Financial Books Assessment</h1>
          <button 
            onClick={() => setCurrentView('landing')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>

    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Let's Get Started</h2>
          <p className="text-lg text-gray-600">
            Help us understand your business so we can provide the most relevant assessment and recommendations.
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Business Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select business type</option>
                  <option value="retail">Retail</option>
                  <option value="services">Services</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="restaurant">Restaurant/Food Service</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="consulting">Consulting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Revenue Range</label>
                <select
                  name="monthlyRevenue"
                  value={formData.monthlyRevenue}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select range</option>
                  <option value="under-10k">Under $10,000</option>
                  <option value="10k-50k">$10,000 - $50,000</option>
                  <option value="50k-100k">$50,000 - $100,000</option>
                  <option value="100k-500k">$100,000 - $500,000</option>
                  <option value="over-500k">Over $500,000</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Accounting Software</label>
                <select
                  name="currentSoftware"
                  value={formData.currentSoftware}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select software</option>
                  <option value="quickbooks-online">QuickBooks Online</option>
                  <option value="quickbooks-desktop">QuickBooks Desktop</option>
                  <option value="xero">Xero</option>
                  <option value="excel">Excel/Spreadsheets</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Assessment Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Assessment Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What are your biggest bookkeeping challenges?
                </label>
                <textarea
                  name="bookkeepingChallenges"
                  value={formData.bookkeepingChallenges}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Reconciling bank accounts, categorizing transactions, managing inventory..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How urgent is this assessment?</label>
                <select
                  name="urgencyLevel"
                  value={formData.urgencyLevel}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select urgency level</option>
                  <option value="immediate">Immediate - Need results within 24 hours</option>
                  <option value="this-week">This week - Planning for upcoming decisions</option>
                  <option value="this-month">This month - General health check</option>
                  <option value="planning">Planning - Future consideration</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="button"
              onClick={handleFormSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Continue to Assessment <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <p className="text-sm text-gray-600 mt-2 text-center">
              This information helps us provide more accurate recommendations tailored to your business.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AgentForm;