import React from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";

const Privacy: React.FC = () => {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                BookKeeper Pro
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-gray-600 hover:text-gray-900">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <span className="text-gray-600">
                  Welcome, {user?.username}!
                </span>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </div>

      <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create an account, 
                use our services, or contact us for support. This may include your name, email address, 
                phone number, and business information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
              <p>
                We use the information we collect to provide, maintain, and improve our services, 
                process transactions, send you technical notices and support messages, and communicate 
                with you about products, services, and promotional offers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Information Sharing</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as described in this policy. We may share information with 
                trusted service providers who assist us in operating our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
              <p>
                You have the right to access, update, or delete your personal information. You may 
                also opt out of certain communications from us. Contact us if you wish to exercise 
                these rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at 
                privacy@example.com or through our support channels.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <div className="flex justify-center space-x-6 mb-4">
              <Link 
                to="/privacy" 
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/eula" 
                className="hover:text-white transition-colors"
              >
                EULA
              </Link>
            </div>
            <p>&copy; 2024 BookKeeper Pro. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;