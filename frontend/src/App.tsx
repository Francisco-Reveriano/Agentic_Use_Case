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
    <main className="brutalist-stage min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="stage-grid" />
      <div aria-hidden className="stage-noise" />
      <div aria-hidden className="stage-beam" />
      <div aria-hidden className="stage-orb stage-orb-primary" />
      <div aria-hidden className="stage-orb stage-orb-secondary" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-[linear-gradient(90deg,transparent,var(--signal),transparent)] opacity-70" />
      <div className="pointer-events-none absolute left-0 top-[18vh] z-0 h-px w-[28vw] bg-[linear-gradient(90deg,var(--signal),transparent)] opacity-70" />
      <div className="pointer-events-none absolute bottom-[16vh] right-0 z-0 h-px w-[24vw] bg-[linear-gradient(90deg,transparent,var(--signal-alt))] opacity-80" />

      <div className="relative z-10">
        <ChatShell
          state={state}
          isBusy={isBusy}
          onSendMessage={sendMessage}
          onCancelStreaming={cancelActiveRequest}
          onSelectModel={selectModel}
          onClearChat={clearChat}
        />
      </div>
    </main>
  );
}

export default App;
