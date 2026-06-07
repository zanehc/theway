import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";
import { signOutAndClearSession } from "~/lib/authClient";
import { useNotifications } from "~/contexts/NotificationContext";
import { LoginForm } from "~/components/LoginForm";
import { SignupForm } from "~/components/SignupForm";
import ModalPortal from "~/components/ModalPortal";
import { HomeSkeleton } from "~/components/LoadingSkeleton";

// 교회소식 기본값 (2026.05.17 주보 기준)
const YOUTH_SUMMER_RETREAT_EVENT = {
  title: "청소년부 여름수련회",
  date: "7/30(목) ~ 8/1(토)",
  desc: "호서대학교 천안캠퍼스",
};

const DEFAULT_NEWS = {
  registerNotice: "",
  events: [
    { title: "예비목자교육", date: "5/10 - 6/07 / 매 주일 오후 2시 30분", desc: "" },
    { title: "청장년목자모임", date: "5/30(토) 오전 10시", desc: "" },
    { title: "중보기도팀 모임", date: "6/07(주일) 오후 3시", desc: "" },
    { title: "새 생명의 길", date: "6/14(주일) 오후 2시 40분", desc: "" },
    { title: "유초등부 여름성경학교", date: "7/24(금)-25(토)", desc: "길을여는교회" },
    YOUTH_SUMMER_RETREAT_EVENT,
    { title: "전교인 수련회", date: "8/28(금) ~ 8/30(주일)", desc: "국립나주숲체원" },
  ],
  birthdays: [],
  offeringAccounts: [
    { bank: "국민", number: "359301-04-070463", owner: "길을여는교회" },
    { bank: "국민", number: "897001-00-044203", owner: "구제 / 선교" },
    { bank: "국민", number: "897001-00-014048", owner: "건축" },
    { bank: "카카오뱅크", number: "3333-29-6621229", owner: "Cafe 이음 (편도영)" },
  ],
  etc: "",
};

type CalendarEvent = {
  title?: string;
  date?: string;
  desc?: string;
};

type CalendarDateRange = {
  start: Date;
  end: Date;
  allDay: boolean;
};

function withRequiredHomeEvents(news: typeof DEFAULT_NEWS) {
  const events = Array.isArray(news.events) ? news.events : [];
  const hasYouthRetreat = events.some((event) => event?.title === YOUTH_SUMMER_RETREAT_EVENT.title);

  if (hasYouthRetreat) {
    return { ...news, events };
  }

  const insertAt = events.findIndex((event) => event?.title === "전교인 수련회");
  const nextEvents = [...events];

  if (insertAt >= 0) {
    nextEvents.splice(insertAt, 0, YOUTH_SUMMER_RETREAT_EVENT);
  } else {
    nextEvents.push(YOUTH_SUMMER_RETREAT_EVENT);
  }

  return { ...news, events: nextEvents };
}

const padCalendarNumber = (value: number) => String(value).padStart(2, '0');

const formatGoogleDate = (date: Date, allDay: boolean) => {
  const year = date.getFullYear();
  const month = padCalendarNumber(date.getMonth() + 1);
  const day = padCalendarNumber(date.getDate());
  if (allDay) return `${year}${month}${day}`;
  return `${year}${month}${day}T${padCalendarNumber(date.getHours())}${padCalendarNumber(date.getMinutes())}00`;
};

const formatIcsDate = (date: Date, allDay: boolean) => {
  if (allDay) return formatGoogleDate(date, true);
  return `${formatGoogleDate(date, false)}`;
};

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

