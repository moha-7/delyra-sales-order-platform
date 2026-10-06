"use client";

import { useSyncExternalStore } from "react";

type ProfilePictureEvent = CustomEvent<{ userId: string; value: string | null }>;

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

export function ProfileAvatar({
  userId,
  initials,
  displayName,
  className = "",
}: {
  userId: string;
  initials: string;
  displayName: string;
  className?: string;
}) {
  const preview = useSyncExternalStore(
    (onStoreChange) => {
      function handleStorage(event: StorageEvent) {
        if (event.key === storageKeyFor(userId)) {
          onStoreChange();
        }
      }

      function handleLocalUpdate(event: Event) {
        const detail = (event as ProfilePictureEvent).detail;
        if (detail?.userId === userId) {
          onStoreChange();
        }
      }

      window.addEventListener("storage", handleStorage);
      window.addEventListener("ukcrm-profile-picture-updated", handleLocalUpdate);

      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("ukcrm-profile-picture-updated", handleLocalUpdate);
      };
    },
    () => readStoredPreview(userId),
    () => null,
  );

  return (
    <span
      aria-label={`${displayName} profile picture`}
      className={`profile-avatar-slot ${className}`}
      title={displayName}
    >
      {preview ? (
        <span
          aria-hidden="true"
          className="profile-avatar-photo"
          style={{ backgroundImage: `url(${preview})` }}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
