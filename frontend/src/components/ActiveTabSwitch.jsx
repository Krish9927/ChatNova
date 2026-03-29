import { useChatStore } from "../store/useChatStore";
import { MessageSquare, Users } from "lucide-react";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="inline-flex items-center gap-4 p-1 bg-slate-900/40 rounded-lg shadow-sm">
      <button
        onClick={() => setActiveTab("chats")}
        aria-pressed={activeTab === "chats"}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${activeTab === "chats"
          ? "bg-gradient-to-b from-cyan-600/20 to-cyan-600/10 text-cyan-300 shadow-inner"
          : "text-slate-400 hover:bg-slate-800/40"
          }`}
      >
        <MessageSquare className={`w-4 h-4 ${activeTab === "chats" ? "text-cyan-300" : "text-slate-400"}`} />
        <span className="text-sm font-medium">Chats</span>
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        aria-pressed={activeTab === "contacts"}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${activeTab === "contacts"
          ? "bg-gradient-to-b from-cyan-600/20 to-cyan-600/10 text-cyan-300 shadow-inner"
          : "text-slate-400 hover:bg-slate-800/40"
          }`}
      >
        <Users className={`w-4 h-4 ${activeTab === "contacts" ? "text-cyan-300" : "text-slate-400"}`} />
        <span className="text-sm font-medium">Contacts</span>
      </button>
    </div>
  );
}

export default ActiveTabSwitch;