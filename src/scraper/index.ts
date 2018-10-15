import fetch from 'node-fetch'
import { parse, isAfter } from 'date-fns'
import { ApiResponse, ApiShow, Show, ApiCastMember, CastMember } from '../types'
import Bottleneck from 'bottleneck'
import ShowDocument, { connection } from '../db'

const TVMAZE_API_ROOT = 'https://api.tvmaze.com'
const INITIAL_RETRY_DELAY = 5000
const INITIAL_MINTIME = 10
const DELAY_MULTIPLIER = 1.5
const MINTIME_MULTIPLIER = 1.2

const getIncreasedRetryDelay = (current: number): number =>
  Math.round(current * DELAY_MULTIPLIER)

const getIncreasedMinTime = (current: number): number =>
  Math.round(current * MINTIME_MULTIPLIER)

const delay = (duration: number) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
}

class NotFoundError {}
class RateLimitError {}

const limiter = new Bottleneck({ minTime: INITIAL_MINTIME })
const limitedFetch = limiter.wrap(fetch)

const fetchJson = (url: string): Promise<ApiResponse> =>
  limitedFetch(url).then(res => {
    if (res.ok) {
      return res.json()
    }
    if (res.status === 429) {
      throw new RateLimitError()
    }
    if (res.status === 404) {
      throw new NotFoundError()
    }
    throw new Error()
  })

const parseShowReponse = (shows: ApiResponse): ApiShow[] =>
  shows.map(({ id, name }: ApiShow) => ({ id, name }))

const parseCastResponse = (cast: ApiCastMember[]): CastMember[] =>
  cast.map(({ person: { id, name, birthday } }) => ({ id, name, birthday }))

const fetchShows = (page: Number): Promise<ApiShow[]> =>
  fetchJson(`${TVMAZE_API_ROOT}/shows?page=${page}`).then(parseShowReponse)

const fetchCast = (id: Number): Promise<CastMember[]> =>
  fetchJson(`${TVMAZE_API_ROOT}/shows/${id}/cast`).then(parseCastResponse)

const persistShows = (shows: Show[]): Promise<void> =>
  Promise.all(
    shows.map((show: Show) => {
      const doc = new ShowDocument(show)
      return doc.save()
    })
  ).then(() => {})

const birthdayCompare = (
  { birthday: a }: CastMember,
  { birthday: b }: CastMember
): number => {
  if (a && b) {
    try {
      const dateA = parse(a)
      const dateB = parse(b)
      return isAfter(dateA, dateB) ? -1 : 1
    } catch (err) {
      return 0
    }
  }
  return 0
}

const sortBirthdays = (cast: CastMember[]): CastMember[] => {
  const withBirthday = cast.filter(c => c.birthday).sort(birthdayCompare)
  const withoutBirthday = cast.filter(c => !c.birthday)
  return [...withBirthday, ...withoutBirthday]
}

const fetchPageRecursive = (
  pageNumber: number,
  minTime: number,
  retryDelay: number
): Promise<void> =>
  fetchShows(pageNumber)
    .then(shows =>
      Promise.all(
        shows.map(show =>
          fetchCast(show.id).then(cast =>
            Object.assign(show, { cast: sortBirthdays(cast) })
          )
        )
      )
    )
    .then(persistShows)
    .then(() => {
      console.log(`Got page ${pageNumber}`)
      return fetchPageRecursive(++pageNumber, minTime, retryDelay)
    })
    .catch(err => {
      if (err instanceof RateLimitError) {
        const newMinTime = getIncreasedMinTime(minTime)
        const newRetryDelay = getIncreasedRetryDelay(retryDelay)
        limiter.updateSettings({ minTime: newMinTime })
        console.log(
          `Hit rate limit, retrying with minTime ${newMinTime} in ${newRetryDelay}`
        )
        return delay(newRetryDelay).then(() =>
          fetchPageRecursive(pageNumber, newMinTime, newRetryDelay)
        )
      }
      if (err instanceof NotFoundError) {
        console.log(`Reached last page ${--pageNumber}`)
        return Promise.resolve()
      }

      console.error('Unknown error, retrying', err)
      return fetchPageRecursive(pageNumber, minTime, retryDelay)
    })

fetchPageRecursive(1, INITIAL_MINTIME, INITIAL_RETRY_DELAY).then(() => {
  console.log('DONE')
  connection.close().then(() => process.exit(0))
})
