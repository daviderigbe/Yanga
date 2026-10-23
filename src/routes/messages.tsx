import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { messageApi } from "@/lib/endpoints";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, Send } from "lucide-react";
import { toast } from "sonner";

type MessagesSearch = {
  userId?: string;
  productId?: string;
  name?: string;
};

interface Person {
  id?: string;
  name?: string;
  userName?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  imageUrl?: string;
}

interface MessagePreview {
  content?: string;
  createdAt?: string;
  senderId?: string;
  receiverId?: string;
  sender?: Person;
  receiver?: Person;
}

interface Conversation {
  userId?: string;
  otherMemberId?: string;
  otherUserId?: string;
  participantId?: string;
  participantIds?: string[];
  userIds?: string[];
  buyerId?: string;
  sellerId?: string;
  receiverId?: string;
  senderId?: string;
  id?: string;
  name?: string;
  userName?: string;
  username?: string;
  imageUrl?: string;
  otherUser?: Person;
  participant?: Person;
  otherParticipant?: Person;
  user?: Person;
  sender?: Person;
  receiver?: Person;
  buyer?: Person;
  seller?: Person;
  recipient?: Person;
  participants?: Person[];
  lastMessage?: MessagePreview | string;
  latestMessage?: MessagePreview;
  message?: MessagePreview;
  lastMessageTime?: string;
  hasAttachment?: boolean;
  isOnline?: boolean;
  unreadCount?: number;
}

