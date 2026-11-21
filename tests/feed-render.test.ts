import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/features/community/actions", () => ({
  toggleAppreciationAction: vi.fn(),
  addCommentAction: vi.fn(),
}))
vi.mock("@/features/feed/actions", () => ({
  loadMoreHomeFeedAction: vi.fn(),
  loadPostCommentsAction: vi.fn(),
}))

import { FeedPost } from "@/components/social/FeedPost"
import { HomeFeed } from "@/components/social/HomeFeed"

const post = {
  id: "3f2b8c1e-8a4d-4e5b-9c1a-2d7e6f5a4b3c",
  title: "Slime hop",
  caption: "My first sprite",
  tags: [],
  type: "pixel",
  category: null,
  published_at: "2026-11-20T10:00:00Z",
  updated_at: "2026-11-20T10:00:00Z",
  status: "published",
  cover_url: "https://example.com/a.png",
  commentCount: 4,
  author: { id: "u1", username: "agung", displayName: "Agung", avatarUrl: null, avatarConfig: null },
  likeCount: 7,
  liked: true,
} as never

const viewer = { id: "v1", username: "me", displayName: "Me", avatarUrl: null, avatarConfig: null }

describe("feed rendering (SSR smoke)", () => {
  it("renders a post with identity, counts and accessible actions", () => {
    const html = renderToString(createElement(FeedPost, { lang: "en", post, viewer }))
    expect(html).toContain("@agung")
    expect(html).toContain("Slime hop")
    expect(html).toContain("My first sprite")
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain(">7<") // liked by viewer, count from server includes them
    expect(html).toContain(">4<")
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain("/creation/3f2b8c1e-8a4d-4e5b-9c1a-2d7e6f5a4b3c")
  })

  it("keeps the comment region in the DOM for aria-controls but mounts the panel lazily", () => {
    const html = renderToString(createElement(FeedPost, { lang: "id", post, viewer: null }))
    const id = "comments-3f2b8c1e-8a4d-4e5b-9c1a-2d7e6f5a4b3c"
    expect(html).toContain(`aria-controls="${id}"`)
    expect(html).toContain(`id="${id}"`) // target of aria-controls always exists
    expect(html).toContain('data-open="false"><div></div></div>') // nothing loaded yet
    expect(html).not.toContain("Memuat komentar")
  })

  it("renders the feed list with a visible pagination landmark for no-JS", () => {
    const html = renderToString(
      createElement(HomeFeed, {
        lang: "id",
        feed: "all",
        viewer: null,
        initialItems: [post],
        initialPage: 1,
        pageCount: 3,
      }),
    )
    expect(html).toContain("@agung")
    expect(html).toContain("/home?page=2") // next link for no-JS / crawlers
    expect(html).not.toContain('class="sr-only"><a') // not hidden in server HTML
  })
})
