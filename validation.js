// Validación del formulario de solicitud de información de TrackFlow.
// Campos, reglas y mensajes copiados de docs/briefings/01-web-fundamentals.es.md.

const COMMENTS_MAX = 500;

const MESSAGES = {
  companyName: "El nombre de la empresa debe tener al menos 2 caracteres",
  contactName: "Ingresa nombre y apellido del contacto",
  email: "Ingresa un email corporativo válido (ejemplo: nombre@empresa.com)",
  phone: "El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)",
  website: "Si incluyes sitio web, debe ser una URL válida",
  country: "Selecciona el país de operación principal",
  productType: "Selecciona el tipo de producto que manejas",
  monthlyVolume: "Selecciona el volumen mensual estimado",
  services: "Selecciona al menos un servicio de interés",
  current3pl: "Indica si actualmente trabajas con otro proveedor logístico",
  comments: (left) => `Los comentarios no pueden exceder 500 caracteres (quedan ${left})`,
  privacy: "Debes aceptar la política de privacidad para continuar",
};

const LOW_VOLUME_WARNING =
  "Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?";

// Each rule returns the error message, or "" when the value is valid.
const RULES = {
  companyName: (form) => (form.companyName.value.trim().length >= 2 ? "" : MESSAGES.companyName),
  contactName: (form) => (form.contactName.value.trim().split(/\s+/).filter((word) => word.length > 0).length >= 2 ? "" : MESSAGES.contactName),
  email: (form) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim()) ? "" : MESSAGES.email),
  phone: (form) => (/^\+\d{1,3}[\s-]?\d[\d\s-]{5,}$/.test(form.phone.value.trim()) ? "" : MESSAGES.phone),
  website: (form) => {
    const value = form.website.value.trim();
    if (!value) return "";
    if (!/^https?:\/\//i.test(value)) return MESSAGES.website;
    try {
      new URL(value);
      return "";
    } catch {
      return MESSAGES.website;
    }
  },
  country: (form) => (form.country.value ? "" : MESSAGES.country),
  productType: (form) => (form.productType.value ? "" : MESSAGES.productType),
  monthlyVolume: (form) => (form.monthlyVolume.value ? "" : MESSAGES.monthlyVolume),
  services: (form) => (form.querySelectorAll('input[name="services"]:checked').length > 0 ? "" : MESSAGES.services),
  current3pl: (form) => (form.querySelector('input[name="current3pl"]:checked') ? "" : MESSAGES.current3pl),
  comments: (form) => {
    const left = COMMENTS_MAX - form.comments.value.length;
    return left >= 0 ? "" : MESSAGES.comments(left);
  },
  privacy: (form) => (form.privacy.checked ? "" : MESSAGES.privacy),
};

function showError(form, field, message) {
  const error = document.getElementById(`${field}-error`);
  const controls = form.querySelectorAll(`[name="${field}"]`);
  error.textContent = message;
  error.classList.toggle("hidden", !message);
  controls.forEach((control) => {
    control.setAttribute("aria-invalid", message ? "true" : "false");
    if (control.type !== "checkbox" && control.type !== "radio") {
      control.classList.toggle("border-red-600", Boolean(message));
      control.classList.toggle("border-slate-300", !message);
    }
  });
}

function validateField(form, field) {
  const message = RULES[field](form);
  showError(form, field, message);
  return message === "";
}

function updateCommentsCounter(form) {
  const left = COMMENTS_MAX - form.comments.value.length;
  const counter = document.getElementById("comments-counter");
  counter.textContent = left >= 0 ? `${left} caracteres disponibles` : `${-left} caracteres de más`;
  counter.classList.toggle("text-red-700", left < 0);
}

function updateLowVolumeWarning(form) {
  const warning = document.getElementById("monthlyVolume-warning");
  const show = form.monthlyVolume.value === "0-100" && form.productType.value !== "";
  warning.textContent = show ? LOW_VOLUME_WARNING : "";
  warning.classList.toggle("hidden", !show);
}

function init() {
  const form = document.getElementById("lead-form");
  const success = document.getElementById("success");
  const touched = new Set();

  Object.keys(RULES).forEach((field) => {
    form.querySelectorAll(`[name="${field}"]`).forEach((control) => {
      const isChoice = control.type === "checkbox" || control.type === "radio" || control.tagName === "SELECT";
      // Real-time validation: on blur the first time, then on every change.
      control.addEventListener(isChoice ? "change" : "blur", () => {
        touched.add(field);
        validateField(form, field);
      });
      if (!isChoice) {
        control.addEventListener("input", () => {
          if (touched.has(field)) validateField(form, field);
        });
      }
    });
  });

  form.comments.addEventListener("input", () => updateCommentsCounter(form));
  form.monthlyVolume.addEventListener("change", () => updateLowVolumeWarning(form));
  form.productType.addEventListener("change", () => updateLowVolumeWarning(form));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = Object.keys(RULES);
    const results = fields.map((field) => validateField(form, field));
    fields.forEach((field) => touched.add(field));
    const firstInvalid = fields.find((_, index) => !results[index]);
    if (firstInvalid) {
      form.querySelector(`[name="${firstInvalid}"]`).focus();
      return;
    }
    if (form.monthlyVolume.value === "0-100" && !window.confirm(LOW_VOLUME_WARNING)) return;
    // Simulated submission: nothing is sent anywhere.
    form.classList.add("hidden");
    success.classList.remove("hidden");
    success.focus();
  });

  form.addEventListener("reset", () => {
    // Wait for the browser to clear the values, then clear every message.
    setTimeout(() => {
      touched.clear();
      Object.keys(RULES).forEach((field) => showError(form, field, ""));
      updateCommentsCounter(form);
      updateLowVolumeWarning(form);
    });
  });
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", init);
if (typeof module !== "undefined") module.exports = { RULES, MESSAGES, COMMENTS_MAX };
