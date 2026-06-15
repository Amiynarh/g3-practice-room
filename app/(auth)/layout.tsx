import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-white px-4 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/branding/logo/g3women-colored.png"
            alt="G3Women"
            width={90}
            height={28}
            className="h-7 w-auto object-contain"
            priority
          />
          <div className="h-4 w-px bg-border mx-1" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
            Practice Room
          </span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        {children}
      </div>
    </div>
  );
}
