var directionsService;
var placesService;
var map;

/*
 * Initialize the program state (everything here should be done as soon as the API is loaded)
 */
function init() {
  directionsService = new google.maps.DirectionsService();
  setUpMap();
  placesService = new google.maps.places.PlacesService(map);

  var center = new google.maps.LatLng(42.358056, -71.063611); // a location in Boston

  get_two_places(
    center, 10000, 1500, 1000, function(args) {
      if (args.error) {
        alert(args.error);
      } else {
        playGame(args.place_1.geometry.location, args.place_2.geometry.location);
      }
    });
}

/*
 * Set up the map; it is invisble at the end of this function
 */
function setUpMap() {
  var text_color = '#757D70';
  var mapStyle = [
    {elementType: 'geometry', stylers: [{ color: '#FBEFDF' }]},
    {elementType: 'labels.text.stroke', stylers: [{ visibility: 'off' }]},
    {elementType: 'labels.text.fill',   stylers: [{ color: text_color }]},
    {featureType: 'poi.business', stylers: [{ visibility: 'off' }]},
    {featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }]}, 
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: text_color }]
    },
    { 
      featureType: 'poi', 
      elementType: 'labels.icon', 
      stylers: [{ visibility: 'off' }] 
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: text_color }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#DADFA9' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: text_color }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#D3CEC8' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#FBEFDF' }]
    },
    {
      featureType: 'road', 
      elementType: 'labels.icon', 
      stylers: [{ visibility: 'off' }] 
    }, 
    {
      featureType: 'transit', 
      stylers: [{visibility: 'off'} ] 
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{visibility: 'off'}]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{color: '#D3CEC8' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{color: '#FBEFDF' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{color: text_color }]
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit.station',
      elementType: 'labels.text.fill',
      stylers: [{color: text_color }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{color: '#D9E7E8' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{color: text_color }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [{color: '#D9E7E8' }]
    }
  ];

  // Disable all user control over map scaling, etc.
  var mapOptions = {
    zoom: 15,
    clickableIcons: false,
    disableDefaultUI: true,
    disableDoubleClickZoom: true,
    fullscreenControl: false,
    gestureHandling: 'none',
    keyboardShortcuts: false,
    mapTypeControl: false,
    panControl: false,
    rotateControl: false,
    scaleControl: false,
    streetViewControl: false,
    zoomControl: false,
    draggable: false,
    scrollwheel: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    styles: mapStyle
  };

  map = new google.maps.Map(document.getElementById('map'), mapOptions);
}

/*
 * Begin the game. The two parameters must be given as LatLngs
 */
