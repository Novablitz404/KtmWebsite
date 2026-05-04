import { fetchRankings } from "@/app/rankings/fetch";
import { Shield } from "lucide-react";
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
    search,
  });

  return (
    <I18nProvider>
      <main
        className="min-h-screen bg-[#0A0A0A] flex flex-col"
        style={{ fontFamily: "var(--font-outfit), sans-serif" }}
      >
        <GlobalNavbar />

        <div className="flex-1 pb-20">
          {/* Hero Section */}
          <div className="relative overflow-hidden py-24 pt-32 md:pt-40 px-4 bg-[#0A0A0A]">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[100px]" />
              <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/5 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-[1400px] mx-auto text-center relative z-10 animate-hero-fade-in-delayed-1">
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-wider uppercase text-white">
                GS Score <span className="text-white/50">Rankings</span>
              </h1>
              <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                Official leaderboard for verified WOTF Global Taekwondo
                athletes.
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full max-w-[1400px] mx-auto px-4 py-8 md:py-12 space-y-6 relative z-20">
            <RankingFilters />

            {/* Results Meta */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm font-bold text-gray-400 bg-[#111] p-4 border border-white/10 rounded-t-xl mb-0">
              <div>
                <span className="text-white text-base">{rankings.length}</span>{" "}
                results found.
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 hidden sm:inline">
                    Show Records:
                  </span>
                  <select className="border border-white/20 rounded bg-[#0A0A0A] text-white text-sm py-1 px-2 font-medium focus:ring-0 focus:border-white">
                    <option>25</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 text-gray-500 font-medium">
                  <div className="flex items-center gap-1">
                    <span className="text-red-500 font-black">X</span> Suspended
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-300 font-black">R</span> Retired
                  </div>
                </div>
              </div>
            </div>

            {/* Rankings Table Container */}
            <div className="w-full bg-[#111] border border-t-0 border-white/10 rounded-b-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1A1A1A] border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest w-20">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">
                        Member Nation / Club
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-black text-white uppercase tracking-widest">
                        GS Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rankings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-16 text-center text-gray-500 font-medium"
                        >
                          No ranked athletes found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      rankings.map((athlete) => (
                        <tr
                          key={athlete.userId}
                          className={`hover:bg-white/5 transition-colors group ${athlete.rank <= 3 ? "bg-white/[0.02]" : ""}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div
                                className={`font-black text-xl ${athlete.rank === 1 ? "text-yellow-500" : athlete.rank === 2 ? "text-gray-300" : athlete.rank === 3 ? "text-amber-600" : "text-gray-500"}`}
                              >
                                {athlete.rank}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-4">
                              {/* Profile Avatar */}
                              <div className="relative w-12 h-12 rounded-full bg-[#222] border border-white/10 overflow-hidden flex-shrink-0">
                                {athlete.profileImage ? (
                                  <img
                                    src={athlete.profileImage}
                                    alt={athlete.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-[#222] text-gray-400 font-black text-lg">
                                    {athlete.name.charAt(0)}
                                  </div>
                                )}
                                {athlete.verified && (
                                  <div className="absolute bottom-0 right-0 bg-[#111] rounded-full p-0.5 shadow-sm">
                                    <Shield className="w-3 h-3 text-white fill-white" />
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col">
                                <Link
                                  href={`/athlete/${athlete.userId}`}
                                  className="font-bold text-white text-base hover:underline tracking-tight"
                                >
                                  {athlete.name.toUpperCase()}
                                </Link>
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                                  (Global ID: {athlete.userId.substring(0, 8)})
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-5 bg-[#222] rounded-sm overflow-hidden flex items-center justify-center border border-white/10">
                                <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
                              </div>
                              <span className="font-medium text-gray-400 text-sm">
                                {athlete.clubName || "Independent"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="font-black text-white text-xl">
                              {athlete.totalPoints.toFixed(2)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Dummy */}
              {rankings.length > 0 && (
                <div className="p-4 border-t border-white/10 bg-[#0A0A0A] flex justify-end">
                  <nav className="flex items-center gap-1">
                    <button className="px-3 py-1 text-sm text-gray-500 bg-transparent border border-white/10 rounded hover:bg-white/5">
                      &laquo;
                    </button>
                    <button className="px-3 py-1 text-sm font-bold text-black bg-white rounded shadow-sm">
                      1
                    </button>
                    <button className="px-3 py-1 text-sm text-white bg-transparent border border-white/10 rounded hover:bg-white/5">
                      2
                    </button>
                    <button className="px-3 py-1 text-sm text-white bg-transparent border border-white/10 rounded hover:bg-white/5">
                      3
                    </button>
                    <button className="px-3 py-1 text-sm text-gray-500 bg-transparent border border-white/10 rounded hover:bg-white/5">
                      &raquo;
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>

        <GlobalFooter />
      </main>
    </I18nProvider>
  );
}
