import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

export function SlackShareModal({ request, onClose }) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const reviewToken = request.reviewToken;
  const reviewLink = `${window.location.origin}?review=${encodeURIComponent(reviewToken)}`;

  const slackMessage = [
    "📚 *Book Nook — New borrow request*",
    "",
    `*Book:* ${request.book?.title || ""}`,
    `*Author:* ${request.book?.author || "Unknown"}`,
    `*Borrower:* ${request.requester?.fullName || "Someone in the community"}`,
    `*Duration:* ${request.requestedLoanDays} days`,
    ...(request.borrowerNote ? [`*Note:* ${request.borrowerNote}`] : []),
    "",
    `Approve or decline the request here: ${reviewLink}`,
  ].join("\n");

  async function copyText(value, setFlag) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(textarea);
    }
    setFlag(true);
    setTimeout(() => setFlag(false), 2000);
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal slack-share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Share in Slack</h3>
          <button className="btn icon-only" type="button" onClick={onClose}>X</button>
        </div>
        <div className="slack-share-body">
          <p className="slack-share-hint">
            Paste this message into a channel so the book owner can approve or decline your request.
            Only the owner of <strong>{request.book?.title}</strong> can open the link. The link stays valid for 7 days.
          </p>
          <textarea className="textarea slack-share-message" readOnly value={slackMessage} rows={11} />
          <div className="slack-share-actions">
            <button className="btn" onClick={() => copyText(slackMessage, setCopied)}>
              {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy message</>}
            </button>
          </div>
          <div className="slack-share-divider" />
          <p className="slack-share-hint">Or share the link directly with the owner:</p>
          <div className="slack-share-link-row">
            <a className="slack-share-link" href={reviewLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> {reviewLink}
            </a>
            <button className="btn" onClick={() => copyText(reviewLink, setCopiedLink)}>
              {copiedLink ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy link</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}