function playGame(origin, destination) {
  // Recenter the map halfway between the two points
  map.setCenter(google.maps.geometry.spherical.interpolate(origin, destination, 0.5));

  var originMarker = new google.maps.Marker({
    draggable: true, // let the user drag this marker
    position: origin,
    label: '↝', // placeholder
    title: 'Drag here to draw your route!',
    map: map
  });

  var destinationMarker = new google.maps.Marker({
    draggable: false,
    position: destination,
    label: '↯', // placeholder
    title: 'Your route will end here.',
    map: map
  });

  var drawnRoute = new google.maps.Polyline({
    geodesic: true,
    map: map,
    strokeColor: 'red',
    strokeWeight: 3,
    visible: true,
    clickable: false,
    draggable: false
  });

  var currentlyDrawing = false;

  // Make the origin marker draggable
  google.maps.event.addListener(originMarker, 'dragstart', function() {
    drawnRoute.setPath([origin]); // initialize path to only the start location
    currentlyDrawing = true;
  });

  // As the marker is dragged, the path is updated in real time
  google.maps.event.addListener(originMarker, 'drag', function() {
    if (!currentlyDrawing) {
      return;
    }
    var currentLocation = originMarker.getPosition();
    drawnRoute.getPath().push(currentLocation); // Append the current location of the marker
    if (google.maps.geometry.spherical.computeDistanceBetween(currentLocation, destination) < 50) {
      // path ended near destination
      endRouteDrawing();
    }
  });

  // If the user terminates the dragging too far from the destination, we clear the path and snap the marker back
  google.maps.event.addListener(originMarker, 'dragend', function() {
    var currentLocation = originMarker.getPosition();
    if (google.maps.geometry.spherical.computeDistanceBetween(currentLocation, destination) < 50) {
      // path ended near destination
      endRouteDrawing();
    } else {
      resetRouteDrawing();
    }
  });

  // Reset the route drawing, so the user can try again
  function resetRouteDrawing() {
    drawnRoute.setPath([]);
    originMarker.setPosition(origin);
    originMarker.setDraggable(true);
    originMarker.setVisible(true);
    currentlyDrawing = false;
  }
  
  // Stop drawing the route
  function endRouteDrawing() {
    // path ended near destination
    originMarker.setDraggable(false);
    originMarker.setVisible(false);
    originMarker.setPosition(origin);
    drawnRoute.getPath().push(destination);
    currentlyDrawing = false;
    compareRouteToOptimal();
  }
  
  // Calculate the similarity between the optimal route (Google Directions)
  // and the user-drawn route
  function compareRouteToOptimal() {
    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: google.maps.DirectionsTravelMode.WALKING
    }, function(response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        // Set up and draw google's route
        optimalRoutePath = google.maps.geometry.encoding.decodePath(response.routes[0].overview_polyline);

        // Chart the optimal route
        var optimalRoute = new google.maps.Polyline({
          geodesic: true,
          map: map,
          strokeColor: 'blue',
          strokeWeight: 3,
          visible: true,
          clickable: false,
          draggable: false,
          path: optimalRoutePath
        });
  
        // merge the two routes into a polygon
        var routeLoop = new google.maps.MVCArray;
        drawnRoute.getPath().forEach(function(node, index) {
          routeLoop.push(node);
        });
        // add the nodes from Google Directions in reverse order
        var optimalLength = optimalRoutePath.length;
        for (var i = optimalLength - 1; i >= 0; --i) {
          routeLoop.push(optimalRoutePath[i]);
        }
        // calculate the area of the loop
        var area = google.maps.geometry.spherical.computeArea(routeLoop);
        // Experimental score calculation: 10000 times the ratio of the length of the optimal route to the enclosed area
        var routeLength = google.maps.geometry.spherical.computeLength(optimalRoutePath);
        var score = calculateScore(area, routeLength);
        alert('Area: '+ Math.floor(area) + ' square meters\nScore (experimental): ' + score + ' points');
      }
    });
  }
}

// locations.get_two_places( center, radius, maxDist, minDist, keywords )
//    center: google LatLng object
//    radius: the radius around the center in which you want the two points
//        to fall
//    maxDist: the maximum distance between both points
//    minDist: the minimum distance between both points
//    callback: function to call when finished
//    keywords: additional facts about the places if you want to find only 
//          restaurants or something
//
// argument to callback:
//   {
//     place_1: (google place object),
//     place_2: (google place object),
//     dist:    (distance in meters)
//   }
//
//  all units of distance are in meters
get_two_places = function(center, radius, maxDist, minDist, callback, keywords) {
  var request = {
    radius: radius,
    location: center
  };
  if (keywords) {
    request.keyword = keywords;
  }
  placesService.nearbySearch(request, function(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      var randy = getRandomInt(0, results.length);
      var index = (randy + 1) % results.length; 
      var latlng1 = results[randy].geometry.location;
      var latlng2;
      var dist;
      while(results.length > 1) {
        if (index == randy) {
          results.splice(randy, 1);
          randy %= results.length;
          index = (randy + 1) % results.length;
          latlng1 = results[randy].geometry.location;
        } else {
          latlng2 = results[index].geometry.location;
          dist = google.maps.geometry.spherical.computeDistanceBetween(latlng1, latlng2);
          if (dist >= minDist && dist <= maxDist) {
            callback({
              place_1: results[randy], 
              place_2: results[index],
              dist: dist
            });
            return;
          }
          index = (index + 1) % results.length;
        }
      }
      callback({ error:'no two places satisfy input' });
    } else {
      callback({ error:'google places service response error' });
    } 
  });
};

// Gets a random integer between min and max, including min but not max
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

// Calculate the score
function calculateScore(enclosedArea, optimalRouteLength) {
  return Math.floor(10000 * optimalRouteLength / enclosedArea);
}