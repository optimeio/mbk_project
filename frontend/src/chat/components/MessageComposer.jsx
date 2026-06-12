"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence } from "framer-motion";
import {
  Mic,
  Paperclip,
  Send,
  Smile,
  X,
  FileText,
  Play,
  MapPin,
  Clock3,
} from "lucide-react";
import {
  useChatContext,
  useChannelStateContext,
} from "stream-chat-react";
import {
  ACCEPTED_FILE_TYPES,
  formatFileSize,
  isImageFile,
  isVideoFile,
} from "../utils/helpers";
import {
  uploadFileToCloudinary,
  validateUploadFile,
} from "../utils/cloudinary";
import {
  canSendMessage,
  CHANNEL_TYPES,
  resolveUserRole,
} from "../services/streamClient";
import MediaActionsMenu from "./MediaActionsMenu";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => null,
});

const MAX_TEXTAREA_HEIGHT = 120;
const AUDIO_MIME_TYPE = "audio/webm";
const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

const getSupportedAudioMimeType = () => {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return "";
  }

  return AUDIO_MIME_CANDIDATES.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate),
  ) || "";
};

const getAudioExtension = (mimeType = "") =>
  String(mimeType).includes("mp4") ? "m4a" : "webm";

const getAudioDuration = (file) =>
  new Promise((resolve) => {
    const blobUrl = URL.createObjectURL(file);
    const audio = new Audio(blobUrl);

    const cleanUp = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      URL.revokeObjectURL(blobUrl);
    };

    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      cleanUp();
    };

    audio.onerror = () => {
      resolve(0);
      cleanUp();
    };
  });

