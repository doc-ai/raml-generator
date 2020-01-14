var parser = require('raml-1-parser')
var join = require('path').join
var assert = require('assert')

parser.loadApi(join(__dirname, 'overlay.raml'))
  .then(function (api) {
    console.log("Successful loading of overlay.raml")
    // console.log(JSON.stringify(api.toJSON(), null, 2))
  })
  .catch(function (err) {
    console.log(err)
    process.exit(1)
  })

parser.loadApi(join(__dirname, 'banking-api/api.raml'), [], { rejectOnErrors: true })
  .then(function (api) {
    console.log("expected reject on error, but succeeded")
    process.exit(1)
  })
  .catch(function (err) {
    console.log("Successful error:  "+err)
  })

parser.loadApi(join(__dirname, 'banking-api/api.raml'), [], { rejectOnErrors: false })
  .then(function (api) {
    console.log("Successful banking-api load")
  })
  .catch(function (err) {
    console.log("expected no reject on error, but failed")
    process.exit(1)
  })
