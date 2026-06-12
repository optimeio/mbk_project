"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, Button, Tag, Descriptions, Spin, message, Image, Divider, Select, Input } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { api, FILE_BASE_URL } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const { Option } = Select;

const ComplaintDetails = () => {
    const { id } = useParams();
    const router = useRouter();
    const { currentUser } = useAuth();
    const [actionValues, setActionValues] = useState({
        status: '',
        adminRemarks: '',
        internalNotes: ''
    });
    const queryClient = useQueryClient();

    const {
        data: complaint = null,
        isLoading: loading,
    } = useQuery({
        queryKey: ['complaint-details', id],
        enabled: Boolean(id),
        queryFn: async () => {
            const response = await api.get(`/complaints/${id}`);
            if (!response?.success) {
                throw new Error('Complaint not found');
            }
            return response.data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload) => api.put(`/complaints/${id}`, payload),
        onSuccess: (response) => {
            if (response?.success) {
                queryClient.setQueryData(['complaint-details', id], response.data);
            }
        },
    });

    useEffect(() => {
        if (!complaint) return;
        setActionValues({
            status: complaint.status,
            adminRemarks: complaint.adminRemarks || '',
            internalNotes: complaint.internalNotes || '',
        });
    }, [complaint]);

    const handleUpdate = async () => {
        try {
            const response = await updateMutation.mutateAsync(actionValues);
            if (response.success) {
                message.success('Complaint updated successfully');
            }
        } catch (error) {
            console.error('Update failed:', error);
            message.error('Failed to update complaint');
        }
    };

    if (loading) return <div className="p-8 text-center"><Spin size="large" /></div>;
    if (!complaint) return <div className="p-8 text-center text-gray-500">Complaint not found.</div>;

    const getPriorityColor = (p) => {
        if (p === 'High') return 'red';
        if (p === 'Medium') return 'orange';
        return 'green';
    };

    const getStatusColor = (s) => {
        if (s === 'Open') return 'blue';
        if (s === 'Resolved') return 'green';
        if (s === 'Closed') return 'default';
        return 'gold'; // In Progress
    };

    const attachmentUrl = complaint?.attachmentUrl
        ? complaint.attachmentUrl.startsWith('http')
            ? complaint.attachmentUrl
            : `${FILE_BASE_URL}${complaint.attachmentUrl}`
        : '';

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <Button 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => router.back()}
                >
                    Back
                </Button>
                <h1 className="text-2xl font-bold text-gray-800 m-0">Complaint Details</h1>
                <div>
                    {/* Placeholder for future actions like "Resolve" */}
                </div>
            </div>

            <Card className="shadow-md rounded-lg">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">{complaint.subject}</h2>
                        <div className="flex gap-2">
                            <Tag color={getPriorityColor(complaint.priority)}>{complaint.priority}</Tag>
                            <Tag color={getStatusColor(complaint.status)}>{complaint.status}</Tag>
                            <Tag>{complaint.category}</Tag>
                        </div>
                    </div>
                    <div className="text-right text-gray-500 text-sm">
                        <p>ID: {complaint._id}</p>
                        <p>{new Date(complaint.createdAt).toLocaleString()}</p>
                    </div>
                </div>

                <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Trainer Name">{complaint.trainerName}</Descriptions.Item>
                    <Descriptions.Item label="Trainer ID">{complaint.trainerId?.name || 'N/A'}</Descriptions.Item>
                    
                    <Descriptions.Item label="Related To">{complaint.collegeId?.name || complaint.companyId?.name || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Type">{complaint.type}</Descriptions.Item>
                </Descriptions>

                <Divider titlePlacement="left">Description</Divider>
                <div className="bg-gray-50 p-4 rounded-md text-gray-700 whitespace-pre-wrap">
                    {complaint.description}
                </div>

                {complaint.attachmentUrl && (
                    <>
                        <Divider titlePlacement="left">Attachment</Divider>
                        <div className="mt-4">
                            {complaint.attachmentUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <Image
                                    width={200}
                                    src={attachmentUrl}
                                    placeholder={<Spin />}
                                />
                            ) : (
                                <Button 
                                    icon={<DownloadOutlined />} 
                                    href={attachmentUrl} 
                                    target="_blank"
                                >
                                    Download Attachment
                                </Button>
                            )}
                        </div>
                    </>
                )}
                
                {/* Admin Actions - Hide for accountant/read-only trainer views */}
                {currentUser?.role !== 'Accountant' && currentUser?.role !== 'Accountnt' && currentUser?.role !== 'Trainer' && (
                <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Admin Actions</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Change Status</label>
                            <Select 
                                value={actionValues.status} 
                                style={{ width: '100%' }}
                                onChange={val => setActionValues(prev => ({ ...prev, status: val }))}
                            >
                                <Option value="Open">Open</Option>
                                <Option value="In Progress">In Progress</Option>
                                <Option value="Resolved">Resolved</Option>
                                <Option value="Closed">Closed</Option>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assign to SPOC (Optional)</label>
                             {/* Future: Fetch list of SPOCs/Admins */}
                            <Select 
                                placeholder="Select Admin" 
                                style={{ width: '100%' }} 
                                disabled // Placeholder until user fetch logic added
                            >
                                <Option value="admin1">Admin 1</Option>
                            </Select>
                        </div>

                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-2">Admin Remarks (Visible to Trainer)</label>
                             <Input.TextArea 
                                rows={3} 
                                placeholder="Enter remarks for the trainer..." 
                                value={actionValues.adminRemarks}
                                onChange={e => setActionValues(prev => ({ ...prev, adminRemarks: e.target.value }))}
                             />
                        </div>

                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes (Admin Only)</label>
                             <Input.TextArea 
                                rows={2} 
                                placeholder="Private notes for internal team..." 
                                className="bg-yellow-50"
                                value={actionValues.internalNotes}
                                onChange={e => setActionValues(prev => ({ ...prev, internalNotes: e.target.value }))}
                             />
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <Button 
                                type="primary" 
                                size="large" 
                                loading={updateMutation.isPending}
                                onClick={handleUpdate}
                                disabled={
                                    complaint.status === actionValues.status && 
                                    complaint.adminRemarks === actionValues.adminRemarks &&
                                    complaint.internalNotes === actionValues.internalNotes
                                }
                            >
                                Update Complaint
                            </Button>
                        </div>
                    </div>
                </div>
                )}
            </Card>
        </div>
    );
};

export default ComplaintDetails;
