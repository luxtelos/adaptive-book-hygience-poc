import React from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";

const EULA: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">End User License Agreement (EULA)</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. License Grant</h2>
              <p>
                Subject to the terms of this Agreement, we grant you a non-exclusive, non-transferable, 
                limited license to use our software and services for your internal business purposes 
                in accordance with the documentation and terms specified herein.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Restrictions</h2>
              <p>
                You may not: (a) reverse engineer, decompile, or disassemble the software; 
                (b) modify, adapt, or create derivative works; (c) distribute, sell, or lease 
                the software to third parties; or (d) use the software for any unlawful purpose.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Ownership</h2>
              <p>
                The software and all intellectual property rights therein are and shall remain 
                the exclusive property of the company and its licensors. No title or ownership 
                rights are transferred to you under this Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. User Responsibilities</h2>
              <p>
                You are responsible for: (a) maintaining the confidentiality of your account 
                credentials; (b) all activities that occur under your account; (c) ensuring 
                your use complies with applicable laws and regulations; and (d) backing up 
                your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Disclaimer of Warranties</h2>
              <p>
                THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
                INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
                PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Limitation of Liability</h2>
              <p>
                IN NO EVENT SHALL THE COMPANY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, 
                DATA, OR USE, REGARDLESS OF THE THEORY OF LIABILITY.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Termination</h2>
              <p>
                This Agreement may be terminated by either party with 30 days written notice. 
                Upon termination, you must cease all use of the software and destroy all copies 
                in your possession.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Governing Law</h2>
              <p>
                This Agreement shall be governed by and construed in accordance with the laws 
                of the jurisdiction in which the company is incorporated, without regard to 
                conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Information</h2>
              <p>
                For questions regarding this EULA, please contact us at legal@example.com 
                or through our official support channels.
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

export default EULA;