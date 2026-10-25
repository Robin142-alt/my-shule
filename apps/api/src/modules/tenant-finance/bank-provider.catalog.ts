export interface ProviderAssessment {
  checked_on: string;
  method: string;
  specification: 'public' | 'onboarding_required';
  implementation: 'not_implemented' | 'contract_tested';
  sandbox_verification: 'unavailable' | 'passed';
  live_verification: 'pending' | 'passed';
  onboarding: string;
  restriction: string;
  sources: string[];
}
const bank = (code:string,name:string,method:string,sources:string[],onboarding:string,restriction:string,specification:ProviderAssessment['specification']='onboarding_required') => ({
  code,name,channel_kinds:['bank_paybill','bank_account'],connection_modes:['statement'],credential_fields:[],
  description:'Reviewed statement reconciliation is available. Direct activation requires an implemented adapter and verified bank entitlement.',
  assessment:{checked_on:'2026-10-25',method,specification,implementation:'not_implemented',sandbox_verification:'unavailable',live_verification:'pending',onboarding,restriction,sources} as ProviderAssessment,
});

/** Product evidence is distinct from implemented or certified MyShule capability. */
export const BANK_PROVIDERS = [
  bank('equity','Equity Bank','Jenga REST account services and transaction queries',
    ['https://developer.jengahq.io/guides/get-started/developer-quickstart','https://developer.jengahq.io/guides/jenga-api/account-services/account-fullstatement'],
    'Authorized Jenga merchant, Equity account entitlement, API key, merchant code, consumer secret and registered RSA public key.',
    'Public contracts require merchant credentials. Account inquiry documentation repeats the UAT host for live; production endpoint and statement continuation semantics need confirmation.','public'),
  bank('kcb','Kenya Commercial Bank (KCB)','Buni APIs including instant payment notifications and account services',
    ['https://buni.kcbgroup.com/getting-started','https://buni.kcbgroup.com/faqs/'],
    'Buni application/API subscription and sandbox keys; KCB or VOOMA account and bank-approved production access.',
    'Obtain the subscribed account/IPN verification and authentication contract. Sandbox use is free; production transaction tariffs apply.'),
  bank('coop','Co-operative Bank of Kenya','Co-op Connect account APIs and B2B validation/notifications',
    ['https://developer.co-opbank.co.ke/','https://www.co-opbank.co.ke/corporate/corporates/'],
    'School account, Co-op Connect application/subscriptions and approved B2B integration mandate.',
    'Public catalog advertises statement, transaction and notification products; obtain exact subscribed protocol and callback trust requirements.'),
  bank('nbk','National Bank of Kenya (NBK)','Existing NBK channels; Access integration is phased',
    ['https://nationalbank.co.ke/about-us/newsroom/national-bank-and-access-bank-kenya-integration-update'],
    'NBK relationship manager must confirm the school account collection interface, mandate, credentials and technical specification.',
    'NBK is part of Access Bank. Existing accounts/channels continue during phased integration; neither KCB nor Access API compatibility is assumed.'),
  bank('family','Family Bank','Automated Collection Solution: validation and instant payment notifications',
    ['https://familybank.co.ke/family-bank/wp-content/uploads/2023/09/KEY-FACTS-DOCUMENT-TRANSACTIONAL-BANKING.pdf'],
    'Authorized Family Bank collection account and Automated Collection Solution onboarding through transactional banking.',
    'Bank-customer interface is documented as a product; endpoint, authentication, settlement and reversal schemas require the bank contract.'),
  bank('absa','Absa Bank Kenya','Absa Access host-to-host statement files; API Marketplace subject to Kenya entitlement',
    ['https://www.absabank.co.ke/corporate-and-investment/transactional-solutions-channels/','https://www.api.absa.africa/'],
    'Absa Kenya cash-management mandate and approved Access host connectivity, security keys and file specification.',
    'Kenya H2H is documented. Marketplace products must not be assumed Kenya-enabled; portal was under maintenance during research.'),
  bank('ncba','NCBA Bank','Instant Payment Notification Push Service and authorized collection integration',
    ['https://ke.ncbagroup.com/payment-solution/instant-payment-notification-push-service-api-integration/','https://ke.ncbagroup.com/wp-content/uploads/2020/02/Key-Facts-Document-Corporate.pdf'],
    'NCBA account and cash-management/IPN service agreement; obtain receiving-account binding and provider authentication specification.',
    'The public product page and key facts differ in description; obtain the exact inbound notification/verification contract before enabling automation.'),
  bank('im','I&M Bank','Payment API Gateway host-to-host and integrated collections',
    ['https://www.imbankgroup.com/ke/business-solutions/paymentapigateway/'],
    'Relationship-manager onboarding, authorized account, bank security tokens and agreed VPN or point-to-point connectivity.',
    'Public H2H details emphasize outbound payments and return-file reconciliation; inbound collection evidence and file formats need bank confirmation.'),
  bank('dtb','Diamond Trust Bank (DTB)','Astra account statements/notifications and Till Moja collections',
    ['https://partners.astraafrica.co.ke/','https://dtbk.dtbafrica.com/account/till-moja-collection-service'],
    'DTB account, approved Astra partner access or signed Till Moja forms and technical onboarding.',
    'Astra advertises account/query APIs; protocol documentation needs partner access. Till Moja advertises no signup charge; confirm ongoing tariffs.'),
  bank('stanbic','Stanbic Bank Kenya','Kenya API Connect IPN, mini-statements and transaction status',
    ['https://sandbox.stanbicbank.co.ke/product','https://sandbox.stanbicbank.co.ke/support'],
    'Developer application, subscribed IPN product, client credentials and bank-approved account mandate/production access.',
    'Account/IPN schemas show Get access; mini statements cover only the latest 20 transactions and are insufficient alone for complete backfill.'),
  bank('standard_chartered','Standard Chartered Bank Kenya','Straight2Bank APIs, Access H2H/SWIFT and statement reporting',
    ['https://www.sc.com/ke/business-channels/straight2bank/','https://www.sc.com/en/corporate-investment-banking/transaction-banking/straight2bank/','https://www.sc.com/en/support-centre/quick-links/'],
    'Kenya corporate account mandate, Straight2Bank implementation team and approved Open Banking Marketplace API/H2H specifications and security material.',
    'Products and file-format versions are contract/geography-specific. Reporting/collection entitlement, connectivity and tariffs require bank confirmation.'),
];
