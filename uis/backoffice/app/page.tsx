import Link from "next/link";

type Country = "united_states" | "spain" | "both" | "other";
type MonthlyVolume = "0-100" | "101-500" | "501-2000" | "2000+" | "unsure";
type Account = { companyName: string; contactName: string; country: Country; productType: "fashion" | "electronics" | "cosmetics" | "food" | "other"; monthlyVolume: MonthlyVolume; status: "Nuevo" | "En revision" | "Contactado" };

// Sample brand signups using the official form vocabulary (docs/briefings/01-web-fundamentals.es.md).
const accounts: Account[] = [
  { companyName: "PureStep Footwear", contactName: "Emily Carter", country: "united_states", productType: "fashion", monthlyVolume: "2000+", status: "Nuevo" },
  { companyName: "Lumina Cosmetics", contactName: "Lucía Martín", country: "spain", productType: "cosmetics", monthlyVolume: "501-2000", status: "En revision" },
  { companyName: "VoltGear", contactName: "Daniel Brooks", country: "both", productType: "electronics", monthlyVolume: "501-2000", status: "Contactado" },
  { companyName: "Moda Ebro", contactName: "Pablo Gil", country: "spain", productType: "fashion", monthlyVolume: "0-100", status: "Nuevo" },
];

const COUNTRY_LABEL: Record<Country, string> = { united_states: "Estados Unidos", spain: "España", both: "Ambos", other: "Otro" };
const VOLUME_LABEL: Record<MonthlyVolume, string> = { "0-100": "0-100", "101-500": "101-500", "501-2000": "501-2000", "2000+": "2000+", unsure: "No estoy seguro" };

function segment(volume: MonthlyVolume) {
  if (volume === "2000+") return "Enterprise";
  if (volume === "501-2000") return "Mid-market";
  return "Small";
}

export default function Home() {
  const byCountry = (country: Country) => accounts.filter((account) => account.country === country || account.country === "both").length;
  const us = byCountry("united_states");
  const es = byCountry("spain");
  const enterprise = accounts.filter((account) => segment(account.monthlyVolume) === "Enterprise").length;
  return <>
    <section className="intro-row"><div><h2>Resumen de onboarding</h2><p>Prioriza las cuentas que pueden mover mas volumen este mes.</p></div><Link className="primary-button" href="/">+ Nueva solicitud</Link></section>
    <section className="stats" id="metricas"><article><span>Solicitudes abiertas</span><strong>12</strong><small className="up">↑ 18% <i>vs. mes anterior</i></small></article><article><span>Marcas 501+ envíos/mes</span><strong>{accounts.filter((account) => segment(account.monthlyVolume) !== "Small").length}</strong><small className="up">de {accounts.length} <i>solicitudes de ejemplo</i></small></article><article><span>Conversion de onboarding</span><strong>68.4%</strong><small className="neutral">Objetivo: 70% <i>casi en objetivo</i></small></article></section>
    <section className="queue" id="solicitudes"><div className="section-heading"><div><h2>Cola de solicitudes</h2><p>Actualizada hace 8 minutos</p></div><button className="filter-button">Filtrar <span>⌄</span></button></div><div className="table-wrap"><table><thead><tr><th>CUENTA</th><th>CONTACTO</th><th>PAÍS</th><th>VOLUMEN / MES</th><th>SEGMENTO</th><th>ESTADO</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.companyName}><td><strong>{account.companyName}</strong></td><td>{account.contactName}</td><td><span className="country-dot" />{COUNTRY_LABEL[account.country]}</td><td className="volume">{VOLUME_LABEL[account.monthlyVolume]}</td><td><span className={`segment ${segment(account.monthlyVolume).toLowerCase()}`}>{segment(account.monthlyVolume)}</span></td><td><span className={`status ${account.status.toLowerCase().replace(" ", "-")}`}>{account.status}</span></td></tr>)}</tbody></table></div></section>
    <section className="bottom-grid"><div className="insight"><span className="insight-icon">↗</span><div><p className="kicker">LECTURA OPERATIVA</p><h3><em>{enterprise}</em> marca con más de 2000 envíos al mes.</h3><p>PureStep Footwear opera en Estados Unidos: revisa su solicitud antes de las 14:00.</p></div></div><div className="country-card"><div><p className="kicker">SOLICITUDES POR PAÍS</p><div className="country-line"><span>Estados Unidos</span><strong>{us}</strong></div><div className="bar"><i style={{width:`${Math.round((us / (us + es)) * 100)}%`}} /></div><div className="country-line"><span>España</span><strong>{es}</strong></div><div className="bar"><i style={{width:`${Math.round((es / (us + es)) * 100)}%`}} /></div></div></div></section>
  </>;
}
