import {
  Country,
  OnboardingLead,
  OnboardingTimeline,
  ValidationError,
  ValidationResult,
} from "../types/models";

const VALID_COUNTRIES: Country[] = ["Mexico", "Espana"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MEXICO_PHONE_PATTERN = /^\+52\d{10}$/;
const SPAIN_PHONE_PATTERN = /^\+34\d{9}$/;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateRequiredFields(lead: Partial<OnboardingLead>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!hasText(lead.fullName)) {
    errors.push({ field: "fullName", message: "fullName es obligatorio" });
  }

  if (!hasText(lead.companyName)) {
    errors.push({ field: "companyName", message: "companyName es obligatorio" });
  }

  if (!hasText(lead.email)) {
    errors.push({ field: "email", message: "email es obligatorio" });
  }

  if (!hasText(lead.country)) {
    errors.push({ field: "country", message: "country es obligatorio" });
  }

  if (!hasText(lead.phone)) {
    errors.push({ field: "phone", message: "phone es obligatorio" });
  }

  if (lead.monthlyVolume === undefined || lead.monthlyVolume === null) {
    errors.push({ field: "monthlyVolume", message: "monthlyVolume es obligatorio" });
  }

  return errors;
}

export function validateFullName(fullName: string): ValidationError[] {
  if (fullName.trim().length >= 3) {
    return [];
  }

  return [{ field: "fullName", message: "fullName debe tener al menos 3 caracteres" }];
}

export function validateEmail(email: string): ValidationError[] {
  if (EMAIL_PATTERN.test(email)) {
    return [];
  }

  return [{ field: "email", message: "email debe tener un formato valido" }];
}

export function validateCountry(country: string): ValidationError[] {
  if (VALID_COUNTRIES.includes(country as Country)) {
    return [];
  }

  return [{ field: "country", message: "country solo admite Mexico o Espana" }];
}

export function validatePhone(phone: string): ValidationError[] {
  if (MEXICO_PHONE_PATTERN.test(phone) || SPAIN_PHONE_PATTERN.test(phone)) {
    return [];
  }

  return [{ field: "phone", message: "phone debe usar prefijo +52 o +34 con formato valido" }];
}

export function validateMonthlyVolume(monthlyVolume: number): ValidationError[] {
  if (Number.isInteger(monthlyVolume) && monthlyVolume > 0) {
    return [];
  }

  return [{ field: "monthlyVolume", message: "monthlyVolume debe ser un entero mayor que 0" }];
}

export function validateOnboardingLead(lead: Partial<OnboardingLead>): ValidationResult {
  const errors: ValidationError[] = [];
  errors.push(...validateRequiredFields(lead));

  if (hasText(lead.fullName)) {
    errors.push(...validateFullName(lead.fullName));
  }

  if (hasText(lead.email)) {
    errors.push(...validateEmail(lead.email));
  }

  if (hasText(lead.country)) {
    errors.push(...validateCountry(lead.country));
  }

  if (hasText(lead.phone)) {
    errors.push(...validatePhone(lead.phone));
  }

  if (typeof lead.monthlyVolume === "number") {
    errors.push(...validateMonthlyVolume(lead.monthlyVolume));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateOnboardingTimeline(timeline: OnboardingTimeline): ValidationResult {
  if (timeline.activatedAt.getTime() >= timeline.registeredAt.getTime()) {
    return { isValid: true, errors: [] };
  }

  return {
    isValid: false,
    errors: [
      {
        field: "general",
        message: "activatedAt no puede ser anterior a registeredAt",
      },
    ],
  };
}
