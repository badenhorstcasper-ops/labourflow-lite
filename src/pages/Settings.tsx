import TeamManagement from "@/components/TeamManagement";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your plan and team members.
          </p>
        </header>
        <section className="space-y-6">
          <TeamManagement />
        </section>
      </div>
    </div>
  );
};

export default Settings;
