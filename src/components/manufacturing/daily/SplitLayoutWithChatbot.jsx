import React, { useState, useRef, useEffect } from "react";
import DailyProductionChatbot from "./DailyProductionChatbot";

export default function SplitLayoutWithChatbot({ children, departments }) {
  const [chatWidth, setChatWidth] = useState(420);
  const [chatClosed, setChatClosed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef();

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const minWidth = 300;
      const maxWidth = containerRect.width * 0.65;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div ref={containerRef} className="flex" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left: Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 min-w-0">
        {children}
      </div>

      {/* Resize Divider - only shown when chat is open */}
      {!chatClosed && (
        <div
          onMouseDown={() => setIsResizing(true)}
          className={`w-1.5 bg-slate-200 hover:bg-blue-400 transition-colors cursor-col-resize flex-shrink-0 ${isResizing ? "bg-blue-400" : ""}`}
          title="Drag to resize"
        />
      )}

      {/* Right: Chatbot Panel - collapses when closed */}
      {!chatClosed && (
        <div
          className="flex-shrink-0 border-l border-slate-200 overflow-hidden"
          style={{ width: `${chatWidth}px` }}
        >
          <DailyProductionChatbot
            departments={departments}
            isSplitLayout={true}
            onClose={() => setChatClosed(true)}
          />
        </div>
      )}

      {/* Reopen button when closed */}
      {chatClosed && (
        <button
          onClick={() => setChatClosed(false)}
          className="fixed right-6 bottom-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-2xl transition-all"
          title="Open AI Production Assistant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </button>
      )}
    </div>
  );
}