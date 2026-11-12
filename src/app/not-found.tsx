import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <span className="auros-caption text-[#fde9ff]">
        ERROR 404 // ROUTE UNRESOLVED
      </span>
      <h1 className="auros-display text-[48px]">Signal Not Found</h1>
      <Link
        href="/"
        className="auros-btn-aurora px-6 py-3 inline-flex items-center gap-2 mt-2"
      >
        RETURN TO TERMINAL
      </Link>
    </div>
  );
}

