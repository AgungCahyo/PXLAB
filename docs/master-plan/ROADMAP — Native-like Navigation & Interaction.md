# ROADMAP --- Native-like Navigation & Interaction

**Project:** THE COMMONS\
**Status:** Proposed\
**Primary objective:** Make navigation feel instant and app-like without
sacrificing performance, accessibility, or the existing Next.js
architecture.

------------------------------------------------------------------------

## 1. Vision & Product Goals

THE COMMONS should behave more like a modern social application:

-   Moving between Home, Explore, Notifications, and Profile should feel
    immediate.
-   Returning to a page should restore its previous context instead of
    starting over.
-   Previously loaded content should remain visible while fresh data is
    fetched when appropriate.
-   Users should be able to refresh feeds with a pull-down gesture on
    touch devices.
-   Navigation should remain responsive on lower-powered mobile devices.
-   Browser Back/Forward, direct links, refresh, and accessibility must
    continue to work.

**Guiding principle**

> Navigation may change the page, but it should not force the user's
> experience to start over.

This roadmap prioritizes actual performance and state preservation over
decorative transitions.

------------------------------------------------------------------------

## 2. Phase 1 --- Audit Navigation & Rendering

**Priority:** P0 --- Critical\
**Goal:** Understand the current behavior before changing the
architecture.

### Audit checklist

  -----------------------------------------------------------------------
  ID                      Area                    What to inspect
  ----------------------- ----------------------- -----------------------
  NAV-01                  App Router              Root layout, nested
                                                  layouts, route groups,
                                                  and page boundaries

  NAV-02                  Navigation              Usage of `Link`,
                                                  `router.push`,
                                                  `router.replace`, and
                                                  browser history

  NAV-03                  Persistent UI           Whether header,
                                                  navigation, and global
                                                  providers remain
                                                  mounted

  NAV-04                  Rendering               Which components
                                                  unmount/remount during
                                                  route changes

  NAV-05                  Data fetching           Whether route changes
                                                  trigger duplicate or
                                                  unnecessary requests

  NAV-06                  Scroll                  Current scroll
                                                  restoration behavior

  NAV-07                  State                   Where page-specific and
                                                  global state are stored

  NAV-08                  Loading UI              When skeletons, loading
                                                  boundaries, and
                                                  fallback states appear

  NAV-09                  Realtime                Whether Supabase
                                                  subscriptions are
                                                  duplicated or left
                                                  active

  NAV-10                  Transitions             All usages of
                                                  `PageTransition`, React
                                                  `ViewTransition`, and
                                                  transition CSS
  -----------------------------------------------------------------------

### Specific investigation

The Explore page currently uses a Server Component and server-side query
functions such as:

-   `listPublishedCreations()`
-   `listQuietPublishedCreations()`
-   `listNewCreators()`

Determine whether the perceived reload comes from:

-   Server Component route navigation and new server payloads.
-   Client components being unmounted and remounted.
-   Data fetching being repeated.
-   Cache behavior or cache invalidation.
-   Scroll restoration.
-   Image loading or layout shifts.

Do not assume that every route change remounts the entire page. Measure
and identify the actual cause.

### Deliverables

-   Navigation and rendering audit report.
-   Route and layout map.
-   Component mount/unmount findings.
-   Data-fetching and cache findings.
-   Recommended architecture and implementation sequence.

**Exit criteria:** The main causes of slow or disruptive navigation are
understood and documented.

------------------------------------------------------------------------

## 3. Phase 2 --- Persistent Application Shell

**Priority:** P0 --- Critical\
**Goal:** Keep global application UI stable while route content changes.

### Target structure

``` text
THE COMMONS
└── Root Layout / Application Shell
    ├── Global Providers
    ├── Persistent Header
    ├── Main Route Content
    │   ├── Home
    │   ├── Explore
    │   ├── Notifications
    │   ├── Profile
    │   └── Other Routes
    └── Persistent Primary Navigation
```

### Tasks

-   Keep global providers in the appropriate persistent layout.
-   Keep the header and primary navigation outside route-specific page
    boundaries.
