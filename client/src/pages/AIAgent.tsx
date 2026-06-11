import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { AiFeatureGate } from "@/components/workspace/AiFeatureGate";
import { MessageSquare, Send, Plus, Trash2, Bot } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";

const SUGGESTED_PROMPTS = [
  "What product categories are trending on TikTok Shop this month?",
  "How do I calculate landed cost for a $8 product shipping from China to the US?",
  "Compare dropshipping vs holding inventory for a new store",
  "What margins should I target for impulse-buy products under $30?",
];

export default function AIAgent() {
  const utils = trpc.useUtils();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const aiConfig = trpc.system.getConfig.useQuery();
  const sessionsQuery = trpc.agent.getChatSessions.useQuery();
  const createSessionMutation = trpc.agent.createChatSession.useMutation({
    onSuccess: async (session) => {
      if (session) {
        setSessionId(session.id);
        setMessages([]);
        await utils.agent.getChatSessions.invalidate();
      }
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

  useEffect(() => {
    if (getMessagesQuery.data) {
      setMessages(getMessagesQuery.data);
    }
  }, [getMessagesQuery.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    try {
      await createSessionMutation.mutateAsync({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start chat");
    }
  };

  const handleSelectSession = (id: number) => {
    setSessionId(id);
  };

  const handleDeleteSession = async (id: number) => {
    try {
      await deleteSessionMutation.mutateAsync({ sessionId: id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete chat");
    }
  };

  const handleSendMessage = async (e: React.FormEvent, override?: string) => {
    e.preventDefault();
    const content = (override ?? message).trim();
    if (!content || !sessionId || aiDisabled) return;

    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      const response = await sendMessageMutation.mutateAsync({
        sessionId,
        content,
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

  const SessionMobilePicker = () => {
    if (!sessionsQuery.data?.length) return null;
    return (
      <div className="lg:hidden flex gap-2 items-center">
        <Select
          value={sessionId ? String(sessionId) : undefined}
          onValueChange={(v) => handleSelectSession(Number(v))}
        >
          <SelectTrigger className="flex-1 h-9 input-elegant">
            <SelectValue placeholder="Past conversations" />
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
            onClick={() => handleDeleteSession(sessionId)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : null}
      </div>
    );
  };

  const SessionSidebar = ({ className }: { className?: string }) => (
    <aside className={cn("card-elevated flex flex-col overflow-hidden", className)}>
      <div className="border-b border-border p-3">
        <Button
          onClick={handleNewChat}
          disabled={createSessionMutation.isPending || aiDisabled}
          className="w-full"
          size="sm"
        >
          {createSessionMutation.isPending ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sessionsQuery.data?.map((s) => (
          <div key={s.id} className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleSelectSession(s.id)}
              className={cn(
                "flex-1 text-left text-sm px-3 py-2 rounded-lg truncate transition-colors",
                sessionId === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {s.title}
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              aria-label={`Delete chat: ${s.title}`}
              onClick={() => handleDeleteSession(s.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        {!sessionsQuery.data?.length ? (
          <p className="text-xs text-muted-foreground px-3 py-4 text-center">No conversations yet</p>
        ) : null}
      </div>
    </aside>
  );

  if (!sessionId) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="AI Research Agent"
          description="Your product research advisor — sourcing, margins, trends, and go-to-market strategy."
        />
        <div className="flex justify-end -mt-4">
          <DataFreshnessBadge synthetic />
        </div>

        <AiFeatureGate disabled={aiDisabled} feature="AI research chat" />

        <Alert className="border-border bg-muted/30">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            This agent uses general AI knowledge only — it is not connected to live marketplace feeds,
            your watchlist, or real-time trend data. Verify sourcing and demand in Discover and Intel
            Center before acting on recommendations.
          </AlertDescription>
        </Alert>

        <SessionMobilePicker />
        <div className="grid lg:grid-cols-[220px_1fr] gap-4 min-h-[420px]">
          <SessionSidebar className="hidden lg:flex" />
          <div className="product-panel-empty flex-1">
            <div className="product-panel-empty-icon">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <p className="font-medium text-sm">Start a conversation</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Ask about niches, supplier strategy, ad angles, or how to interpret validation scores.
            </p>
            <Button onClick={handleNewChat} disabled={createSessionMutation.isPending || aiDisabled}>
              {createSessionMutation.isPending ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Start chat
            </Button>
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={createSessionMutation.isPending || aiDisabled}
                  onClick={async () => {
                    try {
                      const session = await createSessionMutation.mutateAsync({});
                      if (session) {
                        setSessionId(session.id);
                        setMessages([]);
                        await utils.agent.getChatSessions.invalidate();
                      }
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to start chat");
                    }
                  }}
                  className="text-xs rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100svh-12rem)]">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="AI Research Agent"
          description="Ask follow-ups, compare options, and refine your product strategy."
          className="flex-1 min-w-0"
        />
        <div className="flex flex-col items-end gap-2 shrink-0">
          <DataFreshnessBadge synthetic />
          <Button variant="outline" size="sm" onClick={handleNewChat} disabled={aiDisabled}>
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>
      </div>

      <AiFeatureGate disabled={aiDisabled} feature="AI research chat" />

      <Alert className="border-border bg-muted/30">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          Responses are AI-generated and not wired to live feeds. Cross-check trends, ads, and supplier
          data in your workspace.
        </AlertDescription>
      </Alert>

      <SessionMobilePicker />

      <div className="grid lg:grid-cols-[220px_1fr] gap-4 flex-1 min-h-0">
        <SessionSidebar className="hidden lg:flex max-h-[calc(100svh-14rem)]" />

        <div className="card-elevated flex flex-col overflow-hidden min-h-[480px]">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Bot className="w-10 h-10 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Try one of these prompts or ask your own question
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={(e) => handleSendMessage(e, prompt)}
                      disabled={sendMessageMutation.isPending || aiDisabled}
                      className="text-xs rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left"
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
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-md",
                      msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}

            {sendMessageMutation.isPending ? (
              <div className="flex justify-start">
                <div className="chat-bubble-assistant flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  <span className="text-muted-foreground text-xs">Thinking…</span>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="border-t border-border p-4 flex gap-2 bg-muted/10"
          >
            <Input
              placeholder="Ask about products, markets, suppliers, or ads…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMessageMutation.isPending || aiDisabled}
              className="input-elegant flex-1"
            />
            <Button
              type="submit"
              disabled={sendMessageMutation.isPending || !message.trim() || aiDisabled}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
