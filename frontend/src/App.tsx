import { useEffect } from "react";

import { ChatShell } from "@/components/chat/ChatShell";
import { useChatSession } from "@/features/chat/useChatSession";

function App() {
  const { state, sendMessage, clearChat, selectModel, cancelActiveRequest, isBusy } = useChatSession();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <ChatShell
        state={state}
        isBusy={isBusy}
        onSendMessage={sendMessage}
        onCancelStreaming={cancelActiveRequest}
        onSelectModel={selectModel}
        onClearChat={clearChat}
      />
    </main>
  );
}

export default App;
