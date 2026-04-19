import { useChatStore } from "../store/useChatStore";
import { MessageSquare, Users, UsersRound } from "lucide-react";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  const tabs = [
    { id: "chats", label: "Chats", Icon: MessageSquare },
    { id: "contacts", label: "Contacts", Icon: Users },
    { id: "groups", label: "Groups", Icon: UsersRound },
  ];

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-slate-900/40 rounded-lg shadow-sm w-full">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          aria-pressed={activeTab === id}
          className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${activeTab === id
              ? "bg-gradient-to-b from-cyan-600/20 to-cyan-600/10 text-cyan-300 shadow-inner"
              : "text-slate-400 hover:bg-slate-800/40"
            }`}
        >
          <Icon className={`w-4 h-4 ${activeTab === id ? "text-cyan-300" : "text-slate-400"}`} />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}

export default ActiveTabSwitch;