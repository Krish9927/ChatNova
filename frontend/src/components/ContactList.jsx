import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <>
      {allContacts.map((contact) => {
        const isOnline = onlineUsers.includes(contact._id);
        return (
          <div
            key={contact._id}
            className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
            onClick={() => setSelectedUser(contact)}
          >
            <div className="flex items-center gap-3">
              <div className={`avatar ${isOnline ? "avatar-online" : "avatar-offline"}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src={contact.profilePic || "/avatar.png"} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h4 className="text-slate-200 font-medium">{contact.fullName || contact.username}</h4>
                {isOnline && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
export default ContactList;