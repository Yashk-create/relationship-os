import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navigation from "@/components/navigation";
import NotesDrawer from "@/components/notes-drawer";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dbUser, email, name } = await getAuthUser();

  // If user is not onboarded, redirect to onboard flow
  if (!dbUser || !dbUser.role) {
    redirect("/onboard");
  }

  return (
    <div className="flex min-h-screen bg-[#09090b] text-[#f4f4f5]">
      {/* Sidebar Navigation */}
      <Navigation 
        userRole={dbUser.role} 
        userName={name} 
        userEmail={email} 
      />

      {/* Main Workspace Workspace Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 h-full min-h-screen">
          {children}
        </div>
      </main>

      {/* Floating Global Notes Drawer */}
      <NotesDrawer />
    </div>
  );
}
