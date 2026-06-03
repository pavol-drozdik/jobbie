import type { Socket } from 'socket.io-client'
import type { Job } from '~/utils/job'

/** Loaded on demand so the homepage does not pull socket.io-client into the initial chunk. */
let ioLoader: Promise<(typeof import('socket.io-client'))['io']> | null = null

function loadIo(): Promise<(typeof import('socket.io-client'))['io']> {
  if (!ioLoader) {
    ioLoader = import('socket.io-client').then((m) => m.io)
  }
  return ioLoader
}

export type JobPublishedSocketPayload = {
  id: string
  title: string
  category: string | null
  location: string | null
  location_address: string | null
  created_at: string
  salary: string | null
  compensation_type: string | null
  compensation_amount: number | null
  is_urgent: boolean
  job_type: string | null
}

export type UseJobsFeedSocketOptions = {
  /** When set, connect only after the section enters (or nears) the viewport. */
  sectionRef?: Ref<HTMLElement | null | undefined>
}

function socketPayloadToJob(p: JobPublishedSocketPayload): Job {
  return {
    id: p.id,
    company_id: '',
    title: p.title,
    description: '',
    location: p.location,
    location_address: p.location_address,
    location_lat: null,
    location_lng: null,
    contract_type: null,
    requirements: null,
    salary: p.salary,
    job_type: p.job_type,
    expires_at: null,
    is_draft: false,
    is_active: true,
    created_at: p.created_at,
    updated_at: p.created_at,
    category: p.category,
    is_urgent: p.is_urgent,
    is_featured: false,
    compensation_type: p.compensation_type,
    compensation_amount: p.compensation_amount,
    workers_needed: 1,
    application_deadline: null,
    completion_deadline: null,
    employer_email: null,
    employer_name: null,
    photos: [],
    applications_count: 0,
  }
}

function mergeLatestFromSocket(
  latestJobsRef: Ref<Job[]>,
  incoming: Job,
  limit: number,
): void {
  const byId = new Map(latestJobsRef.value.map((j) => [j.id, j]))
  byId.set(incoming.id, incoming)
  const sorted = [...byId.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  latestJobsRef.value = sorted.slice(0, limit)
}

/**
 * Subscribes to public `/jobs-feed` Socket.IO events and keeps `latestJobsRef` sorted (newest first, capped).
 * Connection is deferred until idle or until `sectionRef` intersects the viewport.
 */
export function useJobsFeedSocket(
  latestJobsRef: Ref<Job[]>,
  limit: number,
  options?: UseJobsFeedSocketOptions,
): void {
  if (import.meta.server) {
    return
  }
  const { getApiBaseUrl } = useApi()
  let socket: Socket | null = null
  let connectScheduled = false
  let intersectionObserver: IntersectionObserver | null = null
  let idleCallbackId: number | null = null
  let fallbackTimerId: ReturnType<typeof setTimeout> | null = null

  function connect(): void {
    if (socket) return
    void loadIo().then((io) => {
      const base = getApiBaseUrl().replace(/\/$/, '').replace(/\/api$/, '')
      socket = io(`${base}/jobs-feed`, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 3,
      })
      socket.on('job_published', (payload: JobPublishedSocketPayload) => {
        if (!payload?.id || !payload.created_at) return
        const job = socketPayloadToJob(payload)
        mergeLatestFromSocket(latestJobsRef, job, limit)
      })
    })
  }

  function scheduleConnect(): void {
    if (connectScheduled) return
    connectScheduled = true
    const section = options?.sectionRef?.value
    if (section && typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            intersectionObserver?.disconnect()
            intersectionObserver = null
            connect()
          }
        },
        { rootMargin: '240px' },
      )
      intersectionObserver.observe(section)
      return
    }
    if (typeof requestIdleCallback !== 'undefined') {
      idleCallbackId = requestIdleCallback(() => connect(), { timeout: 3000 })
      return
    }
    fallbackTimerId = setTimeout(connect, 1500)
  }

  function cancelScheduledConnect(): void {
    intersectionObserver?.disconnect()
    intersectionObserver = null
    if (idleCallbackId !== null && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(idleCallbackId)
      idleCallbackId = null
    }
    if (fallbackTimerId !== null) {
      clearTimeout(fallbackTimerId)
      fallbackTimerId = null
    }
  }

  onMounted(() => {
    scheduleConnect()
  })
  onUnmounted(() => {
    cancelScheduledConnect()
    if (socket) {
      socket.disconnect()
      socket = null
    }
  })
}
