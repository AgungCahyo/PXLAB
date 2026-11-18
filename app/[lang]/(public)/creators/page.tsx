import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PageTransition } from "@/components/layout/PageTransition"
import { PixelArt } from "@/components/creations/PixelArt"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { BackLink } from "@/components/ui/BackLink"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"
import { listNewCreators } from "@/features/creations/queries"
import { copy } from "@/lib/copy"
import { formatDayMonthYear } from "@/lib/format"
import { href, isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { pixelCoverUrl } from "@/lib/site"

export const instant = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return pageMeta({
    lang,
    path: "/creators",
    title: copy.newCreatorsTitle,
    description: copy.newCreatorsMeta,
  })
}

export default async function CreatorsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw

  const result = await listNewCreators(36)

  return (
    <PageTransition>
      <div className="mx-auto w-full min-w-0 max-w-3xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16">
        <BackLink href={href(lang, "/explore")}>{copy.exploreTitle[lang]}</BackLink>
        <PageHeader
          className="mt-6"
          title={copy.newCreatorsTitle[lang]}
          intro={copy.newCreatorsIntro[lang]}
        />

        {result.failed ? (
          <div className="mt-8">
            <EmptyState
              title={copy.exploreLoadError[lang]}
              description={copy.exploreLoadHint[lang]}
              action={
                <Link
                  href={href(lang, "/creators")}
                  className="inline-flex min-h-11 items-center border-[3px] border-earth bg-brick px-3 text-[14px] text-white"
                >
                  {copy.exploreRetry[lang]}
                </Link>
              }
            />
          </div>
        ) : result.items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={copy.newCreatorsTitle[lang]}
              description={copy.newCreatorsEmpty[lang]}
            />
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {result.items.map((creator) => {
              const name = creator.displayName?.trim() || creator.username
              const cover =
                creator.latestCoverUrl ||
                (creator.latestCreationId ? pixelCoverUrl(creator.latestCreationId) : null)
              const when = creator.latestPublishedAt
                ? formatDayMonthYear(creator.latestPublishedAt, lang)
                : null

              return (
                <li key={creator.username}>
                  <Link
                    href={href(lang, `/u/${creator.username}`)}
                    className="flex min-w-0 items-center gap-3 py-4 transition-colors hover:bg-soft/60 sm:gap-4"
                  >
                    <ProfileAvatar
                      src={creator.avatarUrl}
                      avatarConfig={creator.avatarConfig}
                      userId={creator.id}
                      alt={name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-fg">{name}</p>
                      <p className="truncate text-[13px] text-muted">@{creator.username}</p>
                      {when ? (
                        <p className="mt-1 truncate text-[12px] text-muted">
                          {copy.newCreatorsLatest[lang]} · {when}
                        </p>
                      ) : null}
                    </div>
                    {cover ? (
                      <div className="hidden w-16 shrink-0 overflow-hidden border-[3px] border-earth sm:block">
                        <PixelArt src={cover} alt="" variant="thumb" framed={false} />
                      </div>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </PageTransition>
  )
}
