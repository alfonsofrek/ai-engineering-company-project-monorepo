import { Brand } from "../components/Brand";
import { LeadForm } from "../components/LeadForm";

// Server Component: the static marketing content ships as HTML with no client
// JavaScript; only <LeadForm /> hydrates.
export default function Home() {
  return (
    <main>
      <nav className="nav shell">
        <Brand />
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
        <LeadForm />
      </section>
      <footer className="footer shell"><Brand /><span>Ultima milla con criterio.</span><span>© 2026 TrackFlow</span></footer>
    </main>
  );
}
