export default function SettingsPage() {
  return (
    <div className="space-y-8 px-6 py-8 sm:px-10">
      <div>
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">Settings</h1>
        <p className="mt-1.5 text-muted-foreground text-sm">Manage your profile and preferences</p>
      </div>

      <div className="max-w-xl space-y-4">
        {/* Profile placeholder */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-border border-b px-5 py-4">
            <h2 className="font-semibold text-sm">Profile</h2>
            <p className="mt-0.5 text-muted-foreground text-xs">Your account information</p>
          </div>
          <div className="px-5 py-4 text-muted-foreground text-sm">
            Profile settings coming soon.
          </div>
        </div>
      </div>
    </div>
  );
}
