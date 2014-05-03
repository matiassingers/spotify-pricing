String.prototype.format = function () {
  var formatted = this;
  for (var i = 0; i < arguments.length; i++) {
    formatted = formatted.replace(
      RegExp('\\{' + i + '\\}', 'g'), arguments[i]);
  }
  return formatted;
};

var countries;
var base;

var container = d3.select(".container");

var mapElement = d3.select("#map")
  .style("height",  calculateHeight() + "px" );

var mapWidth = parseInt(mapElement.style('width'));

var margin = {top: 10, right: 75, bottom: 10, left: 150},
  width = mapWidth,
  width = width - margin.left - margin.right,
  mapRatio = 1.5,
  height = width * mapRatio - margin.top - margin.bottom;

if(height < 500) {
  margin.left = 75;
  margin.right = 40;
  width = mapWidth - margin.left - margin.right;
  height = 650;
}

function fetchJSONFile(path, callback) {
  var httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200 || httpRequest.status === 0) {
        var data = JSON.parse(httpRequest.responseText);
        if (callback) callback(data);
      }
    }
  };
  httpRequest.open('GET', path);
  httpRequest.send();
}

// fetchJSONFile('/api/', formatData);
fetchJSONFile('data/countries.json', formatData);

function formatData(data){
  countries = data;

  base = _.find(countries, {'rel': 'us'});

  countries = _.chain(countries)
    .unique("rel")
    .reverse()
    .map(function(country){
      country.title = country.title.replace(/ \([^)]*\)/, '');

      var difference = 100 - base.convertedPrice / country.convertedPrice * 100;
      country.priceDifference = difference;
      country.formattedPriceDifference = (Math.round(difference * 100) / 100).toFixed(2);
      country.formattedConvertedPrice = (Math.round(country.convertedPrice * 100) / 100).toFixed(2);

      country.class = country.priceDifference < 0 ? "bar negative" : "bar positive";
      country.class = "{0} {1} {2}".format(country.class, country.region.toLowerCase(), country.countryCode.toLowerCase());

      return country;
    })
    .value();

  drawMap();
  drawBarChart();
  drawScatterPlot();
}

function drawMap(){
  var baseColor = "rgba(133, 187, 35, 1)";
  var ratio = 20;
  var fills = {
    LOWEST: tinycolor.lighten(baseColor, ratio).toHexString(),
    LOW: tinycolor.lighten(baseColor, ratio/2).toHexString(),
    AVERAGE: tinycolor(baseColor).toHexString(),
    HIGH: tinycolor.darken(baseColor, ratio/2).toHexString(),
    HIGHEST: tinycolor.darken(baseColor, ratio).toHexString(),
    defaultFill: 'rgba(255, 255, 255, .1)'
  };

  var map = new Datamap({
    element: document.getElementById('map'),
    fills: fills,
    projection: 'equirectangular', //"mercator"/"equirectangular"
    done: updateMapColors,
    disableDefaultStyles: true,
    geographyConfig: {
      hideAntarctica: true,
      borderWidth: 0,
      popupTemplate: function(geography, data) {
        if(!data)
          return;

        return '<div class="hoverinfo"><strong>{0}:</strong> ${1}<br>Local price: {2} {3}</div>'.format(data.internationalName, data.convertedPrice, data.currency, data.price);
      },
      popupOnHover: true,
      highlightOnHover: true,
      highlightFillColor: function(geography, data){
        if(!data)
          return fills.defaultFill;

        return 'rgba(255, 255, 255, .9)';
      },
      highlightBorderWidth: 0
    }
  });

  map.legend();
}
function updateMapColors(map){
  var sortedDifferences = _.map(_.sortBy(countries, 'priceDifference'), function(country){
    return country.priceDifference;
  });
  var quantile = [
    d3.quantile(sortedDifferences, 0.2),
    d3.quantile(sortedDifferences, 0.4),
    d3.quantile(sortedDifferences, 0.6),
    d3.quantile(sortedDifferences, 0.8)
  ];
  var update = {};
  _.each(countries, function(country){
    update[country.countryCode] = {
      fillKey: calculateColor(country.priceDifference),
      internationalName: country.internationalName,
      priceDifference: country.formattedPriceDifference,
      convertedPrice: country.formattedConvertedPrice,
      price: country.price,
      currency: country.currency,
      region: country.region
    };
  });
  setTimeout(function(){
    map.updateChoropleth(update);
  }, 100);

  function calculateColor(diff){
    var color;
    if(diff <= quantile[0])
      color = 'LOWEST';

    if(diff > quantile[0])
      color = 'LOW';

    if(diff > quantile[1] && diff < quantile[2])
      color = 'AVERAGE';

    if(diff > quantile[2])
      color = 'HIGH';

    if(diff >= quantile[3])
      color = 'HIGHEST';

    return color;
  }
}

