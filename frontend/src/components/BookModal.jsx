import React, { useState } from "react";
import { Modal } from "./common/Modal";
import { FormInput } from "./common/FormInput";
import { CharacterField } from "./common/CharacterField";
import { label, validateBookForm, CHAR_LIMITS, findExceededCharFields } from "../utils/helpers";
export function BookModal({ book, genres, onClose, onSave, onNotify }) {
  if (!book) return null;
  const initialLoanDays = book.id ? book.defaultLoanDays : "";
  const [form, setForm] = useState({ ...book, defaultLoanDays: initialLoanDays, genreId: book.genreId || book.genre?.id || genres[0]?.id || "" });
  const [errors, setErrors] = useState({});
  async function submit() {
    const rawDays = Number(form.defaultLoanDays);
    const loanDays = !rawDays ? 14 : Math.min(60, Math.max(3, rawDays));
    const normalizedForm = { ...form, defaultLoanDays: loanDays };
    const exceededFields = findExceededCharFields(normalizedForm);
    if (exceededFields.length > 0) {
      const limitErrors = {};
      exceededFields.forEach((field) => {
        limitErrors[field] = `${label(field)} cannot exceed ${CHAR_LIMITS[field]} characters.`;
      });
      setErrors(limitErrors);
      const names = exceededFields.map((field) => label(field)).join(" and ");
      onNotify?.(`${names} ${exceededFields.length > 1 ? "exceed" : "exceeds"} the character limit.`, "error");
      return;
    }
    const nextErrors = validateBookForm(normalizedForm);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      alert(Object.values(nextErrors).join("\n"));
      return;
    }
    try {
      const payload = {
        ...normalizedForm,
        title: form.title.trim(),
        author: form.author.trim(),
        description: form.description?.trim() || "",
        coverUrl: form.coverUrl?.trim() || ""
      };
      await onSave(payload);
    } catch (error) {
      alert(error.message || "Something went wrong while saving.");
    }
  }
  return (
    <Modal title={book.id ? "Edit book" : "Add book"} onClose={onClose} onSubmit={submit}>
      <CharacterField label="Title" required error={errors.title} value={form.title} onChange={(v) => setForm({ ...form, title: v })} maxLength={CHAR_LIMITS.title} />
      <CharacterField label="Author" required error={errors.author} value={form.author} onChange={(v) => setForm({ ...form, author: v })} maxLength={CHAR_LIMITS.author} />
      <label className="field"><span>Genre <b>*</b></span><select className="select" value={form.genreId} onChange={(e) => setForm({ ...form, genreId: e.target.value })}>{genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select>{errors.genreId && <small>{errors.genreId}</small>}</label>
      <label className="field"><span>Condition <b>*</b></span><select className="select" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option value="like_new">Like new</option><option value="good">Good</option><option value="well_loved">Well loved</option><option value="damaged">Damaged</option></select></label>
      <FormInput
        label="Default loan days (3-60 days)"
        required
        error={errors.defaultLoanDays}
        type="number"
        value={form.defaultLoanDays}
        onChange={(v) => setForm({ ...form, defaultLoanDays: v.replace(/^0+(?!$)/, "").replace(/[^0-9]/g, "") })}
      />
      <FormInput label="Cover image URL" value={form.coverUrl} onChange={(v) => setForm({ ...form, coverUrl: v })} />
      <CharacterField className="full" type="textarea" label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} maxLength={CHAR_LIMITS.description} error={errors.description} />
    </Modal>
  );
}
