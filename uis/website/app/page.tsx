"use client";

import { FormEvent, useState } from "react";

const initialForm = { fullName: "", companyName: "", email: "", country: "Mexico", phone: "", monthlyVolume: "" };

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top"><span className="brand-mark">TF</span> trackflow</a>
        <div className="nav-links"><a href="#operacion">Operacion</a><a href="#onboarding">Habla con el equipo</a></div>
        <a className="nav-cta" href="#onboarding">Empezar <span aria-hidden="true">-&gt;</span></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Logistica visible, desde el primer kilometro</p>
          <h1>Haz que cada entrega cuente.</h1>
          <p className="hero-lead">TrackFlow conecta tus pedidos con una operacion de ultima milla precisa, trazable y lista para crecer contigo.</p>
          <div className="hero-actions"><a className="button button-coral" href="#onboarding">Cuentalo a TrackFlow <span>↗</span></a><a className="text-link" href="#operacion">Ver como operamos <span>↓</span></a></div>
          <div className="proof"><span className="proof-icon">✓</span><span><strong>Mexico + Espana</strong><br />Una red pensada para tu siguiente etapa</span></div>
        </div>
        <div className="hero-visual" aria-label="Centro de operaciones de TrackFlow">
          <div className="route route-one" /><div className="route route-two" /><div className="map-pin pin-one">01</div><div className="map-pin pin-two">02</div><div className="map-pin pin-three">03</div>
          <div className="visual-card card-top"><span>EN RUTA</span><strong>2,840</strong><small>envios hoy</small></div>
          <div className="visual-card card-bottom"><span className="live-dot" /> Visibilidad en tiempo real</div>
          <div className="city-label label-one">CDMX <small>hub principal</small></div><div className="city-label label-two">MAD <small>cross-dock</small></div>
        </div>
      </section>

      <section className="metrics shell" id="operacion"><div><strong>01</strong><span>Recogida y<br />clasificacion</span></div><div><strong>02</strong><span>Almacenamiento<br />temporal</span></div><div><strong>03</strong><span>Entrega y<br />devoluciones</span></div><p>Una sola mirada<br /><em>para decidir mejor.</em></p></section>

      <section className="onboarding shell" id="onboarding">
        <div className="onboarding-intro"><p className="eyebrow">Tu operacion empieza aqui</p><h2>Cuanto mas sabemos,<br /><em>mejor te movemos.</em></h2><p>Comparte algunos datos de tu operacion. Nuestro equipo revisara el volumen y el pais para preparar el siguiente paso.</p><div className="field-note"><span>i</span><span>Solo trabajamos con operaciones activas en Mexico y Espana.</span></div></div>
        <form className="lead-form" onSubmit={submit}>
          <div className="form-heading"><span>01 — DATOS DE CONTACTO</span><small>* campos obligatorios</small></div>
          <label>Nombre completo *<input required minLength={3} value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} placeholder="Tu nombre" /></label>
          <label>Empresa *<input required value={form.companyName} onChange={(e) => setForm({...form, companyName: e.target.value})} placeholder="Nombre de tu empresa" /></label>
          <div className="form-grid"><label>Email corporativo *<input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="nombre@empresa.com" /></label><label>Pais de operacion *<select value={form.country} onChange={(e) => setForm({...form, country: e.target.value})}><option>Mexico</option><option>Espana</option></select></label></div>
          <div className="form-grid"><label>Telefono (+52 / +34) *<input required pattern="\\+(52|34)[0-9 ]{8,}" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+52 55 0000 0000" /></label><label>Envios mensuales estimados *<input required type="number" min="1" step="1" value={form.monthlyVolume} onChange={(e) => setForm({...form, monthlyVolume: e.target.value})} placeholder="Ej. 2500" /></label></div>
          <button className="button button-dark" type="submit">Enviar solicitud <span>↗</span></button>
          {sent && <p className="success" role="status">Solicitud recibida. El equipo de TrackFlow revisara tus datos.</p>}
        </form>
      </section>
      <footer className="footer shell"><a className="brand" href="#top"><span className="brand-mark">TF</span> trackflow</a><span>Ultima milla con criterio.</span><span>© 2026 TrackFlow</span></footer>
    </main>
  );
}
