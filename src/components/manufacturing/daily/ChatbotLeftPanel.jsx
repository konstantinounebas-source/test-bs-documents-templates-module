import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RotateCcw, Maximize, Minimize2, X, Bot } from "lucide-react";
import IntakeBlock from "./IntakeBlock";

export default function ChatbotLeftPanel({
  messages,
  messagesEndRef,
  isSplitLayout,
  selBatch,
  selDept,
  renderChatInput,
  createBatchMutation,
  uploadingCount,
  isAiThinking,
  isSavingLine,
  selDate,
  customDate,
  setCustomDate,
  handleDateSelect,
  quickDates,
  addMsg,
  handleReset,
  setSplitFullscreen,
  splitFullscreen,
  onClose
}) {
  return (
    <div className="flex flex-col bg-white border-r border-slate-200" style={{ width: isSplitLayout ? "35%" : "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white border-b border-blue-700 select-none flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bot className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm truncate">AI Production Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleReset} className="hover:bg-blue-700 rounded p-1 opacity-70 hover:opacity-100" title="Reset">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setSplitFullscreen(f => !f)} className="hover:bg-blue-700 rounded p-1 opacity-70 hover:opacity-100" title={splitFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {splitFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button onClick={() => { setSplitFullscreen(false); onClose && onClose(); }} className="hover:bg-blue-700 rounded p-1 opacity-70 hover:opacity-100" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Departments Block */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 max-h-fit">
        {/* Will be rendered from parent through slot/prop */}
      </div>

      {/* Intake Block */}
      <IntakeBlock 
        selDate={selDate} 
        selDept={selDept} 
        customDate={customDate}
        setCustomDate={setCustomDate}
        onDateSelect={handleDateSelect}
        quickDates={quickDates}
        onAddMsg={addMsg}
      />

      {/* Chat log */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] text-sm px-3 py-2 rounded-2xl whitespace-pre-wrap
                ${m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {(createBatchMutation?.isPending || uploadingCount > 0 || isAiThinking || isSavingLine) && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Chat input */}
      {renderChatInput()}
    </div>
  );
}