function AttachmentPill({ item, onRemove }) {
  const mimeType = item.file?.type || item.type || "";

  return (
    <div className="group relative flex min-w-[170px] max-w-[220px] items-center gap-2 rounded-xl border border-white/10 bg-[#1f2c33] px-2 py-2">
      {isImageFile(mimeType) ? (
        <div className="h-10 w-10 overflow-hidden rounded-md border border-white/10 bg-[#0b141a]">
          <img
            src={item.preview}
            alt={item.file?.name || "image"}
            className="h-full w-full object-cover"
          />
        </div>
      ) : isVideoFile(mimeType) ? (
        <div className="relative h-10 w-10 overflow-hidden rounded-md border border-white/10 bg-black">
          <video src={item.preview} className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/90">
            <Play className="h-3.5 w-3.5" fill="currentColor" />
          </span>
        </div>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-[#2a3942] text-[#aebac1]">
          <FileText className="h-4 w-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#e9edef]">
          {item.file?.name || "attachment"}
        </p>
        <p className="text-[11px] text-[#8696a0]">
          {formatFileSize(item.file?.size || 0)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="rounded-full p-1 text-[#8696a0] transition hover:bg-white/10 hover:text-[#e9edef]"
        aria-label="Remove attachment"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function UploadProgressRow({ item }) {
  const statusLabel =
    item.status === "failed"
      ? "failed"
      : item.progress >= 100
        ? "uploaded"
        : `${item.progress}%`;

  return (
    <div className="rounded-lg border border-white/10 bg-[#1a252b] px-2.5 py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-[#aebac1]">{item.name}</p>
        <p className={`text-[10px] ${item.status === "failed" ? "text-[#ff8f8f]" : "text-[#8696a0]"}`}>{statusLabel}</p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-200 ${item.status === "failed" ? "bg-[#ff5c5c]" : "bg-[#00a884]"}`}
          style={{ width: `${item.progress}%` }}
        />
      </div>
    </div>
  );
}

function formatRecordingTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function buildDraftFile(file) {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    preview: URL.createObjectURL(file),
    type: file.type,
  };
}

export default function MessageComposer({
  isDark,
  onOptimisticSend,
  onOptimisticUpdate,
  onOptimisticRemove,
  onSendRealtimeMessage,
  onTyping,
  isMobile,
}) {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();

  const currentUser = client?.user;
  const currentRole = resolveUserRole(currentUser);
  const channelType = channel?.data?.channel_type || channel?.type;
  const customType = String(channel?.data?.customType || "").toLowerCase();

  const isAnnouncementLane =
    channel?.data?.is_announcement === true ||
    channelType === CHANNEL_TYPES.ANNOUNCEMENT ||
    channel?.type === "admin-announcement-channel" ||
    customType === "announcement" ||
    customType === "broadcast";

  const canSend = canSendMessage(currentRole, channel);

  const composerRef = useRef(null);
  const emojiPanelRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartRef = useRef(0);
  const recordingTimerRef = useRef(null);
  const recordingShouldSendRef = useRef(false);
  const recordingStreamRef = useRef(null);
  const recordingMimeTypeRef = useRef(AUDIO_MIME_TYPE);
  const holdListenersAttachedRef = useRef(false);

  const [draftText, setDraftText] = useState("");
  const [localFiles, setLocalFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [microphoneMessage, setMicrophoneMessage] = useState("");

  const [isHoldingMic, setIsHoldingMic] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const localFilesRef = useRef([]);

  const hasText = Boolean(String(draftText || "").trim());
  const hasAttachments = localFiles.length > 0;
  const shouldShowSend = hasText || hasAttachments;

  const autoResizeTextArea = useCallback(() => {
    const textArea = textareaRef.current;
    if (!textArea) return;

    textArea.style.height = "0px";
    const height = Math.min(textArea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textArea.style.height = `${height}px`;
    textArea.style.overflowY = textArea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    autoResizeTextArea();
  }, [draftText, autoResizeTextArea]);

  useEffect(() => {
    localFilesRef.current = localFiles;
  }, [localFiles]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };

    if (showEmoji) {
      document.addEventListener("mousedown", closeOnOutside);
      document.addEventListener("touchstart", closeOnOutside);
    }

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
    };
  }, [showEmoji]);

  useEffect(() => {
    return () => {
      localFilesRef.current.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  useEffect(() => {
    if (!microphoneMessage) return undefined;
    const timeout = setTimeout(() => setMicrophoneMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [microphoneMessage]);

  const stopRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const cleanupRecorderResources = useCallback(() => {
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current = null;
    }

    recordedChunksRef.current = [];
    recordingShouldSendRef.current = false;
    recordingMimeTypeRef.current = AUDIO_MIME_TYPE;
    stopRecordingTimer();
  }, [stopRecordingTimer]);

  const resetRecordingUi = useCallback(() => {
    setIsRecording(false);
    setIsHoldingMic(false);
    setRecordingSeconds(0);
  }, []);

  const clearDraftAndFiles = useCallback(() => {
    setDraftText("");

    localFiles.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
    setLocalFiles([]);

    if (typeof onTyping === "function") {
      onTyping("");
    }
  }, [localFiles, onTyping]);

  const initializeUploadProgress = useCallback((messageId, files) => {
    const rows = files.map((file, fileIndex) => ({
      id: `${messageId}-${fileIndex}`,
      messageId,
      fileIndex,
      name: file.name,
      progress: 0,
      status: "uploading",
    }));
    setUploadingFiles((prev) => [...prev, ...rows]);
  }, []);

  const setUploadProgressForFile = useCallback((messageId, fileIndex, patch) => {
    setUploadingFiles((prev) =>
      prev.map((entry) => {
        if (entry.messageId !== messageId || entry.fileIndex !== fileIndex) return entry;
        return { ...entry, ...patch };
      }),
    );
  }, []);

  const clearUploadProgressForMessage = useCallback((messageId) => {
    setUploadingFiles((prev) => prev.filter((entry) => entry.messageId !== messageId));
  }, []);

  const validateDraftFiles = useCallback((files) => {
    if (!files?.length) return [];

    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      const validation = validateUploadFile(file);
      if (validation.ok) {
        validFiles.push(file);
        return;
      }
      errors.push(`${file.name}: ${validation.reason}`);
    });

    if (errors.length) {
      setMicrophoneMessage(errors[0]);
    }

    return validFiles;
  }, []);

  const addFilesToDraft = useCallback(
    (files) => {
      if (!files?.length) return;
      const validFiles = validateDraftFiles(files);
      if (!validFiles.length) return;
      const prepared = validFiles.map(buildDraftFile);
      setLocalFiles((prev) => [...prev, ...prepared]);
    },
    [validateDraftFiles],
  );

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (!acceptedFiles?.length) return;
      addFilesToDraft(acceptedFiles);
    },
    [addFilesToDraft],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: true,
    accept: ACCEPTED_FILE_TYPES,
  });

  const removeLocalFile = useCallback((id) => {
    setLocalFiles((prev) => {
      const target = prev.find((entry) => entry.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((entry) => entry.id !== id);
    });
  }, []);

  const syncTextToContext = useCallback(
    (nextValue) => {
      setDraftText(nextValue);

      if (typeof onTyping === "function") {
        onTyping(nextValue);
      }
    },
    [onTyping],
  );

  const insertAtCursor = useCallback(
    (insertValue) => {
      const textArea = textareaRef.current;
      if (!textArea) return;

      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const current = draftText || "";
      const nextValue = `${current.slice(0, start)}${insertValue}${current.slice(end)}`;

      syncTextToContext(nextValue);

      requestAnimationFrame(() => {
        textArea.focus();
        const caret = start + insertValue.length;
        textArea.setSelectionRange(caret, caret);
      });
    },
    [draftText, syncTextToContext],
  );

  const handleEmojiSelect = (emojiData) => {
    if (!emojiData?.emoji) return;
    insertAtCursor(emojiData.emoji);
  };

  const sendMessage = useCallback(
    async ({ textOverride, filesOverride, forceType = null, duration = 0 } = {}) => {
      const textToSend = typeof textOverride === "string" ? textOverride : draftText;
      const normalizedText = String(textToSend || "").trim();
      const draftFiles = Array.isArray(filesOverride)
        ? filesOverride
        : localFiles.map((entry) => entry.file).filter(Boolean);

      if (!normalizedText && draftFiles.length === 0) return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const hasFiles = draftFiles.length > 0;
      const progressTracker = draftFiles.map(() => 0);

      const optimisticMessage = {
        id: tempId,
        text: normalizedText,
        user: currentUser,
        created_at: new Date().toISOString(),
        isPending: true,
        uploadStatus: hasFiles ? "uploading" : "sending",
        uploadProgress: hasFiles ? 0 : 100,
        attachments: draftFiles.map((file) => ({
          type: file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : file.type.startsWith("audio/")
                ? "audio"
                : "file",
          asset_url: URL.createObjectURL(file),
          mime_type: file.type,
          name: file.name,
          file_size: file.size,
          uploadStatus: "uploading",
          uploadProgress: 0,
        })),
      };

      if (typeof onOptimisticSend === "function") {
        onOptimisticSend(optimisticMessage);
      }

      setShowEmoji(false);
      setShowMediaMenu(false);
      clearDraftAndFiles();

      if (hasFiles) {
        initializeUploadProgress(tempId, draftFiles);
      }

      const updateOptimisticProgress = ({
        fileIndex,
        progress,
        status = "uploading",
        uploadedUrl = null,
        error = null,
      }) => {
        if (!Number.isInteger(fileIndex) || !hasFiles) return;

        const clamped = Math.max(0, Math.min(100, Number(progress || 0)));
        progressTracker[fileIndex] = clamped;
        const aggregateProgress = Math.round(
          progressTracker.reduce((sum, value) => sum + value, 0) / progressTracker.length,
        );

        setUploadProgressForFile(tempId, fileIndex, {
          progress: clamped,
          status: status === "error" ? "failed" : status,
        });

        if (typeof onOptimisticUpdate === "function") {
          onOptimisticUpdate(tempId, (prevMessage) => {
            const nextAttachments = Array.isArray(prevMessage.attachments)
              ? prevMessage.attachments.map((attachment, index) => {
                  if (index !== fileIndex) return attachment;
                  const nextStatus = status === "error" ? "failed" : (status === "uploaded" ? "sent" : "uploading");
                  const isImageAttachment = attachment.type === "image";
                  return {
                    ...attachment,
                    uploadProgress: clamped,
                    uploadStatus: nextStatus,
                    ...(uploadedUrl
                      ? {
                          asset_url: uploadedUrl,
                          ...(isImageAttachment
                            ? { image_url: uploadedUrl, thumb_url: uploadedUrl }
                            : {}),
                        }
                      : {}),
                  };
                })
              : [];

            return {
              ...prevMessage,
              uploadProgress: aggregateProgress,
              uploadStatus: status === "error" ? "failed" : (aggregateProgress >= 100 ? "sent" : "uploading"),
              attachments: nextAttachments,
              ...(error ? { errorMessage: String(error) } : {}),
            };
          });
        }

        if (status === "error" && error) {
          setMicrophoneMessage(String(error));
        }
      };

      const performSend = async () => {
        try {
          if (typeof onSendRealtimeMessage === "function") {
            await onSendRealtimeMessage({
              text: normalizedText,
              files: draftFiles,
              forceType,
              duration,
              tempId,
              onUploadProgress: updateOptimisticProgress,
            });
          } else {
            const attachments = [];

            for (let fileIndex = 0; fileIndex < draftFiles.length; fileIndex += 1) {
              const file = draftFiles[fileIndex];
              const isImage = file.type.startsWith("image/");
              const isAudio = file.type.startsWith("audio/");
              const isVideo = file.type.startsWith("video/");

              const uploadResult = await uploadFileToCloudinary(file, {
                onProgress: (progress) => {
                  updateOptimisticProgress({
                    fileIndex,
                    progress,
                    status: "uploading",
                  });
                },
              });

              const mediaUrl = uploadResult?.optimizedUrl || uploadResult?.secureUrl || null;
              if (!mediaUrl) {
                updateOptimisticProgress({
                  fileIndex,
                  progress: 0,
                  status: "error",
                  error: `Failed to upload file: ${file?.name || "attachment"}`,
                });
                continue;
              }

              updateOptimisticProgress({
                fileIndex,
                progress: 100,
                status: "uploaded",
                uploadedUrl: mediaUrl,
              });

              const durationValue = isAudio ? await getAudioDuration(file) : 0;
              attachments.push({
                type: isImage
                  ? "image"
                  : isVideo
                    ? "video"
                    : isAudio
                      ? "audio"
                      : "file",
                asset_url: mediaUrl,
                mime_type: file.type,
                name: file.name,
                file_size: file.size,
                ...(isAudio && durationValue > 0 ? { duration: durationValue } : {}),
                ...(isImage ? { image_url: mediaUrl, thumb_url: mediaUrl } : {}),
              });
            }

            if (normalizedText || attachments.length > 0) {
              await channel.sendMessage({
                text: normalizedText,
                attachments,
              });
            }
          }

          if (typeof onOptimisticUpdate === "function") {
            onOptimisticUpdate(tempId, (prevMessage) => ({
              ...prevMessage,
              isPending: false,
              uploadStatus: "sent",
              uploadProgress: 100,
            }));
          }

          if (typeof onOptimisticRemove === "function" && typeof onSendRealtimeMessage !== "function") {
            setTimeout(() => onOptimisticRemove(tempId), 500);
          }
          if (typeof onOptimisticRemove === "function" && typeof onSendRealtimeMessage === "function") {
            // Keep temporary bubble long enough for socket reconciliation; cleanup safety fallback.
            setTimeout(() => onOptimisticRemove(tempId), 15000);
          }

          setTimeout(() => clearUploadProgressForMessage(tempId), 450);
        } catch (error) {
          console.error("Failed to send message:", error);
          if (typeof onOptimisticUpdate === "function") {
            onOptimisticUpdate(tempId, (prevMessage) => ({
              ...prevMessage,
              isPending: false,
              uploadStatus: "failed",
              errorMessage: error?.message || "Failed to send message",
            }));
          }

          if (!hasFiles) {
            setMicrophoneMessage(error?.message || "Failed to send message");
          } else {
            setTimeout(() => clearUploadProgressForMessage(tempId), 3500);
          }
        } finally {
          requestAnimationFrame(() => {
            const list = document.querySelector(".chat-messages-area, .wa-message-area");
            if (list) {
              list.scrollTop = list.scrollHeight;
            }
          });
        }
      };

      void performSend();
    },
    [
      draftText,
      localFiles,
      onOptimisticSend,
      onOptimisticUpdate,
      onOptimisticRemove,
      clearDraftAndFiles,
      initializeUploadProgress,
      clearUploadProgressForMessage,
      setUploadProgressForFile,
      onSendRealtimeMessage,
      channel,
      currentUser,
    ],
  );

  const handleTextKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const promptFilePicker = useCallback((targetRef) => {
    if (!targetRef.current) return;
    targetRef.current.value = "";
    targetRef.current.click();
  }, []);

  const handleMediaSelect = useCallback(
    async (mediaType) => {
      if (mediaType === "image") {
        promptFilePicker(imageInputRef);
        return;
      }

      if (mediaType === "video") {
        promptFilePicker(videoInputRef);
        return;
      }

      if (mediaType === "document") {
        promptFilePicker(documentInputRef);
        return;
      }

      if (mediaType === "camera") {
        promptFilePicker(cameraInputRef);
        return;
      }

      if (mediaType === "location") {
        if (!navigator.geolocation) return;

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude.toFixed(6);
            const longitude = position.coords.longitude.toFixed(6);
            const locationMessage = `https://maps.google.com/?q=${latitude},${longitude}`;
            syncTextToContext(`${draftText ? `${draftText.trim()} ` : ""}${locationMessage}`.trim());
            setIsLocating(false);
            setShowMediaMenu(false);
          },
          () => {
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 15000 },
        );
      }
    },
    [draftText, promptFilePicker, syncTextToContext],
  );

  const handleInputFiles = useCallback(
    (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      addFilesToDraft(files);
    },
    [addFilesToDraft],
  );

  const completeVoiceRecording = useCallback(
    async (blob, durationSeconds, mimeType = AUDIO_MIME_TYPE) => {
      if (!blob || blob.size === 0) return;
      const safeMime = mimeType || AUDIO_MIME_TYPE;
      const extension = getAudioExtension(safeMime);

      const voiceFile = new File(
        [blob],
        `voice-${Date.now()}.${extension}`,
        { type: safeMime },
      );

      await sendMessage({
        filesOverride: [voiceFile],
        forceType: "voice",
        duration: durationSeconds,
      });
    },
    [sendMessage],
  );

  const stopAndHandleRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      resetRecordingUi();
      cleanupRecorderResources();
      return;
    }

    recordingShouldSendRef.current = true;
    stopRecordingTimer();

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [cleanupRecorderResources, resetRecordingUi, stopRecordingTimer]);

  const cancelHeldRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      resetRecordingUi();
      cleanupRecorderResources();
      return;
    }

    recordingShouldSendRef.current = false;
    stopRecordingTimer();

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [cleanupRecorderResources, resetRecordingUi, stopRecordingTimer]);

  const releaseHoldListeners = useCallback(() => {
    if (!holdListenersAttachedRef.current) return;

    window.removeEventListener("pointerup", stopAndHandleRecording);
    window.removeEventListener("pointercancel", cancelHeldRecording);
    window.removeEventListener("blur", cancelHeldRecording);
    holdListenersAttachedRef.current = false;
  }, [cancelHeldRecording, stopAndHandleRecording]);

  const startHoldListeners = useCallback(() => {
    if (holdListenersAttachedRef.current) return;

    window.addEventListener("pointerup", stopAndHandleRecording);
    window.addEventListener("pointercancel", cancelHeldRecording);
    window.addEventListener("blur", cancelHeldRecording);
    holdListenersAttachedRef.current = true;
  }, [cancelHeldRecording, stopAndHandleRecording]);

  useEffect(
    () => () => {
      releaseHoldListeners();
      cleanupRecorderResources();
    },
    [releaseHoldListeners, cleanupRecorderResources],
  );

  const startVoiceRecording = useCallback(async () => {
    if (isRecording || shouldShowSend) return;

    try {
      setMicrophoneMessage("");
      if (
        !navigator?.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setMicrophoneMessage("Voice recording is not supported in this browser.");
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        setMicrophoneMessage("MediaRecorder is not available in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMime = getSupportedAudioMimeType();
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      recordingStartRef.current = Date.now();
      recordingShouldSendRef.current = false;
      recordingMimeTypeRef.current =
        recorder.mimeType || supportedMime || AUDIO_MIME_TYPE;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const durationSeconds = Math.max(
          0.1,
          (Date.now() - recordingStartRef.current) / 1000,
        );

        const shouldSend = recordingShouldSendRef.current;
        const blobType = recordingMimeTypeRef.current || AUDIO_MIME_TYPE;
        const blob = new Blob(recordedChunksRef.current, { type: blobType });

        releaseHoldListeners();
        resetRecordingUi();
        cleanupRecorderResources();

        if (!shouldSend || !blob.size) return;

        await completeVoiceRecording(blob, durationSeconds, blobType);
      };

      recorder.start(200);
      setIsHoldingMic(true);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      startHoldListeners();
    } catch (error) {
      const errorName = String(error?.name || "");
      const isPermissionDenied =
        errorName === "NotAllowedError" || errorName === "PermissionDeniedError";
      if (isPermissionDenied) {
        setMicrophoneMessage("Microphone permission denied. Please allow mic access.");
      } else {
        setMicrophoneMessage("Could not start voice recording.");
        console.warn("Microphone access failed:", error);
      }
      releaseHoldListeners();
      resetRecordingUi();
      cleanupRecorderResources();
    }
  }, [
    isRecording,
    shouldShowSend,
    cleanupRecorderResources,
    completeVoiceRecording,
    resetRecordingUi,
    releaseHoldListeners,
    startHoldListeners,
  ]);

  if (!canSend) {
    return (
      <div className="border-t border-black/10 bg-[#f0f2f5] px-4 py-3 text-center text-xs font-medium text-[#667781]">
        {isAnnouncementLane
          ? "Broadcast lane is read-only for this role."
          : "You do not have permission to send messages in this channel."}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      ref={composerRef}
      className={`relative border-t ${
        isMobile ? "px-2 pb-2 pt-1" : "px-4 pb-3 pt-2"
      }`}
      style={{
        backgroundColor: "#202c33",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <input {...getInputProps()} />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputFiles}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleInputFiles}
        className="hidden"
      />
      <input
        ref={documentInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleInputFiles}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputFiles}
        className="hidden"
      />

      <AnimatePresence>
        {isDragActive ? (
          <div className="absolute inset-2 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#00a884] bg-[#111b21]/95">
            <p className="text-sm font-medium text-[#e9edef]">Drop files to attach</p>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {localFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#111b21]/90 p-2">
            {localFiles.map((item) => (
              <AttachmentPill key={item.id} item={item} onRemove={removeLocalFile} />
            ))}
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {uploadingFiles.length > 0 ? (
          <div className="mb-2 space-y-1.5 rounded-xl border border-white/10 bg-[#111b21]/90 p-2">
            {uploadingFiles.map((item) => (
              <UploadProgressRow key={item.id} item={item} />
            ))}
          </div>
        ) : null}
      </AnimatePresence>

      <div className="relative flex items-end gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowMediaMenu((prev) => !prev);
              setShowEmoji(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#8696a0] transition hover:bg-white/10 hover:text-[#e9edef]"
            aria-label="Attachment menu"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <MediaActionsMenu
            isOpen={showMediaMenu}
            onClose={() => setShowMediaMenu(false)}
            onSelect={handleMediaSelect}
            isDark={isDark}
          />
        </div>

        <div className="relative flex-1">
          <div className="flex min-h-[42px] items-end rounded-2xl px-2.5 py-1.5" style={{ backgroundColor: "#2a3942" }}>
            <div ref={emojiPanelRef} className="relative mr-1">
              <button
                type="button"
                onClick={() => {
                  setShowEmoji((prev) => !prev);
                  setShowMediaMenu(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8696a0] transition hover:bg-white/10 hover:text-[#e9edef]"
                aria-label="Emoji picker"
              >
                <Smile className="h-5 w-5" />
              </button>

              <AnimatePresence>
                {showEmoji ? (
                  <div className="absolute bottom-11 left-0 z-40 overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                    <EmojiPicker
                      onEmojiClick={handleEmojiSelect}
                      searchDisabled={false}
                      skinTonesDisabled={false}
                      previewConfig={{ showPreview: false }}
                      width={300}
                      height={340}
                      theme={isDark ? "dark" : "light"}
                    />
                  </div>
                ) : null}
              </AnimatePresence>
            </div>

            {isRecording ? (
              <div className="flex h-[30px] flex-1 items-center justify-between rounded-lg bg-[#1f2c33] px-3 text-sm text-[#e9edef]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="font-medium">Recording</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#aebac1]">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span className="font-mono text-xs">{formatRecordingTime(recordingSeconds)}</span>
                </div>
                <span className="text-xs text-[#00a884]">Tap mic again to send</span>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={draftText}
                onChange={(event) => syncTextToContext(event.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="max-h-[120px] flex-1 resize-none overflow-y-auto bg-transparent px-1.5 py-1 text-[15px] leading-5 text-[#e9edef] outline-none placeholder:text-[#8696a0]"
              />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (shouldShowSend) {
              sendMessage();
            }
          }}
          onPointerDown={(event) => {
            if (shouldShowSend) return;
            event.preventDefault();
            if (isRecording || mediaRecorderRef.current) {
              stopAndHandleRecording();
              return;
            }
            startVoiceRecording();
          }}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 ${
            shouldShowSend ? "bg-[#00a884]" : "bg-[#00a884]"
          } ${isHoldingMic ? "scale-95" : ""}`}
          aria-label={shouldShowSend ? "Send message" : "Hold to record voice"}
          disabled={isLocating}
          title={shouldShowSend ? "Send" : "Hold to record"}
        >
          {shouldShowSend ? (
            <Send className="h-4.5 w-4.5" />
          ) : (
            <Mic className="h-4.5 w-4.5" />
          )}
        </button>
      </div>

      {isLocating ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-[#aebac1]">
          <MapPin className="h-3.5 w-3.5 text-[#00a884]" />
          <span>Fetching current location...</span>
        </div>
      ) : null}
      {microphoneMessage ? (
        <div className="mt-2 text-xs font-medium text-[#ff8f8f]">
          {microphoneMessage}
        </div>
      ) : null}
    </div>
  );
}
