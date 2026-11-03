"use client";

import { FormEvent, useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

export function ContactForm() {
  const [topic, setTopic] = useState("Consultation");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ text: string; type: "warn" | "success" } | null>(null);

  const topics = [
    "Consultation",
    "Studio Architecture",
    "Workshops & Training",
    "General Inquiry",
  ];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.trim().length < 10) {
      setStatus({
        text: "Please provide your full name, a valid email address, and a message of at least 10 characters.",
        type: "warn",
      });
      return;
    }

    const inbox = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    if (!inbox || inbox.toLowerCase().includes("example")) {
      setStatus({
        text: `The contact delivery address (NEXT_PUBLIC_CONTACT_EMAIL) is not configured in this environment yet. Your inquiry regarding [${topic}] was not dispatched to a remote server.`,
        type: "warn",
      });
      return;
    }

    const subject = encodeURIComponent(`FINESE DATA [${topic}] inquiry from ${name.trim()}`);
    const body = encodeURIComponent(
      `Topic: ${topic}\nName: ${name.trim()}\nEmail: ${email.trim()}\nOrganization: ${
        organization.trim() || "N/A"
      }\n\n${message.trim()}`
    );
    window.location.href = `mailto:${inbox}?subject=${subject}&body=${body}`;
    setStatus({
      text: "Your email application has been opened with your inquiry prepared. Please complete sending via your email client.",
      type: "success",
    });
  };

  return (
    <form className="contact-form" onSubmit={submit}>
      <div>
        <label style={{ marginBottom: 8, display: "block" }}>Select Inquiry Topic</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {topics.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTopic(t)}
              className={`studio-button ${topic === t ? "primary" : ""}`}
              style={{ fontSize: 11, padding: "5px 12px" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label htmlFor="contact-name">
          Your Name <span style={{ color: "var(--color-danger)" }}>*</span>
          <input
            id="contact-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            placeholder="Ada Lovelace"
          />
        </label>

        <label htmlFor="contact-email">
          Work Email <span style={{ color: "var(--color-danger)" }}>*</span>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={180}
            required
            placeholder="ada@example.com"
          />
        </label>
      </div>

      <label htmlFor="contact-org">
        Organization or Project (Optional)
        <input
          id="contact-org"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          maxLength={100}
          placeholder="e.g. Acme Analytics / University"
        />
      </label>

      <label htmlFor="contact-message">
        How can we help? <span style={{ color: "var(--color-danger)" }}>*</span>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={3000}
          minLength={10}
          required
          rows={5}
          placeholder="Describe your data challenge, analytics goals, or architectural questions."
        />
      </label>

      <button className="button button-primary" type="submit" style={{ width: "fit-content" }}>
        Prepare Inquiry <Send size={14} />
      </button>

      {status && (
        <div
          className={`studio-status ${status.type === "warn" ? "warn" : ""}`}
          role="status"
          aria-live="polite"
          style={{
            background:
              status.type === "success" ? "var(--color-success-subtle)" : undefined,
            borderColor:
              status.type === "success" ? "var(--color-success)" : undefined,
            color:
              status.type === "success" ? "var(--color-success)" : undefined,
          }}
        >
          {status.type === "warn" ? (
            <AlertCircle size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span>{status.text}</span>
        </div>
      )}

      <p className="contact-small">
        Privacy guarantee: Form input is not stored in a cloud database by this starter. Inquiries
        are dispatched through your local mail client.
      </p>
    </form>
  );
}
