const API_KEY = "79365b1d2caff9a079b551800f8530e5";

function onGeoOK(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const weather = document.getElementById("weather-icon");
      const citySpan = document.getElementById("weather-city");
      const tempSpan = document.getElementById("weather-temp");
      const weatherIcon = data.weather[0].icon;
      const temp = data.main.temp;
      weather.src = `../src/icons/${weatherIcon}.png`;
      citySpan.innerText = data.name;
      tempSpan.innerText = `${temp}℃`;
    });
}

function onGeoError() {}

navigator.geolocation.getCurrentPosition(onGeoOK, onGeoError);
