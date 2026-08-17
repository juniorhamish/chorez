"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function Error({
  error,
  retry,
}: Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#2D336B] font-sans flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center bg-white rounded-[2.5rem] p-8 border border-indigo-50 shadow-2xl shadow-indigo-100/80">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-5">
          <TriangleAlert size={26} />
        </div>
        <h2 className="text-xl font-black mb-2">Something went wrong</h2>
        <p className="text-indigo-600/70 font-medium text-sm mb-8">
          We hit an unexpected error. Give it another try &mdash; if it keeps happening, let us know from the Help
          button.
        </p>
        <button
          onClick={() => retry()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <RefreshCw size={18} />
          Try again
        </button>
      </div>
    </div>
  );
}
