import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
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
  const { selectedGroup, setSelectedGroup, subscribeToGroupEvents, unsubscribeFromGroupEvents } = useGroupStore();

  // subscribe to group socket events once for the entire chat page lifetime
  useEffect(() => {
    subscribeToGroupEvents();
    // also subscribe to DM messages globally so unread counts work
    // even when no conversation is open
    const { subscribeToMessages, unsubscribeFromMessages } = useChatStore.getState();
    subscribeToMessages();
    return () => {
      unsubscribeFromGroupEvents();
      unsubscribeFromMessages();
    };
  }, []);

  // when switching to groups tab, clear DM selection
  useEffect(() => {
    if (activeTab === "groups") setSelectedUser(null);
  }, [activeTab]);

  // selectedGroup can come from either "chats" or "groups" tab
  const showGroupChat = !!selectedGroup;
  const showDMChat = !!selectedUser && !selectedGroup;

  return (
    <div className="relative mx-auto h-[min(800px,calc(100dvh-5rem))] min-h-[min(520px,calc(100dvh-5rem))] w-full max-w-6xl">
      <BorderAnimatedContainer className="flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="flex h-auto max-h-[45vh] min-h-0 w-full shrink-0 flex-col border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm md:h-full md:max-h-none md:w-80 md:border-b-0 md:border-r">
          <ProfileHeader />
          <div className="px-1.5">
            <ActiveTabSwitch />
          </div>
          <div className="mx-2 border-t border-slate-700/60" aria-hidden />

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2 py-2">
            {activeTab === "chats" && <ChatsList />}
            {activeTab === "contacts" && <ContactList />}
            {activeTab === "groups" && <GroupsList />}
          </div>
        </aside>

        {/* Main panel */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-900/50 backdrop-blur-sm">
          {showGroupChat && <GroupChatContainer />}
          {showDMChat && <ChatContainer />}
          {!showGroupChat && !showDMChat && <NoConversationPlaceholder />}
        </section>
      </BorderAnimatedContainer>
    </div>
  );
}

export default ChatPage;
