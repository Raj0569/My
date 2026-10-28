import { STUDENT_USER } from "../utils/api";

export function Brand({ admin = false }) {
  return (
    <a
      className={`brand ${admin ? "brand-admin" : ""}`}
      href="/"
      aria-label="Northfield College home"
    >
      <span className="brand-mark">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M6 24V10.5c3.2-.5 6.6.3 10 2.6 3.4-2.3 6.8-3.1 10-2.6V24c-3.6-.4-6.9.4-10 2.4C12.9 24.4 9.6 23.6 6 24Z" />
          <path d="M16 13v13.4M9.5 15c1.9.1 3.6.6 5 1.5m8-1.5c-1.9.1-3.6.6-5 1.5" />
        </svg>
      </span>
      <span className="brand-name">
        northfield<span>{admin ? "ADMISSIONS OFFICE" : "COLLEGE"}</span>
      </span>
    </a>
  );
}

function Header() {
  const user = JSON.parse(localStorage.getItem(STUDENT_USER) || "null");
  return (
    <>
      <div className="announcement">
        <span className="announcement-dot" /> Admissions for 2026–27 are open{" "}
        <a href="/apply">Apply online ↗</a>
      </div>
      <header className="site-header">
        <Brand />
        <nav>
          <a href="/about">Our college</a>
          <a href="/courses">Courses</a>
          <a href="/admissions">Admissions</a>
          <a href="/enquiry">Contact</a>
          <a className="nav-cta" href={user ? "/portal" : "/account"}>
            {user ? "My applications" : "Admissions sign in"} ↗
          </a>
        </nav>
      </header>
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Brand />
      <p>Find your place. Make your mark.</p>
      <div>
        <a href="/about">About</a>
        <a href="/courses">Courses</a>
        <a href="/admissions">Admissions</a>
        <a href="/enquiry">Contact</a>
      </div>
      <small>© 2026 Northfield College · Sample project content</small>
    </footer>
  );
}

export function SiteShell({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
