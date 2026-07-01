import React, { useState } from "react";
import { Modal } from "./common/Modal";
import { FormInput } from "./common/FormInput";
import { validateRequestForm } from "../utils/helpers";
export function RequestModal({ book, onClose, onSave }) {
  if (!book) return null;
  const [form, setForm] = useState({
    bookId: book.id,
    requestedLoanDays: String(book.defaultLoanDays || 14),
    borrowerNote: ""
  });
  const [errors, setErrors] = useState({});
  async function submit() {
    const cleanedForm = {
      ...form,
      requestedLoanDays: parseInt(form.requestedLoanDays, 10),
      borrowerNote: form.borrowerNote?.trim() || ""
    };
    const nextErrors = validateRequestForm(cleanedForm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      await onSave(cleanedForm);
    }
  }
  return (
    <Modal title={`Request: ${book.title}`} onClose={onClose} onSubmit={submit}>
      <FormInput
        label="Borrow for days (3-60)"
        required
        error={errors.requestedLoanDays}
        type="number"
        value={form.requestedLoanDays}
        onChange={(v) => {
          const onlyInteger = v.replace(/\D/g, "");
          setForm({ ...form, requestedLoanDays: onlyInteger });
        }}
      />
      <label className="field full">
        <span>Note to owner</span>
        <textarea
          className="textarea"
          value={form.borrowerNote}
          onChange={(e) => setForm({ ...form, borrowerNote: e.target.value })}
        />
      </label>
    </Modal>
  );
}