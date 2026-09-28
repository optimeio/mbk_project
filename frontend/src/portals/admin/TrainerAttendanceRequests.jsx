"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Card,
  Tag,
  Button,
  Modal,
  Input,
  Space,
  Typography,
  Breadcrumb,
  Badge,
  Descriptions,
  Image,
  Spin,
  Alert,
  message,
  Tabs,
  Tooltip,
} from "antd";
import Link from "next/link";
import dayjs from "dayjs";
import {
  Clock,
  Calendar,
  User,
  Building2,
  GraduationCap,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  Camera,
  Layers,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { api } from "@/services/api";
import { getSecureImageUrl } from "@/utils/imageUtils";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const extractLinkOrId = (meta) => {
  if (!meta) return null;
  if (typeof meta === "string") {
    const trimmed = meta.trim();
    if (trimmed.startsWith("http")) return trimmed;
    if (trimmed.length > 5 && !trimmed.includes("/") && !trimmed.includes(" ")) {
      return `https://drive.google.com/drive/folders/${trimmed}`;
    }
    return null;
  }
  if (typeof meta === "object") {
    if (meta.webViewLink && typeof meta.webViewLink === "string" && meta.webViewLink.startsWith("http")) return meta.webViewLink;
    if (meta.link && typeof meta.link === "string" && meta.link.startsWith("http")) return meta.link;
    if (meta.driveFolderLink && typeof meta.driveFolderLink === "string" && meta.driveFolderLink.startsWith("http")) return meta.driveFolderLink;
    if (meta.driveFolderUrl && typeof meta.driveFolderUrl === "string" && meta.driveFolderUrl.startsWith("http")) return meta.driveFolderUrl;
    const fId = meta.id || meta.driveFolderId || meta.folderId || meta.dayFolderId;
    if (fId && typeof fId === "string" && fId.trim().length > 5) {
      return `https://drive.google.com/drive/folders/${fId.trim()}`;
    }
  }
  return null;
};

const getHierarchyMeta = (record) => {
  if (!record) return { sessionMeta: null, dayMeta: null };
  const dayNum = Number(record.dayNumber || record.scheduleId?.dayNumber || 1);
  const sessionType = String(record.session || record.scheduleId?.session || "FN").trim().toUpperCase();
  const sessionKey = sessionType === "AN" ? "anFolder" : "fnFolder";

  let trainerDayFolders = null;
  if (Array.isArray(record.trainerId?.colleges) && record.trainerId.colleges.length > 0) {
    const colIdStr = String(record.collegeId?._id || record.collegeId || record.scheduleId?.collegeId?._id || record.scheduleId?.collegeId || "");
    let matchedCollege = record.trainerId.colleges.find((c) => {
      const cId = String(c?.collegeId?._id || c?.collegeId || c?._id || "");
      return cId && colIdStr && cId === colIdStr;
    });
    if (!matchedCollege) {
      matchedCollege = record.trainerId.colleges.find((c) => Array.isArray(c?.dayFolders) && c.dayFolders.length > 0) || record.trainerId.colleges[0];
    }
    if (Array.isArray(matchedCollege?.dayFolders)) {
      trainerDayFolders = matchedCollege.dayFolders.find((d) => Number(d?.day) === dayNum);
    }
  }

  const scheduleDayMeta = record.scheduleId?.dayFoldersByDayNumber?.[dayNum] || record.scheduleId?.dayFoldersByDayNumber?.[String(dayNum)] || null;

  const sessionMeta =
    record.driveAssets?.sessionFolder ||
    record.scheduleId?.driveAssets?.sessionFolder ||
    record.scheduleId?.[sessionKey] ||
    record[sessionKey] ||
    scheduleDayMeta?.[sessionKey] ||
    trainerDayFolders?.[sessionKey] ||
    null;

  const dayMeta =
    record.driveAssets?.dayFolder ||
    record.scheduleId?.driveAssets?.dayFolder ||
    scheduleDayMeta ||
    trainerDayFolders ||
    null;

  return { sessionMeta, dayMeta, trainerDayFolders, sessionKey, dayNum };
};

const ROOT_TRAINER_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1Sy_OM3laf4VJBmsfamvIAHQMV7hYjPDl";

export const resolveSessionFolderUrl = (record) => {
  if (!record) return ROOT_TRAINER_DRIVE_FOLDER_URL;
  if (record.sessionFolderUrl && typeof record.sessionFolderUrl === "string" && record.sessionFolderUrl.startsWith("http") && !record.sessionFolderUrl.includes("my-drive")) return record.sessionFolderUrl;
  if (record.driveFolderUrl && typeof record.driveFolderUrl === "string" && record.driveFolderUrl.startsWith("http") && !record.driveFolderUrl.includes("my-drive")) return record.driveFolderUrl;

  const { sessionMeta, dayMeta, trainerDayFolders, sessionKey } = getHierarchyMeta(record);

  const sessionLink = extractLinkOrId(sessionMeta) || extractLinkOrId(trainerDayFolders?.[sessionKey]);
  if (sessionLink && !sessionLink.includes("my-drive")) return sessionLink;

  const dayLink = extractLinkOrId(dayMeta) || extractLinkOrId(trainerDayFolders) || extractLinkOrId(record.dayFolderLink || record.dayFolderId) || extractLinkOrId(record.scheduleId?.dayFolderLink || record.scheduleId?.dayFolderId);
  if (dayLink && !dayLink.includes("my-drive")) return dayLink;

  const trainerLink = extractLinkOrId(record.trainerId?.googleDriveFolderId || record.trainerId?.driveFolderId);
  if (trainerLink && !trainerLink.includes("my-drive")) return trainerLink;

  const collegeLink = extractLinkOrId(record.collegeId?.googleDriveFolderId || record.collegeId?.driveFolderId || record.collegeId?.driveFolderLink || record.scheduleId?.collegeId?.googleDriveFolderId || record.scheduleId?.collegeId?.driveFolderId);
  if (collegeLink && !collegeLink.includes("my-drive")) return collegeLink;

  return ROOT_TRAINER_DRIVE_FOLDER_URL;
};

export const resolveDriveFolderUrl = resolveSessionFolderUrl;

export const resolveCheckInFolderUrl = (record) => {
  if (!record) return ROOT_TRAINER_DRIVE_FOLDER_URL;
  if (record.checkInFolderUrl && typeof record.checkInFolderUrl === "string" && record.checkInFolderUrl.startsWith("http") && !record.checkInFolderUrl.includes("my-drive")) return record.checkInFolderUrl;

  const { sessionMeta, dayMeta, trainerDayFolders, sessionKey } = getHierarchyMeta(record);
  const docs = Array.isArray(record.documents) ? record.documents : (Array.isArray(record.scheduleDocuments) ? record.scheduleDocuments : []);
  const checkInDoc = docs.find((d) => d?.driveFolderId && (d.fileType === "geotag" || String(d.fileField || "").toLowerCase().includes("checkin") || /check.?in/i.test(d.fileName || "")));

  return (
    extractLinkOrId(sessionMeta?.checkInFolder) ||
    extractLinkOrId(trainerDayFolders?.[sessionKey]?.checkInFolder) ||
    extractLinkOrId(dayMeta?.checkInFolder) ||
    (checkInDoc?.driveFolderId ? `https://drive.google.com/drive/folders/${checkInDoc.driveFolderId}` : null) ||
    extractLinkOrId(record.driveAssets?.folders?.checkIn || record.driveAssets?.folders?.geoTag) ||
    extractLinkOrId(dayMeta?.checkIn || dayMeta?.geo_tag) ||
    resolveSessionFolderUrl(record)
  );
};

export const resolveAttendanceFolderUrl = (record) => {
  if (!record) return ROOT_TRAINER_DRIVE_FOLDER_URL;
  if (record.attendanceFolderUrl && typeof record.attendanceFolderUrl === "string" && record.attendanceFolderUrl.startsWith("http") && !record.attendanceFolderUrl.includes("my-drive")) return record.attendanceFolderUrl;

  const { sessionMeta, dayMeta, trainerDayFolders, sessionKey } = getHierarchyMeta(record);
  const docs = Array.isArray(record.documents) ? record.documents : (Array.isArray(record.scheduleDocuments) ? record.scheduleDocuments : []);
  const attDoc = docs.find((d) => d?.driveFolderId && (d.fileType === "attendance" || String(d.fileField || "").toLowerCase().includes("attendance") || /attendance|sheet|roster/i.test(d.fileName || "")));

  return (
    extractLinkOrId(sessionMeta?.attendanceFolder) ||
    extractLinkOrId(trainerDayFolders?.[sessionKey]?.attendanceFolder) ||
    extractLinkOrId(dayMeta?.attendanceFolder) ||
    (attDoc?.driveFolderId ? `https://drive.google.com/drive/folders/${attDoc.driveFolderId}` : null) ||
    extractLinkOrId(record.driveAssets?.folders?.attendance) ||
    extractLinkOrId(dayMeta?.attendance) ||
    resolveSessionFolderUrl(record)
  );
};

export const resolveActivitiesFolderUrl = (record) => {
  if (!record) return ROOT_TRAINER_DRIVE_FOLDER_URL;
  if (record.studentActivitiesFolderUrl && typeof record.studentActivitiesFolderUrl === "string" && record.studentActivitiesFolderUrl.startsWith("http") && !record.studentActivitiesFolderUrl.includes("my-drive")) return record.studentActivitiesFolderUrl;

  const { sessionMeta, dayMeta, trainerDayFolders, sessionKey } = getHierarchyMeta(record);
  const docs = Array.isArray(record.documents) ? record.documents : (Array.isArray(record.scheduleDocuments) ? record.scheduleDocuments : []);
  const actDoc = docs.find((d) => d?.driveFolderId && (d.fileType === "activity" || String(d.fileField || "").toLowerCase().includes("activity") || /activity|classroom/i.test(d.fileName || "")));

  return (
    extractLinkOrId(sessionMeta?.studentActivitiesFolder) ||
    extractLinkOrId(trainerDayFolders?.[sessionKey]?.studentActivitiesFolder) ||
    extractLinkOrId(dayMeta?.studentActivitiesFolder) ||
    (actDoc?.driveFolderId ? `https://drive.google.com/drive/folders/${actDoc.driveFolderId}` : null) ||
    extractLinkOrId(record.driveAssets?.folders?.studentActivity || record.driveAssets?.folders?.studentActivities) ||
    extractLinkOrId(dayMeta?.studentActivities) ||
    resolveSessionFolderUrl(record)
  );
};

export const resolveCheckOutFolderUrl = (record) => {
  if (!record) return ROOT_TRAINER_DRIVE_FOLDER_URL;
  if (record.checkOutFolderUrl && typeof record.checkOutFolderUrl === "string" && record.checkOutFolderUrl.startsWith("http") && !record.checkOutFolderUrl.includes("my-drive")) return record.checkOutFolderUrl;

  const { sessionMeta, dayMeta, trainerDayFolders, sessionKey } = getHierarchyMeta(record);
  const docs = Array.isArray(record.documents) ? record.documents : (Array.isArray(record.scheduleDocuments) ? record.scheduleDocuments : []);
  const checkOutDoc = docs.find((d) => d?.driveFolderId && (d.fileType === "checkout" || String(d.fileField || "").toLowerCase().includes("checkout") || /check.?out/i.test(d.fileName || "")));

  return (
    extractLinkOrId(sessionMeta?.checkOutFolder) ||
    extractLinkOrId(trainerDayFolders?.[sessionKey]?.checkOutFolder) ||
    extractLinkOrId(dayMeta?.checkOutFolder) ||
    (checkOutDoc?.driveFolderId ? `https://drive.google.com/drive/folders/${checkOutDoc.driveFolderId}` : null) ||
    extractLinkOrId(record.driveAssets?.folders?.checkOut) ||
    extractLinkOrId(dayMeta?.checkOut) ||
    resolveSessionFolderUrl(record)
  );
};

export default function TrainerAttendanceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  
  // Review Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("limit", String(pageSize));
      if (statusFilter !== "all") {
        queryParams.set("status", statusFilter);
      }
      const res = await api.get(`/attendance/late-requests?${queryParams.toString()}`);
      if (res?.success) {
        setRequests(Array.isArray(res.requests) ? res.requests : Array.isArray(res.data) ? res.data : []);
        setTotal(res.pagination?.total ?? res.total ?? (Array.isArray(res.requests) ? res.requests.length : 0));
      } else if (Array.isArray(res?.requests)) {
        setRequests(res.requests);
        setTotal(res.pagination?.total || res.requests.length);
      } else if (Array.isArray(res?.data)) {
        setRequests(res.data);
        setTotal(res.total || res.data.length);
      } else if (Array.isArray(res)) {
        setRequests(res);
        setTotal(res.length);
      } else {
        setRequests([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("Error fetching late attendance requests:", err);
      message.error("Failed to load late attendance requests");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenReview = (record) => {
    setSelectedRecord(record);
    setAdminRemarks(record?.lateRequestAdminRemarks || record?.verificationComment || "");
    setReviewModalVisible(true);
  };

  const handleVerify = async (action) => {
    if (!selectedRecord) return;
    if (action === "reject" && !adminRemarks.trim()) {
      message.warning("Please specify remarks/reason for rejecting this request.");
      return;
    }

    try {
      setIsVerifying(true);
      const res = await api.put(`/attendance/late-requests/${selectedRecord._id}/verify`, {
        action,
        remarks: adminRemarks.trim(),
      });

      if (res?.success) {
        message.success(
          `Request ${action === "approve" ? "approved" : "rejected"} successfully!`
        );
        setReviewModalVisible(false);
        fetchRequests();
      } else {
        throw new Error(res?.message || `Failed to ${action} request`);
      }
    } catch (err) {
      console.error("Error verifying request:", err);
      message.error(err.response?.data?.message || err.message || "Action failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredRequests = useMemo(() => {
    if (!searchText.trim()) return requests;
    const term = searchText.toLowerCase();
    return requests.filter((item) => {
      const trainerName = String(item.trainerId?.userId?.name || item.trainerId?.name || "").toLowerCase();
      const collegeName = String(item.collegeId?.name || "").toLowerCase();
      const courseName = String(item.courseId?.title || item.courseId?.name || "").toLowerCase();
      const reason = String(item.lateRequestReason || "").toLowerCase();
      return trainerName.includes(term) || collegeName.includes(term) || courseName.includes(term) || reason.includes(term);
    });
  }, [requests, searchText]);

  const columns = [
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Request Raised</span>,
      dataIndex: "lateRequestSubmittedAt",
      key: "lateRequestSubmittedAt",
      width: 150,
      render: (val, record) => {
        const dateVal = val || record.checkIn?.time || record.checkInTime || record.createdAt;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1f2937", whiteSpace: "nowrap" }}>
              {dateVal ? dayjs(dateVal).format("DD MMM YYYY") : "-"}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
              {dateVal ? dayjs(dateVal).format("hh:mm A") : "-"}
            </div>
          </div>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Scheduled Session</span>,
      key: "scheduleInfo",
      width: 170,
      render: (_, record) => {
        const sched = record.scheduleId || {};
        const schedDate = sched.scheduledDate || record.date;
        const dayNum = record.dayNumber || sched.dayNumber || null;
        const session = String(record.session || sched.session || "FN").toUpperCase() === "AN" ? "AN" : "FN";
        const sessionColor = session === "AN" ? "purple" : "blue";

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", whiteSpace: "nowrap" }}>
              {schedDate ? dayjs(schedDate).format("DD MMM YYYY") : "-"}
            </div>
            <Space size={4}>
              {dayNum ? <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>Day {dayNum}</Tag> : null}
              <Tag color={sessionColor} style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>
                {session}
              </Tag>
            </Space>
          </div>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Trainer</span>,
      key: "trainer",
      width: 180,
      render: (_, record) => {
        const name = record.trainerId?.userId?.name || record.trainerId?.name || "Unknown Trainer";
        const id = record.trainerId?.trainerId || "-";
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", wordBreak: "break-word" }}>{name}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>ID: {id}</div>
          </div>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>College & Course</span>,
      key: "collegeCourse",
      width: 220,
      render: (_, record) => {
        const collegeName = record.collegeId?.name || "-";
        const courseName = record.courseId?.title || record.courseId?.name || record.scheduleId?.subject || "-";
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#1f2937", lineHeight: 1.3, wordBreak: "break-word" }}>{collegeName}</div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2, wordBreak: "break-word" }}>{courseName}</div>
          </div>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Reason / Topic</span>,
      dataIndex: "lateRequestReason",
      key: "lateRequestReason",
      width: 200,
      render: (val, record) => {
        const displayVal = val || (record.syllabus ? `Topic: ${record.syllabus}` : "Attendance verification requested");
        return (
          <Tooltip title={displayVal}>
            <div
              style={{
                fontSize: 12,
                color: "#4b5563",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {displayVal}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Proofs</span>,
      key: "proofs",
      width: 180,
      render: (_, record) => {
        const checkInImg = record.imageUrl || record.checkInPhoto || record.checkIn?.photo;
        const hasCheckIn = Boolean(checkInImg);
        const validStudentsPhoto = record.studentsPhotoUrl && record.studentsPhotoUrl !== checkInImg ? record.studentsPhotoUrl : null;
        const studentImagesCount = Array.isArray(record.studentAttendanceImageUrls) ? record.studentAttendanceImageUrls.length : 0;
        const hasStudentDoc = Boolean(record.attendancePdfUrl || record.attendanceExcelUrl || validStudentsPhoto || studentImagesCount > 0);
        const activityCount = Array.isArray(record.activityPhotos) ? record.activityPhotos.length : 0;
        const hasCheckOut = Boolean(record.checkOutGeoImageUrl || record.checkOut?.photos?.length);

        return (
          <div className="flex flex-col gap-1">
            <Space size={4}>
              <Tag color={hasCheckIn ? "cyan" : "default"} style={{ margin: 0, fontSize: 10 }}>
                Check-In {hasCheckIn ? "✓" : "✗"}
              </Tag>
              <Tag color={hasStudentDoc ? "blue" : "default"} style={{ margin: 0, fontSize: 10 }}>
                Roster {studentImagesCount > 1 ? `(${studentImagesCount})` : hasStudentDoc ? "✓" : "✗"}
              </Tag>
            </Space>
            <Space size={4}>
              <Tag color={activityCount > 0 ? "purple" : "default"} style={{ margin: 0, fontSize: 10 }}>
                Activities ({activityCount})
              </Tag>
              <Tag color={hasCheckOut ? "green" : "default"} style={{ margin: 0, fontSize: 10 }}>
                Check-Out {hasCheckOut ? "✓" : "✗"}
              </Tag>
            </Space>
          </div>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Status</span>,
      dataIndex: "lateRequestStatus",
      key: "lateRequestStatus",
      width: 130,
      render: (val, record) => {
        const norm = String(val || record.verificationStatus || record.status || "pending").toLowerCase();
        if (norm === "approved" || norm === "present") {
          return <Tag color="success" icon={<CheckCircle2 size={12} style={{ marginRight: 3 }} />}>Approved</Tag>;
        }
        if (norm === "rejected" || norm === "absent") {
          return <Tag color="error" icon={<XCircle size={12} style={{ marginRight: 3 }} />}>Rejected</Tag>;
        }
        return <Tag color="warning" icon={<Clock size={12} style={{ marginRight: 3 }} />}>Pending Review</Tag>;
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Action</span>,
      key: "action",
      width: 190,
      render: (_, record) => {
        const driveUrl = resolveDriveFolderUrl(record);
        return (
          <Space size={6}>
            <Button
              size="small"
              type="primary"
              icon={<Eye size={12} />}
              onClick={() => handleOpenReview(record)}
              style={{ fontSize: 12 }}
            >
              Review Proofs
            </Button>
            <Button
              size="small"
              icon={<FolderOpen size={12} />}
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#059669", borderColor: "#059669", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              Drive
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Breadcrumb
        style={{ marginBottom: "16px" }}
        items={[
          { title: <Link href="/dashboard">Home</Link> },
          { title: "Trainer Attendance Requests" },
        ]}
      />

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Trainer Attendance Requests
            </Title>
            <Text type="secondary">
              Review and verify late attendance requests submitted by trainers with check-in, student sheets, classroom activities, and check-out evidence.
            </Text>
          </div>

          <Space wrap>
            <Input
              placeholder="Search trainer, college, or reason..."
              prefix={<Search size={14} />}
              style={{ width: 280 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button
              icon={<RefreshCw size={14} />}
              onClick={fetchRequests}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        <Tabs
          activeKey={statusFilter}
          onChange={(k) => {
            setStatusFilter(k);
            setPage(1);
          }}
          items={[
            { key: "all", label: "All Requests" },
            { key: "pending", label: "Pending Review" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
          ]}
          style={{ marginBottom: 16 }}
        />

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filteredRequests}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showSizeChanger: true,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Proof Inspection & Verification Modal */}
      <Modal
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, paddingRight: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={18} color="#4f46e5" />
              <span style={{ fontWeight: 600 }}>Review Late Attendance Request</span>
            </div>
            <Button
              size="small"
              type="primary"
              icon={<FolderOpen size={14} />}
              href={resolveDriveFolderUrl(selectedRecord)}
              target="_blank"
              style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 600, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Google Drive Folder
            </Button>
          </div>
        }
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        width={850}
        footer={null}
        style={{ top: 20 }}
      >
        {selectedRecord && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Session & Trainer Overview Card */}
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "16px",
              }}
            >
              <Descriptions
                size="small"
                column={{ xs: 1, sm: 2, md: 3 }}
                items={[
                  {
                    key: "trainerName",
                    label: "Trainer Name",
                    children: (
                      <strong>
                        {selectedRecord.trainerId?.userId?.name || selectedRecord.trainerId?.name || "N/A"}
                      </strong>
                    ),
                  },
                  {
                    key: "trainerId",
                    label: "Trainer ID",
                    children: selectedRecord.trainerId?.trainerId || "-",
                  },
                  {
                    key: "submittedAt",
                    label: "Request Raised At",
                    children: (
                      <span style={{ color: "#d97706", fontWeight: 600 }}>
                        {selectedRecord.lateRequestSubmittedAt
                          ? dayjs(selectedRecord.lateRequestSubmittedAt).format("DD MMM YYYY, hh:mm A")
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "scheduledDate",
                    label: "Scheduled Date",
                    children: (
                      <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                        {selectedRecord.scheduleId?.scheduledDate || selectedRecord.date
                          ? dayjs(selectedRecord.scheduleId?.scheduledDate || selectedRecord.date).format("DD MMM YYYY")
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "dayNumber",
                    label: "Day Number",
                    children: (
                      <Tag color="purple">
                        Day {selectedRecord.dayNumber || selectedRecord.scheduleId?.dayNumber || "-"}
                      </Tag>
                    ),
                  },
                  {
                    key: "session",
                    label: "Session",
                    children: (
                      <Tag
                        color={String(selectedRecord.session || selectedRecord.scheduleId?.session || "FN").toUpperCase() === "AN" ? "purple" : "blue"}
                        style={{ fontWeight: 600 }}
                      >
                        {String(selectedRecord.session || selectedRecord.scheduleId?.session || "FN").toUpperCase() === "AN" ? "AN" : "FN"}
                      </Tag>
                    ),
                  },
                  {
                    key: "college",
                    label: "College",
                    span: 2,
                    children: selectedRecord.collegeId?.name || "-",
                  },
                  {
                    key: "course",
                    label: "Course",
                    children: selectedRecord.courseId?.title || selectedRecord.courseId?.name || "-",
                  },
                ]}
              />
            </div>

            {/* Trainer Justification Reason */}
            <div>
              <Text strong style={{ fontSize: 13, color: "#374151" }}>
                Trainer Reason / Topic:
              </Text>
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fef3c7",
                  padding: "10px 14px",
                  borderRadius: 6,
                  marginTop: 6,
                  color: "#92400e",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {selectedRecord.lateRequestReason || (selectedRecord.syllabus ? `Topic: ${selectedRecord.syllabus}` : "Attendance verification requested")}
              </div>
            </div>

            {/* 4 Proofs Showcase Grid */}
            {(() => {
              const checkInPhotoUrl = selectedRecord.imageUrl || selectedRecord.checkInPhoto || selectedRecord.checkIn?.photo;
              const documentsList = Array.isArray(selectedRecord.documents) ? selectedRecord.documents.filter(Boolean) : [];
              const attendanceDoc = documentsList.find(
                (d) => d?.fileType === 'attendance' || String(d?.fileField || '').toLowerCase().includes('attendance')
              );
              const attendanceSheetUrl =
                attendanceDoc?.fileUrl ||
                (attendanceDoc?.driveFileId ? `https://lh3.googleusercontent.com/d/${attendanceDoc.driveFileId}=w1200` : null) ||
                selectedRecord.attendancePhoto ||
                selectedRecord.studentsPhotoUrl ||
                selectedRecord.attendanceDocumentUrl;
              const cleanAttendanceSheetUrl =
                attendanceSheetUrl && attendanceSheetUrl !== checkInPhotoUrl && !/check.?in/i.test(attendanceSheetUrl)
                  ? attendanceSheetUrl
                  : null;

              const rawActivities = Array.isArray(selectedRecord.activityPhotos) ? selectedRecord.activityPhotos.filter(Boolean) : [];
              const normalizedActivities = rawActivities.map((p) => {
                if (typeof p === 'string') return p;
                if (p && typeof p === 'object') return p.url || p.photo || p.image || null;
                return null;
              }).filter(Boolean);
              const driveActivities = normalizedActivities.filter(
                (p) => typeof p === 'string' && (p.startsWith('http') || p.includes('googleusercontent') || p.includes('drive.google'))
              );
              const effectiveActivities = (driveActivities.length > 0 ? driveActivities : normalizedActivities).filter(
                (p) => typeof p === 'string' && p !== checkInPhotoUrl && !/check.?in/i.test(p)
              );
              const uniqueActivities = Array.from(new Set(effectiveActivities));

              const checkOutPhotoUrl = selectedRecord.checkOutGeoImageUrl || selectedRecord.checkOut?.photos?.[0]?.url;
              const cleanCheckOutPhotoUrl =
                checkOutPhotoUrl && checkOutPhotoUrl !== checkInPhotoUrl && !/check.?in/i.test(checkOutPhotoUrl)
                  ? checkOutPhotoUrl
                  : null;

              return (
                <div>
                  <Text strong style={{ fontSize: 13, color: "#1f2937", display: "block", marginBottom: 10 }}>
                    Mandatory Uploaded Proofs (4 Documents / Photos):
                  </Text>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    {/* Proof 1: Check-In */}
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "#4338ca", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Camera size={13} />
                            <span>1. Check-In Photo</span>
                          </div>
                          <Button
                            size="small"
                            type="link"
                            icon={<FolderOpen size={11} />}
                            href={resolveCheckInFolderUrl(selectedRecord)}
                            target="_blank"
                            style={{ color: "#4338ca", padding: 0, fontSize: 11, height: "auto" }}
                          >
                            Drive
                          </Button>
                        </div>
                        {checkInPhotoUrl ? (
                          <Image
                            src={getSecureImageUrl(checkInPhotoUrl)}
                            alt="Check-In Proof"
                            style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 4 }}
                            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>"
                          />
                        ) : (
                          <Alert message="No image" type="warning" showIcon style={{ padding: "4px 8px", fontSize: 11 }} />
                        )}
                      </div>
                      {selectedRecord.checkInTime ? (
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>
                          Time: {dayjs(selectedRecord.checkInTime).format("hh:mm A")}
                        </div>
                      ) : null}
                    </div>

                    {/* Proof 2: Student Attendance Sheet */}
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "#1d4ed8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <FileSpreadsheet size={13} />
                            <span>
                              2. Student Attendance{' '}
                              {Array.isArray(selectedRecord.studentAttendanceImageUrls) && selectedRecord.studentAttendanceImageUrls.length > 0
                                ? `(${selectedRecord.studentAttendanceImageUrls.length})`
                                : ''}
                            </span>
                          </div>
                          <Button
                            size="small"
                            type="link"
                            icon={<FolderOpen size={11} />}
                            href={resolveAttendanceFolderUrl(selectedRecord)}
                            target="_blank"
                            style={{ color: "#1d4ed8", padding: 0, fontSize: 11, height: "auto" }}
                          >
                            Drive
                          </Button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {selectedRecord.attendancePdfUrl && (
                            <Button
                              type="primary"
                              danger
                              icon={<FileText size={13} />}
                              href={getSecureImageUrl(selectedRecord.attendancePdfUrl)}
                              target="_blank"
                              style={{ width: "100%", fontSize: 11, height: 30 }}
                            >
                              View PDF Roster
                            </Button>
                          )}
                          {selectedRecord.attendanceExcelUrl && (
                            <Button
                              type="primary"
                              icon={<FileSpreadsheet size={13} />}
                              href={getSecureImageUrl(selectedRecord.attendanceExcelUrl)}
                              target="_blank"
                              style={{ width: "100%", fontSize: 11, height: 30, backgroundColor: "#15803d", borderColor: "#15803d" }}
                            >
                              Download Excel Roster
                            </Button>
                          )}
                          {Array.isArray(selectedRecord.studentAttendanceImageUrls) && selectedRecord.studentAttendanceImageUrls.length > 0 ? (
                            <Image.PreviewGroup>
                              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                                {selectedRecord.studentAttendanceImageUrls.map((img, i) => (
                                  <Image
                                    key={i}
                                    src={getSecureImageUrl(img)}
                                    alt={`Attendance Sheet ${i + 1}`}
                                    style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4 }}
                                    fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>"
                                  />
                                ))}
                              </div>
                            </Image.PreviewGroup>
                          ) : cleanAttendanceSheetUrl ? (
                            <Image
                              src={getSecureImageUrl(cleanAttendanceSheetUrl)}
                              alt="Student Sheet"
                              style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 4 }}
                              fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>"
                            />
                          ) : !selectedRecord.attendancePdfUrl && !selectedRecord.attendanceExcelUrl ? (
                            <Alert message="No roster doc" type="warning" showIcon style={{ padding: "4px 8px", fontSize: 11 }} />
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Proof 3: Student Classroom Activities */}
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "#7e22ce", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Layers size={13} />
                            <span>3. Activities ({uniqueActivities.length})</span>
                          </div>
                          <Button
                            size="small"
                            type="link"
                            icon={<FolderOpen size={11} />}
                            href={resolveActivitiesFolderUrl(selectedRecord)}
                            target="_blank"
                            style={{ color: "#7e22ce", padding: 0, fontSize: 11, height: "auto" }}
                          >
                            Drive
                          </Button>
                        </div>
                        {uniqueActivities.length > 0 ? (
                          <Image.PreviewGroup>
                            <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                              {uniqueActivities.map((photo, i) => (
                                <Image
                                  key={i}
                                  src={getSecureImageUrl(photo)}
                                  alt={`Activity ${i + 1}`}
                                  style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 4 }}
                                  fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>"
                                />
                              ))}
                            </div>
                          </Image.PreviewGroup>
                        ) : (
                          <Alert message="No activities" type="warning" showIcon style={{ padding: "4px 8px", fontSize: 11 }} />
                        )}
                      </div>
                    </div>

                    {/* Proof 4: Check-Out Photo */}
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "#047857", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Camera size={13} />
                            <span>4. Check-Out Photo</span>
                          </div>
                          <Button
                            size="small"
                            type="link"
                            icon={<FolderOpen size={11} />}
                            href={resolveCheckOutFolderUrl(selectedRecord)}
                            target="_blank"
                            style={{ color: "#047857", padding: 0, fontSize: 11, height: "auto" }}
                          >
                            Drive
                          </Button>
                        </div>
                        {cleanCheckOutPhotoUrl ? (
                          <Image
                            src={getSecureImageUrl(cleanCheckOutPhotoUrl)}
                            alt="Check-Out Proof"
                            style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 4 }}
                            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>"
                          />
                        ) : (
                          <Alert message="No check-out image" type="warning" showIcon style={{ padding: "4px 8px", fontSize: 11 }} />
                        )}
                      </div>
                      {selectedRecord.checkOutTime ? (
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>
                          Time: {dayjs(selectedRecord.checkOutTime).format("hh:mm A")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Admin Remarks & Decision */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
              <Text strong style={{ fontSize: 13, color: "#374151" }}>
                Admin Remarks / Verification Notes:
              </Text>
              <TextArea
                rows={3}
                placeholder="Enter remarks (mandatory if rejecting)..."
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              <Button
                icon={<FolderOpen size={14} />}
                href={resolveDriveFolderUrl(selectedRecord)}
                target="_blank"
                style={{ color: "#059669", borderColor: "#059669", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Open in Google Drive
              </Button>
              <div style={{ display: "flex", gap: 10 }}>
                <Button onClick={() => setReviewModalVisible(false)} disabled={isVerifying}>
                  Close
                </Button>
                <Button
                  danger
                  icon={<XCircle size={14} />}
                  onClick={() => handleVerify("reject")}
                  loading={isVerifying}
                  disabled={isVerifying}
                >
                  Reject Request
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircle2 size={14} />}
                  onClick={() => handleVerify("approve")}
                  loading={isVerifying}
                  disabled={isVerifying}
                  style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                >
                  Approve Attendance
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
