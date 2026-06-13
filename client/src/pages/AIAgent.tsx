import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AiFeatureGate } from "@/components/workspace/AiFeatureGate";
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Shield,
  Sparkles,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AGENT_SCOPE_SUMMARY } from "@shared/agentScope";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";

const SUGGESTED_PROMPTS = [
  "What product categories are trending on TikTok Shop this month?",
  "How do I calculate landed cost for a $8 product shipping from China to the US?",
  "How should I vet a new AliExpress supplier before ordering samples?",
  "What margins should I target for impulse-buy products under $30?",
];

export default function AIAgent() {
  const utils = trpc.useUtils();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const lastMessageCountRef = useRef(0);

  const aiConfig = trpc.system.getConfig.useQuery();
  const sessionsQuery = trpc.agent.getChatSessions.useQuery();
  const createSessionMutation = trpc.agent.createChatSession.useMutation({
    onSuccess: async () => {
      await utils.agent.getChatSessions.invalidate();
    },
  });
  const deleteSessionMutation = trpc.agent.deleteChatSession.useMutation({
    onSuccess: async () => {
      setSessionId(null);
      setMessages([]);
      await utils.agent.getChatSessions.invalidate();
    },
  });
  const sendMessageMutation = trpc.agent.sendMessage.useMutation();
  const getMessagesQuery = trpc.agent.getChatMessages.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );
  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);

  const activeSessionTitle =
    sessionsQuery.data?.find((s) => s.id === sessionId)?.title ?? "New conversation";

  useEffect(() => {
    if (getMessagesQuery.data) {
      setMessages(getMessagesQuery.data);
    }
  }, [getMessagesQuery.data]);

  useEffect(() => {
    const viewport = messagesScrollRef.current;
    if (!viewport) return;

    const onScroll = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 120;
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [sessionId]);

  useEffect(() => {
    const viewport = messagesScrollRef.current;
    if (!viewport) return;

    const messageCount = messages.length + (sendMessageMutation.isPending ? 1 : 0);
    const grew = messageCount > lastMessageCountRef.current;
    lastMessageCountRef.current = messageCount;

    if (grew && stickToBottomRef.current) {
      requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
      });
    }
  }, [messages, sendMessageMutation.isPending]);

  const ensureSession = async (): Promise<number | null> => {
    if (sessionId) return sessionId;
    try {
      const session = await createSessionMutation.mutateAsync({});
      if (session) {
        setSessionId(session.id);
        setMessages([]);
        stickToBottomRef.current = true;
        return session.id;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start chat");
    }
    return null;
  };

  const handleNewChat = async () => {
    try {
      const session = await createSessionMutation.mutateAsync({});
      if (session) {
        setSessionId(session.id);
        setMessages([]);
        stickToBottomRef.current = true;
        lastMessageCountRef.current = 0;
        textareaRef.current?.focus();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start chat");
    }
  };

  const handleSelectSession = (id: number) => {
    setSessionId(id);
    setMessage("");
    stickToBottomRef.current = true;
    lastMessageCountRef.current = 0;
  };

  const handleDeleteSession = async (id: number) => {
    try {
      await deleteSessionMutation.mutateAsync({ sessionId: id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete chat");
    }
  };

  const sendContent = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || aiDisabled) return;

    const activeId = await ensureSession();
    if (!activeId) return;

    setMessage("");
    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const response = await sendMessageMutation.mutateAsync({
        sessionId: activeId,
        content: trimmed,
      });
      if (response) {
        setMessages((prev) => [...prev, { role: "assistant", content: response.message }]);
        if (response.sessionTitle) {
          await utils.agent.getChatSessions.invalidate();
        }
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendContent(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendContent(message);
    }
  };

  const isBusy = createSessionMutation.isPending || sendMessageMutation.isPending;

  return (
    <div className="agent-chat-root bg-background">
      {aiDisabled ? (
        <div className="shrink-0 border-b border-border px-4 py-2">
          <AiFeatureGate disabled={aiDisabled} feature="AI research chat" />
        </div>
      ) : null}

      <div className="agent-chat-shell min-h-0 flex-1">
        {/* Conversations sidebar */}
        <aside className="agent-chat-sidebar hidden lg:grid">
          <div className="border-b border-border px-4 py-4 space-y-3 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none">Conversations</p>
                <p className="text-[11px] text-muted-foreground mt-1">Product research chat</p>
              </div>
            </div>
            <Button
              onClick={() => void handleNewChat()}
              disabled={isBusy || aiDisabled}
              className="w-full gap-2"
              size="sm"
            >
              {createSessionMutation.isPending ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              New chat
            </Button>
          </div>

          <div className="agent-chat-sessions p-2 space-y-0.5">
            {sessionsQuery.data?.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "group flex items-center gap-0.5 rounded-lg",
                  sessionId === s.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/60"
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelectSession(s.id)}
                  className={cn(
                    "flex-1 min-w-0 text-left text-sm px-3 py-2.5 flex items-center gap-2 rounded-lg",
                    sessionId === s.id ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 mr-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete chat: ${s.title}`}
                  onClick={() => void handleDeleteSession(s.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {!sessionsQuery.data?.length ? (
              <p className="px-3 py-10 text-center text-xs text-muted-foreground leading-relaxed">
                No chats yet. Type below or click New chat.
              </p>
            ) : null}
          </div>

          <div className="border-t border-border px-4 py-3 bg-muted/20">
            <div className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">{AGENT_SCOPE_SUMMARY}</p>
            </div>
          </div>
        </aside>

        {/* Main chat */}
        <div className="agent-chat-main min-w-0 bg-background">
          <div className="border-b border-border bg-card/30">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{activeSessionTitle}</p>
                <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                  E-commerce research · suppliers · competitors · validation · profit
                </p>
              </div>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex gap-1 font-normal text-[10px] border-primary/20 bg-primary/5 shrink-0"
              >
                <Shield className="w-3 h-3 text-primary" />
                Scoped
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0 lg:hidden"
                onClick={() => void handleNewChat()}
                disabled={isBusy || aiDisabled}
              >
                <Plus className="w-4 h-4" />
                New
              </Button>
            </div>

            {sessionsQuery.data?.length ? (
              <div className="lg:hidden flex gap-2 items-center border-t border-border/60 px-4 py-2.5 bg-muted/10">
                <Select
                  value={sessionId ? String(sessionId) : undefined}
                  onValueChange={(v) => handleSelectSession(Number(v))}
                >
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Select conversation" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionsQuery.data.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sessionId ? (
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    aria-label="Delete current chat"
                    onClick={() => void handleDeleteSession(sessionId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div ref={messagesScrollRef} className="agent-chat-messages">
            <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center text-center py-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5 ring-1 ring-primary/15">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    TrendHunter Research Agent
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mt-2 mb-8 leading-relaxed">
                    Ask about products, suppliers, competitors, validation, or profit math. Type in the
                    box below to start.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={isBusy || aiDisabled}
                        onClick={() => void sendContent(prompt)}
                        className="text-left text-sm rounded-xl border border-border bg-card px-4 py-3.5 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3 items-start w-full",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[min(100%,42rem)]",
                        msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_ul]:my-1.5">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary mt-0.5">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    ) : null}
                  </div>
                ))
              )}

              {sendMessageMutation.isPending ? (
                <div className="flex gap-3 items-start w-full pb-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="chat-bubble-assistant flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">Analyzing…</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <form
            onSubmit={(e) => void handleSendMessage(e)}
            className="border-t border-border bg-card/40 px-4 py-4 sm:px-6"
          >
            <div className="mx-auto w-full max-w-4xl">
              <div className="flex gap-3 items-end rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
                <Textarea
                  ref={textareaRef}
                  placeholder="Message TrendHunter AI — products, suppliers, competitors, validation, profit…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isBusy || aiDisabled}
                  className="flex-1 min-h-[52px] max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm leading-relaxed"
                  rows={2}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl"
                  disabled={isBusy || !message.trim() || aiDisabled}
                  aria-label="Send message"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                Enter to send · Shift+Enter for new line · {AGENT_SCOPE_SUMMARY}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
