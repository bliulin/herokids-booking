import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 gap-6 p-4">
      <Image
        src="https://herokids.ro/wp-content/uploads/2026/03/logo-wide-220.webp"
        alt="HeroKids"
        width={160}
        height={58}
        style={{ height: 58, width: "auto" }}
        priority
      />
      <SignIn routing="hash" />
      <p className="text-xs text-gray-400">Internal staff access only</p>
    </div>
  );
}
