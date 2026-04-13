import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export function AppLayout() {
  return (
    <div className="lor-page-shell flex">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--lor-bg)]">
        <TopBar />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
