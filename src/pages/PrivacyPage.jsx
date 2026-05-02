import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Our FamilySync · Effective Date: April 19, 2026
        </p>
      </div>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">

        <section>
          <h2 className="font-heading font-bold text-base mb-2">1. Introduction</h2>
          <p>Zencora (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates Our FamilySync. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the App. We are committed to protecting your privacy and the privacy of your family members, including children.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">2. Information We Collect</h2>
          <p className="font-medium mb-1">Information you provide directly:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Account information: email address, password, display name</li>
            <li>Profile information: avatar photo, member color, role</li>
            <li>Family content: events, tasks, chores, check-in notes, shopping lists, family feed posts</li>
            <li>Payment information: processed securely by Stripe — we do not store card numbers</li>
          </ul>
          <p className="font-medium mb-1 mt-3">Information collected automatically:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Location data: GPS coordinates when you use check-in features</li>
            <li>Device information: browser type, operating system, IP address</li>
            <li>Usage data: features used, pages visited, timestamps of activity</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li>Provide and operate the App and its features</li>
            <li>Display location check-ins and family activity to members of your family group</li>
            <li>Send notifications and family alerts you have enabled</li>
            <li>Process subscription payments through Stripe</li>
            <li>Improve the App and troubleshoot issues</li>
            <li>Communicate important updates about the App or your account</li>
          </ul>
          <p className="mt-2">We do not sell your personal information. We do not use your data for advertising.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">4. Children&apos;s Privacy (COPPA Compliance)</h2>
          <p>We take the privacy of children seriously. Our FamilySync is designed as a family tool where adult household administrators manage the family account and are responsible for adding minor members.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li>We do not knowingly collect personal information directly from children under 13 without parental consent</li>
            <li>Children are added by their parent or legal guardian who controls the family account</li>
            <li>Information about minor members (name, location, activity) is only visible within the family group</li>
            <li>Minor members&apos; data is never shared with third parties or used for advertising</li>
            <li>Parents may review, update, or delete their child&apos;s information at any time by contacting legal@zencora.org</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">5. Location Data</h2>
          <p>Location data is collected only when you actively use the check-in feature. Location data is:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li>Shared only with members of your family group within the App</li>
            <li>Never sold or shared with advertisers or third-party data brokers</li>
            <li>Stored securely in our database and retained for up to 90 days for history purposes</li>
            <li>Controllable by you — you can stop sharing at any time by clearing your check-in</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">6. Data Sharing</h2>
          <p>We share your data only in the following limited circumstances:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li><span className="font-medium text-foreground">Within your family group:</span> Family content, check-ins, and activity are visible to all members of your household in the App</li>
            <li><span className="font-medium text-foreground">Service providers:</span> We use Supabase for database and authentication, Stripe for payments, and Netlify for hosting — all under strict data processing agreements</li>
            <li><span className="font-medium text-foreground">Legal requirements:</span> We may disclose data if required by law or to protect the safety of users</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">7. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data, including encrypted connections (SSL/TLS), secure authentication via Supabase, and row-level security policies that ensure users can only access their own family&apos;s data. However, no system is completely secure and we cannot guarantee absolute security.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">8. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. Check-in history is retained for up to 90 days. If you delete your account, your personal data and family content will be permanently removed within 30 days, except where retention is required by law.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">9. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate information through your profile settings</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent for location sharing at any time</li>
            <li>Request a copy of your data by contacting legal@zencora.org</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">10. Third-Party Services</h2>
          <p>Our FamilySync uses the following third-party services:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li><span className="font-medium text-foreground">Supabase:</span> Database, authentication, and file storage</li>
            <li><span className="font-medium text-foreground">Stripe:</span> Payment processing</li>
            <li><span className="font-medium text-foreground">Google Maps Platform:</span> Map display, location search, and geocoding</li>
            <li><span className="font-medium text-foreground">Netlify:</span> App hosting and deployment</li>
          </ul>
          <p className="mt-2">Each of these providers has their own privacy policy. We encourage you to review them.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify users of significant changes through the App or via email. Continued use of the App after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-base mb-2">12. Contact Us</h2>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data — including requests related to children&apos;s data — please contact us at:</p>
          <p className="mt-2 font-medium">legal@zencora.org</p>
          <p className="mt-1 text-muted-foreground">Zencora · Our FamilySync</p>
          <p className="mt-1 text-muted-foreground">Response time: within 5 business days</p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-border text-center">
        <p className="text-[11px] text-muted-foreground">© 2026 Zencora. All Rights Reserved.</p>
      </div>
    </div>
  );
}
