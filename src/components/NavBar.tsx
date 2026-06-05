"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export function NavBar() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center">
        <Image
          src="https://herokids.ro/wp-content/uploads/2026/03/logo-wide-220.webp"
          alt="HeroKids"
          width={110}
          height={40}
          style={{ height: 40, width: "auto" }}
          priority
        />
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}
