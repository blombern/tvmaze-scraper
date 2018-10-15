# TVMaze Scraper
## Running
### Install and run MongoDB
`brew install mongodb`

`mkdir -p /data/db && chmod 777 /data/db`

`mongod`

### Create db for app
`mongo`

`use tvmaze-scraper`

### Install deps
`yarn`

### Start scraper
`yarn scrape`

### Run app
`yarn start`

Exposes shows at http://localhost:3000/shows?page=0
