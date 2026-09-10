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
} from "lucide-react";
import { api } from "@/services/api";
import { getSecureImageUrl } from "@/utils/imageUtils";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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
      const params = {
        page,
        limit: pageSize,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const res = await api.get("/attendance/late-requests", { params });
      if (res?.success) {
        setRequests(res.requests || []);
        setTotal(res.pagination?.total || 0);
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
    setAdminRemarks(record.lateRequestAdminRemarks || record.verificationComment || "");
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
      title: "Request Raised",
      dataIndex: "lateRequestSubmittedAt",
      key: "lateRequestSubmittedAt",
      width: 160,
      render: (val, record) => {
        const dateVal = val || record.checkIn?.time || record.checkInTime || record.createdAt;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1f2937" }}>
              {dateVal ? dayjs(dateVal).format("DD MMM YYYY") : "-"}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              {dateVal ? dayjs(dateVal).format("hh:mm A") : "-"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Scheduled Session",
      key: "scheduleInfo",
      width: 180,
      render: (_, record) => {
        const sched = record.scheduleId || {};
        const schedDate = sched.scheduledDate || record.date;
        const dayNum = record.dayNumber || sched.dayNumber;
        const session = String(record.session || sched.session || "FULL_DAY").toUpperCase();
        
        let sessionColor = "blue";
        if (session === "AN") sessionColor = "purple";
        if (session === "FULL_DAY") sessionColor = "green";

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#374151" }}>
              {schedDate ? dayjs(schedDate).format("DD MMM YYYY") : "-"}
            </div>
            <Space orientation="horizontal" size={4}>
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
      title: "Trainer",
      key: "trainer",
      width: 180,
      render: (_, record) => {
        const name = record.trainerId?.userId?.name || record.trainerId?.name || "Unknown Trainer";
        const id = record.trainerId?.trainerId || "-";
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{name}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>ID: {id}</div>
          </div>
        );
      },
    },
    {
      title: "College & Course",
      key: "collegeCourse",
      width: 210,
      render: (_, record) => {
        const collegeName = record.collegeId?.name || "-";
        const courseName = record.courseId?.title || record.courseId?.name || record.scheduleId?.subject || "-";
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#1f2937", lineHeight: 1.3 }}>{collegeName}</div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{courseName}</div>
          </div>
        );
      },
    },
    {
      title: "Reason / Topic",
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
              }}
            >
              {displayVal}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Proofs",
      key: "proofs",
      width: 170,
      render: (_, record) => {
        const hasCheckIn = Boolean(record.imageUrl || record.checkInPhoto || record.checkIn?.photo);
        const hasStudentDoc = Boolean(record.attendancePdfUrl || record.attendanceExcelUrl || record.studentsPhotoUrl);
        const activityCount = Array.isArray(record.activityPhotos) ? record.activityPhotos.length : 0;
        const hasCheckOut = Boolean(record.checkOutGeoImageUrl || record.checkOut?.photos?.length);

        return (
          <Space direction="vertical" size={2}>
            <Space size={4}>
              <Tag color={hasCheckIn ? "cyan" : "default"} style={{ margin: 0, fontSize: 10 }}>
                Check-In {hasCheckIn ? "✓" : "✗"}
              </Tag>
              <Tag color={hasStudentDoc ? "blue" : "default"} style={{ margin: 0, fontSize: 10 }}>
                Roster {hasStudentDoc ? "✓" : "✗"}
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
          </Space>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "lateRequestStatus",
      key: "lateRequestStatus",
      width: 120,
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
      title: "Action",
      key: "action",
      width: 130,
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<Eye size={12} />}
          onClick={() => handleOpenReview(record)}
          style={{ fontSize: 12 }}
        >
          Review Proofs
        </Button>
      ),
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={18} color="#4f46e5" />
            <span>Review Late Attendance Request</span>
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
              <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                <Descriptions.Item label="Trainer Name">
                  <strong>
                    {selectedRecord.trainerId?.userId?.name || selectedRecord.trainerId?.name || "N/A"}
                  </strong>
                </Descriptions.Item>
                <Descriptions.Item label="Trainer ID">
                  {selectedRecord.trainerId?.trainerId || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Request Raised At">
                  <span style={{ color: "#d97706", fontWeight: 600 }}>
                    {selectedRecord.lateRequestSubmittedAt
                      ? dayjs(selectedRecord.lateRequestSubmittedAt).format("DD MMM YYYY, hh:mm A")
                      : "-"}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Scheduled Date">
                  <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                    {selectedRecord.scheduleId?.scheduledDate || selectedRecord.date
                      ? dayjs(selectedRecord.scheduleId?.scheduledDate || selectedRecord.date).format("DD MMM YYYY")
                      : "-"}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Day Number">
                  <Tag color="purple">
                    Day {selectedRecord.dayNumber || selectedRecord.scheduleId?.dayNumber || "-"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Session">
                  <Tag color="blue" style={{ fontWeight: 600 }}>
                    {String(selectedRecord.session || selectedRecord.scheduleId?.session || "FULL_DAY").toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="College" span={2}>
                  {selectedRecord.collegeId?.name || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Course">
                  {selectedRecord.courseId?.title || selectedRecord.courseId?.name || "-"}
                </Descriptions.Item>
              </Descriptions>
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
            <div>
              <Text strong style={{ fontSize: 13, color: "#1f2937", display: "block", marginBottom: 10 }}>
                Mandatory Uploaded Proofs (4 Documents / Photos):
              </Text>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {/* Proof 1: Check-In */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa" }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "#4338ca", display: "flex", alignItems: "center", gap: 4 }}>
                    <Camera size={13} />
                    <span>1. Check-In Photo</span>
                  </div>
                  {selectedRecord.imageUrl || selectedRecord.checkInPhoto ? (
                    <Image
                      src={getSecureImageUrl(selectedRecord.imageUrl || selectedRecord.checkInPhoto)}
                      alt="Check-In Proof"
                      style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <Alert message="No image" type="warning" showIcon style={{ padding: "4px 8px", fontSize: 11 }} />
                  )}
                  {selectedRecord.checkInTime ? (
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
                      Time: {dayjs(selectedRecord.checkInTime).format("hh:mm A")}
                    </div>
                  ) : null}
                </div>

                {/* Proof 2: Student Attendance Sheet */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa" }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 4 }}>
                    <FileSpreadsheet size={13} />
                    <span>2. Student Attendance</span>
                  </div>
                  {selectedRecord.attendancePdfUrl ? (
                    <Button
                      type="primary"
                      danger
                      icon={<FileText size={13} />}
                      href={getSecureImageUrl(selectedRecord.attendancePdfUrl)}
                      target="_blank"
                      style={{ width: "100%", fontSize: 11, height: 32 }}
                    >
                      View PDF Roster
                    </Button>
                  ) : selectedRecord.attendanceExcelUrl ? (
                    <Button
                      type="primary"
                      icon={<FileSpreadsheet size={13} />}
                      href={getSecureImageUrl(selectedRecord.attendanceExcelUrl)}
                      target="_blank"
                      style={{ width: "100%", fontSize: 11, height: 32, backgroundColor: "#15803d", borderColor: "#15803d" }}
                    >
                      Download Excel Roster
                    </Button>
                  ) : selectedRecord.studentsPhotoUrl ? (
                    <Image
                      src={getSecureImageUrl(selectedRecord.studentsPhotoUrl)}
                      alt="Student Sheet"
                      style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <Alert message="No roster doc" type="warning" showIcon style={{ padding: "4px 8px", fontSize: 11 }} />
                  )}
                </div>

                {/* Proof 3: Student Classroom Activities */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa" }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "#7e22ce", display: "flex", alignItems: "center", gap: 4 }}>
                    <Layers size={13} />
                    <span>3. Activities ({Array.isArray(selectedRecord.activityPhotos) ? selectedRecord.activityPhotos.length : 0})</span>
                  </div>
                  {Array.isArray(selectedRecord.activityPhotos) && selectedRecord.activityPhotos.length > 0 ? (
                    <Image.PreviewGroup>
                      <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                        {selectedRecord.activityPhotos.map((photo, i) => (
                          <Image
                            key={i}
                            src={getSecureImageUrl(photo)}
                            alt={`Activity ${i + 1}`}
                            style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 4 }}
                          />
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  ) : (
                    <Alert message="No activities" type="warning" showIcon style={{ padding: "4px 8px", fontSize: 11 }} />
                  )}
                </div>

                {/* Proof 4: Check-Out Photo */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa" }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "#047857", display: "flex", alignItems: "center", gap: 4 }}>
                    <Camera size={13} />
                    <span>4. Check-Out Photo</span>
                  </div>
                  {selectedRecord.checkOutGeoImageUrl || selectedRecord.checkOut?.photos?.[0]?.url ? (
                    <Image
                      src={getSecureImageUrl(selectedRecord.checkOutGeoImageUrl || selectedRecord.checkOut?.photos?.[0]?.url)}
                      alt="Check-Out Proof"
                      style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <Alert message="No check-out image" type="warning" showIcon style={{ padding: "4px 8px", fontSize: 11 }} />
                  )}
                  {selectedRecord.checkOutTime ? (
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
                      Time: {dayjs(selectedRecord.checkOutTime).format("hh:mm A")}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

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
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
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
        )}
      </Modal>
    </div>
  );
}
