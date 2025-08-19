import React from "react";

interface EulaContentProps {
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

const EulaContent: React.FC<EulaContentProps> = ({ 
  headingLevel = 'h3', 
  className = "space-y-6 text-gray-700" 
}) => {
  const HeadingComponent = headingLevel;
  const headingClasses = headingLevel === 'h2' 
    ? "text-xl font-semibold text-gray-900 mb-3"
    : "text-xl font-semibold text-gray-900 mb-3";

  return (
    <div className={className}>
      <section>
        <HeadingComponent className={headingClasses}>
          1. License Grant
        </HeadingComponent>
        <p>
          Subject to the terms of this Agreement, we grant you a non-exclusive, non-transferable, 
          limited license to use our software and services for your internal business purposes 
          in accordance with the documentation and terms specified herein.
        </p>
      </section>

      <section>
        <HeadingComponent className={headingClasses}>
          2. Restrictions
        </HeadingComponent>
        <p>
          You may not: (a) reverse engineer, decompile, or disassemble the software; 
          (b) modify, adapt, or create derivative works; (c) distribute, sell, or lease 
          the software to third parties; or (d) use the software for any unlawful purpose.
        </p>
      </section>

      <section>
        <HeadingComponent className={headingClasses}>
          3. Ownership
        </HeadingComponent>
        <p>
          The software and all intellectual property rights therein are and shall remain 
          the exclusive property of the company and its licensors. No title or ownership 
          rights are transferred to you under this Agreement.
        </p>
      </section>

      <section>
        <HeadingComponent className={headingClasses}>
          4. User Responsibilities
        </HeadingComponent>
        <p>
          You are responsible for: (a) maintaining the confidentiality of your account 
          credentials; (b) all activities that occur under your account; (c) ensuring 
          your use complies with applicable laws and regulations; and (d) backing up 
          your data.
        </p>
      </section>

      <section>
        <HeadingComponent className={headingClasses}>
          5. Disclaimer of Warranties
        </HeadingComponent>
        <p>
          THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
          INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
          PURPOSE, AND NON-INFRINGEMENT.
        </p>
      </section>

      <section>
        <HeadingComponent className={headingClasses}>
          6. Limitation of Liability
        </HeadingComponent>
        <p>
          IN NO EVENT SHALL THE COMPANY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, 
          DATA, OR USE, REGARDLESS OF THE THEORY OF LIABILITY.
        </p>
      </section>

      <section>
        <HeadingComponent className={headingClasses}>
          7. Termination
        </HeadingComponent>
        <p>
          This Agreement may be terminated by either party with 30 days written notice. 
          Upon termination, you must cease all use of the software and destroy all copies 
          in your possession.
        </p>
      </section>

      <section>
        <HeadingComponent className={headingClasses}>
          8. Governing Law
        </HeadingComponent>
        <p>
          This Agreement shall be governed by and construed in accordance with the laws 
          of the jurisdiction in which the company is incorporated, without regard to 
          conflict of law principles.
        </p>
      </section>

      <section>
        <HeadingComponent className={headingClasses}>
          Contact Information
        </HeadingComponent>
        <p>
          For questions regarding this EULA, please contact us at legal@example.com 
          or through our official support channels.
        </p>
      </section>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default EulaContent;