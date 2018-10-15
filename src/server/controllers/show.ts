import express, { Request, Response } from 'express'
import { ShowModel } from '../../types'
import ShowDocument from '../../db'

const router = express.Router()

const PAGE_SIZE = 100

router.get('/shows', (req: Request, res: Response) => {
  const page: number = req.query.page || 0
  ShowDocument.find({}, { _id: false, 'cast._id': false })
    .skip(page * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .then((shows: ShowModel[]) => {
      if (shows.length > 0) {
        res.json(shows)
      } else {
        res.sendStatus(404)
      }
    })
    .catch(() => res.sendStatus(500))
})

export default router
