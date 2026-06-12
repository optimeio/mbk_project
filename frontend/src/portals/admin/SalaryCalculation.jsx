"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Table, Card, Typography, Space, Button, Input, Tag, message, Modal, InputNumber, Breadcrumb, DatePicker, Tooltip } from 'antd';
import { 
    SearchOutlined, 
    DollarCircleOutlined, 
    FilePdfOutlined, 
    SendOutlined, 
    ReloadOutlined,
    EditOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    UserOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import dayjs from 'dayjs';
import { api } from '@/services/api';

const { Title, Text } = Typography;

const SalaryCalculation = ({ embedded = false }) => {
    const [searchText, setSearchText] = useState('');
    const [isRateModalVisible, setIsRateModalVisible] = useState(false);
    const [selectedTrainer, setSelectedTrainer] = useState(null);
    const [newRate, setNewRate] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const sendPayslipTimeoutRef = useRef(null);
    const queryClient = useQueryClient();

    useEffect(() => () => {
        if (sendPayslipTimeoutRef.current) {
            window.clearTimeout(sendPayslipTimeoutRef.current);
            sendPayslipTimeoutRef.current = null;
        }
    }, []);

    const {
        data: salaryResponse = [],
        isLoading: loading,
    } = useQuery({
        queryKey: ['salaries'],
        queryFn: async () => {
            const response = await api.get('/salaries');
            return Array.isArray(response) ? response : [];
        },
    });

    const calculateMutation = useMutation({
        mutationFn: ({ monthName, year }) => api.post('/salaries/calculate', { month: monthName, year }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salaries'] });
        },
    });

    const updateRateMutation = useMutation({
        mutationFn: ({ trainerId, dailyRate }) => api.put(`/salaries/rate/${trainerId}`, { dailyRate }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salaries'] });
        },
    });

    const processPaymentMutation = useMutation({
        mutationFn: (id) => api.post(`/salaries/pay/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salaries'] });
        },
    });

    const handleCalculate = async () => {
        try {
            message.loading({ content: 'Calculating salaries...', key: 'calc' });
            const monthName = selectedMonth.format('MMMM');
            const year = selectedMonth.year();
            
            await calculateMutation.mutateAsync({ monthName, year });
            
            message.success({ content: 'Salaries calculated successfully', key: 'calc' });
        } catch (error) {
            message.error({ content: 'Calculation failed', key: 'calc' });
        }
    };

    const handleUpdateRate = async () => {
        if (!selectedTrainer) return;
        try {
            await updateRateMutation.mutateAsync({
                trainerId: selectedTrainer.trainerId._id,
                dailyRate: newRate,
            });
            message.success('Daily rate updated for ' + selectedTrainer.trainerId.userId.name);
            setIsRateModalVisible(false);
        } catch (error) {
            message.error('Failed to update rate');
        }
    };

    const handleProcessPayment = async (id) => {
        try {
            await processPaymentMutation.mutateAsync(id);
            message.success('Payment marked as Paid');
        } catch (error) {
            message.error('Failed to process payment');
        }
    };

    const handleGeneratePayslip = async (record) => {
        try {
            const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ]);
            const doc = new jsPDF();
            const trainerName = record.trainerId?.userId?.name || 'Trainer';
            const trainerCode = record.trainerId?.trainerId || '-';
            
            // Header
            doc.setFontSize(20);
            doc.setTextColor(24, 144, 255);
            doc.text("SALARY PAYSLIP", 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Organization Name: MBK BY TSMG", 14, 30);
            doc.text(`Generated Date: ${dayjs().format('DD MMM YYYY')}`, 14, 35);

            // Trainer Info
            doc.setDrawColor(230);
            doc.line(14, 40, 196, 40);
            
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Trainer Name: ${trainerName}`, 14, 50);
            doc.text(`Trainer ID: ${trainerCode}`, 14, 57);
            doc.text(`Email: ${record.trainerId?.userId?.email || '-'}`, 14, 64);
            
            doc.text(`Payment for: ${record.month} ${record.year}`, 140, 50);
            doc.text(`Status: ${record.status}`, 140, 57);

            // Table
            autoTable(doc, {
                startY: 75,
                head: [['Description', 'Details', 'Calculation', 'Amount (₹)']],
                body: [
                    ['Attendance', `${record.presentDays} Days`, `Present / ${record.workingDays} Total`, ''],
                    ['Daily Rate', `₹${record.salaryPerDay}`, '-', ''],
                    ['Basic Salary', '-', `${record.presentDays} x ₹${record.salaryPerDay}`, record.totalSalary.toLocaleString()],
                    ['Total Payout', '', '', record.totalSalary.toLocaleString()]
                ],
                theme: 'striped',
                headStyles: { fillColor: [24, 144, 255] },
                columnStyles: {
                    3: { halign: 'right', fontStyle: 'bold' }
                }
            });

            // Footer
            const finalY = doc.lastAutoTable.finalY + 20;
            doc.setFontSize(10);
            doc.text("This is an electronically generated document and does not require a signature.", 105, finalY + 40, { align: 'center' });

            doc.save(`Payslip_${trainerName.replace(/\s+/g, '_')}_${record.month}_${record.year}.pdf`);
            message.success('Payslip generated successfully');
        } catch (error) {
            console.error('Payslip generation error:', error);
            message.error('Failed to generate payslip');
        }
    };

    const handleSendPayslip = (record) => {
        message.loading({ content: 'Sending email...', key: 'send' });
        // Simulating email send
        if (sendPayslipTimeoutRef.current) {
            window.clearTimeout(sendPayslipTimeoutRef.current);
        }
        sendPayslipTimeoutRef.current = window.setTimeout(() => {
            message.success({ content: `Payslip sent to ${record.trainerId?.userId?.email}`, key: 'send' });
            sendPayslipTimeoutRef.current = null;
        }, 1500);
    };

    const filteredData = useMemo(() => {
        const data = Array.isArray(salaryResponse) ? salaryResponse : [];
        const searchLower = searchText.toLowerCase();
        return data.filter(item => (
            item.trainerId?.userId?.name?.toLowerCase().includes(searchLower) ||
            item.trainerId?.trainerId?.toLowerCase().includes(searchLower)
        ));
    }, [salaryResponse, searchText]);

    const columns = [
        {
            title: 'Trainer',
            key: 'trainer',
            render: (_, record) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{record.trainerId?.userId?.name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.trainerId?.trainerId}</Text>
                </Space>
            )
        },
        {
            title: 'Month / Year',
            key: 'period',
            render: (_, record) => (
                <Text>{record.month} {record.year}</Text>
            )
        },
        {
            title: 'Attendance',
            key: 'attendance',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Actual present days">
                        <Tag color="cyan">{record.presentDays} Days</Tag>
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: '12px' }}>of {record.workingDays}</Text>
                </Space>
            )
        },
        {
            title: 'Daily Rate',
            key: 'rate',
            render: (_, record) => (
                <Space>
                    <Text>₹{record.salaryPerDay}</Text>
                    <Button 
                        type="text" 
                        icon={<EditOutlined />} 
                        size="small"
                        onClick={() => {
                            setSelectedTrainer(record);
                            setNewRate(record.salaryPerDay);
                            setIsRateModalVisible(true);
                        }}
                    />
                </Space>
            )
        },
        {
            title: 'Total Salary',
            key: 'total',
            render: (_, record) => (
                <Text strong style={{ color: '#000' }}>₹{record.totalSalary.toLocaleString()}</Text>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'gold';
                let icon = <ClockCircleOutlined />;
                if (status === 'Paid') {
                    color = 'green';
                    icon = <CheckCircleOutlined />;
                }
                return <Tag icon={icon} color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.status === 'Pending' && (
                        <Button type="link" onClick={() => handleProcessPayment(record._id)}>
                            Pay
                        </Button>
                    )}
                    <Tooltip title="Download Payslip">
                        <Button icon={<FilePdfOutlined />} onClick={() => handleGeneratePayslip(record)} />
                    </Tooltip>
                    <Tooltip title="Email to Trainer">
                        <Button icon={<SendOutlined />} onClick={() => handleSendPayslip(record)} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: embedded ? 0 : '24px' }}>
            {!embedded && (
                <Breadcrumb 
                    style={{ marginBottom: '16px' }}
                    items={[
                        { title: <Link href="/dashboard">Dashboard</Link> },
                        { title: 'Salary Management' }
                    ]}
                />
            )}

            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <Title level={2} style={{ margin: 0 }}>Salary Management</Title>
                        <Text type="secondary">Process monthly trainer payouts and generate payslips.</Text>
                    </div>
                    <Space size="middle">
                        <DatePicker 
                            picker="month" 
                            value={selectedMonth} 
                            onChange={setSelectedMonth}
                            allowClear={false}
                        />
                        <Button 
                            type="primary" 
                            icon={<ReloadOutlined />} 
                            onClick={handleCalculate}
                        >
                            Auto Calculate
                        </Button>
                    </Space>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <Input
                        placeholder="Search by trainer name or ID..."
                        prefix={<SearchOutlined />}
                        style={{ width: 350 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredData}
                    loading={loading}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title="Update Daily Salary Rate"
                open={isRateModalVisible}
                onOk={handleUpdateRate}
                onCancel={() => setIsRateModalVisible(false)}
            >
                <div style={{ padding: '16px 0' }}>
                    <Text type="secondary">Trainer: </Text>
                    <Text strong>{selectedTrainer?.trainerId?.userId?.name}</Text>
                    <div style={{ marginTop: '16px' }}>
                        <Text block style={{ marginBottom: '8px' }}>Per-Day Salary (₹)</Text>
                        <InputNumber
                            style={{ width: '100%' }}
                            value={newRate}
                            onChange={setNewRate}
                            min={0}
                            step={100}
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/₹\s?|(,*)/g, '')}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SalaryCalculation;
