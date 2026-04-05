import React, { useState, useRef, useEffect } from "react";
import DailyProductionChatbot from "./DailyProductionChatbot";

export default function SplitLayoutWithChatbot({ children, departments }) {
  const [chatWidth, setChatWidth] = useState(420);
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

      {/* Resize Divider */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className={`w-1.5 bg-slate-200 hover:bg-blue-400 transition-colors cursor-col-resize flex-shrink-0 ${isResizing ? "bg-blue-400" : ""}`}
        title="Drag to resize"
      />

      {/* Right: Chatbot Panel */}
      <div
        className="flex-shrink-0 border-l border-slate-200 overflow-hidden"
        style={{ width: `${chatWidth}px` }}
      >
        <DailyProductionChatbot departments={departments} isSplitLayout={true} />
      </div>
    </div>
  );
}