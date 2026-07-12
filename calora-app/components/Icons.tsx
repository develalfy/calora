import type { FC, SVGProps } from "react";

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function makeIcon(path: React.ReactNode): FC<IconProps> {
  return ({ size = 20, ...rest }) => (
    <svg {...base} width={size} height={size} {...rest}>
      {path}
    </svg>
  );
}

// ──────────────────────────────────────────────
// UI primitives — Calora uses a tight icon family
// ──────────────────────────────────────────────

export const IconCamera = makeIcon(
  <>
    <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
    <circle cx="12" cy="13" r="3.5" />
  </>,
);
export const IconChevronLeft = makeIcon(<path d="M15 6l-6 6 6 6" />);
export const IconChevronRight = makeIcon(<path d="M9 6l6 6-6 6" />);
export const IconClose = makeIcon(
  <>
    <path d="M6 6l12 12M6 18L18 6" />
  </>,
);
export const IconHistory = makeIcon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const IconSettings = makeIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>,
);
export const IconPlus = makeIcon(
  <>
    <path d="M12 5v14M5 12h14" />
  </>,
);
export const IconCheck = makeIcon(<path d="M5 13l4 4L19 7" />);
export const IconUpload = makeIcon(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </>,
);
export const IconFlame = makeIcon(
  <path d="M8.5 14.5c0-2 1.5-2.5 2-4.5 0.5-2 0-3 1-4 0.5 2 3 3 3 6 1.5 3-1 5-3.5 5-2.5 0-2.5-2.5-2.5-2.5Z" />,
);
export const IconTrash = makeIcon(
  <>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </>,
);
export const IconSparkle = makeIcon(
  <>
    <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z" />
  </>,
);
export const IconDownload = makeIcon(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </>,
);
export const IconLeaf = makeIcon(
  <>
    <path d="M11 20A7 7 0 0 1 4 13c0-3.5 2.5-9 7-9 0 0 0 6-3 9-3 3-3 7-3 7Z" />
    <path d="M4 13c0-3 1-6 4-8" />
  </>,
);
