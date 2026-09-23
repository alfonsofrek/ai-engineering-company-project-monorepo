import Link from "next/link";

type Account = { companyName: string; fullName: string; country: "Mexico" | "Espana"; monthlyVolume: number; status: "Nuevo" | "En revision" | "Contactado" };

const accounts: Account[] = [
  { companyName: "Casa Norte Retail", fullName: "Mariana Lopez", country: "Mexico", monthlyVolume: 6800, status: "Nuevo" },
  { companyName: "Hogar Vivo", fullName: "Javier Martin", country: "Espana", monthlyVolume: 3200, status: "En revision" },
  { companyName: "Mercado Uno", fullName: "Sofia Hernandez", country: "Mexico", monthlyVolume: 740, status: "Contactado" },
  { companyName: "Nexo Distribucion", fullName: "Diego Ruiz", country: "Espana", monthlyVolume: 180, status: "Nuevo" },
];

function segment(volume: number) {
  if (volume >= 5000) return "Enterprise";
  if (volume >= 500) return "Mid-market";
  return "Small";
}

export default function Home() {
  const total = accounts.reduce((sum, account) => sum + account.monthlyVolume, 0);
  return <>
    <header className="topbar"><div><p className="kicker">JUEVES, 17 SEPTIEMBRE 2026</p><h1>Buenos dias, equipo.</h1></div><button className="icon-button" aria-label="Notificaciones">◌<span /></button></header>
    <section className="intro-row"><div><h2>Resumen de onboarding</h2><p>Prioriza las cuentas que pueden mover mas volumen este mes.</p></div><Link className="primary-button" href="/">+ Nueva solicitud</Link></section>
    <section className="stats" id="metricas"><article><span>Solicitudes abiertas</span><strong>12</strong><small className="up">↑ 18% <i>vs. mes anterior</i></small></article><article><span>Volumen mensual previsto</span><strong>{total.toLocaleString("es-MX")}</strong><small className="up">↑ 24% <i>envios estimados</i></small></article><article><span>Conversion de onboarding</span><strong>68.4%</strong><small className="neutral">Objetivo: 70% <i>casi en objetivo</i></small></article></section>
    <section className="queue" id="solicitudes"><div className="section-heading"><div><h2>Cola de solicitudes</h2><p>Actualizada hace 8 minutos</p></div><button className="filter-button">Filtrar <span>⌄</span></button></div><div className="table-wrap"><table><thead><tr><th>CUENTA</th><th>CONTACTO</th><th>PAIS</th><th>VOLUMEN / MES</th><th>SEGMENTO</th><th>ESTADO</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.companyName}><td><strong>{account.companyName}</strong></td><td>{account.fullName}</td><td><span className="country-dot" />{account.country}</td><td className="volume">{account.monthlyVolume.toLocaleString("es-MX")}</td><td><span className={`segment ${segment(account.monthlyVolume).toLowerCase()}`}>{segment(account.monthlyVolume)}</span></td><td><span className={`status ${account.status.toLowerCase().replace(" ", "-")}`}>{account.status}</span></td></tr>)}</tbody></table></div></section>
    <section className="bottom-grid"><div className="insight"><span className="insight-icon">↗</span><div><p className="kicker">LECTURA OPERATIVA</p><h3>Enterprise concentra el <em>65%</em> del volumen previsto.</h3><p>Las cuentas de mayor potencial estan en Mexico. Revisa Casa Norte Retail antes de las 14:00.</p></div></div><div className="country-card"><div><p className="kicker">VOLUMEN POR PAIS</p><div className="country-line"><span>Mexico</span><strong>7,540</strong></div><div className="bar"><i style={{width:"69%"}} /></div><div className="country-line"><span>Espana</span><strong>3,380</strong></div><div className="bar"><i style={{width:"31%"}} /></div></div></div></section>
  </>;
}
