import express from 'express'
import showController from './controllers/show'

const app = express()

app.set('port', process.env.PORT || 3000)

app.use('/', showController)

app.listen(app.get('port'), () => {
  console.log(
    '  App is running at http://localhost:%d in %s mode',
    app.get('port'),
    app.get('env')
  )
})
