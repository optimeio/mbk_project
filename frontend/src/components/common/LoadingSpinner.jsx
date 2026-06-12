"use client";

import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const antIcon = <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />;

const LoadingSpinner = ({ text = "Loading module..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
      <Spin indicator={antIcon} />
      {text && <p className="mt-4 text-gray-500 font-medium animate-pulse">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
