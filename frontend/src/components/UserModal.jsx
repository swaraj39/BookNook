import React, { useState } from "react";
import { Modal } from "./common/Modal";
import { FormInput } from "./common/FormInput";
export function UserModal({ user, onClose, onSave }) {
  if (!user) return null;
  const [form, setForm] = useState({ fullName: user.fullName || "", team: user.team || "", role: user.role === "ADMIN" ? "ADMIN" : "USER" });
  const [errors, setErrors] = useState({});
  async function submit() {
    if (!form.fullName.trim()) {
      setErrors({ fullName: "Name is required." });
      return;
    }
    setErrors({});
    try {
      const payload = { fullName: form.fullName.trim(), team: form.team.trim(), role: form.role };
      await onSave(payload);
    } catch (error) {
      alert(error.message || "Something went wrong while saving.");
    }
  }
  return (
    <Modal title={`Edit ${user.fullName}`} onClose={onClose} onSubmit={submit}>
      <FormInput label="Name" required error={errors.fullName} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
      <FormInput label="Team" value={form.team} onChange={(v) => setForm({ ...form, team: v })} />
      <label className="field"><span>Role <b>*</b></span><select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="USER">User</option><option value="ADMIN">Admin</option></select></label>
    </Modal>
  );
}