const parseKoreanEventDate = (dateText?: string): CalendarDateRange | null => {
  if (!dateText) return null;

  const firstDateMatch = dateText.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!firstDateMatch) return null;

  const now = new Date();
  const year = now.getFullYear();
  const startMonth = Number(firstDateMatch[1]);
  const startDay = Number(firstDateMatch[2]);
  const timeMatch = dateText.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
  const allDay = !timeMatch;
  let startHour = 9;
  let startMinute = 0;

  if (timeMatch) {
    startHour = Number(timeMatch[2]);
    startMinute = Number(timeMatch[3] || 0);
    if (timeMatch[1] === '오후' && startHour < 12) startHour += 12;
    if (timeMatch[1] === '오전' && startHour === 12) startHour = 0;
  }

  const start = new Date(year, startMonth - 1, startDay, startHour, startMinute, 0, 0);
  const endDateMatch = dateText
    .slice(firstDateMatch.index! + firstDateMatch[0].length)
    .match(/[-~]\s*(?:(\d{1,2})\s*\/)?\s*(\d{1,2})/);

  let end: Date;
  if (endDateMatch) {
    const endMonth = Number(endDateMatch[1] || startMonth);
    const endDay = Number(endDateMatch[2]);
    end = new Date(year, endMonth - 1, endDay, startHour, startMinute, 0, 0);
    if (end < start) end.setFullYear(year + 1);
    if (allDay) end.setDate(end.getDate() + 1);
    else end.setHours(end.getHours() + 1);
  } else {
    end = new Date(start);
    if (allDay) end.setDate(end.getDate() + 1);
    else end.setHours(end.getHours() + 1);
  }

  return { start, end, allDay };
};

