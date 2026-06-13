"use client";

import { useState } from 'react';
import { Form, Input, Select, Button, Upload, Switch, Radio } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

import { api } from '@/services/api';
import useMutationWithToast from '@/hooks/useMutationWithToast';
import getErrorMessage from '@/lib/getErrorMessage';

const { Option } = Select;
const { TextArea } = Input;

const TrainerComplaints = () => {
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [isAnonymous, setIsAnonymous] = useState(false);

    const submitComplaintMutation = useMutationWithToast({
        mutationFn: async (values) => {
            const formData = new FormData();
            formData.append('type', values.type);
            formData.append('category', values.category);
            formData.append('relatedTo', values.relatedTo);
            formData.append('subject', values.subject);
            formData.append('description', values.description);
            formData.append('priority', values.priority);
            formData.append('isAnonymous', isAnonymous ? 'true' : 'false');

            if (fileList.length > 0) {
                formData.append('attachment', fileList[0].originFileObj);
            }

            return api.post('/complaints', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        toast: {
            loading: 'Submitting report...',
            success: 'Report submitted successfully. Super Admin has been notified.',
            error: (err) => getErrorMessage(err, 'Failed to submit report. Please try again.'),
        },
    });

    const onFinish = async (values) => {
        try {
            await submitComplaintMutation.mutateWithToast(values);
            form.resetFields();
            setFileList([]);
            setIsAnonymous(false);
        } catch (error) {
            console.error('Submission error:', error);
        }
    };

    const handleUploadChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-6 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Complaints & Feedback</h1>
                <p className="mt-1 text-sm text-gray-500">Submit issues or suggestions directly.</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-6">
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        initialValues={{ type: 'Complaint', priority: 'Medium', relatedTo: 'Other' }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Form.Item
                                name="type"
                                label="Type"
                                rules={[{ required: true }]}
                                className="mb-0"
                            >
                                <Radio.Group buttonStyle="solid" className="w-full flex">
                                    <Radio.Button value="Complaint" className="flex-1 text-center">Complaint</Radio.Button>
                                    <Radio.Button value="Feedback" className="flex-1 text-center">Feedback</Radio.Button>
                                </Radio.Group>
                            </Form.Item>

                            <Form.Item
                                name="priority"
                                label="Priority"
                                rules={[{ required: true }]}
                                className="mb-0"
                            >
                                <Select size="large">
                                    <Option value="Low">Low</Option>
                                    <Option value="Medium">Medium</Option>
                                    <Option value="High">High</Option>
                                </Select>
                            </Form.Item>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Form.Item
                                name="category"
                                label="Category"
                                rules={[{ required: true }]}
                                className="mb-0"
                            >
                                <Select size="large" placeholder="Select Issue Type">
                                    <Option value="SPOC Issue">SPOC Issue</Option>
                                    <Option value="Schedule Issue">Schedule Issue</Option>
                                    <Option value="Payment Issue">Payment Issue</Option>
                                    <Option value="Technical Issue">Technical Issue</Option>
                                    <Option value="Infrastructure Issue">Infrastructure Issue</Option>
                                    <Option value="General Feedback">General Feedback</Option>
                                    <Option value="Other">Other</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="relatedTo"
                                label="Related To"
                                rules={[{ required: true }]}
                                className="mb-0"
                            >
                                <Select size="large">
                                    <Option value="Company">Company</Option>
                                    <Option value="College">College</Option>
                                    <Option value="Schedule">Schedule (Today)</Option>
                                    <Option value="Other">Other</Option>
                                </Select>
                            </Form.Item>
                        </div>

                        <Form.Item
                            name="subject"
                            label="Subject"
                            rules={[{ required: true, max: 100 }]}
                            className="mb-0"
                        >
                            <Input size="large" placeholder="Short title (max 100 chars)" />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Description"
                            rules={[{ required: true, min: 20 }]}
                            className="mb-0"
                        >
                            <TextArea rows={5} placeholder="Detailed explanation..." className="text-base" />
                        </Form.Item>

                        <Form.Item
                            name="attachment"
                            label="Attachment (Optional)"
                            className="mb-0"
                        >
                            <Upload 
                                fileList={fileList}
                                onChange={handleUploadChange}
                                beforeUpload={() => false}
                                maxCount={1}
                                className="w-full"
                            >
                                <Button icon={<UploadOutlined />} size="large" block>Tap to Upload File</Button>
                            </Upload>
                        </Form.Item>

                        <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-gray-100">
                            <div className="flex w-full items-center justify-between">
                                <div>
                                    <span className="text-gray-700 font-medium text-sm">Submit Anonymously</span>
                                    <p className="text-xs text-gray-500 mt-0.5">Your name will be hidden from the admin reports.</p>
                                </div>
                                <Switch
                                    checked={isAnonymous}
                                    onChange={(checked) => setIsAnonymous(checked)}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button type="primary" htmlType="submit" loading={submitComplaintMutation.isPending} className="w-full h-12 text-lg font-medium rounded-lg shadow-md">
                                Submit Report
                            </Button>
                        </div>
                    </Form>
                </div>
            </div>
        </div>
    );
};

export default TrainerComplaints;
