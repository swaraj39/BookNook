import React, { useState } from "react";
import { Modal } from "./common/Modal";
import { FormInput } from "./common/FormInput";
import { validateBookForm } from "../utils/helpers";
export function BookModal({ book, genres, onClose, onSave }) {
  if (!book) return null;
  const [form, setForm] = useState({ ...book, genreId: book.genreId || book.genre?.id || genres[0]?.id || "" });
  const [errors, setErrors] = useState({});
  async function submit() {
    const nextErrors = validateBookForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) await onSave({
      ...form,
      defaultLoanDays: Math.floor(Number(form.defaultLoanDays)),
      title: form.title.trim(),
      author: form.author.trim(),
      description: form.description?.trim() || "",
      coverUrl: form.coverUrl?.trim() || ""
    });
  }
  return (
    <Modal title={book.id ? "Edit book" : "Add book"} onClose={onClose} onSubmit={submit}>
      <FormInput label="Title" required error={errors.title} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      <FormInput label="Author" required error={errors.author} value={form.author} onChange={(v) => setForm({ ...form, author: v })} />
      <label className="field"><span>Genre <b>*</b></span><select className="select" value={form.genreId} onChange={(e) => setForm({ ...form, genreId: e.target.value })}>{genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select>{errors.genreId && <small>{errors.genreId}</small>}</label>
      <label className="field"><span>Condition <b>*</b></span><select className="select" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option value="like_new">Like new</option><option value="good">Good</option><option value="well_loved">Well loved</option><option value="damaged">Damaged</option></select></label>
      <FormInput
        label="Default loan days"
        required
        error={errors.defaultLoanDays}
        type="number"
        value={form.defaultLoanDays}
        onChange={(v) => setForm({ ...form, defaultLoanDays: v.replace(/^0+(?!$)/, "").replace(/[^0-9]/g, "") })}
      />
      <FormInput label="Cover image URL" value={form.coverUrl} onChange={(v) => setForm({ ...form, coverUrl: v })} />
      <label className="field full"><span>Description</span><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />{errors.description && <small>{errors.description}</small>}</label>
    </Modal>
  );
}