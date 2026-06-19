"use client";

import { SignOutButton } from "@clerk/nextjs";
import Image from "next/image";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 gap-6 p-4 text-center">
      <Image
        src="https://herokids.ro/wp-content/uploads/2026/03/logo-wide-220.webp"
        alt="HeroKids"
        width={160}
        height={58}
        style={{ height: 58, width: "auto" }}
        priority
      />
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-gray-800">Access denied</h1>
        <p className="text-sm text-gray-500">
          Your account is not authorized to use this application. Please contact
          the administrator.
        </p>
        <SignOutButton redirectUrl="/login">
          <button className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
