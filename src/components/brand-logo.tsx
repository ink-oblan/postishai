import Link from "next/link";

// viewBox trims the empty SVG space around the P letterform.
// Original asset is 591×591; visible P runs ~x=60–480, y=0–560.
// Adjust these four numbers if the crop looks off after a logo update.
const VIEWBOX = "60 0 420 560";

interface BrandLogoProps {
  /** Tailwind text-size class that controls overall scale, e.g. "text-xl" */
  className?: string;
  /** Wraps in a Next.js Link when provided */
  href?: string;
}

function LogoMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEWBOX}
      aria-hidden
      // 2em ≈ original h-8 at text-lg / h-10 at text-xl, scales with font size
      style={{ height: "2em", width: "auto" }}
    >
      <title>Postishai</title>
      <g transform="translate(0,591) scale(0.1,-0.1)">
        <path
          fill="#E88A24"
          d="M1081 4790 c1 -326 5 -368 44 -506 50 -173 128 -304 260 -440 143
-146 317 -240 540 -290 17 -4 205 -9 419 -11 l389 -5 -216 214 c-202 200 -217
216 -231 267 -59 205 71 381 282 384 66 1 145 -23 191 -57 29 -22 488 -465
798 -771 119 -117 122 -122 143 -193 16 -54 21 -86 16 -120 -13 -98 -43 -137
-274 -358 -119 -115 -271 -261 -337 -324 -66 -64 -149 -143 -185 -175 -36 -33
-99 -92 -140 -132 -137 -131 -255 -160 -390 -97 -122 58 -175 139 -175 270 0
118 25 159 195 317 74 70 180 169 235 221 l100 95 -368 1 c-379 0 -457 -6
-582 -42 -349 -101 -595 -369 -688 -748 -20 -81 -21 -116 -24 -787 l-4 -703
651 0 650 0 0 330 0 330 358 0 c367 0 462 6 641 41 695 137 1232 636 1406
1307 41 155 68 397 60 537 -29 537 -234 963 -623 1297 -243 209 -541 350 -872
413 -47 9 -94 19 -105 22 -11 4 -503 9 -1093 12 l-1073 6 2 -305z"
        />
        <path
          fill="#242323"
          d="M2473 4386 c-142 -47 -222 -180 -193 -323 7 -32 18 -69 25 -83 7 -14
149 -160 315 -325 166 -165 308 -312 316 -327 9 -18 11 -34 5 -50 -10 -25
-134 -148 -464 -458 -236 -222 -260 -256 -261 -364 -1 -128 52 -213 166 -270
82 -41 151 -47 236 -20 62 20 99 50 327 267 338 321 600 572 658 630 106 105
135 218 89 337 -25 64 -109 150 -862 878 -36 34 -87 73 -115 87 -63 31 -180
42 -242 21z"
        />
      </g>
    </svg>
  );
}

function LogoInner({ className = "text-xl" }: Pick<BrandLogoProps, "className">) {
  return (
    <span className={`flex items-end font-bold leading-none ${className}`}>
      <span className="relative z-10">
        <LogoMark />
      </span>
      <span className="relative z-0 -ml-[0.05em]">ostishAI</span>
    </span>
  );
}

export function BrandLogo({ className, href }: BrandLogoProps) {
  if (href) {
    return (
      <Link href={href}>
        <LogoInner className={className} />
      </Link>
    );
  }
  return <LogoInner className={className} />;
}
