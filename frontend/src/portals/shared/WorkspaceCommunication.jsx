import TrainerDashboard from "@/chat/pages/TrainerDashboard";
import SpocDashboard from "@/chat/pages/SpocDashboard";
import AdminDashboard from "@/chat/pages/AdminDashboard";
import { useAuth } from "@/context/AuthContext";

const WorkspaceCommunication = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  if (role === "Trainer") {
    return <TrainerDashboard />;
  }

  if (role === "SPOCAdmin" || role === "CollegeAdmin") {
    return <SpocDashboard />;
  }

  return <AdminDashboard />;
};

export default WorkspaceCommunication;
