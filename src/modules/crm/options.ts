export const OPPORTUNITY_TRACKS = ["RETAIL", "PROJECT"] as const;
export type OpportunityTrackValue = (typeof OPPORTUNITY_TRACKS)[number];

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DISQUALIFIED",
] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const CUSTOMER_TYPES = [
  "INDIVIDUAL",
  "COMPANY",
  "CONTRACTOR",
  "CONSULTANT",
  "GOVERNMENT",
  "OTHER",
] as const;
export type CustomerTypeValue = (typeof CUSTOMER_TYPES)[number];

export const OPPORTUNITY_STAGES = [
  "NEW_ENQUIRY",
  "CONTACTED",
  "QUALIFIED",
  "PREPARATION",
  "QUOTATION",
  "NEGOTIATION",
  "DEPOSIT_PENDING",
  "LOST",
  "ON_HOLD",
  "CANCELLED",
] as const;
export type OpportunityStageValue = (typeof OPPORTUNITY_STAGES)[number];

export const ACTIVITY_TYPES = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "WHATSAPP",
  "FOLLOW_UP",
  "STATUS_CHANGE",
] as const;
export type ActivityTypeValue = (typeof ACTIVITY_TYPES)[number];

export const RETAIL_LEAD_SOURCES = [
  "Walk-in",
  "Referral",
  "Website",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Existing customer",
  "Campaign",
  "Other",
] as const;

export const RETAIL_CHANNELS = [
  "Showroom",
  "Phone",
  "WhatsApp",
  "Email",
  "Website Form",
  "Social Media",
] as const;

export const RETAIL_INTEREST_CATEGORIES = [
  "Kitchen",
  "Wardrobe",
  "Appliances",
  "Worktop",
  "Accessories",
  "Full Package",
  "Not Decided",
] as const;

export const RETAIL_BUDGET_RANGES = [
  "Not Known",
  "Below 50k",
  "50k–100k",
  "100k–200k",
  "200k+",
] as const;

export const BRANCH_OPTIONS = [
  "Abu Dhabi Showroom",
  "Dubai / Remote",
  "Client Site",
  "Other",
] as const;

export const PROJECT_CLIENT_TYPES = [
  "Individual Villa Owner",
  "Developer",
  "Contractor",
  "Consultant",
  "Interior Designer",
  "Government / Semi-government",
  "Company",
] as const;

export const PROJECT_TYPES = [
  "Villa",
  "Residential Building",
  "Showroom",
  "Commercial Project",
  "Multi-unit Project",
  "Renovation",
  "Mockup / Sample",
] as const;

export const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
  "Al Ain",
] as const;

export const BOQ_STATUSES = [
  "Not Received",
  "Received",
  "Incomplete",
  "Needs Clarification",
  "Approved for Pricing",
] as const;

export const DESIGN_STATUSES = [
  "Not Required Yet",
  "Design Required",
  "Design In Progress",
  "Design Submitted",
  "Revision Required",
  "Approved",
] as const;

export const MEASUREMENT_STATUSES = [
  "Not Required",
  "Required",
  "Scheduled",
  "Completed",
  "Re-measurement Required",
] as const;
