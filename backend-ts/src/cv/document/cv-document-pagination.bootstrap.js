/**
 * CV pagination v2 — DOM measurement in a visible 210mm layout.
 * Loaded by buildCvPaginationBootstrapScript() for Playwright + preview pipeline.
 */
;(function runCvDocumentPaginationV2() {
  const win = window
  const MM_TO_PX = 96 / 25.4
  const A4_HEIGHT_PX = Math.floor(297 * MM_TO_PX)
  win.__cvPaginationDone = false

  function done() {
    win.__cvPaginationDone = true
    document.body.classList.remove('cv-pagination-busy')
    const loading = document.querySelector('.cv-pagination-loading')
    if (loading) loading.remove()
    const source = document.getElementById('cv-pagination-source')
    if (source) source.style.display = 'none'
  }

  function fail(err) {
    console.error('CV pagination failed', err)
    done()
  }

  function run() {
    try {
      const sourceRoot = document.getElementById('cv-pagination-source')
      const outputRoot = document.getElementById('cv-pagination-output')
      if (!sourceRoot || !outputRoot) {
        done()
        return
      }
      sourceRoot.style.display = 'block'
      sourceRoot.style.position = 'relative'
      sourceRoot.style.left = '0'
      sourceRoot.style.visibility = 'visible'
      sourceRoot.style.width = 'var(--paper-width)'
      sourceRoot.style.margin = '0 auto'

      const sourcePage = sourceRoot.querySelector('main.resume-page')
      if (!sourcePage) {
        done()
        return
      }

      const sheets = paginateResumePage(sourcePage)
      outputRoot.replaceChildren(...sheets)
      if (sheets.length === 0) {
        const fallback = sourcePage.cloneNode(true)
        fallback.classList.remove('resume-page')
        fallback.classList.add('cv-sheet')
        outputRoot.appendChild(fallback)
      }
      done()
    } catch (err) {
      fail(err)
    }
  }

  /** Usable content height for one A4 sheet (matches fixed `.cv-sheet` height minus print slack). */
  function getMaxPageHeight() {
    return A4_HEIGHT_PX - 36
  }

  /** Keep section headings on the same page as the first entry under them. */
  function takeNextPackUnits(units, index) {
    if (index >= units.length) {
      return null
    }
    const first = units[index]
    const firstKind = first.getAttribute('data-cv-unit')
    if (
      firstKind === 'section-head' &&
      index + 1 < units.length &&
      units[index + 1].getAttribute('data-cv-unit') === 'entry'
    ) {
      return { nodes: [first, units[index + 1]], nextIndex: index + 2 }
    }
    return { nodes: [first], nextIndex: index + 1 }
  }

  function collectColumnUnits(column) {
    if (!column) return []
    const units = []
    function appendUnit(el) {
      const kind = el.getAttribute('data-cv-unit')
      if (kind === 'entry' || kind === 'atomic' || kind === 'section-head') {
        units.push(el)
      }
    }
    function walk(container) {
      container.querySelectorAll(':scope > *').forEach((child) => {
        if (child.matches('[data-cv-unit]')) {
          appendUnit(child)
          return
        }
        if (child.classList.contains('cv-breakable-section')) {
          child.querySelectorAll(':scope > [data-cv-unit]').forEach((el) => {
            appendUnit(el)
          })
          return
        }
        walk(child)
      })
    }
    walk(column)
    return units
  }

  function cloneUnits(units) {
    return units.map((el) => el.cloneNode(true))
  }

  function isOrphanMainCoupledPage(page) {
    if (page.sideNodes.length > 0) return false
    if (page.mainNodes.length !== 1) return false
    const kind = page.mainNodes[0].getAttribute('data-cv-unit')
    return kind === 'atomic' || kind === 'section-head'
  }

  function isOrphanExtraInfoPage(page) {
    if (page.mainNodes.length !== 1) return false
    const node = page.mainNodes[0]
    if (node.getAttribute('data-cv-unit') !== 'atomic') return false
    const title = node.querySelector('h2.section-title')
    return title != null && title.textContent.trim() === 'Doplňujúce informácie'
  }

  function isOrphanExtraInfoMainOnly(page) {
    return isOrphanExtraInfoPage(page)
  }

  function shouldPackWithPrevious(unit) {
    return unit.getAttribute('data-cv-pack') === 'with-previous'
  }

  function isEducationSectionHeadUnit(unit) {
    if (!(unit instanceof Element)) return false
    if (unit.getAttribute('data-cv-unit') !== 'section-head') return false
    return (unit.textContent || '').trim() === 'Vzdelanie'
  }

  function hasEducationMainUnitsBetween(mainUnits, fromIndex, toIndex) {
    for (let i = fromIndex; i < toIndex; i++) {
      if (isEducationSectionHeadUnit(mainUnits[i])) {
        return true
      }
    }
    return false
  }

  function mainNodesContainEducation(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (isEducationSectionHeadUnit(node)) {
        return true
      }
      if (node instanceof Element && typeof node.querySelector === 'function') {
        const title = node.querySelector('h2.section-title')
        if (title && (title.textContent || '').trim() === 'Vzdelanie') {
          return true
        }
      }
    }
    return false
  }

  function documentHasEducationMainUnits(mainUnits) {
    return mainUnits.some((unit) => isEducationSectionHeadUnit(unit))
  }

  function shouldBlockOrphanExtraMergeToPrev(prev, page, pages, pageIndex, mainUnits) {
    if (!isOrphanExtraInfoPage(page)) {
      return false
    }
    if (!documentHasEducationMainUnits(mainUnits)) {
      return false
    }
    if (mainNodesContainEducation(prev.mainNodes)) {
      return false
    }
    const prevEnd = prev.mainUnitEnd ?? 0
    const pageStart = page.mainUnitStart ?? prevEnd
    if (hasEducationMainUnitsBetween(mainUnits, prevEnd, pageStart)) {
      return true
    }
    for (let i = pageIndex; i < pages.length; i++) {
      if (mainNodesContainEducation(pages[i].mainNodes)) {
        return true
      }
    }
    return hasEducationMainUnitsBetween(mainUnits, pageStart, mainUnits.length)
  }

  function absorbWithPreviousPackUnits(pages, pagePayload, measurePage, pageLimit, mainUnits) {
    if (!pages.length || !pagePayload.mainNodes.length) return false
    const stickyNodes = pagePayload.mainNodes.filter((node) => shouldPackWithPrevious(node))
    const regularNodes = pagePayload.mainNodes.filter((node) => !shouldPackWithPrevious(node))
    if (!stickyNodes.length) return false
    const prev = pages[pages.length - 1]
    const prevEnd = prev.mainUnitEnd ?? 0
    const stickyStart = pagePayload.mainUnitStart ?? prevEnd
    if (hasEducationMainUnitsBetween(mainUnits, prevEnd, stickyStart)) {
      return false
    }
    const mergedMain = prev.mainNodes.concat(stickyNodes)
    const mergedH = measurePage(prev.header || null, prev.sideNodes, mergedMain)
    const prevLimit = pageLimit(!!prev.header)
    if (mergedH <= prevLimit * 1.2) {
      pages[pages.length - 1] = {
        header: prev.header,
        sideNodes: cloneUnits(prev.sideNodes),
        mainNodes: cloneUnits(mergedMain),
        chromeSide: prev.chromeSide,
        mainUnitStart: prev.mainUnitStart ?? 0,
        mainUnitEnd: pagePayload.mainUnitEnd ?? prevEnd,
      }
      pagePayload.mainNodes = regularNodes
      return !regularNodes.length && !pagePayload.sideNodes.length
    }
    if (prev.mainNodes.length > 0) {
      const moved = prev.mainNodes[prev.mainNodes.length - 1]
      const rebalancedPrevMain = prev.mainNodes.slice(0, -1)
      const rebalancedCurrMain = [moved].concat(stickyNodes, regularNodes)
      const prevH = measurePage(prev.header || null, prev.sideNodes, rebalancedPrevMain)
      const currH = measurePage(null, pagePayload.sideNodes, rebalancedCurrMain)
      if (
        rebalancedPrevMain.length > 0 &&
        prevH <= prevLimit &&
        currH <= pageLimit(false)
      ) {
        pages[pages.length - 1] = {
          header: prev.header,
          sideNodes: cloneUnits(prev.sideNodes),
          mainNodes: cloneUnits(rebalancedPrevMain),
          chromeSide: prev.chromeSide,
        }
        pagePayload.mainNodes = rebalancedCurrMain
        return false
      }
    }
    return false
  }

  function rebalanceOrphanTrailingMainPage(pages, index, measureSheetFn, pageLimitFn) {
    if (index <= 0 || index >= pages.length) return false
    const page = pages[index]
    const prev = pages[index - 1]
    if (!isOrphanMainCoupledPage(page) && !isOrphanExtraInfoPage(page)) return false
    if (!prev.mainNodes.length) return false
    const moved = prev.mainNodes[prev.mainNodes.length - 1]
    const rebalancedPrevMain = prev.mainNodes.slice(0, -1)
    const rebalancedCurrMain = [moved].concat(page.mainNodes)
    const prevLimit = pageLimitFn(!!prev.header)
    const currLimit = pageLimitFn(false)
    const prevH = measureSheetFn(
      prev.header || null,
      cloneUnits(prev.sideNodes),
      cloneUnits(rebalancedPrevMain),
    )
    const currH = measureSheetFn(null, cloneUnits(page.sideNodes), cloneUnits(rebalancedCurrMain))
    if (prevH <= prevLimit && currH <= currLimit && rebalancedPrevMain.length > 0) {
      pages[index - 1] = {
        header: prev.header,
        sideNodes: prev.sideNodes,
        mainNodes: cloneUnits(rebalancedPrevMain),
        chromeSide: prev.chromeSide,
      }
      pages[index] = {
        header: page.header,
        sideNodes: page.sideNodes,
        mainNodes: cloneUnits(rebalancedCurrMain),
        chromeSide: page.chromeSide,
      }
      return true
    }
    return false
  }

  function tryCoupledSingleSheet(headerEl, sideUnits, mainUnits, maxH, measureSheetFn, buildSheetFn) {
    if (!sideUnits.length && !mainUnits.length) return null
    const headerNode = headerEl ? headerEl.cloneNode(true) : null
    const fullH = measureSheetFn(headerNode, cloneUnits(sideUnits), cloneUnits(mainUnits))
    if (fullH <= maxH) {
      return [
        buildSheetFn({
          header: headerNode,
          sideNodes: cloneUnits(sideUnits),
          mainNodes: cloneUnits(mainUnits),
          chromeSide: false,
        }),
      ]
    }
    return null
  }

  function mergeOrphanCoupledPages(pages, measureSheetFn, pageLimitFn, mainUnits) {
    for (let i = pages.length - 1; i > 0; i--) {
      const page = pages[i]
      if (!isOrphanMainCoupledPage(page) && !isOrphanExtraInfoPage(page)) continue
      const prev = pages[i - 1]
      if (shouldBlockOrphanExtraMergeToPrev(prev, page, pages, i, mainUnits)) {
        rebalanceOrphanTrailingMainPage(pages, i, measureSheetFn, pageLimitFn)
        continue
      }
      const mergedMain = prev.mainNodes.concat(page.mainNodes)
      const includeHeader = !!prev.header
      const limit = pageLimitFn(includeHeader)
      const h = measureSheetFn(
        prev.header || null,
        cloneUnits(prev.sideNodes),
        cloneUnits(mergedMain),
      )
      const slackLimit = isOrphanExtraInfoPage(page) ? limit * 1.12 : limit
      if (h <= slackLimit) {
        pages[i - 1] = {
          header: prev.header,
          sideNodes: prev.sideNodes,
          mainNodes: cloneUnits(mergedMain),
          chromeSide: prev.chromeSide,
        }
        pages.splice(i, 1)
        continue
      }
      rebalanceOrphanTrailingMainPage(pages, i, measureSheetFn, pageLimitFn)
    }
    return pages
  }

  function getMeasureHost() {
    let host = document.getElementById('cv-pagination-measure-host')
    if (!host) {
      host = document.createElement('div')
      host.id = 'cv-pagination-measure-host'
      host.className = 'cv-page-export'
      host.style.cssText =
        'position:absolute;left:0;top:0;width:210mm;visibility:hidden;pointer-events:none;z-index:-1;'
      document.body.appendChild(host)
    }
    return host
  }

  function getAtlasMainContentBudget() {
    return getMaxPageHeight() - Math.floor(40 * MM_TO_PX)
  }

  /** Rebuild breakable sections (heading + entries) when mounting paginated columns. */
  function mountBreakableSectionUnits(containerEl, nodes, breakableSectionClass) {
    let breakableSection = null
    nodes.forEach((node) => {
      const kind = node.getAttribute('data-cv-unit')
      if (kind === 'section-head') {
        breakableSection = document.createElement('section')
        breakableSection.className = breakableSectionClass
        breakableSection.appendChild(node.cloneNode(true))
        containerEl.appendChild(breakableSection)
        return
      }
      if (kind === 'entry') {
        if (!breakableSection) {
          breakableSection = document.createElement('section')
          breakableSection.className = breakableSectionClass
          containerEl.appendChild(breakableSection)
        }
        breakableSection.appendChild(node.cloneNode(true))
        return
      }
      breakableSection = null
      containerEl.appendChild(node.cloneNode(true))
    })
  }

  function measureAtlasMainColumnHeight(mainNodes) {
    const host = getMeasureHost()
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page atlas-page'
    const aside = document.createElement('aside')
    aside.className = 'atlas-sidebar atlas-sidebar--chrome'
    const main = document.createElement('section')
    main.className = 'atlas-main'
    mountAtlasMainUnits(main, mainNodes)
    sheet.appendChild(aside)
    sheet.appendChild(main)
    host.replaceChildren(sheet)
    main.style.overflow = 'visible'
    main.style.maxHeight = 'none'
    main.style.minHeight = '0'
    void sheet.offsetHeight
    return main.scrollHeight
  }

  function measureAtlasSheet(sidebarNodes, mainNodes, useChromeSidebar) {
    const host = getMeasureHost()
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page atlas-page'
    const aside = document.createElement('aside')
    const chrome =
      useChromeSidebar === true || (sidebarNodes.length === 0 && mainNodes.length > 0)
    aside.className = chrome ? 'atlas-sidebar atlas-sidebar--chrome' : 'atlas-sidebar'
    sidebarNodes.forEach((n) => aside.appendChild(n.cloneNode(true)))
    const main = document.createElement('section')
    main.className = 'atlas-main'
    mountAtlasMainUnits(main, mainNodes)
    sheet.appendChild(aside)
    sheet.appendChild(main)
    host.replaceChildren(sheet)
    main.style.overflow = 'visible'
    main.style.maxHeight = 'none'
    main.style.minHeight = '0'
    void sheet.offsetHeight
    const mainH = main.scrollHeight
    if (chrome && sidebarNodes.length === 0) {
      return mainH
    }
    const sideH = aside.scrollHeight
    return Math.max(mainH, sideH)
  }

  /** Rebuild breakable sections (heading + entries) when mounting paginated main column. */
  function mountAtlasMainUnits(mainEl, nodes) {
    mountBreakableSectionUnits(mainEl, nodes, 'atlas-intro cv-breakable-section')
  }

  function mountMonochromeMainUnits(mainEl, nodes) {
    mountBreakableSectionUnits(mainEl, nodes, 'cv-breakable-section')
  }

  function mountMonochromeSideUnits(sideEl, nodes) {
    mountBreakableSectionUnits(sideEl, nodes, 'monochrome-card cv-breakable-section')
  }

  function mountEditorialMainUnits(mainEl, nodes) {
    mountBreakableSectionUnits(mainEl, nodes, 'editorial-panel cv-breakable-section')
  }

  function mountEditorialSideUnits(sideEl, nodes) {
    mountBreakableSectionUnits(sideEl, nodes, 'section-card cv-breakable-section')
  }

  function mountMinimalistMainUnits(mainEl, nodes) {
    mountBreakableSectionUnits(mainEl, nodes, 'cv-breakable-section')
  }

  function mountMinimalistSideUnits(sideEl, nodes) {
    mountBreakableSectionUnits(sideEl, nodes, 'cv-breakable-section')
  }

  /** Grid columns use max(main, side) height — not stretched sheet scrollHeight. */
  function measureCoupledSheetHeight(sheet) {
    if (sheet instanceof HTMLElement) {
      sheet.style.height = 'auto'
      sheet.style.minHeight = '0'
      sheet.style.maxHeight = 'none'
      sheet.style.overflow = 'visible'
    }
    const grid = sheet.querySelector('.monochrome-grid, .minimalist-grid, .editorial-columns')
    if (grid instanceof HTMLElement) {
      grid.style.alignItems = 'start'
      grid.style.flex = 'none'
      grid.style.minHeight = '0'
    }
    sheet
      .querySelectorAll(
        '.monochrome-main, .minimalist-main, .editorial-columns > div, aside.monochrome-side, aside.minimalist-side, aside.editorial-side',
      )
      .forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.minWidth = '0'
          el.style.minHeight = '0'
          el.style.height = 'auto'
          el.style.alignSelf = 'start'
          el.style.maxWidth = '100%'
        }
      })
    void sheet.offsetHeight
    let total = 0
    const header = sheet.querySelector(
      '.monochrome-header, .minimalist-header, .editorial-topbar',
    )
    if (header instanceof HTMLElement) {
      total += header.offsetHeight
    }
    const main = sheet.querySelector('.monochrome-main, .minimalist-main, .editorial-columns > div')
    const side = sheet.querySelector('aside.monochrome-side, aside.minimalist-side, aside.editorial-side')
    const mainH = main instanceof HTMLElement ? main.scrollHeight : 0
    const sideH = side instanceof HTMLElement ? side.scrollHeight : 0
    total += Math.max(mainH, sideH)
    if (
      sheet.classList.contains('editorial-page') ||
      sheet.classList.contains('minimalist-page')
    ) {
      const style = window.getComputedStyle(sheet)
      total += parseFloat(style.paddingTop) || 0
      total += parseFloat(style.paddingBottom) || 0
    }
    return total
  }

  function measureMonochromeSheet(headerNode, sideNodes, mainNodes) {
    const host = getMeasureHost()
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page monochrome-page'
    if (headerNode) sheet.appendChild(headerNode.cloneNode(true))
    const grid = document.createElement('section')
    grid.className = 'monochrome-grid'
    const main = document.createElement('div')
    main.className = 'monochrome-main'
    mountMonochromeMainUnits(main, mainNodes)
    const side = document.createElement('aside')
    side.className = 'monochrome-side'
    mountMonochromeSideUnits(side, sideNodes)
    grid.appendChild(main)
    grid.appendChild(side)
    sheet.appendChild(grid)
    host.replaceChildren(sheet)
    return measureCoupledSheetHeight(sheet)
  }

  function measureMinimalistSheet(headerNode, sideNodes, mainNodes) {
    const host = getMeasureHost()
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page minimalist-page'
    if (headerNode) sheet.appendChild(headerNode.cloneNode(true))
    const grid = document.createElement('section')
    grid.className = 'minimalist-grid'
    const main = document.createElement('div')
    main.className = 'minimalist-main'
    mountMinimalistMainUnits(main, mainNodes)
    const side = document.createElement('aside')
    side.className = 'minimalist-side'
    mountMinimalistSideUnits(side, sideNodes)
    grid.appendChild(main)
    grid.appendChild(side)
    sheet.appendChild(grid)
    host.replaceChildren(sheet)
    return measureCoupledSheetHeight(sheet)
  }

  function packCoupledAtlas(sidebarUnits, mainUnits, maxHeight) {
    const pages = []
    let si = 0
    let mi = 0
    let pageIndex = 0

    while (si < sidebarUnits.length || mi < mainUnits.length) {
      const sidebarNodes = []
      const mainNodes = []
      const allowSidebar = pageIndex === 0 || si < sidebarUnits.length
      let progressed = true

      while (progressed) {
        progressed = false
        if (allowSidebar && si < sidebarUnits.length) {
          const sideBundle = takeNextPackUnits(sidebarUnits, si)
          if (!sideBundle) {
            break
          }
          const trialSidebar = sidebarNodes.concat(sideBundle.nodes)
          const h = measureAtlasSheet(cloneUnits(trialSidebar), cloneUnits(mainNodes))
          if (h <= maxHeight) {
            sideBundle.nodes.forEach((n) => sidebarNodes.push(n))
            si = sideBundle.nextIndex
            progressed = true
            continue
          }
        }
        if (mi < mainUnits.length) {
          const mainBundle = takeNextPackUnits(mainUnits, mi)
          if (!mainBundle) {
            break
          }
          const trialMain = mainNodes.concat(mainBundle.nodes)
          const h = measureAtlasSheet(cloneUnits(sidebarNodes), cloneUnits(trialMain))
          if (h <= maxHeight) {
            mainBundle.nodes.forEach((n) => mainNodes.push(n))
            mi = mainBundle.nextIndex
            progressed = true
          }
        }
      }

      if (!sidebarNodes.length && !mainNodes.length) {
        if (allowSidebar && si < sidebarUnits.length) {
          const sideBundle = takeNextPackUnits(sidebarUnits, si)
          sideBundle.nodes.forEach((n) => sidebarNodes.push(n))
          si = sideBundle.nextIndex
        } else if (mi < mainUnits.length) {
          const mainBundle = takeNextPackUnits(mainUnits, mi)
          mainBundle.nodes.forEach((n) => mainNodes.push(n))
          mi = mainBundle.nextIndex
        }
      }

      const chromeSidebar = pageIndex > 0 && sidebarNodes.length === 0
      pages.push({ sidebarNodes: cloneUnits(sidebarNodes), mainNodes: cloneUnits(mainNodes), chromeSidebar })
      pageIndex += 1
    }

    return pages
  }

  function packCoupledMonochrome(
    headerEl,
    sideUnits,
    mainUnits,
    maxFullHeight,
    headerHeight,
    measureSheetFn,
  ) {
    const pages = []
    let si = 0
    let mi = 0
    let pageIndex = 0
    const headerClone = headerEl ? headerEl.cloneNode(true) : null

    function pageLimit(includeHeader) {
      return includeHeader ? maxFullHeight : getMaxPageHeight()
    }

    function measurePage(headerNode, sideNodes, mainNodes) {
      return measureSheetFn(headerNode, cloneUnits(sideNodes), cloneUnits(mainNodes))
    }

    while (si < sideUnits.length || mi < mainUnits.length) {
      const sideNodes = []
      const mainNodes = []
      const pageMainStart = mi
      let progressed = true
      const includeHeader = pageIndex === 0 && headerClone
      const limit = pageLimit(includeHeader)

      while (progressed) {
        progressed = false
        const headerNode = includeHeader ? headerClone : null
        if (mi < mainUnits.length) {
          const mainBundle = takeNextPackUnits(mainUnits, mi)
          if (mainBundle) {
            const trialMain = mainNodes.concat(mainBundle.nodes)
            const h = measurePage(headerNode, sideNodes, trialMain)
            if (h <= limit) {
              mainBundle.nodes.forEach((n) => mainNodes.push(n))
              mi = mainBundle.nextIndex
              progressed = true
              continue
            }
          }
        }
        if (si < sideUnits.length) {
          const sideBundle = takeNextPackUnits(sideUnits, si)
          if (sideBundle) {
            const trialSide = sideNodes.concat(sideBundle.nodes)
            const h = measurePage(headerNode, trialSide, mainNodes)
            if (h <= limit) {
              sideBundle.nodes.forEach((n) => sideNodes.push(n))
              si = sideBundle.nextIndex
              progressed = true
            }
          }
        }
      }

      const headerNodeForFill = includeHeader ? headerClone : null
      while (mi < mainUnits.length) {
        const mainBundle = takeNextPackUnits(mainUnits, mi)
        if (!mainBundle) break
        const trialMain = mainNodes.concat(mainBundle.nodes)
        const h = measurePage(headerNodeForFill, sideNodes, trialMain)
        if (h <= limit) {
          mainBundle.nodes.forEach((n) => mainNodes.push(n))
          mi = mainBundle.nextIndex
        } else {
          break
        }
      }

      if (!sideNodes.length && !mainNodes.length) {
        if (si < sideUnits.length) {
          const sideBundle = takeNextPackUnits(sideUnits, si)
          sideBundle.nodes.forEach((n) => sideNodes.push(n))
          si = sideBundle.nextIndex
        } else if (mi < mainUnits.length) {
          const mainBundle = takeNextPackUnits(mainUnits, mi)
          mainBundle.nodes.forEach((n) => mainNodes.push(n))
          mi = mainBundle.nextIndex
        }
      }

      const pagePayload = {
        header: includeHeader ? headerClone : null,
        sideNodes: sideNodes.slice(),
        mainNodes: mainNodes.slice(),
        chromeSide: pageIndex > 0 && sideNodes.length === 0,
        mainUnitStart: pageMainStart,
        mainUnitEnd: mi,
      }

      if (
        pages.length > 0 &&
        absorbWithPreviousPackUnits(pages, pagePayload, measurePage, pageLimit, mainUnits)
      ) {
        pageIndex += 1
        continue
      }

      if (!pagePayload.mainNodes.length && !pagePayload.sideNodes.length) {
        pageIndex += 1
        continue
      }

      if (pages.length > 0 && isOrphanExtraInfoMainOnly(pagePayload)) {
        const prev = pages[pages.length - 1]
        if (!shouldBlockOrphanExtraMergeToPrev(prev, pagePayload, pages, pages.length, mainUnits)) {
          const mergedMain = prev.mainNodes.concat(pagePayload.mainNodes)
          const mergedH = measurePage(prev.header || null, prev.sideNodes, mergedMain)
          const prevLimit = pageLimit(!!prev.header)
          const prevEnd = prev.mainUnitEnd ?? 0
          if (mergedH <= prevLimit * 1.15) {
            pages[pages.length - 1] = {
              header: prev.header,
              sideNodes: cloneUnits(prev.sideNodes),
              mainNodes: cloneUnits(mergedMain),
              chromeSide: prev.chromeSide,
              mainUnitStart: prev.mainUnitStart ?? 0,
              mainUnitEnd: pagePayload.mainUnitEnd ?? prevEnd,
            }
            if (pagePayload.sideNodes.length) {
              pages.push({
                header: null,
                sideNodes: cloneUnits(pagePayload.sideNodes),
                mainNodes: [],
                chromeSide: pagePayload.chromeSide,
                mainUnitStart: pagePayload.mainUnitEnd ?? mi,
                mainUnitEnd: pagePayload.mainUnitEnd ?? mi,
              })
            }
            pageIndex += 1
            continue
          }
          if (pagePayload.sideNodes.length) {
            const rebalancedMain = prev.mainNodes.length
              ? [prev.mainNodes[prev.mainNodes.length - 1]].concat(pagePayload.mainNodes)
              : pagePayload.mainNodes
            const rebalancedPrevMain = prev.mainNodes.length
              ? prev.mainNodes.slice(0, -1)
              : prev.mainNodes
            const prevH = measurePage(prev.header || null, prev.sideNodes, rebalancedPrevMain)
            const currH = measurePage(null, pagePayload.sideNodes, rebalancedMain)
            if (
              rebalancedPrevMain.length > 0 &&
              prevH <= prevLimit &&
              currH <= pageLimit(false)
            ) {
              pages[pages.length - 1] = {
                header: prev.header,
                sideNodes: cloneUnits(prev.sideNodes),
                mainNodes: cloneUnits(rebalancedPrevMain),
                chromeSide: prev.chromeSide,
                mainUnitStart: prev.mainUnitStart ?? 0,
                mainUnitEnd: (prev.mainUnitEnd ?? prevEnd) - 1,
              }
              pages.push({
                header: null,
                sideNodes: cloneUnits(pagePayload.sideNodes),
                mainNodes: cloneUnits(rebalancedMain),
                chromeSide: pagePayload.chromeSide,
                mainUnitStart: (prev.mainUnitEnd ?? prevEnd) - 1,
                mainUnitEnd: pagePayload.mainUnitEnd ?? mi,
              })
              pageIndex += 1
              continue
            }
          }
        }
      }

      pages.push({
        header: pagePayload.header,
        sideNodes: cloneUnits(pagePayload.sideNodes),
        mainNodes: cloneUnits(pagePayload.mainNodes),
        chromeSide: pagePayload.chromeSide,
        mainUnitStart: pagePayload.mainUnitStart,
        mainUnitEnd: pagePayload.mainUnitEnd,
      })
      pageIndex += 1
    }

    return mergeOrphanCoupledPages(pages, measureSheetFn, pageLimit, mainUnits)
  }

  function buildAtlasSheet(page) {
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page atlas-page'
    const aside = document.createElement('aside')
    aside.className = page.chromeSidebar
      ? 'atlas-sidebar atlas-sidebar--chrome'
      : 'atlas-sidebar'
    page.sidebarNodes.forEach((n) => aside.appendChild(n))
    const main = document.createElement('section')
    main.className = 'atlas-main'
    mountAtlasMainUnits(main, page.mainNodes)
    sheet.appendChild(aside)
    sheet.appendChild(main)
    return sheet
  }

  function buildMonochromeSheet(page) {
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page monochrome-page'
    if (page.header) sheet.appendChild(page.header.cloneNode(true))
    const grid = document.createElement('section')
    grid.className = page.header ? 'monochrome-grid' : 'monochrome-grid monochrome-grid--continued'
    const main = document.createElement('div')
    main.className = 'monochrome-main'
    mountMonochromeMainUnits(main, page.mainNodes)
    const side = document.createElement('aside')
    side.className = page.chromeSide
      ? 'monochrome-side monochrome-side--chrome'
      : 'monochrome-side'
    mountMonochromeSideUnits(side, page.sideNodes)
    grid.appendChild(main)
    grid.appendChild(side)
    sheet.appendChild(grid)
    return sheet
  }

  function paginateAtlas(sourcePage) {
    const maxH = getMaxPageHeight()
    const sidebar = sourcePage.querySelector('aside.atlas-sidebar')
    const main = sourcePage.querySelector('section.atlas-main')
    if (!sidebar || !main) return [sourcePage.cloneNode(true)]
    const sidebarUnits = collectColumnUnits(sidebar)
    const mainUnits = collectColumnUnits(main)
    if (!sidebarUnits.length && !mainUnits.length) return [sourcePage.cloneNode(true)]
    const pages = []
    const page1Sidebar = cloneUnits(sidebarUnits)
    const allMain = cloneUnits(mainUnits)
    const mainBudget = getAtlasMainContentBudget()
    const mainOnlyH = measureAtlasMainColumnHeight(allMain)
    const combinedH = measureAtlasSheet(page1Sidebar, allMain, false)
    if (mainOnlyH <= mainBudget && combinedH <= maxH) {
      return [
        buildAtlasSheet({
          sidebarNodes: page1Sidebar,
          mainNodes: allMain,
          chromeSidebar: false,
        }),
      ]
    }
    const page1Main = []
    let mi = 0
    while (mi < mainUnits.length) {
      const bundle = takeNextPackUnits(mainUnits, mi)
      if (!bundle) break
      const trialMain = page1Main.concat(bundle.nodes)
      const mainH = measureAtlasMainColumnHeight(trialMain)
      if (mainH <= maxH) {
        bundle.nodes.forEach((n) => page1Main.push(n))
        mi = bundle.nextIndex
        continue
      }
      if (!page1Main.length) {
        bundle.nodes.forEach((n) => page1Main.push(n))
        mi = bundle.nextIndex
      }
      break
    }
    pages.push({
      sidebarNodes: page1Sidebar,
      mainNodes: cloneUnits(page1Main),
      chromeSidebar: false,
    })
    while (mi < mainUnits.length) {
      const mainNodes = []
      const mainBudget = getAtlasMainContentBudget()
      while (mi < mainUnits.length) {
        const bundle = takeNextPackUnits(mainUnits, mi)
        if (!bundle) break
        const trialMain = mainNodes.concat(bundle.nodes)
        const h = measureAtlasSheet([], cloneUnits(trialMain), true)
        if (mainNodes.length > 0 && h > mainBudget) break
        bundle.nodes.forEach((n) => mainNodes.push(n))
        mi = bundle.nextIndex
        if (h > mainBudget) break
      }
      if (!mainNodes.length && mi < mainUnits.length) {
        const bundle = takeNextPackUnits(mainUnits, mi)
        bundle.nodes.forEach((n) => mainNodes.push(n))
        mi = bundle.nextIndex
      }
      pages.push({
        sidebarNodes: [],
        mainNodes: cloneUnits(mainNodes),
        chromeSidebar: true,
      })
    }
    return pages.map(buildAtlasSheet)
  }

  function paginateMonochrome(sourcePage) {
    const maxH = getMaxPageHeight()
    const header = sourcePage.querySelector('section.monochrome-header')
    const grid = sourcePage.querySelector('section.monochrome-grid')
    if (!grid) return [sourcePage.cloneNode(true)]
    const main = grid.querySelector('.monochrome-main')
    const side = grid.querySelector('aside.monochrome-side')
    if (!main || !side) return [sourcePage.cloneNode(true)]
    let headerH = 0
    if (header) {
      const host = document.getElementById('cv-pagination-measure-host')
      if (host) {
        host.innerHTML = ''
        host.appendChild(header.cloneNode(true))
        headerH = host.scrollHeight
      }
    }
    const sideUnits = collectColumnUnits(side)
    const mainUnits = collectColumnUnits(main)
    const single = tryCoupledSingleSheet(
      header,
      sideUnits,
      mainUnits,
      maxH,
      measureMonochromeSheet,
      buildMonochromeSheet,
    )
    if (single) return single
    const pages = packCoupledMonochrome(
      header,
      sideUnits,
      mainUnits,
      maxH,
      headerH,
      measureMonochromeSheet,
    )
    return pages.map(buildMonochromeSheet)
  }

  function measureEditorialSheet(topbarNode, sideNodes, mainNodes) {
    const host = getMeasureHost()
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page editorial-page'
    if (topbarNode) sheet.appendChild(topbarNode.cloneNode(true))
    const cols = document.createElement('section')
    cols.className = 'editorial-columns'
    const main = document.createElement('div')
    mountEditorialMainUnits(main, mainNodes)
    const side = document.createElement('aside')
    side.className = 'editorial-side'
    mountEditorialSideUnits(side, sideNodes)
    cols.appendChild(main)
    cols.appendChild(side)
    sheet.appendChild(cols)
    host.replaceChildren(sheet)
    return measureCoupledSheetHeight(sheet)
  }

  function buildEditorialSheet(page) {
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page editorial-page'
    if (page.header) sheet.appendChild(page.header.cloneNode(true))
    const cols = document.createElement('section')
    cols.className = page.header
      ? 'editorial-columns'
      : 'editorial-columns editorial-columns--continued'
    const mainEl = document.createElement('div')
    mountEditorialMainUnits(mainEl, page.mainNodes)
    const sideEl = document.createElement('aside')
    sideEl.className = 'editorial-side'
    mountEditorialSideUnits(sideEl, page.sideNodes)
    cols.appendChild(mainEl)
    cols.appendChild(sideEl)
    sheet.appendChild(cols)
    return sheet
  }

  function paginateEditorial(sourcePage) {
    const maxH = getMaxPageHeight()
    const topbar = sourcePage.querySelector('section.editorial-topbar')
    const columns = sourcePage.querySelector('section.editorial-columns')
    if (!columns) return paginateSingleColumn(sourcePage)
    const mainCol = columns.querySelector(':scope > div')
    const side = columns.querySelector('aside.editorial-side')
    if (!mainCol || !side) return paginateSingleColumn(sourcePage)
    let topH = 0
    if (topbar) {
      const host = getMeasureHost()
      host.innerHTML = ''
      host.appendChild(topbar.cloneNode(true))
      topH = host.scrollHeight
    }
    const sideUnits = collectColumnUnits(side)
    const mainUnits = collectColumnUnits(mainCol)
    const single = tryCoupledSingleSheet(
      topbar,
      sideUnits,
      mainUnits,
      maxH,
      measureEditorialSheet,
      buildEditorialSheet,
    )
    if (single) return single
    const pages = packCoupledMonochrome(
      topbar,
      sideUnits,
      mainUnits,
      maxH,
      topH,
      measureEditorialSheet,
    )
    return pages.length ? pages.map(buildEditorialSheet) : paginateSingleColumn(sourcePage)
  }

  function buildMinimalistSheet(page) {
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page minimalist-page'
    if (page.header) sheet.appendChild(page.header.cloneNode(true))
    const gridEl = document.createElement('section')
    gridEl.className = page.header ? 'minimalist-grid' : 'minimalist-grid minimalist-grid--continued'
    const mainEl = document.createElement('div')
    mainEl.className = 'minimalist-main'
    mountMinimalistMainUnits(mainEl, page.mainNodes)
    const sideEl = document.createElement('aside')
    sideEl.className = 'minimalist-side'
    mountMinimalistSideUnits(sideEl, page.sideNodes)
    gridEl.appendChild(mainEl)
    gridEl.appendChild(sideEl)
    sheet.appendChild(gridEl)
    return sheet
  }

  function paginateMinimalist(sourcePage) {
    const maxH = getMaxPageHeight()
    const header = sourcePage.querySelector('section.minimalist-header')
    const grid = sourcePage.querySelector('section.minimalist-grid')
    if (!grid) return paginateSingleColumn(sourcePage)
    const main = grid.querySelector('.minimalist-main')
    const side = grid.querySelector('aside.minimalist-side')
    if (!main || !side) return paginateSingleColumn(sourcePage)
    let headerH = 0
    if (header) {
      const host = getMeasureHost()
      host.innerHTML = ''
      host.appendChild(header.cloneNode(true))
      headerH = host.scrollHeight
    }
    const sideUnits = collectColumnUnits(side)
    const mainUnits = collectColumnUnits(main)
    const single = tryCoupledSingleSheet(
      header,
      sideUnits,
      mainUnits,
      maxH,
      measureMinimalistSheet,
      buildMinimalistSheet,
    )
    if (single) return single
    const pages = packCoupledMonochrome(
      header,
      sideUnits,
      mainUnits,
      maxH,
      headerH,
      measureMinimalistSheet,
    )
    return pages.map(buildMinimalistSheet)
  }

  function measureSingleColumnPage(nodes, className) {
    let host = document.getElementById('cv-pagination-measure-host')
    if (!host) {
      host = document.createElement('div')
      host.id = 'cv-pagination-measure-host'
      host.className = 'cv-page-export'
      host.style.cssText =
        'position:absolute;left:0;top:0;width:210mm;visibility:hidden;pointer-events:none;z-index:-1;'
      document.body.appendChild(host)
    }
    const sheet = document.createElement('div')
    sheet.className = 'cv-sheet resume-page ' + className
    const flow = document.createElement('div')
    flow.className = 'cv-sheet-flow'
    nodes.forEach((n) => flow.appendChild(n.cloneNode(true)))
    sheet.appendChild(flow)
    host.replaceChildren(sheet)
    return flow.scrollHeight
  }

  function paginateSingleColumn(sourcePage) {
    const maxH = getMaxPageHeight()
    const units = collectColumnUnits(sourcePage)
    const className = sourcePage.className.replace('resume-page', '').trim()
    const sheets = []
    let index = 0
    let pageIndex = 0
    while (index < units.length) {
      const nodes = []
      while (index < units.length) {
        const bundle = takeNextPackUnits(units, index)
        if (!bundle) {
          break
        }
        const trial = nodes.concat(bundle.nodes)
        const h = measureSingleColumnPage(cloneUnits(trial), className)
        if (nodes.length > 0 && h > maxH) {
          break
        }
        bundle.nodes.forEach((n) => nodes.push(n))
        index = bundle.nextIndex
        if (h > maxH) {
          break
        }
      }
      if (!nodes.length && index < units.length) {
        const bundle = takeNextPackUnits(units, index)
        bundle.nodes.forEach((n) => nodes.push(n))
        index = bundle.nextIndex
      }
      const sheet = document.createElement('div')
      sheet.className = 'cv-sheet resume-page ' + className
      const flow = document.createElement('div')
      flow.className = 'cv-sheet-flow'
      nodes.forEach((n) => flow.appendChild(n.cloneNode(true)))
      sheet.appendChild(flow)
      sheets.push(sheet)
      pageIndex += 1
    }
    return sheets.length ? sheets : [sourcePage.cloneNode(true)]
  }

  function paginateResumePage(sourcePage) {
    if (sourcePage.classList.contains('atlas-page')) return paginateAtlas(sourcePage)
    if (sourcePage.classList.contains('monochrome-page')) return paginateMonochrome(sourcePage)
    if (sourcePage.classList.contains('editorial-page')) return paginateEditorial(sourcePage)
    if (sourcePage.classList.contains('minimalist-page')) return paginateMinimalist(sourcePage)
    return paginateSingleColumn(sourcePage)
  }

  async function ensureCvFontsReady() {
    if (!document.fonts) {
      return
    }
    await document.fonts.ready
    const descriptors = [
      '400 16px "Source Sans 3"',
      '600 16px "Source Sans 3"',
      '700 16px "Source Sans 3"',
      '500 16px "Space Grotesk"',
      '700 16px "Space Grotesk"',
      '600 22px "Cormorant Garamond"',
      '700 22px "Cormorant Garamond"',
    ]
    await Promise.all(
      descriptors.map((desc) => document.fonts.load(desc).catch(() => undefined)),
    )
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
  }

  win.__cvRunPagination = function cvRunPagination() {
    if (!win.__cvPaginationPromise) {
      document.body.classList.add('cv-pagination-busy')
      win.__cvPaginationPromise = ensureCvFontsReady()
        .then(() => run())
        .catch((err) => fail(err))
    }
    return win.__cvPaginationPromise
  }

  if (document.body.classList.contains('cv-export-preview')) {
    win.__cvRunPagination().catch((err) => fail(err))
  }
})()
