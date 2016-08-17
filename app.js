/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();
var appEnv = cfenv.getAppEnv();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var request = require("request");

var a_apikey='2jHs8hy1v9zq4yd1tGG8K6cbhmVc9t5r';
var e_apikey='EExYERlrN4PPxw0aS55s9bzx4wrOCdR3';

var weather_host = appEnv.services["weatherinsights"] 
        ? appEnv.services["weatherinsights"][0].credentials.url // Insights for Weather credentials passed in
        : "https://179013f4-3915-43c7-94f4-6c8bb5ecc11b:KeWO8LLnNI@twcservice.mybluemix.net"; 

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();



app.get('/destination', function(req, res) {
	var data = JSON.parse(fs.readFileSync('tripsadvisor2016.json'));
    
	res.status(200).send(data.destination[random(4,0)]);
    //fs.createReadStream('tripsadvisor2016.json').pipe(res);
});


function random (max,min) {
    return Math.round(Math.random() * (max - min) + min);
};

app.get('/location/:iata', function(req, res) {

	//console.log(req.params.iata)

	var options = {
		method: 'GET',
	 	url: 'https://api.sandbox.amadeus.com/v1.2/location/' + req.params.iata + '?apikey=' + a_apikey
	};

	request(options, function (error, response, body) {
	  if (error) throw new Error(error);

	  var data = JSON.parse(body);
	  var loc = data.city.location;

	  res.status(200).send(loc);

	});

});

app.get('/poi/:latitude/:longitude', function(req, res) {

	var options = {
		method: 'GET',
	 	url: 'http://terminal2.expedia.com/x/geo/features?within=5km&lng=' + req.params.longitude + '&lat=' + req.params.latitude + '&type=point_of_interest&verbose=3&lcid=1033&apikey=' + e_apikey
	};

	request(options, function (error, response, body) {
	  if (error) throw new Error(error);

	  var data = JSON.parse(body);
	  res.status(200).send(data);

	});

});

function weatherAPI(path, qs, done) {
    var url = weather_host + path;

    request({
        url: url,
        method: "GET",
        headers: {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        },
        qs: qs
    }, function(err, req, data) {
        if (err) {
            done(err);
        } else {
            if (req.statusCode >= 200 && req.statusCode < 400) {
                try {
                    done(null, JSON.parse(data));
                } catch(e) {
                    console.log(e);
                    done(e);
                }
            } else {
                console.log(err);
                done({ message: req.statusCode, data: data });
            }
        }
    });
}

app.get('/weather/:latitude/:longitude', function(req, res) {
    //console.log('latitude:'+req.query.latitude+' longitude:' + req.query.longitude);
    weatherAPI("/api/weather/v1/geocode/" + req.params.latitude + "/" + req.params.longitude + "/forecast/daily/3day.json?language=en-US&units=m", null, function(err, result) {
        if (err) {
            res.send(err).status(400);
        } else {

        	var data1 = result.forecasts[1];
        	var data2 = result.forecasts[2];
        	var data3 = result.forecasts[3];

        	var weather_forecast = { 
        		day1: {	min: data1.min_temp, max: data1.max_temp, dow: data1.dow },
        		day2: {	min: data2.min_temp, max: data2.max_temp, dow: data2.dow },
        		day3: {	min: data3.min_temp, max: data3.max_temp, dow: data2.dow }
        	} 
            res.status(200).send(weather_forecast);
        }
    });
});

app.get('/flights/:iata', function(req,res) {

	var origin = 'SIN';
	var airline = 'SQ';

	var options = {
		method: 'GET',
	 	url: 'https://api.sandbox.amadeus.com/v1.2/flights/low-fare-search?apikey=' + a_apikey + '&origin='+origin+'&destination=' + req.params.iata+ '&departure_date=2016-11-25&include_airlines=' + airline + '&nonstop=true&currency=SGD&number_of_results=5'
	};

	request(options, function (error, response, body) {
	  if (error) throw new Error(error);

	  var data = JSON.parse(body);
	  res.status(200).send(data);

	});


}); 

https://api.sandbox.amadeus.com/v1.2/flights/low-fare-search?apikey=2jHs8hy1v9zq4yd1tGG8K6cbhmVc9t5r&origin=SIN&destination=LON&departure_date=2016-11-25&include_airlines=SQ&number_of_results=5


// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
