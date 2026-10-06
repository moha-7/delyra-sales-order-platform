export type MentionBodyPart =
  | {
      kind: "text";
      value: string;
    }
  | {
      kind: "mention";
      value: string;
      token: string;
    };

function appendTextPart(parts: MentionBodyPart[], value: string) {
  if (!value) {
    return;
  }

  const lastPart = parts[parts.length - 1];

  if (lastPart?.kind === "text") {
    lastPart.value += value;
    return;
  }

  parts.push({
    kind: "text",
    value,
  });
}

export function normalizeMentionToken(value: string): string {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .toLowerCase();
}

export function extractMentionTokens(body: string): string[] {
  const tokens = new Set<string>();
  const mentionPattern = /(^|[^a-zA-Z0-9._-])@([a-zA-Z0-9._-]{2,60})/g;
  let match: RegExpExecArray | null;

  while ((match = mentionPattern.exec(body)) !== null) {
    const token = normalizeMentionToken(match[2] ?? "");

    if (token) {
      tokens.add(token);
    }
  }

  return [...tokens];
}

export function mentionAliasesForUser(user: {
  email?: string | null;
  displayName: string;
  initials?: string | null;
}): string[] {
  const emailName = user.email?.split("@")[0] ?? "";
  const displaySlug = user.displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");

  return [
    user.initials ?? "",
    emailName,
    displaySlug,
    displaySlug.replaceAll(".", "-"),
    displaySlug.replaceAll(".", ""),
  ]
    .map(normalizeMentionToken)
    .filter((alias) => alias.length > 0);
}

export function splitMentionBody(body: string): MentionBodyPart[] {
  const parts: MentionBodyPart[] = [];
  const mentionPattern = /(^|[^a-zA-Z0-9._-])@([a-zA-Z0-9._-]{2,60})/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionPattern.exec(body)) !== null) {
    const boundary = match[1] ?? "";
    const rawToken = match[2] ?? "";
    const atIndex = match.index + boundary.length;

    const displayToken = rawToken.replace(/^[._-]+|[._-]+$/g, "");
    const token = normalizeMentionToken(displayToken);

    if (!token || !displayToken) {
      continue;
    }

    appendTextPart(parts, body.slice(lastIndex, atIndex));

    parts.push({
      kind: "mention",
      value: `@${displayToken}`,
      token,
    });

    lastIndex = atIndex + displayToken.length + 1;
  }

  appendTextPart(parts, body.slice(lastIndex));

  return parts;
}

export function compactMentionPreview(body: string, maxLength = 180): string {
  const normalizedBody = body.replace(/\s+/g, " ").trim();

  if (maxLength <= 0) {
    return "";
  }

  if (normalizedBody.length <= maxLength) {
    return normalizedBody;
  }

  const suffix = "...";

  if (maxLength <= suffix.length) {
    return suffix.slice(0, maxLength);
  }

  const cutAt = maxLength - suffix.length;

  return `${normalizedBody.slice(0, cutAt)}${suffix}`;
}