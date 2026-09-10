import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, CheckCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export function HelpdeskWidget({ notify, me }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const cardRef = useRef(null);
  const btnRef = useRef(null);

  const name = me?.fullName || "";
  const email = me?.email || "";

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        isOpen &&
        cardRef.current &&
        !cardRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function resetForm() {
    setSubject("");
    setDescription("");
    setSuccess(false);
  }

  function handleToggle() {
    if (isOpen) {
      setIsOpen(false);
      setTimeout(resetForm, 300);
    } else {
      setIsOpen(true);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !description.trim()) {
      notify("Please fill in all fields.", "error");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("bn_token");
      const response = await fetch(`${API_URL}/helpdesk`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: description.trim(),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to send message.");
      }
      setSuccess(true);
      notify("Your message has been sent to the helpdesk.");
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(resetForm, 300);
      }, 3000);
    } catch (err) {
      notify(err.message || "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        ref={btnRef}
        className={`helpdesk-fab ${isOpen ? "active" : ""}`}
        onClick={handleToggle}
        aria-label={isOpen ? "Close contact form" : "Open contact form"}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Floating Card Modal */}
      <div ref={cardRef} className={`helpdesk-card ${isOpen ? "active" : ""}`}>
        {/* Header */}
        <div className="helpdesk-card-header">
          <h3>Contact & Support</h3>
          <p>Have an issue? Send us a message and we'll get back to you.</p>
        </div>

        {/* Form */}
        {!success ? (
          <form className="helpdesk-card-body" onSubmit={handleSubmit} noValidate>
            <div className="helpdesk-field">
              <label htmlFor="hw-name">Full Name</label>
              <input
                id="hw-name"
                type="text"
                value={name}
                readOnly
                className="helpdesk-field-readonly"
              />
            </div>

            <div className="helpdesk-field">
              <label htmlFor="hw-email">Email Address</label>
              <input
                id="hw-email"
                type="email"
                value={email}
                readOnly
                className="helpdesk-field-readonly"
              />
            </div>

            <div className="helpdesk-field">
              <label htmlFor="hw-subject">Subject</label>
              <input
                id="hw-subject"
                type="text"
                placeholder="Brief summary of your query"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
              />
            </div>

            <div className="helpdesk-field">
              <label htmlFor="hw-description">Description of Issue</label>
              <textarea
                id="hw-description"
                rows={4}
                placeholder="Provide detailed information regarding your issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={2000}
              />
            </div>

            <button
              type="submit"
              className="helpdesk-submit-btn"
              disabled={loading}
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  <Send size={15} /> Send Message
                </>
              )}
            </button>
          </form>
        ) : (
          /* Success State */
          <div className="helpdesk-success">
            <CheckCircle size={48} />
            <h4>Message Sent!</h4>
            <p>
              Thank you for reaching out. Our support team will review your
              ticket shortly.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
