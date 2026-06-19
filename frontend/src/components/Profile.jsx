import React from "react";
import { UserRound, LogOut } from "lucide-react";
import { initials } from "../utils/helpers";
export function Profile({ user, onLogout }) {
  return (
    <div className="profile-box">
      <div className="profile-top">
        <p className="profile-eyebrow">User profile</p>
        <span className="profile-status">Active</span>
      </div>
      <div className="profile-row">
        <div className="avatar">{user.avatarInitials || initials(user.fullName)}</div>
        <div className="user-meta">
          <strong>{user.fullName}</strong>
          <span className="user-email">{user.email}</span>
        </div>
      </div>
      <div className="profile-role" title="Capability"><UserRound size={13} /> {user.team}</div>
      {onLogout && (
        <button className="logout-btn" onClick={onLogout} title="Sign Out">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      )}
    </div>
  );
}