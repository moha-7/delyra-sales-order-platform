"use client";

import { useMemo, useRef, useState } from "react";
import { addOpportunityChatterMessageAction } from "@/modules/chatter/actions";
import { mentionAliasesForUser } from "@/modules/chatter/mentions";

type MentionableUser = {
  id: string;
  displayName: string;
  email: string;
  initials: string | null;
  department: string;
};

function initialsFor(user: MentionableUser): string {
  if (user.initials) return user.initials;

  return user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

function primaryAlias(user: MentionableUser): string {
  return mentionAliasesForUser(user)[0] ?? user.displayName.toLowerCase().replace(/\s+/g, ".");
}

function currentMentionQuery(value: string, caret: number): { start: number; query: string } | null {
  const left = value.slice(0, caret);
  const match = left.match(/(^|\s)@([^\s@]{0,60})$/u);
  if (!match) return null;
  return { start: caret - (match[2]?.length ?? 0) - 1, query: match[2] ?? "" };
}

export function MentionComposer({
  opportunityId,
  users,
}: {
  opportunityId: string;
  users: MentionableUser[];
}) {
  const [body, setBody] = useState("");
  const [caret, setCaret] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionQuery = currentMentionQuery(body, caret);
  const shouldShowSuggestions = isFocused && Boolean(mentionQuery);
  const mentionSearch = (mentionQuery?.query ?? "").toLowerCase();
  const showEveryoneSuggestion =
    shouldShowSuggestions && (!mentionSearch || "everyone".includes(mentionSearch));

  const suggestions = useMemo(() => {
    if (!shouldShowSuggestions) return [];
    const query = (mentionQuery?.query ?? "").toLowerCase();
    return users
      .map((user) => ({ user, aliases: mentionAliasesForUser(user) }))
      .filter(({ user, aliases }) => {
        const haystack = `${user.displayName} ${user.email} ${user.department} ${aliases.join(" ")}`.toLowerCase();
        return !query || haystack.includes(query);
      })
      .slice(0, 8);
  }, [mentionQuery?.query, shouldShowSuggestions, users]);

  function syncCaret() {
    const element = textareaRef.current;
    if (element) setCaret(element.selectionStart ?? body.length);
  }

  function insertMention(alias: string) {
    if (!mentionQuery) return;

    const before = body.slice(0, mentionQuery.start);
    const after = body.slice(caret);
    const next = `${before}@${alias} ${after}`;

    setBody(next);
    window.requestAnimationFrame(() => {
      const position = before.length + alias.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
      setCaret(position);
    });
  }

  return (
    <form action={addOpportunityChatterMessageAction} className="chatter-composer">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <label className="form-wide mention-input-wrap">
        <span>Message *</span>
        <textarea
          name="body"
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => {
            setBody(event.target.value);
            setCaret(event.target.selectionStart ?? event.target.value.length);
          }}
          onClick={syncCaret}
          onFocus={() => {
            setIsFocused(true);
            syncCaret();
          }}
          onKeyUp={syncCaret}
          placeholder="Type @ to mention a teammate, or @everyone for a general update."
          ref={textareaRef}
          required
          rows={4}
          value={body}
          maxLength={4000}
        />
        {shouldShowSuggestions ? (
          <div className="mention-suggestions" role="listbox" aria-label="Mention suggestions">
            {showEveryoneSuggestion ? (
              <button
                className="mention-everyone-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertMention("everyone")}
                type="button"
              >
                <span className="mention-avatar"><i className="bi bi-broadcast" /></span>
                <span>
                  <strong className="block text-sm text-slate-950">Everyone on this opportunity</strong>
                  <small className="block text-xs text-slate-500">@everyone · visible to all allowed opportunity users</small>
                </span>
              </button>
            ) : null}
            {suggestions.length ? suggestions.map(({ user, aliases }) => {
              const alias = aliases[0] ?? primaryAlias(user);
              return (
                <button key={user.id} onMouseDown={(event) => event.preventDefault()} onClick={() => insertMention(alias)} type="button">
                  <span className="mention-avatar">{initialsFor(user)}</span>
                  <span>
                    <strong className="block text-sm text-slate-950">{user.displayName}</strong>
                    <small className="block text-xs text-slate-500">@{alias} · {user.department.replaceAll("_", " ")}</small>
                  </span>
                </button>
              );
            }) : !showEveryoneSuggestion ? (
              <div className="mention-empty-state">No matching teammate.</div>
            ) : null}
          </div>
        ) : null}
        <small>
          No @ = general update. @everyone = visible to all allowed opportunity users. Any other @mention is private to the author and mentioned teammate only. CEO viewer accounts are hidden.
        </small>
      </label>
      <div className="form-wide form-actions">
        <button className="primary-button compact-button" type="submit">Post update</button>
      </div>
    </form>
  );
}
