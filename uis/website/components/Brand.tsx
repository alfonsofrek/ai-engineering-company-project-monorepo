/** TrackFlow wordmark. Used in the navigation and the footer (previously duplicated markup). */
export function Brand({ href = "#top" }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="TrackFlow, ir al inicio">
      <span className="brand-mark" aria-hidden="true">TF</span> trackflow
    </a>
  );
}
