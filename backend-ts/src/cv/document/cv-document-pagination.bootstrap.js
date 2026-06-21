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
    let breakableSection = null
    nodes.forEach((node) => {
      const kind = node.getAttribute('data-cv-unit')
      if (kind === 'section-head') {
        breakableSection = document.createElement('section')
        breakableSection.className = 'atlas-intro cv-breakable-section'
        breakableSection.appendChild(node.cloneNode(true))
        mainEl.appendChild(breakableSection)
        return
      }
      if (kind === 'entry') {
        if (!breakableSection) {
          breakableSection = document.createElement('section')
          breakableSection.className = 'atlas-intro cv-breakable-section'
          mainEl.appendChild(breakableSection)
        }
        breakableSection.appendChild(node.cloneNode(true))
        return
      }
      breakableSection = null
      mainEl.appendChild(node.cloneNode(true))
    })
  }

  function measureMonochromeSheet(headerNode, sideNodes, mainNodes) {
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
    sheet.className = 'cv-sheet resume-page monochrome-page'
    if (headerNode) sheet.appendChild(headerNode.cloneNode(true))
    const grid = document.createElement('section')
    grid.className = 'monochrome-grid'
    const main = document.createElement('div')
    main.className = 'monochrome-main'
    mainNodes.forEach((n) => main.appendChild(n.cloneNode(true)))
    const side = document.createElement('aside')
    side.className = 'monochrome-side'
    sideNodes.forEach((n) => side.appendChild(n.cloneNode(true)))
    grid.appendChild(main)
    grid.appendChild(side)
    sheet.appendChild(grid)
    host.replaceChildren(sheet)
    return sheet.scrollHeight
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
  ) {
    const contentMax = Math.max(maxFullHeight - headerHeight, maxFullHeight * 0.55)
    const pages = []
    let si = 0
    let mi = 0
    let pageIndex = 0
    const headerClone = headerEl ? headerEl.cloneNode(true) : null

    while (si < sideUnits.length || mi < mainUnits.length) {
      const sideNodes = []
      const mainNodes = []
      let progressed = true
      const includeHeader = pageIndex === 0 && headerClone

      while (progressed) {
        progressed = false
        if (si < sideUnits.length) {
          const sideBundle = takeNextPackUnits(sideUnits, si)
          if (!sideBundle) {
            break
          }
          const trialSide = sideNodes.concat(sideBundle.nodes)
          const h = measureMonochromeSheet(
            includeHeader ? headerClone : null,
            cloneUnits(trialSide),
            cloneUnits(mainNodes),
          )
          if (h <= (includeHeader ? maxFullHeight : contentMax)) {
            sideBundle.nodes.forEach((n) => sideNodes.push(n))
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
          const h = measureMonochromeSheet(
            includeHeader ? headerClone : null,
            cloneUnits(sideNodes),
            cloneUnits(trialMain),
          )
          if (h <= (includeHeader ? maxFullHeight : contentMax)) {
            mainBundle.nodes.forEach((n) => mainNodes.push(n))
            mi = mainBundle.nextIndex
            progressed = true
          }
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

      pages.push({
        header: includeHeader ? headerClone : null,
        sideNodes: cloneUnits(sideNodes),
        mainNodes: cloneUnits(mainNodes),
        chromeSide: pageIndex > 0 && sideNodes.length === 0,
      })
      pageIndex += 1
    }

    return pages
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
    grid.className = 'monochrome-grid'
    const main = document.createElement('div')
    main.className = 'monochrome-main'
    page.mainNodes.forEach((n) => main.appendChild(n))
    const side = document.createElement('aside')
    side.className = page.chromeSide
      ? 'monochrome-side monochrome-side--chrome'
      : 'monochrome-side'
    page.sideNodes.forEach((n) => side.appendChild(n))
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
    const mainOnlyH = measureAtlasSheet([], allMain, true)
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
      const h = measureAtlasSheet(page1Sidebar, cloneUnits(trialMain), false)
      if (h <= maxH) {
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
    const pages = packCoupledMonochrome(
      header,
      collectColumnUnits(side),
      collectColumnUnits(main),
      maxH,
      headerH,
    )
    return pages.map(buildMonochromeSheet)
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
      const host = document.getElementById('cv-pagination-measure-host')
      if (host) {
        host.innerHTML = ''
        host.appendChild(topbar.cloneNode(true))
        topH = host.scrollHeight
      }
    }
    const contentMax = Math.max(maxH - topH, maxH * 0.6)
    const sideUnits = collectColumnUnits(side)
    const mainUnits = collectColumnUnits(mainCol)
    const topClone = topbar ? topbar.cloneNode(true) : null
    const sheets = []
    let si = 0
    let mi = 0
    let pageIndex = 0

    while (si < sideUnits.length || mi < mainUnits.length) {
      const sideNodes = []
      const mainNodes = []
      let progressed = true
      while (progressed) {
        progressed = false
        if (si < sideUnits.length) {
          const sideBundle = takeNextPackUnits(sideUnits, si)
          if (!sideBundle) {
            break
          }
          const trial = sideNodes.concat(sideBundle.nodes)
          const h = measureEditorialPage(topClone && pageIndex === 0 ? topClone : null, trial, mainNodes)
          const limit = pageIndex === 0 && topClone ? maxH : contentMax
          if (h <= limit) {
            sideBundle.nodes.forEach((n) => sideNodes.push(n))
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
          const trial = mainNodes.concat(mainBundle.nodes)
          const h = measureEditorialPage(topClone && pageIndex === 0 ? topClone : null, sideNodes, trial)
          const limit = pageIndex === 0 && topClone ? maxH : contentMax
          if (h <= limit) {
            mainBundle.nodes.forEach((n) => mainNodes.push(n))
            mi = mainBundle.nextIndex
            progressed = true
          }
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
      const sheet = document.createElement('div')
      sheet.className = 'cv-sheet resume-page editorial-page'
      if (pageIndex === 0 && topClone) sheet.appendChild(topClone.cloneNode(true))
      const cols = document.createElement('section')
      cols.className = 'editorial-columns'
      const mainEl = document.createElement('div')
      mainNodes.forEach((n) => mainEl.appendChild(n.cloneNode(true)))
      const sideEl = document.createElement('aside')
      sideEl.className = 'editorial-side'
      sideNodes.forEach((n) => sideEl.appendChild(n.cloneNode(true)))
      cols.appendChild(mainEl)
      cols.appendChild(sideEl)
      sheet.appendChild(cols)
      sheets.push(sheet)
      pageIndex += 1
    }
    return sheets.length ? sheets : paginateSingleColumn(sourcePage)
  }

  function measureEditorialPage(topbar, sideNodes, mainNodes) {
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
    sheet.className = 'cv-sheet resume-page editorial-page'
    if (topbar) sheet.appendChild(topbar.cloneNode(true))
    const cols = document.createElement('section')
    cols.className = 'editorial-columns'
    const main = document.createElement('div')
    mainNodes.forEach((n) => main.appendChild(n.cloneNode(true)))
    const side = document.createElement('aside')
    side.className = 'editorial-side'
    sideNodes.forEach((n) => side.appendChild(n.cloneNode(true)))
    cols.appendChild(main)
    cols.appendChild(side)
    sheet.appendChild(cols)
    host.replaceChildren(sheet)
    return sheet.scrollHeight
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
      const host = document.getElementById('cv-pagination-measure-host')
      if (host) {
        host.innerHTML = ''
        host.appendChild(header.cloneNode(true))
        headerH = host.scrollHeight
      }
    }
    const contentMax = Math.max(maxH - headerH, maxH * 0.55)
    const pages = packCoupledMonochrome(
      header,
      collectColumnUnits(side),
      collectColumnUnits(main),
      maxH,
      headerH,
    )
    return pages.map((page) => {
      const sheet = document.createElement('div')
      sheet.className = 'cv-sheet resume-page minimalist-page'
      if (page.header) sheet.appendChild(page.header.cloneNode(true))
      const gridEl = document.createElement('section')
      gridEl.className = 'minimalist-grid'
      const mainEl = document.createElement('div')
      mainEl.className = 'minimalist-main'
      page.mainNodes.forEach((n) => mainEl.appendChild(n))
      const sideEl = document.createElement('aside')
      sideEl.className = 'minimalist-side'
      page.sideNodes.forEach((n) => sideEl.appendChild(n))
      gridEl.appendChild(mainEl)
      gridEl.appendChild(sideEl)
      sheet.appendChild(gridEl)
      return sheet
    })
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
