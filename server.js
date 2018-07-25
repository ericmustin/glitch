var express = require('express');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
var router = express.Router();

app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true }));

var fakeDB = {
  'TSLA': {}
}

var controller = {};

controller.getInfo = function(req, res) {
  if ( (req && req.headers) || (req && req.connection) ){
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('is: ', ip);
  }

  //Checks fakedb for key before checking database
  if (fakeDB['TSLA']['isHalted'] === undefined) {
    console.log('api request starting')
    request('http://www.nasdaqtrader.com/rss.aspx?feed=tradehalts', (err, response, body) => {
      console.log('api request response')
      if (err) {
        // https error
        console.log(err);
        res.send(400, {data: 'error'})
      } else {
        // check for TSLA string in rss response
        var containsTSLA = body.indexOf('TSLA') !== -1;

        //Set the key/value pair in memory db so that its available going forward
        fakeDB['TSLA']['isHalted'] = containsTSLA
        fakeDB['TSLA']['nextRefresh'] = (new Date).getTime() + 30000
        res.send(200, {data: containsTSLA})
      }
    });
  } else {
    var currentTime = (new Date).getTime();
    if (currentTime < fakeDB['TSLA']['nextRefresh']) {
      console.log('no api request')
      res.send(200, {data: fakeDB['TSLA']['isHalted']})
    } else {
      console.log('api request starting')
      request('http://www.nasdaqtrader.com/rss.aspx?feed=tradehalts', (err, response, body) => {
        console.log('api request')
        if (err) {
          // https error
          console.log(err);
          res.send(400, {data: 'error'})
        } else {
          // check for TSLA string in rss response
          var containsTSLA = body.indexOf('TSLA') !== -1;

          //Set the key/value pair in memory db so that its available going forward
          fakeDB['TSLA']['isHalted'] = containsTSLA
          fakeDB['TSLA']['nextRefresh'] = (new Date).getTime() + 30000
          res.send(200, {data: containsTSLA})
        }
      });
    }
  }
};


var routes = function(app) {
  app.get('/info', controller.getInfo)
};

//default is a max-age of 0
app.use(express.static(__dirname+'/views'));

//max age of 60 seconds
// app.use(express.static(__dirname+'/client', {maxAge: 60000 }));

app.use('/api', router);
routes(router);

app.set('port', (process.env.PORT || 3000) );

app.listen(app.get('port'), function() {
  console.log('server is running');
});


//keep uptime

setInterval(() => {
  console.log('keeping up');
  request.get("https://isteslahalted.glitch.me/");
}, 280000);
