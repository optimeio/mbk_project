"use client";

import React, { useState } from 'react';
import { Card, Button, Upload, message, Typography, Divider, Space } from 'antd';
import { UploadOutlined, FilePdfOutlined, CheckCircleOutlined } from '@ant-design/icons';
import CalendarComponent from '@/components/common/CalendarComponent';
import MapComponent from '@/components/common/MapComponent';
import { API_BASE_URL } from '@/services/api'; // Ensure this matches your API config

const { Title, Paragraph } = Typography;

// Mock events for Calendar
const events = [
    { title: 'Test Event 1', date: new Date().toISOString().split('T')[0] },
    { title: 'Test Event 2', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
];

// Mock markers for Map
const markers = [
    { position: { lat: 20.5937, lng: 78.9629 }, title: 'India Center' }
];

const VerificationPage = () => {
    const [uploading, setUploading] = useState(false);

    // Handle File Upload Verification
    const handleUpload = async (info) => {
        const formData = new FormData();
        formData.append('file', info.file);

        try {
            setUploading(true);
            const response = await fetch(`${API_BASE_URL}/test/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            
            if (data.success) {
                message.success(`Upload successful! URL: ${data.file.path}`);
                console.log('Uploaded File:', data.file);
            } else {
                message.error('Upload failed: ' + data.message);
            }
        } catch (error) {
            message.error('Upload error');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    // Handle PDF Download Verification
    const handleDownloadPDF = () => {
        window.open(`${API_BASE_URL}/test/pdf`, '_blank');
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <Title level={2}><CheckCircleOutlined /> System Verification Dashboard</Title>
            <Paragraph>Use this page to verify the integration of new features.</Paragraph>

            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                
                {/* 1. Ant Design Configuration */}
                <Card title="1. Ant Design UI Check" variant="borderless">
                    <Space>
                        <Button type="primary">Primary Button</Button>
                        <Button>Default Button</Button>
                        <Button type="dashed">Dashed Button</Button>
                        <Button danger>Danger Button</Button>
                    </Space>
                    <Paragraph style={{ marginTop: 10 }}>
                        If these buttons look styled (blue primary, rounded corners), Ant Design ConfigProvider is working.
                    </Paragraph>
                </Card>

                {/* 2. Calendar Component */}
                <Card title="2. Calendar Component (FullCalendar)" variant="borderless">
                    <CalendarComponent events={events} title="Mock Schedule" />
                </Card>

                {/* 3. Map Component */}
                <Card title="3. Map Component (Google Maps)" variant="borderless">
                    <Paragraph type="warning">Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env</Paragraph>
                    <MapComponent 
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} 
                        markers={markers} 
                    />
                </Card>

                {/* 4. PDF Generation */}
                <Card title="4. PDF Generation (Backend)" variant="borderless">
                    <Button 
                        type="primary" 
                        icon={<FilePdfOutlined />} 
                        onClick={handleDownloadPDF}
                    >
                        Generate & Download Test PDF
                    </Button>
                </Card>

                {/* 5. File Upload */}
                <Card title="5. File Upload (Cloudinary)" variant="borderless">
                    <Upload 
                        customRequest={handleUpload} 
                        showUploadList={false}
                    >
                        <Button icon={<UploadOutlined />} loading={uploading}>Click to Upload Test Image</Button>
                    </Upload>
                </Card>

            </Space>
        </div>
    );
};

export default VerificationPage;
