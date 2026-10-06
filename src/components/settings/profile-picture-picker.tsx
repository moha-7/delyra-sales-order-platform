"use client";

import { useRef, useState } from "react";
import { ProfileAvatar } from "@/components/settings/profile-avatar";

function storageKeyFor(userId: string) {
  return `ukcrm-profile-picture:${userId}`;
}

function readStoredPreview(userId: string) {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(storageKeyFor(userId));
  } catch {
    return null;
  }
}

function broadcastProfilePicture(userId: string, value: string | null) {
  window.dispatchEvent(
    new CustomEvent("ukcrm-profile-picture-updated", {
      detail: { userId, value },
    }),
  );
}

export function ProfilePicturePicker({
  userId,
  initials,
  displayName,
}: {
  userId: string;
  initials: string;
  displayName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const storageKey = storageKeyFor(userId);

  const [preview, setPreview] = useState<string | null>(() => readStoredPreview(userId));
  const [message, setMessage] = useState(
    "Click the avatar to preview a new profile picture on this browser.",
  );

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFile(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file only.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image is too large for preview. Keep it below 2 MB for the pilot UI.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : null;
      if (!value) return;

      setPreview(value);
      broadcastProfilePicture(userId, value);
      setMessage("Profile picture updated in the sidebar and top bar on this browser.");

      try {
        window.localStorage.setItem(storageKey, value);
      } catch {
        setMessage("Preview updated for this session. Browser storage is not available.");
      }
    };

    reader.readAsDataURL(file);
  }

  function removePreview() {
    setPreview(null);
    broadcastProfilePicture(userId, null);
    setMessage("Profile picture preview removed from this browser.");

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors.
    }
  }

  return (
    <div className="profile-picture-picker" id="profile-picture">
      <button
        type="button"
        className="profile-avatar-button"
        onClick={openPicker}
        aria-label={`Change profile picture for ${displayName}`}
      >
        <ProfileAvatar
          className="profile-avatar-picker-preview"
          displayName={displayName}
          initials={initials}
          userId={userId}
        />
        <i className="bi bi-camera-fill" aria-hidden="true" />
      </button>

      <div className="profile-picture-copy">
        <h2>{displayName}</h2>
        <p>{message}</p>

        <div className="profile-picture-actions">
          <button
            type="button"
            className="primary-button compact-button"
            onClick={openPicker}
          >
            Change picture
          </button>

          {preview ? (
            <button
              type="button"
              className="secondary-button compact-button"
              onClick={removePreview}
            >
              Remove preview
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
