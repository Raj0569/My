import { useEffect, useState } from "react";
import { api, STUDENT_TOKEN, STUDENT_USER } from "../utils/api";
import { SiteShell } from "../components/SiteLayout";

export default function Account() {
  const [mode, setMode] = useState("login");
  const [feedback, setFeedback] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const session = await api(
        `/auth/${mode === "login" ? "login" : "register"}`,
        { method: "POST", body: JSON.stringify(values) },
      );
      localStorage.setItem(STUDENT_TOKEN, session.token);
      localStorage.setItem(STUDENT_USER, JSON.stringify(session.user));
      location.href = "/portal";
    } catch (error) {
      setFeedback(error.message);
    }
  }
  return (
    <SiteShell>
      <main className="auth-layout">
        <div className="eyebrow">ADMISSIONS PORTAL</div>
        <h1>
          Your next step,
          <br />
          <em>starts here.</em>
        </h1>
        <p>Create an applicant account or sign in to submit and track your application.</p>
        <div className="form-card">
          <div className="tabs">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setFeedback("");
              }}
            >
              Sign in
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setFeedback("");
              }}
            >
              Create account
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <label>
                  Full name
                  <input name="name" required minLength="2" />
                </label>
                <label>
                  Phone number
                  <input name="phone" type="tel" required />
                </label>
              </>
            )}
            <label>
              Email address
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" required minLength="8" />
            </label>
            <button className="button dark">
              {mode === "login" ? "Sign in" : "Create account"} ↗
            </button>
            <p className="feedback">{feedback}</p>
          </form>
        </div>
      </main>
    </SiteShell>
  );
}
