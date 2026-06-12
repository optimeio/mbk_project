"use client";

import { App as AntdApp, ConfigProvider } from "antd";

export default function AntdProviders({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1890ff",
          borderRadius: 4,
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
