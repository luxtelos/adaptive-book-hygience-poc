import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { BarChartIcon, ClockIcon, PersonIcon, StarIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { CurrentView } from '../App'; // Import CurrentView from App.tsx

interface LandingPageProps {
  setCurrentView: (view: CurrentView) => void; // Use CurrentView
}

const LandingPage: React.FC<LandingPageProps> = ({ setCurrentView }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    {/* Header */}
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <BarChartIcon className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">FinanceAI</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">Pricing</a>
            
            <SignedOut>
              <SignInButton>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              <UserButton />
            </SignedIn>
          </nav>

          {/* Mobile menu */}
          <div className="md:hidden">
            <SignedOut>
              <SignInButton>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setCurrentView('agent-form')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </button>
                <UserButton />
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </header>

    {/* Hero Section */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Get Your <span className="text-blue-600">Financial Books</span> Health Score in Minutes
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Our AI-powered assessment analyzes your QuickBooks data across 5 critical pillars to identify issues, 
          provide actionable insights, and ensure your books are ready for growth.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <SignedOut>
            <SignInButton>
              <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center">
                Start Free Assessment <ArrowRightIcon className="w-5 h-5 ml-2" />
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <button 
              onClick={() => setCurrentView('agent-form')}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Start Free Assessment <ArrowRightIcon className="w-5 h-5 ml-2" />
            </button>
          </SignedIn>
          <button className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors">
            Watch Demo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">5,000+</div>
          <div className="text-gray-600">Books Analyzed</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">15 min</div>
          <div className="text-gray-600">Average Assessment Time</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">98%</div>
          <div className="text-gray-600">Issue Detection Accuracy</div>
        </div>
      </div>
    </section>

    {/* Features Section */}
    <section id="features" className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Our Assessment?</h2>
          <p className="text-xl text-gray-600">Comprehensive analysis designed for both business owners and bookkeepers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              {/* Removed ShieldIcon as it was commented out */}
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
            <p className="text-gray-600">Bank-level security with encrypted data processing</p>
          </div>

          <div className="text-center p-6">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Fast Results</h3>
            <p className="text-gray-600">Get comprehensive analysis in under 15 minutes</p>
          </div>

          <div className="text-center p-6">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <PersonIcon className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Dual Audience</h3>
            <p className="text-gray-600">Reports for both business owners and bookkeepers</p>
          </div>

          <div className="text-center p-6">
            <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <StarIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Actionable Insights</h3>
            <p className="text-gray-600">Step-by-step remediation plans with time estimates</p>
          </div>
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section id="how-it-works" className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600">Simple 3-step process to assess your financial books</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
            <h3 className="text-xl font-semibold mb-4">Connect Your Data</h3>
            <p className="text-gray-600">Link your QuickBooks Online account or upload Excel reports securely</p>
          </div>

          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
            <h3 className="text-xl font-semibold mb-4">AI Analysis</h3>
            <p className="text-gray-600">Our AI analyzes your data across 5 critical financial pillars</p>
          </div>

          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
            <h3 className="text-xl font-semibold mb-4">Get Results</h3>
            <p className="text-gray-600">Receive detailed reports with actionable remediation plans</p>
          </div>
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section className="bg-blue-600 py-20">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-white mb-6">Ready to Improve Your Financial Health?</h2>
        <p className="text-xl text-blue-100 mb-8">
          Join thousands of businesses who have optimized their bookkeeping with our AI assessment
        </p>
        <SignedOut>
          <SignInButton>
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors">
              Start Your Free Assessment Now
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <button 
            onClick={() => setCurrentView('agent-form')}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Start Your Free Assessment Now
          </button>
        </SignedIn>
      </div>
    </section>

    {/* Footer */}
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <BarChartIcon className="w-8 h-8 text-blue-400 mr-3" />
            <span className="text-2xl font-bold">FinanceAI</span>
          </div>
          <p className="text-gray-400">© 2025 FinanceAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
);

export default LandingPage;