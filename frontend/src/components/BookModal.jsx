import React, { useState, useEffect, useRef } from "react";
import { Modal } from "./common/Modal";
import { FormInput } from "./common/FormInput";
import { validateBookForm } from "../utils/helpers";
import { api } from "../api";
export function BookModal({ book, genres, onClose, onSave }) {
  if (!book) return null;
  const [form, setForm] = useState({ ...book, genreId: book.genreId || book.genre?.id || genres[0]?.id || "" });
  const [errors, setErrors] = useState({});
  const [authors, setAuthors] = useState([]);
  const [authorSearch, setAuthorSearch] = useState(book.author || "");
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const authorRef = useRef(null);
  useEffect(() => {
    api.authors().then(setAuthors).catch(() => {});
  }, []);
  useEffect(() => {
    function handleClick(e) {
      if (authorRef.current && !authorRef.current.contains(e.target)) {
        setShowAuthorDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const filteredAuthors = authors.filter((a) =>
    a.name.toLowerCase().includes(authorSearch.toLowerCase())
  );
  async function submit() {
    const nextErrors = validateBookForm({ ...form, author: authorSearch || form.author });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      alert(Object.values(nextErrors).join("\n"));
      return;
    }
    try {
      const authorName = (authorSearch.trim() || form.author?.trim() || "").trim();
      const matchedAuthor = authors.find((a) => a.name.toLowerCase() === authorName.toLowerCase());
      const payload = {
        ...form,
        defaultLoanDays: Math.floor(Number(form.defaultLoanDays)),
        title: form.title.trim(),
        author: authorName,
        authorId: matchedAuthor ? matchedAuthor.id : undefined,
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
      <FormInput label="Title" required error={errors.title} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      <div className="field" ref={authorRef}>
        <span>Author <b>*</b></span>
        <div className="author-combobox">
          <input
            className="input"
            value={authorSearch}
            onChange={(e) => { setAuthorSearch(e.target.value); setShowAuthorDropdown(true); }}
            onFocus={() => setShowAuthorDropdown(true)}
            placeholder="Search or type author name"
          />
          {showAuthorDropdown && filteredAuthors.length > 0 && (
            <div className="author-dropdown">
              {filteredAuthors.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="author-dropdown-item"
                  onClick={() => { setAuthorSearch(a.name); setShowAuthorDropdown(false); }}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.author && <small>{errors.author}</small>}
      </div>
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
      <label className="field full"><span>Description</span><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />{errors.description && <small>{errors.description}</small>}</label>
    </Modal>
  );
}