import {
  OnboardingLead,
  binarySearchByKey,
  buildCountryVolumeSummary,
  countLeadsBySegment,
  filterByCriteria,
  linearSearchBy,
  monthlyVolumeForecastByCountry,
  sortByKey,
  validateOnboardingLead,
} from "./index";

const leads: OnboardingLead[] = [
  {
    fullName: "Ana Gomez",
    companyName: "Mercado Rayo",
    email: "ana@mercadorayo.com",
    country: "Mexico",
    phone: "+525512345678",
    monthlyVolume: 320,
  },
  {
    fullName: "Carlos Ruiz",
    companyName: "Envios Atlas",
    email: "carlos@atlas.es",
    country: "Espana",
    phone: "+34612345678",
    monthlyVolume: 5200,
  },
  {
    fullName: "Lucia Ortega",
    companyName: "Distribuciones Norte",
    email: "lucia@norte.mx",
    country: "Mexico",
    phone: "+525598887766",
    monthlyVolume: 1400,
  },
];

const validationResults = leads.map((lead) => ({
  companyName: lead.companyName,
  result: validateOnboardingLead(lead),
}));

const mexicoLeads = filterByCriteria(leads, { country: "Mexico" });
const sortedByVolume = sortByKey(leads, "monthlyVolume", "asc");
const sortedByCompanyName = sortByKey(leads, "companyName", "asc");
const luciaIndex = linearSearchBy(leads, (lead) => lead.fullName === "Lucia Ortega");
const atlasIndexInSorted = binarySearchByKey(
  sortedByCompanyName,
  "Envios Atlas",
  (lead) => lead.companyName,
  (left, right) => left.localeCompare(right),
);

const forecast = monthlyVolumeForecastByCountry(leads);
const summary = buildCountryVolumeSummary(leads);
const segmentCounts = countLeadsBySegment(leads);

console.log("Validation:", validationResults);
console.log("Mexico leads:", mexicoLeads);
console.log("Sorted by monthlyVolume:", sortedByVolume);
console.log("Sorted by companyName:", sortedByCompanyName);
console.log("Lucia index in original array:", luciaIndex);
console.log("Envios Atlas index in sorted array:", atlasIndexInSorted);
console.log("Forecast by country:", forecast);
console.log("Country summary:", summary);
console.log("Leads by segment:", segmentCounts);