interface Message {
  id?: string;
  senderId?: string;
  receiverId?: string;
  sender?: Person;
  receiver?: Person;
  content: string;
  createdAt?: string;
}

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): MessagesSearch => ({
    userId: (search.userId as string) || undefined,
    productId: (search.productId as string) || undefined,
    name: (search.name as string) || undefined,
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUserId, setActiveUserId] = useState(search.userId ?? "");
  const [knownNames, setKnownNames] = useState<Record<string, string>>(() => ({
    ...readStoredNames(),
    ...(search.userId && search.name ? { [search.userId]: search.name } : {}),
  }));
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await messageApi.conversations();
      const items = extractList<Conversation>(response, ["conversations"]);
      setConversations(items);
      setKnownNames((current) => storeNames(mergeConversationNames(current, items, user.id)));
      if (!activeUserId && items[0]) setActiveUserId(conversationUserId(items[0], user.id));
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (userId = activeUserId) => {
    if (!userId) return;
    setThreadLoading(true);
    try {
      const response = await messageApi.conversation(userId, { markAsRead: true, limit: 50 });
      const items = extractList<Message>(response, ["messages"]);
      const threadUser = (response as any)?.data?.user as Person | undefined;
      setMessages(items);
      setKnownNames((current) =>
        storeNames(mergeThreadNames(mergeMessageNames(current, items, user?.id), threadUser)),
      );
      await messageApi.markRead(userId).catch(() => {});
    } catch {
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!search.userId) return;
    setActiveUserId(search.userId);
    if (search.name) {
      setKnownNames((current) => storeNames({ ...current, [search.userId!]: search.name! }));
    }
  }, [search.name, search.userId]);

  useEffect(() => {
    if (!activeUserId || knownNames[activeUserId]) return;
    api<{ data?: Person }>(`/api/users/${activeUserId}`)
      .then((response) => {
        const person = response.data;
        const name = personName(person);
        if (name) setKnownNames((current) => storeNames({ ...current, [activeUserId]: name }));
      })
      .catch(() => {});
  }, [activeUserId, knownNames]);

  useEffect(() => {
    void loadThread(activeUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  const activeConversation = useMemo(
    () => conversations.find((item) => conversationUserId(item, user?.id) === activeUserId),
    [activeUserId, conversations, user?.id],
  );

  const activeName = displayName(activeConversation, user.id, knownNames, activeUserId);

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const id = conversationUserId(conversation, user.id);
        const text = [
          displayName(conversation, user.id, knownNames, id),
          latestMessageContent(conversation),
          id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(conversationSearch.trim().toLowerCase());
      }),
    [conversationSearch, conversations, knownNames, user.id],
  );

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeUserId || !draft.trim()) return;
    try {
      await messageApi.send({
        receiverId: activeUserId,
        content: draft.trim(),
        productId: search.productId,
      });
      setDraft("");
      await loadThread(activeUserId);
      await loadConversations();
    } catch (error: any) {
      toast.error(error.message ?? "Could not send message");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
        Loading messages…
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h1 className="font-display text-2xl font-black">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with buyers and sellers.</p>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder="Search people or messages"
              className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="max-h-[640px] overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading conversations…</p>
          ) : filteredConversations.length ? (
            filteredConversations.map((conversation) => {
              const id = conversationUserId(conversation, user.id);
              const name = displayName(conversation, user.id, knownNames, id);
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveUserId(id);
                    navigate({
                      to: "/messages",
                      search: { userId: id, name } as any,
                    });
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                    id === activeUserId
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <Avatar name={name} muted={id === activeUserId} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p
                      className={`truncate text-xs ${id === activeUserId ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {latestMessageContent(conversation) ?? "Open conversation"}
                    </p>
                  </div>
                  {!!conversation.unreadCount && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-black text-destructive-foreground">
                      {conversation.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {conversationSearch ? "No chats match your search." : "No conversations yet."}
            </p>
          )}
        </div>
      </aside>

      <section className="flex min-h-[640px] flex-col rounded-2xl border border-border bg-card shadow-card">
        {activeUserId ? (
          <>
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <Avatar name={activeName} />
                <div>
                  <h2 className="font-display text-xl font-black">{activeName}</h2>
                  {search.productId && (
                    <Link
                      to="/product/$id"
                      params={{ id: search.productId }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View product
                    </Link>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => loadThread()}
              >
                Refresh
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {threadLoading ? (
                <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
              ) : messages.length ? (
                messages.map((message) => {
                  const mine = message.senderId === user.id;
                  return (
                    <div
                      key={message.id ?? `${message.createdAt}-${message.content}`}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        <p>{message.content}</p>
                        {message.createdAt && (
                          <p
                            className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                          >
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-semibold">Start the conversation</p>
                    <p className="text-sm text-muted-foreground">Send a message below.</p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={send} className="flex gap-2 border-t border-border p-4">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type a message…"
                className="h-11 flex-1 rounded-full border border-input bg-background px-4 outline-none focus:border-primary"
              />
              <Button type="submit" className="h-11 rounded-full" disabled={!draft.trim()}>
                <Send className="mr-2 h-4 w-4" /> Send
              </Button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <MessageCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h2 className="font-display text-2xl font-black">Select a chat</h2>
              <p className="text-sm text-muted-foreground">Your conversations will appear here.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function extractList<T>(response: unknown, keys: string[]): T[] {
  const root = response as any;
  const data = root?.data ?? root;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function conversationUserId(conversation: Conversation, currentUserId?: string) {
  const participant = otherParticipant(conversation, currentUserId);
  const preview = latestMessage(conversation);
  const directId =
    conversation.otherMemberId ??
    conversation.otherUserId ??
    conversation.userId ??
    conversation.participantId ??
    otherIdFromList(conversation.participantIds, currentUserId) ??
    otherIdFromList(conversation.userIds, currentUserId) ??
    (conversation.buyerId === currentUserId ? conversation.sellerId : conversation.buyerId) ??
    (conversation.sellerId === currentUserId ? conversation.buyerId : conversation.sellerId) ??
    (conversation.receiverId === currentUserId ? conversation.senderId : conversation.receiverId) ??
    (conversation.senderId === currentUserId ? conversation.receiverId : conversation.senderId) ??
    (preview?.receiverId === currentUserId ? preview.senderId : preview?.receiverId) ??
    (preview?.senderId === currentUserId ? preview.receiverId : preview?.senderId) ??
    (preview?.sender?.id === currentUserId ? preview.receiver?.id : preview?.sender?.id) ??
    (preview?.receiver?.id === currentUserId ? preview.sender?.id : preview?.receiver?.id);

  return participant?.id ?? directId ?? conversation.id ?? "";
}

function displayName(
  conversation: Conversation | undefined,
  currentUserId: string,
  knownNames: Record<string, string>,
  fallbackId: string,
) {
  const name =
    conversation?.name ??
    conversation?.userName ??
    conversation?.username ??
    personName(otherParticipant(conversation, currentUserId));
  return name ?? knownNames[fallbackId] ?? "User";
}

function otherParticipant(conversation?: Conversation, currentUserId?: string): Person | undefined {
  if (!conversation) return undefined;
  const people = [
    topLevelConversationPerson(conversation),
    conversation.otherUser,
    conversation.otherParticipant,
    conversation.participant,
    conversation.user,
    conversation.buyer,
    conversation.seller,
    conversation.recipient,
    conversation.sender,
    conversation.receiver,
    latestMessage(conversation)?.sender,
    latestMessage(conversation)?.receiver,
    ...(conversation.participants ?? []),
  ].filter(Boolean) as Person[];

  return people.find((person) => person.id && person.id !== currentUserId) ?? people[0];
}

function personName(person?: Person) {
  return person?.name ?? person?.userName ?? person?.username ?? person?.email;
}

function mergeConversationNames(
  current: Record<string, string>,
  conversations: Conversation[],
  currentUserId: string,
) {
  const next = { ...current };
  for (const conversation of conversations) {
    const id = conversationUserId(conversation, currentUserId);
    const name =
      conversation.name ??
      conversation.userName ??
      conversation.username ??
      personName(otherParticipant(conversation, currentUserId));
    if (id && name) next[id] = name;
  }
  return next;
}

function mergeMessageNames(
  current: Record<string, string>,
  messages: Message[],
  currentUserId?: string,
) {
  const next = { ...current };
  for (const message of messages) {
    const people = [message.sender, message.receiver].filter(Boolean) as Person[];
    for (const person of people) {
      const name = personName(person);
      if (person.id && person.id !== currentUserId && name) next[person.id] = name;
    }
  }
  return next;
}

function mergeThreadNames(current: Record<string, string>, person?: Person) {
  const name = personName(person);
  if (!person?.id || !name) return current;
  return { ...current, [person.id]: name };
}

const NAMES_STORAGE_KEY = "yanga_message_names";

function readStoredNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const value = window.localStorage.getItem(NAMES_STORAGE_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function storeNames(names: Record<string, string>) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(NAMES_STORAGE_KEY, JSON.stringify(names));
    } catch {
      // Browsers can block storage in private contexts; chat still works without local persistence.
    }
  }
  return names;
}

function otherIdFromList(ids: string[] | undefined, currentUserId?: string) {
  return ids?.find((id) => id && id !== currentUserId);
}

function latestMessage(conversation: Conversation) {
  if (typeof conversation.lastMessage === "string") return undefined;
  return conversation.lastMessage ?? conversation.latestMessage ?? conversation.message;
}

function latestMessageContent(conversation: Conversation) {
  if (typeof conversation.lastMessage === "string") return conversation.lastMessage;
  return (
    conversation.lastMessage?.content ??
    conversation.latestMessage?.content ??
    conversation.message?.content
  );
}

function topLevelConversationPerson(conversation: Conversation): Person | undefined {
  if (
    !conversation.otherMemberId &&
    !conversation.name &&
    !conversation.userName &&
    !conversation.imageUrl
  ) {
    return undefined;
  }
  return {
    id: conversation.otherMemberId,
    name: conversation.name,
    userName: conversation.userName,
    username: conversation.username,
    imageUrl: conversation.imageUrl,
  };
}

function Avatar({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <div
      className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-full font-bold ${
        muted ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/10 text-primary"
      }`}
    >
      {name[0]?.toUpperCase() ?? "A"}
    </div>
  );
}