const buildGoogleCalendarUrl = (event: CalendarEvent) => {
  const range = parseKoreanEventDate(event.date);
  if (!range) return null;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || '길을여는교회 행사',
    dates: `${formatGoogleDate(range.start, range.allDay)}/${formatGoogleDate(range.end, range.allDay)}`,
    details: [event.date, event.desc].filter(Boolean).join('\n'),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const downloadAppleCalendarEvent = (event: CalendarEvent) => {
  const range = parseKoreanEventDate(event.date);
  if (!range) return;

  const title = event.title || '길을여는교회 행사';
  const description = [event.date, event.desc].filter(Boolean).join('\n');
  const dateField = range.allDay ? ';VALUE=DATE' : '';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TheWay//Ieum Cafe//KO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@theway`,
    `DTSTAMP:${formatGoogleDate(new Date(), false)}Z`,
    `DTSTART${dateField}:${formatIcsDate(range.start, range.allDay)}`,
    `DTEND${dateField}:${formatIcsDate(range.end, range.allDay)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[\\/:*?"<>|]/g, '').trim() || 'church-event'}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const GoogleCalendarIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <rect x="3" y="4" width="18" height="17" rx="3" fill="#fff" />
    <path d="M6 2h2v4H6V2Zm10 0h2v4h-2V2Z" fill="#5F6368" />
    <path d="M3 8h18V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2Z" fill="#4285F4" />
    <path d="M3 8h4v13H6a3 3 0 0 1-3-3V8Z" fill="#34A853" />
    <path d="M17 8h4v10a3 3 0 0 1-3 3h-1V8Z" fill="#FBBC04" />
    <path d="M7 18h10v3H7v-3Z" fill="#EA4335" />
    <path d="M9.7 16.1c.5.4 1.1.6 1.9.6 1 0 1.7-.5 1.7-1.3 0-.7-.6-1.2-1.6-1.2H11v-1.3h.7c.8 0 1.4-.4 1.4-1.1 0-.7-.5-1.1-1.4-1.1-.7 0-1.3.2-1.8.7l-.8-1.1c.7-.7 1.6-1 2.8-1 1.7 0 2.8.8 2.8 2.1 0 .9-.6 1.6-1.5 1.8v.1c1 .2 1.8.9 1.8 2 0 1.5-1.3 2.5-3.2 2.5-1.3 0-2.3-.4-3-1.1l.9-1.1Z" fill="#3C4043" />
  </svg>
);

const AppleCalendarIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 814 1000" className="h-4 w-4" fill="currentColor">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.8 135.4-317.9 269-317.9 70.6 0 129.5 46.4 170.8 46.4 39.5 0 107.2-49.1 185.2-49.1 29.6 0 108.2 2.6 168.6 75.5zm-174.3-57.4c-10.9 49.1-38.2 97.8-71.4 128.1-32.6 29.6-69.5 48.4-107.2 48.4-1.3 0-2.6 0-3.9-.2-.7-5.1-1-10.3-1-15.5 0-40.5 18.6-91.9 52-124.8 32.8-32.3 85.2-55.6 131.3-57.2 1.3 0 2.6-.1 3.9-.1.9 6.7 1.4 13.6 1.4 20.5-.6 0-3.7.3-5.1.8z"/>
  </svg>
);


const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

function expandEventDates(dateStr: string): { infoLabel: string; badges: string[] } {
  if (!dateStr) return { infoLabel: '', badges: [] };
  const year = new Date().getFullYear();

  // "M/D - M/D / 매 주일 오후 N시 N분" — range + slash + recurrence/time
  const slashIdx = dateStr.indexOf(' / ');
  if (slashIdx >= 0) {
    const rangePart = dateStr.slice(0, slashIdx);
    const infoLabel = dateStr.slice(slashIdx + 3);
    const isWeekly = infoLabel.includes('매 주일') || infoLabel.includes('매주');
    const rangeMatch = rangePart.match(/^(\d{1,2})\/(\d{1,2})\s*[-~]\s*(?:(\d{1,2})\/)?(\d{1,2})/);
    if (rangeMatch) {
      const sm = Number(rangeMatch[1]), sd = Number(rangeMatch[2]);
      const em = Number(rangeMatch[3] || rangeMatch[1]), ed = Number(rangeMatch[4]);
      const start = new Date(year, sm - 1, sd);
      const end = new Date(year, em - 1, ed);
      const badges: string[] = [];
      const cur = new Date(start);
      while (cur <= end) {
        badges.push(`${cur.getMonth() + 1}/${cur.getDate()}`);
        cur.setDate(cur.getDate() + (isWeekly ? 7 : 1));
      }
      return { infoLabel, badges };
    }
  }

  // Extract time for single/consecutive date patterns
  const timeMatch = dateStr.match(/(오전|오후)\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?/);
  const infoLabel = timeMatch ? timeMatch[0] : '';
  const datePart = dateStr.replace(infoLabel, '').trim();

  // "M/D(x) - D(y)" or "M/D ~ M/D(y)" — consecutive range
  const rangeMatch = datePart.match(/(\d{1,2})\/(\d{1,2})(?:\([^\)]*\))?\s*[-~]\s*(?:(\d{1,2})\/)?(\d{1,2})(?:\([^\)]*\))?/);
  if (rangeMatch) {
    const sm = Number(rangeMatch[1]), sd = Number(rangeMatch[2]);
    const em = Number(rangeMatch[3] || rangeMatch[1]), ed = Number(rangeMatch[4]);
    const start = new Date(year, sm - 1, sd);
    const end = new Date(year, em - 1, ed);
    const badges: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      badges.push(`${cur.getMonth() + 1}/${cur.getDate()}(${WEEKDAY_SHORT[cur.getDay()]})`);
      cur.setDate(cur.getDate() + 1);
    }
    return { infoLabel, badges };
  }

  // Single date: "M/D(요일)"
  const singleMatch = datePart.match(/(\d{1,2})\/(\d{1,2})(?:\(([^\)]+)\))?/);
  if (singleMatch) {
    const m = Number(singleMatch[1]), d = Number(singleMatch[2]);
    const w = singleMatch[3] || WEEKDAY_SHORT[new Date(year, m - 1, d).getDay()];
    return { infoLabel, badges: [`${m}/${d}(${w})`] };
  }

  return { infoLabel: dateStr, badges: [] };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  // 교회소식 데이터를 가져오기 (속도 개선)
  const [newsResult] = await Promise.allSettled([
    // 교회소식 데이터
    supabase
      .from('church_news')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
  ]);

  // 교회소식 처리
  let news = DEFAULT_NEWS;
  if (newsResult.status === 'fulfilled' && !newsResult.value.error && newsResult.value.data?.length > 0) {
    news = newsResult.value.data[0].news as typeof DEFAULT_NEWS;
  }
  news = withRequiredHomeEvents(news);

  return json({
    error,
    success,
    news
  });
}

export default function Index() {
  const { error, success, news } = useLoaderData<typeof loader>();
  const outletContext = useOutletContext<{ user: any; userRole: string | null; userProfile?: { name: string; church_group: string } | null }>();
  const navigation = useNavigation();
  const [mounted, setMounted] = useState(false);

  const user = outletContext?.user || null;
  const userRole = outletContext?.userRole || null;
  const displayName = outletContext?.userProfile?.name?.trim()
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || '';

  // 교회소식 상태 (서버 데이터로 초기화, 저장 후 즉시 반영용)
  const [newsData, setNewsData] = useState<any>(news);
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [newsEditForm, setNewsEditForm] = useState<any>(null);
  const [newsSaving, setNewsSaving] = useState(false);

  const startEditingNews = useCallback(() => {
    setNewsEditForm(JSON.parse(JSON.stringify(newsData)));
    setIsEditingNews(true);
  }, [newsData]);

  const cancelEditingNews = () => {
    setIsEditingNews(false);
    setNewsEditForm(null);
  };

  const saveNews = async () => {
    setNewsSaving(true);
    try {
      const res = await fetch('/api/update-church-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news: newsEditForm }),
      });
      const data = await res.json();
      if (data.success) {
        setNewsData(newsEditForm);
        setIsEditingNews(false);
        setNewsEditForm(null);
      } else {
        alert('저장에 실패했습니다: ' + (data.error || ''));
      }
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setNewsSaving(false);
    }
  };
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedCafe, setCopiedCafe] = useState(false);

  const copyAccount = (number: string, idx: number) => {
    navigator.clipboard.writeText(number).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    }).catch(() => {});
  };

  const copyCafeAccount = () => {
    navigator.clipboard.writeText('3333-29-6621229').then(() => {
      setCopiedCafe(true);
      setTimeout(() => setCopiedCafe(false), 1500);
    }).catch(() => {});
  };

  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { toasts, initializeTTS, showNotification } = useNotifications();

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // 에러 및 성공 메시지 처리
  useEffect(() => {
    if (error) {
      console.error('OAuth 오류:', error);

      // OAuth 관련 오류 메시지 개선
      let errorMessage = error;
      if (error.includes('Invalid API key') || error.includes('Invalid API key')) {
        errorMessage = 'OAuth 설정이 완료되지 않았습니다. Supabase에서 Google/Kakao Provider를 활성화해주세요.';
      } else if (error.includes('invalid_grant')) {
        errorMessage = '로그인 요청이 만료되었습니다. 다시 시도해주세요.';
      } else if (error.includes('access_denied')) {
        errorMessage = '로그인이 취소되었습니다.';
      }

      showNotification(errorMessage, 'error');

      // URL에서 에러 파라미터 제거
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }

    if (success) {
      showNotification(success, 'success');

      // URL에서 성공 파라미터 제거
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [error, success, showNotification]);

  // Safari 호환성을 위한 안전한 네비게이션 상태 체크 (모든 훅 호출 후에 조건부 return)
  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/") {
    return <HomeSkeleton />;
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-soft pb-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* 브랜드 및 사용자 정보 헤더 - 여백 최소화 */}
        <div className="mb-3 sm:mb-4">
          <div className="flex justify-between items-center">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/church-logo-gil.png"
                alt="길을여는교회 로고"
                className="h-12 max-w-[48vw] shrink-0 object-contain sm:h-14 sm:max-w-[270px]"
                width={455}
                height={116}
              />
              <div className="flex items-center gap-1.5">
                <a
                  href="https://www.youtube.com/channel/UCIjrJ4vu_SWMNPM9FyISPOw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-canvas border border-hairline hover:bg-red-50 hover:border-red-200 transition-colors group"
                >
                  <svg className="h-3.5 w-3.5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/gospel_in_life_love/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-canvas border border-hairline hover:bg-pink-50 hover:border-pink-200 transition-colors group"
                >
                  <svg className="h-3.5 w-3.5 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* 사용자 정보 및 로그인 버튼 */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/mypage"
                    prefetch="intent"
                    className="text-right rounded-2xl px-2 py-1 transition-colors hover:bg-surface-soft focus:outline-none focus:ring-2 focus:ring-focus-outer"
                    aria-label="마이페이지로 이동"
                  >
                    <div className="text-body font-bold text-sm">
                      {displayName}님
                    </div>
                    <div className="text-mute text-xs">
                      안녕하세요
                    </div>
                  </Link>
                  <button
                    onClick={async () => {
                      try {
                        await signOutAndClearSession();
                      } finally {
                        window.location.replace('/');
                      }
                    }}
                    className="bg-surface-soft hover:bg-surface-card text-body border border-stone px-3 py-1 rounded-2xl font-medium transition-all text-xs"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    initializeTTS();
                    setShowLogin(true);
                  }}
                  className="bg-primary hover:bg-primary-pressed text-white border-2 border-primary-pressed px-4 py-2 rounded-2xl font-bold transition-all text-sm"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cafe 이음 계좌 패널 */}
        <div className="mb-3 sm:mb-4">
          <div className="bg-canvas border-2 border-hairline-soft rounded-2xl overflow-hidden">
            <div className="relative bg-yellow-400 px-4 py-3 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-yellow-300 opacity-40 pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-yellow-900">☕</span>
                  <div>
                    <p className="text-yellow-900 text-[10px] font-bold tracking-wider uppercase leading-none">이음카페</p>
                    <h2 className="text-base font-black text-yellow-900 leading-tight">Cafe 이음 계좌</h2>
                  </div>
                </div>
                <button
                  onClick={copyCafeAccount}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-yellow-900/10 hover:bg-yellow-900/20 text-yellow-900"
                >
                  {copiedCafe ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      복사됨
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      계좌번호 복사
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="bg-yellow-400 text-yellow-900 text-xs font-black px-2.5 py-1 rounded-lg shrink-0">카카오뱅크</span>
              <span className="text-sm font-mono font-bold text-ink tracking-wide">3333-29-6621229</span>
              <span className="text-xs text-mute ml-auto shrink-0">편도영</span>
            </div>
          </div>
        </div>

        {/* 교회소식 섹션 */}
        <div className="mb-3 sm:mb-4">
          <div className="bg-canvas border-2 border-hairline-soft rounded-2xl overflow-hidden">

            {/* 헤더 — 진한 배경으로 강한 인상 */}
            <div className="relative bg-charcoal px-4 pt-4 pb-5 overflow-hidden">
              {/* 장식용 원형 그라데이션 */}
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-wine-600 opacity-20 pointer-events-none" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-wine-700 opacity-10 pointer-events-none" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-wine-400 text-xs font-bold tracking-widest uppercase mb-0.5">길을여는교회</p>
                  <h2 className="text-xl font-black text-white tracking-tight leading-tight">교회 소식</h2>
                  <p className="text-stone text-xs mt-1">하나님의 은혜가 함께하는 소식들</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {userRole === 'admin' && !isEditingNews && (
                    <button
                      onClick={startEditingNews}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      편집
                    </button>
                  )}
                  {isEditingNews && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={cancelEditingNews}
                        className="px-2.5 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={saveNews}
                        disabled={newsSaving}
                        className="px-2.5 py-1.5 bg-wine-600 text-white rounded-lg text-xs font-bold hover:bg-wine-700 disabled:opacity-50 transition-colors"
                      >
                        {newsSaving ? '저장 중…' : '저장'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isEditingNews ? (
              /* ===== 표시 모드 ===== */
              <div className="p-3">
                {/* 생일축하 (있을 때만 상단에) */}
                {newsData?.birthdays && newsData.birthdays.length > 0 && (
                  <div className="rounded-xl border border-hairline bg-surface-soft px-3.5 py-3 mb-2.5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-1 h-4 bg-wine-600 rounded-full flex-shrink-0" />
                      <span className="text-xs font-black text-wine-600 tracking-wider uppercase">생일 축하</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newsData.birthdays.map((b: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-canvas border border-hairline rounded-xl px-3 py-2">
                          <div className="w-7 h-7 rounded-full bg-wine-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                            {b.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-ink-soft text-sm leading-none">{b.name}</p>
                            <p className="text-mute text-xs mt-0.5">{b.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 모바일은 행사/헌금/기타 3행, 넓은 화면은 기존 2열 구성 */}
                <div className="grid grid-cols-1 gap-2.5 items-start sm:grid-cols-2">

                  {/* 왼쪽 열: 행사일정 */}
                  {newsData?.events && newsData.events.length > 0 && (
                    <div className="rounded-xl border border-hairline bg-surface-soft px-3 py-3 h-full">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="w-1 h-4 bg-wine-600 rounded-full flex-shrink-0" />
                        <span className="text-xs font-black text-wine-600 tracking-wider uppercase">행사</span>
                        <span className="ml-auto bg-wine-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{newsData.events.length}</span>
                      </div>
                      <div className="space-y-2">
                        {newsData.events.map((ev: any, idx: number) => {
                          const { infoLabel, badges } = expandEventDates(ev.date || '');
                          return (
                            <div key={idx} className="bg-canvas rounded-xl px-2.5 py-2 border border-hairline flex items-center gap-2">
                              {/* 왼쪽: 제목 + 뱃지 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-4 h-4 rounded-full bg-wine-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 leading-none">{idx + 1}</span>
                                  <p className="font-bold text-ink text-xs leading-tight">
                                    {ev.title}
                                    {infoLabel && <span className="font-normal text-wine-600"> / {infoLabel}</span>}
                                  </p>
                                </div>
                                {badges.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pl-5">
                                    {badges.map((b, bi) => (
                                      <span key={bi} className="inline-block bg-wine-50 border border-wine-200 text-wine-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none">
                                        {b}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {ev.desc && <p className="text-mute text-xs leading-relaxed pl-5 mt-1">{ev.desc}</p>}
                              </div>
                              {/* 오른쪽: 캘린더 버튼 (가로, 1-2행 걸침) */}
                              {buildGoogleCalendarUrl(ev) && (
                                <div className="flex-shrink-0 flex items-center gap-1">
                                  <a
                                    href={buildGoogleCalendarUrl(ev) || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-hairline bg-surface-soft transition-colors hover:border-wine-600"
                                    aria-label={`${ev.title || '행사'} Google 캘린더에 추가`}
                                    title="Google 캘린더에 추가"
                                  >
                                    <GoogleCalendarIcon />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => downloadAppleCalendarEvent(ev)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-hairline bg-surface-soft transition-colors hover:border-wine-600"
                                    aria-label={`${ev.title || '행사'} Apple 캘린더에 추가`}
                                    title="Apple 캘린더에 추가"
                                  >
                                    <AppleCalendarIcon />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 오른쪽 열: 헌금계좌 + 기타안내 */}
                  <div className="contents sm:block sm:space-y-2.5">
                    {/* 헌금계좌 */}
                    {newsData?.offeringAccounts && newsData.offeringAccounts.length > 0 && (
                      <div className="rounded-xl border border-hairline bg-surface-soft px-3 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1 h-4 bg-wine-600 rounded-full flex-shrink-0" />
                          <span className="text-xs font-black text-wine-600 tracking-wider uppercase">헌금</span>
                        </div>
                        <div className="space-y-1.5">
                          {newsData.offeringAccounts.map((acc: any, idx: number) => (
                            <div key={idx} className="bg-canvas border border-hairline rounded-xl px-2.5 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="bg-charcoal text-white text-xs font-black px-2 py-0.5 rounded-md">{acc.bank}</span>
                                <button
                                  onClick={() => copyAccount(acc.number, idx)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors bg-surface-soft hover:bg-surface-card text-body"
                                >
                                  {copiedIdx === idx ? (
                                    <>
                                      <svg className="h-3 w-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-green-600">복사됨</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      복사
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-ink-soft text-xs font-mono mt-1 leading-none">{acc.number}</p>
                              {acc.owner && <p className="text-mute text-xs mt-0.5 leading-tight">{acc.owner}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 기타안내 */}
                    {newsData?.etc && (
                      <div className="rounded-xl border border-hairline bg-surface-soft px-3 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1 h-4 bg-wine-600 rounded-full flex-shrink-0" />
                          <span className="text-xs font-black text-wine-600 tracking-wider uppercase">기타</span>
                        </div>
                        <p className="text-body text-xs leading-relaxed whitespace-pre-line">{newsData.etc}</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              /* ===== 편집 모드 (관리자 전용) ===== */
              <div className="divide-y divide-hairline p-4 space-y-5">

                {/* 행사일정 편집 */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-ink">행사 일정</label>
                    <button
                      type="button"
                      onClick={() => setNewsEditForm((f: any) => ({ ...f, events: [...(f.events || []), { title: '', date: '', desc: '' }] }))}
                      className="text-xs text-wine-600 font-bold hover:text-wine-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(newsEditForm?.events || []).map((ev: any, idx: number) => (
                      <div key={idx} className="bg-surface-soft rounded-xl p-2.5 space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            value={ev.title}
                            onChange={e => setNewsEditForm((f: any) => ({ ...f, events: f.events.map((x: any, i: number) => i === idx ? { ...x, title: e.target.value } : x) }))}
                            placeholder="행사명"
                            className="flex-1 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                          />
                          <button
                            type="button"
                            onClick={() => setNewsEditForm((f: any) => ({ ...f, events: f.events.filter((_: any, i: number) => i !== idx) }))}
                            className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                          >
                            삭제
                          </button>
                        </div>
                        <input
                          value={ev.date}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, events: f.events.map((x: any, i: number) => i === idx ? { ...x, date: e.target.value } : x) }))}
                          placeholder="날짜 (예: 1/11(주일) 오후 3시)"
                          className="w-full px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                        <input
                          value={ev.desc}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, events: f.events.map((x: any, i: number) => i === idx ? { ...x, desc: e.target.value } : x) }))}
                          placeholder="설명 (선택)"
                          className="w-full px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 생일축하 편집 */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-ink">생일 축하</label>
                    <button
                      type="button"
                      onClick={() => setNewsEditForm((f: any) => ({ ...f, birthdays: [...(f.birthdays || []), { name: '', date: '' }] }))}
                      className="text-xs text-wine-600 font-bold hover:text-wine-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(newsEditForm?.birthdays || []).map((b: any, idx: number) => (
                      <div key={idx} className="flex gap-1.5">
                        <input
                          value={b.name}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, birthdays: f.birthdays.map((x: any, i: number) => i === idx ? { ...x, name: e.target.value } : x) }))}
                          placeholder="이름"
                          className="flex-1 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                        <input
                          value={b.date}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, birthdays: f.birthdays.map((x: any, i: number) => i === idx ? { ...x, date: e.target.value } : x) }))}
                          placeholder="날짜 (예: 07.13)"
                          className="flex-1 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                        <button
                          type="button"
                          onClick={() => setNewsEditForm((f: any) => ({ ...f, birthdays: f.birthdays.filter((_: any, i: number) => i !== idx) }))}
                          className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 헌금계좌 편집 */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-ink">헌금 계좌</label>
                    <button
                      type="button"
                      onClick={() => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: [...(f.offeringAccounts || []), { bank: '', number: '', owner: '' }] }))}
                      className="text-xs text-wine-600 font-bold hover:text-wine-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(newsEditForm?.offeringAccounts || []).map((acc: any, idx: number) => (
                      <div key={idx} className="bg-surface-soft rounded-xl p-2.5 space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            value={acc.bank}
                            onChange={e => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: f.offeringAccounts.map((x: any, i: number) => i === idx ? { ...x, bank: e.target.value } : x) }))}
                            placeholder="은행 (예: 국민)"
                            className="w-20 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                          />
                          <input
                            value={acc.number}
                            onChange={e => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: f.offeringAccounts.map((x: any, i: number) => i === idx ? { ...x, number: e.target.value } : x) }))}
                            placeholder="계좌번호"
                            className="flex-1 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                          />
                          <button
                            type="button"
                            onClick={() => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: f.offeringAccounts.filter((_: any, i: number) => i !== idx) }))}
                            className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                          >
                            삭제
                          </button>
                        </div>
                        <input
                          value={acc.owner}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: f.offeringAccounts.map((x: any, i: number) => i === idx ? { ...x, owner: e.target.value } : x) }))}
                          placeholder="예금주 (예: 길을여는교회)"
                          className="w-full px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 기타안내 편집 */}
                <div className="pt-4">
                  <label className="block text-sm font-bold text-ink mb-1.5">기타 안내</label>
                  <textarea
                    value={newsEditForm?.etc || ''}
                    onChange={e => setNewsEditForm((f: any) => ({ ...f, etc: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border-2 border-wine-100 rounded-xl text-sm focus:outline-none focus:border-wine-400 resize-none"
                    placeholder="기타 안내 사항 (줄바꿈 지원)"
                  />
                </div>

              </div>
            )}
          </div>
        </div>


      </div>

      {/* 로그인 모달 - 그림자 없이 깔끔한 디자인 */}
      {showLogin && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/50 z-[50000]"
            onClick={() => setShowLogin(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-hairline rounded-2xl p-6 w-full max-w-xs sm:max-w-md"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-ash hover:text-body text-xl font-bold z-10"
              onClick={() => setShowLogin(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-ink mb-4 text-center">로그인</h2>
            <LoginForm
              onSwitchToSignup={() => {
                setShowLogin(false);
                setShowSignup(true);
              }}
              onLoginSuccess={() => {
                console.log('✅ 홈탭 로그인 성공 - 세션 확인 후 리다이렉트');
                setShowLogin(false);
                setLoginSuccess(true);
                setTimeout(() => {
                  setLoginSuccess(false);
                  window.location.href = '/';
                }, 1000);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {/* 회원가입 모달 - 그림자 없이 깔끔한 디자인 */}
      {showSignup && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/50 z-[50000]"
            onClick={() => setShowSignup(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-hairline rounded-2xl p-6 w-full max-w-xs sm:max-w-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-ash hover:text-body text-xl font-bold z-10"
              onClick={() => setShowSignup(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-ink mb-4 text-center">회원가입</h2>
            <SignupForm
              onSwitchToLogin={() => {
                setShowSignup(false);
                setShowLogin(true);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {/* 로그인 성공 메시지 - 그림자 없이 깔끔한 디자인 */}
      {loginSuccess && (
        <div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[99999] bg-surface-soft border-2 border-stone text-body px-4 sm:px-6 py-3 sm:py-4 rounded-2xl animate-fade-in font-bold text-sm sm:text-lg">
          로그인 되었습니다
        </div>
      )}
    </div>
  );
}
