import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading } = useChatStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <>
      {allContacts.map((contact) => (
        <div
          key={contact._id}
          className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
          onClick={() => setSelectedUser(contact)}
        >
          <div className="flex items-center gap-3">
            {/* TODO: MAKE IT WORK WITH SOCKET */}
            <div className={`avatar  avatar-online`}>
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img src={contact.profilePic || "/avatar.png"} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <h4 className="text-slate-200 font-medium">{contact.fullName || contact.username}</h4>
          </div>
        </div>
      ))}
    </>
  );
}
export default ContactList;