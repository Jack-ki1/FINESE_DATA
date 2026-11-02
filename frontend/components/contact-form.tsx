"use client";
import { FormEvent, useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.trim().length < 10) {
      setStatus("Please add your name, a valid email, and a message of at least 10 characters.");
      return;
    }
    const inbox = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    if (!inbox || inbox.toLowerCase().includes("example")) {
      setStatus("The contact delivery address is not configured in this build, so nothing has been sent. Configure NEXT_PUBLIC_CONTACT_EMAIL or implement and verify a server-side mail provider before launching.");
      return;
    }
    const subject = encodeURIComponent(`FINESE DATA inquiry from ${name.trim()}`);
    const body = encodeURIComponent(`Name: ${name.trim()}\nReply email: ${email.trim()}\n\n${message.trim()}`);
    window.location.href = `mailto:${inbox}?subject=${subject}&body=${body}`;
    setStatus("Your email application should open with the inquiry prepared. Sending still happens through your email application.");
  };
  return <form className="contact-form studio-controls" onSubmit={submit}>
    <label htmlFor="contact-name">Your name<input id="contact-name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} required/></label>
    <label htmlFor="contact-email">Email address<input id="contact-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={180} required/></label>
    <label htmlFor="contact-message">How can we help?<textarea id="contact-message" value={message} onChange={e=>setMessage(e.target.value)} maxLength={3000} minLength={10} required placeholder="Tell us about the data challenge or service you are exploring."/></label>
    <button className="button button-orange" type="submit" style={{justifySelf:"start",width:"fit-content"}}>Prepare inquiry <span>↗</span></button>
    {status && <p className="studio-status warn" role="status" aria-live="polite">{status}</p>}
    <p className="contact-small">This starter does not store or transmit form content to a server. It prepares a local email only after a valid public contact address is configured.</p>
  </form>;
}
