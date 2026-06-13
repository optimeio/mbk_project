import SpocDashboard from "@/chat/pages/SpocDashboard";
import AdminDashboard from "@/chat/pages/AdminDashboard";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";



const WorkspaceCommunication = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const router = useRouter();

  // Redirect Trainers to their dashboard and prevent rendering any workspace UI
  useEffect(() => {
    if (role && role.toLowerCase().includes("trainer")) {
      router.replace("/trainer/dashboard");
    }
  }, [role, router]);

  // If the user is a trainer, render nothing (redirect handled above)
  if (role && role.toLowerCase().includes("trainer")) {
    return null;
  }

  if (role === "SPOCAdmin" || role === "CollegeAdmin") {
    return <SpocDashboard />;
  }

  // For other roles (including Admin), render AdminDashboard
  return <AdminDashboard />;
};

export default WorkspaceCommunication;
