/**
 * My Holiday Planner
 *
 * Copyright 2016 IBM Corp. All Rights Reserved
 *
 *  Author
 *  Ong Khai Wei
 *  ongkhaiwei@gmail.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// app.js

'use-strict';

var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var cfenv = require('cfenv');
var request = require("request");

// create a new express server
var app = express();
var appEnv = cfenv.getAppEnv();

var amadeus_apikey = process.env.AMADEUS_APIKEY;
var expedia_apikey = process.env.EXPEDIA_APIKEY;

var weather_host = appEnv.services["weatherinsights"] 
        ? appEnv.services["weatherinsights"][0].credentials.url // Insights for Weather credentials passed in
        : ""; 

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
        		day3: {	min: data3.min_temp, max: data3.max_temp, dow: data3.dow }
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
    console.log(options.url);
	request(options, function (error, response, body) {
	  if (error) throw new Error(error);
      console.log("a:"+body);
	  var data = JSON.parse(body);
	  res.status(200).send(data);

	});


});

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
