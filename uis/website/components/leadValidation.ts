// Brand signup form rules and messages, from docs/briefings/01-web-fundamentals.es.md.

export const COMMENTS_MAX = 500;

export const LOW_VOLUME_WARNING =
  "Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?";

export type LeadValues = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  productType: string;
  monthlyVolume: string;
  services: string[];
  current3pl: string;
  comments: string;
  privacy: boolean;
};

export type LeadField = keyof LeadValues;

export const EMPTY_LEAD: LeadValues = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  country: "",
  productType: "",
  monthlyVolume: "",
  services: [],
  current3pl: "",
  comments: "",
  privacy: false,
};

function isUrl(value: string) {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Returns the error message for one field, or "" when it is valid. */
export function validateLeadField(field: LeadField, values: LeadValues): string {
  switch (field) {
    case "companyName":
      return values.companyName.trim().length >= 2 ? "" : "El nombre de la empresa debe tener al menos 2 caracteres";
    case "contactName":
      return values.contactName.trim().split(/\s+/).filter(Boolean).length >= 2 ? "" : "Ingresa nombre y apellido del contacto";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim()) ? "" : "Ingresa un email corporativo válido (ejemplo: nombre@empresa.com)";
    case "phone":
      return /^\+\d{1,3}[\s-]?\d[\d\s-]{5,}$/.test(values.phone.trim()) ? "" : "El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)";
    case "website":
      return !values.website.trim() || isUrl(values.website.trim()) ? "" : "Si incluyes sitio web, debe ser una URL válida";
    case "country":
      return values.country ? "" : "Selecciona el país de operación principal";
    case "productType":
      return values.productType ? "" : "Selecciona el tipo de producto que manejas";
    case "monthlyVolume":
      return values.monthlyVolume ? "" : "Selecciona el volumen mensual estimado";
    case "services":
      return values.services.length > 0 ? "" : "Selecciona al menos un servicio de interés";
    case "current3pl":
      return values.current3pl ? "" : "Indica si actualmente trabajas con otro proveedor logístico";
    case "comments": {
      const left = COMMENTS_MAX - values.comments.length;
      return left >= 0 ? "" : `Los comentarios no pueden exceder 500 caracteres (quedan ${left})`;
    }
    case "privacy":
      return values.privacy ? "" : "Debes aceptar la política de privacidad para continuar";
  }
}

export const LEAD_FIELDS = Object.keys(EMPTY_LEAD) as LeadField[];

export function validateLead(values: LeadValues): Partial<Record<LeadField, string>> {
  const errors: Partial<Record<LeadField, string>> = {};
  for (const field of LEAD_FIELDS) {
    const message = validateLeadField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}
