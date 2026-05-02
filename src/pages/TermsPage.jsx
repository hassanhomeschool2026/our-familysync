import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen px-5 py-8 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-8">
        <h1 className="font-heading text-2xl font-extrabold text-foreground mb-1">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground">
          Our FamilySync · Effective Date: April 19, 2026
        </p>
      </div>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">

        <section>
          <h2 className="font-heading font-bold text-base mb-2">1. Acceptance of Terms</h2>
          <p>By creating an account or using Our FamilySync ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App. These Terms apply to all users, including household administrators and family members of all ages.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">2. Description of Service</h2>
          <p>Our FamilySync is a family coordination and organization platform developed by Zencora. It provides features including shared calendars, task and chore management, family check-ins with location sharing, shopping lists, family activity feeds, and household member management. The App is intended for use by family households.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">3. Accounts and Eligibility</h2>
          <p>To create an account, you must be at least 18 years of age. Children under the age of 18 may use the App only as family members added by a parent or legal guardian who serves as the household administrator. The adult administrator is responsible for all activity within their family account, including activity by minor members.</p>
          <p className="mt-2">You agree to provide accurate, current, and complete information during registration and to keep your account credentials secure. You are responsible for all activity that occurs under your account.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">4. Children&apos;s Privacy (COPPA)</h2>
          <p>Our FamilySync complies with the Children&apos;s Online Privacy Protection Act (COPPA). We do not knowingly collect personal information directly from children under the age of 13 without verifiable parental consent. Children are added to the App by their parent or guardian, who controls and manages their family account. Location data, names, and activity information for minor members are only visible within the family group and are not shared with third parties. Parents may request deletion of their child&apos;s data at any time by contacting us at legal@zencora.org.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">5. Location Data</h2>
          <p>Our FamilySync uses location services for family check-ins. Location data is shared only within your family group and is never sold or shared with third parties. Location is only collected when you actively use the check-in feature. You may disable location sharing at any time through your device settings.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">6. Subscription and Payments</h2>
          <p>Our FamilySync offers a free plan and a Premium plan. Premium subscriptions are billed at $5.99/month or $45.99/year and are processed securely through Stripe. Subscriptions automatically renew until cancelled. You may cancel at any time through your account settings. Refunds are handled on a case-by-case basis — please contact legal@zencora.org for refund requests. Zencora reserves the right to change pricing with reasonable advance notice.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">7. Acceptable Use</h2>
          <p>You agree not to use the App to harass, harm, or threaten any person; to distribute spam, malware, or harmful content; to attempt to gain unauthorized access to other accounts or systems; or to use the App for any unlawful purpose. Zencora reserves the right to suspend or terminate accounts that violate these Terms.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">8. Intellectual Property</h2>
          <p>All content, branding, and technology within Our FamilySync, including the name, logo, design, and code, are the property of Zencora and are protected by applicable intellectual property laws. You may not copy, modify, or distribute any part of the App without written permission from Zencora.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">9. Disclaimer of Warranties</h2>
          <p>The App is provided "as is" without warranties of any kind. Zencora does not guarantee that the App will be uninterrupted, error-free, or completely secure. We are not responsible for any loss of data or damages resulting from your use of the App.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">10. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, Zencora shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App, including but not limited to loss of data, loss of revenue, or personal injury.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">11. Changes to Terms</h2>
          <p>Zencora reserves the right to update these Terms at any time. We will notify users of material changes through the App or via email. Continued use of the App after changes constitutes acceptance of the revised Terms.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">12. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of Texas, without regard to conflict of law principles.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">13. Contact</h2>
          <p>For questions about these Terms, please contact us at:</p>
          <p className="mt-1 font-medium">legal@zencora.org</p>
          <p className="mt-1 text-muted-foreground">Zencora · Our FamilySync</p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-border text-center">
        <p className="text-[11px] text-muted-foreground">© 2026 Zencora. All Rights Reserved.</p>
      </div>
    </div>
  );
}
