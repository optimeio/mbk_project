"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { chatService } from "@/services/chatService";
import { SOCKET_JOIN_ROOMS_EVENT } from "@/context/SocketContext";
import {
  connectStreamUser,
  disconnectStreamUser,
  watchMessagingChannel,
} from "../services/streamClient";

const useChatWorkspace = ({ initialTab = "direct" } = {}) => {
  const { currentUser } = useAuth();

  const [bootstrap, setBootstrap] = useState(null);
  const [bootstrapError, setBootstrapError] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [chatClient, setChatClient] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeChannel, setActiveChannel] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [directPortalUserId, setDirectPortalUserId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupPortalUserIds, setGroupPortalUserIds] = useState([]);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let cancelled = false;

    const loadBootstrap = async () => {
      setIsBootstrapping(true);
      setBootstrapError("");

      try {
        const data = await chatService.getBootstrap();
        if (cancelled) return;

        setBootstrap(data);
        if (!data.enabled && data.message) {
          setStatus({ tone: "warning", text: data.message });
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(error.message || "Failed to initialize the internal messaging system.");
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    loadBootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bootstrap?.enabled) {
      setChatClient(null);
      return undefined;
    }

    let cancelled = false;
    let connectedClient = null;

    const connect = async () => {
      try {
        const client = await connectStreamUser({
          apiKey: bootstrap.apiKey,
          user: bootstrap.currentUser,
          token: bootstrap.token,
        });

        if (cancelled) {
          await disconnectStreamUser(client);
          return;
        }

        connectedClient = client;
        setChatClient(client);
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(error.message || "Stream Chat connection failed.");
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      setChatClient(null);
      setActiveChannel(null);
      if (connectedClient) {
        void disconnectStreamUser(connectedClient);
      }
    };
  }, [bootstrap?.apiKey, bootstrap?.currentUser, bootstrap?.enabled, bootstrap?.token]);

  const permissions = bootstrap?.permissions || {};
  const directContacts = bootstrap?.directContacts || [];
  const groupCandidates = bootstrap?.groupCandidates || [];
  const activeRole = bootstrap?.currentUser?.portalRoleLabel || currentUser?.role || "Portal user";
  const enabled = Boolean(bootstrap?.enabled);
  const searchNeedle = String(deferredSearch || "").trim().toLowerCase();

  const handleSelectTab = (tabId) => {
    startTransition(() => {
      setActiveTab(tabId);
      setActiveChannel(null);
      setSearch("");
    });
  };

  const toggleGroupUser = (portalUserId) => {
    setGroupPortalUserIds((currentIds) =>
      currentIds.includes(portalUserId)
        ? currentIds.filter((id) => id !== portalUserId)
        : [...currentIds, portalUserId],
    );
  };

  const watchCreatedChannel = async (channelId, tabId) => {
    if (!chatClient || !channelId) return;

    const watchedChannel = await watchMessagingChannel(chatClient, channelId);
    if (!watchedChannel) return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(SOCKET_JOIN_ROOMS_EVENT, {
          detail: { roomIds: [`channel:messaging:${channelId}`] },
        }),
      );
    }

    startTransition(() => {
      setActiveTab(tabId);
      setActiveChannel(watchedChannel);
      setRefreshKey((value) => value + 1);
    });
  };

  const handleCreateDirect = async (event) => {
    event.preventDefault();
    if (!directPortalUserId) return;

    setBusyAction("direct");
    try {
      const data = await chatService.createDirectChannel(directPortalUserId);
      const createdChannelId = data.channel?.id || data.channelId;
      await watchCreatedChannel(createdChannelId, "direct");
      setDirectPortalUserId("");
      setShowDirectForm(false);
      setStatus({
        tone: "success",
        text: `Private chat ready with ${data.targetUser?.name || "the selected user"}.`,
      });
    } catch (error) {
      setStatus({ tone: "error", text: error.message || "Unable to create the private chat." });
    } finally {
      setBusyAction("");
    }
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    setBusyAction("group");

    try {
      const data = await chatService.createGroupChannel({
        name: groupName,
        description: groupDescription,
        portalUserIds: groupPortalUserIds,
      });
      const createdChannelId = data.channel?.id || data.channelId;
      await watchCreatedChannel(createdChannelId, "group");
      setGroupName("");
      setGroupDescription("");
      setGroupPortalUserIds([]);
      setShowGroupForm(false);
      setStatus({
        tone: "success",
        text: `Group channel "${data.channel?.name || groupName}" is ready.`,
      });
    } catch (error) {
      setStatus({ tone: "error", text: error.message || "Unable to create the group channel." });
    } finally {
      setBusyAction("");
    }
  };

  const handlePublishAnnouncement = async (event) => {
    event.preventDefault();
    if (!announcementDraft.trim()) return;

    setBusyAction("announcement");
    try {
      await chatService.sendAnnouncement(announcementDraft);
      setAnnouncementDraft("");
      setRefreshKey((value) => value + 1);
      setStatus({
        tone: "success",
        text: "Announcement published to all trainers and SPOC admins.",
      });
    } catch (error) {
      setStatus({ tone: "error", text: error.message || "Unable to publish the announcement." });
    } finally {
      setBusyAction("");
    }
  };

  return {
    activeChannel,
    activeRole,
    activeTab,
    announcementDraft,
    bootstrap,
    bootstrapError,
    busyAction,
    chatClient,
    directContacts,
    directPortalUserId,
    enabled,
    groupCandidates,
    groupDescription,
    groupName,
    groupPortalUserIds,
    handleCreateDirect,
    handleCreateGroup,
    handlePublishAnnouncement,
    handleSelectTab,
    isBootstrapping,
    permissions,
    refreshKey,
    search,
    searchNeedle,
    setActiveChannel,
    setAnnouncementDraft,
    setDirectPortalUserId,
    setGroupDescription,
    setGroupName,
    setSearch,
    setShowDirectForm,
    setShowGroupForm,
    showDirectForm,
    showGroupForm,
    status,
    toggleGroupUser,
  };
};

export default useChatWorkspace;
