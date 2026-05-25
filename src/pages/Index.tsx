import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6" style={{ backgroundColor: '#fcfbf8' }}>
      <img src="/placeholder.svg" alt="Your app will live here!" />
      <Link
        to="/settings"
        className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Account Settings
      </Link>
    </div>
  );
};

export default Index;
