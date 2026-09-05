import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-abyss-950">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopBar />
        <main className="p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
