export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalContent = {
  title: string;
  version: string;
  displayVersion: string;
  lastUpdated: string;
  description: string;
  summary: string;
  sections: LegalSection[];
};

export const termsContent: LegalContent = {
  title: "Terms of Service",
  version: "2026-05-terms-v1",
  displayVersion: "v1.0",
  lastUpdated: "May 31, 2026",
  description:
    "These terms describe how LendFolio accounts, borrower profiles, applications, offers, and platform management tools may be used.",
  summary:
    "You agree to provide accurate information, protect your account, and use LendFolio only for legitimate financing activity. Borrowers can submit loan applications and repayment proof. Approved lenders and managers may review relevant workflow information.",
  sections: [
    {
      heading: "Key points",
      paragraphs: [
        "LendFolio provides account, borrower profile, loan application, offer review, and platform management tools for the financing workflow.",
        "Users are responsible for keeping submitted information accurate, protecting account access, and using the platform only for legitimate financing activity.",
      ],
    },
    {
      heading: "Account use",
      paragraphs: [
        "You must provide truthful information when creating your account and keep your login credentials secure.",
        "Each account is personal and may not be shared or transferred without platform approval.",
      ],
    },
    {
      heading: "Borrower profiles and loan applications",
      paragraphs: [
        "Borrowers should save a business profile before submitting a loan application.",
        "Borrower verification and required consents may gate loan application readiness.",
        "Loan applications use the current submitted and open flow managed by the platform.",
      ],
    },
    {
      heading: "Lender review and offers",
      paragraphs: [
        "Lenders may review applications and send offers only after platform approval.",
        "Borrowers may accept one pending offer for an application.",
        "Accepting an offer closes other pending offers for that application to keep the process clear.",
      ],
    },
    {
      heading: "Repayments and proof of payment",
      paragraphs: [
        "Active loan and repayment workflows must preserve auditability.",
        "Borrowers may upload repayment proof for lender verification.",
        "Important workflow transitions are protected server-side and by database policies.",
      ],
    },
    {
      heading: "Platform management",
      paragraphs: [
        "Managers may review lender applications, borrower verifications, and platform activity to maintain a safe and trustworthy environment.",
        "The platform may restrict or revoke access if usage violates these terms.",
      ],
    },
    {
      heading: "User responsibilities",
      paragraphs: [
        "Do not submit false or misleading information.",
        "Do not attempt to bypass verification, consent, or workflow controls.",
        "Report suspected misuse to the platform team.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "If you have questions about these terms, contact the LendFolio support team through the channels provided on the platform.",
      ],
    },
  ],
};

export const privacyContent: LegalContent = {
  title: "Privacy Notice",
  version: "2026-05-privacy-v1",
  displayVersion: "v1.0",
  lastUpdated: "May 31, 2026",
  description:
    "This notice explains how LendFolio handles account, profile, verification, application, offer, and repayment information.",
  summary:
    "LendFolio uses submitted account, profile, application, offer, document, and repayment information to operate the financing workflow and support platform review.",
  sections: [
    {
      heading: "Key points",
      paragraphs: [
        "LendFolio uses account, profile, application, offer, verification, and workflow information to operate the financing process.",
        "The platform limits workspace access by role and lender approval status.",
        "Required consent records are stored with the accepted version and basic request metadata.",
      ],
    },
    {
      heading: "Information collected",
      paragraphs: [
        "Account details such as display name, email, and role.",
        "Borrower business profile data and verification documents.",
        "Loan applications, offers, repayment records, and proof uploads.",
      ],
    },
    {
      heading: "How information is used",
      paragraphs: [
        "To operate account access, borrower review, lender review, and application decisions.",
        "To support workflow transitions, audit logging, and platform management.",
        "To enforce role-based access and lender approval requirements.",
      ],
    },
    {
      heading: "Who can access workflow data",
      paragraphs: [
        "Borrowers can view their own profiles, applications, offers, loans, and repayment records.",
        "Approved lenders can view applications and offers relevant to their activity.",
        "Managers can view platform-wide workflow data for review and operations support.",
      ],
    },
    {
      heading: "Document and proof uploads",
      paragraphs: [
        "Verification documents and repayment proof are stored securely and scoped by user role and ownership.",
        "Private file access is limited to the user who uploaded the file and authorized reviewers.",
      ],
    },
    {
      heading: "Retention and account review",
      paragraphs: [
        "Consent records, audit logs, and workflow history are retained to support platform accountability.",
        "Users should submit only information needed for account access, borrower review, lender review, and application decisions.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "If you have questions about this notice, contact the LendFolio support team through the channels provided on the platform.",
      ],
    },
  ],
};
