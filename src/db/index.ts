import mongoose from 'mongoose'

mongoose.connect('mongodb://localhost/tvmaze-scraper', { useNewUrlParser: true })

export const connection = mongoose.connection
connection.on('error', console.error.bind(console, 'connection error:'))
connection.once('open', () => {
  console.log('connected to db')
})

const showSchema = new mongoose.Schema({
  id: Number,
  name: String,
  cast: [{
    id: Number,
    name: String,
    birthday: String
  }]
})

const ShowDocument = mongoose.model('Show', showSchema)
export default ShowDocument
