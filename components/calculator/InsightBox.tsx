"use client";

import React from "react";

type InsightType = "info" | "warning" | "danger" | "success";

interface InsightBoxProps {
  type?: InsightType;
  children: React.ReactNode;
}

const STYLES: Record<InsightType, string> = {
  info:    "bg-blue-950/40 border-blue-500/30 text-blue-300",
  warning: "bg-yellow-950/40 border-yellow-500/30 text-yellow-300",
  danger:  "bg-red-950/40 border-red-500/30 text-red-300",
  success: "bg-green-950/40 border-green-500/30 text-green-300",
};

export function InsightBox({ type = "info", children }: InsightBoxProps) {
  return (
    <div className={"p-3 rounded-lg border text-sm leading-relaxed " + STYLES[type]}>
      {children}
    </div>
  );
}