function drawBarChart(){
  var container = d3.select("#bar-chart");
  var outerWidth = width + margin.left + margin.right;

  var x = d3.scale.linear()
    .range([margin.left, width + margin.left])

  var y = d3.scale.ordinal()
    .rangeRoundBands([0, height], .3);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat(function(d){ return d + "%" })
    .tickSize(height);

  container.append("p")
    .html("Local currency under/over valuation against the dollar, %");

  var svg = container.append("svg")
    .attr("width", outerWidth)
    .attr("height", height + margin.top + margin.bottom);

  x.domain(d3.extent(countries, function(d) { return d.priceDifference; })).nice();
  y.domain(countries.map(function(d) { return d.internationalName; }));

  svg.append("g")
    .attr("class", "x axis")
    .call(xAxis)

  svg.append("g")
    .attr("class", "y axis")
    .append("line")
    .attr("x1", x(0))
    .attr("x2", x(0))
    .attr("y2", height);

  var bars = svg.selectAll("g.bar")
    .data(countries)
    .enter()
    .append("g")
    .attr("class", function(d) { return d.class; });

  bars.append("rect")
    .attr("x", function(d) { return x(Math.min(0, d.priceDifference)); })
    .attr("y", function(d) { return y(d.internationalName); })
    .attr("width", function(d) { return Math.abs(x(d.priceDifference) - x(0)); })
    .attr("height", y.rangeBand());

  var labels = bars.append("svg:text")
    .attr("class", "label")
    .attr("x", 0)
    .attr("y", function(d) { return y(d.internationalName); })
    .attr("text-anchor", "left")
    .text(function(d) { return d.internationalName; });

  var nil = svg.selectAll("g.bar.{0}".format(base.countryCode.toLowerCase()))
    .append("svg:text")
    .attr("class", "nil")
    .attr("x", x(0))
    .attr("y", y(base.internationalName))
    .text("nil");

  var prices = bars.append("svg:text")
    .attr("class", "price")
    .attr("x", outerWidth)
    .attr("y", function(d) { return y(d.internationalName); })
    .text(function(d) {
      return d.formattedConvertedPrice;
    });

  var priceDefinition = svg.append("svg:text")
    .attr("class", "price-definition visible-md visible-lg")
    .attr("x", outerWidth)
    .attr("y", height)
    .attr("text-anchor", "left")
    .text("Spotify Premium price, $");

  labels.attr("transform", function(d) { return "translate(0, {0})".format(getYPosition(labels)); });
  nil.attr("transform", function(d) { return "translate(2, {0})".format(getYPosition(nil)); });
  prices.attr("transform", function(d) { return "translate(0, {0})".format(getYPosition(prices)); });
  priceDefinition.attr("transform", function(d) { return "translate(-{0}, -{1})".format((getBoundaryWidth(priceDefinition) + margin.right/2), (getBoundaryHeight(priceDefinition) - 2)); });

  function getBoundaryHeight(elements){
    return elements.node().getBBox().height;
  }
  function getBoundaryWidth(elements){
    return elements.node().getBBox().width;
  }
  function getYPosition(elements){
    return y.rangeBand() / 2 + getBoundaryHeight(elements) / 4;
  }
};

