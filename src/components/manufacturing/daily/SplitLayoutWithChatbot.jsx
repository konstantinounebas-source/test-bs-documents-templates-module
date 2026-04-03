import React, { useState, useRef, useEffect } from "react";
import DailyProductionChatbot from "./DailyProductionChatbot";

export default function SplitLayoutWithChatbot({ children, departments }) {
  const [chatWidth, setChatWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef();
  const dividerRef = useRef();

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      
      // Min width 300px, max width 70% of container
      const minWidth = 300;
      const maxWidth = containerRect.width * 0.7;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div ref={containerRef} className="flex h-screen overflow-hidden">
      {/* Left: Content Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        {children}
      </div>

      {/* Divider */}
      <div
        ref={dividerRef}
        onMouseDown={() => setIsResizing(true)}
        className={`w-1 bg-slate-200 hover:bg-blue-500 transition-colors cursor-col-resize ${
          isResizing ? "bg-blue-500" : ""
        }`}
      />

      {/* Right: Chatbot */}
      <div
        className="overflow-hidden border-l border-slate-200 bg-slate-50"
        style={{ width: `${chatWidth}px` }}
      >
        <div className="h-full flex flex-col">
          <DailyProductionChatbot departments={departments} isSplitLayout={true} />
        </div>
      </div>
    </div>
  );
}