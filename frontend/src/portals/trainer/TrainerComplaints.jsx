"use client";

import { useEffect, useRef, useState } from 'react';
import { Form, Input, Select, Button, Upload, Switch, Radio } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import useMutationWithToast from '@/hooks/useMutationWithToast';
import getErrorMessage from '@/lib/getErrorMessage';

const { Option } = Select;
const { TextArea } = Input;

const TrainerComplaints = () => {
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef(null);
    const router = useRouter();
    const { currentUser, logout } = useAuth();
    const user = currentUser || {};

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

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
                setIsAccountMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

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

    const handleProfileClick = () => {
        setIsAccountMenuOpen(false);
        router.push('/trainer/profile');
    };

    const handleLogout = async () => {
        setIsAccountMenuOpen(false);
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-2 py-4 sm:px-4">
            <div className="mb-6 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Complaints & Feedback</h1>
                    <p className="text-sm text-gray-500 mt-1">Submit issues or suggestions directly.</p>
                </div>

                <div ref={accountMenuRef} className="relative shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#153E53] text-sm font-bold text-white shadow-sm ring-1 ring-[#113142]/20 transition hover:bg-[#1b4c64]"
                        aria-label="Open account menu"
                    >
                        {(user?.name || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                    </button>

                    {isAccountMenuOpen && (
                        <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                            <div className="p-2">
                                <button
                                    type="button"
                                    onClick={handleProfileClick}
                                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                        <UserCircleIcon className="h-4 w-4 text-slate-500" />
                                    </span>
                                    Profile
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                                >
                                    <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-rose-50">
                                        <ArrowRightOnRectangleIcon className="h-4 w-4 text-rose-500" />
                                    </span>
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
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
