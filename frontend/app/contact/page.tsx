import Image from "next/image";
import Link from "next/link";
import { Footer, Navbar } from "@/components/landing";
import { ContactForm } from "@/components/contact-form";
import { ArrowDown, Mail, ShieldCheck, Clock, MessageSquareQuote } from "lucide-react";

export const metadata = {
  title: "Contact",
  description: "Connect with the FINESE DATA team regarding data analytics, custom deployments and workshops.",
};

export default function ContactPage() {
  return (
    <div className="marketing">
      <Navbar />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">GET IN TOUCH</span>
              <h1>Let&apos;s talk about your data challenges.</h1>
              <p className="hero-lede">
                Whether you need advice on browser-local analytics architectures, data cleaning
                workflows, or customized corporate training, we are here to assist.
              </p>
              <div className="hero-actions">
                <a href="#inquiry" className="button button-primary">
                  Start an inquiry <ArrowDown size={16} />
                </a>
                <Link href="/services" className="button button-outline">
                  Browse services
                </Link>
              </div>
            </div>
            <div className="hero-media">
              <div className="hero-visual-glow" aria-hidden="true" />
              <div className="image-block">
                <Image
                  src="/images/showcase/collaborative-team.jpg"
                  alt="Team collaborating around a table with laptops"
                  width={1100}
                  height={720}
                  priority
                />
              </div>
              <div className="float-chip chip-orange chip-a">
                <Clock size={14} /> Replies in 1–2 business days
              </div>
            </div>
          </div>
        </section>

        <section className="contact-form-section" style={{ paddingTop: 0 }}>
          <div className="container contact-grid">
            {/* Left information column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="card" style={{ borderTop: "3px solid #f97316" }}>
                <span className="eyebrow" style={{ marginBottom: 8 }}>DIRECT CHANNELS</span>
                <h3 style={{ marginBottom: 12 }}>How to engage with us</h3>
                <p>
                  We collaborate with data analysts, engineering leads, educators, and research
                  institutions seeking privacy-preserving data solutions.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
                  <div className="contact-channel">
                    <span className="icon-tile sm tile-orange">
                      <Clock size={17} />
                    </span>
                    <div>
                      <strong>Response Time</strong>
                      <span>
                        Inquiries are typically reviewed within 1 to 2 business days.
                      </span>
                    </div>
                  </div>

                  <div className="contact-channel">
                    <span className="icon-tile sm tile-sky">
                      <ShieldCheck size={17} />
                    </span>
                    <div>
                      <strong>Privacy Commitment</strong>
                      <span>
                        We never sell or distribute your contact information. Please avoid submitting
                        confidential raw records through this form.
                      </span>
                    </div>
                  </div>

                  <div className="contact-channel">
                    <span className="icon-tile sm tile-emerald">
                      <Mail size={17} />
                    </span>
                    <div>
                      <strong>Email Delivery</strong>
                      <span>
                        Configured via <code>NEXT_PUBLIC_CONTACT_EMAIL</code> or local client dispatch.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consultation Note */}
              <div className="card" style={{ background: "var(--color-bg-subtle)", borderTop: "3px solid #f59e0b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span className="icon-tile sm tile-amber">
                    <MessageSquareQuote size={16} />
                  </span>
                  <strong style={{ fontSize: "0.9375rem" }}>Before Public Launch</strong>
                </div>
                <p style={{ fontSize: "0.8125rem", margin: 0 }}>
                  Ensure your organization&apos;s verified public contact email address is configured
                  in the deployment environment variables before hosting this site on production domains.
                </p>
              </div>
            </div>

            {/* Right Form Card */}
            <div className="card" id="inquiry" style={{ padding: "var(--space-8)", borderTop: "3px solid #f97316" }}>
              <span className="eyebrow" style={{ marginBottom: 8 }}>INQUIRY FORM</span>
              <h2 style={{ fontSize: "1.5rem", marginBottom: 16 }}>Start a conversation</h2>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