-   Avoid unnecessary remounting of global UI.
-   Keep route-specific state out of global providers unless genuinely
    shared.
-   Verify that authentication and language providers remain correct
    during navigation.
-   Preserve existing server-rendering and SEO behavior.

### Important constraint

A persistent application shell does not mean every page must remain
mounted. Global UI should persist; page preservation is handled
separately in Phase 3.

### Exit criteria

-   Global navigation and header do not remount unnecessarily.
-   Route changes do not reset global application state.
-   Direct route access and browser history still work.

------------------------------------------------------------------------

## 4. Phase 3 --- Page State & Scroll Preservation

**Priority:** P0 --- Critical\
**Goal:** Restore the user's previous context when returning to a page.

### State to preserve

  -----------------------------------------------------------------------
  Page                                State to preserve
  ----------------------------------- -----------------------------------
  Home                                Feed context, scroll position,
                                      selected filters

  Explore                             Scroll position, category, search
                                      query, feed, pagination

  Profile                             Scroll position, selected profile
                                      tab, relevant loaded state

  Notifications                       Scroll position and relevant
                                      read/unread context

  Creation detail                     Previous navigation context and
                                      return destination
  -----------------------------------------------------------------------

### Tasks

1.  Audit current browser and Next.js scroll restoration behavior.
2.  Define a stable page identity using route and relevant query
    parameters.
3.  Save and restore scroll positions without causing visible jumps.
4.  Preserve URL-driven state such as Explore filters and pagination.
5.  Preserve client-side interaction state where appropriate.
6.  Test navigation to a detail page and returning with Back.
7.  Evaluate selective page retention only if state restoration and
    caching are insufficient.

### Keep-Alive decision

Do not introduce a Keep-Alive library by default.

First determine whether the required experience can be achieved with:

-   URL state.
-   Local component state.
-   A small state store.
-   Scroll-position restoration.
-   Data caching.

Only consider retaining mounted page trees when there is a demonstrated
need. Keeping every route mounted can increase memory use, retain event
listeners, and leave realtime subscriptions running.

### Exit criteria

-   Returning to Explore restores the previous scroll position and
    filters.
-   Back navigation from a creation detail returns to the expected
    context.
-   State does not leak between different users or unrelated route
    contexts.
-   Memory use remains controlled.

------------------------------------------------------------------------

## 5. Phase 4 --- Data Caching & Background Refresh

**Priority:** P0 --- Critical\
**Goal:** Show previously loaded content immediately and update it
intelligently.

### Expected behavior

``` text
Open Explore
    ↓
Load and display creations
    ↓
Navigate to Profile
    ↓
Return to Explore
    ↓
Show cached creations immediately
    ↓
Refresh in the background when appropriate
```

### Tasks

-   Map all data-fetching paths used by Home, Explore, Profile, and
    Notifications.
-   Define cache ownership: server cache, client cache, or both.
-   Define stale-time and expiration policies per data type.
-   Avoid duplicate requests for the same data.
-   Keep existing content visible during background revalidation.
-   Define how mutations invalidate or update relevant caches.
-   Handle failed refreshes without unnecessarily removing usable cached
    content.
-   Verify that private or user-specific data is never exposed across
    accounts.

### Technology evaluation

  -----------------------------------------------------------------------
  Option                              Potential role
  ----------------------------------- -----------------------------------
  Next.js Data Cache                  Server-side data caching where
                                      appropriate

  React cache                         Deduplicating work within the
                                      relevant server-rendering scope

  TanStack Query                      Client-side caching, revalidation,
                                      mutations, and request
                                      deduplication

  Zustand or existing state store     Small amounts of shared client-side
                                      UI state

  Supabase                            Source of truth for persisted
                                      application data
  -----------------------------------------------------------------------

Do not migrate every query to TanStack Query automatically. Preserve
server-side fetching where it is already effective. Introduce client
caching only where it solves a measured problem.

### Exit criteria

-   Previously loaded content can be displayed immediately when
    returning to a page.
