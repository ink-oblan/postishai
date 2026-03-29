import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  return (
    <div className="px-6 py-8 sm:px-10 space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1.5">
          Account
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Manage your profile and preferences</p>
      </div>

      <div className="space-y-4 max-w-xl">

        {/* Appearance */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Appearance</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred color theme</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Color theme</p>
              <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Profile placeholder */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your account information</p>
          </div>
          <div className="px-5 py-4 text-sm text-muted-foreground">
            Profile settings coming soon.
          </div>
        </div>

      </div>
    </div>
  );
}
