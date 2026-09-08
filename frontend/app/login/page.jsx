import dynamic from "next/dynamic";

export const metadata = {
  title: 'Login',
  description: 'Sign in to your MBK Carrierz account to access your training dashboard, courses, and professional development tools.',
};

const LoginClient = dynamic(() => import("@/features/auth/pages/Login"));

export default function LoginPage() {
  return <LoginClient />;
}
