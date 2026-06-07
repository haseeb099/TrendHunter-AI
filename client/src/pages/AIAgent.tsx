import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

export default function AIAgent() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createSessionMutation = trpc.agent.createChatSession.useMutation();
  const sendMessageMutation = trpc.agent.sendMessage.useMutation();
  const getMessagesMutation = trpc.agent.getChatMessages.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  useEffect(() => {
    if (getMessagesMutation.data) {
      setMessages(getMessagesMutation.data);
    }
  }, [getMessagesMutation.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    const session = await createSessionMutation.mutateAsync({});
    if (session) {
      setSessionId(session.id);
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !sessionId) return;

    const userMessage = message;
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    const response = await sendMessageMutation.mutateAsync({
      sessionId,
      content: userMessage,
    });

    if (response) {
      setMessages((prev) => [...prev, { role: "assistant", content: response.message }]);
    }
  };

  if (!sessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">AI Research Agent</h1>
          <p className="text-muted-foreground">Chat with your personal product research advisor</p>
        </div>

        <Card className="card-elevated p-12 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-4">Start a New Conversation</p>
          <p className="text-muted-foreground mb-6">Get AI-powered insights on product research, sourcing, and marketing strategies</p>
          <Button onClick={handleNewChat} disabled={createSessionMutation.isPending} className="btn-primary">
            {createSessionMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Start Chat
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-200px)] flex flex-col">
      <div>
        <h1 className="text-4xl font-bold mb-2">AI Research Agent</h1>
        <p className="text-muted-foreground">Your personal product research advisor</p>
      </div>

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
                <p className="text-sm">{msg.content}</p>
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
            disabled={sendMessageMutation.isPending}
            className="input-elegant flex-1"
          />
          <Button type="submit" disabled={sendMessageMutation.isPending || !message.trim()} className="btn-primary">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
