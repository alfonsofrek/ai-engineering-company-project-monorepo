/** TrackFlow wordmark. Used in the navigation and the footer (previously duplicated markup). */
export function Brand({ href = "#top" }: { href?: string }) {
  return (
    <a className="brand" href={href}>
      <span className="brand-mark" aria-hidden="true">TF</span> trackflow
    </a>
  );
}