-   Background refresh does not unnecessarily blank the page.
-   Duplicate requests are reduced.
-   Cache invalidation is predictable and secure.

------------------------------------------------------------------------

## 6. Phase 5 --- Pull-to-Refresh

**Priority:** P1 --- High\
**Goal:** Add a familiar touch gesture for refreshing feed content.

### Expected interaction

``` text
User is at the top of a feed
    ↓
Pulls downward
    ↓
Refresh indicator appears
    ↓
Pull threshold is reached
    ↓
User releases
    ↓
Latest data is requested
    ↓
Existing content remains visible where possible
    ↓
Updated content is displayed
```

### Tasks

-   Implement touch gesture detection.
-   Only activate refresh when the relevant scroll container is at its
    top.
-   Define pull threshold and resistance.
-   Add a clear loading and completion indicator.
-   Prevent accidental refresh during normal scrolling.
-   Support refresh failure and retry.
-   Respect reduced-motion preferences.
-   Check interaction with browser-native refresh behavior.
-   Test iOS Safari, Android Chrome, and desktop behavior.

### Gesture safety

THE COMMONS may contain drawing or canvas experiences. Pull-to-Refresh
must not interfere with canvas drawing, horizontal gestures, modal
interactions, or other intentional touch controls.

Apply the gesture only to appropriate feed containers.

### Exit criteria

-   Pull-to-Refresh works reliably on supported mobile browsers.
-   Normal scrolling and horizontal interactions remain unaffected.
-   Existing content is not cleared unnecessarily.
-   Refresh status is accessible and understandable.

------------------------------------------------------------------------

## 7. Phase 6 --- Remove Unnecessary Route Transitions

**Priority:** P1 --- High\
**Goal:** Prefer immediate, stable navigation over animations that add
rendering work without solving the underlying problem.

### Current implementation

THE COMMONS currently has a `PageTransition` component using React
`ViewTransition`, with transition types for:

-   `nav-forward`
-   `nav-back`
-   `fade`

The project owner has indicated that this animation is no longer needed
because it adds overhead to the page experience.

### Tasks

-   Find every import and usage of `PageTransition`.
-   Find all `transitionTypes` passed to links or router navigation.
-   Find CSS animations and view-transition rules associated exclusively
    with this implementation.
-   Remove the wrapper and obsolete styles if no longer used.
-   Remove transition metadata that no longer has a consumer.
-   Verify that no unrelated transitions or components depend on those
    styles.
-   Confirm that navigation remains visually stable after removal.

### Design principle

Do not use animation to disguise slow navigation. Make navigation fast
first.

Do not introduce another transition library as a replacement unless a
specific, measured UX problem requires it.

### Exit criteria

-   Unnecessary route-transition code is removed.
-   No orphaned transition CSS remains.
-   Route navigation works without visual flashes or blank screens.
-   Actual navigation performance is evaluated independently of
    animation.

------------------------------------------------------------------------

## 8. Phase 7 --- Rendering, Memory & Network Optimization

**Priority:** P1 --- High\
**Goal:** Keep the application responsive during repeated navigation and
longer sessions.

### Checklist

  Area        Work
  ----------- -------------------------------------------------------------
  Rendering   Reduce unnecessary component updates
  Images      Use appropriate sizing, lazy loading, and stable dimensions
  Network     Avoid duplicate and unnecessary requests
  Memory      Avoid retaining too many page trees
  Realtime    Clean up Supabase subscriptions when no longer needed
  Events      Clean up global event listeners
  Scroll      Avoid forced layout and visible restoration jumps
  Mobile      Test on lower-powered devices
  Cache       Bound cache growth and remove obsolete entries

### Exit criteria

-   Repeated navigation does not cause steadily increasing memory use.
-   Supabase subscriptions do not accumulate.
-   Feed scrolling remains responsive.
-   Images do not cause avoidable layout shifts.
-   Network requests are appropriate to the user's actions.

------------------------------------------------------------------------

## 9. Phase 8 --- Testing & UX Validation

**Priority:** P0 --- Required before release\
**Goal:** Verify the experience with realistic user journeys.

