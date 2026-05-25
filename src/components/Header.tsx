import { ShieldAlert, Calendar, Lock, GraduationCap } from "lucide-react";
import Badge from "./Badge";
import type { SectionId } from "../types";

interface HeaderProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

const NAV_ITEMS: { id: SectionId; label: string }[] = [
  { id: "dashboard", label: "1. 대시보드" },
  { id: "regional", label: "2. 지역별 공백 분석" },
  { id: "profile", label: "3. 학생 프로필 입력" },
  { id: "recommendation", label: "4. 맞춤 경로 추천" },
  { id: "ai-outputs", label: "5. AI 산출물 및 검증" },
];

export default function Header({ activeSection, onSectionChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-6 pt-5 pb-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-slate-900 p-2 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 lg:text-2xl">
                장애학생 전환교육 공백 분석 및 맞춤 경로 추천 시스템
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                지역별 전환교육 자원 공백을 확인하고, 교사 검토용 맞춤 경로 후보를 제안합니다.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="demo" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
              시연용 더미 데이터
            </Badge>
            <Badge tone="info" icon={<Calendar className="h-3.5 w-3.5" />}>
              기준연도: 2026
            </Badge>
            <Badge tone="success" icon={<Lock className="h-3.5 w-3.5" />}>
              개인정보 저장 없음
            </Badge>
          </div>
        </div>

        <nav className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={`whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
