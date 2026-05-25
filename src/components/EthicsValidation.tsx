import {
  CalendarCheck,
  FileSearch,
  UserCheck,
  Users,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Badge from "./Badge";

const STEPS = [
  {
    n: 1,
    title: "데이터 기준연도 확인",
    desc: "분석에 사용된 데이터의 기준연도(2026)를 확인하고, 정책·상담 시점과의 차이를 점검합니다.",
    icon: CalendarCheck,
  },
  {
    n: 2,
    title: "추천 근거 확인",
    desc: "각 추천이 근거로 삼은 현재 기준 데이터와 학생 프로필 입력값을 명시적으로 확인합니다.",
    icon: FileSearch,
  },
  {
    n: 3,
    title: "교사 검토",
    desc: "AI 초안 추천 결과를 담임·진로·특수교육 교사가 검토하고 보완합니다.",
    icon: UserCheck,
  },
  {
    n: 4,
    title: "학생·보호자 상담",
    desc: "검토된 결과를 바탕으로 학생·보호자와 상담하고 동의를 거쳐 경로를 확정합니다.",
    icon: Users,
  },
  {
    n: 5,
    title: "현장 적용 결과 피드백",
    desc: "현장 적용 후 실제 효과와 한계를 기록하고, 다음 회차 데이터·산식 보완에 반영합니다.",
    icon: RefreshCw,
  },
];

const ETHICS_ITEMS = [
  {
    title: "데이터 기준연도 표시",
    desc: "모든 화면에 기준연도(2026)를 명시합니다.",
  },
  {
    title: "개인정보 최소수집 원칙",
    desc: "프로토타입 입력 항목은 추천에 필요한 최소 범위로 제한합니다.",
  },
  {
    title: "실제 저장 없음",
    desc: "본 화면에서 입력된 값은 서버 저장·전송 없이 화면 내 상태로만 사용됩니다.",
  },
  {
    title: "AI 추천 결과 검증 필요",
    desc: "AI 산출물은 최종 결정이 아닌 초안이며, 반드시 인적 검토를 거칩니다.",
  },
  {
    title: "교사 및 담당자 최종 확인 필요",
    desc: "추천 경로는 담당 교사·진로교사·특수교육 담당자의 확인 후 활용합니다.",
  },
  {
    title: "시연용 데이터와 실제 공공데이터 구분 필요",
    desc: "본 프로토타입의 모든 수치는 시연용 더미이며, 실제 공공데이터로 대체 시 별도 검증을 거쳐야 합니다.",
  },
];

export default function EthicsValidation() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            검증 절차 (5단계)
          </h3>
          <Badge tone="success">교사·담당자 검토 필수</Badge>
        </div>

        <ol className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.n}
                className="relative rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {s.n}
                  </span>
                  <Icon className="h-4 w-4 text-slate-600" />
                </div>
                <h4 className="mt-2 text-sm font-semibold text-slate-900">
                  {s.title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {s.desc}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          <h3 className="text-base font-semibold text-slate-900">
            윤리·개인정보 체크리스트
          </h3>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {ETHICS_ITEMS.map((item) => (
            <li
              key={item.title}
              className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-700" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
