"use client";

import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

export function NavBar() {
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
      <UserButton />
    </header>
  );
}
