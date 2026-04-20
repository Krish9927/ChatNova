import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useFriendStore } from "../store/useFriendStore";

import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import GroupsList from "../components/GroupsList";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";

function ChatPage() {
  const { activeTab, selectedUser, setSelectedUser } = useChatStore();
  const {
    selectedGroup, setSelectedGroup,
    subscribeToGroupEvents, unsubscribeFromGroupEvents,
  } = useGroupStore();
  const { subscribeToFriendEvents, unsubscribeFromFriendEvents } = useFriendStore();

  useEffect(() => {
    subscribeToGroupEvents();
    subscribeToFriendEvents();
    const { subscribeToMessages, unsubscribeFromMessages } = useChatStore.getState();
    subscribeToMessages();
    return () => {
      unsubscribeFromGroupEvents();
      unsubscribeFromFriendEvents();
      unsubscribeFromMessages();
    };
  }, []);

  useEffect(() => {
    if (activeTab === "groups") setSelectedUser(null);
  }, [activeTab]);

  const showGroupChat = !!selectedGroup;
  const showDMChat = !!selectedUser && !selectedGroup;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d1117]">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex flex-col w-80 shrink-0 h-full border-r border-white/5 overflow-hidden">
        <ProfileHeader />
        <ActiveTabSwitch />
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "chats" && <ChatsList />}
          {activeTab === "contacts" && <ContactList />}
          {activeTab === "groups" && <GroupsList />}
        </div>
      </aside>

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-[#111827]">
        {showGroupChat && <GroupChatContainer />}
        {showDMChat && <ChatContainer />}
        {!showGroupChat && !showDMChat && <NoConversationPlaceholder />}
      </main>
    </div>
  );
}

export default ChatPage;
