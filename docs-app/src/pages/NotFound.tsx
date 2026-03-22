import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="not-found">
      <p className="not-found-code">404</p>
      <h1 className="not-found-title">Page not found</h1>
      <p className="not-found-desc">This page doesn't exist or was moved.</p>
      <Link to="/" className="not-found-link">← Back to Introduction</Link>
    </div>
  );
}
