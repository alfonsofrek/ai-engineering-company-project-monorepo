import { Brand } from "../components/Brand";
import { LeadForm } from "../components/LeadForm";

// Server Component: the static marketing content ships as HTML with no client
// JavaScript; only <LeadForm /> hydrates.
const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TrackFlow",
  description: "Gestión de almacenes y entregas de última milla para e-commerce",
  url: "https://trackflow.com",
  foundingDate: "2009",
  address: [
    { "@type": "PostalAddress", addressCountry: "US", addressLocality: "Los Ángeles", addressRegion: "California" },
    { "@type": "PostalAddress", addressCountry: "ES", addressLocality: "Zaragoza", addressRegion: "Aragón" },
  ],
  contactPoint: { "@type": "ContactPoint", telephone: "+1-213-555-0147", contactType: "sales", availableLanguage: ["Spanish", "English"] },
  sameAs: ["https://linkedin.com/company/trackflow"],
  areaServed: [{ "@type": "Country", name: "Estados Unidos" }, { "@type": "Country", name: "Spain" }],
};

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }} />
      <nav className="nav shell">
        <Brand />
        <div className="nav-links"><a href="#top">Inicio</a><a href="#servicios">Servicios</a><a href="#cobertura">Cobertura</a><a href="#contacto">Contacto</a></div>
        <a className="nav-cta" href="#onboarding">Solicitar información <span aria-hidden="true">-&gt;</span></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Estados Unidos · España · desde 2009</p>
          <h1>Logística que escala con tu e-commerce</h1>
          <p className="hero-lead">Gestión de almacenes, entregas de última milla y logística inversa en Estados Unidos y España. Más de 15 años ayudando a marcas de moda, electrónica y cosmética a crecer sin preocuparse por la operación.</p>
          <div className="hero-actions"><a className="button button-coral" href="#onboarding">Solicitar información <span aria-hidden="true">↗</span></a><a className="text-link" href="#servicios">Ver servicios <span aria-hidden="true">↓</span></a></div>
          <div className="proof"><span className="proof-icon">✓</span><span><strong>Los Ángeles + Zaragoza</strong><br />Operación binacional con almacenes propios</span></div>
        </div>
        <div className="hero-visual" aria-label="Centro de operaciones de TrackFlow">
          <div className="route route-one" /><div className="route route-two" /><div className="map-pin pin-one">01</div><div className="map-pin pin-two">02</div><div className="map-pin pin-three">03</div>
          <div className="visual-card card-top"><span>EN RUTA</span><strong>2,840</strong><small>envíos hoy</small></div>
          <div className="visual-card card-bottom"><span className="live-dot" /> Visibilidad en tiempo real</div>
          <div className="city-label label-one">LA <small>almacén</small></div><div className="city-label label-two">ZGZ <small>almacén</small></div>
        </div>
      </section>

      <section className="metrics shell" id="servicios" aria-labelledby="servicios-title"><h2 id="servicios-title" className="sr-only">Servicios</h2><div><strong>01</strong><span>Gestión de Almacenes</span><ul><li>Almacenamiento, picking y packing</li><li>Inventario en tiempo real</li><li>Operamos almacenes en Los Ángeles y Zaragoza</li></ul></div><div><strong>02</strong><span>Entregas de Última Milla</span><ul><li>Red de carriers certificados en ambos países</li><li>Seguimiento unificado de envíos</li><li>Gestión de incidencias y devoluciones</li></ul></div><div><strong>03</strong><span>Logística Inversa</span><ul><li>Gestión completa de devoluciones</li><li>Inspección y reacondicionamiento</li><li>Integración con tu plataforma de ventas</li></ul></div></section>

      <section className="coverage shell" id="cobertura" aria-labelledby="cobertura-title"><h2 id="cobertura-title">Cobertura</h2><div className="coverage-grid"><article><h3>Estados Unidos</h3><ul><li>Almacén en Los Ángeles</li><li>Cobertura nacional</li><li>Carriers: UPS, FedEx, DHL</li></ul></article><article><h3>España</h3><ul><li>Almacén en Zaragoza</li><li>Cobertura peninsular e islas</li><li>Carriers: MRW, SEUR, DHL</li></ul></article></div></section>

      <section className="coverage shell" aria-labelledby="porque-title"><h2 id="porque-title">Por qué TrackFlow</h2><ul className="benefits"><li><strong>Operación binacional</strong> El único operador con infraestructura propia en Estados Unidos y España</li><li><strong>+130 profesionales</strong> dedicados a tu logística</li><li><strong>Tecnología propia</strong> para visibilidad total de tu inventario</li><li><strong>Especialización e-commerce</strong> en moda, electrónica y cosmética</li></ul></section>

      <section className="onboarding shell" id="onboarding">
        <div className="onboarding-intro"><p className="eyebrow">Solicitar información</p><h2>Cuéntanos cómo es<br /><em>tu operación.</em></h2><p>Para empresas de e-commerce que quieren externalizar su logística. Nuestro equipo comercial te contactará en 24-48 horas.</p><div className="field-note"><span>i</span><span>Si buscas rastrear un paquete o hacer una devolución, contacta con la tienda donde compraste.</span></div></div>
        <LeadForm />
      </section>
      <section className="coverage shell" id="contacto" aria-labelledby="contacto-title"><h2 id="contacto-title">Contacto</h2><address className="benefits"><a href="mailto:comercial@trackflow.com">comercial@trackflow.com</a><span>Los Ángeles: <a href="tel:+12135550147">+1 213 555 0147</a></span><span>Zaragoza: <a href="tel:+34976123456">+34 976 123 456</a></span></address></section>
      <footer className="footer shell"><Brand /><span>© 2025 TrackFlow. Todos los derechos reservados.</span><a href="https://linkedin.com/company/trackflow" rel="noopener">LinkedIn</a></footer>
    </main>
  );
}
