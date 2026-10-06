import { RoleKey, UserStatus } from "@/generated/prisma/client";
import { MentionComposer } from "@/components/chatter/mention-composer";
import { StatusPill } from "@/components/crm/status-pill";
import { db } from "@/lib/db";
import { formatDateTime } from "@/modules/crm/format";
import { splitMentionBody } from "@/modules/chatter/mentions";

type ChatterActivity = {
  id: string;
  subject: string;
  body: string | null;
  type: string;
  occurredAt: Date | string;
  createdBy: { displayName: string };
};

function initialsFor(user: { displayName: string; initials?: string | null }) {
  if (user.initials) return user.initials;

  return (
    user.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function ChatterBody({ body }: { body: string }) {
  return (
    <p className="chatter-body formatted-mention-body">
      {splitMentionBody(body).map((part, index) =>
        part.kind === "mention" ? (
          <strong className="mention-highlight" key={`${part.value}-${index}`}>
            {part.value}
          </strong>
        ) : (
          <span key={`${part.value}-${index}`}>{part.value}</span>
        ),
      )}
    </p>
  );
}

export async function ChatterPanel({
  opportunityId,
  activities: historicalActivities,
  canComment,
  currentUserId,
  focusMessageId,
}: {
  opportunityId: string;
  activities: ChatterActivity[];
  canComment: boolean;
  currentUserId: string;
  focusMessageId?: string | null;
}) {
  const [messages, mentionableUsers] = await Promise.all([
    db.chatterMessage.findMany({
      where: {
        opportunityId,
        archivedAt: null,
        OR: [
          { authorId: currentUserId },
          { mentions: { some: { mentionedUserId: currentUserId } } },
          { mentions: { none: {} } },
        ],
      },
      include: {
        author: { select: { displayName: true, initials: true } },
        mentions: {
          include: {
            mentionedUser: { select: { id: true, displayName: true, initials: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.user.findMany({
      where: {
        archivedAt: null,
        status: UserStatus.ACTIVE,
        userRoles: { none: { role: { key: RoleKey.CEO_VIEWER } } },
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        initials: true,
        department: true,
      },
      orderBy: { displayName: "asc" },
    }),
  ]);

  const visibleMessageCount = messages.length;
  const historicalActivityCount = historicalActivities.length;

  return (
    <section className="split-section chatter-section">
      <article className="data-card chatter-feed-card">
        <div className="data-card-header">
          <strong>Internal chatter</strong>
          <span>
            {visibleMessageCount} visible / {historicalActivityCount} audit events
          </span>
        </div>

        <div className="chatter-privacy-note">
          <i className="bi bi-shield-lock" aria-hidden="true" />
          <span>
            General updates are visible to everyone on this opportunity. Mentioned updates are visible only to the author and mentioned users.
          </span>
        </div>

        {messages.length ? (
          <div className="timeline chatter-timeline">
            {messages.map((message) => {
              const mentionedNames = message.mentions.map((mention) => mention.mentionedUser.displayName);
              const isPrivate = mentionedNames.length > 0;
              const isFocused = focusMessageId === message.id;

              return (
                <div
                  className={`timeline-item chatter-message-card ${isFocused ? "message-focus" : ""}`}
                  id={`message-${message.id}`}
                  key={message.id}
                >
                  <span className="timeline-dot" />
                  <div className="chatter-message-content">
                    <div className="timeline-heading chatter-message-heading">
                      <span className="mention-avatar">{initialsFor(message.author)}</span>
                      <div>
                        <strong>{message.author.displayName}</strong>
                        <small>{formatDateTime(message.createdAt)}</small>
                      </div>
                      <StatusPill value={isPrivate ? "MENTIONED" : "EVERYONE"} />
                    </div>
                    <ChatterBody body={message.body} />
                    {mentionedNames.length ? (
                      <small className="chatter-mention-line">
                        Mentioned {mentionedNames.join(", ")}
                      </small>
                    ) : (
                      <small className="chatter-mention-line">General update visible to opportunity users.</small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            No visible internal messages for you yet. General updates and direct mentions will appear here.
          </div>
        )}
      </article>

      {canComment ? (
        <article className="form-card chatter-form-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Internal discussion</p>
              <h2>Add update / @mention</h2>
              <p>
                Leave the message without mentions for a general update, or use @ to send it only to specific teammates.
              </p>
            </div>
          </div>

          <MentionComposer opportunityId={opportunityId} users={mentionableUsers} />
        </article>
      ) : (
        <article className="form-card chatter-form-card muted-role-card">
          <p>CEO viewer accounts do not participate in internal chatter.</p>
        </article>
      )}
    </section>
  );
}
