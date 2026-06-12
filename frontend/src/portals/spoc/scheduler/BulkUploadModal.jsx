"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Alert, Button, Card, Divider, Modal, Space, Statistic, Typography, Upload, message } from "antd";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { FileUp } from "lucide-react";
import { api } from "@/services/api";

const { Text } = Typography;

const BulkUploadModal = memo(function BulkUploadModal({ show, onClose, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const downloadErrorReport = useCallback(() => {
    if (!result || !result.skippedDetails) return;

    let report = `Bulk Load Error Report - ${new Date().toLocaleString()}\n`;
    report += `Total Success: ${result.inserted}\n`;
    report += `Total Skipped: ${result.skipped}\n`;
    report += "-------------------------------------------\n\n";

    result.skippedDetails.forEach((item) => {
      report += `Row ${item.rowNumber}: ${item.reason}\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(file);
    element.href = blobUrl;
    element.download = `Bulk_Upload_Errors_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }, [result]);

  const handleDone = useCallback(() => {
    setResult(null);
    onClose();
  }, [onClose]);

  const uploadProps = useMemo(
    () => ({
      name: "file",
      accept: ".xlsx,.xls",
      className: "w-full",
      customRequest: async ({ file, onSuccess, onError }) => {
        setUploading(true);
        setResult(null);
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await api.post("/schedules/bulk-upload", formData);
          if (response.success) {
            message.success("Schedule uploaded successfully");
            setResult(response);
            onSuccess(response);
            onRefresh();
          } else {
            throw new Error(response.message || "Upload failed");
          }
        } catch (error) {
          console.error("Upload error:", error);
          message.error(error.message || "Upload failed");
          onError(error);
        } finally {
          setUploading(false);
        }
      },
    }),
    [onRefresh],
  );

  return (
    <Modal
      open={show}
      onCancel={onClose}
      title={(
        <Space>
          <FileExcelOutlined style={{ color: "#4b5563" }} />
          <span className="font-serif text-gray-800">Upload Bulk Schedule (Excel)</span>
        </Space>
      )}
      footer={null}
      width={600}
      centered
      className="simple-modal"
    >
      {!result ? (
        <div className="space-y-6 py-6 text-center">
          <div className="flex justify-center">
            <Button
              icon={<DownloadOutlined />}
              href="/templates/Bulk_Trainer_Schedule_Template.xlsx"
              target="_blank"
              className="h-10 rounded border border-gray-300 px-6 font-medium text-gray-700 shadow-none hover:border-gray-400 hover:bg-gray-50"
            >
              Download Excel Template
            </Button>
          </div>

          <Upload.Dragger
            {...uploadProps}
            disabled={uploading}
            showUploadList={false}
            style={{ background: "#fafafa", borderColor: "#d1d5db" }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined className="text-4xl text-gray-400" />
            </p>
            <p className="ant-upload-text text-lg font-medium text-gray-700">
              {uploading
                ? "Processing File..."
                : "Click or drag Excel file to this area to upload"}
            </p>
            <p className="ant-upload-hint mt-2 text-gray-500">
              Sheet name must be{" "}
              <Text code className="border border-gray-200 bg-gray-100">
                Schedule
              </Text>
            </p>
            <Alert
              className="mt-6 border border-gray-200 bg-gray-50 text-left"
              message="Excel Format Requirements"
              description={(
                <div className="text-xs text-gray-600">
                  <Text strong>Columns:</Text> Company, Course, College, TrainerID, Date,
                  Day, StartTime, EndTime
                </div>
              )}
              type="info"
              showIcon
            />
          </Upload.Dragger>
        </div>
      ) : (
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border border-gray-200 bg-white shadow-none">
              <Statistic
                title={<span className="text-gray-500">Inserted</span>}
                value={result.inserted}
                valueStyle={{ color: "#16a34a" }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
            <Card className="border border-gray-200 bg-white shadow-none">
              <Statistic
                title={<span className="text-gray-500">Skipped</span>}
                value={result.skipped}
                valueStyle={{ color: "#d97706" }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </div>

          {result.skippedDetails?.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Divider titlePlacement="left" className="mt-0! mb-0! flex-1">
                  <Text type="secondary" strong>
                    Skip Reasons
                  </Text>
                </Divider>
                <Button
                  size="small"
                  icon={<FileUp className="h-3 w-3" />}
                  onClick={downloadErrorReport}
                  className="ml-4 flex items-center gap-1 border-gray-300 text-gray-600"
                >
                  Download Report
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3">
                {result.skippedDetails.map((item, index) => (
                  <div
                    key={`${item.rowNumber}-${index}`}
                    className="flex items-start border-b border-gray-200 py-1 text-xs text-gray-600 last:border-0"
                  >
                    <Text type="secondary" className="mr-2">
                      Row {item.rowNumber}:
                    </Text>
                    <span>{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end pt-4">
            <Button
              type="primary"
              size="large"
              onClick={handleDone}
              className="rounded bg-blue-600 shadow-none hover:bg-blue-700"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
});

export default BulkUploadModal;