### Test matrix

  -----------------------------------------------------------------------
  Scenario                            Expected result
  ----------------------------------- -----------------------------------
  Home → Explore                      Navigation feels immediate

  Explore → Profile → Explore         Explore context and scroll are
                                      restored

  Explore → Creation Detail → Back    Previous Explore position is
                                      restored

  Change Explore filter → Navigate    Filter and query state remain
  away → Return                       correct

  Pull-to-Refresh                     Feed refreshes without unnecessary
                                      blanking

  Slow network                        Existing cached content remains
                                      visible where available

  Offline after loading               Previously cached content remains
                                      usable where supported

  Repeated tab navigation             No accumulating subscriptions or
                                      memory growth

  Browser Back / Forward              URL and visible page state remain
                                      consistent

  Direct URL access                   Correct page renders without
                                      requiring prior navigation

  Account switch / sign out           Private cached data is cleared or
                                      isolated correctly
  -----------------------------------------------------------------------

### Performance measurements

Record before-and-after measurements for:

-   Navigation interaction latency.
-   Time until useful content is visible.
-   Number of repeated network requests.
-   Component mount/unmount behavior.
-   Memory usage during repeated navigation.
-   Feed scroll responsiveness.

Use real measurements rather than relying only on subjective
impressions.

------------------------------------------------------------------------

## 10. Recommended Implementation Order

    Order Phase                                      Priority   Dependency
  ------- ------------------------------------------ ---------- ---------------------
        1 Audit Navigation & Rendering               P0         None
        2 Persistent Application Shell               P0         Phase 1
        3 Page State & Scroll Preservation           P0         Phase 1--2
        4 Data Caching & Background Refresh          P0         Phase 1
        5 Remove Unnecessary Route Transitions       P1         Phase 1
        6 Pull-to-Refresh                            P1         Phase 4
        7 Rendering, Memory & Network Optimization   P1         Phases 2--6
        8 Testing & UX Validation                    P0         All relevant phases

Phases 3 and 4 can be developed in parallel after the audit, provided
their state and cache responsibilities are clearly separated.

------------------------------------------------------------------------

## 11. Definition of Done

### Navigation

-   [ ] Global application shell remains mounted across normal route
    navigation.
-   [ ] No unnecessary loading or blank state during navigation.
-   [ ] Browser Back and Forward work correctly.
-   [ ] Direct links and page refresh work correctly.

### State preservation

-   [ ] Scroll position is restored for relevant pages.
-   [ ] Explore filters and search state are preserved.
-   [ ] Detail-page return navigation restores the previous context.
-   [ ] State does not leak between users or unrelated routes.

### Data

-   [ ] Previously loaded content is displayed from cache when valid.
-   [ ] Background refresh follows explicit cache policies.
-   [ ] Duplicate requests are avoided where possible.
-   [ ] Cache invalidation and account isolation are correct.

### Interaction

-   [ ] Pull-to-Refresh works on supported mobile browsers.
-   [ ] Gesture interactions do not conflict with drawing or other
    controls.
-   [ ] Unnecessary route animations have been removed.

### Performance

-   [ ] No accumulating event listeners or realtime subscriptions.
-   [ ] Memory use remains controlled during repeated navigation.
-   [ ] Feed scrolling remains responsive on mobile.
-   [ ] Before-and-after measurements are documented.

------------------------------------------------------------------------

## 12. First Action --- Start with Phase 1

Do not begin by installing libraries or rewriting the navigation system.

Start by auditing:

1.  Root layout and nested layouts.
2.  Navigation components and route-change behavior.
3.  `PageTransition` usages and related CSS.
4.  Home, Explore, and Profile rendering boundaries.
5.  Data-fetching and cache behavior.
6.  Scroll restoration.
7.  Supabase Realtime subscriptions.

The audit should produce a concrete implementation plan based on the
current codebase, not assumptions.

**Final product principle:**

> Make THE COMMONS feel like an app that remembers where you were, keeps
> what you have already seen, and gets out of your way when you move
> around.
