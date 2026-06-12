import "stream-chat-react/dist/css/v2/index.css";
import { Chat } from "stream-chat-react";
import WorkspaceChannelLane from "./components/WorkspaceChannelLane";
import WorkspaceConversationPanel from "./components/WorkspaceConversationPanel";
import WorkspaceHero from "./components/WorkspaceHero";
import WorkspaceLaneSidebar from "./components/WorkspaceLaneSidebar";
import WorkspaceQuickActionsPanel from "./components/WorkspaceQuickActionsPanel";
import useWorkspaceChat from "./hooks/useWorkspaceChat";
import { statusClass } from "./utils/channelMeta";
import "./workspace-chat.css";

const WorkspaceChatPage = () => {
  const workspace = useWorkspaceChat();

  const chatWorkspaceColumns = (
    <>
      <div className="workspace-stream-shell">
        <WorkspaceChannelLane
          activeChannel={workspace.activeChannel}
          activeTab={workspace.activeTab}
          bootstrap={workspace.bootstrap}
          bootstrapError={workspace.bootstrapError}
          chatClient={workspace.chatClient}
          isBootstrapping={workspace.isBootstrapping}
          refreshKey={workspace.refreshKey}
          search={workspace.search}
          searchNeedle={workspace.searchNeedle}
          setActiveChannel={workspace.setActiveChannel}
          setSearch={workspace.setSearch}
        />
      </div>

      <section className="workspace-stream-shell space-y-5">
        <WorkspaceConversationPanel
          activeChannel={workspace.activeChannel}
          announcementDraft={workspace.announcementDraft}
          bootstrap={workspace.bootstrap}
          bootstrapError={workspace.bootstrapError}
          busyAction={workspace.busyAction}
          chatClient={workspace.chatClient}
          handlePublishAnnouncement={workspace.handlePublishAnnouncement}
          isBootstrapping={workspace.isBootstrapping}
          permissions={workspace.permissions}
          setAnnouncementDraft={workspace.setAnnouncementDraft}
        />
      </section>
    </>
  );

  return (
    <div className="mx-auto max-w-[1680px] px-3 sm:px-6 lg:px-8">
      <div className="space-y-5">
        {workspace.status ? (
          <div className={`rounded-[22px] border px-4 py-3 text-sm ${statusClass(workspace.status.tone)}`}>
            {workspace.status.text}
          </div>
        ) : null}

        <WorkspaceHero activeRole={workspace.activeRole} />

        <div className="grid gap-5 xl:grid-cols-[340px_320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <WorkspaceLaneSidebar
              activeTab={workspace.activeTab}
              onSelectTab={workspace.handleSelectTab}
            />

            <WorkspaceQuickActionsPanel
              busyAction={workspace.busyAction}
              directContacts={workspace.directContacts}
              directPortalUserId={workspace.directPortalUserId}
              enabled={workspace.enabled}
              groupCandidates={workspace.groupCandidates}
              groupDescription={workspace.groupDescription}
              groupName={workspace.groupName}
              groupPortalUserIds={workspace.groupPortalUserIds}
              onCreateDirect={workspace.handleCreateDirect}
              onCreateGroup={workspace.handleCreateGroup}
              onToggleGroupUser={workspace.toggleGroupUser}
              permissions={workspace.permissions}
              setDirectPortalUserId={workspace.setDirectPortalUserId}
              setGroupDescription={workspace.setGroupDescription}
              setGroupName={workspace.setGroupName}
              setShowDirectForm={workspace.setShowDirectForm}
              setShowGroupForm={workspace.setShowGroupForm}
              showDirectForm={workspace.showDirectForm}
              showGroupForm={workspace.showGroupForm}
            />
          </aside>

          {workspace.chatClient ? (
            <Chat client={workspace.chatClient} theme="str-chat__theme-light">
              {chatWorkspaceColumns}
            </Chat>
          ) : (
            chatWorkspaceColumns
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceChatPage;
