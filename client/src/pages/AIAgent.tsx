import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { MessageSquare, Send, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

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
  const aiDisabled = aiConfig.data && !aiConfig.data.ai.configured;

  useEffect(() => {
    if (getMessagesQuery.data) {
      setMessages(getMessagesQuery.data);
    }
  }, [getMessagesQuery.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    await createSessionMutation.mutateAsync({});
  };

  const handleSelectSession = (id: number) => {
    setSessionId(id);
  };

  const handleDeleteSession = async (id: number) => {
    await deleteSessionMutation.mutateAsync({ sessionId: id });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !sessionId || aiDisabled) return;

    const userMessage = message;
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await sendMessageMutation.mutateAsync({
        sessionId,
        content: userMessage,
      });
      if (response) {
        setMessages((prev) => [...prev, { role: "assistant", content: response.message }]);
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  if (!sessionId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Research Agent"
          description="Chat with your personal product research advisor"
        />

        {aiDisabled ? (
          <Alert>
            <AlertDescription>Add OPENAI_API_KEY to use the AI agent.</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          <Card className="card-elevated p-4 space-y-2">
            <Button onClick={handleNewChat} disabled={createSessionMutation.isPending || aiDisabled} className="w-full">
              {createSessionMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              New chat
            </Button>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {sessionsQuery.data?.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSession(s.id)}
                  className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted truncate"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </Card>

          <Card className="card-elevated p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold mb-4">Start a New Conversation</p>
            <p className="text-muted-foreground mb-6">
              Get AI-powered insights on product research, sourcing, and marketing strategies
            </p>
            <Button onClick={handleNewChat} disabled={createSessionMutation.isPending || aiDisabled}>
              {createSessionMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Start Chat
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="AI Research Agent"
          description="Your personal product research advisor"
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={handleNewChat} disabled={aiDisabled}>
          <Plus className="w-4 h-4 mr-2" />
          New chat
        </Button>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-4 flex-1 min-h-0">
        <Card className="card-elevated p-3 overflow-y-auto hidden md:block">
          <div className="space-y-1">
            {sessionsQuery.data?.map((s) => (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectSession(s.id)}
                  className={`flex-1 text-left text-sm px-3 py-2 rounded-md truncate ${
                    sessionId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  {s.title}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleDeleteSession(s.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="card-elevated flex-1 p-6 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Start by asking about products, markets, or strategies</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-3 rounded-lg">
                  <Spinner className="w-4 h-4" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Ask me anything about products, markets, or strategies..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMessageMutation.isPending || aiDisabled}
              className="input-elegant flex-1"
            />
            <Button type="submit" disabled={sendMessageMutation.isPending || !message.trim() || aiDisabled}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