function drawScatterPlot(){
  // Don't draw the scatterPlot on mobile devices
  if(width < 400)
    return;

  var scatterWidth = {
    inner: width,
    outer: width + margin.right + margin.left
  };
  var scatterHeight = {
    inner: height / 6,
    outer: height / 6 + margin.top + margin.bottom
  };

  margin = {
    top: 10,
    right: 30,
    bottom: 0,
    left: 25
  };

  var data = _.remove(countries, function(country) { return !!country.gdp; });

  var x = d3.scale.linear()
    .domain([0, d3.max(data, function(d) { return d.gdp; })]).nice()
    .range([margin.left, scatterWidth.outer - margin.right]);

  var y = d3.scale.linear()
    .domain([0, d3.max(data, function(d) { return d.convertedPrice; })]).nice()
    .range([ scatterHeight.inner, margin.top ]);

  var scatterContainer = d3.select("#scatter-plot");

  // Scatter plot hover
  scatterContainer.append('div')
    .attr('class', 'scatter-hover');

  var chart = scatterContainer.append('svg:svg')
    .attr('width', scatterWidth.outer)
    .attr('height', scatterHeight.outer)
    .attr('style', 'position: relative');

  // draw the x axis
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom');

  chart.append('g')
    .attr('transform', 'translate(0, {0})'.format(scatterHeight.inner))
    .attr('class', 'main axis date')
    .call(xAxis);

  // draw the y axis
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient('left');

  chart.append('g')
    .attr('transform', 'translate({0}, 0)'.format(margin.left))
    .attr('class', 'main axis date')
    .call(yAxis);

  var g = chart.append("svg:g");
  g.selectAll("scatter-dots")
    .data(data)
    .enter().append("svg:circle")
    .attr("cx", function (d,i) { if(d) return x(d.gdp); } )
    .attr("cy", function (d) { if(d) return y(d.convertedPrice); } )
    .attr("r", 8)
    .attr("class", function (d) { return d.class })
    .attr("data-info", function (d) { return JSON.stringify(d); })
    .on("mousemove", updateScatterPopup)
    .on("mouseout", removeScatterPopup);

  var trendData = getTrendlineData(data, chart);
  var trendline = chart.selectAll(".trendline")
    .data(trendData)
    .enter()
    .append("line")
    .attr("class", "trendline")
    .attr("x1", function(d) { return x(d[0]); })
    .attr("y1", function(d) { return y(d[1]); })
    .attr("x2", function(d) { return x(d[2]); })
    .attr("y2", function(d) { return y(d[3]); });

  scatterContainer.append("small")
    .text("GDP per capita, PPP (current international $) 2009, World Bank");

  function updateScatterPopup(){
    var position = d3.mouse(this);
    var element = d3.select(this);
    var data = JSON.parse(element.attr('data-info'));

    var leftPosition = position[0] + 10;

    var hoverElement = scatterContainer.select('.scatter-hover')
      .html(function() { return scatterPopupHTML(data); })
      .style('top', "{0}px".format(position[1] + 15))
      .style('left', "{0}px".format(leftPosition))
      .style('display', 'block');

    // Handle Luxembourg edge-case
    if(data.countryCode === 'LUX') {
      var hoverElementWidth = document.getElementsByClassName('scatter-hover')[0].offsetWidth;
      leftPosition = leftPosition - hoverElementWidth - 80;
      hoverElement.style('left', '{0}px'.format(leftPosition));
    }
  }
  function removeScatterPopup(){
    scatterContainer.select('.scatter-hover')
      .style('display', 'none');
  }
  function scatterPopupHTML(data){
    return "<div class='hoverinfo'><strong>{0}:</strong><br>Converted price: ${1}<br>GDP/capita: ${2}</div>".format(data.internationalName, data.formattedConvertedPrice, data.gdp.toFixed(2));
  }
}
function getTrendlineData(data, chart){
  // get the x and y values for least squares
  var xSeries = d3.range(1, data.length + 1);
  var ySeries = data.map(function(d) { return d.convertedPrice; });

  var leastSquaresCoeff = leastSquares(xSeries, ySeries);

  // apply the reults of the least squares regression
  var x1 = data[0].gdp;
  var y1 = leastSquaresCoeff[0] + leastSquaresCoeff[1];
  var x2 = data[data.length - 1].gdp;
  var y2 = leastSquaresCoeff[0] * xSeries.length + leastSquaresCoeff[1];
  var trendData = [[x1,y1,x2,y2]];

  return trendData;

  // returns slope, intercept and r-square of the line
  function leastSquares(xSeries, ySeries) {
    var reduceSumFunc = function(prev, cur) { return prev + cur; };

    var xBar = xSeries.reduce(reduceSumFunc) * 1.0 / xSeries.length;
    var yBar = ySeries.reduce(reduceSumFunc) * 1.0 / ySeries.length;

    var ssXX = xSeries.map(function(d) { return Math.pow(d - xBar, 2); })
      .reduce(reduceSumFunc);

    var ssYY = ySeries.map(function(d) { return Math.pow(d - yBar, 2); })
      .reduce(reduceSumFunc);

    var ssXY = xSeries.map(function(d, i) { return (d - xBar) * (ySeries[i] - yBar); })
      .reduce(reduceSumFunc);

    var slope = ssXY / ssXX;
    var intercept = yBar - (xBar * slope);
    var rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);

    return [slope, intercept, rSquare];
  };
}

function calculateHeight(){
  return 270 / 649 * window.innerWidth;
}
function calculateWidth(){
  return 649 / 270 * window.innerHeight;
}


d3.selectAll(".continent-chooser h3")
  .on('click', filterContinents);

function filterContinents(d, id) {
  // Remove .active from currently selected continent
  d3.selectAll(".continent-chooser h3.active")
    .classed("active", false);

  // Set .active for clicked continent
  var element = d3.select(this)
    .classed("active", true);

  var charts = [
    "#bar-chart svg",
    "#scatter-plot svg",
    "#map svg"
  ];
  _.each(charts, function(item) {
    var chart = d3.select(item);

    if(id === 0)
      return chart.attr("class", "");

    chart.attr("class", "filter {0}".format(element.text().toLowerCase()));
  });
}