import { fetchRankings } from "@/app/rankings/fetch";
import { Shield, Trophy } from "lucide-react";
import RankingFilters from "./RankingFilters";
import Link from "next/link";
import GlobalNavbar from "../GlobalNavbar";
import GlobalFooter from "../GlobalFooter";
import { getTenant } from "@/lib/tenant";
import { I18nProvider } from "../i18n";

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function RankingsPage({ searchParams }: Props) {
  const tenant = await getTenant();
  const currentType =
    typeof searchParams.type === "string" ? searchParams.type : "KYORUGI";

  const division =
    typeof searchParams.division === "string"
      ? searchParams.division
      : undefined;
  const belt =
    typeof searchParams.belt === "string" ? searchParams.belt : undefined;
  const skillLevel =
    typeof searchParams.skillLevel === "string"
      ? searchParams.skillLevel
      : undefined;
  const gender =
    typeof searchParams.gender === "string" ? searchParams.gender : undefined;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : undefined;

  const tenantId = tenant.slug !== "ktm" ? tenant.id || undefined : undefined;

  const rankings = await fetchRankings({
    type: currentType,
    division,
    belt,
    skillLevel,
    gender,
    tenantId,
    tenantSlug: tenant.slug,
    search,
  });

  // Derive tab link helper — preserve tenant param for local dev
  const getTabLink = (type: string) => {
    const params = new URLSearchParams();
    params.set("type", type);
    if (division) params.set("division", division);
    if (gender) params.set("gender", gender);
    if (search) params.set("search", search);
    // Preserve tenant param (used in local dev, ignored in production)
    const tenantParam = typeof searchParams.tenant === "string" ? searchParams.tenant : undefined;
    if (tenantParam) params.set("tenant", tenantParam);
    return `/rankings?${params.toString()}`;
  };

  return (
    <I18nProvider>
      <main
        className="min-h-screen bg-[#0A0A0A] flex flex-col"
        style={{ fontFamily: "var(--font-outfit), sans-serif" }}
      >
        <GlobalNavbar />

        <div className="flex-1 pb-20">
          {/* Hero Section */}
          <div className="relative overflow-hidden py-20 pt-32 md:pt-36 px-4 bg-[#0A0A0A]">
            {/* Ambient glow */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
              <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-[1400px] mx-auto text-center relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                Official Leaderboard
              </div>

              <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight uppercase text-white leading-none">
                WOTF <span className="text-white/40">Rankings</span>
              </h1>
              <p className="text-gray-500 text-sm md:text-base max-w-lg mx-auto font-medium tracking-wide">
                Powered by KTM GSS Ranking System
              </p>

              {/* Discipline Tabs */}
              <div className="flex justify-center mt-10">
                <div className="inline-flex p-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                  <Link
                    href={getTabLink("KYORUGI")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                      currentType === "KYORUGI"
                        ? "bg-white text-black shadow-lg"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Kyorugi
                  </Link>
                  <Link
                    href={getTabLink("POOMSAE")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                      currentType === "POOMSAE"
                        ? "bg-white text-black shadow-lg"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Poomsae
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full max-w-[1400px] mx-auto px-4 space-y-6 relative z-20">
            <RankingFilters />

            {/* Results Meta Bar */}
            <div className="flex items-center justify-between text-sm font-medium text-gray-500 bg-[#111] px-5 py-3 border border-white/10 rounded-t-xl">
              <div>
                <span className="text-white font-bold text-base">{rankings.length}</span>{" "}
                athletes ranked
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Active
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                  Inactive
                </div>
              </div>
            </div>

            {/* Rankings Table */}
            <div className="w-full bg-[#111] border border-t-0 border-white/10 rounded-b-xl overflow-hidden -mt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0D0D0D] border-b border-white/10">
                    <tr>
                      <th className="px-5 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest w-16">
                        #
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Athlete
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest hidden md:table-cell">
                        Club
                      </th>
                      <th className="px-5 py-4 text-right text-[10px] font-black text-white uppercase tracking-widest w-28">
                        GS Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-20 text-center"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                              <Trophy className="w-7 h-7 text-gray-600" />
                            </div>
                            <p className="text-gray-500 font-medium">
                              No ranked athletes found matching your filters.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rankings.map((athlete, index) => (
                        <tr
                          key={athlete.userId}
                          className={`transition-colors group border-b border-white/[0.03] last:border-0 ${
                            athlete.isActive === false ? "opacity-40" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          {/* Rank */}
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            {athlete.rank <= 3 ? (
                              <div
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${
                                  athlete.rank === 1
                                    ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30"
                                    : athlete.rank === 2
                                    ? "bg-gray-400/20 text-gray-300 ring-1 ring-gray-400/30"
                                    : "bg-amber-600/20 text-amber-500 ring-1 ring-amber-500/30"
                                }`}
                              >
                                {athlete.rank}
                              </div>
                            ) : (
                              <span className="text-gray-600 font-bold text-sm">
                                {athlete.rank}
                              </span>
                            )}
                          </td>

                          {/* Athlete */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded-full bg-[#1A1A1A] border border-white/10 overflow-hidden flex-shrink-0">
                                {athlete.profileImage ? (
                                  <img
                                    src={athlete.profileImage}
                                    alt={athlete.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-black text-sm">
                                    {athlete.name.charAt(0)}
                                  </div>
                                )}
                                {athlete.verified && (
                                  <div className="absolute -bottom-0.5 -right-0.5 bg-[#0A0A0A] rounded-full p-[2px]">
                                    <Shield className="w-3 h-3 text-blue-400 fill-blue-400" />
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/athlete/${athlete.userId}`}
                                    className="font-bold text-white text-sm hover:text-blue-400 transition-colors tracking-tight truncate"
                                  >
                                    {athlete.name.toUpperCase()}
                                  </Link>
                                  {athlete.isActive === false && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white/5 text-gray-600 rounded border border-white/5 flex-shrink-0">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-gray-600 font-medium tracking-wide mt-0.5 md:hidden">
                                  {athlete.clubName || "Independent"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Club */}
                          <td className="px-5 py-4 whitespace-nowrap hidden md:table-cell">
                            <span className="font-medium text-gray-500 text-sm">
                              {athlete.clubName || "Independent"}
                            </span>
                          </td>


                          {/* GSS Score */}
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="font-black text-white text-lg tabular-nums tracking-tight">
                              {Math.round(athlete.totalPoints)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <GlobalFooter />
      </main>
    </I18nProvider>
  );
}
