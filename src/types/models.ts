export type Country = "Mexico" | "Espana";

export type AccountSegment = "Small" | "Mid-market" | "Enterprise";

export interface OnboardingLead {
  fullName: string;
  companyName: string;
  email: string;
  country: Country;
  phone: string;
  monthlyVolume: number;
}

export interface OnboardingTimeline {
  registeredAt: Date;
  activatedAt: Date;
}

export interface ValidationError {
  field: keyof OnboardingLead | "general";
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface CountryVolumeSummary {
  country: Country;
  totalMonthlyVolume: number;
  totalLeads: number;
  averageMonthlyVolume: number;
}

export function getAccountSegment(monthlyVolume: number): AccountSegment {
  if (monthlyVolume >= 5000) {
    return "Enterprise";
  }

  if (monthlyVolume >= 500) {
    return "Mid-market";
  }

  return "Small";
}

export function createOnboardingLead(data: OnboardingLead): OnboardingLead {
  return { ...data };
}
